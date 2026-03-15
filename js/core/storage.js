/* ================================================
   FLUX — STORAGE MODULE
   ================================================ */

var FluxStorage = (function () {
    'use strict';

    var PREFIX = 'flux_';

    function get(key, defaultValue) {
        try {
            var raw = localStorage.getItem(PREFIX + key);
            if (raw === null) return defaultValue !== undefined ? defaultValue : null;
            return JSON.parse(raw);
        } catch (e) {
            console.warn('[FluxStorage] Failed to read key:', key, e);
            return defaultValue !== undefined ? defaultValue : null;
        }
    }

    function set(key, value) {
        try {
            localStorage.setItem(PREFIX + key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn('[FluxStorage] Failed to write key:', key, e);
            return false;
        }
    }

    function remove(key) {
        try {
            localStorage.removeItem(PREFIX + key);
        } catch (e) {
            console.warn('[FluxStorage] Failed to remove key:', key, e);
        }
    }

    function clearAll() {
        try {
            var keysToRemove = [];
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (k && k.indexOf(PREFIX) === 0) {
                    keysToRemove.push(k);
                }
            }
            keysToRemove.forEach(function (k) {
                localStorage.removeItem(k);
            });
        } catch (e) {
            console.warn('[FluxStorage] Failed to clear:', e);
        }
    }

    function has(key) {
        return localStorage.getItem(PREFIX + key) !== null;
    }

    console.log('[FluxStorage] Module loaded successfully');

    return {
        get: get,
        set: set,
        remove: remove,
        clearAll: clearAll,
        has: has
    };
})();