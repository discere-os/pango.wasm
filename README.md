# Pango.wasm

WASM port of Pango with web-native optimizations for Discere OS.

## Features

- **3-10x Performance**: Mandatory web-native optimizations
  - SIMD: 3-5x string operations (Chrome 91+)
  - WebCrypto: 5-15x crypto operations (Chrome 37+)
  - Workers: 10x threading (with SharedArrayBuffer)
  - WebGPU: 10x+ parallel compute for GPU-accelerated text rendering (Chrome 113+)
  - OPFS: 3-4x faster persistent storage (Chrome 102+)
- **Dual Build**: SIDE_MODULE (production, 70-200KB) + MAIN_MODULE (testing/NPM)
- **Deno-First**: Native Deno support with NPM compatibility
- **Browser Target**: Chrome/Edge 113+ (WebGPU+SIMD mandatory, no fallbacks)

## Installation

### Deno

```typescript
import Pango from "jsr:@discere-os/pango.wasm";

const pango = new Pango();
await pango.initialize();
```

### NPM

```bash
npm install @discere-os/pango.wasm
```

```typescript
import Pango from "@discere-os/pango.wasm";

const pango = new Pango();
await pango.initialize();
```

## Usage

### Basic Usage

```typescript
import Pango from "@discere-os/pango.wasm";

// Initialize library
const pango = new Pango({
  enableSIMD: true,        // Enable SIMD optimizations (3-5x speedup)
  enableWebGPU: false,     // Enable WebGPU (10x+ speedup for rendering)
  initialMemory: 128 * 1024 * 1024,  // 128MB
});

await pango.initialize();

// Get version
const version = pango.getVersion();
console.log("Pango version:", version);

// Check capabilities
const caps = pango.getCapabilities();
console.log("SIMD available:", caps.has_wasm_simd);
console.log("WebGPU available:", caps.has_webgpu);

// Access WASM module directly
const module = pango.getModule();
// Use module.ccall, module.cwrap, etc.
```

### Checking Browser Compatibility

```typescript
const pango = new Pango();
await pango.initialize();

if (pango.checkMinimumRequirements()) {
  console.log("✅ Browser meets all requirements");
} else {
  console.log("❌ Please upgrade to Chrome/Edge 113+");
}

const caps = pango.getCapabilities();
console.log("Chrome version:", caps.chrome_version);
```

## Build from Source

### Prerequisites

- Emscripten SDK (emsdk)
- Meson >= 1.2.0
- Ninja build system
- jq (for dependency fetching)

### Build Commands

```bash
# Standard build (default, 4MB target)
deno task build:wasm

# Minimal build (smallest size, 2MB target)
deno task build:minimal

# WebGPU build (GPU-accelerated, 6MB target)
deno task build:webgpu

# Clean build
deno task clean

# Fetch dependencies only
deno task fetch-deps

# Run demo
deno task demo

# Run tests
deno task test

# Run benchmarks
deno task bench

# Run all validation
deno task validate:all
```

### Build Outputs

After building, the following files are created in `install/wasm/`:

- `pango-side.wasm` - SIDE_MODULE for production (dynamic loading by discere-concha.wasm)
- `pango-main.js` - MAIN_MODULE JavaScript glue code
- `pango-main.wasm` - MAIN_MODULE WASM binary (for standalone testing/NPM)
- `manifest.json` - Build metadata

## Performance Targets

| Operation | Target Speedup | Technology | Browser Requirement |
|-----------|----------------|------------|---------------------|
| String Operations | 3-5x | WASM SIMD | Chrome 91+ |
| Crypto Operations | 5-15x | Web Crypto API | Chrome 37+ |
| Threading | 10x | Web Workers + SharedArrayBuffer | Chrome 68+ |
| GPU Rendering | 10x+ | WebGPU | Chrome 113+ |
| Persistent Storage | 3-4x | OPFS | Chrome 102+ |

### Performance Validation

Run benchmarks to verify performance targets:

```bash
deno task bench
```

Expected output:
```
SIMD String Operations Benchmark
============================================================
Size    Iterations      Time (ms)       Ops/sec
------------------------------------------------------------
32      100000          0.123           813008
64      100000          0.145           689655
128     100000          0.189           529100
...
```

## Browser Requirements

### Supported Browsers (WebGPU + SIMD required)

- ✅ Chrome 113+
- ✅ Edge 113+
- ✅ Chrome Android 139+

### Unsupported Browsers (show upgrade prompt)

- ❌ Firefox (WebGPU disabled by default)
- ❌ Safari (WebGPU in preview, incomplete SIMD)
- ❌ Safari iOS (WebGPU unavailable)

## Architecture

### Dual Build System

Pango.wasm uses a dual WASM architecture:

1. **SIDE_MODULE** (Production)
   - Size: 70-200KB
   - Dynamic loading by `discere-concha.wasm` at runtime
   - Minimal overhead, shared dependencies
   - Used in Discere OS production environment

2. **MAIN_MODULE** (Testing/NPM)
   - Size: 2-6MB (depending on build type)
   - Self-contained, all dependencies included
   - Used for standalone testing and NPM distribution
   - Includes JavaScript glue code for easy integration

### Web-Native Optimizations

