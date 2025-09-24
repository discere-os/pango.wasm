#!/bin/bash
set -euo pipefail

# pango.wasm Production Build Script
# Complex text layout engine with dependency coordination
# Copyright 2025 Superstruct Ltd, New Zealand
# Licensed under LGPL 2.1+

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="${PROJECT_ROOT}/install"
BUILD_DIR="${PROJECT_ROOT}/build"

# Ecosystem dependencies - auto-detect from ecosystem with absolute paths
GLIB_ROOT="${GLIB_ROOT:-$(cd ../glib.wasm && pwd)/install}"
CAIRO_ROOT="${CAIRO_ROOT:-$(cd ../cairo.wasm && pwd)/install}"
HARFBUZZ_ROOT="${HARFBUZZ_ROOT:-$(cd ../harfbuzz.wasm && pwd)/install}"
FREETYPE_ROOT="${FREETYPE_ROOT:-$(cd ../freetype.wasm && pwd)/install}"
FONTCONFIG_ROOT="${FONTCONFIG_ROOT:-$(cd ../fontconfig.wasm && pwd)/install}"
PIXMAN_ROOT="${PIXMAN_ROOT:-$(cd ../pixman.wasm && pwd)/install}"
LIBEXPAT_ROOT="${LIBEXPAT_ROOT:-$(cd ../libexpat.wasm && pwd)/install}"
FRIBIDI_ROOT="${FRIBIDI_ROOT:-$(cd ../fribidi.wasm && pwd)/install}"

echo "=== pango.wasm Production Build (Tier 3 Graphics) ==="
echo "Complexity: 7/10 - Text layout engine with complex dependencies"
echo "Dependencies: glib, cairo, harfbuzz, freetype, fontconfig, pixman"

# Validate Emscripten environment
if ! command -v emcc &> /dev/null; then
    echo "❌ Emscripten not found. Please install and activate EMSDK."
    exit 1
fi

EMSCRIPTEN_VERSION=$(emcc -v 2>&1 | grep -oP 'emcc \(Emscripten gcc.*?\) \K[0-9]+\.[0-9]+\.[0-9]+' || echo "unknown")
echo "✅ Emscripten version: $EMSCRIPTEN_VERSION"

# Validate critical dependencies
check_dependency() {
    local dep_name="$1"
    local dep_path="$2"
    
    if [[ -d "$dep_path" ]]; then
        echo "✅ Found $dep_name at $dep_path"
        return 0
    else
        echo "❌ Missing dependency $dep_name at $dep_path"
        echo "   Please build $dep_name first in the WASM ecosystem"
        return 1
    fi
}

echo "Checking ecosystem dependencies..."
DEPS_OK=true
check_dependency "glib" "$GLIB_ROOT" || DEPS_OK=false
check_dependency "cairo" "$CAIRO_ROOT" || DEPS_OK=false
check_dependency "harfbuzz" "$HARFBUZZ_ROOT" || DEPS_OK=false
check_dependency "freetype" "$FREETYPE_ROOT" || DEPS_OK=false

if ! $DEPS_OK; then
    echo "❌ Missing required dependencies. Build order:"
    echo "   1. glib.wasm (foundation)"
    echo "   2. freetype.wasm (font rendering)"
    echo "   3. pixman.wasm (pixel operations)"
    echo "   4. cairo.wasm (2D graphics)" 
    echo "   5. harfbuzz.wasm (text shaping)"
    echo "   6. pango.wasm (text layout)"
    exit 1
fi

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf "$BUILD_DIR" "$INSTALL_DIR"
mkdir -p "$BUILD_DIR" "$INSTALL_DIR"

# Build configuration for Text Layout Engine (Tier 3 Graphics)
echo "🔧 Configuring pango.wasm build..."
cd "$BUILD_DIR"

# Cross-compilation configuration for complex text layout - use PKG_CONFIG_LIBDIR with absolute paths
export PKG_CONFIG_LIBDIR="${GLIB_ROOT}/lib/pkgconfig:${CAIRO_ROOT}/lib/pkgconfig:${HARFBUZZ_ROOT}/lib/pkgconfig:${FREETYPE_ROOT}/lib/pkgconfig:${FONTCONFIG_ROOT}/lib/pkgconfig:${PIXMAN_ROOT}/lib/pkgconfig:${LIBEXPAT_ROOT}/lib/pkgconfig:${FRIBIDI_ROOT}/lib/pkgconfig"
unset PKG_CONFIG_PATH

