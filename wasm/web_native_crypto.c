/**
 * Web Crypto API Integration for Pango.wasm
 * Target: 8-12x speedup for cryptographic operations (Chrome 37+)
 */

#include <emscripten.h>
#include <stddef.h>
#include <stdint.h>
#include "web_native_capabilities.h"

/**
 * Web Crypto SHA-256 (asynchronous)
 * Target: 8-12x speedup vs software implementation
 * Note: This is async and requires promise handling in JavaScript
 */
EM_JS(void, web_crypto_sha256_async, (const uint8_t* data, size_t len, uint8_t* hash, void (*callback)(void*), void* user_data), {
    if (typeof crypto === 'undefined' || typeof crypto.subtle === 'undefined') {
        // Fallback: call callback immediately with null
        if (callback) {
            dynCall('vi', callback, [user_data]);
        }
        return;
    }

    const buffer = HEAPU8.slice(data, data + len);
    crypto.subtle.digest('SHA-256', buffer)
        .then(result => {
            HEAPU8.set(new Uint8Array(result), hash);
            if (callback) {
                dynCall('vi', callback, [user_data]);
            }
        })
        .catch(err => {
            console.error('Web Crypto SHA-256 error:', err);
            if (callback) {
                dynCall('vi', callback, [user_data]);
            }
        });
});

/**
 * Web Crypto random bytes
 * Target: 5-10x speedup vs software PRNG
 */
EMSCRIPTEN_KEEPALIVE
void web_crypto_random_bytes(uint8_t* buffer, size_t length) {
    EM_ASM({
        if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
            const buf = new Uint8Array(Module.HEAPU8.buffer, $0, $1);
            crypto.getRandomValues(buf);
        } else {
            // Fallback to Math.random (not cryptographically secure!)
            for (let i = 0; i < $1; i++) {
                Module.HEAPU8[$0 + i] = Math.floor(Math.random() * 256);
            }
        }
    }, buffer, length);
}

/**
 * Check if Web Crypto is available
 */
EMSCRIPTEN_KEEPALIVE
int web_crypto_available(void) {
    const WebCapabilities* caps = web_get_capabilities();
    return caps->has_web_crypto ? 1 : 0;
}
