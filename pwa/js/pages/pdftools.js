// ============================================
// CampusPrint PWA — PDF Tools Page (Tab 4)
// ============================================

const PdfToolsPage = {
    render() {
        return `
        <div class="page-header" style="padding-top: 0; margin-bottom: 24px;">
            <h2 style="font-size: 26px; font-weight: 800;">PDF Tools</h2>
            <div style="font-size: 13px; color: rgba(255,255,255,0.53); margin-top: 4px;">Convert and manage your documents</div>
        </div>

        <!-- Image to PDF Card -->
        <div class="tool-card" id="btnImgToPdf" style="display: flex; align-items: center; background: var(--bg-card); padding: 20px; border-radius: 16px; margin-bottom: 14px; cursor: pointer; border: 1px solid var(--border-glass);">
            <div style="width: 48px; height: 48px; background: rgba(74, 222, 128, 0.1); border-radius: 12px; display: flex; justify-content: center; align-items: center; margin-right: 16px;">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="#4ADE80"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
            </div>
            <div style="flex: 1;">
                <div style="font-size: 16px; font-weight: 700; color: #FFFFFF;">Image to PDF</div>
                <div style="font-size: 12px; color: rgba(255,255,255,0.53); margin-top: 3px;">Convert images to PDF document</div>
            </div>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="rgba(255,255,255,0.4)"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        </div>

        <!-- Word to PDF Card -->
        <div class="tool-card" id="btnWordToPdf" style="display: flex; align-items: center; background: var(--bg-card); padding: 20px; border-radius: 16px; margin-bottom: 14px; cursor: pointer; border: 1px solid var(--border-glass);">
            <div style="width: 48px; height: 48px; background: rgba(96, 165, 250, 0.1); border-radius: 12px; display: flex; justify-content: center; align-items: center; margin-right: 16px;">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="#60A5FA"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/><path d="M8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.59L16 15.01 12.01 11z"/></svg>
            </div>
            <div style="flex: 1;">
                <div style="font-size: 16px; font-weight: 700; color: #FFFFFF;">Word to PDF</div>
                <div style="font-size: 12px; color: rgba(255,255,255,0.53); margin-top: 3px;">Convert .docx files to PDF</div>
            </div>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="rgba(255,255,255,0.4)"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        </div>

        <!-- Merge PDFs Card -->
        <div class="tool-card" id="btnMergePdf" style="display: flex; align-items: center; background: var(--bg-card); padding: 20px; border-radius: 16px; margin-bottom: 14px; cursor: pointer; border: 1px solid var(--border-glass);">
            <div style="width: 48px; height: 48px; background: rgba(233, 69, 96, 0.1); border-radius: 12px; display: flex; justify-content: center; align-items: center; margin-right: 16px;">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="#E94560"><path d="M8 16h8v2H8zM8 12h8v2H8zM14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8L14 2zM18 20H6V4h7v5h5v11z"/></svg>
            </div>
            <div style="flex: 1;">
                <div style="font-size: 16px; font-weight: 700; color: #FFFFFF;">Merge PDFs</div>
                <div style="font-size: 12px; color: rgba(255,255,255,0.53); margin-top: 3px;">Combine two PDF files into one</div>
            </div>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="rgba(255,255,255,0.4)"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        </div>

        <!-- Result Area (Hidden by default) -->
        <div class="card" id="resultCard" style="display: none; margin-top: 24px;">
            <div id="resultTitle" style="color: #E94560; font-size: 14px; font-weight: 700; margin-bottom: 8px;">Result</div>
            <div id="resultStatus" style="font-size: 14px; color: #FFFFFF;">Processing...</div>
            
            <div class="progress-container visible" id="toolProgressBox" style="margin-top: 12px; display: none;">
                <div class="progress-bar"><div class="progress-fill" id="toolProgressFill" style="width: 0%;"></div></div>
            </div>

            <button class="btn btn-primary" id="btnOpenResult" style="display: none; margin-top: 16px; height: 44px; font-size: 14px;">Open File</button>
        </div>
        `;
    },

    init() {
        // We will implement the handlers when backend supports PDF manipulation APIs.
        const mockToolRun = (toolName) => {
            const resultCard = document.getElementById('resultCard');
            const progressBox = document.getElementById('toolProgressBox');
            const progressFill = document.getElementById('toolProgressFill');
            const status = document.getElementById('resultStatus');
            const btnOpen = document.getElementById('btnOpenResult');

            resultCard.style.display = 'block';
            progressBox.style.display = 'block';
            btnOpen.style.display = 'none';
            status.textContent = `Running ${toolName}...`;
            progressFill.style.width = '0%';

            // Mock progress
            let progress = 0;
            const interval = setInterval(() => {
                progress += 20;
                progressFill.style.width = `${progress}%`;

                if (progress >= 100) {
                    clearInterval(interval);
                    status.textContent = 'Completed!';
                    progressBox.style.display = 'none';
                    btnOpen.style.display = 'block';
                }
            }, 300);
        };

        document.getElementById('btnImgToPdf').addEventListener('click', () => mockToolRun('Image to PDF'));
        document.getElementById('btnWordToPdf').addEventListener('click', () => mockToolRun('Word to PDF'));
        document.getElementById('btnMergePdf').addEventListener('click', () => mockToolRun('Merge PDFs'));

        document.getElementById('btnOpenResult').addEventListener('click', () => {
            App.toast('PDF Tools logic will be connected to backend APIs later!', 'info');
        });
    }
};
