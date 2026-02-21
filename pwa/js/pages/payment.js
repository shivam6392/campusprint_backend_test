// ============================================
// CampusPrint PWA — Payment Page
// ============================================

const PaymentPage = {
    orderId: null,
    amount: 0,

    render() {
        // Parse URL params
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        this.orderId = params.get('id');
        this.amount = parseFloat(params.get('amount')) || 0;

        return `
        <div class="page">
            <!-- Payment Screen -->
            <div id="paymentScreen">
                <div class="page-header">
                    <div>
                        <h1>Payment</h1>
                        <div class="subtitle">Complete your order</div>
                    </div>
                </div>

                <div class="card payment-amount">
                    <div class="label">Total Amount</div>
                    <div class="amount">₹${this.amount}</div>
                </div>

                <button class="btn btn-primary" style="margin-top: 20px;" id="razorpayBtn">
                    Pay using Razorpay
                </button>
                <button class="btn btn-secondary" style="margin-top: 10px;" id="backBtn">
                    Go Back
                </button>
            </div>

            <!-- Success Screen -->
            <div id="successScreen" style="display: none;">
                <div class="result-screen">
                    <div class="result-icon">✅</div>
                    <div class="result-title">Order Confirmed!</div>
                    <div class="result-subtitle">Show this code at the print counter</div>
                    <div class="result-code" id="printCode" title="Tap to copy"></div>
                    <div class="result-meta" id="txnId"></div>
                    <div class="result-meta" id="txnTime"></div>
                </div>
                <button class="btn btn-primary" id="doneBtn">Go to History</button>
            </div>

            <!-- Failed Screen -->
            <div id="failedScreen" style="display: none;">
                <div class="result-screen">
                    <div class="result-icon">❌</div>
                    <div class="result-title" style="color: var(--error);">Payment Failed</div>
                    <div class="result-subtitle" id="failedMsg">Your payment could not be processed.</div>
                </div>
                <button class="btn btn-primary" id="retryBtn">Retry Payment</button>
                <button class="btn btn-secondary" style="margin-top: 10px;" id="failBackBtn">Go Back</button>
            </div>
        </div>
        `;
    },

    init() {
        document.getElementById('razorpayBtn').addEventListener('click', () => this.startPayment());
        document.getElementById('backBtn').addEventListener('click', () => {
            window.location.hash = '#dashboard';
        });
        document.getElementById('doneBtn').addEventListener('click', () => {
            window.location.hash = '#dashboard';
            setTimeout(() => DashboardPage.switchTab('history'), 100);
        });
        document.getElementById('retryBtn').addEventListener('click', () => {
            document.getElementById('failedScreen').style.display = 'none';
            document.getElementById('paymentScreen').style.display = 'block';
        });
        document.getElementById('failBackBtn').addEventListener('click', () => {
            window.location.hash = '#dashboard';
        });
    },

    startPayment() {
        if (!this.orderId) {
            App.toast('Invalid order', 'error');
            return;
        }

        const options = {
            key: CONFIG.RAZORPAY_KEY,
            amount: Math.round(this.amount * 100),
            currency: 'INR',
            name: 'CampusPrint',
            description: 'Print Charges',
            image: 'https://s3.amazonaws.com/rzp-mobile/images/rzp.png',
            theme: { color: '#E94560' },
            handler: (response) => {
                this.onPaymentSuccess(response.razorpay_payment_id);
            },
            modal: {
                ondismiss: () => {
                    this.onPaymentFailed('Payment was cancelled');
                }
            },
            prefill: {
                email: localStorage.getItem('userEmail') || '',
            }
        };

        try {
            const rzp = new Razorpay(options);
            rzp.on('payment.failed', (response) => {
                this.onPaymentFailed(response.error.description || 'Payment failed');
            });
            rzp.open();
        } catch (err) {
            App.toast('Error loading Razorpay: ' + err.message, 'error');
        }
    },

    async onPaymentSuccess(paymentId) {
        try {
            const data = await API.pay(this.orderId, paymentId);

            document.getElementById('paymentScreen').style.display = 'none';
            document.getElementById('successScreen').style.display = 'block';

            document.getElementById('printCode').textContent = data.printCode || '----';
            document.getElementById('txnId').textContent = `Txn ID: ${paymentId}`;
            document.getElementById('txnTime').textContent = `Time: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;

            // Tap to copy
            document.getElementById('printCode').addEventListener('click', () => {
                navigator.clipboard.writeText(data.printCode || '');
                App.toast('Code copied!', 'success');
            });

        } catch (err) {
            App.toast('Backend error: ' + err.message, 'error');
        }
    },

    async onPaymentFailed(reason) {
        try {
            await API.payFailed(this.orderId, reason);
        } catch (e) {
            // Silent fail on backend notification
        }

        document.getElementById('paymentScreen').style.display = 'none';
        document.getElementById('failedScreen').style.display = 'block';
        document.getElementById('failedMsg').textContent = reason || 'Your payment could not be processed.';
    }
};
