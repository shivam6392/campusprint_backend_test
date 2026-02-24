const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

dotenv.config();

connectDB();

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({
    verify: (req, res, buf) => {
        if (req.originalUrl === '/api/print/webhook') {
            req.rawBody = buf.toString('utf8');
        }
    }
}));

const fs = require('fs');
const path = require('path');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Serve standard static assets like the Admin UI
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/print', require('./routes/printRoutes'));
app.use('/api/wallet', require('./routes/walletRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));


app.get('/api/health', (req, res) => {
    res.json({ status: 'API is running', version: '1.0.0' });
});
app.get('/api/config', (req, res) => {
    res.json({
        RAZORPAY_KEY: process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY || '',
        FIREBASE: {
            apiKey: process.env.FIREBASE_API_KEY || '',
            authDomain: "printpaymentapp.firebaseapp.com",
            projectId: "printpaymentapp",
            storageBucket: "printpaymentapp.firebasestorage.app",
            messagingSenderId: "186477441652",
            appId: "1:186477441652:web:placeholder"
        }
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: err.message || 'Server Error'
    });
});

const PORT = process.env.PORT || 5000;

// Start Cron Jobs (Production Rule 9: Cleanup Mechanism)
const startCronJobs = require('./cron/cleanupCron');
startCronJobs();

app.listen(PORT, console.log(`Server running on port ${PORT}`));
