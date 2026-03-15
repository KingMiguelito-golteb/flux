/* ================================================
   FLUX — NOTIFICATIONS UI MODULE
   Handles the bell icon dropdown on all pages.
   ================================================ */

var FluxNotifications = (function () {
    'use strict';

    function init() {
        _setupBell();
        _setupMarkAllRead();
        updateBadge();
    }

    function _setupBell() {
        var bell = document.getElementById('notifBell');
        var dropdown = document.getElementById('notifDropdown');
        if (!bell || !dropdown) return;

        bell.addEventListener('click', function (e) {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
            if (!dropdown.classList.contains('hidden')) {
                renderList();
            }

            // Close user dropdown
            var userDropdown = document.getElementById('userDropdown');
            if (userDropdown) userDropdown.classList.add('hidden');
        });
    }

    function _setupMarkAllRead() {
        var btn = document.getElementById('markAllRead');
        if (!btn) return;

        btn.addEventListener('click', function () {
            FluxAPI.markAllNotificationsRead();
            updateBadge();
            renderList();
            FluxToast.show('All notifications marked as read', 'success');
        });
    }

    function updateBadge() {
        FluxAPI.getNotifications().then(function (res) {
            var badge = document.getElementById('notifBadge');
            if (!badge) return;

            var unread = (res.data || []).filter(function (n) { return !n.read; }).length;
            if (unread > 0) {
                badge.textContent = unread > 99 ? '99+' : unread;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        });
    }

    function renderList() {
        FluxAPI.getNotifications().then(function (res) {
            var list = document.getElementById('notifList');
            var empty = document.getElementById('notifEmpty');
            if (!list) return;

            var notifs = res.data || [];
            if (notifs.length === 0) {
                list.classList.add('hidden');
                if (empty) empty.classList.remove('hidden');
                return;
            }

            if (empty) empty.classList.add('hidden');
            list.classList.remove('hidden');

            list.innerHTML = notifs.slice(0, 20).map(function (n) {
                return '' +
                    '<div class="flux-notif-item ' + (n.read ? '' : 'unread') + '" data-notif-id="' + n.id + '"' +
                    (n.feedbackId ? ' data-feedback-id="' + n.feedbackId + '"' : '') + '>' +
                    '  <div class="flux-notif-icon ' + (n.type || 'info') + '">' +
                    '    <i class="fas ' + (n.icon || 'fa-bell') + '"></i>' +
                    '  </div>' +
                    '  <div class="flux-notif-content">' +
                    '    <div class="flux-notif-text">' + _escapeHtml(n.text) + '</div>' +
                    '    <div class="flux-notif-time">' + _timeAgo(n.timestamp) + '</div>' +
                    '  </div>' +
                    '</div>';
            }).join('');

            // Click handlers
            list.querySelectorAll('.flux-notif-item').forEach(function (el) {
                el.addEventListener('click', function () {
                    var notifId = parseInt(el.dataset.notifId);
                    FluxAPI.markNotificationRead(notifId);
                    el.classList.remove('unread');
                    updateBadge();

                    var feedbackId = el.dataset.feedbackId;
                    if (feedbackId) {
                        window.location.href = 'dashboard.html?detail=' + feedbackId;
                    }

                    var dropdown = document.getElementById('notifDropdown');
                    if (dropdown) dropdown.classList.add('hidden');
                });
            });
        });
    }

    /**
     * Add a notification and update the UI
     */
    function push(text, type, icon, feedbackId) {
        FluxAPI.addNotification({
            text: text,
            type: type || 'info',
            icon: icon || 'fa-bell',
            feedbackId: feedbackId || null
        }).then(function () {
            updateBadge();
        });
    }

    function _timeAgo(timestamp) {
        var seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'just now';
        var minutes = Math.floor(seconds / 60);
        if (minutes < 60) return minutes + 'm ago';
        var hours = Math.floor(minutes / 60);
        if (hours < 24) return hours + 'h ago';
        var days = Math.floor(hours / 24);
        if (days < 7) return days + 'd ago';
        return new Date(timestamp).toLocaleDateString();
    }

    function _escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    return {
        init: init,
        updateBadge: updateBadge,
        renderList: renderList,
        push: push
    };
})();