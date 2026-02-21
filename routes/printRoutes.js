const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const pdfParse = require('pdf-parse');

const { protect } = require('../middleware/authMiddleware');
const PrintRequest = require('../models/PrintRequest');


// Cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});


// Multer config (store temp file)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });



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
// Upload PDF
// ================================
router.post('/upload', protect, upload.single('pdf'), async (req, res) => {

    let filePath = '';

    try {

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No PDF uploaded'
            });
        }

        filePath = req.file.path;


        // ====================
        // Calculate pages
        // ====================
        const buffer = fs.readFileSync(filePath);
        let pages = 1;
        try {
            const pdfData = await pdfParse(buffer);
            pages = pdfData.numpages;
        } catch (parseErr) {
            // Fallback: use pdf-lib for PDFs that pdf-parse can't handle
            try {
                const { PDFDocument } = require('pdf-lib');
                const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
                pages = pdfDoc.getPageCount();
            } catch (libErr) {
                console.log('Both pdf-parse and pdf-lib failed, defaulting to 1 page');
                pages = 1;
            }
        }


        // ====================
        // Upload to Cloudinary
        // ====================
        const cloudResult = await cloudinary.uploader.upload(filePath, {
            folder: 'campusprint',
            resource_type: 'raw'
        });


        const copies = parseInt(req.body.copies) || 1;

        // Price Calculation with Color
        const isColor = req.body.color === 'true';
        const pricePerPage = isColor ? 8 : 1;
        const totalCost = pages * copies * pricePerPage;


        // ====================
        // Save in MongoDB
        // ====================
        const printRequest = await PrintRequest.create({

            userId: req.user._id,

            pdfUrl: cloudResult.secure_url,

            fileName: req.file.originalname,

            pages: pages,

            copies: copies,

            color: isColor,

            totalCost: totalCost,

            paymentStatus: 'pending',

            createdAt: new Date()

        });


        // ====================
        // Delete temp file
        // ====================
        fs.unlinkSync(filePath);


        // ====================
        // Response
        // ====================
        res.status(201).json({

            success: true,

            message: 'PDF uploaded successfully',

            data: printRequest

        });


    } catch (error) {

        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        console.error(error);

        res.status(500).json({

            success: false,

            message: error.message

        });

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
