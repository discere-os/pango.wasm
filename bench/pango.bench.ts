/**
 * Pango WASM Benchmarks
 */

import PangoWASM from "../src/lib/index.ts"

Deno.bench("pango initialization", {
  baseline: true
}, async () => {
  const lib = new PangoWASM()
  await lib.initialize()
})
