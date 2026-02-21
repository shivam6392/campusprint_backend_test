// ============================================
// CampusPrint PWA — SPA Router & App Shell
// ============================================

const App = {
    currentPage: null,

    start() {
        window.addEventListener('hashchange', () => this.route());
        this.route();
    },

    route() {
        const hash = window.location.hash.split('?')[0] || '#login';
        const token = localStorage.getItem('token');

        // Auth guard
        if (!token && hash !== '#login') {
            window.location.hash = '#login';
            return;
        }
        if (token && hash === '#login') {
            window.location.hash = '#dashboard';
            return;
        }

        let page;
        switch (hash) {
            case '#login':
                page = LoginPage;
                break;
            case '#dashboard':
                page = DashboardPage;
                break;
            case '#payment':
                page = PaymentPage;
                break;
            default:
                window.location.hash = token ? '#dashboard' : '#login';
                return;
        }

        this.currentPage = page;
        document.getElementById('app').innerHTML = page.render();
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
document.addEventListener('DOMContentLoaded', () => {
    App.start();
});
