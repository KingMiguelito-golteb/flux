/* ================================================
   FLUX — LOGIN PAGE
   Realistic account system — no demo credentials.
   Users must create an account via signup first.
   ================================================ */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    console.log('[Flux Login] Initializing...');

    // ============================================
    // DEPENDENCY CHECK
    // ============================================
    if (typeof FluxStorage === 'undefined') {
        console.error('[Flux Login] FATAL: FluxStorage not loaded');
        return;
    }
    if (typeof FluxAPI === 'undefined') {
        console.error('[Flux Login] FATAL: FluxAPI not loaded');
        return;
    }
    if (typeof FluxToast === 'undefined') {
        console.error('[Flux Login] FATAL: FluxToast not loaded');
        return;
    }

    // ============================================
    // REDIRECT IF ALREADY LOGGED IN
    // ============================================
    try {
        var existingSession = FluxStorage.get('session', null);
        if (existingSession && existingSession.id) {
            window.location.replace('dashboard.html');
            return;
        }
    } catch (e) {
        FluxStorage.remove('session');
    }

    // ============================================
    // NO MORE DEMO USER SEEDING
    // Users must create their own account
    // ============================================

    // ============================================
    // DOM REFERENCES
    // ============================================
    var form = document.getElementById('loginForm');
    var emailInput = document.getElementById('loginEmail');
    var passwordInput = document.getElementById('loginPassword');
    var emailError = document.getElementById('loginEmailError');
    var passwordError = document.getElementById('loginPasswordError');
    var passwordToggle = document.getElementById('loginPasswordToggle');
    var googleBtn = document.getElementById('googleSignIn');
    var submitBtn = document.getElementById('loginSubmit');

    if (!form || !emailInput || !passwordInput) {
        console.error('[Flux Login] FATAL: Form elements not found');
        return;
    }

    // ============================================
    // CHECK IF ANY ACCOUNTS EXIST
    // Show helpful message if no accounts yet
    // ============================================
    var existingUsers = FluxStorage.get('users', []);
    if (existingUsers.length === 0) {
        // Show a welcome toast after a short delay
        setTimeout(function () {
            FluxToast.show('Welcome to Flux! Create an account to get started.', 'info', 5000);
        }, 500);
    }

    // ============================================
    // PASSWORD TOGGLE
    // ============================================
    if (passwordToggle) {
        passwordToggle.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            var icon = passwordToggle.querySelector('i');
            if (icon) {
                icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
            }
        });
    }

    // ============================================
    // GOOGLE SIGN-IN (placeholder)
    // ============================================
    if (googleBtn) {
        googleBtn.addEventListener('click', function (e) {
            e.preventDefault();
            FluxToast.show('Google sign-in is not available in this version. Please use email and password.', 'info');
        });
    }

    // ============================================
    // FORM SUBMISSION
    // ============================================
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        e.stopPropagation();

        clearErrors();

        var email = emailInput.value.trim();
        var password = passwordInput.value;

        // ---- Validation ----
        var isValid = true;

        if (!email) {
            showError(emailInput, emailError, 'Please enter your email address');
            isValid = false;
        } else if (!isValidEmail(email)) {
            showError(emailInput, emailError, 'Please enter a valid email address');
            isValid = false;
        }

        if (!password) {
            showError(passwordInput, passwordError, 'Please enter your password');
            isValid = false;
        }

        if (!isValid) return;

        // ---- Check if any accounts exist at all ----
        var users = FluxStorage.get('users', []);
        if (users.length === 0) {
            FluxToast.show('No accounts found. Please create an account first.', 'warning', 4000);
            setTimeout(function () {
                window.location.href = 'signup.html';
            }, 2000);
            return;
        }

        // ---- Check if this specific email exists ----
        var normalizedEmail = email.toLowerCase().trim();
        var userExists = users.some(function (u) {
            return (u.email || '').toLowerCase().trim() === normalizedEmail;
        });

        if (!userExists) {
            showError(emailInput, emailError, 'No account found with this email');
            FluxToast.show('Account not found. Need to create one?', 'error');
            // Highlight the signup link
            var signupLink = document.querySelector('.auth-form-header a[href="signup.html"]');
            if (signupLink) {
                signupLink.style.animation = 'fluxShake 0.5s ease';
                signupLink.style.fontSize = '1rem';
                signupLink.style.fontWeight = '700';
                setTimeout(function () {
                    signupLink.style.animation = '';
                    signupLink.style.fontSize = '';
                    signupLink.style.fontWeight = '';
                }, 2000);
            }
            return;
        }

        // ---- Disable button ----
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
        }

        // ---- Attempt login ----
        try {
            FluxAPI.login(email, password).then(function (res) {
                if (res.ok) {
                    FluxToast.show('Welcome back, ' + res.data.name + '!', 'success');
                    setTimeout(function () {
                        window.location.href = 'dashboard.html';
                    }, 800);
                } else {
                    // Email exists but password is wrong
                    showError(passwordInput, passwordError, 'Incorrect password');
                    FluxToast.show('Incorrect password. Please try again.', 'error');
                    passwordInput.value = '';
                    passwordInput.focus();
                    resetSubmitButton();
                }
            }).catch(function (err) {
                console.error('[Flux Login] Error:', err);
                FluxToast.show('Something went wrong. Please try again.', 'error');
                resetSubmitButton();
            });
        } catch (err) {
            console.error('[Flux Login] Exception:', err);
            FluxToast.show('Something went wrong. Please try again.', 'error');
            resetSubmitButton();
        }
    });

    // ============================================
    // ENTER KEY ON PASSWORD
    // ============================================
    passwordInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            form.dispatchEvent(new Event('submit', { cancelable: true }));
        }
    });

    // ============================================
    // HELPERS
    // ============================================
    function showError(input, errorEl, msg) {
        if (input) {
            input.classList.add('error');
            input.style.animation = 'fluxShake 0.3s ease';
            setTimeout(function () { input.style.animation = ''; }, 300);
        }
        if (errorEl) {
            errorEl.textContent = msg;
            errorEl.classList.add('visible');
        }
    }

    function clearErrors() {
        [emailInput, passwordInput].forEach(function (el) {
            if (el) el.classList.remove('error');
        });
        [emailError, passwordError].forEach(function (el) {
            if (el) el.classList.remove('visible');
        });
    }

    function resetSubmitButton() {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        }
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    console.log('[Flux Login] Ready.');
});