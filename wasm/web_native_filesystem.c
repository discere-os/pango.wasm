/**
 * Origin Private File System (OPFS) Integration for Pango.wasm
 * Target: 3-4x faster than IndexedDB (Chrome 102+)
 */

#include <emscripten.h>
#include <stddef.h>
#include <stdint.h>
#include "web_native_capabilities.h"

typedef enum {
    STORAGE_MEMORY,     // Fastest, temporary
    STORAGE_OPFS,       // Fast, persistent (3-4x vs IDBFS)
    STORAGE_CACHE,      // Medium, browser cache
    STORAGE_REMOTE      // Slowest, network
} StorageTier;

/**
 * Read file from OPFS (asynchronous)
 * Target: 3-4x faster than IDBFS
 */
EM_JS(void, web_storage_read_opfs, (const char* path, void (*callback)(const uint8_t*, size_t, void*), void* user_data), {
    const pathStr = UTF8ToString(path);

    if (typeof navigator.storage === 'undefined' ||
        typeof navigator.storage.getDirectory !== 'function') {
        console.error('OPFS not available');
        if (callback) {
            dynCall('viii', callback, [0, 0, user_data]);
        }
        return;
    }

    navigator.storage.getDirectory()
        .then(root => root.getFileHandle(pathStr))
        .then(handle => handle.getFile())
        .then(file => file.arrayBuffer())
        .then(buffer => {
            const ptr = _malloc(buffer.byteLength);
            HEAPU8.set(new Uint8Array(buffer), ptr);
            if (callback) {
                dynCall('viii', callback, [ptr, buffer.byteLength, user_data]);
            }
            _free(ptr);
        })
        .catch(err => {
            console.error('OPFS read error:', err);
            if (callback) {
                dynCall('viii', callback, [0, 0, user_data]);
            }
        });
});

/**
 * Write file to OPFS (asynchronous)
 */
EM_JS(void, web_storage_write_opfs, (const char* path, const uint8_t* data, size_t size, void (*callback)(int, void*), void* user_data), {
    const pathStr = UTF8ToString(path);
    const buffer = HEAPU8.slice(data, data + size);

    if (typeof navigator.storage === 'undefined' ||
        typeof navigator.storage.getDirectory !== 'function') {
        console.error('OPFS not available');
        if (callback) {
            dynCall('vii', callback, [0, user_data]);
        }
        return;
    }

    navigator.storage.getDirectory()
        .then(root => root.getFileHandle(pathStr, { create: true }))
        .then(handle => handle.createWritable())
        .then(writable => {
            return writable.write(buffer).then(() => writable.close());
        })
        .then(() => {
            if (callback) {
                dynCall('vii', callback, [1, user_data]);
            }
        })
        .catch(err => {
            console.error('OPFS write error:', err);
            if (callback) {
                dynCall('vii', callback, [0, user_data]);
            }
        });
});

/**
 * Check if OPFS is available
 */
EMSCRIPTEN_KEEPALIVE
int web_opfs_available(void) {
    const WebCapabilities* caps = web_get_capabilities();
    return caps->has_opfs ? 1 : 0;
}
