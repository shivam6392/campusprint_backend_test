// ============================================
// CampusPrint PWA — Login Page
// Matches Android LoginActivity + SplashActivity
// ============================================

const LoginPage = {
    mode: 'login', // 'login' or 'register'
    showingSplash: true,

    render() {
        // Check if splash was already shown this session
        const splashShown = sessionStorage.getItem('splashShown');
        this.showingSplash = !splashShown;

        return `
        <!-- Splash Screen -->
        <div id="splashScreen" class="splash-screen" style="display: ${this.showingSplash ? 'flex' : 'none'}">
            <div class="splash-logo-row">
                <span class="splash-campus" id="splashCampus">Campus</span>
                <span class="splash-print" id="splashPrint">Print</span>
            </div>
            <div class="splash-tagline" id="splashTagline">Print at your fingertips</div>
        </div>

        <!-- Login Screen -->
        <div id="loginScreen" class="login-container" style="display: ${this.showingSplash ? 'none' : 'flex'}">
            <!-- Logo -->
            <div class="login-logo-row">
                <span class="logo-campus">Campus</span>
                <span class="logo-print">Print</span>
            </div>
            <div class="login-slogan">Print at your fingertips</div>

            <!-- Login Card -->
            <div class="login-card card" id="loginCard">
                <h2 class="login-card-title" id="cardTitle">Sign In</h2>

                <div id="nameGroup" class="input-group" style="display: none;">
                    <label>Full Name</label>
                    <input class="input" type="text" id="nameInput" placeholder="Enter your name">
                </div>
                <div class="input-group">
                    <label>Email Address</label>
                    <input class="input" type="email" id="emailInput" placeholder="Email address">
                </div>
                <div class="input-group">
                    <label>Password</label>
                    <input class="input" type="password" id="passwordInput" placeholder="Password">
                </div>

                <button class="btn btn-primary login-btn" id="authBtn">Login</button>
                <button class="btn btn-outline login-btn" id="toggleBtn">Create Account</button>
            </div>

            <!-- Divider -->
            <div class="login-divider">
                <div class="divider-line"></div>
                <span class="divider-text">or continue with</span>
                <div class="divider-line"></div>
            </div>

            <!-- Google Sign-In -->
            <button class="btn btn-google" id="googleBtn">
                <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                </svg>
                Continue with Google
            </button>
        </div>
        `;
    },

    init() {
        if (this.showingSplash) {
            this.playSplashAnimation();
        } else {
            this.initLoginEvents();
        }
    },

    playSplashAnimation() {
        const campus = document.getElementById('splashCampus');
        const print = document.getElementById('splashPrint');
        const tagline = document.getElementById('splashTagline');

        // Initial state
        campus.style.opacity = '0';
        campus.style.transform = 'translateX(-40px)';
        print.style.opacity = '0';
        print.style.transform = 'translateX(40px)';
        tagline.style.opacity = '0';

        // Animate "Campus" from left
        setTimeout(() => {
            campus.style.transition = 'opacity 0.6s ease, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
            campus.style.opacity = '1';
            campus.style.transform = 'translateX(0)';
        }, 200);

        // Animate "Print" from right (with delay)
        setTimeout(() => {
            print.style.transition = 'opacity 0.6s ease, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
            print.style.opacity = '1';
            print.style.transform = 'translateX(0)';
        }, 400);

        // Fade in tagline
        setTimeout(() => {
            tagline.style.transition = 'opacity 0.8s ease';
            tagline.style.opacity = '0.6';
        }, 1200);

        // Transition to login
        setTimeout(() => {
            sessionStorage.setItem('splashShown', 'true');
            const splash = document.getElementById('splashScreen');
            splash.style.transition = 'opacity 0.5s ease';
            splash.style.opacity = '0';

            setTimeout(() => {
                splash.style.display = 'none';
                const login = document.getElementById('loginScreen');
                login.style.display = 'flex';
                login.style.opacity = '0';
                login.style.transition = 'opacity 0.4s ease';
                setTimeout(() => { login.style.opacity = '1'; }, 50);
                this.initLoginEvents();
            }, 500);
        }, 3000);
    },

    initLoginEvents() {
        this.mode = 'login';

        document.getElementById('authBtn').addEventListener('click', () => this.handleAuth());
        document.getElementById('toggleBtn').addEventListener('click', () => this.toggleMode());
        document.getElementById('googleBtn').addEventListener('click', () => this.handleGoogle());

        document.getElementById('passwordInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleAuth();
        });
    },

    toggleMode() {
        this.mode = this.mode === 'login' ? 'register' : 'login';
        const nameGroup = document.getElementById('nameGroup');
        const authBtn = document.getElementById('authBtn');
        const toggleBtn = document.getElementById('toggleBtn');
        const cardTitle = document.getElementById('cardTitle');

        if (this.mode === 'register') {
            nameGroup.style.display = 'block';
            authBtn.textContent = 'Create Account';
            toggleBtn.textContent = 'Back to Login';
            cardTitle.textContent = 'Create Account';
        } else {
            nameGroup.style.display = 'none';
            authBtn.textContent = 'Login';
            toggleBtn.textContent = 'Create Account';
            cardTitle.textContent = 'Sign In';
        }
    },

    async handleAuth() {
        const email = document.getElementById('emailInput').value.trim();
        const password = document.getElementById('passwordInput').value.trim();
        const btn = document.getElementById('authBtn');

        if (!email || !password) {
            App.toast('Please fill in all fields', 'error');
            return;
        }

        btn.disabled = true;
        btn.textContent = this.mode === 'register' ? 'Creating account...' : 'Signing in...';

        try {
            let data;
            if (this.mode === 'register') {
                const name = document.getElementById('nameInput').value.trim();
                if (!name) {
                    App.toast('Please enter your name', 'error');
                    btn.disabled = false;
                    btn.textContent = 'Create Account';
                    return;
                }
                data = await API.register(name, email, password);
            } else {
                data = await API.login(email, password);
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('userName', data.name);
            localStorage.setItem('userEmail', data.email);

            App.toast(`Welcome, ${data.name}!`, 'success');
            window.location.hash = '#dashboard';

        } catch (err) {
            App.toast(err.message, 'error');
            btn.disabled = false;
            btn.textContent = this.mode === 'register' ? 'Create Account' : 'Login';
        }
    },

    handleGoogle() {
        App.toast('Google Sign-In coming soon', 'info');
    }
};
