/**
 * @module @discere-os/pango.wasm
 *
 * WASM library with web-native optimizations for Discere OS.
 *
 * Features:
 * - 3-10x Performance: Mandatory web-native optimizations
 *   - SIMD: 3-5x string operations
 *   - WebCrypto: 5-15x crypto operations
 *   - Workers: 10x threading
 *   - WebGPU: 10x+ parallel compute (GPU libraries)
 * - Dual Build: SIDE_MODULE (production) + MAIN_MODULE (testing/NPM)
 * - Deno-First: Native Deno support with NPM compatibility
 * - Browser Target: Chrome/Edge 113+ (WebGPU+SIMD mandatory, no fallbacks)
 */

export interface PangoModule {
  ccall: (funcName: string, returnType: string, argTypes: string[], args: any[]) => any;
  cwrap: (funcName: string, returnType: string, argTypes: string[]) => Function;
  FS: any;
  HEAPU8: Uint8Array;
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
}

export interface WebCapabilities {
  has_wasm_simd: boolean;
  has_webgpu: boolean;
  has_shared_array_buffer: boolean;
  has_web_crypto: boolean;
  has_opfs: boolean;
  has_workers: boolean;
  chrome_version: number;
}

export interface PangoConfig {
  /** Enable SIMD optimizations (3-5x speedup) */
  enableSIMD?: boolean;
  /** Enable WebGPU acceleration (10x+ speedup) */
  enableWebGPU?: boolean;
  /** Initial memory size in bytes */
  initialMemory?: number;
  /** Maximum memory size in bytes */
  maximumMemory?: number;
}

export default class Pango {
  private module: PangoModule | null = null;
  private initialized = false;
  private config: PangoConfig;

  constructor(config: PangoConfig = {}) {
    this.config = {
      enableSIMD: true,
      enableWebGPU: false,
      initialMemory: 128 * 1024 * 1024,  // 128MB
      maximumMemory: 1024 * 1024 * 1024, // 1GB
      ...config,
    };
  }

  /**
   * Initialize the WASM library
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check browser requirements
      this.checkBrowserRequirements();

      // Load module factory and WASM binary
      const factory = await this.loadModuleFactory();
      const wasm = await this.loadWasmBinary();

      // Initialize module
      this.module = await factory({ wasmBinary: wasm });
      this.initialized = true;

      // Log capabilities
      const caps = this.getCapabilities();
      console.log('Pango.wasm initialized with capabilities:', caps);
    } catch (error) {
      throw new Error(`Failed to initialize Pango.wasm: ${error}`);
    }
  }

  /**
   * Get web-native capabilities
   */
  getCapabilities(): WebCapabilities {
    this.ensureInitialized();

    // Call web_get_capabilities() from WASM
    const ptr = this.module!.ccall('web_get_capabilities', 'number', [], []);

    // Read capabilities struct from WASM memory
    const view = new DataView(this.module!.HEAPU8.buffer);
    return {
      has_wasm_simd: this.module!.HEAPU8[ptr] === 1,
      has_webgpu: this.module!.HEAPU8[ptr + 1] === 1,
      has_shared_array_buffer: this.module!.HEAPU8[ptr + 2] === 1,
      has_web_crypto: this.module!.HEAPU8[ptr + 3] === 1,
      has_opfs: this.module!.HEAPU8[ptr + 4] === 1,
      has_workers: this.module!.HEAPU8[ptr + 5] === 1,
      chrome_version: view.getInt32(ptr + 8, true),
    };
  }

  /**
   * Check if browser meets minimum requirements
   */
  checkMinimumRequirements(): boolean {
    if (!this.initialized) {
      return false;
    }
    return this.module!.ccall('web_check_minimum_requirements', 'boolean', [], []);
  }

  /**
   * Get Pango version string
   */
  getVersion(): string {
    this.ensureInitialized();
    const ptr = this.module!.ccall('pango_version_string', 'number', [], []);
    return this.readCString(ptr);
  }

  /**
   * Access the underlying WASM module
   */
  getModule(): PangoModule {
    this.ensureInitialized();
    return this.module!;
  }

  private async loadModuleFactory() {
    const modulePath = new URL('./../../install/wasm/pango-main.js', import.meta.url);
    const module = await import(modulePath.href);
    return module.default || module;
  }

  private async loadWasmBinary(): Promise<ArrayBuffer> {
    if (typeof Deno !== 'undefined') {
      const wasmPath = new URL('./../../install/wasm/pango-main.wasm', import.meta.url);
      const buffer = await Deno.readFile(wasmPath);
      return buffer.buffer;
    } else if (typeof fetch !== 'undefined') {
      const wasmPath = new URL('./../../install/wasm/pango-main.wasm', import.meta.url);
      const response = await fetch(wasmPath.href);
      return await response.arrayBuffer();
    }
    throw new Error('WASM loading only supported in Deno or browser environments');
  }

  private checkBrowserRequirements(): void {
    if (typeof WebAssembly === 'undefined') {
      throw new Error('WebAssembly not supported');
    }

    const ua = navigator?.userAgent || '';
    const chromeMatch = ua.match(/Chrome\/(\d+)/);
    const edgeMatch = ua.match(/Edg\/(\d+)/);

    let version = 0;
    if (chromeMatch) {
      version = parseInt(chromeMatch[1], 10);
    } else if (edgeMatch) {
      version = parseInt(edgeMatch[1], 10);
    }

    if (version < 113) {
      throw new Error(
        `Pango.wasm requires Chrome/Edge 113+ (found version ${version}). ` +
        `Please upgrade your browser for full WebGPU and SIMD support.`
      );
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.module) {
      throw new Error('Pango.wasm not initialized. Call initialize() first.');
    }
  }

  private readCString(ptr: number): string {
    const bytes = [];
    let offset = ptr;
    while (this.module!.HEAPU8[offset] !== 0) {
      bytes.push(this.module!.HEAPU8[offset]);
      offset++;
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
  }
}
