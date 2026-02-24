/**
 * Cloud Run Worker — Word to PDF via CloudConvert API
 */

const { Storage } = require('@google-cloud/storage');
const mongoose = require('mongoose');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const express = require('express');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

// ── Firebase Admin ───────────────────────────────────
const admin = require('firebase-admin');
if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({ credential: admin.credential.cert(sa) });
        } else {
            admin.initializeApp({ credential: admin.credential.applicationDefault() });
        }
        console.log('Firebase Admin initialized');
    } catch (err) {
        console.error('Firebase init error:', err.message);
    }
}

// ── MongoDB ──────────────────────────────────────────
const connectDB = require('../config/db');
const ConversionJob = require('../models/ConversionJob');
const User = require('../models/User');

// ── GCS ──────────────────────────────────────────────
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
const CLOUDCONVERT_API_KEY = process.env.CLOUDCONVERT_API_KEY;

// ── CloudConvert Helper ──────────────────────────────
async function convertWithCloudConvert(inputUrl) {
    // Step 1: Create job
    const jobPayload = JSON.stringify({
        tasks: {
            'import-file': { operation: 'import/url', url: inputUrl },
            'convert-file': {
                operation: 'convert',
                input: 'import-file',
                output_format: 'pdf',
                input_format: 'docx',
            },
            'export-file': {
                operation: 'export/url',
                input: 'convert-file',
            }
        }
    });

    const jobRes = await ccRequest('POST', '/v2/jobs', jobPayload);
    const jobId = jobRes.data.id;
    console.log(`  📤 CloudConvert job created: ${jobId}`);

    // Step 2: Wait for job completion (poll every 3s, max 5 min)
    for (let i = 0; i < 100; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const statusRes = await ccRequest('GET', `/v2/jobs/${jobId}`, null);
        const job = statusRes.data;

        if (job.status === 'finished') {
            console.log('  ✅ CloudConvert job finished');
            // Find export task result
            const exportTask = job.tasks.find(t => t.operation === 'export/url' && t.result);
            if (!exportTask || !exportTask.result.files || !exportTask.result.files.length) {
                throw new Error('No output file from CloudConvert');
            }
            return exportTask.result.files[0].url;
        }

        if (job.status === 'error') {
            const errorTask = job.tasks.find(t => t.status === 'error');
            throw new Error(`CloudConvert error: ${errorTask ? errorTask.message : 'Unknown error'}`);
        }

        console.log(`  ⏳ CloudConvert job status: ${job.status} (attempt ${i + 1})`);
    }
    throw new Error('CloudConvert job timed out after 5 minutes');
}

// Raw HTTPS request helper for CloudConvert API
function ccRequest(method, urlPath, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.cloudconvert.com',
            path: urlPath,
            method,
            headers: {
                'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}`,
                'Content-Type': 'application/json',
            }
        };
        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 400) reject(new Error(`CloudConvert API error ${res.statusCode}: ${data}`));
                    else resolve(parsed);
                } catch (e) {
                    reject(new Error(`CloudConvert parse error: ${data}`));
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

// Download file from URL to local path
function downloadUrl(url, destPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        https.get(url, res => {
            res.pipe(file);
            file.on('finish', () => file.close(resolve));
        }).on('error', err => {
            fs.unlink(destPath, () => { });
            reject(err);
        });
    });
}

