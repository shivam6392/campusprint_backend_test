const cron = require('node-cron');
const cloudinary = require('cloudinary').v2;
const PrintRequest = require('../models/PrintRequest');

// Config Cloudinary (just in case it's not globally configured when this runs)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
                        // Delete the file from Cloudinary to save space
                        await cloudinary.uploader.destroy(order.publicId);

                        // Rule 9: Do NOT delete MongoDB record. Mark as abandoned.
                        order.paymentStatus = 'abandoned';
                        await order.save();

                        console.log(`[CRON] Deleted Cloudinary PDF for order ${order._id}, updated DB status to abandoned.`);
                    } catch (err) {
                        console.error(`[CRON] Failed to delete Cloudinary asset ${order.publicId}:`, err);
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
