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

async function run() {
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGO_URI);

    const recent = await mongoose.connection.collection('printrequests').find().sort({ createdAt: -1 }).limit(1).toArray();

    if (recent.length > 0) {
        console.log('File:', recent[0].publicId, 'Pages saved:', recent[0].pages);
        console.log('Running test parser...');
        const count = await getPageCount(storage, bucketName, recent[0].publicId);
        console.log('Calculated Count:', count);
    } else {
        console.log("No orders found");
    }
    process.exit(0);
}

run().catch(console.error);
