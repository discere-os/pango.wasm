# Pango WASM SIMD Implementation

## Overview

This document describes the implementation of mandatory 3-5x SIMD optimizations for Pango text shaping operations, following the Discere OS web-native performance philosophy.

## Motivation

Per Discere OS requirements, all WASM libraries MUST achieve **3-5x speedups** using WASM SIMD for performance-critical operations. This implementation targets high-value text processing operations in Pango:

1. UTF-8 validation and conversion (5x target)
2. String operations (4x target)
3. Unicode normalization (4x target)

## Implementation Strategy

### Web-Native Philosophy

**"Port the web to library APIs, not libraries to web"**

- Use WASM SIMD128 for vector operations
- Target Chrome/Edge 113+ (no fallbacks)
- Export functions for JavaScript benchmarking
- Maintain adaptive thresholds to avoid overhead on small inputs

### File Structure

```
wasm/
├── web_native_simd_text.h         # SIMD API definitions
├── web_native_simd_text.c         # SIMD implementations
├── web_native_capabilities.h      # Runtime detection API
├── web_native_capabilities.c      # Feature detection
└── README.md                       # SIMD documentation

bench/
└── simd-text-benchmark.ts         # Performance validation

pango/
└── meson.build                    # Updated with SIMD sources

deno.json                          # Added benchmark tasks
```

## Technical Details

### SIMD Operations Used

All implementations use `wasm_simd128.h` intrinsics:

- **v128_t**: 128-bit vector type
- **wasm_v128_load/store**: Load/store 16 bytes
- **wasm_i8x16_eq**: Compare 16 bytes
- **wasm_i8x16_bitmask**: Extract comparison results
- **wasm_i8x16_all_true/any_true**: Boolean operations

### Adaptive Threshold Pattern

Every SIMD function checks input size:

```c
if (size < 32) {
    return scalar_fallback(data, size);
}
```

**Rationale**: SIMD setup overhead (loading vectors, alignment) only pays off for larger inputs. Threshold of 32 bytes ensures:
- No regression on small strings (common in text processing)
- Maximum speedup on larger inputs (>32 bytes)

### Function Implementations

#### 1. UTF-8 Validation (`pango_simd_validate_utf8`)

**Target**: 5x speedup

**Strategy**:
1. Process 16 bytes at a time
2. Fast path: Check if all bytes are ASCII (< 0x80)
3. If non-ASCII found, fall back to scalar for that chunk
4. Continue SIMD for remaining chunks

**Key optimization**: Most text is ASCII, so the fast path dominates.

#### 2. String Length (`pango_simd_strlen`)

**Target**: 4x speedup for >32 byte strings

**Strategy**:
1. Load 16 bytes at a time
2. Compare all bytes with zero vector
3. Use bitmask to find first null byte
4. Use `__builtin_ctz` to get exact position

**Key optimization**: Single instruction compares 16 bytes.

#### 3. Memory Compare (`pango_simd_memcmp`)

**Target**: 4x speedup for >32 byte buffers

**Strategy**:
1. Load 16 bytes from both buffers
2. Compare vectors with `wasm_i8x16_eq`
3. Check if all bytes match with `wasm_i8x16_all_true`
4. On mismatch, use scalar to find exact difference

**Key optimization**: Early exit on first difference.

#### 4. Memory Copy (`pango_simd_memcpy`)

**Target**: 4x speedup for >32 byte buffers

**Strategy**:
1. Load 16 bytes from source
2. Store 16 bytes to destination
3. Repeat for all 16-byte chunks
4. Use scalar for remainder

**Key optimization**: Unaligned access is supported on WASM.

### Exported Functions

All functions are exported with `EMSCRIPTEN_KEEPALIVE` for JavaScript access:

```c
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#define PANGO_EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define PANGO_EXPORT
#endif
```

This allows the benchmark to call both SIMD and scalar versions directly.

## Build Integration

### Meson Configuration

Updated `pango/meson.build`:

```meson
# Add SIMD sources
pango_sources += [
    '../wasm/web_native_simd_text.c',
    '../wasm/web_native_capabilities.c',
]

# Add SIMD compiler flag
pango_cflags += [
    '-msimd128',
]
```

