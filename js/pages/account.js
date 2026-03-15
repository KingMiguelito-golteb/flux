/* ================================================
   FLUX — ACCOUNT SETTINGS PAGE
   ================================================ */

(function () {
    'use strict';

    // ---- Auth guard ----
    var session = FluxAPI.requireAuth();
    if (!session) return;

    // ---- Init shared modules ----
    FluxNav.init();
    FluxNotifications.init();

    // ---- Load user data ----
    FluxAPI.getUser(session.id).then(function (res) {
        if (res.ok) populateForm(res.data);
    });

    // ==================================
    // SIDEBAR NAVIGATION
    // ==================================
    var sidebarLinks = document.querySelectorAll('.account-sidebar-link');
    sidebarLinks.forEach(function (link) {
        link.addEventListener('click', function () {
            var section = link.dataset.section;

            // Update active link
            sidebarLinks.forEach(function (l) { l.classList.remove('active'); });
            link.classList.add('active');

            // Scroll to section
            var target = document.getElementById('section' + capitalize(section));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ==================================
    // POPULATE FORM FROM STORED DATA
    // ==================================
    function populateForm(user) {
        setValue('profileFirstName', user.firstName);
        setValue('profileLastName', user.lastName);
        setValue('profileEmail', user.email);
        setValue('profileJobTitle', user.jobTitle || '');
        setValue('orgName', user.org || '');
        setValue('orgTeamName', user.teamName || '');

        var roleSelect = document.getElementById('orgRole');
        if (roleSelect) roleSelect.value = user.role || 'client';

        // Avatar
        var avatarPreview = document.getElementById('avatarPreview');
        if (avatarPreview) {
            if (user.avatar) {
                avatarPreview.innerHTML = '<img src="' + user.avatar + '" alt="">';
            } else {
                avatarPreview.textContent = getInitials(user.firstName + ' ' + user.lastName);
            }
        }

        // Notification prefs
        if (user.notificationPrefs) {
            setChecked('notifEmail', user.notificationPrefs.email);
            setChecked('notifInApp', user.notificationPrefs.inApp);
            setChecked('notifReplies', user.notificationPrefs.replies);
            setChecked('notifStatus', user.notificationPrefs.statusChanges);
            setChecked('notifDigest', user.notificationPrefs.digest);
        }
    }

    // ==================================
    // AVATAR UPLOAD
    // ==================================
    var uploadBtn = document.getElementById('uploadAvatarBtn');
    var avatarInput = document.getElementById('avatarInput');
    var removeAvatarBtn = document.getElementById('removeAvatarBtn');

    if (uploadBtn) {
        uploadBtn.addEventListener('click', function () { avatarInput.click(); });
    }

    if (avatarInput) {
        avatarInput.addEventListener('change', function () {
            var file = avatarInput.files[0];
            if (!file) return;

            if (file.size > 2 * 1024 * 1024) {
                FluxToast.show('File must be under 2MB', 'error');
                return;
            }

            var reader = new FileReader();
            reader.onload = function (e) {
                var dataUrl = e.target.result;

                FluxAPI.updateUser(session.id, { avatar: dataUrl }).then(function () {
                    var preview = document.getElementById('avatarPreview');
                    preview.innerHTML = '<img src="' + dataUrl + '" alt="">';

                    // Update header avatar
                    var headerAv = document.getElementById('headerAvatar');
                    if (headerAv) headerAv.innerHTML = '<img src="' + dataUrl + '" alt="">';

                    FluxToast.show('Avatar updated', 'success');
                });
            };
            reader.readAsDataURL(file);
        });
    }

    if (removeAvatarBtn) {
        removeAvatarBtn.addEventListener('click', function () {
            FluxAPI.updateUser(session.id, { avatar: null }).then(function () {
                FluxAPI.getUser(session.id).then(function (res) {
                    if (res.ok) {
                        var initials = getInitials(res.data.firstName + ' ' + res.data.lastName);
                        document.getElementById('avatarPreview').textContent = initials;
                        var headerAv = document.getElementById('headerAvatar');
                        if (headerAv) { headerAv.innerHTML = ''; headerAv.textContent = initials; }
                    }
                });
                FluxToast.show('Avatar removed', 'info');
            });
        });
    }

    // ==================================
    // SAVE PROFILE
    // ==================================
    var saveProfile = document.getElementById('saveProfile');
    if (saveProfile) {
        saveProfile.addEventListener('click', function () {
            var updates = {
                firstName: document.getElementById('profileFirstName').value.trim(),
                lastName: document.getElementById('profileLastName').value.trim(),
                email: document.getElementById('profileEmail').value.trim(),
                jobTitle: document.getElementById('profileJobTitle').value.trim()
            };

            if (!updates.firstName || !updates.lastName) {
                FluxToast.show('Name fields are required', 'error');
                return;
            }

            FluxAPI.updateUser(session.id, updates).then(function (res) {
                if (res.ok) {
                    FluxToast.show('Profile saved', 'success');
                    // Refresh header
                    FluxNav.init();
                } else {
                    FluxToast.show(res.error, 'error');
                }
            });
        });
    }

    var cancelProfile = document.getElementById('cancelProfile');
    if (cancelProfile) {
        cancelProfile.addEventListener('click', function () {
            FluxAPI.getUser(session.id).then(function (res) {
                if (res.ok) populateForm(res.data);
            });
            FluxToast.show('Changes discarded', 'info');
        });
    }

    // ==================================
    // CHANGE PASSWORD
    // ==================================
    // Password toggles
    document.querySelectorAll('.password-toggle[data-target]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var target = document.getElementById(btn.dataset.target);
            if (!target) return;
            var isPassword = target.type === 'password';
            target.type = isPassword ? 'text' : 'password';
            btn.querySelector('i').className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
        });
    });

    var savePassword = document.getElementById('savePassword');
    if (savePassword) {
        savePassword.addEventListener('click', function () {
            var current = document.getElementById('currentPassword').value;
            var newPw = document.getElementById('newPassword').value;
            var confirm = document.getElementById('confirmPassword').value;

            if (!current) {
                FluxToast.show('Enter current password', 'error');
                return;
            }
            if (!newPw || newPw.length < 8) {
                FluxToast.show('New password must be at least 8 characters', 'error');
                return;
            }
            if (newPw !== confirm) {
                FluxToast.show('Passwords do not match', 'error');
                return;
            }

            FluxAPI.changePassword(session.id, current, newPw).then(function (res) {
                if (res.ok) {
                    FluxToast.show('Password updated successfully', 'success');
                    document.getElementById('currentPassword').value = '';
                    document.getElementById('newPassword').value = '';
                    document.getElementById('confirmPassword').value = '';
                } else {
                    FluxToast.show(res.error, 'error');
                }
            });
        });
    }

    // ==================================
    // NOTIFICATION PREFERENCES
    // ==================================
    var saveNotifications = document.getElementById('saveNotifications');
    if (saveNotifications) {
        saveNotifications.addEventListener('click', function () {
            var prefs = {
                email: document.getElementById('notifEmail').checked,
                inApp: document.getElementById('notifInApp').checked,
                replies: document.getElementById('notifReplies').checked,
                statusChanges: document.getElementById('notifStatus').checked,
                digest: document.getElementById('notifDigest').checked
            };

            FluxAPI.updateUser(session.id, { notificationPrefs: prefs }).then(function () {
                FluxToast.show('Notification preferences saved', 'success');
            });
        });
    }

    // ==================================
    // ORGANIZATION
    // ==================================
    var saveOrg = document.getElementById('saveOrg');
    if (saveOrg) {
        saveOrg.addEventListener('click', function () {
            var updates = {
                org: document.getElementById('orgName').value.trim(),
                role: document.getElementById('orgRole').value,
                teamName: document.getElementById('orgTeamName').value.trim()
            };

            FluxAPI.updateUser(session.id, updates).then(function () {
                FluxToast.show('Organization settings saved', 'success');
                FluxNav.init();
            });
        });
    }

    // ==================================
    // DANGER ZONE
    // ==================================
    var exportData = document.getElementById('exportData');
    if (exportData) {
        exportData.addEventListener('click', function () {
            FluxAPI.exportAllData().then(function (res) {
                var blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'flux-export-' + new Date().toISOString().split('T')[0] + '.json';
                a.click();
                URL.revokeObjectURL(url);
                FluxToast.show('Data exported successfully', 'success');
            });
        });
    }

    var deleteAllDataBtn = document.getElementById('deleteAllData');
    if (deleteAllDataBtn) {
        deleteAllDataBtn.addEventListener('click', function () {
            if (!confirm('Are you sure you want to delete ALL data? This cannot be undone.')) return;
            if (!confirm('This will remove all feedback, projects, and settings. Continue?')) return;

            FluxAPI.deleteAllData();
            FluxToast.show('All data deleted', 'error');
            setTimeout(function () {
                window.location.href = 'login.html';
            }, 1500);
        });
    }

    var deleteAccount = document.getElementById('deleteAccount');
    if (deleteAccount) {
        deleteAccount.addEventListener('click', function () {
            if (!confirm('Permanently delete your Flux account? This cannot be undone.')) return;

            FluxAPI.deleteAllData();
            FluxToast.show('Account deleted', 'error');
            setTimeout(function () {
                window.location.href = 'login.html';
            }, 1500);
        });
    }

    // ==================================
    // UTILITY
    // ==================================
    function setValue(id, val) {
        var el = document.getElementById(id);
        if (el) el.value = val || '';
    }

    function setChecked(id, val) {
        var el = document.getElementById(id);
        if (el) el.checked = !!val;
    }

    function getInitials(name) {
        return (name || '').split(' ').map(function (w) { return w[0]; }).join('').substring(0, 2).toUpperCase();
    }

    function capitalize(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }
    if (typeof FluxSplash !== 'undefined') {
        FluxSplash.hide();
    }
})();