# Tier 3 Graphics configuration - complex text processing
meson setup . "$PROJECT_ROOT" \
    --cross-file "${PROJECT_ROOT}/wasm-cross.ini" \
    --prefix="$INSTALL_DIR" \
    --buildtype=release \
    -Dintrospection=disabled \
    -Ddocumentation=false \
    -Dman-pages=false \
    -Dbuild-testsuite=false \
    -Dbuild-examples=false \
    -Dfontconfig=enabled \
    -Dcairo=enabled \
    -Dfreetype=enabled \
    -Dsysprof=disabled \
    -Dlibthai=disabled \
    -Dxft=disabled \
    || {
        echo "❌ Meson configuration failed"
        echo "Debug information:"
        find "$BUILD_DIR" -name "meson-logs" -exec cat {}/meson-log.txt \; 2>/dev/null || true
        exit 1
    }

echo "🔨 Building pango..."
ninja -v || {
    echo "❌ Build failed"
    exit 1
}

echo "📦 Installing pango..."
ninja install || {
    echo "❌ Installation failed"
    exit 1
}

# Create WASM module configuration  
echo "🎯 Creating WASM module..."

# WASM module configuration for text layout
cat > "${PROJECT_ROOT}/wasm_module.c" << 'EOF'
/*
 * pango.wasm - WebAssembly Text Layout Engine
 * Production-quality text shaping and layout engine
 * Supports complex scripts, bidirectional text, font fallback
 * Copyright 2025 Superstruct Ltd, New Zealand
 * Licensed under LGPL 2.1+
 */

#include <emscripten.h>
#include <pango/pango.h>
#include <pango/pangocairo.h>
#include <pango/pango-font.h>
#include <pango/pango-break.h>
#include <string.h>
#include <stdio.h>

// Text Layout Context Management
EMSCRIPTEN_KEEPALIVE
PangoContext* pango_wasm_create_context() {
    PangoFontMap *fontmap = pango_cairo_font_map_get_default();
    return pango_font_map_create_context(fontmap);
}

EMSCRIPTEN_KEEPALIVE
void pango_wasm_destroy_context(PangoContext *context) {
    if (context) {
        g_object_unref(context);
    }
}

// Text Layout Creation and Management
EMSCRIPTEN_KEEPALIVE
PangoLayout* pango_wasm_create_layout(PangoContext *context) {
    return pango_layout_new(context);
}

EMSCRIPTEN_KEEPALIVE
void pango_wasm_layout_set_text(PangoLayout *layout, const char *text, int length) {
    pango_layout_set_text(layout, text, length);
}

EMSCRIPTEN_KEEPALIVE
void pango_wasm_layout_set_markup(PangoLayout *layout, const char *markup, int length) {
    pango_layout_set_markup(layout, markup, length);
}

EMSCRIPTEN_KEEPALIVE
void pango_wasm_layout_set_font_description(PangoLayout *layout, const char *font_desc) {
    PangoFontDescription *desc = pango_font_description_from_string(font_desc);
    pango_layout_set_font_description(layout, desc);
    pango_font_description_free(desc);
}

EMSCRIPTEN_KEEPALIVE
void pango_wasm_layout_set_width(PangoLayout *layout, int width) {
    pango_layout_set_width(layout, width * PANGO_SCALE);
}

EMSCRIPTEN_KEEPALIVE
void pango_wasm_layout_set_height(PangoLayout *layout, int height) {
    pango_layout_set_height(layout, height * PANGO_SCALE);
}

EMSCRIPTEN_KEEPALIVE
void pango_wasm_layout_set_alignment(PangoLayout *layout, int alignment) {
    pango_layout_set_alignment(layout, (PangoAlignment)alignment);
}

EMSCRIPTEN_KEEPALIVE
void pango_wasm_layout_set_wrap(PangoLayout *layout, int wrap_mode) {
    pango_layout_set_wrap(layout, (PangoWrapMode)wrap_mode);
}

