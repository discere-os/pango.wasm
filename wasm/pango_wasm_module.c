#include <emscripten.h>
#include <pango/pango.h>

EMSCRIPTEN_KEEPALIVE
const char* pango_wasm_version(void) {
  return pango_version_string();
}

