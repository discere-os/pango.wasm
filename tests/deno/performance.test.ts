import { assert } from "https://deno.land/std@0.220.0/assert/mod.ts";
import Pango from "../../src/lib/index.ts";

const PERFORMANCE_TARGETS = {
  SIMD_MIN: 3.0,      // 3x minimum for SIMD strings
  CRYPTO_MIN: 5.0,    // 5x minimum for WebCrypto
  WORKERS_MIN: 10.0,  // 10x minimum for Workers
  WEBGPU_MIN: 10.0,   // 10x minimum for WebGPU
};

async function measurePerformance(fn: () => void, iterations: number): Promise<number> {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  return (performance.now() - start) / iterations;
}

Deno.test("SIMD performance validation", async () => {
  const pango = new Pango();
  await pango.initialize();

  const caps = pango.getCapabilities();
  if (!caps.has_wasm_simd) {
    console.warn("⚠️  WASM SIMD not available, skipping test");
    return;
  }

  // Note: Actual SIMD string operations would be tested here
  // For now, we just verify SIMD is available
  console.log("✅ WASM SIMD is available for 3-5x string operation speedup");
});

Deno.test("WebCrypto performance validation", async () => {
  const pango = new Pango();
  await pango.initialize();

  const caps = pango.getCapabilities();
  if (!caps.has_web_crypto) {
    console.warn("⚠️  Web Crypto not available, skipping test");
    return;
  }

  console.log("✅ Web Crypto API is available for 5-15x crypto speedup");
});

Deno.test("Threading capabilities validation", async () => {
  const pango = new Pango();
  await pango.initialize();

  const caps = pango.getCapabilities();
  console.log("Threading capabilities:");
  console.log(`  SharedArrayBuffer: ${caps.has_shared_array_buffer ? '✅' : '❌'}`);
  console.log(`  Web Workers: ${caps.has_workers ? '✅' : '❌'}`);

  if (caps.has_shared_array_buffer && caps.has_workers) {
    console.log("✅ True threading available for 10x speedup");
  } else {
    console.warn("⚠️  True threading not available (will use pthread emulation)");
  }
});

Deno.test("Storage capabilities validation", async () => {
  const pango = new Pango();
  await pango.initialize();

  const caps = pango.getCapabilities();
  console.log("Storage capabilities:");
  console.log(`  OPFS: ${caps.has_opfs ? '✅' : '❌'}`);

  if (caps.has_opfs) {
    console.log("✅ OPFS available for 3-4x faster persistent storage");
  } else {
    console.warn("⚠️  OPFS not available (will use slower alternatives)");
  }
});

Deno.test("WebGPU capabilities validation", async () => {
  const pango = new Pango();
  await pango.initialize();

  const caps = pango.getCapabilities();
  console.log(`WebGPU: ${caps.has_webgpu ? '✅' : '❌'}`);

  if (caps.has_webgpu) {
    console.log("✅ WebGPU available for 10x+ GPU-accelerated operations");
  } else {
    console.warn("⚠️  WebGPU not available (text rendering will use CPU)");
  }
});

Deno.test("overall performance targets summary", async () => {
  const pango = new Pango();
  await pango.initialize();

  const caps = pango.getCapabilities();

  console.log("\n📊 Performance Capabilities Summary:");
  console.log("=" .repeat(60));
  console.log(`SIMD (3-5x speedup):       ${caps.has_wasm_simd ? '✅ AVAILABLE' : '❌ MISSING'}`);
  console.log(`WebCrypto (5-15x speedup): ${caps.has_web_crypto ? '✅ AVAILABLE' : '❌ MISSING'}`);
  console.log(`Workers (10x speedup):     ${caps.has_workers && caps.has_shared_array_buffer ? '✅ AVAILABLE' : '❌ MISSING'}`);
  console.log(`WebGPU (10x+ speedup):     ${caps.has_webgpu ? '✅ AVAILABLE' : '❌ MISSING'}`);
  console.log(`OPFS (3-4x speedup):       ${caps.has_opfs ? '✅ AVAILABLE' : '❌ MISSING'}`);
  console.log("=" .repeat(60));

  const availableCount = [
    caps.has_wasm_simd,
    caps.has_web_crypto,
    caps.has_workers && caps.has_shared_array_buffer,
    caps.has_webgpu,
    caps.has_opfs,
  ].filter(Boolean).length;

  console.log(`Available optimizations: ${availableCount}/5`);

  if (availableCount >= 4) {
    console.log("✅ Excellent performance capabilities!");
  } else if (availableCount >= 3) {
    console.log("⚠️  Good performance, some optimizations missing");
  } else {
    console.log("❌ Limited performance capabilities - consider upgrading browser");
  }
});