EMSCRIPTEN_KEEPALIVE
void pango_wasm_layout_set_ellipsize(PangoLayout *layout, int ellipsize_mode) {
    pango_layout_set_ellipsize(layout, (PangoEllipsizeMode)ellipsize_mode);
}

// Text Measurement and Information
EMSCRIPTEN_KEEPALIVE
void pango_wasm_layout_get_size(PangoLayout *layout, int *width, int *height) {
    pango_layout_get_size(layout, width, height);
    *width /= PANGO_SCALE;
    *height /= PANGO_SCALE;
}

EMSCRIPTEN_KEEPALIVE
void pango_wasm_layout_get_pixel_size(PangoLayout *layout, int *width, int *height) {
    pango_layout_get_pixel_size(layout, width, height);
}

EMSCRIPTEN_KEEPALIVE
int pango_wasm_layout_get_line_count(PangoLayout *layout) {
    return pango_layout_get_line_count(layout);
}

// Bidirectional Text Support
EMSCRIPTEN_KEEPALIVE
void pango_wasm_layout_set_auto_dir(PangoLayout *layout, int auto_dir) {
    pango_layout_set_auto_dir(layout, auto_dir ? TRUE : FALSE);
}

EMSCRIPTEN_KEEPALIVE
int pango_wasm_get_base_dir(const char *text, int length) {
    return pango_find_base_dir(text, length);
}

// Font Handling
EMSCRIPTEN_KEEPALIVE
char* pango_wasm_font_description_to_string(const char *family, int size, int weight, int style) {
    PangoFontDescription *desc = pango_font_description_new();
    pango_font_description_set_family(desc, family);
    pango_font_description_set_size(desc, size * PANGO_SCALE);
    pango_font_description_set_weight(desc, (PangoWeight)weight);
    pango_font_description_set_style(desc, (PangoStyle)style);
    
    char *str = pango_font_description_to_string(desc);
    pango_font_description_free(desc);
    return str;
}

// Text Attributes and Styling
EMSCRIPTEN_KEEPALIVE
PangoAttrList* pango_wasm_attr_list_new() {
    return pango_attr_list_new();
}

EMSCRIPTEN_KEEPALIVE
void pango_wasm_attr_list_insert_color(PangoAttrList *list, int r, int g, int b, int start, int end) {
    PangoAttribute *attr = pango_attr_foreground_new(r * 256, g * 256, b * 256);
    attr->start_index = start;
    attr->end_index = end;
    pango_attr_list_insert(list, attr);
}

EMSCRIPTEN_KEEPALIVE
void pango_wasm_attr_list_insert_weight(PangoAttrList *list, int weight, int start, int end) {
    PangoAttribute *attr = pango_attr_weight_new((PangoWeight)weight);
    attr->start_index = start;
    attr->end_index = end;
    pango_attr_list_insert(list, attr);
}

EMSCRIPTEN_KEEPALIVE
void pango_wasm_layout_set_attributes(PangoLayout *layout, PangoAttrList *attrs) {
    pango_layout_set_attributes(layout, attrs);
}

// Text Analysis and Breaking
EMSCRIPTEN_KEEPALIVE
void pango_wasm_break_text(const char *text, int length, PangoLogAttr *attrs) {
    pango_get_log_attrs(text, length, -1, NULL, attrs, length + 1);
}

// Memory Management
EMSCRIPTEN_KEEPALIVE
void pango_wasm_free_string(char *str) {
    g_free(str);
}

EMSCRIPTEN_KEEPALIVE
void pango_wasm_destroy_layout(PangoLayout *layout) {
    if (layout) {
        g_object_unref(layout);
    }
}

EMSCRIPTEN_KEEPALIVE
void pango_wasm_attr_list_unref(PangoAttrList *list) {
    if (list) {
        pango_attr_list_unref(list);
    }
}

// Version and Information
EMSCRIPTEN_KEEPALIVE
const char* pango_wasm_get_version() {
    return pango_version_string();
}

EMSCRIPTEN_KEEPALIVE
int pango_wasm_version_check(int required_major, int required_minor, int required_micro) {
    return PANGO_VERSION_CHECK(required_major, required_minor, required_micro);
}
EOF