### Compiler Flags

The `-msimd128` flag:
- Enables WASM SIMD instruction set
- Required for `wasm_simd128.h` intrinsics
- Supported by Emscripten (emcc)

Combined with existing flags:
- `-O3`: Maximum optimization
- `-flto`: Link-time optimization

## Benchmarking

### Benchmark Structure

`bench/simd-text-benchmark.ts` tests:

1. **UTF-8 validation**: 10,000 iterations on multi-byte UTF-8
2. **String length**: 100,000 iterations on 1000-byte string
3. **Memory compare**: 100,000 iterations on 1KB buffers
4. **Memory copy**: 100,000 iterations on 1KB buffers

### Running Benchmarks

```bash
deno task bench:simd
deno task validate:performance
```

### Expected Results

- UTF-8 validation: ≥5x vs scalar
- String length: ≥4x vs scalar
- Memory compare: ≥4x vs scalar
- Memory copy: ≥4x vs scalar

## Runtime Detection

### Capability Detection

```c
const PangoWebCapabilities* caps = pango_web_get_capabilities();
```

Returns struct with:
- `has_wasm_simd`: Always true (Chrome 113+ requirement)
- `has_webgpu`: Always true
- `has_web_crypto`: Always true
- `has_workers`: Always true
- `chrome_version`: Detected Chrome version

### JavaScript Detection

Uses `EM_JS` to call navigator.userAgent:

```c
EM_JS(int, js_detect_chrome_version, (), {
    const ua = navigator.userAgent;
    const match = ua.match(/Chrome\/(\d+)/);
    return match ? parseInt(match[1]) : 0;
});
```

## Testing Strategy

### Unit Tests

Each SIMD function should be tested for:
1. **Correctness**: Same results as scalar version
2. **Edge cases**: Empty input, single byte, exact threshold (32 bytes)
3. **Performance**: Speedup ≥ target for large inputs
4. **No regression**: Same or better performance for small inputs

### Integration Tests

Pango's existing test suite should pass without modification:
- SIMD functions are drop-in replacements
- Scalar fallback ensures correctness
- No API changes required

## Performance Validation

### Success Criteria

✅ All SIMD functions achieve target speedups
✅ No regression on small inputs (< 32 bytes)
✅ All Pango tests pass
✅ Benchmark validates speedups
✅ Functions exported and callable from JavaScript

### Failure Modes

If benchmarks fail (<3x speedup):
1. Check compiler flags (-msimd128 applied)
2. Verify Chrome version (≥113)
3. Check SIMD instructions in disassembly
4. Increase test iterations for accuracy
5. Profile to find bottlenecks

## Future Optimizations

### Additional SIMD Targets

- **Glyph bitmap operations**: 3x speedup potential
- **Text measurement**: 4x speedup potential
- **Font rendering**: 5x speedup potential

### WebGPU Integration

For parallel text shaping:
- 10x+ speedup for batch operations
- GPU-accelerated glyph rasterization
- Parallel layout computation

## Browser Requirements

**Mandatory**: Chrome/Edge 113+

Features required:
- WASM SIMD (128-bit vectors)
- WebGPU (for future optimizations)
- WebCrypto (for hash operations)
- Web Workers (for parallelization)

NO support for older browsers per Discere OS philosophy.

## References

### WASM SIMD

- [WASM SIMD Proposal](https://github.com/WebAssembly/simd)
- [wasm_simd128.h](https://github.com/llvm/llvm-project/blob/main/clang/lib/Headers/wasm_simd128.h)

### Emscripten

- [Emscripten SIMD Support](https://emscripten.org/docs/porting/simd.html)
- [EMSCRIPTEN_KEEPALIVE](https://emscripten.org/docs/api_reference/emscripten.h.html)

### Pango

- [Pango Documentation](https://docs.gtk.org/Pango/)
- [Pango Source](https://gitlab.gnome.org/GNOME/pango)

## License

Same as Pango: LGPL 2.1+

## Authors

- Discere OS Team
- Claude Code (implementation)
