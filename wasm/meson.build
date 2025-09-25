pango_wasm_cargs = ['-msimd128', '-DPANGO_WASM=1']

pango_main_link_args = [
  '-sWASM=1',
  '-sMODULARIZE=1',
  '-sEXPORT_ES6=1',
  '-sEXPORT_NAME=PangoModule',
  '-sALLOW_MEMORY_GROWTH=1',
  '-sENVIRONMENT=web,webview,worker',
  '-sNO_FILESYSTEM=1',
  '-sEXPORTED_RUNTIME_METHODS=["cwrap","ccall","UTF8ToString"]',
  '-O3',
  '-flto',
]

executable(
  'pango-main',
  files('pango_wasm_module.c'),
  dependencies: [libpango_dep],
  c_args: pango_wasm_cargs,
  link_args: pango_main_link_args,
  install: true,
  install_dir: get_option('bindir'),
)

pango_side_link_args = [
  '-sSIDE_MODULE=2',
  '-fPIC',
  '-O3',
  '-flto',
  '-sEXPORTED_FUNCTIONS=["_pango_wasm_version"]',
]

shared_module(
  'pango-side',
  files('pango_wasm_side.c'),
  dependencies: [libpango_dep],
  name_prefix: '',
  c_args: pango_wasm_cargs,
  link_args: pango_side_link_args,
  install: true,
  install_dir: get_option('libdir'),
)