# Build WASM module with text layout optimizations
echo "🌐 Compiling WASM module..."
emcc -O3 \
    -I"$INSTALL_DIR/include/pango-1.0" \
    -I"$GLIB_ROOT/include/glib-2.0" \
    -I"$GLIB_ROOT/lib/glib-2.0/include" \
    -I"$CAIRO_ROOT/include/cairo" \
    -I"$HARFBUZZ_ROOT/include/harfbuzz" \
    -I"$FREETYPE_ROOT/include/freetype2" \
    -I"$PIXMAN_ROOT/include/pixman-1" \
    -L"$INSTALL_DIR/lib" \
    -L"$GLIB_ROOT/lib" \
    -L"$CAIRO_ROOT/lib" \
    -L"$HARFBUZZ_ROOT/lib" \
    -L"$FREETYPE_ROOT/lib" \
    -L"$PIXMAN_ROOT/lib" \
    -s WASM=1 \
    -s MODULARIZE=1 \
    -s EXPORT_ES6=1 \
    -s EXPORTED_FUNCTIONS='["_pango_wasm_create_context","_pango_wasm_destroy_context","_pango_wasm_create_layout","_pango_wasm_layout_set_text","_pango_wasm_layout_set_markup","_pango_wasm_layout_set_font_description","_pango_wasm_layout_set_width","_pango_wasm_layout_set_height","_pango_wasm_layout_set_alignment","_pango_wasm_layout_set_wrap","_pango_wasm_layout_set_ellipsize","_pango_wasm_layout_get_size","_pango_wasm_layout_get_pixel_size","_pango_wasm_layout_get_line_count","_pango_wasm_layout_set_auto_dir","_pango_wasm_get_base_dir","_pango_wasm_font_description_to_string","_pango_wasm_attr_list_new","_pango_wasm_attr_list_insert_color","_pango_wasm_attr_list_insert_weight","_pango_wasm_layout_set_attributes","_pango_wasm_break_text","_pango_wasm_free_string","_pango_wasm_destroy_layout","_pango_wasm_attr_list_unref","_pango_wasm_get_version","_pango_wasm_version_check","_malloc","_free"]' \
    -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","HEAPU8","UTF8ToString","stringToUTF8","lengthBytesUTF8"]' \
    -s INITIAL_MEMORY=128MB \
    -s MAXIMUM_MEMORY=2GB \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s STACK_SIZE=10MB \
    -s ASSERTIONS=0 \
    --closure 1 \
    -flto \
    wasm_module.c \
    -lpango-1.0 -lpangocairo-1.0 \
    -lcairo -lharfbuzz -lfreetype -lpixman-1 \
    -lglib-2.0 -lgobject-2.0 \
    -o pango.js || {
        echo "❌ WASM compilation failed"
        exit 1
    }

# Create JavaScript wrapper
echo "📦 Creating JavaScript wrapper..."
cat > pango-wrapper.js << 'EOF'
/**
 * pango.wasm - Text Layout Engine JavaScript Wrapper
 * Production-quality text shaping and layout for web applications
 * Copyright 2025 Superstruct Ltd, New Zealand
 * Licensed under LGPL 2.1+
 */

import PangoModule from './pango.js';

export class PangoWASM {
    constructor() {
        this.module = null;
        this.initialized = false;
        this.contexts = new Map();
        this.layouts = new Map();
        this.nextId = 1;
    }

    async initialize() {
        if (this.initialized) return;
        
        this.module = await PangoModule();
        this.initialized = true;
        
        console.log(`✅ pango.wasm initialized - ${this.getVersion()}`);
    }

    // Context Management
    createContext() {
        if (!this.initialized) throw new Error('Pango not initialized');
        
        const contextPtr = this.module._pango_wasm_create_context();
        if (!contextPtr) throw new Error('Failed to create Pango context');
        
        const contextId = this.nextId++;
        this.contexts.set(contextId, contextPtr);
        return contextId;
    }

    destroyContext(contextId) {
        const contextPtr = this.contexts.get(contextId);
        if (contextPtr) {
            this.module._pango_wasm_destroy_context(contextPtr);
            this.contexts.delete(contextId);
        }
    }

