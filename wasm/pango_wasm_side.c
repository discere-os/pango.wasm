#include <pango/pango.h>

const char* pango_wasm_version(void) {
  return pango_version_string();
}

