/* ================================================
   FLUX — SPLASH SCREEN MODULE
   Shows a branded loading screen, then fades out
   once the page is fully ready.
   ================================================ */

var FluxSplash = (function () {
    'use strict';

    var MIN_DISPLAY_MS = 800;
    var startTime = Date.now();

    /**
     * Inject splash screen HTML into the page
     * Call this BEFORE DOMContentLoaded for instant display
     */
    function inject() {
        /* Only inject if not already present */
        if (document.getElementById('fluxSplash')) return;

        var splash = document.createElement('div');
        splash.className = 'flux-splash';
        splash.id = 'fluxSplash';
        splash.innerHTML =
            '<div class="flux-splash-logo">' +
            '  <i class="fas fa-bolt"></i>' +
            '  <span>Flux</span>' +
            '</div>' +
            '<div class="flux-splash-bar">' +
            '  <div class="flux-splash-bar-fill"></div>' +
            '</div>' +
            '<div class="flux-splash-text">Loading your workspace…</div>';

        /* Prepend to body so it's the first visible element */
        if (document.body) {
            document.body.prepend(splash);
        } else {
            document.addEventListener('DOMContentLoaded', function () {
                document.body.prepend(splash);
            });
        }
    }

    /**
     * Hide the splash screen with a fade animation.
     * Ensures minimum display time so it doesn't flash.
     */
    function hide() {
        var splash = document.getElementById('fluxSplash');
        if (!splash) return;

        var elapsed = Date.now() - startTime;
        var remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);

        setTimeout(function () {
            splash.classList.add('fade-out');
            setTimeout(function () {
                if (splash.parentNode) {
                    splash.parentNode.removeChild(splash);
                }
            }, 500);
        }, remaining);
    }

    /* Auto-inject immediately */
    inject();

    return {
        inject: inject,
        hide: hide
    };
})();