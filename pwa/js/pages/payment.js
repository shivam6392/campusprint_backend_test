// ============================================
// CampusPrint PWA — Payment / Outcome Page
// ============================================

const PaymentPage = {
    render() {
        return `
        <!-- Payment Pending Container -->
        <div id="paymentContainer" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 75vh;">
            <div class="card" style="width: 100%; max-width: 380px; text-align: center; margin-bottom: 32px; padding: 32px;">
                <h2 style="font-size: 22px; font-weight: 700; color: #FFFFFF; margin-bottom: 16px;">Payment</h2>
                <div style="width: 40px; height: 3px; background: #E94560; margin: 0 auto 24px;"></div>
                <div style="font-size: 32px; font-weight: 700; color: #4ADE80; letter-spacing: 0.5px;">Total Cost: INR <span id="paymentTotalAmount">0</span></div>
            </div>
            
            <button class="btn btn-primary" id="btnRazorpay" style="width: 100%; max-width: 380px; height: 56px; font-size: 16px; font-weight: 700; letter-spacing: 0.5px; border-radius: 12px; margin-bottom: 12px;">Pay using Razorpay</button>
            <button class="btn btn-outline" id="btnCancelPayment" style="width: 100%; max-width: 380px; height: 56px; font-size: 16px; font-weight: 700; letter-spacing: 0.5px; border-radius: 12px;">Cancel</button>
        </div>

        <!-- Payment Success Container (Hidden) -->
        <div id="successContainer" style="display: none; flex-direction: column; align-items: center; justify-content: center; min-height: 75vh; position: relative;">
            <svg viewBox="0 0 24 24" fill="#4ADE80" style="width: 100px; height: 100px; margin-bottom: 24px;">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            
            <div style="font-size: 24px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px;">Order Confirmed!</div>
            <div id="successPrintCode" style="font-size: 48px; font-weight: 700; color: #4ADE80; letter-spacing: 0.1px; margin-bottom: 32px;">1234</div>
            
            <div style="font-size: 13px; color: rgba(255,255,255,0.53); margin-bottom: 4px;" id="successTxnId">Txn ID: ...</div>
            <div style="font-size: 13px; color: rgba(255,255,255,0.53);" id="successTime">Time: ...</div>

            <button class="btn btn-primary" id="btnSuccessDone" style="width: 100%; max-width: 380px; height: 52px; font-size: 16px; font-weight: 700; margin-top: 48px; border-radius: 12px;">Done</button>
        </div>
        `;
    },

    init() {
        // Read amount from localStorage or URL hash
        const amount = localStorage.getItem('pendingPaymentAmount') || '0';
        document.getElementById('paymentTotalAmount').textContent = amount;

        const btnRp = document.getElementById('btnRazorpay');
        if (btnRp) {
            btnRp.addEventListener('click', () => {
                // Mock payment process
                const btnOriginalText = btnRp.textContent;
                btnRp.textContent = "Processing...";
                btnRp.disabled = true;

                setTimeout(() => {
                    this.showSuccess(amount);
                }, 1500);
            });
        }

        const btnCancel = document.getElementById('btnCancelPayment');
        if (btnCancel) {
            btnCancel.addEventListener('click', () => {
                window.location.hash = '#order';
            });
        }

        const btnDone = document.getElementById('btnSuccessDone');
        if (btnDone) {
            btnDone.addEventListener('click', () => {
                window.location.hash = '#history';
            });
        }
    },

    showSuccess(amount) {
        document.getElementById('paymentContainer').style.display = 'none';

        const successContainer = document.getElementById('successContainer');
        successContainer.style.display = 'flex';
        successContainer.classList.add('anim-scale-in');

        // Generate mock code and txn hash
        const code = Math.floor(1000 + Math.random() * 9000);
        document.getElementById('successPrintCode').textContent = code;

        const txn = 'pay_' + Math.random().toString(36).substring(2, 10).toUpperCase();
        document.getElementById('successTxnId').textContent = 'Txn ID: ' + txn;

        const d = new Date();
        document.getElementById('successTime').textContent = 'Time: ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString('en-IN');

        // Remove pending amount
        localStorage.removeItem('pendingPaymentAmount');
    }
};
