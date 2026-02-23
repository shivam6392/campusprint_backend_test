const fs = require('fs');
const { getPageCount } = require('./utils/pdfParser');
const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

const storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
    credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n')
    }
});

const bucketName = process.env.GCP_BUCKET_NAME || 'campusprint-storage-bucket';
// Hardcoding the exact publicId the user uploaded
const publicId = "campusprint_uploads/69970caee80fe05_1771853245_3468558ca.pdf";

async function debugXref() {
    try {
        const file = storage.bucket(bucketName).file(publicId);
        const [metadata] = await file.getMetadata();
        const fileSize = parseInt(metadata.size, 10);
        console.log(`File Size: ${fileSize} bytes`);

        // Download last 50KB to be extra safe
        const start = Math.max(0, fileSize - 50000);
        const [buffer] = await file.download({ start, end: fileSize - 1 });
        const tailString = buffer.toString('utf-8');

        // Let's dump the matches
        const matches = [...tailString.matchAll(/\/Count\s+(\d+)/gi)];
        console.log("Found pure count matches:", matches.map(m => m[1]));

        // Check Type Pages
        const rootMatches = [...tailString.matchAll(/\/Type\s*\/Pages[^]*?\/Count\s+(\d+)/gi)];
        console.log("Found Type Pages matches:", rootMatches.map(m => m[1]));

    } catch (err) {
        console.error("Debug Error:", err);
    }
}

debugXref();
