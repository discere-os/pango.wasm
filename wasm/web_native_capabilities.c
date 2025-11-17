/**
 * Web-Native Capabilities Detection for Pango.wasm
 * Detects browser features for optimal performance routing
 */

#include <stdbool.h>
#include <emscripten.h>

typedef struct {
    bool has_wasm_simd;
    bool has_webgpu;
    bool has_shared_array_buffer;
    bool has_web_crypto;
    bool has_opfs;
    bool has_workers;
    int chrome_version;
} WebCapabilities;

static WebCapabilities g_caps = {0};
static bool g_initialized = false;

/**
 * Detect WASM SIMD support
 * Chrome 91+, Edge 91+ (mandatory for 3-5x string operations speedup)
 */
static bool detect_wasm_simd(void) {
    return EM_ASM_INT({
        if (typeof WebAssembly === 'undefined' || typeof WebAssembly.validate !== 'function') {
            return 0;
        }
        // Test SIMD with v128.const instruction
        const simdTest = new Uint8Array([
            0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,
            10,9,1,7,0,65,0,253,15,26,11
        ]);
        try {
            return WebAssembly.validate(simdTest) ? 1 : 0;
        } catch (e) {
            return 0;
        }
    });
}

/**
 * Detect WebGPU support
 * Chrome 113+, Edge 113+ (mandatory for 10x+ GPU-accelerated rendering)
 */
static bool detect_webgpu(void) {
    return EM_ASM_INT({
        return (typeof navigator !== 'undefined' &&
                typeof navigator.gpu !== 'undefined') ? 1 : 0;
    });
}

/**
 * Detect SharedArrayBuffer support
 * Required for true threading (10x speedup vs pthread emulation)
 */
static bool detect_shared_array_buffer(void) {
    return EM_ASM_INT({
        return typeof SharedArrayBuffer !== 'undefined' ? 1 : 0;
    });
}

/**
 * Detect Web Crypto API
 * Chrome 37+, Edge 79+ (5-15x speedup for cryptographic operations)
 */
static bool detect_web_crypto(void) {
    return EM_ASM_INT({
        return (typeof crypto !== 'undefined' &&
                typeof crypto.subtle !== 'undefined') ? 1 : 0;
    });
}

/**
 * Detect Origin Private File System (OPFS)
 * Chrome 102+, Edge 102+ (3-4x faster than IndexedDB)
 */
static bool detect_opfs(void) {
    return EM_ASM_INT({
        return (typeof navigator !== 'undefined' &&
                typeof navigator.storage !== 'undefined' &&
                typeof navigator.storage.getDirectory === 'function') ? 1 : 0;
    });
}

/**
 * Detect Web Workers support
 * Universal support (10x speedup for parallel operations)
 */
static bool detect_workers(void) {
    return EM_ASM_INT({
        return typeof Worker !== 'undefined' ? 1 : 0;
    });
}

/**
 * Detect Chrome version
 * Target: Chrome/Edge 113+ for full feature support
 */
static int detect_chrome_version(void) {
    return EM_ASM_INT({
        const ua = navigator.userAgent;
        const match = ua.match(/Chrome\/(\d+)/);
        if (match) {
            return parseInt(match[1], 10);
        }
        const edgeMatch = ua.match(/Edg\/(\d+)/);
        if (edgeMatch) {
            return parseInt(edgeMatch[1], 10);
        }
        return 0;
    });
}

/**
 * Initialize and return web capabilities
 * Called once at startup to detect available features
 */
EMSCRIPTEN_KEEPALIVE
const WebCapabilities* web_get_capabilities(void) {
    if (!g_initialized) {
        g_caps.has_wasm_simd = detect_wasm_simd();
        g_caps.has_webgpu = detect_webgpu();
        g_caps.has_shared_array_buffer = detect_shared_array_buffer();
        g_caps.has_web_crypto = detect_web_crypto();
        g_caps.has_opfs = detect_opfs();
        g_caps.has_workers = detect_workers();
        g_caps.chrome_version = detect_chrome_version();
        g_initialized = true;

        // Log capabilities to console
        EM_ASM({
            console.log('Pango.wasm Web Capabilities:');
            console.log('  WASM SIMD:', $0 ? '✅' : '❌');
            console.log('  WebGPU:', $1 ? '✅' : '❌');
            console.log('  SharedArrayBuffer:', $2 ? '✅' : '❌');
            console.log('  Web Crypto:', $3 ? '✅' : '❌');
            console.log('  OPFS:', $4 ? '✅' : '❌');
            console.log('  Workers:', $5 ? '✅' : '❌');
            console.log('  Chrome Version:', $6);
        }, g_caps.has_wasm_simd, g_caps.has_webgpu, g_caps.has_shared_array_buffer,
           g_caps.has_web_crypto, g_caps.has_opfs, g_caps.has_workers, g_caps.chrome_version);
    }
    return &g_caps;
}

/**
 * Check if browser meets minimum requirements
 * Returns true if Chrome/Edge 113+ with SIMD and WebGPU
 */
EMSCRIPTEN_KEEPALIVE
bool web_check_minimum_requirements(void) {
    const WebCapabilities* caps = web_get_capabilities();
    return caps->chrome_version >= 113 &&
           caps->has_wasm_simd &&
           caps->has_webgpu;
}