// ── Core Job Logic ───────────────────────────────────
async function processJob(jobId, userId, docxPublicId) {
    console.log(`🔄 Processing job ${jobId}...`);

    const job = await ConversionJob.findById(jobId);
    if (!job) { console.error(`Job ${jobId} not found`); return; }

    job.status = 'processing';
    await job.save();

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w2p-'));
    const pdfPath = path.join(tmpDir, 'output.pdf');

    try {
        // 1. Generate signed URL for the .docx (so CloudConvert can download it)
        console.log(`  🔗 Generating signed URL for ${docxPublicId}...`);
        const [signedUrl] = await storage.bucket(bucketName).file(docxPublicId).getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 30 * 60 * 1000, // 30 min
        });

        // 2. Convert via CloudConvert
        console.log('  ☁️ Sending to CloudConvert...');
        const pdfDownloadUrl = await convertWithCloudConvert(signedUrl);

        // 3. Download the converted PDF
        console.log('  ⬇️ Downloading converted PDF...');
        await downloadUrl(pdfDownloadUrl, pdfPath);

        // 4. Upload to GCS
        const pdfPublicId = docxPublicId
            .replace('campusprint_docx/', 'campusprint_converted/')
            .replace('.docx', '.pdf');

        console.log(`  ⬆️ Uploading ${pdfPublicId}...`);
        await storage.bucket(bucketName).upload(pdfPath, {
            destination: pdfPublicId,
            metadata: { contentType: 'application/pdf' },
        });

        // 5. Generate a signed download URL (24h)
        const [downloadUrl2] = await storage.bucket(bucketName).file(pdfPublicId).getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 24 * 60 * 60 * 1000,
        });

        // 6. Update Firestore job
        job.status = 'done';
        job.pdfPublicId = pdfPublicId;
        job.downloadUrl = downloadUrl2;
        await job.save();
        console.log(`  ✅ Job ${jobId} completed`);

        // 7. FCM push
        await sendCompletionPush(userId, jobId, downloadUrl2, job.originalName);

    } catch (error) {
        console.error(`  ❌ Job ${jobId} failed:`, error.message);
        job.status = 'failed';
        job.error = error.message;
        await job.save();
        await sendFailurePush(userId, jobId, job.originalName);
    } finally {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { }
    }
}

// ── FCM ─────────────────────────────────────────────
async function sendCompletionPush(userId, jobId, downloadUrl, originalName) {
    try {
        const user = await User.findById(userId);
        if (!user?.fcmTokens?.length) return;
        const tokens = user.fcmTokens.map(t => t.token);
        await admin.messaging().sendEachForMulticast({
            notification: { title: '✅ PDF Ready!', body: `${originalName || 'Your document'} converted successfully.` },
            data: { type: 'word_to_pdf_complete', jobId: jobId.toString(), downloadUrl },
            android: { priority: 'high', notification: { channelId: 'campusprint_default_channel', sound: 'default' } },
            tokens,
        });
        console.log(`  📱 FCM push sent to user ${userId}`);
    } catch (err) { console.error('FCM push error:', err.message); }
}

async function sendFailurePush(userId, jobId, originalName) {
    try {
        const user = await User.findById(userId);
        if (!user?.fcmTokens?.length) return;
        const tokens = user.fcmTokens.map(t => t.token);
        await admin.messaging().sendEachForMulticast({
            notification: { title: '❌ Conversion Failed', body: `Could not convert ${originalName || 'your document'}.` },
            data: { type: 'word_to_pdf_failed', jobId: jobId.toString() },
            android: { priority: 'high', notification: { channelId: 'campusprint_default_channel', sound: 'default' } },
            tokens,
        });
    } catch (err) { console.error('FCM failure push error:', err.message); }
}

// ── HTTP Server ──────────────────────────────────────
const app = express();
app.use(express.json());

app.post('/', async (req, res) => {
    try {
        const message = req.body.message;
        if (!message?.data) return res.status(400).send('Invalid Pub/Sub message');
        const { jobId, userId, docxPublicId } = JSON.parse(Buffer.from(message.data, 'base64').toString());
        console.log(`📨 Received Pub/Sub message for job: ${jobId}`);
        processJob(jobId, userId, docxPublicId).catch(err => console.error('Unhandled job error:', err));
        res.status(200).send('OK');
    } catch (error) {
        console.error('Pub/Sub handler error:', error);
        res.status(500).send('Processing error');
    }
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'word-to-pdf-worker' }));

// ── Start ────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🚀 Word-to-PDF Worker running on port ${PORT}`);
    connectDB().then(() => console.log('✅ MongoDB connected')).catch(err => console.error('MongoDB error:', err.message));
});
