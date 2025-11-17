/**
 * SIMD-Optimized String Operations for Pango.wasm
 * Target: 3-5x speedup for string processing (Chrome 91+)
 */

#ifdef __wasm_simd128__
#include <wasm_simd128.h>
#endif
#include <string.h>
#include <stddef.h>
#include <emscripten.h>
#include "web_native_capabilities.h"

/**
 * SIMD-optimized strlen
 * Target: 3-4x speedup for strings >32 bytes
 */
EMSCRIPTEN_KEEPALIVE
size_t web_simd_strlen(const char* str) {
#ifdef __wasm_simd128__
    const WebCapabilities* caps = web_get_capabilities();
    if (!caps->has_wasm_simd || str == NULL) {
        return strlen(str);
    }

    const char* p = str;
    v128_t zero = wasm_i8x16_splat(0);

    // Process 16 bytes at a time
    while (1) {
        // Check if we're aligned
        if (((uintptr_t)p & 0xF) == 0) {
            // Aligned load
            v128_t chunk = wasm_v128_load((const v128_t*)p);
            v128_t cmp = wasm_i8x16_eq(chunk, zero);
            uint32_t mask = wasm_i8x16_bitmask(cmp);

            if (mask) {
                // Found null terminator
                return (p - str) + __builtin_ctz(mask);
            }
            p += 16;
        } else {
            // Unaligned - use scalar until aligned
            while (*p && ((uintptr_t)p & 0xF)) {
                p++;
            }
            if (*p == 0) {
                return p - str;
            }
        }
    }
#else
    return strlen(str);
#endif
}

/**
 * SIMD-optimized memcmp
 * Target: 4-5x speedup for buffers >64 bytes
 */
EMSCRIPTEN_KEEPALIVE
int web_simd_memcmp(const void* s1, const void* s2, size_t n) {
#ifdef __wasm_simd128__
    const WebCapabilities* caps = web_get_capabilities();
    if (!caps->has_wasm_simd || n < 32) {
        return memcmp(s1, s2, n);
    }

    const uint8_t* p1 = (const uint8_t*)s1;
    const uint8_t* p2 = (const uint8_t*)s2;
    size_t chunks = n / 16;

    for (size_t i = 0; i < chunks; i++) {
        v128_t a = wasm_v128_load((const v128_t*)(p1 + i * 16));
        v128_t b = wasm_v128_load((const v128_t*)(p2 + i * 16));
        v128_t cmp = wasm_i8x16_eq(a, b);
        uint32_t mask = wasm_i8x16_bitmask(cmp);

        if (mask != 0xFFFF) {
            // Found difference, find first differing byte
            for (size_t j = 0; j < 16; j++) {
                uint8_t b1 = p1[i * 16 + j];
                uint8_t b2 = p2[i * 16 + j];
                if (b1 != b2) {
                    return (int)b1 - (int)b2;
                }
            }
        }
    }

    // Compare remainder
    size_t remainder = n % 16;
    if (remainder > 0) {
        return memcmp(p1 + chunks * 16, p2 + chunks * 16, remainder);
    }

    return 0;
#else
    return memcmp(s1, s2, n);
#endif
}

/**
 * SIMD-optimized memset
 * Target: 3-4x speedup for buffers >128 bytes
 */
EMSCRIPTEN_KEEPALIVE
void* web_simd_memset(void* s, int c, size_t n) {
#ifdef __wasm_simd128__
    const WebCapabilities* caps = web_get_capabilities();
    if (!caps->has_wasm_simd || n < 64) {
        return memset(s, c, n);
    }

    uint8_t* p = (uint8_t*)s;
    v128_t val = wasm_i8x16_splat((uint8_t)c);
    size_t chunks = n / 16;

    for (size_t i = 0; i < chunks; i++) {
        wasm_v128_store((v128_t*)(p + i * 16), val);
    }

    // Fill remainder
    size_t remainder = n % 16;
    if (remainder > 0) {
        memset(p + chunks * 16, c, remainder);
    }

    return s;
#else
    return memset(s, c, n);
#endif
}
