/**
 * pango.wasm Native Filesystem Patterns
 * Advanced font management with persistent caching and CDN integration
 * Copyright 2025 Superstruct Ltd, New Zealand
 * Licensed under LGPL 2.1+
 */

export class PangoWASMNativeFS {
    constructor(pangoModule) {
        this.module = pangoModule;
        this.initialized = false;
        this.persistentStorageAvailable = false;
        this.fontCache = new Map();
        this.loadingQueue = new Map();
        this.maxCacheSize = 50 * 1024 * 1024; // 50MB cache limit
        this.cacheStats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            totalLoadTime: 0
        };
        
        // Font directory structure
        this.directories = {
            fonts: '/fonts',              // Preloaded system fonts
            userFonts: '/user-fonts',     // User-uploaded fonts
            cdnFonts: '/cdn-fonts',       // CDN-loaded fonts
            fontCache: '/font-cache',     // Persistent cache (IDBFS)
            fontPackages: '/font-packages', // ZIP-based font collections
            tempFonts: '/temp-fonts'      // Temporary font storage
        };
    }

    async initialize() {
        if (this.initialized) return;

        console.log('🗂️ Initializing WASM-native filesystem for fonts...');

        try {
            // Initialize IDBFS for persistent font caching
            await this.initializePersistentStorage();
            
            // Create virtual directory structure
            this.createDirectoryStructure();
            
            // Load default font packages
            await this.loadDefaultFonts();
            
            this.initialized = true;
            console.log('✅ WASM-native filesystem initialized');
            
            this.logCacheStats();
            
        } catch (error) {
            console.warn('⚠️ WASM-native filesystem initialization failed:', error.message);
            console.log('📁 Falling back to memory-only filesystem');
            this.createDirectoryStructure(); // Create directories without persistence
            this.initialized = true;
        }
    }

    async initializePersistentStorage() {
        return new Promise((resolve, reject) => {
            try {
                // Mount IDBFS for persistent font cache
                this.module.FS.mount(this.module.FS.filesystems.IDBFS, {}, this.directories.fontCache);
                
                // Sync from IndexedDB to memory
                this.module.FS.syncfs(true, (err) => {
                    if (err) {
                        console.warn('IDBFS sync failed:', err);
                        reject(new Error('IDBFS not available'));
                    } else {
                        this.persistentStorageAvailable = true;
                        console.log('✅ Persistent font cache available (IDBFS)');
                        resolve();
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    createDirectoryStructure() {
        // Create virtual directory structure
        Object.values(this.directories).forEach(dir => {
            if (!this.module.FS.analyzePath(dir).exists) {
                this.module.FS.mkdir(dir);
                console.log(`📁 Created directory: ${dir}`);
            }
        });
    }

    async loadDefaultFonts() {
        console.log('🔤 Loading default font packages...');
        
        // Default fonts to preload (if available)
        const defaultFonts = [
            'DejaVuSans.ttf',
            'DejaVuSans-Bold.ttf',
            'DejaVuSerif.ttf',
            'DejaVuSansMono.ttf'
        ];

        for (const fontName of defaultFonts) {
            try {
                await this.loadFontFromURL(`/assets/fonts/${fontName}`, fontName);
            } catch (error) {
                console.log(`ℹ️ Default font ${fontName} not available (${error.message})`);
            }
        }
    }

    // Font loading with caching
    async loadFontFromURL(url, fontName, options = {}) {
        const cacheKey = this.generateCacheKey(url, options);
        const cachedPath = `${this.directories.fontCache}/${cacheKey}.ttf`;

        // Check cache first
        if (this.fontCache.has(cacheKey)) {
            this.cacheStats.hits++;
            console.log(`🎯 Font cache hit: ${fontName}`);
            return this.fontCache.get(cacheKey);
        }

        // Check persistent storage
        if (this.persistentStorageAvailable && this.module.FS.analyzePath(cachedPath).exists) {
            try {
                const fontData = this.module.FS.readFile(cachedPath);
                const fontInfo = this.createFontInfo(fontName, url, fontData, true);
                this.fontCache.set(cacheKey, fontInfo);
                this.cacheStats.hits++;
                console.log(`💾 Font loaded from persistent cache: ${fontName}`);
                return fontInfo;
            } catch (error) {
                console.warn(`Failed to load cached font ${fontName}:`, error.message);
            }
        }

        // Download from URL
        this.cacheStats.misses++;
        console.log(`🌐 Downloading font: ${fontName} from ${url}`);
        
        const startTime = performance.now();
        
        try {
            const fontData = await this.downloadFont(url);
            const loadTime = performance.now() - startTime;
            this.cacheStats.totalLoadTime += loadTime;

            // Store in memory cache
            const fontInfo = this.createFontInfo(fontName, url, fontData, false);
            this.fontCache.set(cacheKey, fontInfo);

            // Store in persistent cache
            if (this.persistentStorageAvailable) {
                try {
                    this.module.FS.writeFile(cachedPath, fontData);
                    await this.syncPersistentStorage();
                    fontInfo.cached = true;
                    console.log(`💾 Font cached persistently: ${fontName}`);
                } catch (error) {
                    console.warn(`Failed to cache font ${fontName}:`, error.message);
                }
            }

            // Manage cache size
            this.manageCacheSize();

            console.log(`✅ Font loaded: ${fontName} (${loadTime.toFixed(0)}ms, ${(fontData.length / 1024).toFixed(1)}KB)`);
            return fontInfo;

        } catch (error) {
            console.error(`❌ Failed to load font ${fontName}:`, error.message);
            throw error;
        }
    }

    async downloadFont(url) {
        return new Promise((resolve, reject) => {
            // Check if we're already downloading this font
            if (this.loadingQueue.has(url)) {
                // Wait for existing download
                this.loadingQueue.get(url).then(resolve).catch(reject);
                return;
            }

            // Start new download
            const downloadPromise = new Promise((downloadResolve, downloadReject) => {
                if (typeof fetch !== 'undefined') {
                    // Browser environment - use fetch
                    fetch(url)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                            }
                            return response.arrayBuffer();
                        })
                        .then(buffer => {
                            const fontData = new Uint8Array(buffer);
                            downloadResolve(fontData);
                        })
                        .catch(downloadReject);
                } else {
                    // Use Emscripten's async file loading
                    this.module.FS.createPreloadedFile(
                        this.directories.tempFonts,
                        'temp_font.ttf',
                        url,
                        true,
                        false,
                        () => {
                            try {
                                const fontData = this.module.FS.readFile(`${this.directories.tempFonts}/temp_font.ttf`);
                                this.module.FS.unlink(`${this.directories.tempFonts}/temp_font.ttf`);
                                downloadResolve(fontData);
                            } catch (error) {
                                downloadReject(error);
                            }
                        },
                        (error) => {
                            downloadReject(new Error(`Font download failed: ${error}`));
                        }
                    );
                }
            });

            this.loadingQueue.set(url, downloadPromise);
            
            downloadPromise
                .then((fontData) => {
                    this.loadingQueue.delete(url);
                    resolve(fontData);
                })
                .catch((error) => {
                    this.loadingQueue.delete(url);
                    reject(error);
                });
        });
    }

    // Google Fonts integration
    async loadGoogleFont(family, options = {}) {
        const {
            weights = ['400'],
            styles = ['normal'],
            display = 'swap',
            subset = 'latin'
        } = options;

        console.log(`🌐 Loading Google Font: ${family}`);

        // Generate Google Fonts CSS URL
        const familyQuery = family.replace(/\s+/g, '+');
        const weightStyles = weights.flatMap(weight => 
            styles.map(style => style === 'normal' ? weight : `${weight}${style}`)
        ).join(',');
        
        const cssUrl = `https://fonts.googleapis.com/css2?family=${familyQuery}:wght@${weightStyles}&display=${display}&subset=${subset}`;

        try {
            // Download CSS to get font URLs
            const cssResponse = await fetch(cssUrl);
            const cssText = await cssResponse.text();

            // Parse font URLs from CSS
            const fontUrls = this.parseGoogleFontCSS(cssText);
            
            const loadedFonts = [];
            for (const { url, fontFamily, fontWeight, fontStyle } of fontUrls) {
                const fontName = `${fontFamily}-${fontWeight}-${fontStyle}`;
                try {
                    const fontInfo = await this.loadFontFromURL(url, fontName, {
                        family: fontFamily,
                        weight: fontWeight,
                        style: fontStyle
                    });
                    loadedFonts.push(fontInfo);
                } catch (error) {
                    console.warn(`Failed to load Google Font variant ${fontName}:`, error.message);
                }
            }

            console.log(`✅ Loaded ${loadedFonts.length} Google Font variants for ${family}`);
            return loadedFonts;

        } catch (error) {
            console.error(`❌ Failed to load Google Font ${family}:`, error.message);
            throw error;
        }
    }

    parseGoogleFontCSS(cssText) {
        const fontUrls = [];
        
        // Simple regex to extract font URLs and properties
        // In production, you'd want a more robust CSS parser
        const fontFaceRegex = /@font-face\s*\{([^}]+)\}/g;
        let match;

        while ((match = fontFaceRegex.exec(cssText)) !== null) {
            const rules = match[1];
            
            const familyMatch = rules.match(/font-family:\s*['"]([^'"]+)['"]/);
            const weightMatch = rules.match(/font-weight:\s*(\d+)/);
            const styleMatch = rules.match(/font-style:\s*(\w+)/);
            const urlMatch = rules.match(/src:\s*url\(([^)]+)\)/);

            if (familyMatch && weightMatch && styleMatch && urlMatch) {
                fontUrls.push({
                    url: urlMatch[1].replace(/['"]/g, ''),
                    fontFamily: familyMatch[1],
                    fontWeight: weightMatch[1],
                    fontStyle: styleMatch[1]
                });
            }
        }

        return fontUrls;
    }

    // Font package loading (ZIP files with multiple fonts)
    async loadFontPackage(packageUrl, packageName) {
        console.log(`📦 Loading font package: ${packageName}`);
        
        const cacheKey = this.generateCacheKey(packageUrl, { type: 'package' });
        const packagePath = `${this.directories.fontPackages}/${packageName}`;

        try {
            // Download package
            const packageData = await this.downloadFont(packageUrl);
            
            // Extract fonts from ZIP (simplified implementation)
            // In production, you'd use a ZIP library like JSZip
            const extractedFonts = await this.extractFontPackage(packageData, packagePath);
            
            console.log(`✅ Extracted ${extractedFonts.length} fonts from package ${packageName}`);
            return extractedFonts;
            
        } catch (error) {
            console.error(`❌ Failed to load font package ${packageName}:`, error.message);
            throw error;
        }
    }

    async extractFontPackage(packageData, extractPath) {
        // This is a placeholder for ZIP extraction
        // In a real implementation, you would:
        // 1. Use a WASM ZIP library or JavaScript ZIP library
        // 2. Extract each font file
        // 3. Store them in the virtual filesystem
        // 4. Return font information
        
        console.log('📂 ZIP extraction not implemented in this demo');
        return [];
    }

    // Font registration and management
    registerFont(fontData, fontName, fontInfo = {}) {
        const fontPath = `${this.directories.userFonts}/${fontName}`;
        
        try {
            this.module.FS.writeFile(fontPath, fontData);
            
            const font = this.createFontInfo(fontName, fontPath, fontData, false, fontInfo);
            const cacheKey = this.generateCacheKey(fontPath, fontInfo);
            this.fontCache.set(cacheKey, font);
            
            console.log(`✅ Registered font: ${fontName} (${(fontData.length / 1024).toFixed(1)}KB)`);
            return font;
            
        } catch (error) {
            console.error(`❌ Failed to register font ${fontName}:`, error.message);
            throw error;
        }
    }

    // Utility functions
    createFontInfo(name, path, data, cached = false, metadata = {}) {
        return {
            name,
            path,
            size: data.length,
            cached,
            loadedAt: Date.now(),
            metadata: {
                family: metadata.family || name,
                weight: metadata.weight || 'normal',
                style: metadata.style || 'normal',
                ...metadata
            }
        };
    }

    generateCacheKey(url, options = {}) {
        const optionStr = Object.keys(options).sort().map(k => `${k}=${options[k]}`).join('&');
        const combined = url + (optionStr ? '?' + optionStr : '');
        
        // Simple hash function (in production, use a proper hash)
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    manageCacheSize() {
        const currentSize = Array.from(this.fontCache.values())
            .reduce((total, font) => total + font.size, 0);

        if (currentSize > this.maxCacheSize) {
            console.log(`🧹 Cache size exceeded (${(currentSize / 1024 / 1024).toFixed(1)}MB), evicting old entries...`);
            
            // Sort by access time (LRU eviction)
            const sortedFonts = Array.from(this.fontCache.entries())
                .sort(([,a], [,b]) => a.loadedAt - b.loadedAt);

            let freed = 0;
            for (const [key, font] of sortedFonts) {
                if (currentSize - freed <= this.maxCacheSize * 0.8) break;
                
                this.fontCache.delete(key);
                freed += font.size;
                this.cacheStats.evictions++;
                console.log(`🗑️ Evicted font: ${font.name}`);
            }
            
            console.log(`✅ Freed ${(freed / 1024 / 1024).toFixed(1)}MB of cache space`);
        }
    }

    async syncPersistentStorage() {
        if (!this.persistentStorageAvailable) return;
        
        return new Promise((resolve) => {
            this.module.FS.syncfs(false, (err) => {
                if (err) {
                    console.warn('Failed to sync persistent storage:', err);
                } else {
                    console.log('💾 Synced to persistent storage');
                }
                resolve();
            });
        });
    }

    // Statistics and monitoring
    getCacheStatistics() {
        const totalSize = Array.from(this.fontCache.values())
            .reduce((total, font) => total + font.size, 0);
        
        const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0
            ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)) * 100
            : 0;

        return {
            fontsLoaded: this.fontCache.size,
            totalSize: totalSize,
            hitRate: hitRate,
            averageLoadTime: this.cacheStats.misses > 0 
                ? this.cacheStats.totalLoadTime / this.cacheStats.misses
                : 0,
            ...this.cacheStats
        };
    }

    logCacheStats() {
        const stats = this.getCacheStatistics();
        console.log('📊 Font Cache Statistics:');
        console.log(`   Fonts loaded: ${stats.fontsLoaded}`);
        console.log(`   Cache size: ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`);
        console.log(`   Hit rate: ${stats.hitRate.toFixed(1)}%`);
        console.log(`   Avg load time: ${stats.averageLoadTime.toFixed(0)}ms`);
        console.log(`   Persistent storage: ${this.persistentStorageAvailable ? '✅' : '❌'}`);
    }

    // Cleanup
    async cleanup() {
        if (this.persistentStorageAvailable) {
            await this.syncPersistentStorage();
        }
        
        this.fontCache.clear();
        this.loadingQueue.clear();
        
        console.log('🧹 Font filesystem cleanup completed');
    }
}

export default PangoWASMNativeFS;