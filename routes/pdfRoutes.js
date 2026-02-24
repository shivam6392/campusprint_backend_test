const express = require('express');
const router = express.Router();
const { Storage } = require('@google-cloud/storage');
const { PubSub } = require('@google-cloud/pubsub');
const crypto = require('crypto');

const { protect } = require('../middleware/authMiddleware');
const ConversionJob = require('../models/ConversionJob');

// GCP Config (reuse existing credentials)
const storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
    credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY ? process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
    }
});
const bucketName = process.env.GCP_BUCKET_NAME || 'campusprint_uploads_prod';

// Pub/Sub Config
const pubsub = new PubSub({
    projectId: process.env.GCP_PROJECT_ID,
    credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY ? process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
    }
});
const TOPIC_NAME = process.env.PUBSUB_TOPIC || 'word-to-pdf-jobs';

// ================================
// Get Signed URL for DOCX Upload
// ================================
router.get('/docx-upload-url', protect, async (req, res) => {
    try {
        const timestamp = Math.round(Date.now() / 1000);
        const uniqueName = `${req.user._id}_${timestamp}_${crypto.randomBytes(4).toString('hex')}.docx`;
        const publicId = `campusprint_docx/${uniqueName}`;

        const [signedUrl] = await storage.bucket(bucketName).file(publicId).getSignedUrl({
            version: 'v4',
            action: 'write',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        res.json({
            success: true,
            data: { signedUrl, publicId, timestamp }
        });
    } catch (error) {
        console.error('DOCX Signed URL Error:', error);
        res.status(500).json({ success: false, message: 'Could not generate upload URL' });
    }
});

// ================================
// Create Conversion Job
// ================================
router.post('/convert-word', protect, async (req, res) => {
    try {
        const { docxPublicId, originalName } = req.body;

        if (!docxPublicId) {
            return res.status(400).json({ success: false, message: 'docxPublicId is required' });
        }

        // Create job in MongoDB
        const job = await ConversionJob.create({
            userId: req.user._id,
            docxPublicId,
            originalName: originalName || 'document.docx',
            status: 'queued',
        });

        // Publish to Pub/Sub
        const messageData = JSON.stringify({
            jobId: job._id.toString(),
            userId: req.user._id.toString(),
            docxPublicId,
            bucketName,
        });

        const topic = pubsub.topic(TOPIC_NAME);
        await topic.publishMessage({ data: Buffer.from(messageData) });

        console.log(`📤 Job ${job._id} published to Pub/Sub topic: ${TOPIC_NAME}`);

        res.status(201).json({
            success: true,
            data: {
                jobId: job._id,
                status: job.status,
            }
        });
    } catch (error) {
        console.error('Convert Word Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ================================
// Poll Job Status (fallback)
// ================================
router.get('/job/:id', protect, async (req, res) => {
    try {
        const job = await ConversionJob.findById(req.params.id);

        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        // If done, generate a fresh signed download URL
        let downloadUrl = job.downloadUrl;
        if (job.status === 'done' && job.pdfPublicId) {
            const [url] = await storage.bucket(bucketName).file(job.pdfPublicId).getSignedUrl({
                version: 'v4',
                action: 'read',
                expires: Date.now() + 60 * 60 * 1000, // 1 hour
            });
            downloadUrl = url;
        }

        res.json({
            success: true,
            data: {
                jobId: job._id,
                status: job.status,
                downloadUrl,
                error: job.error,
            }
        });
    } catch (error) {
        console.error('Job Status Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
