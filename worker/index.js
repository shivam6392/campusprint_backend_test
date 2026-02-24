/**
 * Cloud Run Worker for Word-to-PDF Conversion
 * 
 * This service subscribes to a Pub/Sub topic, downloads .docx files from GCS,
 * converts them to PDF using LibreOffice headless, uploads the result back to GCS,
 * updates the job status in MongoDB, and sends an FCM push notification.
 * 
 * Deployment: Docker container on Cloud Run with LibreOffice installed.
 */

const { Storage } = require('@google-cloud/storage');
const mongoose = require('mongoose');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const express = require('express');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

// ── Firebase Admin (for FCM) ────────────────────────
const admin = require('firebase-admin');
if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        } else {
            // Use Application Default Credentials on Cloud Run
            admin.initializeApp({ credential: admin.credential.applicationDefault() });
        }
        console.log('Firebase Admin initialized in worker');
    } catch (err) {
        console.error('Firebase init error in worker:', err.message);
    }
}

// ── MongoDB ─────────────────────────────────────────
const connectDB = require('../config/db');
const ConversionJob = require('../models/ConversionJob');
const User = require('../models/User');

// ── GCS ─────────────────────────────────────────────
// On Cloud Run, Application Default Credentials are injected automatically.
// Explicit keys are only used if provided (local dev), otherwise ADC is used.
const storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
    ...(process.env.GCP_CLIENT_EMAIL && process.env.GCP_PRIVATE_KEY ? {
        credentials: {
            client_email: process.env.GCP_CLIENT_EMAIL,
            private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }
    } : {})
});
const bucketName = process.env.GCP_BUCKET_NAME || 'campusprint_uploads_prod';

// ── Core Conversion Logic ───────────────────────────
async function processJob(jobId, userId, docxPublicId) {
    console.log(`🔄 Processing job ${jobId}...`);

    const job = await ConversionJob.findById(jobId);
    if (!job) {
        console.error(`Job ${jobId} not found in DB`);
        return;
    }

    job.status = 'processing';
    await job.save();

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w2p-'));
    const docxPath = path.join(tmpDir, 'input.docx');
    const pdfPath = path.join(tmpDir, 'input.pdf'); // LibreOffice outputs same name with .pdf

    try {
        // 1. Download .docx from GCS
        console.log(`  ⬇️ Downloading ${docxPublicId}...`);
        await storage.bucket(bucketName).file(docxPublicId).download({ destination: docxPath });

        // 2. Convert with LibreOffice headless (async to avoid Cloud Run timeout)
        console.log('  ⚙️ Converting with LibreOffice...');
        await new Promise((resolve, reject) => {
            const proc = spawn('libreoffice', [
                '--headless', '--convert-to', 'pdf',
                '--outdir', tmpDir, docxPath
            ], { stdio: 'pipe' });

            const timer = setTimeout(() => {
                proc.kill();
                reject(new Error('LibreOffice conversion timed out after 5 minutes'));
            }, 300000); // 5 minutes

            proc.on('close', code => {
                clearTimeout(timer);
                if (code === 0) resolve();
                else reject(new Error(`LibreOffice exited with code ${code}`));
            });
            proc.on('error', err => {
                clearTimeout(timer);
                reject(err);
            });
        });

        if (!fs.existsSync(pdfPath)) {
            throw new Error('LibreOffice conversion produced no output file');
        }

        // 3. Upload converted PDF to GCS
        const pdfPublicId = docxPublicId
            .replace('campusprint_docx/', 'campusprint_converted/')
            .replace('.docx', '.pdf');

        console.log(`  ⬆️ Uploading ${pdfPublicId}...`);
        await storage.bucket(bucketName).upload(pdfPath, {
            destination: pdfPublicId,
            metadata: { contentType: 'application/pdf' },
        });

        // 4. Generate signed download URL (valid 24h)
        const [downloadUrl] = await storage.bucket(bucketName).file(pdfPublicId).getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 24 * 60 * 60 * 1000,
        });

        // 5. Update job in MongoDB
        job.status = 'done';
        job.pdfPublicId = pdfPublicId;
        job.downloadUrl = downloadUrl;
        await job.save();

        console.log(`  ✅ Job ${jobId} completed successfully`);

        // 6. Send FCM push notification
        await sendCompletionPush(userId, jobId, downloadUrl, job.originalName);

    } catch (error) {
        console.error(`  ❌ Job ${jobId} failed:`, error.message);
        job.status = 'failed';
        job.error = error.message;
        await job.save();

        // Notify user of failure
        await sendFailurePush(userId, jobId, job.originalName);
    } finally {
        // Cleanup temp files
        try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch (e) { /* ignore */ }
    }
}

// ── FCM Notifications ───────────────────────────────
async function sendCompletionPush(userId, jobId, downloadUrl, originalName) {
    try {
        const user = await User.findById(userId);
        if (!user || !user.fcmTokens || user.fcmTokens.length === 0) return;

        const tokens = user.fcmTokens.map(t => t.token);
        await admin.messaging().sendEachForMulticast({
            notification: {
                title: '✅ PDF Ready!',
                body: `${originalName || 'Your document'} has been converted to PDF.`,
            },
            data: {
                type: 'word_to_pdf_complete',
                jobId: jobId.toString(),
                downloadUrl: downloadUrl,
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'campusprint_default_channel',
                    priority: 'high',
                    sound: 'default',
                },
            },
            tokens,
        });
        console.log(`  📱 FCM push sent to user ${userId}`);
    } catch (err) {
        console.error('FCM push error:', err.message);
    }
}

async function sendFailurePush(userId, jobId, originalName) {
    try {
        const user = await User.findById(userId);
        if (!user || !user.fcmTokens || user.fcmTokens.length === 0) return;

        const tokens = user.fcmTokens.map(t => t.token);
        await admin.messaging().sendEachForMulticast({
            notification: {
                title: '❌ Conversion Failed',
                body: `Could not convert ${originalName || 'your document'}. Please try again.`,
            },
            data: {
                type: 'word_to_pdf_failed',
                jobId: jobId.toString(),
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'campusprint_default_channel',
                    sound: 'default',
                },
            },
            tokens,
        });
    } catch (err) {
        console.error('FCM failure push error:', err.message);
    }
}

// ── HTTP Server for Pub/Sub Push ────────────────────
// Cloud Run receives Pub/Sub messages as HTTP POST requests
const app = express();
app.use(express.json());

app.post('/', async (req, res) => {
    try {
        const message = req.body.message;
        if (!message || !message.data) {
            return res.status(400).send('Invalid Pub/Sub message');
        }

        const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
        const { jobId, userId, docxPublicId } = data;

        console.log(`📨 Received Pub/Sub message for job: ${jobId}`);

        // Process asynchronously but acknowledge immediately
        processJob(jobId, userId, docxPublicId).catch(err => {
            console.error('Unhandled job error:', err);
        });

        res.status(200).send('OK');
    } catch (error) {
        console.error('Pub/Sub handler error:', error);
        res.status(500).send('Processing error');
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'Worker is running', service: 'word-to-pdf-worker' });
});

// ── Start ───────────────────────────────────────────
const PORT = process.env.PORT || process.env.WORKER_PORT || 8080;

// Start HTTP server FIRST (Cloud Run needs this to pass health check)
app.listen(PORT, () => {
    console.log(`🚀 Word-to-PDF Worker running on port ${PORT}`);
    // Connect to MongoDB after server starts
    connectDB().then(() => {
        console.log('✅ Worker connected to MongoDB');
    }).catch(err => {
        console.error('❌ MongoDB connection failed:', err.message);
    });
});
