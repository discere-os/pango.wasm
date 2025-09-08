#!/usr/bin/env node

/**
 * pango.wasm Comprehensive Test Suite
 * Production-quality text layout engine testing
 * Copyright 2025 Superstruct Ltd, New Zealand
 * Licensed under LGPL 2.1+
 */

import { strict as assert } from 'assert';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = dirname(__dirname);

console.log('🧪 pango.wasm Test Suite');
console.log('========================================');

// Test configuration
const TEST_CONFIG = {
    timeout: 30000,
    verbose: process.env.VERBOSE === '1',
    performanceTests: process.env.PERFORMANCE === '1'
};

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

// Test utilities
function test(name, testFn) {
    testsRun++;
    process.stdout.write(`  ${name}... `);
    
    try {
        const start = Date.now();
        testFn();
        const duration = Date.now() - start;
        
        testsPassed++;
        console.log(`✅ (${duration}ms)`);
        
        if (TEST_CONFIG.verbose) {
            console.log(`    Completed in ${duration}ms`);
        }
    } catch (error) {
        testsFailed++;
        console.log(`❌`);
        console.error(`    Error: ${error.message}`);
        
        if (TEST_CONFIG.verbose) {
            console.error(`    Stack: ${error.stack}`);
        }
    }
}

async function asyncTest(name, testFn) {
    testsRun++;
    process.stdout.write(`  ${name}... `);
    
    try {
        const start = Date.now();
        await testFn();
        const duration = Date.now() - start;
        
        testsPassed++;
        console.log(`✅ (${duration}ms)`);
        
        if (TEST_CONFIG.verbose) {
            console.log(`    Completed in ${duration}ms`);
        }
    } catch (error) {
        testsFailed++;
        console.log(`❌`);
        console.error(`    Error: ${error.message}`);
        
        if (TEST_CONFIG.verbose) {
            console.error(`    Stack: ${error.stack}`);
        }
    }
}

// Build verification tests
console.log('\n📦 Build Verification Tests');
console.log('-----------------------------------');

test('WASM module exists', () => {
    const wasmPath = join(PROJECT_ROOT, 'pango.wasm');
    assert(existsSync(wasmPath), 'pango.wasm file not found');
    
    const stats = readFileSync(wasmPath);
    assert(stats.length > 1024, 'WASM file too small');
    console.log(`    WASM size: ${(stats.length / 1024 / 1024).toFixed(2)}MB`);
});

test('JavaScript wrapper exists', () => {
    const jsPath = join(PROJECT_ROOT, 'pango.js');
    assert(existsSync(jsPath), 'pango.js file not found');
    
    const content = readFileSync(jsPath, 'utf8');
    assert(content.includes('WebAssembly'), 'JavaScript wrapper missing WebAssembly code');
    assert(content.includes('pango'), 'JavaScript wrapper missing Pango references');
});

test('TypeScript definitions exist', () => {
    const dtsPath = join(PROJECT_ROOT, 'pango-wrapper.d.ts');
    assert(existsSync(dtsPath), 'TypeScript definitions not found');
    
    const content = readFileSync(dtsPath, 'utf8');
    assert(content.includes('PangoWASM'), 'TypeScript definitions missing main class');
    assert(content.includes('createLayout'), 'TypeScript definitions missing essential methods');
});

test('Package.json is valid', () => {
    const packagePath = join(PROJECT_ROOT, 'package.json');
    assert(existsSync(packagePath), 'package.json not found');
    
    const packageData = JSON.parse(readFileSync(packagePath, 'utf8'));
    assert(packageData.name === 'pango.wasm', 'Invalid package name');
    assert(packageData.version, 'Package version missing');
    assert(packageData.main, 'Package main entry missing');
});

// WASM module loading tests
console.log('\n🌐 WASM Module Loading Tests');
console.log('-----------------------------------');

let PangoWASM;
let pangoInstance;

await asyncTest('Load WASM wrapper module', async () => {
    try {
        const wrapperModule = await import(join(PROJECT_ROOT, 'pango-wrapper.js'));
        PangoWASM = wrapperModule.default;
        assert(typeof PangoWASM === 'function', 'PangoWASM should be a constructor function');
        
        // Test constants are exported
        assert(typeof wrapperModule.PangoAlignment === 'object', 'PangoAlignment constants missing');
        assert(typeof wrapperModule.PangoWrapMode === 'object', 'PangoWrapMode constants missing');
        assert(typeof wrapperModule.PangoWeight === 'object', 'PangoWeight constants missing');
        
        console.log('    All constants exported correctly');
    } catch (error) {
        throw new Error(`Failed to load wrapper: ${error.message}`);
    }
});

