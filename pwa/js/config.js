// ============================================
// CampusPrint PWA — Configuration
// ============================================

const CONFIG = {
    // API base URL — same origin since PWA is served from backend
    API_BASE: '/api',

    // Firebase Web configuration (Extracted from google-services.json)
    FIREBASE: {
        apiKey: "YOUR_FIREBASE_API_KEY_HERE", // Replaced for security
        authDomain: "printpaymentapp.firebaseapp.com",
        projectId: "printpaymentapp",
        storageBucket: "printpaymentapp.firebasestorage.app",
        messagingSenderId: "186477441652",
        appId: "1:186477441652:web:placeholder"
    },

    // Razorpay test key
    RAZORPAY_KEY: 'YOUR_RAZORPAY_KEY_HERE', // Replaced for security

    // Current app version
    VERSION: '1.0.0',
};
