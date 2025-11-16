#include "web_native_capabilities.h"
#include <emscripten.h>

static PangoWebCapabilities g_capabilities = {0};
static bool g_initialized = false;

EM_JS(int, js_detect_chrome_version, (), {
    const ua = navigator.userAgent;
    const match = ua.match(/Chrome\/(\d+)/);
    return match ? parseInt(match[1]) : 0;
});

const PangoWebCapabilities*
pango_web_get_capabilities(void)
{
    if (!g_initialized) {
        // Chrome 113+ is mandatory
        g_capabilities.chrome_version = js_detect_chrome_version();

        // SIMD is mandatory for our target
        g_capabilities.has_wasm_simd = true;
        g_capabilities.has_webgpu = true;
        g_capabilities.has_web_crypto = true;
        g_capabilities.has_workers = true;

        g_initialized = true;
    }

    return &g_capabilities;
}
