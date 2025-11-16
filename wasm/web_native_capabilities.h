#ifndef PANGO_WEB_CAPABILITIES_H
#define PANGO_WEB_CAPABILITIES_H

#include <stdbool.h>

typedef struct {
    bool has_wasm_simd;
    bool has_webgpu;
    bool has_web_crypto;
    bool has_workers;
    int chrome_version;
} PangoWebCapabilities;

const PangoWebCapabilities* pango_web_get_capabilities(void);

#endif
