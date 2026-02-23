const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const { protect } = require('../middleware/authMiddleware');
const PrintRequest = require('../models/PrintRequest');


// Cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
// Generate Cloudinary Signature
// ================================
router.get('/upload-signature', protect, signatureLimiter, (req, res) => {
    try {
        const timestamp = Math.round((new Date).getTime() / 1000);
        const folder = 'campusprint_uploads';

        // Cloudinary signs the parameters we want to enforce
        const paramsToSign = {
            timestamp: timestamp,
            folder: folder
        };

        const signature = cloudinary.utils.api_sign_request(
            paramsToSign,
            process.env.CLOUDINARY_API_SECRET
        );

        res.json({
            success: true,
            data: {
                signature,
                timestamp,
                folder,
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY
            }
        });
    } catch (error) {
        console.error("Signature Error:", error);
        res.status(500).json({ success: false, message: 'Could not generate signature' });
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

        // 2. Domain Whitelist Verification
        if (!pdfUrl || !pdfUrl.startsWith(`https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`)) {
            return res.status(400).json({ success: false, message: 'Invalid or unauthorized Cloudinary URL' });
        }

        // 3. Folder Alignment Verification
        if (!publicId || !publicId.startsWith('campusprint_uploads/')) {
            return res.status(400).json({ success: false, message: 'Invalid Cloudinary Public ID folder' });
        }

        // 4. Admin API Verification - Fetch the True Page Count
        let pages = 1;
        try {
            const resource = await cloudinary.api.resource(publicId, { pages: true });
            if (resource.format !== 'pdf') {
                return res.status(400).json({ success: false, message: 'File is not a PDF' });
            }
            pages = resource.pages || 1;
        } catch (cloudinaryErr) {
            console.error("Cloudinary Admin API Error:", cloudinaryErr);
            return res.status(400).json({ success: false, message: 'Failed to verify file on Cloudinary' });
        }

        // 5. Server-Side Native Pricing Calculation
        const finalCopies = parseInt(copies) || 1;
        const isColor = color === true || color === 'true';
        const pricePerPage = isColor ? 8 : 1;
        const totalCost = pages * finalCopies * pricePerPage;

        // 6. DB Insertion
        const printRequest = await PrintRequest.create({
            userId: req.user._id,
            pdfUrl: pdfUrl,
            publicId: publicId,
            fileName: originalName || 'Document.pdf',
            pages: pages,
            copies: finalCopies,
            color: isColor,
            totalCost: totalCost,
            paymentStatus: 'pending',
            idempotencyKey: idempotencyKey,
            createdAt: new Date()
        });

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: printRequest
        });

    } catch (error) {
        console.error(error);
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
