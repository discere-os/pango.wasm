/**
 * RequestAnimationFrame Main Loop for Pango.wasm
 * For UI libraries - syncs with browser rendering (60 FPS)
 */

#include <emscripten.h>

/**
 * Setup RequestAnimationFrame loop
 * Syncs with browser's 60 FPS rendering
 */
EM_JS(void, setup_raf_loop, (void (*callback)(void*), void* user_data), {
    if (typeof requestAnimationFrame === 'undefined') {
        console.warn('requestAnimationFrame not available');
        return;
    }

    function loop() {
        dynCall('vi', $0, [$1]);
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
}, callback, user_data);

/**
 * Setup requestIdleCallback for background work
 * Runs during browser idle time
 */
EM_JS(void, setup_idle_callback, (void (*callback)(void*), void* user_data), {
    if (typeof requestIdleCallback === 'undefined') {
        // Fallback to setTimeout
        function idle() {
            dynCall('vi', $0, [$1]);
            setTimeout(idle, 100);
        }
        setTimeout(idle, 100);
    } else {
        function idle() {
            dynCall('vi', $0, [$1]);
            requestIdleCallback(idle);
        }
        requestIdleCallback(idle);
    }
}, callback, user_data);

/**
 * Check if requestAnimationFrame is available
 */
EMSCRIPTEN_KEEPALIVE
int web_raf_available(void) {
    return EM_ASM_INT({
        return typeof requestAnimationFrame !== 'undefined' ? 1 : 0;
    });
}
