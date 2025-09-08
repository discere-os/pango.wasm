/*
 * pango.wasm SIMD Optimizations Header
 * WebAssembly SIMD128 accelerated text processing operations
 * Copyright 2025 Superstruct Ltd, New Zealand
 * Licensed under LGPL 2.1+
 */

#ifndef PANGO_WASM_SIMD_H
#define PANGO_WASM_SIMD_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

#ifdef PANGO_WASM_SIMD

/**
 * UTF-8 validation with SIMD acceleration
 * @param data: UTF-8 data to validate
 * @param length: Length in bytes
 * @return 1 if valid UTF-8, 0 otherwise
 */
int pango_wasm_simd_validate_utf8(const uint8_t* data, size_t length);

/**
 * Count Unicode characters in UTF-8 text with SIMD acceleration
 * @param text: UTF-8 encoded text
 * @param byte_length: Length in bytes
 * @return Number of Unicode characters
 */
size_t pango_wasm_simd_count_characters(const uint8_t* text, size_t byte_length);

/**
 * Find whitespace characters with SIMD acceleration
 * @param text: Input text
 * @param length: Text length in bytes
 * @param whitespace_mask: Output mask (0xFF for whitespace, 0x00 for non-whitespace)
 */
void pango_wasm_simd_find_whitespace(const uint8_t* text, size_t length, uint8_t* whitespace_mask);

/**
 * Analyze potential line break positions
 * @param text: Input text
 * @param length: Text length in bytes
 * @param break_mask: Output mask (0xFF for break opportunity, 0x00 otherwise)
 */
void pango_wasm_simd_analyze_line_breaks(const uint8_t* text, size_t length, uint8_t* break_mask);

/**
 * Fast string comparison for font matching
 * @param str1: First string
 * @param str2: Second string
 * @param length: Maximum length to compare
 * @return 0 if equal, < 0 if str1 < str2, > 0 if str1 > str2
 */
int pango_wasm_simd_compare_strings(const char* str1, const char* str2, size_t length);

/**
 * Convert ASCII text to lowercase with SIMD
 * @param text: Text to convert (modified in-place)
 * @param length: Text length in bytes
 */
void pango_wasm_simd_to_lowercase_ascii(uint8_t* text, size_t length);

/**
 * Vectorized color blending for text rendering
 * @param dst: Destination pixels (ARGB32)
 * @param src: Source pixels (ARGB32)
 * @param alpha_mask: Alpha values (0-255)
 * @param pixel_count: Number of pixels to blend
 */
void pango_wasm_simd_blend_text_colors(uint32_t* dst, const uint32_t* src, 
                                       const uint8_t* alpha_mask, size_t pixel_count);

#endif /* PANGO_WASM_SIMD */

#ifdef __cplusplus
}
#endif

#endif /* PANGO_WASM_SIMD_H */