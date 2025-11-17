/**
 * Web-Native Capabilities Detection API
 */

#ifndef WEB_NATIVE_CAPABILITIES_H
#define WEB_NATIVE_CAPABILITIES_H

#include <stdbool.h>

typedef struct {
    bool has_wasm_simd;
    bool has_webgpu;
    bool has_shared_array_buffer;
    bool has_web_crypto;
    bool has_opfs;
    bool has_workers;
    int chrome_version;
} WebCapabilities;

/**
 * Get web capabilities (cached after first call)
 */
const WebCapabilities* web_get_capabilities(void);

/**
 * Check if browser meets minimum requirements
 * (Chrome/Edge 113+ with SIMD and WebGPU)
 */
bool web_check_minimum_requirements(void);

#endif /* WEB_NATIVE_CAPABILITIES_H */
