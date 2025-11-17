# Pango WASM builds - Unified Meson Build System
# Supports SIDE_MODULE (production) and MAIN_MODULE (testing/NPM) builds

# Common WASM compilation flags
wasm_common_flags = [
  '-fPIC',
  '-sWASM_BIGINT=1',
  '-DPANGO_WASM=1',
]

# SIMD flags (mandatory for 3-5x speedup)
wasm_simd_flags = get_option('wasm_simd') ? ['-msimd128'] : []

# Threading flags (10x speedup vs emulation)
wasm_threading_flags = get_option('wasm_threading') ? [
  '-pthread',
  '-sPTHREAD_POOL_SIZE=4',
] : ['-sUSE_PTHREADS=0']

# Build type specific flags
if get_option('wasm_build_type') == 'minimal'
  wasm_memory_flags = [
    '-sINITIAL_MEMORY=67108864',  # 64MB
    '-sSTACK_SIZE=2097152',       # 2MB
  ]
  wasm_opt_level = '-Oz'  # Size optimization
elif get_option('wasm_build_type') == 'webgpu'
  wasm_memory_flags = [
    '-sINITIAL_MEMORY=134217728',  # 128MB
    '-sMAXIMUM_MEMORY=1073741824', # 1GB
    '-sALLOW_MEMORY_GROWTH=1',
    '-sSTACK_SIZE=5242880',        # 5MB
  ]
  wasm_opt_level = '-O3'
  if get_option('wasm_webgpu')
    wasm_memory_flags += ['-sUSE_WEBGPU=1', '-sASYNCIFY=1']
  endif
else  # standard
  wasm_memory_flags = [
    '-sINITIAL_MEMORY=134217728',  # 128MB
    '-sMAXIMUM_MEMORY=1073741824', # 1GB
    '-sALLOW_MEMORY_GROWTH=1',
    '-sSTACK_SIZE=4194304',        # 4MB
  ]
  wasm_opt_level = '-O3'
endif

# Combine all WASM flags
wasm_cflags = wasm_common_flags + wasm_simd_flags
wasm_base_link_args = wasm_common_flags + wasm_simd_flags + wasm_memory_flags + [wasm_opt_level, '-flto']

# SIDE_MODULE target (production, dynamic loading by discere-concha.wasm)
pango_side_link_args = wasm_base_link_args + wasm_threading_flags + [
  '-sSIDE_MODULE=2',
  '-sERROR_ON_UNDEFINED_SYMBOLS=0',  # Host provides dependencies (cairo, glib, freetype, fontconfig, harfbuzz, etc.)
  '-sEXPORTED_FUNCTIONS=["_pango_version","_pango_version_string","_pango_version_check"]',
]

shared_module(
  'pango-side',
  files('pango_wasm_side.c', 'web_native_capabilities.c'),
  dependencies: [libpango_dep],
  name_prefix: '',
  name_suffix: 'wasm',
  c_args: wasm_cflags,
  link_args: pango_side_link_args,
  install: true,
  install_dir: get_option('libdir'),
)

# MAIN_MODULE target (testing, NPM distribution)
pango_main_link_args = wasm_base_link_args + [
  '-sEXPORT_ES6=1',
  '-sMODULARIZE=1',
  '-sEXPORT_NAME=PangoModule',
  '-sENVIRONMENT=web,webview,worker',
  '-sNO_FILESYSTEM=1',
  '-sEXPORTED_RUNTIME_METHODS=["ccall","cwrap","UTF8ToString","FS","HEAPU8"]',
  '-sEXPORTED_FUNCTIONS=["_pango_version","_pango_version_string","_pango_version_check","_malloc","_free"]',
]

executable(
  'pango-main',
  files('pango_wasm_module.c', 'web_native_capabilities.c'),
  dependencies: [libpango_dep],
  c_args: wasm_cflags,
  link_args: pango_main_link_args,
  install: true,
  install_dir: get_option('bindir'),
)