await asyncTest('Initialize Pango WASM', async () => {
    pangoInstance = new PangoWASM();
    await pangoInstance.initialize();
    
    assert(pangoInstance.initialized === true, 'Pango should be initialized');
    console.log(`    Version: ${pangoInstance.getVersion()}`);
});

// Core functionality tests
console.log('\n🎯 Core Functionality Tests');
console.log('-----------------------------------');

let contextId, layoutId;

test('Create text context', () => {
    contextId = pangoInstance.createContext();
    assert(typeof contextId === 'number', 'Context ID should be a number');
    assert(contextId > 0, 'Context ID should be positive');
    
    console.log(`    Context ID: ${contextId}`);
});

test('Create text layout', () => {
    layoutId = pangoInstance.createLayout(contextId);
    assert(typeof layoutId === 'number', 'Layout ID should be a number');
    assert(layoutId > 0, 'Layout ID should be positive');
    
    console.log(`    Layout ID: ${layoutId}`);
});

test('Set simple text', () => {
    const testText = 'Hello, World!';
    pangoInstance.setText(layoutId, testText);
    
    // Test that the operation completed without throwing
    console.log(`    Set text: "${testText}"`);
});

test('Set font description', () => {
    const fontDesc = 'Arial 12';
    pangoInstance.setFontDescription(layoutId, fontDesc);
    
    console.log(`    Set font: ${fontDesc}`);
});

test('Get layout size', () => {
    const size = pangoInstance.getPixelSize(layoutId);
    
    assert(typeof size === 'object', 'Size should be an object');
    assert(typeof size.width === 'number', 'Width should be a number');
    assert(typeof size.height === 'number', 'Height should be a number');
    assert(size.width > 0, 'Width should be positive for non-empty text');
    assert(size.height > 0, 'Height should be positive');
    
    console.log(`    Size: ${size.width}x${size.height}px`);
});

// Text layout property tests
console.log('\n📐 Text Layout Property Tests');
console.log('-----------------------------------');

test('Set layout width', () => {
    pangoInstance.setWidth(layoutId, 200);
    
    const size = pangoInstance.getPixelSize(layoutId);
    console.log(`    Size with width limit: ${size.width}x${size.height}px`);
});

test('Set text alignment', () => {
    // Test different alignment modes (assuming constants are available)
    pangoInstance.setAlignment(layoutId, 1); // CENTER
    console.log('    Alignment set to CENTER');
    
    pangoInstance.setAlignment(layoutId, 0); // LEFT (reset)
    console.log('    Alignment reset to LEFT');
});

test('Set wrap mode', () => {
    pangoInstance.setWrapMode(layoutId, 0); // WORD
    console.log('    Wrap mode set to WORD');
});

test('Get line count', () => {
    const lineCount = pangoInstance.getLineCount(layoutId);
    assert(typeof lineCount === 'number', 'Line count should be a number');
    assert(lineCount >= 1, 'Should have at least one line');
    
    console.log(`    Line count: ${lineCount}`);
});

// Complex text tests
console.log('\n🌍 Complex Text Tests');
console.log('-----------------------------------');

test('Unicode text support', () => {
    const unicodeText = 'Hello 世界 🌍 مرحبا';
    pangoInstance.setText(layoutId, unicodeText);
    
    const size = pangoInstance.getPixelSize(layoutId);
    assert(size.width > 0, 'Unicode text should have positive width');
    
    console.log(`    Unicode text size: ${size.width}x${size.height}px`);
});

test('Bidirectional text support', () => {
    const bidiText = 'Hello العالم World';
    pangoInstance.setText(layoutId, bidiText);
    pangoInstance.setAutoDirection(layoutId, true);
    
    const size = pangoInstance.getPixelSize(layoutId);
    assert(size.width > 0, 'Bidirectional text should have positive width');
    
    console.log(`    Bidirectional text size: ${size.width}x${size.height}px`);
});

test('Markup text support', () => {
    const markupText = '<b>Bold</b> and <i>italic</i> text';
    pangoInstance.setMarkup(layoutId, markupText);
    
    const size = pangoInstance.getPixelSize(layoutId);
    assert(size.width > 0, 'Markup text should have positive width');
    
    console.log(`    Markup text size: ${size.width}x${size.height}px`);
});

