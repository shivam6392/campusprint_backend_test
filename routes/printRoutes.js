const express = require('express');
const router = express.Router();
const { Storage } = require('@google-cloud/storage');
const pdf = require('pdf-parse');
const os = require('os');
const path = require('path');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const { protect } = require('../middleware/authMiddleware');
const PrintRequest = require('../models/PrintRequest');

// GCP config
const storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
    credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY ? process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
    }
});
const bucketName = process.env.GCP_BUCKET_NAME || 'campusprint_uploads';

// Rate limiting for signatures
const signatureLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5, // 5 requests per minute per IP
    message: { success: false, message: 'Too many upload requests. Please try again later.' }
});



// ================================
// Get User Orders
// ================================
router.get('/orders', protect, async (req, res) => {
    try {
        const orders = await PrintRequest.find({ userId: req.user._id })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: orders
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
});


// ================================
// Generate GCP Signed URL
// ================================
router.get('/upload-signature', protect, signatureLimiter, async (req, res) => {
    try {
        const timestamp = Math.round((new Date).getTime() / 1000);
        const folder = 'campusprint_uploads';

        // Generate a completely unique file path so uploads never collide
        const uniqueFileName = `${req.user._id}_${timestamp}_${crypto.randomBytes(4).toString('hex')}.pdf`;
        const publicId = `${folder}/${uniqueFileName}`;

        // V4 Signed URL for raw PUT upload
        const options = {
            version: 'v4',
            action: 'write',
            expires: Date.now() + 15 * 60 * 1000, // Valid for 15 minutes
            contentType: 'application/pdf',
        };

        const [signedUrl] = await storage.bucket(bucketName).file(publicId).getSignedUrl(options);

        // We return the identical keys expected by the frontend (signedUrl acts as the signature hook)
        res.json({
            success: true,
            data: {
                signedUrl: signedUrl,
                publicId: publicId,
                timestamp: timestamp
            }
        });
    } catch (error) {
        console.error("Signature Error:", error);
        res.status(500).json({ success: false, message: 'Could not generate GCP Signed URL' });
    }
});


// ================================
// Create Order (Post-Upload Verification)
// ================================
router.post('/orders', protect, async (req, res) => {
    const { pdfUrl, publicId, originalName, copies, color, idempotencyKey } = req.body;

    try {
        // 1. Idempotency Check
        if (idempotencyKey) {
            const existingOrder = await PrintRequest.findOne({ idempotencyKey, userId: req.user._id });
            if (existingOrder) {
                return res.status(200).json({
                    success: true,
                    message: 'Order already exists',
                    data: existingOrder
                });
            }
        }

        // 2. Folder Alignment Verification
        if (!publicId || !publicId.startsWith('campusprint_uploads/')) {
            return res.status(400).json({ success: false, message: 'Invalid GCP Public ID folder' });
        }

        // 3. Create verifying order placeholder
        const finalCopies = parseInt(copies) || 1;
        const isColor = color === true || color === 'true';

        // 4. DB Insertion (verifying state, 0 pages initially)
        const printRequest = await PrintRequest.create({
            userId: req.user._id,
            pdfUrl: pdfUrl,
            publicId: publicId,
            fileName: originalName || 'Document.pdf',
            pages: 0,
            copies: finalCopies,
            color: isColor,
            totalCost: 0,
            paymentStatus: 'verifying',
            idempotencyKey: idempotencyKey,
            createdAt: new Date()
        });

        res.status(201).json({
            success: true,
            message: 'Order created in verifying state',
            data: printRequest
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ================================
// Poll Order Status (For Android UI)
// ================================
router.get('/orders/:id/status', protect, async (req, res) => {
    try {
        const order = await PrintRequest.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        res.json({
            success: true,
            data: {
                id: order._id,
                paymentStatus: order.paymentStatus,
                pages: order.pages,
                totalCost: order.totalCost,
                publicId: order.publicId
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// ================================
// Cloud Function Webhook (Updates Page Count)
// ================================
router.post('/webhook/gcp-verify', async (req, res) => {
    try {
        const { publicId, pages, secret } = req.body;

        // 1. Verify Secret Key to prevent malicious spoofing
        const WEBHOOK_SECRET = process.env.GCP_WEBHOOK_SECRET || 'campusprint_gcp_secret_2026';
        if (secret !== WEBHOOK_SECRET) {
            return res.status(403).json({ success: false, message: 'Invalid Webhook Secret' });
        }

        // 2. Find the verifying order
        const order = await PrintRequest.findOne({ publicId, paymentStatus: 'verifying' });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Verifying order not found for this publicId' });
        }

        // 3. Calculate Final Price
        const pricePerPage = order.color ? 8 : 1;
        const totalCost = pages * order.copies * pricePerPage;

        // 4. Update the Order
        order.pages = pages;
        order.totalCost = totalCost;
        order.paymentStatus = 'pending';
        await order.save();

        res.json({ success: true, message: 'Order verified and updated to pending' });
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});


// ================================
// Update Order (color, copies)
// ================================
router.patch('/orders/:id', protect, async (req, res) => {
    try {
        const request = await PrintRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Only allow update if not yet paid
        if (request.paymentStatus === 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Cannot update a paid order'
            });
        }

        // Update fields
        const copies = parseInt(req.body.copies) || request.copies;
        const isColor = req.body.color !== undefined ? req.body.color === true || req.body.color === 'true' : request.color;
        const pricePerPage = isColor ? 8 : 1;
        const totalCost = request.pages * copies * pricePerPage;

        request.copies = copies;
        request.color = isColor;
        request.totalCost = totalCost;

        await request.save();

        res.json({
            success: true,
            message: 'Order updated',
            data: request
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});



// ================================
// CONFIRM PAYMENT
// ================================
router.post('/pay', protect, async (req, res) => {
    try {
        const { printRequestId, paymentId } = req.body;

        const request = await PrintRequest.findById(printRequestId);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Print request not found'
            });
        }

        if (request.paymentStatus === 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Already paid'
            });
        }

        const printCode = Math.floor(1000 + Math.random() * 9000).toString();

        request.paymentStatus = 'paid';
        request.printCode = printCode;
        if (paymentId) request.paymentId = paymentId;

        await request.save();

        res.json({
            success: true,
            message: 'Payment successful',
            printCode: printCode,
            data: request
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// ================================
// PAYMENT FAILED
// ================================
router.post('/pay-failed', protect, async (req, res) => {
    try {
        const { printRequestId, reason } = req.body;

        const request = await PrintRequest.findById(printRequestId);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Print request not found'
            });
        }

        // Only update if not already paid
        if (request.paymentStatus !== 'paid') {
            request.paymentStatus = 'failed';
            await request.save();
        }

        res.json({
            success: true,
            message: 'Payment status updated to failed',
            data: request
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


module.exports = router;

// ================================
// RAZORPAY WEBHOOK (Server-to-Server)
// ================================
router.post('/webhook', async (req, res) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

        // Extract the exact byte string saved by server.js express.json() verify function
        const payload = req.rawBody || JSON.stringify(req.body);

        const signature = req.headers['x-razorpay-signature'];

        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');

        if (expectedSignature === signature) {
            // Parse payload
            const event = JSON.parse(payload);

            if (event.event === 'payment.captured') {
                const paymentDetails = event.payload.payment.entity;
                // Assuming notes or description contains the printRequestId
                // In production, you pass printRequestId inside Razorpay notes when creating the order
                const printRequestId = paymentDetails.notes.printRequestId;

                if (printRequestId) {
                    const request = await PrintRequest.findById(printRequestId);
                    if (request && request.paymentStatus !== 'paid') {
                        const printCode = Math.floor(1000 + Math.random() * 9000).toString();
                        request.paymentStatus = 'paid';
                        request.printCode = printCode;
                        request.paymentId = paymentDetails.id;
                        await request.save();
                        console.log(`Webhook: Order ${printRequestId} marked as PAID`);
                    }
                }
            }
            res.status(200).json({ status: 'ok' });
        } else {
            console.error('Webhook signature invalid');
            res.status(400).json({ status: 'Signature mismatch' });
        }
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).send('Webhook Processing Error');
    }
});
