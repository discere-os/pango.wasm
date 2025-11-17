/**
 * Fetch API Integration for Pango.wasm
 * Target: 3-5x faster than XMLHttpRequest
 */

#include <emscripten.h>
#include <stddef.h>

/**
 * Fetch data from URL using Fetch API
 * Target: 3-5x speedup vs XMLHttpRequest
 */
EM_JS(void, web_fetch_get, (const char* url, void (*callback)(const char*, void*), void* user_data), {
    const urlStr = UTF8ToString(url);

    if (typeof fetch === 'undefined') {
        console.error('Fetch API not available');
        if (callback) {
            dynCall('vii', callback, [0, user_data]);
        }
        return;
    }

    fetch(urlStr)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.text();
        })
        .then(text => {
            const ptr = allocateUTF8(text);
            if (callback) {
                dynCall('vii', callback, [ptr, user_data]);
            }
            _free(ptr);
        })
        .catch(err => {
            console.error('Fetch error:', err);
            if (callback) {
                dynCall('vii', callback, [0, user_data]);
            }
        });
});

/**
 * Fetch binary data from URL
 */
EM_JS(void, web_fetch_binary, (const char* url, void (*callback)(const uint8_t*, size_t, void*), void* user_data), {
    const urlStr = UTF8ToString(url);

    if (typeof fetch === 'undefined') {
        console.error('Fetch API not available');
        if (callback) {
            dynCall('viii', callback, [0, 0, user_data]);
        }
        return;
    }

    fetch(urlStr)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.arrayBuffer();
        })
        .then(buffer => {
            const ptr = _malloc(buffer.byteLength);
            HEAPU8.set(new Uint8Array(buffer), ptr);
            if (callback) {
                dynCall('viii', callback, [ptr, buffer.byteLength, user_data]);
            }
            _free(ptr);
        })
        .catch(err => {
            console.error('Fetch error:', err);
            if (callback) {
                dynCall('viii', callback, [0, 0, user_data]);
            }
        });
});

/**
 * Check if Fetch API is available
 */
EMSCRIPTEN_KEEPALIVE
int web_fetch_available(void) {
    return EM_ASM_INT({
        return typeof fetch !== 'undefined' ? 1 : 0;
    });
}
