// ============================================
// CampusPrint PWA — Status Page (Tab 2)
// ============================================

const StatusPage = {
    render() {
        return `
        <div style="display: flex; flex-direction: column; align-items: center; text-align: center; padding-top: 20px;">
            <h2 style="font-size: 26px; font-weight: 800; color: #FFFFFF; margin-bottom: 32px;">My Wallet</h2>

            <div class="wallet-card" style="width: 100%; max-width: 360px; background: linear-gradient(135deg, #16213E, #28104E); border-radius: 20px; padding: 40px 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);">
                <div style="font-size: 14px; color: rgba(255,255,255,0.8); letter-spacing: 0.5px;">Available Points</div>
                <div style="font-size: 56px; font-weight: 800; color: #FFFFFF; margin: 8px 0;">0.00</div>
                <div style="font-size: 14px; color: rgba(255,255,255,0.6); letter-spacing: 1px;">INR</div>
            </div>

            <div style="margin-top: 32px; font-size: 14px; color: rgba(255,255,255,0.5);">
                Top-up feature coming soon!
            </div>
        </div>
        `;
    },

    init() {
        // Later we can attach API call to fetch current points if backend supports it.
    }
};
