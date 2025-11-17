#!/usr/bin/env deno run --allow-read

import Pango from "./src/lib/index.ts";

console.log("🚀 Pango.wasm Demo - Deno-First");
console.log("=".repeat(60));

// 1. Initialize library
console.log("\n📦 Initializing Pango.wasm...");
const pango = new Pango();

try {
  await pango.initialize();
  console.log("✅ Library initialized");
} catch (error) {
  console.error("❌ Failed to initialize:", error);
  Deno.exit(1);
}

// 2. Check capabilities
console.log("\n📊 Web-Native Capabilities:");
const caps = pango.getCapabilities();
console.log(`  WASM SIMD: ${caps.has_wasm_simd ? '✅' : '❌'} ${caps.has_wasm_simd ? '(3-5x string speedup)' : ''}`);
console.log(`  WebGPU: ${caps.has_webgpu ? '✅' : '❌'} ${caps.has_webgpu ? '(10x+ GPU acceleration)' : ''}`);
console.log(`  Web Crypto: ${caps.has_web_crypto ? '✅' : '❌'} ${caps.has_web_crypto ? '(5-15x crypto speedup)' : ''}`);
console.log(`  OPFS: ${caps.has_opfs ? '✅' : '❌'} ${caps.has_opfs ? '(3-4x storage speedup)' : ''}`);
console.log(`  Workers: ${caps.has_workers ? '✅' : '❌'} ${caps.has_workers ? '(10x threading speedup)' : ''}`);
console.log(`  SharedArrayBuffer: ${caps.has_shared_array_buffer ? '✅' : '❌'}`);
console.log(`  Chrome Version: ${caps.chrome_version || 'N/A'}`);

// 3. Check minimum requirements
console.log("\n🔍 Minimum Requirements Check:");
const meetsRequirements = pango.checkMinimumRequirements();
if (meetsRequirements) {
  console.log("✅ Browser meets all minimum requirements (Chrome/Edge 113+)");
} else {
  console.log("⚠️  Browser does not meet minimum requirements");
  console.log("   Recommended: Chrome/Edge 113+ with WebGPU and SIMD support");
}

// 4. Get version
console.log("\n📌 Pango Version:");
try {
  const version = pango.getVersion();
  console.log(`  ${version}`);
} catch (error) {
  console.log(`  Error getting version: ${error}`);
}

// 5. Performance summary
console.log("\n⚡ Performance Summary:");
const availableOptimizations = [
  caps.has_wasm_simd,
  caps.has_webgpu,
  caps.has_web_crypto,
  caps.has_opfs,
  caps.has_workers && caps.has_shared_array_buffer,
].filter(Boolean).length;

console.log(`  Available optimizations: ${availableOptimizations}/5`);

if (availableOptimizations === 5) {
  console.log("  Performance grade: ⭐⭐⭐⭐⭐ EXCELLENT");
  console.log("  Expected speedup: 3-10x over baseline");
} else if (availableOptimizations >= 4) {
  console.log("  Performance grade: ⭐⭐⭐⭐ GOOD");
  console.log("  Expected speedup: 2-8x over baseline");
} else if (availableOptimizations >= 3) {
  console.log("  Performance grade: ⭐⭐⭐ FAIR");
  console.log("  Expected speedup: 1.5-5x over baseline");
} else {
  console.log("  Performance grade: ⭐⭐ LIMITED");
  console.log("  Consider upgrading to Chrome/Edge 113+ for better performance");
}

// 6. Module information
console.log("\n🔧 Module Information:");
const module = pango.getModule();
console.log(`  WASM Memory Size: ${(module.HEAPU8.length / 1024 / 1024).toFixed(2)} MB`);
console.log(`  ccall available: ${typeof module.ccall === 'function' ? '✅' : '❌'}`);
console.log(`  cwrap available: ${typeof module.cwrap === 'function' ? '✅' : '❌'}`);

console.log("\n✅ Demo complete!");
console.log("\nNext steps:");
console.log("  - Run tests: deno task test");
console.log("  - Run benchmarks: deno task bench");
console.log("  - Build WASM: deno task build:wasm");