    // Layout Management
    createLayout(contextId) {
        const contextPtr = this.contexts.get(contextId);
        if (!contextPtr) throw new Error('Invalid context ID');
        
        const layoutPtr = this.module._pango_wasm_create_layout(contextPtr);
        if (!layoutPtr) throw new Error('Failed to create layout');
        
        const layoutId = this.nextId++;
        this.layouts.set(layoutId, layoutPtr);
        return layoutId;
    }

    destroyLayout(layoutId) {
        const layoutPtr = this.layouts.get(layoutId);
        if (layoutPtr) {
            this.module._pango_wasm_destroy_layout(layoutPtr);
            this.layouts.delete(layoutId);
        }
    }

    // Text Content
    setText(layoutId, text) {
        const layoutPtr = this.layouts.get(layoutId);
        if (!layoutPtr) throw new Error('Invalid layout ID');
        
        const textPtr = this.module.stringToUTF8OnStack(text);
        this.module._pango_wasm_layout_set_text(layoutPtr, textPtr, text.length);
    }

    setMarkup(layoutId, markup) {
        const layoutPtr = this.layouts.get(layoutId);
        if (!layoutPtr) throw new Error('Invalid layout ID');
        
        const markupPtr = this.module.stringToUTF8OnStack(markup);
        this.module._pango_wasm_layout_set_markup(layoutPtr, markupPtr, markup.length);
    }

    // Font and Styling
    setFontDescription(layoutId, fontDesc) {
        const layoutPtr = this.layouts.get(layoutId);
        if (!layoutPtr) throw new Error('Invalid layout ID');
        
        const fontPtr = this.module.stringToUTF8OnStack(fontDesc);
        this.module._pango_wasm_layout_set_font_description(layoutPtr, fontPtr);
    }

    // Layout Properties
    setWidth(layoutId, width) {
        const layoutPtr = this.layouts.get(layoutId);
        if (!layoutPtr) throw new Error('Invalid layout ID');
        
        this.module._pango_wasm_layout_set_width(layoutPtr, width);
    }

    setHeight(layoutId, height) {
        const layoutPtr = this.layouts.get(layoutId);
        if (!layoutPtr) throw new Error('Invalid layout ID');
        
        this.module._pango_wasm_layout_set_height(layoutPtr, height);
    }

    setAlignment(layoutId, alignment) {
        const layoutPtr = this.layouts.get(layoutId);
        if (!layoutPtr) throw new Error('Invalid layout ID');
        
        this.module._pango_wasm_layout_set_alignment(layoutPtr, alignment);
    }

    setWrapMode(layoutId, wrapMode) {
        const layoutPtr = this.layouts.get(layoutId);
        if (!layoutPtr) throw new Error('Invalid layout ID');
        
        this.module._pango_wasm_layout_set_wrap(layoutPtr, wrapMode);
    }

    setEllipsizeMode(layoutId, ellipsizeMode) {
        const layoutPtr = this.layouts.get(layoutId);
        if (!layoutPtr) throw new Error('Invalid layout ID');
        
        this.module._pango_wasm_layout_set_ellipsize(layoutPtr, ellipsizeMode);
    }

    // Layout Measurement
    getSize(layoutId) {
        const layoutPtr = this.layouts.get(layoutId);
        if (!layoutPtr) throw new Error('Invalid layout ID');
        
        const widthPtr = this.module._malloc(4);
        const heightPtr = this.module._malloc(4);
        
        try {
            this.module._pango_wasm_layout_get_size(layoutPtr, widthPtr, heightPtr);
            
            const width = this.module.HEAP32[widthPtr >> 2];
            const height = this.module.HEAP32[heightPtr >> 2];
            
            return { width, height };
        } finally {
            this.module._free(widthPtr);
            this.module._free(heightPtr);
        }
    }

    getPixelSize(layoutId) {
        const layoutPtr = this.layouts.get(layoutId);
        if (!layoutPtr) throw new Error('Invalid layout ID');
        
        const widthPtr = this.module._malloc(4);
        const heightPtr = this.module._malloc(4);
        
        try {
            this.module._pango_wasm_layout_get_pixel_size(layoutPtr, widthPtr, heightPtr);
            
            const width = this.module.HEAP32[widthPtr >> 2];
            const height = this.module.HEAP32[heightPtr >> 2];
            
            return { width, height };
        } finally {
            this.module._free(widthPtr);
            this.module._free(heightPtr);
        }
    }

