const { Storage } = require('@google-cloud/storage');
require('dotenv').config();
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

const storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
    credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n')
    }
});

const bucketName = process.env.GCP_BUCKET_NAME || 'campusprint-storage-bucket';
const publicId = "campusprint_uploads/69908ea60a1670caee80fe05_1771853245_346858ca.pdf";

async function run() {
    try {
        const file = storage.bucket(bucketName).file(publicId);
        console.log("Downloading 140MB PDF...");
        const [buffer] = await file.download();
        console.log("Download complete. Analyzing with pdf-lib...");

        fs.writeFileSync("suspect_10_page.pdf", buffer);
        console.log("Saved isolated copy to suspect_10_page.pdf");

        const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        console.log("PDF-Lib Page Count:", doc.getPageCount());

        // Also checking pdf-parse fallback
        const pdf = require('pdf-parse');
        const pdfData = await pdf(buffer);
        console.log("PDF-parse Fallback Page Count:", pdfData.numpages);

    } catch (err) {
        console.error("GCP Download Error:", err);
    }
    process.exit(0);
}

run();
