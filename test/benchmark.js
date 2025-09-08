#!/usr/bin/env node

/**
 * pango.wasm Performance Benchmark Suite
 * Comprehensive text layout engine performance testing
 * Copyright 2025 Superstruct Ltd, New Zealand
 * Licensed under LGPL 2.1+
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = dirname(__dirname);

console.log('⚡ pango.wasm Performance Benchmark Suite');
console.log('=============================================');

// Benchmark configuration
const BENCHMARK_CONFIG = {
    warmupIterations: 100,
    benchmarkIterations: 1000,
    measureMemory: true,
    exportResults: true,
    verbose: process.env.VERBOSE === '1'
};

// Performance measurement utilities
class PerformanceMeasurement {
    constructor(name) {
        this.name = name;
        this.measurements = [];
        this.memoryMeasurements = [];
    }

    start() {
        if (BENCHMARK_CONFIG.measureMemory && typeof process !== 'undefined') {
            const memUsage = process.memoryUsage();
            this.startMemory = memUsage.heapUsed;
        }
        this.startTime = performance.now();
    }

    end() {
        this.endTime = performance.now();
        const duration = this.endTime - this.startTime;
        this.measurements.push(duration);

        if (BENCHMARK_CONFIG.measureMemory && typeof process !== 'undefined') {
            const memUsage = process.memoryUsage();
            const memoryDelta = memUsage.heapUsed - (this.startMemory || 0);
            this.memoryMeasurements.push(memoryDelta);
        }

        return duration;
    }

    getStatistics() {
        if (this.measurements.length === 0) return null;

        const sorted = [...this.measurements].sort((a, b) => a - b);
        const sum = sorted.reduce((a, b) => a + b, 0);

        const stats = {
            name: this.name,
            count: sorted.length,
            min: sorted[0],
            max: sorted[sorted.length - 1],
            avg: sum / sorted.length,
            median: sorted[Math.floor(sorted.length / 2)],
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)],
            total: sum
        };

        if (this.memoryMeasurements.length > 0) {
            const memSum = this.memoryMeasurements.reduce((a, b) => a + b, 0);
            stats.avgMemoryDelta = memSum / this.memoryMeasurements.length;
            stats.maxMemoryDelta = Math.max(...this.memoryMeasurements);
        }

        return stats;
    }

    formatStatistics() {
        const stats = this.getStatistics();
        if (!stats) return 'No measurements';

        let result = `${stats.name}:\n`;
        result += `  Iterations: ${stats.count}\n`;
        result += `  Min: ${stats.min.toFixed(2)}ms\n`;
        result += `  Max: ${stats.max.toFixed(2)}ms\n`;
        result += `  Avg: ${stats.avg.toFixed(2)}ms\n`;
        result += `  Median: ${stats.median.toFixed(2)}ms\n`;
        result += `  P95: ${stats.p95.toFixed(2)}ms\n`;
        result += `  P99: ${stats.p99.toFixed(2)}ms\n`;
        result += `  Total: ${stats.total.toFixed(2)}ms\n`;
        
        if (stats.avgMemoryDelta !== undefined) {
            result += `  Avg Memory: ${(stats.avgMemoryDelta / 1024).toFixed(2)}KB\n`;
            result += `  Max Memory: ${(stats.maxMemoryDelta / 1024).toFixed(2)}KB\n`;
        }

        return result;
    }
}

// Test data for benchmarks
const BENCHMARK_DATA = {
    shortText: 'Hello, World!',
    mediumText: 'This is a medium-length text sample that contains enough content to be representative of typical text layout scenarios.',
    longText: 'This is a very long text sample that is designed to test the performance of text layout operations when dealing with substantial amounts of content. '.repeat(10),
    unicodeText: 'Hello 世界 🌍 مرحبا Здравствуй नमस्ते こんにちは 안녕하세요 שלום',
    bidiText: 'English text mixed with العربية and עברית and back to English',
    markupText: '<b>Bold</b> and <i>italic</i> and <u>underlined</u> text with <span color="red">colored</span> content',
    complexMarkup: '<b>Complex <i>nested <u>markup</u> with</i> various</b> <span size="large" color="blue">styles</span> and formatting',
    paragraphText: `This is the first paragraph with multiple sentences. Each sentence provides some content for layout testing.

This is the second paragraph, separated by a blank line. This paragraph also contains multiple sentences to provide realistic text layout scenarios.

And this is the third paragraph, which completes our multi-paragraph test case for comprehensive text layout benchmarking.`,
    wrapText: 'This text is specifically designed to test word wrapping behavior when the layout width is constrained to force line breaking at word boundaries.',
    numberText: '1234567890 12.34 $56.78 €90.12 ¥3456 100% 2nd 3rd 1st 2024-01-15'
};

// Font configurations for testing
const FONT_CONFIGS = [
    'Arial 10',
    'Arial 12',
    'Arial 16',
    'Times 12',
    'Courier 10',
    'Arial Bold 12',
    'Arial Italic 12'
];

// Layout configurations
const LAYOUT_CONFIGS = [
    { width: -1, alignment: 0, wrap: 0 }, // No constraints
    { width: 100, alignment: 0, wrap: 0 }, // Narrow width
    { width: 200, alignment: 1, wrap: 0 }, // Medium width, center aligned
    { width: 400, alignment: 2, wrap: 1 }, // Wide width, right aligned, char wrap
    { width: 300, alignment: 0, wrap: 2 }  // Medium width, word-char wrap
];

let PangoWASM;
let pangoInstance;
let contextId;

// Initialize Pango
console.log('🔧 Initializing pango.wasm...');
try {
    const wrapperModule = await import(join(PROJECT_ROOT, 'pango-wrapper.js'));
    PangoWASM = wrapperModule.default;
    pangoInstance = new PangoWASM();
    await pangoInstance.initialize();
    contextId = pangoInstance.createContext();
    console.log(`✅ Initialized pango.wasm ${pangoInstance.getVersion()}`);
} catch (error) {
    console.error('❌ Failed to initialize pango.wasm:', error.message);
    process.exit(1);
}

// Benchmark results storage
const benchmarkResults = {
    timestamp: new Date().toISOString(),
    version: pangoInstance.getVersion(),
    config: BENCHMARK_CONFIG,
    benchmarks: {}
};

// Benchmark functions
async function benchmarkLayoutCreation() {
    console.log('\n📐 Benchmarking Layout Creation...');
    
    const measure = new PerformanceMeasurement('Layout Creation');
    
    // Warmup
    for (let i = 0; i < BENCHMARK_CONFIG.warmupIterations; i++) {
        const layoutId = pangoInstance.createLayout(contextId);
        pangoInstance.destroyLayout(layoutId);
    }
    
    // Benchmark
    for (let i = 0; i < BENCHMARK_CONFIG.benchmarkIterations; i++) {
        measure.start();
        const layoutId = pangoInstance.createLayout(contextId);
        measure.end();
        pangoInstance.destroyLayout(layoutId);
    }
    
    const stats = measure.getStatistics();
    benchmarkResults.benchmarks.layoutCreation = stats;
    console.log(measure.formatStatistics());
    
    return stats;
}

async function benchmarkTextSetting() {
    console.log('\n📝 Benchmarking Text Setting...');
    
    const layoutId = pangoInstance.createLayout(contextId);
    const results = {};
    
    for (const [textName, textContent] of Object.entries(BENCHMARK_DATA)) {
        const measure = new PerformanceMeasurement(`Set Text - ${textName}`);
        
        // Warmup
        for (let i = 0; i < BENCHMARK_CONFIG.warmupIterations; i++) {
            pangoInstance.setText(layoutId, textContent);
        }
        
        // Benchmark
        for (let i = 0; i < BENCHMARK_CONFIG.benchmarkIterations; i++) {
            measure.start();
            pangoInstance.setText(layoutId, textContent);
            measure.end();
        }
        
        const stats = measure.getStatistics();
        results[textName] = stats;
        
        if (BENCHMARK_CONFIG.verbose) {
            console.log(measure.formatStatistics());
        } else {
            console.log(`  ${textName}: ${stats.avg.toFixed(2)}ms avg`);
        }
    }
    
    pangoInstance.destroyLayout(layoutId);
    benchmarkResults.benchmarks.textSetting = results;
    return results;
}

async function benchmarkLayoutMeasurement() {
    console.log('\n📏 Benchmarking Layout Measurement...');
    
    const layoutId = pangoInstance.createLayout(contextId);
    const results = {};
    
    for (const [textName, textContent] of Object.entries(BENCHMARK_DATA)) {
        pangoInstance.setText(layoutId, textContent);
        
        const measure = new PerformanceMeasurement(`Measure - ${textName}`);
        
        // Warmup
        for (let i = 0; i < BENCHMARK_CONFIG.warmupIterations; i++) {
            pangoInstance.getPixelSize(layoutId);
        }
        
        // Benchmark
        for (let i = 0; i < BENCHMARK_CONFIG.benchmarkIterations; i++) {
            measure.start();
            const size = pangoInstance.getPixelSize(layoutId);
            measure.end();
        }
        
        const stats = measure.getStatistics();
        results[textName] = stats;
        
        if (BENCHMARK_CONFIG.verbose) {
            console.log(measure.formatStatistics());
        } else {
            console.log(`  ${textName}: ${stats.avg.toFixed(2)}ms avg`);
        }
    }
    
    pangoInstance.destroyLayout(layoutId);
    benchmarkResults.benchmarks.layoutMeasurement = results;
    return results;
}

async function benchmarkFontHandling() {
    console.log('\n🔤 Benchmarking Font Handling...');
    
    const layoutId = pangoInstance.createLayout(contextId);
    pangoInstance.setText(layoutId, BENCHMARK_DATA.mediumText);
    
    const results = {};
    
    for (const fontDesc of FONT_CONFIGS) {
        const measure = new PerformanceMeasurement(`Font - ${fontDesc}`);
        
        // Warmup
        for (let i = 0; i < BENCHMARK_CONFIG.warmupIterations; i++) {
            pangoInstance.setFontDescription(layoutId, fontDesc);
            pangoInstance.getPixelSize(layoutId);
        }
        
        // Benchmark
        for (let i = 0; i < BENCHMARK_CONFIG.benchmarkIterations; i++) {
            measure.start();
            pangoInstance.setFontDescription(layoutId, fontDesc);
            pangoInstance.getPixelSize(layoutId);
            measure.end();
        }
        
        const stats = measure.getStatistics();
        results[fontDesc.replace(/\s/g, '_')] = stats;
        
        console.log(`  ${fontDesc}: ${stats.avg.toFixed(2)}ms avg`);
    }
    
    pangoInstance.destroyLayout(layoutId);
    benchmarkResults.benchmarks.fontHandling = results;
    return results;
}

async function benchmarkLayoutConfiguration() {
    console.log('\n⚙️ Benchmarking Layout Configuration...');
    
    const layoutId = pangoInstance.createLayout(contextId);
    pangoInstance.setText(layoutId, BENCHMARK_DATA.wrapText);
    
    const results = {};
    
    for (let i = 0; i < LAYOUT_CONFIGS.length; i++) {
        const config = LAYOUT_CONFIGS[i];
        const configName = `Config_${i}`;
        
        const measure = new PerformanceMeasurement(`Layout Config - ${configName}`);
        
        // Warmup
        for (let j = 0; j < BENCHMARK_CONFIG.warmupIterations; j++) {
            pangoInstance.setWidth(layoutId, config.width);
            pangoInstance.setAlignment(layoutId, config.alignment);
            pangoInstance.setWrapMode(layoutId, config.wrap);
            pangoInstance.getPixelSize(layoutId);
        }
        
        // Benchmark
        for (let j = 0; j < BENCHMARK_CONFIG.benchmarkIterations; j++) {
            measure.start();
            pangoInstance.setWidth(layoutId, config.width);
            pangoInstance.setAlignment(layoutId, config.alignment);
            pangoInstance.setWrapMode(layoutId, config.wrap);
            const size = pangoInstance.getPixelSize(layoutId);
            const lineCount = pangoInstance.getLineCount(layoutId);
            measure.end();
        }
        
        const stats = measure.getStatistics();
        results[configName] = stats;
        
        console.log(`  ${configName}: ${stats.avg.toFixed(2)}ms avg`);
    }
    
    pangoInstance.destroyLayout(layoutId);
    benchmarkResults.benchmarks.layoutConfiguration = results;
    return results;
}

async function benchmarkComplexOperations() {
    console.log('\n🔄 Benchmarking Complex Operations...');
    
    const results = {};
    
    // Full layout workflow benchmark
    const workflowMeasure = new PerformanceMeasurement('Full Layout Workflow');
    
    // Warmup
    for (let i = 0; i < BENCHMARK_CONFIG.warmupIterations / 10; i++) {
        const layoutId = pangoInstance.createLayout(contextId);
        pangoInstance.setText(layoutId, BENCHMARK_DATA.paragraphText);
        pangoInstance.setFontDescription(layoutId, 'Arial 12');
        pangoInstance.setWidth(layoutId, 300);
        pangoInstance.setWrapMode(layoutId, 0);
        const size = pangoInstance.getPixelSize(layoutId);
        const lineCount = pangoInstance.getLineCount(layoutId);
        pangoInstance.destroyLayout(layoutId);
    }
    
    // Benchmark
    for (let i = 0; i < BENCHMARK_CONFIG.benchmarkIterations / 10; i++) {
        workflowMeasure.start();
        
        const layoutId = pangoInstance.createLayout(contextId);
        pangoInstance.setText(layoutId, BENCHMARK_DATA.paragraphText);
        pangoInstance.setFontDescription(layoutId, 'Arial 12');
        pangoInstance.setWidth(layoutId, 300);
        pangoInstance.setWrapMode(layoutId, 0);
        const size = pangoInstance.getPixelSize(layoutId);
        const lineCount = pangoInstance.getLineCount(layoutId);
        pangoInstance.destroyLayout(layoutId);
        
        workflowMeasure.end();
    }
    
    const workflowStats = workflowMeasure.getStatistics();
    results.fullWorkflow = workflowStats;
    
    console.log(workflowMeasure.formatStatistics());
    
    benchmarkResults.benchmarks.complexOperations = results;
    return results;
}

// Run all benchmarks
async function runAllBenchmarks() {
    console.log('🚀 Running comprehensive performance benchmarks...\n');
    
    await benchmarkLayoutCreation();
    await benchmarkTextSetting();
    await benchmarkLayoutMeasurement();
    await benchmarkFontHandling();
    await benchmarkLayoutConfiguration();
    await benchmarkComplexOperations();
    
    // Calculate overall performance metrics
    const allBenchmarks = Object.values(benchmarkResults.benchmarks);
    let totalOperations = 0;
    let totalTime = 0;
    
    function processStats(stats) {
        if (stats.total && stats.count) {
            totalOperations += stats.count;
            totalTime += stats.total;
        } else if (typeof stats === 'object') {
            Object.values(stats).forEach(processStats);
        }
    }
    
    allBenchmarks.forEach(processStats);
    
    benchmarkResults.summary = {
        totalOperations,
        totalTime,
        averageOperationTime: totalTime / totalOperations,
        operationsPerSecond: (totalOperations / totalTime) * 1000
    };
}

// Export results
function exportResults() {
    if (!BENCHMARK_CONFIG.exportResults) return;
    
    const resultsPath = join(PROJECT_ROOT, 'benchmark-results.json');
    writeFileSync(resultsPath, JSON.stringify(benchmarkResults, null, 2));
    console.log(`📊 Results exported to: ${resultsPath}`);
    
    // Create a summary report
    const summaryPath = join(PROJECT_ROOT, 'benchmark-summary.txt');
    let summary = 'pango.wasm Performance Benchmark Summary\n';
    summary += '=====================================\n\n';
    summary += `Date: ${benchmarkResults.timestamp}\n`;
    summary += `Version: ${benchmarkResults.version}\n`;
    summary += `Iterations: ${BENCHMARK_CONFIG.benchmarkIterations}\n\n`;
    
    if (benchmarkResults.summary) {
        summary += 'Overall Performance:\n';
        summary += `  Total operations: ${benchmarkResults.summary.totalOperations}\n`;
        summary += `  Total time: ${benchmarkResults.summary.totalTime.toFixed(2)}ms\n`;
        summary += `  Average per operation: ${benchmarkResults.summary.averageOperationTime.toFixed(2)}ms\n`;
        summary += `  Operations per second: ${benchmarkResults.summary.operationsPerSecond.toFixed(0)}\n\n`;
    }
    
    summary += 'Key Performance Metrics:\n';
    
    // Extract key metrics
    if (benchmarkResults.benchmarks.layoutCreation) {
        const stats = benchmarkResults.benchmarks.layoutCreation;
        summary += `  Layout creation: ${stats.avg.toFixed(2)}ms avg\n`;
    }
    
    if (benchmarkResults.benchmarks.textSetting && benchmarkResults.benchmarks.textSetting.mediumText) {
        const stats = benchmarkResults.benchmarks.textSetting.mediumText;
        summary += `  Text setting (medium): ${stats.avg.toFixed(2)}ms avg\n`;
    }
    
    if (benchmarkResults.benchmarks.layoutMeasurement && benchmarkResults.benchmarks.layoutMeasurement.mediumText) {
        const stats = benchmarkResults.benchmarks.layoutMeasurement.mediumText;
        summary += `  Layout measurement: ${stats.avg.toFixed(2)}ms avg\n`;
    }
    
    writeFileSync(summaryPath, summary);
    console.log(`📋 Summary exported to: ${summaryPath}`);
}

// Run the benchmarks
try {
    await runAllBenchmarks();
    
    console.log('\n📊 Benchmark Summary');
    console.log('========================================');
    
    if (benchmarkResults.summary) {
        console.log(`Total operations: ${benchmarkResults.summary.totalOperations}`);
        console.log(`Total time: ${benchmarkResults.summary.totalTime.toFixed(2)}ms`);
        console.log(`Average per operation: ${benchmarkResults.summary.averageOperationTime.toFixed(2)}ms`);
        console.log(`Operations per second: ${benchmarkResults.summary.operationsPerSecond.toFixed(0)}`);
    }
    
    exportResults();
    
    console.log('\n✅ All benchmarks completed successfully!');
    console.log('\n🎯 Performance Assessment:');
    
    const avgOpTime = benchmarkResults.summary?.averageOperationTime || 0;
    if (avgOpTime < 1) {
        console.log('   🚀 Excellent performance (< 1ms avg)');
    } else if (avgOpTime < 5) {
        console.log('   ✅ Good performance (< 5ms avg)');
    } else if (avgOpTime < 10) {
        console.log('   ⚠️  Acceptable performance (< 10ms avg)');
    } else {
        console.log('   ❌ Performance needs improvement (>= 10ms avg)');
    }
    
} catch (error) {
    console.error('❌ Benchmark failed:', error.message);
    if (BENCHMARK_CONFIG.verbose) {
        console.error(error.stack);
    }
    process.exit(1);
} finally {
    // Cleanup
    if (pangoInstance) {
        pangoInstance.cleanup();
    }
}