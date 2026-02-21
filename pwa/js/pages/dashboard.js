// ============================================
// CampusPrint PWA — Dashboard Page
// ============================================

const DashboardPage = {
    selectedFile: null,
    activeTab: 'upload',

    render() {
        const name = localStorage.getItem('userName') || 'User';
        return `
        <div class="page">
            <div class="page-header">
                <div>
                    <h1>Hi, ${name} 👋</h1>
                    <div class="subtitle">CampusPrint Dashboard</div>
                </div>
                <div class="header-actions">
                    <button class="btn btn-ghost btn-sm" id="logoutBtn">Logout</button>
                </div>
            </div>

            <div class="tab-bar">
                <button class="tab active" data-tab="upload">📤 Upload</button>
                <button class="tab" data-tab="history">📋 History</button>
            </div>

            <!-- Upload Tab -->
            <div id="uploadTab">
                <div class="upload-area" id="dropZone">
                    <div class="icon">📄</div>
                    <div class="title">Choose or Drop PDF</div>
                    <div class="subtitle">Select a PDF file to print</div>
                </div>
                <input type="file" id="fileInput" accept=".pdf" style="display: none;">

                <div id="fileInfo"></div>

                <div class="card" style="margin-top: 16px;">
                    <div class="input-group">
                        <label>Copies</label>
                        <input class="input" type="number" id="copiesInput" value="1" min="1" max="50">
                    </div>
                    <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; display: block;">Print Type</label>
                    <div class="toggle-group">
                        <button class="toggle-option active" data-color="false">B&W — ₹1/page</button>
                        <button class="toggle-option" data-color="true">Colour — ₹8/page</button>
                    </div>
                </div>

                <div class="progress-container" id="progressContainer">
                    <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
                    <div class="progress-text" id="progressText">Uploading...</div>
                </div>

                <button class="btn btn-primary" style="margin-top: 16px;" id="uploadBtn" disabled>Upload & Proceed to Pay</button>
            </div>

            <!-- History Tab -->
            <div id="historyTab" style="display: none;">
                <div id="ordersList"></div>
            </div>
        </div>
        `;
    },

    init() {
        this.selectedFile = null;
        this.activeTab = 'upload';

        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.clear();
            App.toast('Logged out', 'success');
            window.location.hash = '#login';
        });

        // File selection
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');

        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files[0]) this.selectFile(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) this.selectFile(e.target.files[0]);
        });

        // Color toggle
        document.querySelectorAll('.toggle-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.toggle-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
            });
        });

        // Upload
        document.getElementById('uploadBtn').addEventListener('click', () => this.handleUpload());
    },

    switchTab(tab) {
        this.activeTab = tab;
        document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
        document.getElementById('uploadTab').style.display = tab === 'upload' ? 'block' : 'none';
        document.getElementById('historyTab').style.display = tab === 'history' ? 'block' : 'none';

        if (tab === 'history') this.loadHistory();
    },

    selectFile(file) {
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            App.toast('Please select a PDF file', 'error');
            return;
        }
        this.selectedFile = file;
        document.getElementById('fileInfo').innerHTML = `
            <div class="file-selected">
                <span>📎</span>
                <span class="name">${file.name}</span>
                <span class="remove" id="removeFile">✕</span>
            </div>
        `;
        document.getElementById('removeFile').addEventListener('click', () => this.clearFile());
        document.getElementById('uploadBtn').disabled = false;
    },

    clearFile() {
        this.selectedFile = null;
        document.getElementById('fileInfo').innerHTML = '';
        document.getElementById('uploadBtn').disabled = true;
        document.getElementById('fileInput').value = '';
    },

    async handleUpload() {
        if (!this.selectedFile) return;

        const copies = parseInt(document.getElementById('copiesInput').value) || 1;
        const isColor = document.querySelector('.toggle-option.active').dataset.color === 'true';
        const btn = document.getElementById('uploadBtn');
        const progress = document.getElementById('progressContainer');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        btn.disabled = true;
        btn.textContent = 'Uploading...';
        progress.classList.add('visible');
        progressFill.style.width = '0%';
        progressText.textContent = 'Uploading...';

        try {
            // Use XMLHttpRequest for progress tracking
            const data = await new Promise((resolve, reject) => {
                const formData = new FormData();
                formData.append('pdf', this.selectedFile);
                formData.append('copies', copies);
                formData.append('color', isColor);

                const xhr = new XMLHttpRequest();
                xhr.open('POST', `${CONFIG.API_BASE}/print/upload`);
                xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const pct = Math.round((e.loaded / e.total) * 100);
                        progressFill.style.width = pct + '%';
                        progressText.textContent = `Uploading... ${pct}%`;
                    }
                };

                xhr.onload = () => {
                    const res = JSON.parse(xhr.responseText);
                    if (xhr.status >= 200 && xhr.status < 300) resolve(res);
                    else reject(new Error(res.message || 'Upload failed'));
                };

                xhr.onerror = () => reject(new Error('Network error'));
                xhr.send(formData);
            });

            progressFill.style.width = '100%';
            progressText.textContent = 'Upload complete!';

            const order = data.data;
            App.toast('PDF uploaded successfully!', 'success');

            // Navigate to payment
            setTimeout(() => {
                window.location.hash = `#payment?id=${order._id}&amount=${order.totalCost}`;
            }, 500);

        } catch (err) {
            App.toast(err.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Upload & Proceed to Pay';
            progress.classList.remove('visible');
        }
    },

    async loadHistory() {
        const container = document.getElementById('ordersList');
        container.innerHTML = '<div class="empty-state"><div class="loading-spinner" style="margin: 0 auto;"></div></div>';

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
