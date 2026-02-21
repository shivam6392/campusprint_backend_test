// ============================================
// CampusPrint PWA — Configuration
// ============================================

const CONFIG = {
    // API base URL
    API_BASE: '/api',

    // Fetched dynamically from backend /api/config
    FIREBASE: null,
    RAZORPAY_KEY: null,

    // Current app version
    VERSION: '1.0.0',

    // Load configuration securely from the backend environment
    async loadEnvConfig() {
        try {
            const res = await fetch(`${this.API_BASE}/config`);
            const data = await res.json();
            this.FIREBASE = data.FIREBASE;
            this.RAZORPAY_KEY = data.RAZORPAY_KEY;
        } catch (err) {
            console.error("Failed to load backend configurations", err);
        }
    }
};
