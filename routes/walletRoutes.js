const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ================================
// Create Razorpay Order for Wallet Top-up
// ================================
router.post('/create-order', protect, async (req, res) => {
    try {
        const { amount } = req.body; // Amount in INR rupees

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }

        const options = {
            amount: amount * 100, // Razorpay expects paise
            currency: 'INR',
            receipt: `wt_${Date.now()}`,
            notes: {
                userId: req.user._id.toString(),
                type: 'wallet_topup'
            }
        };

        const topupOrder = await razorpay.orders.create(options);

        res.json({
            success: true,
            orderId: topupOrder.id,
            amount: topupOrder.amount,
        });

    } catch (error) {
        console.error("Wallet Create Order Error:", error);
        res.status(500).json({ success: false, message: 'Could not create wallet top-up order' });
    }
});

// ================================
// Verify Payment & Add Funds (Atomic)
// ================================
router.post('/verify-payment', protect, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amountAdded } = req.body;

        const secret = process.env.RAZORPAY_KEY_SECRET;

        // Verify Signature
        const generated_signature = crypto
            .createHmac('sha256', secret)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Payment verification failed: Invalid signature' });
        }

        // If verified, atomically add exactly the amount they paid for to their wallet
        // Ensure amountAdded is strictly a number to prevent injection
        const safeAmount = Number(amountAdded);
        if (isNaN(safeAmount) || safeAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid top-up amount' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { $inc: { walletBalance: safeAmount } },
            { new: true, runValidators: true } // runValidators ensures it doesn't violate min: 0
        );

        res.json({
            success: true,
            message: 'Wallet recharged successfully',
            newBalance: updatedUser.walletBalance
        });

    } catch (error) {
        console.error("Wallet Verify Error:", error);
        res.status(500).json({ success: false, message: 'Wallet verification error' });
    }
});

// ================================
// Get Current Wallet Balance
// ================================
router.get('/balance', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('walletBalance');
        res.json({
            success: true,
            walletBalance: user.walletBalance
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching balance' });
    }
});

module.exports = router;
