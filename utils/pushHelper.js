const admin = require('firebase-admin');
const User = require('../models/User');
const path = require('path');

// Initialize Firebase Admin using the specific service account file
if (!admin.apps.length) {
    try {
        let serviceAccount;
        const localFile = path.join(__dirname, '../config/firebase-service-account.json');

        // Check if we are running in production with the JSON stringified in an Environment Variable
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        }
        // Fallback to local file for development
        else if (require('fs').existsSync(localFile)) {
            serviceAccount = require(localFile);
        } else {
            console.error('⚠️ Firebase Admin Initialization Warning: FIREBASE_SERVICE_ACCOUNT is missing from environment variables and the local JSON file does not exist.');
            return;
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin initialized successfully');
    } catch (error) {
        console.error('Firebase Admin initialization error', error.stack);
    }
}

/**
 * Sends a push notification to a specific user.
 * @param {String} userId - The MongoDB ObjectId of the user
 * @param {String} title - Notification title
 * @param {String} body - Notification body text
 * @param {Object} dataPayload - Optional custom data key-value pairs
 */
const sendPushNotification = async (userId, title, body, dataPayload = {}) => {
    try {
        const user = await User.findById(userId);

        if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
            console.log(`No FCM tokens found for user ${userId}. Skipping push.`);
            return;
        }

        const tokens = user.fcmTokens.map(t => t.token);

        const message = {
            notification: {
                title,
                body
            },
            data: dataPayload,
            android: {
                priority: 'high',
                notification: {
                    channelId: 'campusprint_default_channel',
                    priority: 'high',
                    sound: 'default'
                }
            },
            apns: {
                payload: {
                    aps: {
                        contentAvailable: true,
                        priority: 10
                    }
                }
            },
            tokens: tokens
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`Successfully sent ${response.successCount} messages; ${response.failureCount} failed.`);

        // Pruning logic for expired/unregistered tokens
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const errorCode = resp.error.code;
                    if (errorCode === 'messaging/invalid-registration-token' ||
                        errorCode === 'messaging/registration-token-not-registered') {
                        failedTokens.push(tokens[idx]);
                    }
                }
            });

            if (failedTokens.length > 0) {
                // Remove these dead tokens from the user document
                user.fcmTokens = user.fcmTokens.filter(t => !failedTokens.includes(t.token));
                await user.save();
                console.log(`Pruned ${failedTokens.length} dead FCM tokens for user ${userId}.`);
            }
        }
    } catch (error) {
        console.error('Error sending push notification:', error);
    }
};

module.exports = { sendPushNotification };
