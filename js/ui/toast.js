/* ================================================
   FLUX — TOAST NOTIFICATION MODULE
   Can be used on any page that has a
   .flux-toast-container element.
   ================================================ */

var FluxToast = (function () {
    'use strict';

    var ICON_MAP = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    /**
     * Show a toast notification
     * @param {string} message
     * @param {string} type — success | error | warning | info
     * @param {number} duration — ms (default 4000)
     */
    function show(message, type, duration) {
        type = type || 'info';
        duration = duration || 4000;

        var container = document.getElementById('toastContainer');
        if (!container) return;

        var toast = document.createElement('div');
        toast.className = 'flux-toast ' + type;
        toast.innerHTML =
            '<i class="fas ' + (ICON_MAP[type] || ICON_MAP.info) + ' flux-toast-icon"></i>' +
            '<span class="flux-toast-msg">' + _escapeHtml(message) + '</span>' +
            '<button class="flux-toast-close"><i class="fas fa-times"></i></button>';

        container.appendChild(toast);

        toast.querySelector('.flux-toast-close').addEventListener('click', function () {
            _remove(toast);
        });

        setTimeout(function () {
            _remove(toast);
        }, duration);
    }

    function _remove(toast) {
        if (!toast || !toast.parentNode) return;
        toast.classList.add('removing');
        setTimeout(function () {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }

    function _escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    return { show: show };
})();