    getLineCount(layoutId) {
        const layoutPtr = this.layouts.get(layoutId);
        if (!layoutPtr) throw new Error('Invalid layout ID');
        
        return this.module._pango_wasm_layout_get_line_count(layoutPtr);
    }

    // Bidirectional Text Support
    setAutoDirection(layoutId, autoDir) {
        const layoutPtr = this.layouts.get(layoutId);
        if (!layoutPtr) throw new Error('Invalid layout ID');
        
        this.module._pango_wasm_layout_set_auto_dir(layoutPtr, autoDir ? 1 : 0);
    }

    getBaseDirection(text) {
        const textPtr = this.module.stringToUTF8OnStack(text);
        return this.module._pango_wasm_get_base_dir(textPtr, text.length);
    }

    // Version Information
    getVersion() {
        if (!this.initialized) return 'Not initialized';
        
        const versionPtr = this.module._pango_wasm_get_version();
        return this.module.UTF8ToString(versionPtr);
    }

    // Cleanup
    cleanup() {
        // Clean up all layouts
        for (const layoutId of this.layouts.keys()) {
            this.destroyLayout(layoutId);
        }
        
        // Clean up all contexts
        for (const contextId of this.contexts.keys()) {
            this.destroyContext(contextId);
        }
        
        this.initialized = false;
    }
}

// Constants
export const PangoAlignment = {
    LEFT: 0,
    CENTER: 1,
    RIGHT: 2
};

export const PangoWrapMode = {
    WORD: 0,
    CHAR: 1,
    WORD_CHAR: 2
};

export const PangoEllipsizeMode = {
    NONE: 0,
    START: 1,
    MIDDLE: 2,
    END: 3
};

export const PangoWeight = {
    THIN: 100,
    ULTRALIGHT: 200,
    LIGHT: 300,
    SEMILIGHT: 350,
    BOOK: 380,
    NORMAL: 400,
    MEDIUM: 500,
    SEMIBOLD: 600,
    BOLD: 700,
    ULTRABOLD: 800,
    HEAVY: 900,
    ULTRAHEAVY: 1000
};

export const PangoStyle = {
    NORMAL: 0,
    OBLIQUE: 1,
    ITALIC: 2
};

export default PangoWASM;
EOF

# Create package.json
echo "📋 Creating package.json..."
cat > package.json << 'EOF'
{
  "name": "pango.wasm",
  "version": "1.57.1",
  "description": "Production-quality text layout engine compiled to WebAssembly",
  "main": "pango-wrapper.js",
  "type": "module",
  "exports": {
    ".": {
      "import": "./pango-wrapper.js",
      "types": "./pango-wrapper.d.ts"
    }
  },
  "files": [
    "pango.js",
    "pango.wasm",
    "pango-wrapper.js",
    "pango-wrapper.d.ts",
    "README.md"
  ],
  "keywords": [
    "pango",
    "text-layout",
    "webassembly",
    "wasm",
    "typography",
    "internationalization",
    "i18n",
    "bidirectional",
    "complex-text"
  ],
  "author": "Superstruct Ltd",
  "license": "LGPL-2.1+",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/superstruct/pango.wasm.git"
  },
  "bugs": {
    "url": "https://github.com/superstruct/pango.wasm/issues"
  },
  "homepage": "https://github.com/superstruct/pango.wasm#readme",
  "dependencies": {},
  "peerDependencies": {},
  "devDependencies": {
    "typescript": "^5.0.0"
  },
  "scripts": {
    "build": "./build-wasm.sh",
    "test": "node test/test.js",
    "benchmark": "node test/benchmark.js"
  }
}
EOF

# Create TypeScript definitions
echo "📝 Creating TypeScript definitions..."
cat > pango-wrapper.d.ts << 'EOF'
/**
 * pango.wasm TypeScript Definitions
 * Production-quality text layout engine for WebAssembly
 */

export interface LayoutSize {
    width: number;
    height: number;
}

export declare class PangoWASM {
    constructor();
    
    /**
     * Initialize the Pango WASM module
     */
    initialize(): Promise<void>;
    
