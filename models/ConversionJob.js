const mongoose = require('mongoose');

const conversionJobSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    docxPublicId: {
        type: String,
        required: true,
    },
    pdfPublicId: {
        type: String,
        default: null,
    },
    originalName: {
        type: String,
        default: 'document.docx',
    },
    status: {
        type: String,
        enum: ['queued', 'processing', 'done', 'failed'],
        default: 'queued',
    },
    downloadUrl: {
        type: String,
        default: null,
    },
    error: {
        type: String,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

conversionJobSchema.pre('save', async function () {
    this.updatedAt = Date.now();
});

const ConversionJob = mongoose.model('ConversionJob', conversionJobSchema);

module.exports = ConversionJob;