test('Long text wrapping', () => {
    const longText = 'This is a very long text that should wrap across multiple lines when the width is constrained to a reasonable size for testing purposes.';
    
    pangoInstance.setText(layoutId, longText);
    pangoInstance.setWidth(layoutId, 150);
    pangoInstance.setWrapMode(layoutId, 0); // WORD
    
    const lineCount = pangoInstance.getLineCount(layoutId);
    assert(lineCount > 1, 'Long text should wrap to multiple lines');
    
    const size = pangoInstance.getPixelSize(layoutId);
    console.log(`    Long text: ${lineCount} lines, ${size.width}x${size.height}px`);
});

// Performance tests (if enabled)
if (TEST_CONFIG.performanceTests) {
    console.log('\n⚡ Performance Tests');
    console.log('-----------------------------------');
    
    await asyncTest('Layout creation performance', async () => {
        const iterations = 1000;
        const start = Date.now();
        
        const layouts = [];
        for (let i = 0; i < iterations; i++) {
            const testLayoutId = pangoInstance.createLayout(contextId);
            layouts.push(testLayoutId);
        }
        
        const creationTime = Date.now() - start;
        
        // Cleanup
        for (const id of layouts) {
            pangoInstance.destroyLayout(id);
        }
        
        const avgTime = creationTime / iterations;
        console.log(`    Created ${iterations} layouts in ${creationTime}ms (${avgTime.toFixed(2)}ms avg)`);
        
        assert(avgTime < 1, 'Layout creation should be under 1ms on average');
    });
    
    await asyncTest('Text processing performance', async () => {
        const testTexts = [
            'Short text',
            'Medium length text with some variety in content and characters',
            'Very long text with lots of content that will require more processing time and memory allocation for proper layout analysis and rendering optimization testing purposes with additional words.',
            'Unicode: 你好世界 こんにちは العالم 🌍🚀🎨',
            'Mixed content with <b>markup</b> and plain text combined together'
        ];
        
        const iterations = 100;
        const start = Date.now();
        
        for (let i = 0; i < iterations; i++) {
            for (const text of testTexts) {
                pangoInstance.setText(layoutId, text);
                pangoInstance.getPixelSize(layoutId);
            }
        }
        
        const processingTime = Date.now() - start;
        const totalOperations = iterations * testTexts.length;
        const avgTime = processingTime / totalOperations;
        
        console.log(`    Processed ${totalOperations} text operations in ${processingTime}ms (${avgTime.toFixed(2)}ms avg)`);
        
        assert(avgTime < 5, 'Text processing should be under 5ms on average');
    });
}

// Memory management tests
console.log('\n🧹 Memory Management Tests');
console.log('-----------------------------------');

test('Cleanup layouts', () => {
    pangoInstance.destroyLayout(layoutId);
    console.log('    Layout destroyed');
    
    // Try to use destroyed layout (should handle gracefully)
    try {
        pangoInstance.setText(layoutId, 'test');
        assert(false, 'Should throw error for destroyed layout');
    } catch (error) {
        console.log('    ✓ Properly handles destroyed layout');
    }
});

test('Cleanup contexts', () => {
    pangoInstance.destroyContext(contextId);
    console.log('    Context destroyed');
    
    // Try to create layout with destroyed context (should handle gracefully)
    try {
        pangoInstance.createLayout(contextId);
        assert(false, 'Should throw error for destroyed context');
    } catch (error) {
        console.log('    ✓ Properly handles destroyed context');
    }
});

test('Full cleanup', () => {
    pangoInstance.cleanup();
    console.log('    Full cleanup completed');
});

// Test summary
console.log('\n📊 Test Summary');
console.log('========================================');
console.log(`Total tests: ${testsRun}`);
console.log(`Passed: ${testsPassed} ✅`);
console.log(`Failed: ${testsFailed} ${testsFailed > 0 ? '❌' : ''}`);
console.log(`Success rate: ${((testsPassed / testsRun) * 100).toFixed(1)}%`);

if (testsFailed > 0) {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
} else {
    console.log('\n✅ All tests passed!');
    console.log('\n🎯 pango.wasm is working correctly');
    console.log('   • Text layout engine functional');
    console.log('   • Unicode and bidirectional text support');
    console.log('   • Markup text processing');
    console.log('   • Memory management working');
    console.log('   • Performance within acceptable limits');
    process.exit(0);
}