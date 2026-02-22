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
            <!-- Logo Section -->
            <div class="login-logo-row anim-scale-fade">
                <span class="logo-campus">Campus</span>
                <span class="logo-print">Print</span>
            </div>
            <div class="login-slogan">Print at your fingertips</div>

            <!-- Login Card -->
            <div class="login-card anim-slide-up" style="animation-delay: 0.1s;" id="loginCard">
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

                <!-- Forgot Password -->
                <div class="forgot-password" id="forgotPassword">Forgot Password?</div>

                <button class="btn btn-primary login-btn" id="authBtn">Login</button>
                <button class="btn btn-outline login-btn" id="toggleBtn">Create Account</button>
            </div>

            <!-- Divider -->
            <div class="login-divider anim-bounce-up" style="animation-delay: 0.2s;">
                <div class="divider-line"></div>
                <span class="divider-text">or continue with</span>
                <div class="divider-line"></div>
            </div>

            <!-- Google Sign-In -->
            <button class="btn btn-google anim-bounce-up" id="googleBtn" style="animation-delay: 0.3s;">
                <svg width="24" height="24" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56,12.25c0,-0.78 -0.07,-1.53 -0.2,-2.25L12,10l0,4.26l5.92,0c-0.26,1.36 -1.04,2.51 -2.21,3.28l0,2.72l3.58,0c2.08,-1.92 3.27,-4.74 3.27,-8.01z" />
                    <path fill="#34A853" d="M12,23c2.97,0 5.46,-0.98 7.28,-2.66l-3.57,-2.77c-0.98,0.66 -2.23,1.06 -3.71,1.06 -2.86,0 -5.29,-1.93 -6.16,-4.53L2.18,14.1l0,2.84C3.99,20.53 7.7,23 12,23z" />
                    <path fill="#FBBC05" d="M5.84,14.09c-0.22,-0.66 -0.35,-1.36 -0.35,-2.09s0.13,-1.43 0.35,-2.09L5.84,9.91l-3.66,-2.84C1.39,8.65 0.9,10.28 0.9,12s0.49,3.35 1.28,4.93l3.66,-2.84z" />
                    <path fill="#EA4335" d="M12,5.38c1.62,0 3.06,0.56 4.21,1.64l3.15,-3.15C17.45,2.09 14.97,1 12,1 7.7,1 3.99,3.47 2.18,7.07l3.66,2.84c0.87,-2.6 3.3,-4.53 6.16,-4.53z" />
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
        const forgotPassword = document.getElementById('forgotPassword');

        if (this.mode === 'register') {
            nameGroup.style.display = 'block';
            if (forgotPassword) forgotPassword.style.display = 'none';
            authBtn.textContent = 'Create Account';
            toggleBtn.textContent = 'Back to Login';
            cardTitle.textContent = 'Create Account';
        } else {
            nameGroup.style.display = 'none';
            if (forgotPassword) forgotPassword.style.display = 'block';
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

    async handleGoogle() {
        try {
            // Initialize Firebase if not already initialized
            if (!firebase.apps.length) {
                firebase.initializeApp(CONFIG.FIREBASE);
            }

            const provider = new firebase.auth.GoogleAuthProvider();
            // Optional: force account selection prompt
            // provider.setCustomParameters({ prompt: 'select_account' });

            App.toast('Opening Google Sign-In...', 'info');

            const result = await firebase.auth().signInWithPopup(provider);
            const user = result.user;

            // user has displayName, email, uid mapping to Android's flow
            const name = user.displayName || 'Google User';
            const email = user.email;
            const uid = user.uid;

            // Sync with our backend
            App.toast('Syncing account...', 'info');
            const data = await API.sync(name, email, uid);

            localStorage.setItem('token', data.token);
            localStorage.setItem('userName', data.name);
            localStorage.setItem('userEmail', data.email);

            App.toast(`Welcome, ${data.name}!`, 'success');
            window.location.hash = '#order';

        } catch (error) {
            console.error(error);
            if (error.code === 'auth/popup-closed-by-user') {
                App.toast('Sign-in cancelled', 'error');
            } else {
                App.toast('Google Sign-In failed', 'error');
            }
        }
    }
};
