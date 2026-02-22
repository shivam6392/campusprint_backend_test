// ============================================
// CampusPrint PWA — Order Page (Tab 1)
// ============================================

const OrderPage = {
    selectedFile: null,
    uploadedFileId: null,
    isUploading: false,

    render() {
        return `
        <div class="page-header" style="padding-top: 0; margin-bottom: 20px;">
            <h2 style="font-size: 26px; font-weight: 700; color: #FFFFFF; margin: 0;">New Order</h2>
        </div>

        <!-- File Selection Card -->
        <div class="card" style="margin-bottom: 16px; padding: 20px;" id="fileSelectionCard">
            <h3 style="font-size: 16px; font-weight: 700; color: var(--accent); margin-bottom: 12px; margin-top: 0;">Select Document</h3>
            <button class="btn btn-secondary" id="btnSelectFile" style="height: 52px; font-size: 15px; width: 100%;">Choose PDF</button>

            <!-- Upload Progress Row (Hidden by default) -->
            <div id="uploadProgressRow" style="display: none; align-items: center; margin-top: 12px; gap: 12px;">
                <div style="position: relative; width: 36px; height: 36px;">
                    <svg class="circular-chart" viewBox="0 0 36 36" style="width: 36px; height: 36px;">
                        <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style="fill: none; stroke: rgba(255,255,255,0.1); stroke-width: 3;"/>
                        <path class="circle" id="progressCircle" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style="fill: none; stroke: var(--accent); stroke-width: 3; stroke-linecap: round; transition: stroke-dasharray 0.3s ease;"/>
                    </svg>
                    <!-- Green Tick matches Android ic_check_circle.xml -->
                    <svg id="successTick" viewBox="0 0 24 24" style="position: absolute; top: 6px; left: 6px; width: 24px; height: 24px; fill: #4ADE80; display: none;">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                </div>
                <div style="flex: 1; display: flex; flex-direction: column;">
                    <span id="progressFileName" style="font-size: 14px; font-weight: 500; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;"></span>
                    <span id="progressStatusText" style="font-size: 12px; color: rgba(255,255,255,0.533);">Uploading...</span>
                </div>
            </div>
        </div>
        <input type="file" id="fileInput" accept=".pdf" style="display: none;">

        <!-- Print Options Card -->
        <div class="card" style="padding: 20px;">
            <h3 style="font-size: 16px; font-weight: 700; color: var(--accent); margin-bottom: 16px; margin-top: 0;">Print Options</h3>

            <div style="margin-bottom: 16px;">
                <label style="font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.533); text-transform: uppercase; margin-bottom: 8px; display: block;">Copies</label>
                <input class="input" type="number" id="copiesInput" value="1" min="1" max="50">
            </div>

            <div>
                <label style="font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.533); text-transform: uppercase; margin-bottom: 8px; display: block;">Print Type</label>
                <div class="toggle-group" style="height: 52px; align-items: center;">
                    <button class="toggle-option active" data-color="false" style="height: 100%; display: flex; align-items: center; justify-content: center;">Black & White (₹1)</button>
                    <button class="toggle-option" data-color="true" style="height: 100%; display: flex; align-items: center; justify-content: center;">Color (₹8)</button>
                </div>
            </div>
        </div>

        <button class="btn btn-primary" style="margin-top: 24px; height: 56px; font-size: 16px; margin-bottom: 24px;" id="btnProceedToPay" disabled>Proceed to Pay</button>
        `;
    },

    init() {
        this.selectedFile = null;
        this.uploadedFileId = null;
        this.isUploading = false;

        const btnSelectFile = document.getElementById('btnSelectFile');
        const fileInput = document.getElementById('fileInput');

        btnSelectFile.addEventListener('click', () => {
            if (this.isUploading) {
                App.toast('Upload in progress, please wait...', 'info');
                return;
            }
            fileInput.click();
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

        // Proceed to Pay
        document.getElementById('btnProceedToPay').addEventListener('click', () => this.proceedToPayment());
    },

    selectFile(file) {
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            App.toast('Please select a PDF file', 'error');
            return;
        }
        this.selectedFile = file;
        this.uploadedFileId = null;

        document.getElementById('uploadProgressRow').style.display = 'flex';
        document.getElementById('progressFileName').textContent = file.name;
        document.getElementById('progressStatusText').textContent = 'Preparing upload...';
        document.getElementById('progressStatusText').style.color = 'rgba(255,255,255,0.533)';
        document.getElementById('progressCircle').style.strokeDasharray = '0, 100';
        document.getElementById('progressCircle').style.display = 'block';
        document.getElementById('successTick').style.display = 'none';

        document.getElementById('btnProceedToPay').disabled = true;

        this.startUpload();
    },

    startUpload() {
        this.isUploading = true;

        // Auto-upload default values matching logic parity
        const defaultCopies = 1;
        const defaultColor = false;

        const progressCircle = document.getElementById('progressCircle');
        const progressText = document.getElementById('progressStatusText');

        const formData = new FormData();
        formData.append('pdf', this.selectedFile);
        formData.append('copies', defaultCopies);
        formData.append('color', defaultColor);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${CONFIG.API_BASE}/print/upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 100);
                progressCircle.style.strokeDasharray = `${pct}, 100`;
                progressText.textContent = `Uploading... ${pct}%`;
            }
        };

        xhr.onload = () => {
            this.isUploading = false;
            try {
                const res = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300) {
                    this.uploadedFileId = res.data._id;
                    this.showUploadSuccess();
                } else {
                    this.showUploadError(res.message || 'Upload failed');
                }
            } catch (err) {
                this.showUploadError('Error parsing response');
            }
        };

        xhr.onerror = () => {
            this.isUploading = false;
            this.showUploadError('Network error');
        };

        xhr.send(formData);
    },

    showUploadSuccess() {
        document.getElementById('progressCircle').style.display = 'none';

        const statusText = document.getElementById('progressStatusText');
        statusText.textContent = 'Upload Complete!';
        statusText.style.color = '#4ADE80';

        document.getElementById('successTick').style.display = 'block';
        document.getElementById('btnProceedToPay').disabled = false;
    },

    showUploadError(msg) {
        document.getElementById('progressStatusText').textContent = msg;
        document.getElementById('progressStatusText').style.color = '#EF4444';
        document.getElementById('btnProceedToPay').disabled = true;
    },

    async proceedToPayment() {
        if (!this.uploadedFileId) return;

        const copies = parseInt(document.getElementById('copiesInput').value) || 1;
        const isColor = document.querySelector('.toggle-option.active').dataset.color === 'true';
        const btn = document.getElementById('btnProceedToPay');

        btn.disabled = true;
        btn.textContent = 'Processing...';

        try {
            // Replicate OrderFragment.kt API update step
            const data = await API.updateOrder(this.uploadedFileId, copies, isColor);

            // Pass exact amount to payment screen matching Android Intent extra
            localStorage.setItem('pendingPaymentAmount', data.data.totalCost || '0');

            setTimeout(() => {
                window.location.hash = `#payment`;
            }, 300);

        } catch (err) {
            App.toast(err.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Proceed to Pay';
        }
    }
};
