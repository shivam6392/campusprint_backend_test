// ============================================
// CampusPrint PWA — SPA Router & App Shell
// ============================================

const App = {
    currentPage: null,

    start() {
        this.initNav();
        this.initSidebar();

        window.addEventListener('hashchange', () => this.route());
        this.route();
    },

    initNav() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const tab = item.getAttribute('data-tab');
                window.location.hash = `#${tab}`;
            });
        });
    },

    initSidebar() {
        const menuBtn = document.getElementById('menuBtn');
        const sidebar = document.getElementById('sidebarDrawer');
        const overlay = document.getElementById('sidebarOverlay');
        const logoutBtn = document.getElementById('logoutBtn');

        const openSidebar = () => {
            sidebar.classList.add('open');
            overlay.classList.add('active');

            // Populate user info
            const name = localStorage.getItem('userName') || 'User';
            const email = localStorage.getItem('userEmail') || '';
            document.getElementById('sidebarName').textContent = name;
            document.getElementById('sidebarEmail').textContent = email;
            document.getElementById('sidebarAvatar').textContent = name.charAt(0).toUpperCase();
        };

        const closeSidebar = () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        };

        menuBtn.addEventListener('click', openSidebar);
        overlay.addEventListener('click', closeSidebar);

        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('userName');
            localStorage.removeItem('userEmail');
            closeSidebar();
            window.location.hash = '#login';
        });
    },

    updateNavState(hash) {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            if (`#${item.getAttribute('data-tab')}` === hash) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    },

    route() {
        const hash = window.location.hash.split('?')[0] || '#login';
        const token = localStorage.getItem('token');

        const authApp = document.getElementById('authApp');
        const mainApp = document.getElementById('mainApp');

        // Auth guard
        if (!token && hash !== '#login') {
            window.location.hash = '#login';
            return;
        }
        if (token && hash === '#login') {
            window.location.hash = '#order';
            return;
        }

        let page;
        switch (hash) {
            case '#login':
                authApp.style.display = 'block';
                mainApp.style.display = 'none';
                page = LoginPage;
                this.currentPage = page;
                authApp.innerHTML = page.render();
                page.init();
                return; // Handled login

            case '#order':
                page = OrderPage;
                break;
            case '#status':
                page = StatusPage;
                break;
            case '#history':
                page = HistoryPage;
                break;
            case '#pdftools':
                page = PdfToolsPage;
                break;
            case '#payment':
                // Payment hides bottom nav in Android usually, but we'll integrate it into pageContent
                page = PaymentPage;
                break;
            default:
                window.location.hash = token ? '#order' : '#login';
                return;
        }

        // Show main app shell
        authApp.style.display = 'none';
        mainApp.style.display = 'block';

        // Update Bottom Nav UI
        this.updateNavState(hash);

        // Render page content
        this.currentPage = page;
        document.getElementById('pageContent').innerHTML = page.render();
        page.init();
    },

    // Toast notification
    toast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = '0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }
};

// Boot
document.addEventListener('DOMContentLoaded', async () => {
    await CONFIG.loadEnvConfig();
    App.start();
});