    /**
     * Create a new text rendering context
     */
    createContext(): number;
    
    /**
     * Destroy a text rendering context
     */
    destroyContext(contextId: number): void;
    
    /**
     * Create a new text layout
     */
    createLayout(contextId: number): number;
    
    /**
     * Destroy a text layout
     */
    destroyLayout(layoutId: number): void;
    
    /**
     * Set plain text content
     */
    setText(layoutId: number, text: string): void;
    
    /**
     * Set markup text content (supports Pango markup)
     */
    setMarkup(layoutId: number, markup: string): void;
    
    /**
     * Set font description (e.g., "Arial 12" or "Times Bold 14")
     */
    setFontDescription(layoutId: number, fontDesc: string): void;
    
    /**
     * Set layout width in pixels (-1 for no width limit)
     */
    setWidth(layoutId: number, width: number): void;
    
    /**
     * Set layout height in pixels (-1 for no height limit)
     */
    setHeight(layoutId: number, height: number): void;
    
    /**
     * Set text alignment
     */
    setAlignment(layoutId: number, alignment: number): void;
    
    /**
     * Set text wrapping mode
     */
    setWrapMode(layoutId: number, wrapMode: number): void;
    
    /**
     * Set text ellipsization mode
     */
    setEllipsizeMode(layoutId: number, ellipsizeMode: number): void;
    
    /**
     * Get layout size in Pango units
     */
    getSize(layoutId: number): LayoutSize;
    
    /**
     * Get layout size in pixels
     */
    getPixelSize(layoutId: number): LayoutSize;
    
    /**
     * Get number of lines in layout
     */
    getLineCount(layoutId: number): number;
    
    /**
     * Enable automatic text direction detection
     */
    setAutoDirection(layoutId: number, autoDir: boolean): void;
    
    /**
     * Get base direction of text
     */
    getBaseDirection(text: string): number;
    
    /**
     * Get Pango version string
     */
    getVersion(): string;
    
    /**
     * Clean up all resources
     */
    cleanup(): void;
}

export declare const PangoAlignment: {
    LEFT: 0;
    CENTER: 1;
    RIGHT: 2;
};

export declare const PangoWrapMode: {
    WORD: 0;
    CHAR: 1;
    WORD_CHAR: 2;
};

export declare const PangoEllipsizeMode: {
    NONE: 0;
    START: 1;
    MIDDLE: 2;
    END: 3;
};

export declare const PangoWeight: {
    THIN: 100;
    ULTRALIGHT: 200;
    LIGHT: 300;
    SEMILIGHT: 350;
    BOOK: 380;
    NORMAL: 400;
    MEDIUM: 500;
    SEMIBOLD: 600;
    BOLD: 700;
    ULTRABOLD: 800;
    HEAVY: 900;
    ULTRAHEAVY: 1000;
};

export declare const PangoStyle: {
    NORMAL: 0;
    OBLIQUE: 1;
    ITALIC: 2;
};

export default PangoWASM;
EOF

echo "✅ pango.wasm production build completed!"
echo ""
echo "📁 Generated files:"
echo "   • pango.js + pango.wasm - Core WASM module"
echo "   • pango-wrapper.js - JavaScript API wrapper"
echo "   • pango-wrapper.d.ts - TypeScript definitions"
echo "   • package.json - NPM package configuration"
echo ""
echo "🎯 Build features:"
echo "   • Complex text layout and shaping"
echo "   • Bidirectional text support"
echo "   • Rich text markup support"
echo "   • Professional typography"
echo "   • Multiple font backends"
echo "   • Memory optimized (128MB-2GB)"
echo ""
echo "📦 File sizes:"
ls -lh pango.js pango.wasm 2>/dev/null | awk '{print "   • " $9 ": " $5}' || true
echo ""
echo "🔗 Dependencies integrated:"
echo "   • glib.wasm - Foundation libraries"
echo "   • cairo.wasm - 2D graphics rendering"
echo "   • harfbuzz.wasm - Text shaping engine"
echo "   • freetype.wasm - Font rendering"
echo "   • pixman.wasm - Pixel manipulation"
echo ""
echo "Next steps: Run tests and benchmarks with './test/test.js'"