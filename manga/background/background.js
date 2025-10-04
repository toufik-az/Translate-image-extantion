/**
 * Background Script for Manga Translator Extension
 * Handles extension lifecycle, message passing, and background tasks
 */

// Extension state
const extensionState = {
  activeTabs: new Set(),
  version: '1.0.0'
};

/**
 * Initialize background script
 */
function init() {
  console.log('Manga Translator: Background script initialized');
  
  // Set up listeners
  browser.runtime.onInstalled.addListener(handleInstall);
  browser.runtime.onMessage.addListener(handleMessage);
  browser.tabs.onRemoved.addListener(handleTabRemoved);
  
  // Set default settings on first install
  setDefaultSettings();
}

/**
 * Handle extension installation or update
 */
function handleInstall(details) {
  if (details.reason === 'install') {
    console.log('Extension installed for the first time');
    
    // Open welcome/help page
    browser.tabs.create({
      url: browser.runtime.getURL('options/options.html')
    });
    
  } else if (details.reason === 'update') {
    console.log('Extension updated to version', browser.runtime.getManifest().version);
    
    // Could show changelog or migration notices
  }
}

/**
 * Handle messages from content scripts or popup
 */
function handleMessage(message, sender, sendResponse) {
  switch (message.action) {
    case 'updatePopup':
      // Forward updates from content script to popup
      forwardToPopup(message);
      break;
      
    case 'getActiveTabs':
      return Promise.resolve({ tabs: Array.from(extensionState.activeTabs) });
      
    case 'trackActiveTab':
      if (sender.tab) {
        extensionState.activeTabs.add(sender.tab.id);
      }
      break;
      
    case 'untrackActiveTab':
      if (sender.tab) {
        extensionState.activeTabs.delete(sender.tab.id);
      }
      break;

    default:
      console.log('Unknown message action:', message.action);
  }
  
  return true; // Keep message channel open for async responses
}

/**
 * Handle tab removal
 */
function handleTabRemoved(tabId) {
  // Clean up state for closed tab
  extensionState.activeTabs.delete(tabId);
}

/**
 * Forward message to popup
 */
async function forwardToPopup(message) {
  try {
    // Get all extension views (popup, options, etc.)
    const views = browser.extension.getViews({ type: 'popup' });
    
    // Send message to each popup view
    views.forEach(view => {
      if (view.handleContentScriptUpdate) {
        view.handleContentScriptUpdate(message);
      }
    });
  } catch (error) {
    // Popup might be closed, ignore
  }
}

/**
 * Set default settings on first install
 */
async function setDefaultSettings() {
  try {
    const existing = await browser.storage.sync.get();
    
    // Only set defaults if no settings exist
    if (Object.keys(existing).length === 0) {
      const defaults = {
        sourceLang: 'auto',
        targetLang: 'en',
        fontSize: 16,
        overlayBgColor: '#000000',
        overlayOpacity: 0.7,
        textColor: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        ocrEngine: 'tesseract',
        verticalText: true,
        minImageSize: 10000,
        translationAPI: 'libretranslate',
        customAPIUrl: '',
        apiTimeout: 30,
        maxConcurrent: 3,
        enableCache: true,
        cacheExpiry: 7,
        debugMode: false,
        showBoundingBoxes: false
      };
      
      await browser.storage.sync.set(defaults);
      console.log('Default settings initialized');
    }
  } catch (error) {
    console.error('Error setting defaults:', error);
  }
}

/**
 * Clean up old cache entries based on expiry
 */
async function cleanupCache() {
  try {
    const settings = await browser.storage.sync.get('cacheExpiry');
    const expiryDays = settings.cacheExpiry || 7;
    const expiryMs = expiryDays * 24 * 60 * 60 * 1000;
    
    const result = await browser.storage.local.get('translationCache');
    if (!result.translationCache) return;
    
    const cache = result.translationCache;
    const now = Date.now();
    let cleaned = 0;
    
    // Filter out expired entries
    Object.keys(cache).forEach(key => {
      const entry = cache[key];
      if (entry.timestamp && (now - entry.timestamp) > expiryMs) {
        delete cache[key];
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      await browser.storage.local.set({ translationCache: cache });
      console.log(`Cleaned up ${cleaned} expired cache entries`);
    }
  } catch (error) {
    console.error('Error cleaning cache:', error);
  }
}

// Run cache cleanup periodically (once per day)
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
setInterval(cleanupCache, CLEANUP_INTERVAL);

// Also run cleanup on startup
cleanupCache();

// Initialize
init();
