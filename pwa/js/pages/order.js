// ============================================
// CampusPrint PWA — Order Page (Tab 1)
// ============================================

const OrderPage = {
    selectedFile: null,

    render() {
        return `
        <div class="page-header" style="padding-top: 0; margin-bottom: 20px;">
            <h2 style="font-size: 24px; font-weight: 800;">Print Order</h2>
        </div>

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
                <button class="toggle-option" data-color="true">Color — ₹8/page</button>
            </div>
        </div>

        <div class="progress-container" id="progressContainer">
            <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
            <div class="progress-text" id="progressText">Uploading...</div>
        </div>

        <button class="btn btn-primary" style="margin-top: 16px; height: 52px; font-size: 16px;" id="uploadBtn" disabled>Upload & Proceed to Pay</button>
        `;
    },

    init() {
        this.selectedFile = null;

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
    }
};
