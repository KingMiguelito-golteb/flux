/* ================================================
   FLUX — NAVIGATION MODULE
   Handles user menu dropdown, logout, and
   populating the header with session data.
   Used on dashboard, projects, account pages.
   ================================================ */

var FluxNav = (function () {
    'use strict';

    function init() {
        var session = FluxAPI.getSession();
        if (!session) {
            window.location.href = 'login.html';
            return;
        }

        _populateHeader(session);
        _setupUserMenu();
        _setupLogout();
        _closeDropdownsOnOutsideClick();
    }

    function _populateHeader(session) {
        var initials = _getInitials(session.name);

        var headerAvatar = document.getElementById('headerAvatar');
        var headerUserName = document.getElementById('headerUserName');
        var dropdownName = document.getElementById('dropdownName');
        var dropdownEmail = document.getElementById('dropdownEmail');

        if (headerAvatar) {
            if (session.avatar) {
                headerAvatar.innerHTML = '<img src="' + session.avatar + '" alt="">';
            } else {
                headerAvatar.textContent = initials;
            }
        }
        if (headerUserName) headerUserName.textContent = session.name;
        if (dropdownName) dropdownName.textContent = session.name;
        if (dropdownEmail) dropdownEmail.textContent = session.email;
    }

    function _setupUserMenu() {
        var btn = document.getElementById('userMenuBtn');
        var dropdown = document.getElementById('userDropdown');
        if (!btn || !dropdown) return;

        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');

            // Close notification dropdown if open
            var notifDropdown = document.getElementById('notifDropdown');
            if (notifDropdown) notifDropdown.classList.add('hidden');
        });
    }

    function _setupLogout() {
        var logoutBtn = document.getElementById('logoutBtn');
        if (!logoutBtn) return;

        logoutBtn.addEventListener('click', function () {
            FluxAPI.logout();
            FluxToast.show('Signed out successfully', 'success');
            setTimeout(function () {
                window.location.href = 'login.html';
            }, 800);
        });
    }

    function _closeDropdownsOnOutsideClick() {
        document.addEventListener('click', function (e) {
            // User dropdown
            var userMenu = document.getElementById('userMenu');
            var userDropdown = document.getElementById('userDropdown');
            if (userDropdown && userMenu && !userMenu.contains(e.target)) {
                userDropdown.classList.add('hidden');
            }

            // Notif dropdown
            var notifWrapper = document.getElementById('notifWrapper');
            var notifDropdown = document.getElementById('notifDropdown');
            if (notifDropdown && notifWrapper && !notifWrapper.contains(e.target)) {
                notifDropdown.classList.add('hidden');
            }
        });
    }

    function _getInitials(name) {
        if (!name) return '?';
        return name.split(' ').map(function (w) { return w[0]; }).join('').substring(0, 2).toUpperCase();
    }

    return { init: init };
})();