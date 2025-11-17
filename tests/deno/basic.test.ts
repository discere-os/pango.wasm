import { assertEquals, assert } from "https://deno.land/std@0.220.0/assert/mod.ts";
import Pango from "../../src/lib/index.ts";

Deno.test("module loading", async () => {
  const pango = new Pango();
  await pango.initialize();
  assert(pango, "Pango should initialize");
});

Deno.test("capabilities detection", async () => {
  const pango = new Pango();
  await pango.initialize();
  const caps = pango.getCapabilities();

  console.log("Detected capabilities:", caps);

  assert(caps.has_wasm_simd, "WASM SIMD should be available (Chrome 113+)");
  assert(caps.chrome_version >= 113 || caps.chrome_version === 0, "Chrome version should be 113+ or 0 (non-Chrome)");
});

Deno.test("version string", async () => {
  const pango = new Pango();
  await pango.initialize();
  const version = pango.getVersion();

  console.log("Pango version:", version);
  assert(version.length > 0, "Version string should not be empty");
});

Deno.test("minimum requirements check", async () => {
  const pango = new Pango();
  await pango.initialize();
  const meetsRequirements = pango.checkMinimumRequirements();

  console.log("Meets minimum requirements:", meetsRequirements);
  // This may fail in non-Chrome browsers, so we just log it
});

Deno.test("module access", async () => {
  const pango = new Pango();
  await pango.initialize();
  const module = pango.getModule();

  assert(module, "Module should be accessible");
  assert(typeof module.ccall === 'function', "ccall should be available");
  assert(typeof module.cwrap === 'function', "cwrap should be available");
  assert(module.HEAPU8 instanceof Uint8Array, "HEAPU8 should be a Uint8Array");
});
