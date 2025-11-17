/**
 * Web-Native Memory Management for Pango.wasm
 * Integrates with browser GC via WeakRef and FinalizationRegistry
 */

#include <emscripten.h>
#include <stdlib.h>
#include <stdint.h>

/**
 * Register object for GC integration via WeakRef
 * Allows browser GC to track WASM allocations
 */
EM_JS(void, register_weak_ref, (void* ptr, void (*finalizer)(void*)), {
    if (typeof WeakRef === 'undefined' || typeof FinalizationRegistry === 'undefined') {
        // WeakRef not available, skip registration
        return;
    }

    // Create global registry if it doesn't exist
    if (typeof Module._gcRegistry === 'undefined') {
        Module._gcRegistry = new FinalizationRegistry((heldValue) => {
            // Call finalizer when object is GC'd
            if (heldValue.finalizer && heldValue.ptr) {
                dynCall('vi', heldValue.finalizer, [heldValue.ptr]);
            }
        });
    }

    // Register the pointer
    const ref = new WeakRef({ ptr: $0 });
    Module._gcRegistry.register(ref, {
        ptr: $0,
        finalizer: $1
    });
}, ptr, finalizer);

/**
 * Allocate memory with GC tracking
 */
EMSCRIPTEN_KEEPALIVE
void* web_malloc_tracked(size_t size, void (*finalizer)(void*)) {
    void* ptr = malloc(size);
    if (ptr && finalizer) {
        register_weak_ref(ptr, finalizer);
    }
    return ptr;
}

/**
 * Get memory usage statistics
 */
EMSCRIPTEN_KEEPALIVE
void web_get_memory_stats(size_t* used, size_t* total, size_t* limit) {
    EM_ASM({
        if (typeof performance !== 'undefined' && performance.memory) {
            setValue($0, performance.memory.usedJSHeapSize, 'i32');
            setValue($1, performance.memory.totalJSHeapSize, 'i32');
            setValue($2, performance.memory.jsHeapSizeLimit, 'i32');
        } else {
            setValue($0, 0, 'i32');
            setValue($1, 0, 'i32');
            setValue($2, 0, 'i32');
        }
    }, used, total, limit);
}
