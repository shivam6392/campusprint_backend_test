// ============================================
// CampusPrint PWA — History Page (Tab 3)
// ============================================

const HistoryPage = {
    render() {
        return `
        <div class="page-header" style="padding-top: 0; margin-bottom: 20px;">
            <h2 style="font-size: 24px; font-weight: 800;">Order History</h2>
        </div>
        <div id="ordersList">
            <div class="empty-state"><div class="loading-spinner" style="margin: 0 auto;"></div></div>
        </div>
        `;
    },

    init() {
        this.loadHistory();
    },

    async loadHistory() {
        const container = document.getElementById('ordersList');

        try {
            const res = await API.getOrders();
            const orders = res.data || [];

            if (orders.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="icon">📭</div>
                        <div class="text">No orders yet</div>
                    </div>
                `;
                return;
            }

            container.innerHTML = orders.map(order => {
                const status = (order.paymentStatus || 'pending').toLowerCase();
                const statusClass = status === 'paid' ? 'success' : status === 'failed' ? 'failed' : 'pending';
                const icon = status === 'paid' ? '✅' : status === 'failed' ? '❌' : '⏳';
                const date = order.createdAt ? order.createdAt.substring(0, 10) : '--';

                return `
                <div class="card order-card" data-order='${JSON.stringify(order).replace(/'/g, "&#39;")}'>
                    <div class="order-icon ${statusClass}">${icon}</div>
                    <div class="order-info">
                        <div class="order-name">${order.fileName || 'Unknown'}</div>
                        <div class="order-meta">${date} • ${order.pages || 0} pages • ${order.copies || 1} copies</div>
                    </div>
                    <div class="order-right">
                        <div class="order-cost">₹${order.totalCost || 0}</div>
                        <div class="order-status ${statusClass}">${status}</div>
                    </div>
                </div>
                `;
            }).join('');

            // Click to show detail
            container.querySelectorAll('.order-card').forEach(card => {
                card.addEventListener('click', () => {
                    const order = JSON.parse(card.dataset.order);
                    this.showOrderDetail(order);
                });
            });

        } catch (err) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">⚠️</div>
                    <div class="text">${err.message}</div>
                </div>
            `;
        }
    },

    showOrderDetail(order) {
        const status = (order.paymentStatus || 'pending').toLowerCase();
        const statusColor = status === 'paid' ? 'var(--success)' : status === 'failed' ? 'var(--error)' : 'var(--warning)';
        let dateStr = '--', timeStr = '--';

        try {
            const d = new Date(order.createdAt);
            dateStr = d.toLocaleDateString('en-IN');
            timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        } catch (e) { }

        const codeSection = (status === 'paid' && order.printCode)
            ? `<div class="modal-code" id="copyCode" data-code="${order.printCode}">
                   <div class="hint">Tap to copy</div>
                   <div class="code">${order.printCode}</div>
               </div>`
            : '';

        const html = `
        <div class="modal-overlay" id="orderModal">
            <div class="modal">
                <div class="modal-header">
                    <h3>${order.fileName || 'Order'}</h3>
                    <div class="modal-divider"></div>
                </div>
                <div class="modal-grid">
                    <div class="modal-field">
                        <label>Date</label>
                        <div class="value">${dateStr}</div>
                    </div>
                    <div class="modal-field">
                        <label>Time</label>
                        <div class="value">${timeStr}</div>
                    </div>
                    <div class="modal-field end">
                        <label>Status</label>
                        <div class="value bold" style="color: ${statusColor}">${status.charAt(0).toUpperCase() + status.slice(1)}</div>
                    </div>
                </div>
                <hr style="border: none; border-top: 1px solid var(--border-glass); margin: 8px 0;">
                <div class="modal-grid">
                    <div class="modal-field">
                        <label>Pages</label>
                        <div class="value">${order.pages || 0}</div>
                    </div>
                    <div class="modal-field">
                        <label>Type</label>
                        <div class="value">${order.color ? 'Colour' : 'B&W'}</div>
                    </div>
                    <div class="modal-field end">
                        <label>Total</label>
                        <div class="value bold" style="color: var(--success)">₹${order.totalCost || 0}</div>
                    </div>
                </div>
                ${codeSection}
                <button class="btn btn-primary" id="closeModal">Close</button>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);

        document.getElementById('closeModal').addEventListener('click', () => {
            document.getElementById('orderModal').remove();
        });

        document.getElementById('orderModal').addEventListener('click', (e) => {
            if (e.target.id === 'orderModal') document.getElementById('orderModal').remove();
        });

        const copyBtn = document.getElementById('copyCode');
        if (copyBtn) {
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(copyBtn.dataset.code);
                App.toast('Code copied!', 'success');
            });
        }
    }
};