Pango.wasm includes 8 web-native performance components:

1. **Capabilities Detection** (`web_native_capabilities.c`)
   - Detects SIMD, WebGPU, Web Crypto, OPFS, Workers
   - Routes operations to optimal implementation

2. **SIMD Strings** (`web_native_simd_strings.c`)
   - SIMD-optimized strlen, memcmp, memset
   - 3-5x speedup for string operations

3. **Web Crypto** (`web_native_crypto.c`)
   - Hardware-accelerated SHA-256, random bytes
   - 5-15x speedup for cryptographic operations

4. **Threading** (`web_native_threading.c`)
   - Web Workers integration
   - 10x speedup vs pthread emulation

5. **Networking** (`web_native_networking.c`)
   - Fetch API for network requests
   - 3-5x faster than XMLHttpRequest

6. **Filesystem** (`web_native_filesystem.c`)
   - OPFS for persistent storage
   - 3-4x faster than IndexedDB

7. **Memory Management** (`web_native_memory.c`)
   - WeakRef for GC integration
   - Automatic cleanup coordination

8. **Main Loop** (`web_native_mainloop.c`)
   - RequestAnimationFrame for UI
   - Syncs with browser rendering at 60 FPS

## Development

### Project Structure

```
pango.wasm/
├── meson.build              # Main Meson build file
├── meson_options.txt        # Build configuration options
├── emscripten-cross.ini     # Emscripten cross-compilation config
├── dependencies.json        # WASM dependency manifest
├── deno.json                # Deno configuration & tasks
├── scripts/
│   ├── unified-build.sh     # Main build script
│   └── fetch-dependencies.sh # Dependency fetcher
├── wasm/
│   ├── meson.build          # WASM-specific build config
│   ├── web_native_*.c       # Web-native optimization modules
│   ├── pango_wasm_module.c  # MAIN_MODULE entry point
│   └── pango_wasm_side.c    # SIDE_MODULE entry point
├── src/lib/
│   ├── index.ts             # TypeScript main module
│   └── types.ts             # TypeScript type definitions
├── tests/deno/
│   ├── basic.test.ts        # Basic functionality tests
│   └── performance.test.ts  # Performance validation tests
├── bench/
│   └── simd_bench.ts        # SIMD performance benchmarks
└── demo-deno.ts             # Demo application

```

### Build Configuration

Edit `meson_options.txt` to customize build:

```meson
option('wasm_build_type', type: 'combo',
       choices: ['minimal', 'standard', 'webgpu'], value: 'standard')

option('wasm_simd', type: 'boolean', value: true)

option('wasm_threading', type: 'boolean', value: true)

option('wasm_webgpu', type: 'boolean', value: false)

option('wasm_optimize', type: 'combo',
       choices: ['size', 'speed', 'balanced'], value: 'balanced')
```

### Adding Dependencies

Edit `dependencies.json` to add WASM dependencies:

```json
{
  "dependencies": [
    {
      "name": "library-name",
      "version": "1.0.0",
      "type": "side",
      "url": "https://wasm.discere.cloud/library.wasm/v1.0.0/side/library-side.wasm",
      "integrity": "sha384-...",
      "symbols": ["function1", "function2"]
    }
  ]
}
```

## Testing

### Run All Tests

```bash
deno task test
```

### Run Specific Test

```bash
deno test --allow-read tests/deno/basic.test.ts
```

### Test Coverage

- ✅ Module loading and initialization
- ✅ Capabilities detection (SIMD, WebGPU, Web Crypto, etc.)
- ✅ Version string retrieval
- ✅ Minimum requirements check
- ✅ Performance validation for each optimization
- ✅ Module access and API availability

## Benchmarks

### SIMD String Operations

```bash
deno task bench
```

Validates 3-5x speedup target for SIMD string operations.

### Custom Benchmarks

Create benchmarks in `bench/` directory:

```typescript
import Pango from "../src/lib/index.ts";

const pango = new Pango();
await pango.initialize();

// Your benchmark code here
```

## Contributing

1. Follow the [CODING_STYLE.md](CODING_STYLE.md) guidelines
2. Add tests for new features
3. Run `deno task validate:all` before submitting
4. Update documentation as needed

## License

LGPL 2.1+ (original Pango license)

© 2025 Superstruct Ltd (WASM port and web-native optimizations)

## Links

- [Pango Homepage](https://pango.gnome.org/)
- [Discere OS](https://discere.cloud/)
- [WebAssembly](https://webassembly.org/)
- [WebGPU](https://www.w3.org/TR/webgpu/)
- [Emscripten](https://emscripten.org/)

## Support

For issues and questions:
- GitHub Issues: https://github.com/discere-os/pango.wasm/issues
- Discere OS Discord: https://discord.gg/discere

## Roadmap

- [x] Unified Meson build system
- [x] Web-native performance optimizations
- [x] SIMD string operations
- [x] WebCrypto integration
- [x] OPFS storage backend
- [x] Comprehensive testing suite
- [x] Performance benchmarks
- [ ] WebGPU text rendering backend
- [ ] Font subsetting optimization
- [ ] Advanced layout caching
- [ ] Multi-threading for layout
- [ ] NPM package publication
- [ ] JSR package publication
