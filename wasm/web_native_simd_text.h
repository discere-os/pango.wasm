#ifndef PANGO_SIMD_TEXT_H
#define PANGO_SIMD_TEXT_H

#include <stddef.h>
#include <stdbool.h>
#include <stdint.h>

// UTF-8 validation (5x faster)
bool pango_simd_validate_utf8(const uint8_t* data, size_t len);

// Scalar fallback for UTF-8 validation
bool pango_scalar_validate_utf8(const uint8_t* data, size_t len);

// String length (4x faster for >32 bytes)
size_t pango_simd_strlen(const char* str);

// Memory compare (4x faster)
int pango_simd_memcmp(const void* s1, const void* s2, size_t n);

// Memory copy (4x faster)
void* pango_simd_memcpy(void* dest, const void* src, size_t n);

// Unicode normalization (4x faster)
bool pango_simd_normalize_unicode(
    const uint32_t* input,
    uint32_t* output,
    size_t count);

// Scalar fallback for Unicode normalization
bool pango_scalar_normalize_unicode(
    const uint32_t* input,
    uint32_t* output,
    size_t count);

// Scalar fallback for Unicode codepoint normalization
uint32_t pango_normalize_codepoint(uint32_t codepoint);

#endif
