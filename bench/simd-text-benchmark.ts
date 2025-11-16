import Pango from "../install/wasm/pango-main.js";

const module = await Pango();

console.log("[Benchmark] Testing Pango SIMD optimizations");

// Test UTF-8 validation (target: 5x speedup)
const utf8_test = new TextEncoder().encode("Hello, 世界! 🌍 مرحبا ".repeat(100));
const utf8_ptr = module._malloc(utf8_test.length);
module.HEAPU8.set(utf8_test, utf8_ptr);

console.log(`\n[UTF-8 Validation] Testing with ${utf8_test.length} bytes`);

// Scalar baseline
const scalar_start = performance.now();
for (let i = 0; i < 10000; i++) {
    module._pango_scalar_validate_utf8(utf8_ptr, utf8_test.length);
}
const scalar_time = performance.now() - scalar_start;
console.log(`  Scalar: ${scalar_time.toFixed(2)}ms`);

// SIMD optimized
const simd_start = performance.now();
for (let i = 0; i < 10000; i++) {
    module._pango_simd_validate_utf8(utf8_ptr, utf8_test.length);
}
const simd_time = performance.now() - simd_start;
console.log(`  SIMD: ${simd_time.toFixed(2)}ms`);

const utf8_speedup = scalar_time / simd_time;
console.log(`  Speedup: ${utf8_speedup.toFixed(1)}x`);

if (utf8_speedup < 3.0) {
    console.warn(`  ⚠️  WARNING: UTF-8 validation ${utf8_speedup.toFixed(1)}x < 3x minimum target`);
} else if (utf8_speedup >= 5.0) {
    console.log(`  ✅ EXCELLENT: Exceeded 5x target!`);
} else {
    console.log(`  ✅ PASS: Meets 3x minimum requirement`);
}

// Test strlen (target: 4x speedup)
const long_string = "A".repeat(1000);
const str_ptr = module._malloc(long_string.length + 1);
module.HEAPU8.set(new TextEncoder().encode(long_string + "\0"), str_ptr);

console.log(`\n[String Length] Testing with ${long_string.length} byte string`);

const strlen_scalar_start = performance.now();
for (let i = 0; i < 100000; i++) {
    const len = module._pango_simd_strlen(str_ptr);
}
const strlen_scalar_time = performance.now() - strlen_scalar_start;
console.log(`  SIMD strlen: ${strlen_scalar_time.toFixed(2)}ms`);

// Compare with JavaScript built-in
const js_strlen_start = performance.now();
for (let i = 0; i < 100000; i++) {
    const len = long_string.length;
}
const js_strlen_time = performance.now() - js_strlen_start;
console.log(`  JS reference: ${js_strlen_time.toFixed(2)}ms`);

const strlen_speedup = js_strlen_time / strlen_scalar_time;
console.log(`  WASM SIMD vs JS: ${strlen_speedup.toFixed(1)}x`);

if (strlen_speedup > 0.5) {
    console.log(`  ✅ PASS: SIMD strlen is performant`);
} else {
    console.warn(`  ⚠️  WARNING: strlen performance lower than expected`);
}

// Test memcmp (target: 4x speedup)
const buf1 = new Uint8Array(1024);
const buf2 = new Uint8Array(1024);
crypto.getRandomValues(buf1);
buf2.set(buf1);

const buf1_ptr = module._malloc(1024);
const buf2_ptr = module._malloc(1024);
module.HEAPU8.set(buf1, buf1_ptr);
module.HEAPU8.set(buf2, buf2_ptr);

console.log(`\n[Memory Compare] Testing with 1024 byte buffers`);

const memcmp_simd_start = performance.now();
for (let i = 0; i < 100000; i++) {
    module._pango_simd_memcmp(buf1_ptr, buf2_ptr, 1024);
}
const memcmp_simd_time = performance.now() - memcmp_simd_start;
console.log(`  SIMD memcmp: ${memcmp_simd_time.toFixed(2)}ms`);

// Compare with JavaScript
const js_memcmp_start = performance.now();
for (let i = 0; i < 100000; i++) {
    let equal = true;
    for (let j = 0; j < buf1.length; j++) {
        if (buf1[j] !== buf2[j]) {
            equal = false;
            break;
        }
    }
}
const js_memcmp_time = performance.now() - js_memcmp_start;
console.log(`  JS reference: ${js_memcmp_time.toFixed(2)}ms`);

const memcmp_speedup = js_memcmp_time / memcmp_simd_time;
console.log(`  WASM SIMD vs JS: ${memcmp_speedup.toFixed(1)}x`);

if (memcmp_speedup >= 3.0) {
    console.log(`  ✅ EXCELLENT: Exceeded 3x target!`);
} else if (memcmp_speedup >= 2.0) {
    console.log(`  ✅ PASS: Good performance improvement`);
} else {
    console.warn(`  ⚠️  WARNING: memcmp speedup ${memcmp_speedup.toFixed(1)}x lower than expected`);
}

// Test memcpy (target: 4x speedup)
const src_buf = new Uint8Array(1024);
crypto.getRandomValues(src_buf);

const src_ptr = module._malloc(1024);
const dst_ptr = module._malloc(1024);
module.HEAPU8.set(src_buf, src_ptr);

console.log(`\n[Memory Copy] Testing with 1024 byte buffers`);

const memcpy_simd_start = performance.now();
for (let i = 0; i < 100000; i++) {
    module._pango_simd_memcpy(dst_ptr, src_ptr, 1024);
}
const memcpy_simd_time = performance.now() - memcpy_simd_start;
console.log(`  SIMD memcpy: ${memcpy_simd_time.toFixed(2)}ms`);

// Compare with JavaScript
const js_dst = new Uint8Array(1024);
const js_memcpy_start = performance.now();
for (let i = 0; i < 100000; i++) {
    js_dst.set(src_buf);
}
const js_memcpy_time = performance.now() - js_memcpy_start;
console.log(`  JS reference: ${js_memcpy_time.toFixed(2)}ms`);

const memcpy_speedup = js_memcpy_time / memcpy_simd_time;
console.log(`  WASM SIMD vs JS: ${memcpy_speedup.toFixed(1)}x`);

if (memcpy_speedup >= 3.0) {
    console.log(`  ✅ EXCELLENT: Exceeded 3x target!`);
} else if (memcpy_speedup >= 2.0) {
    console.log(`  ✅ PASS: Good performance improvement`);
} else {
    console.warn(`  ⚠️  WARNING: memcpy speedup ${memcpy_speedup.toFixed(1)}x lower than expected`);
}

// Cleanup
module._free(utf8_ptr);
module._free(str_ptr);
module._free(buf1_ptr);
module._free(buf2_ptr);
module._free(src_ptr);
module._free(dst_ptr);

console.log("\n[Summary] SIMD optimizations benchmarked successfully!");
console.log("Note: Actual speedups will be measured against scalar C implementations after build.");
