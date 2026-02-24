const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { sendPushNotification } = require('../utils/pushHelper');

// Simple middleware to enforce password protection
const requireAdmin = (req, res, next) => {
    const pwd = req.headers['x-admin-password'];
    if (pwd === 'Shivam@9211') {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized: Invalid Admin Password' });
    }
};

// Get all users who have an FCM token registered
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const users = await User.find({ 'fcmTokens.0': { $exists: true } }, 'name email _id');
        res.json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Send Push Notification
router.post('/notify', requireAdmin, async (req, res) => {
    try {
        const { targetUserIds, title, body } = req.body;

        let users;
        if (targetUserIds === 'ALL') {
            users = await User.find({ 'fcmTokens.0': { $exists: true } });
        } else if (Array.isArray(targetUserIds) && targetUserIds.length > 0) {
            users = await User.find({ _id: { $in: targetUserIds } });
        } else {
            return res.status(400).json({ success: false, message: 'No users selected' });
        }

        let sentCount = 0;
        for (let u of users) {
            try {
                await sendPushNotification(u._id.toString(), title, body);
                sentCount++;
            } catch (e) {
                console.error("Failed to notify " + u.email, e);
            }
        }
        res.json({ success: true, message: `Successfully pushed notification to ${sentCount} device(s)!` });
    } catch (err) {
        console.error("Admin Notify Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
