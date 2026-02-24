const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/authMiddleware');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            name,
            email,
            password,
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Sync user from Firebase (Login or Register)
// @route   POST /api/auth/sync
// @access  Public
router.post('/sync', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        let user = await User.findOne({ email });

        if (user) {
            // Update existing user
            user.name = name;
            user.password = password; // Request password (UID) will be hashed by pre-save hook
            await user.save();
        } else {
            // Create new user
            user = await User.create({
                name,
                email,
                password,
            });
        }

        if (user) {
            res.status(200).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Register or update an FCM token for push notifications
// @route   PUT /api/auth/fcm-token
// @access  Private
router.put('/fcm-token', protect, async (req, res) => {
    const { token, deviceId } = req.body;

    if (!token || !deviceId) {
        return res.status(400).json({ message: 'Token and deviceId are required' });
    }

    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if token exists for device and update, or add new
        const existingTokenIndex = user.fcmTokens.findIndex(t => t.deviceId === deviceId);

        if (existingTokenIndex >= 0) {
            user.fcmTokens[existingTokenIndex].token = token;
            user.fcmTokens[existingTokenIndex].lastUpdated = Date.now();
        } else {
            user.fcmTokens.push({ token, deviceId, lastUpdated: Date.now() });
        }

        await user.save();
        res.status(200).json({ message: 'FCM token registered successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
