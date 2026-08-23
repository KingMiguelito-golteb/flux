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

    /* Failsafe: never trap the user behind the splash if a page
       script throws before it gets a chance to call hide(). */
    var FAILSAFE_MS = 5000;
    setTimeout(function () {
        if (document.getElementById('fluxSplash')) {
            console.warn('[FluxSplash] Failsafe triggered — hiding splash after ' + FAILSAFE_MS + 'ms');
            hide();
        }
    }, FAILSAFE_MS);

    window.addEventListener('error', function () {
        hide();
    });

    window.addEventListener('load', function () {
        /* Belt and braces: once everything is loaded, the splash
           should never outlive the page by more than a moment. */
        setTimeout(hide, 1200);
    });

    return {
        inject: inject,
        hide: hide
    };
})();