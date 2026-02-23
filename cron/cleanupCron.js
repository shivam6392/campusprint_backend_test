const cron = require('node-cron');
const { Storage } = require('@google-cloud/storage');
const PrintRequest = require('../models/PrintRequest');

// Config GCP Storage
const storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
    credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY ? process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
    }
});
const bucketName = process.env.GCP_BUCKET_NAME || 'campusprint_uploads';

const startCronJobs = () => {
    // Run every hour at minute 0
    cron.schedule('0 * * * *', async () => {
        console.log('[CRON] Starting cleanup of orphaned PDFs...');
        try {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            // Find orders that are still pending and older than 24h
            const orphanedOrders = await PrintRequest.find({
                paymentStatus: 'pending',
                createdAt: { $lt: twentyFourHoursAgo }
            });

            if (orphanedOrders.length === 0) {
                console.log('[CRON] No orphaned PDFs found.');
                return;
            }

            console.log(`[CRON] Found ${orphanedOrders.length} orphaned orders. Processing...`);

            for (const order of orphanedOrders) {
                if (order.publicId) {
                    try {
                        // Delete the file from GCP to save storage costs
                        await storage.bucket(bucketName).file(order.publicId).delete();

                        // Rule 9: Do NOT delete MongoDB record. Mark as abandoned.
                        order.paymentStatus = 'abandoned';
                        await order.save();

                        console.log(`[CRON] Deleted GCP PDF for order ${order._id}, updated DB status to abandoned.`);
                    } catch (err) {
                        console.error(`[CRON] Failed to delete GCP asset ${order.publicId}:`, err);
                    }
                }
            }
            console.log('[CRON] Cleanup loop finished.');
        } catch (error) {
            console.error('[CRON] Error during cleanup job:', error);
        }
    });
};

module.exports = startCronJobs;
