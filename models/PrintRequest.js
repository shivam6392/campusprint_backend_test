const mongoose = require('mongoose');

const printRequestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    pdfUrl: {
        type: String,
        required: true,
    },
    fileName: {
        type: String,
        required: true,
    },
    pages: {
        type: Number,
        required: true,
    },
    copies: {
        type: Number,
        required: true,
        default: 1,
    },
    color: {
        type: Boolean,
        default: false,
    },
    totalCost: {
        type: Number,
        required: true,
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending',
    },
    printCode: {
        type: String,
        unique: true,
        sparse: true,
    },
    paymentId: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const PrintRequest = mongoose.model('PrintRequest', printRequestSchema);

module.exports = PrintRequest;
