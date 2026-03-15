/* ================================================
   FLUX — SIGNUP PAGE (DEBUG + FIX)
   ================================================ */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    console.log('[Signup] Step 1: DOMContentLoaded fired');

    // ============================================
    // CHECK DEPENDENCIES
    // ============================================
    var hasStorage = typeof FluxStorage !== 'undefined';
    var hasAPI = typeof FluxAPI !== 'undefined';
    var hasToast = typeof FluxToast !== 'undefined';

    console.log('[Signup] Step 2: Dependencies check:');
    console.log('  FluxStorage:', hasStorage);
    console.log('  FluxAPI:', hasAPI);
    console.log('  FluxToast:', hasToast);

    if (!hasStorage || !hasAPI || !hasToast) {
        console.error('[Signup] FATAL: Missing dependencies');
        alert('Error: Required scripts not loaded. Check browser console.');
        return;
    }

    // ============================================
    // CHECK IF ALREADY LOGGED IN
    // ============================================
    try {
        var existingSession = FluxStorage.get('session', null);
        if (existingSession && existingSession.id) {
            console.log('[Signup] Already logged in, redirecting...');
            window.location.replace('dashboard.html');
            return;
        }
    } catch (e) {
        console.warn('[Signup] Session check failed:', e);
        FluxStorage.remove('session');
    }

    // ============================================
    // DOM
    // ============================================
    var form = document.getElementById('signupForm');
    var firstNameInput = document.getElementById('signupFirstName');
    var lastNameInput = document.getElementById('signupLastName');
    var emailInput = document.getElementById('signupEmail');
    var orgInput = document.getElementById('signupOrg');
    var passwordInput = document.getElementById('signupPassword');
    var emailError = document.getElementById('signupEmailError');
    var passwordError = document.getElementById('signupPasswordError');
    var passwordToggle = document.getElementById('signupPasswordToggle');
    var strengthFill = document.getElementById('passwordStrengthFill');
    var strengthText = document.getElementById('passwordStrengthText');
    var termsAgree = document.getElementById('termsAgree');
    var googleBtn = document.getElementById('googleSignUp');
    var submitBtn = document.getElementById('signupSubmit');

    console.log('[Signup] Step 3: DOM elements:');
    console.log('  form:', !!form);
    console.log('  firstName:', !!firstNameInput);
    console.log('  lastName:', !!lastNameInput);
    console.log('  email:', !!emailInput);
    console.log('  password:', !!passwordInput);
    console.log('  submitBtn:', !!submitBtn);
    console.log('  termsAgree:', !!termsAgree);

    if (!form) {
        console.error('[Signup] FATAL: #signupForm not found');
        return;
    }

    // ============================================
    // PASSWORD TOGGLE
    // ============================================
    if (passwordToggle) {
        passwordToggle.addEventListener('click', function (e) {
            e.preventDefault();
            var isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            var icon = passwordToggle.querySelector('i');
            if (icon) icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
        });
    }

    // ============================================
    // PASSWORD STRENGTH
    // ============================================
    if (passwordInput) {
        passwordInput.addEventListener('input', function () {
            var val = passwordInput.value;
            var strength = calcStrength(val);
            if (strengthFill) strengthFill.className = 'password-strength-fill ' + strength.level;
            if (strengthText) strengthText.textContent = val.length > 0 ? strength.label : '';
        });
    }

    // ============================================
    // GOOGLE PLACEHOLDER
    // ============================================
    if (googleBtn) {
        googleBtn.addEventListener('click', function (e) {
            e.preventDefault();
            FluxToast.show('Google sign-up is not available. Please use email.', 'info');
        });
    }

    // ============================================
    // FORM SUBMIT
    // ============================================
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        e.stopPropagation();

        console.log('[Signup] Step 4: Form submitted');

        // Clear errors
        clearErrors();

        // Read values
        var fName = firstNameInput ? firstNameInput.value.trim() : '';
        var lName = lastNameInput ? lastNameInput.value.trim() : '';
        var em = emailInput ? emailInput.value.trim() : '';
        var pw = passwordInput ? passwordInput.value : '';
        var roleEl = document.querySelector('input[name="signupRole"]:checked');
        var role = roleEl ? roleEl.value : 'client';
        var orgVal = orgInput ? orgInput.value.trim() : '';

        console.log('[Signup] Step 5: Form values:');
        console.log('  name:', fName, lName);
        console.log('  email:', em);
        console.log('  password length:', pw.length);
        console.log('  role:', role);
        console.log('  org:', orgVal);

        // ---- Validate ----
        var valid = true;

        if (!fName) {
            FluxToast.show('First name is required', 'error');
            if (firstNameInput) firstNameInput.classList.add('error');
            valid = false;
        }
        if (!lName) {
            FluxToast.show('Last name is required', 'error');
            if (lastNameInput) lastNameInput.classList.add('error');
            valid = false;
        }
        if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
            if (emailError) { emailError.textContent = 'Valid email required'; emailError.classList.add('visible'); }
            if (emailInput) emailInput.classList.add('error');
            valid = false;
        }
        if (!pw || pw.length < 8) {
            if (passwordError) { passwordError.textContent = 'Min 8 characters'; passwordError.classList.add('visible'); }
            if (passwordInput) passwordInput.classList.add('error');
            valid = false;
        }
        if (termsAgree && !termsAgree.checked) {
            FluxToast.show('Please agree to Terms of Service', 'warning');
            valid = false;
        }

        if (!valid) {
            console.log('[Signup] Validation failed');
            return;
        }

        console.log('[Signup] Step 6: Validation passed');

        // ---- Show loading ----
        setLoading(true);

        // ---- Build signup data ----
        var finalOrg = orgVal || (role === 'client' ? fName + '\'s Company' : fName + '\'s Agency');

        var signupData = {
            firstName: fName,
            lastName: lName,
            email: em,
            password: pw,
            role: role,
            org: finalOrg
        };

        console.log('[Signup] Step 7: Calling FluxAPI.signup with:', JSON.stringify(signupData));

        // ---- Check if FluxAPI.signup exists ----
        if (typeof FluxAPI.signup !== 'function') {
            console.error('[Signup] FATAL: FluxAPI.signup is not a function');
            console.log('[Signup] FluxAPI keys:', Object.keys(FluxAPI));
            FluxToast.show('System error: signup function not found', 'error');
            setLoading(false);
            return;
        }

        // ---- Call signup ----
        var result;
        try {
            result = FluxAPI.signup(signupData);
            console.log('[Signup] Step 8: FluxAPI.signup returned:', result);
            console.log('[Signup] Result type:', typeof result);
            console.log('[Signup] Is promise:', result && typeof result.then === 'function');
        } catch (callError) {
            console.error('[Signup] Step 8 FAILED: FluxAPI.signup threw:', callError);
            console.error('[Signup] Error stack:', callError.stack);
            FluxToast.show('Account creation failed: ' + callError.message, 'error');
            setLoading(false);
            return;
        }

        // ---- Handle result ----
        if (result && typeof result.then === 'function') {
            // It is a Promise
            result.then(function (res) {
                console.log('[Signup] Step 9: Promise resolved:', JSON.stringify(res));

                if (!res) {
                    console.error('[Signup] Response is null/undefined');
                    FluxToast.show('Empty response from server', 'error');
                    setLoading(false);
                    return;
                }

                if (!res.ok) {
                    console.error('[Signup] Signup rejected:', res.error);
                    FluxToast.show(res.error || 'Could not create account', 'error');
                    setLoading(false);
                    return;
                }

                console.log('[Signup] Step 10: Account created! Session:', JSON.stringify(res.data));

                // Seed starter data (non-fatal)
                try {
                    seedStarterData(res.data, role, finalOrg);
                    console.log('[Signup] Step 11: Starter data seeded');
                } catch (seedErr) {
                    console.warn('[Signup] Step 11: Seeding failed (non-fatal):', seedErr.message);
                }

                // Success toast
                FluxToast.show('Welcome to Flux, ' + fName + '!', 'success');

                // Redirect
                console.log('[Signup] Step 12: Redirecting to dashboard in 1 second...');
                setTimeout(function () {
                    console.log('[Signup] Step 13: Redirecting NOW');
                    window.location.href = 'dashboard.html';
                }, 1000);

            }).catch(function (promiseErr) {
                console.error('[Signup] Step 9 FAILED: Promise rejected:', promiseErr);
                console.error('[Signup] Error:', promiseErr.message || promiseErr);
                FluxToast.show('Account creation failed. Check console for details.', 'error');
                setLoading(false);
            });

        } else if (result && result.ok !== undefined) {
            // It returned directly (not a Promise)
            console.log('[Signup] Step 8b: Direct return (not Promise):', JSON.stringify(result));

            if (result.ok) {
                try {
                    seedStarterData(result.data, role, finalOrg);
                } catch (seedErr) {
                    console.warn('[Signup] Seeding failed:', seedErr.message);
                }

                FluxToast.show('Welcome to Flux, ' + fName + '!', 'success');
                setTimeout(function () {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                FluxToast.show(result.error || 'Could not create account', 'error');
                setLoading(false);
            }

        } else {
            console.error('[Signup] Step 8c: Unexpected return type:', typeof result, result);
            FluxToast.show('Unexpected response format', 'error');
            setLoading(false);
        }
    });

    // ============================================
    // LOADING STATE
    // ============================================
    function setLoading(isLoading) {
        if (!submitBtn) return;
        submitBtn.disabled = isLoading;
        submitBtn.innerHTML = isLoading
            ? '<i class="fas fa-spinner fa-spin"></i> Creating account...'
            : '<i class="fas fa-user-plus"></i> Create Account';
    }

    // ============================================
    // SEED STARTER DATA
    // ============================================
    function seedStarterData(session, role, orgName) {
        console.log('[Signup Seed] Starting with:', JSON.stringify(session), role, orgName);

        var now = Date.now();
        var userName = 'You';

        if (session && session.name) {
            userName = session.name;
        }

        // Project
        var projectId = 'proj_' + now;
        var projects = [];

        try {
            var stored = FluxStorage.get('projects', null);
            if (Array.isArray(stored)) {
                projects = stored;
            }
        } catch (e) {
            projects = [];
        }

        projects.push({
            id: projectId,
            name: 'My First Project',
            client: orgName || 'My Company',
            description: 'Welcome to Flux!',
            color: '1',
            createdAt: now,
            updatedAt: now
        });

        FluxStorage.set('projects', projects);
        FluxStorage.set('active_project', projectId);

        console.log('[Signup Seed] Project created:', projectId);

        // Feedback
        var store = null;
        try {
            store = FluxStorage.get('feedback_data', null);
        } catch (e) {
            store = null;
        }

        if (!store || typeof store !== 'object') {
            store = { feedback: [], nextId: 1 };
        }
        if (!Array.isArray(store.feedback)) {
            store.feedback = [];
        }
        if (typeof store.nextId !== 'number' || isNaN(store.nextId)) {
            store.nextId = 1;
        }

        var id1 = store.nextId;
        store.nextId = store.nextId + 1;
        var id2 = store.nextId;
        store.nextId = store.nextId + 1;

        var items = [
            {
                id: id1,
                title: 'Welcome to Flux!',
                description: 'This is a sample feedback item. Click any card to see details and post comments.',
                type: 'design',
                status: 'new',
                client: orgName || 'Getting Started',
                projectId: projectId,
                timestamp: now - 3600000,
                files: [],
                priority: 'normal',
                comments: [
                    {
                        id: now - 500,
                        author: 'Flux',
                        role: 'agency',
                        text: 'Welcome! Try submitting your own feedback with the + button.',
                        timestamp: now - 1800000
                    }
                ],
                history: [
                    { from: null, to: 'new', timestamp: now - 3600000, by: userName }
                ]
            },
            {
                id: id2,
                title: 'Try the feedback form',
                description: 'Click the + button or press N to submit new feedback.',
                type: 'technical',
                status: 'new',
                client: orgName || 'Getting Started',
                projectId: projectId,
                timestamp: now - 7200000,
                files: [],
                priority: 'low',
                comments: [],
                history: [
                    { from: null, to: 'new', timestamp: now - 7200000, by: userName }
                ]
            }
        ];

        if (role === 'agency') {
            var id3 = store.nextId;
            store.nextId = store.nextId + 1;

            items.push({
                id: id3,
                title: 'Try Agency View',
                description: 'Switch to Agency View in the header to drag cards and use bulk actions.',
                type: 'copy',
                status: 'review',
                client: orgName || 'Getting Started',
                projectId: projectId,
                timestamp: now - 10800000,
                files: [],
                priority: 'high',
                comments: [],
                history: [
                    { from: null, to: 'new', timestamp: now - 10800000, by: userName },
                    { from: 'new', to: 'review', timestamp: now - 5400000, by: userName }
                ]
            });
        }

        // Prepend new items
        for (var i = items.length - 1; i >= 0; i--) {
            store.feedback.unshift(items[i]);
        }

        FluxStorage.set('feedback_data', store);
        console.log('[Signup Seed] Feedback created:', items.length, 'items');

        // Notifications
        var notifs = [];
        try {
            var storedNotifs = FluxStorage.get('notifications', null);
            if (Array.isArray(storedNotifs)) {
                notifs = storedNotifs;
            }
        } catch (e) {
            notifs = [];
        }

        notifs.unshift({
            id: now,
            text: 'Welcome to Flux! Your account is ready.',
            type: 'success',
            icon: 'fa-rocket',
            timestamp: now,
            read: false,
            feedbackId: null
        });

        FluxStorage.set('notifications', notifs);
        console.log('[Signup Seed] Complete');
    }

    // ============================================
    // HELPERS
    // ============================================
    function clearErrors() {
        try {
            var inputs = document.querySelectorAll('#signupForm .flux-form-input');
            for (var i = 0; i < inputs.length; i++) {
                inputs[i].classList.remove('error');
            }
            var errors = document.querySelectorAll('#signupForm .flux-form-error');
            for (var j = 0; j < errors.length; j++) {
                errors[j].classList.remove('visible');
            }
        } catch (e) {
            // safe to ignore
        }
    }

    function calcStrength(pw) {
        var score = 0;
        if (pw.length >= 8) score++;
        if (pw.length >= 12) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;

        if (score <= 1) return { level: 'weak', label: 'Weak' };
        if (score === 2) return { level: 'fair', label: 'Fair' };
        if (score === 3) return { level: 'good', label: 'Good' };
        return { level: 'strong', label: 'Strong' };
    }

    console.log('[Signup] Setup complete. Form is ready.');
});