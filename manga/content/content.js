/**
 * Content Script for Manga Translator Extension
 * Main logic for detecting images, OCR, translation, and overlay rendering
 */

(function() {
  'use strict';

  // State management
  let state = {
    isActive: false,
    isProcessing: false,
    showingOriginal: false,
    images: [],
    translations: new Map(),
    settings: {},
    stats: {
      total: 0,
      processed: 0,
      failed: 0
    }
  };

  // Tesseract worker instance
  let tesseractWorker = null;
  let translationCache = new Map();

  /**
   * Initialize the extension on page load
   */
  function init() {
    console.log('Manga Translator: Content script loaded');
    loadCache();
    
    // Listen for messages from popup/background
    browser.runtime.onMessage.addListener(handleMessage);
  }

  /**
   * Handle messages from popup or background script
   */
  async function handleMessage(message, sender, sendResponse) {
    log('Received message:', message);

    switch (message.action) {
      case 'getState':
        return Promise.resolve({
          isActive: state.isActive,
          showingOriginal: state.showingOriginal,
          hasTranslations: state.translations.size > 0,
          stats: state.stats
        });

      case 'startTranslation':
        state.settings = message.settings || {};
        await startTranslation();
        return Promise.resolve({ success: true });

      case 'stopTranslation':
        stopTranslation();
        return Promise.resolve({ success: true });

      case 'toggleView':
        toggleView();
        return Promise.resolve({ success: true });

      case 'retryFailed':
        await retryFailedImages();
        return Promise.resolve({ success: true });

      case 'updateSettings':
        state.settings = { ...state.settings, ...message };
        return Promise.resolve({ success: true });

      default:
        return Promise.resolve({ success: false, error: 'Unknown action' });
    }
  }

  /**
   * Start the translation process
   */
  async function startTranslation() {
    if (state.isProcessing) {
      log('Already processing');
      return;
    }

    state.isActive = true;
    state.isProcessing = true;
    
    updatePopup({ status: 'processing', progress: 0 });

    try {
      // Initialize Tesseract worker
      await initTesseract();

      // Find all images on the page
      const images = findImages();
      state.images = images;
      state.stats.total = images.length;
      state.stats.processed = 0;
      state.stats.failed = 0;

      updatePopup({ 
        stats: state.stats,
        message: `Found ${images.length} images`
      });

      if (images.length === 0) {
        throw new Error('No images found on this page');
      }

      // Process images in batches
      const maxConcurrent = state.settings.maxConcurrent || 3;
      await processBatch(images, maxConcurrent);

      state.isProcessing = false;
      updatePopup({ 
        status: 'complete', 
        progress: 100,
        stats: state.stats
      });

    } catch (error) {
      console.error('Translation error:', error);
      state.isProcessing = false;
      updatePopup({ 
        status: 'error',
        message: error.message 
      });
      alert(`Translation failed: ${error.message}`);
    }
  }

  /**
   * Stop translation and clean up
   */
  function stopTranslation() {
    state.isActive = false;
    state.isProcessing = false;
    
    // Remove all overlays
    removeAllOverlays();
    
    // Cleanup Tesseract
    if (tesseractWorker) {
      tesseractWorker.terminate();
      tesseractWorker = null;
    }
  }

  /**
   * Initialize Tesseract.js OCR engine
   */
  async function initTesseract() {
    if (tesseractWorker) {
      return; // Already initialized
    }

    log('Initializing Tesseract...');
    
    // Dynamically import Tesseract from CDN
    if (typeof Tesseract === 'undefined') {
      await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js');
    }

    const lang = getOCRLanguage(state.settings.sourceLang);
    tesseractWorker = await Tesseract.createWorker(lang, 1, {
      logger: m => log('Tesseract:', m)
    });

    log('Tesseract initialized');
  }

  /**
   * Get OCR language code from setting
   */
  function getOCRLanguage(lang) {
    const langMap = {
      'ja': 'jpn',
      'ko': 'kor',
      'zh': 'chi_sim',
      'en': 'eng',
      'auto': 'eng+jpn+kor+chi_sim' // Multi-language support
    };
    return langMap[lang] || 'eng';
  }

  /**
   * Find all suitable images on the page
   */
  function findImages() {
    const minSize = state.settings.minImageSize || 10000;
    const images = [];

    // Get all img elements
    const imgElements = document.querySelectorAll('img');
    
    imgElements.forEach((img, index) => {
      // Check if image is visible and large enough
      if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
        const area = img.naturalWidth * img.naturalHeight;
        
        if (area >= minSize) {
          // Check if image is visible
          const rect = img.getBoundingClientRect();
          const style = window.getComputedStyle(img);
          
          if (style.display !== 'none' && style.visibility !== 'hidden') {
            images.push({
              element: img,
              index: index,
              width: img.naturalWidth,
              height: img.naturalHeight,
              src: img.src
            });
          }
        }
      }
    });

    log(`Found ${images.length} suitable images`);
    return images;
  }

  /**
   * Process images in batches
   */
  async function processBatch(images, maxConcurrent) {
    const batches = [];
    for (let i = 0; i < images.length; i += maxConcurrent) {
      batches.push(images.slice(i, i + maxConcurrent));
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const promises = batch.map(img => processImage(img));
      
      await Promise.allSettled(promises);
      
      const progress = Math.round(((i + 1) / batches.length) * 100);
      updatePopup({ 
        progress,
        stats: state.stats,
        message: `Processing batch ${i + 1}/${batches.length}`
      });
    }
  }

  /**
   * Process a single image
   */
  async function processImage(imageData) {
    try {
      log(`Processing image ${imageData.index}...`);

      // Check cache first
      const cacheKey = getCacheKey(imageData.src);
      if (state.settings.enableCache && translationCache.has(cacheKey)) {
        log('Using cached translation');
        const cached = translationCache.get(cacheKey);
        renderOverlay(imageData, cached);
        state.stats.processed++;
        return;
      }

      // Perform OCR
      const ocrResult = await performOCR(imageData);
      
      if (!ocrResult || !ocrResult.text || ocrResult.text.trim().length === 0) {
        log(`No text detected in image ${imageData.index}`);
        state.stats.processed++;
        return;
      }

      log(`OCR detected text: "${ocrResult.text.substring(0, 50)}..."`);

      // Translate the text
      const translatedText = await translateText(ocrResult.text);
      
      if (!translatedText) {
        throw new Error('Translation failed');
      }

      const result = {
        original: ocrResult.text,
        translated: translatedText,
        boxes: ocrResult.boxes
      };

      // Cache the result
      if (state.settings.enableCache) {
        translationCache.set(cacheKey, result);
        saveCache();
      }

      // Store translation
      state.translations.set(imageData.element, result);

      // Render overlay
      renderOverlay(imageData, result);

      state.stats.processed++;
      log(`Image ${imageData.index} processed successfully`);

    } catch (error) {
      console.error(`Error processing image ${imageData.index}:`, error);
      state.stats.failed++;
    }
  }

  /**
   * Perform OCR on image
   */
  async function performOCR(imageData) {
    try {
      const { data } = await tesseractWorker.recognize(imageData.element);
      
      return {
        text: data.text,
        boxes: data.lines.map(line => ({
          text: line.text,
          bbox: line.bbox,
          confidence: line.confidence
        }))
      };
    } catch (error) {
      console.error('OCR error:', error);
      throw error;
    }
  }

  /**
   * Translate text using LibreTranslate API
   */
  async function translateText(text) {
    const apiUrl = getTranslationAPIUrl();
    const sourceLang = state.settings.sourceLang === 'auto' ? 'auto' : state.settings.sourceLang;
    const targetLang = state.settings.targetLang || 'en';

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), (state.settings.apiTimeout || 30) * 1000);

      const response = await fetch(`${apiUrl}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: 'text'
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status}`);
      }

      const data = await response.json();
      return data.translatedText;

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Translation timeout');
      }
      console.error('Translation error:', error);
      throw error;
    }
  }

  /**
   * Get translation API URL
   */
  function getTranslationAPIUrl() {
    if (state.settings.translationAPI === 'libretranslate-custom' && state.settings.customAPIUrl) {
      return state.settings.customAPIUrl.replace(/\/$/, '');
    }
    // Default public LibreTranslate instance
    return 'https://libretranslate.com';
  }

  /**
   * Render translation overlay on image
   */
  function renderOverlay(imageData, translationResult) {
    const img = imageData.element;
    
    // Create overlay container
    let overlay = img.parentElement.querySelector('.manga-translator-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'manga-translator-overlay';
      overlay.dataset.imageIndex = imageData.index;
      
      // Position relative to image
      const rect = img.getBoundingClientRect();
      const imgStyle = window.getComputedStyle(img);
      
      // Make parent position relative if needed
      const parent = img.parentElement;
      if (window.getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
      
      parent.insertBefore(overlay, img.nextSibling);
    }

    // Clear previous content
    overlay.innerHTML = '';

    // Create text box
    const textBox = document.createElement('div');
    textBox.className = 'manga-translator-text';
    
    // Apply styling
    const bgColor = hexToRgba(
      state.settings.overlayBgColor || '#000000',
      state.settings.overlayOpacity || 0.7
    );
    
    textBox.style.cssText = `
      background: ${bgColor};
      color: ${state.settings.textColor || '#ffffff'};
      font-size: ${state.settings.fontSize || 16}px;
      font-family: ${state.settings.fontFamily || 'Arial, sans-serif'};
      padding: 10px;
      border-radius: 6px;
      max-width: 90%;
      word-wrap: break-word;
      line-height: 1.4;
    `;
    
    textBox.textContent = translationResult.translated;
    overlay.appendChild(textBox);

    // Show bounding boxes if enabled
    if (state.settings.showBoundingBoxes && translationResult.boxes) {
      translationResult.boxes.forEach(box => {
        const bbox = document.createElement('div');
        bbox.className = 'manga-translator-bbox';
        bbox.style.cssText = `
          position: absolute;
          border: 2px solid #ff0000;
          pointer-events: none;
          left: ${box.bbox.x0}px;
          top: ${box.bbox.y0}px;
          width: ${box.bbox.x1 - box.bbox.x0}px;
          height: ${box.bbox.y1 - box.bbox.y0}px;
        `;
        overlay.appendChild(bbox);
      });
    }

    overlay.style.display = state.showingOriginal ? 'none' : 'block';
  }

  /**
   * Toggle between original and translated view
   */
  function toggleView() {
    state.showingOriginal = !state.showingOriginal;
    
    const overlays = document.querySelectorAll('.manga-translator-overlay');
    overlays.forEach(overlay => {
      overlay.style.display = state.showingOriginal ? 'none' : 'block';
    });

    updatePopup({ showingOriginal: state.showingOriginal });
  }

  /**
   * Remove all translation overlays
   */
  function removeAllOverlays() {
    const overlays = document.querySelectorAll('.manga-translator-overlay');
    overlays.forEach(overlay => overlay.remove());
    state.translations.clear();
  }

  /**
   * Retry processing failed images
   */
  async function retryFailedImages() {
    // Implementation for retrying failed images
    log('Retrying failed images...');
    // Could track which images failed and retry those specifically
  }

  /**
   * Helper function to convert hex color to rgba
   */
  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.substr(1, 2), 16);
    const g = parseInt(hex.substr(3, 2), 16);
    const b = parseInt(hex.substr(5, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Get cache key for an image
   */
  function getCacheKey(src) {
    return btoa(src).substring(0, 50); // Simple hash
  }

  /**
   * Load cache from storage
   */
  async function loadCache() {
    try {
      const result = await browser.storage.local.get('translationCache');
      if (result.translationCache) {
        translationCache = new Map(Object.entries(result.translationCache));
        log(`Loaded ${translationCache.size} cached translations`);
      }
    } catch (error) {
      console.error('Error loading cache:', error);
    }
  }

  /**
   * Save cache to storage
   */
  async function saveCache() {
    try {
      const cacheObj = Object.fromEntries(translationCache);
      await browser.storage.local.set({ translationCache: cacheObj });
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }

  /**
   * Send update to popup
   */
  function updatePopup(data) {
    browser.runtime.sendMessage({
      action: 'updatePopup',
      ...data
    }).catch(err => {
      // Popup might be closed, ignore error
    });
  }

  /**
   * Load external script dynamically
   */
  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Debug logging
   */
  function log(...args) {
    if (state.settings.debugMode) {
      console.log('[Manga Translator]', ...args);
    }
  }

  // Initialize when script loads
  init();

})();
