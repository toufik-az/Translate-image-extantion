/**
 * Options/Settings Page Script
 * Handles saving and loading of extension settings
 */

// Default settings
const DEFAULT_SETTINGS = {
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

// DOM Elements
const elements = {
  sourceLang: document.getElementById('sourceLang'),
  targetLang: document.getElementById('targetLang'),
  fontSize: document.getElementById('fontSize'),
  fontSizeValue: document.getElementById('fontSizeValue'),
  overlayBgColor: document.getElementById('overlayBgColor'),
  colorPreview: document.getElementById('colorPreview'),
  overlayOpacity: document.getElementById('overlayOpacity'),
  opacityValue: document.getElementById('opacityValue'),
  textColor: document.getElementById('textColor'),
  fontFamily: document.getElementById('fontFamily'),
  ocrEngine: document.getElementById('ocrEngine'),
  verticalText: document.getElementById('verticalText'),
  minImageSize: document.getElementById('minImageSize'),
  translationAPI: document.getElementById('translationAPI'),
  customAPIUrl: document.getElementById('customAPIUrl'),
  customAPIUrlRow: document.getElementById('customAPIUrlRow'),
  apiTimeout: document.getElementById('apiTimeout'),
  maxConcurrent: document.getElementById('maxConcurrent'),
  enableCache: document.getElementById('enableCache'),
  cacheExpiry: document.getElementById('cacheExpiry'),
  debugMode: document.getElementById('debugMode'),
  showBoundingBoxes: document.getElementById('showBoundingBoxes'),
  saveBtn: document.getElementById('saveBtn'),
  resetBtn: document.getElementById('resetBtn'),
  clearCacheBtn: document.getElementById('clearCacheBtn'),
  toast: document.getElementById('toast')
};

/**
 * Initialize the options page
 */
async function init() {
  await loadSettings();
  setupEventListeners();
  updatePreview();
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    const settings = await browser.storage.sync.get(DEFAULT_SETTINGS);
    
    // Update form values
    elements.sourceLang.value = settings.sourceLang;
    elements.targetLang.value = settings.targetLang;
    elements.fontSize.value = settings.fontSize;
    elements.fontSizeValue.textContent = settings.fontSize + 'px';
    elements.overlayBgColor.value = settings.overlayBgColor;
    elements.overlayOpacity.value = settings.overlayOpacity;
    elements.opacityValue.textContent = settings.overlayOpacity;
    elements.textColor.value = settings.textColor;
    elements.fontFamily.value = settings.fontFamily;
    elements.ocrEngine.value = settings.ocrEngine;
    elements.verticalText.checked = settings.verticalText;
    elements.minImageSize.value = settings.minImageSize;
    elements.translationAPI.value = settings.translationAPI;
    elements.customAPIUrl.value = settings.customAPIUrl;
    elements.apiTimeout.value = settings.apiTimeout;
    elements.maxConcurrent.value = settings.maxConcurrent;
    elements.enableCache.checked = settings.enableCache;
    elements.cacheExpiry.value = settings.cacheExpiry;
    elements.debugMode.checked = settings.debugMode;
    elements.showBoundingBoxes.checked = settings.showBoundingBoxes;

    // Show/hide custom API URL field
    toggleCustomAPIUrl();
    
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  try {
    const settings = {
      sourceLang: elements.sourceLang.value,
      targetLang: elements.targetLang.value,
      fontSize: parseInt(elements.fontSize.value),
      overlayBgColor: elements.overlayBgColor.value,
      overlayOpacity: parseFloat(elements.overlayOpacity.value),
      textColor: elements.textColor.value,
      fontFamily: elements.fontFamily.value,
      ocrEngine: elements.ocrEngine.value,
      verticalText: elements.verticalText.checked,
      minImageSize: parseInt(elements.minImageSize.value),
      translationAPI: elements.translationAPI.value,
      customAPIUrl: elements.customAPIUrl.value,
      apiTimeout: parseInt(elements.apiTimeout.value),
      maxConcurrent: parseInt(elements.maxConcurrent.value),
      enableCache: elements.enableCache.checked,
      cacheExpiry: parseInt(elements.cacheExpiry.value),
      debugMode: elements.debugMode.checked,
      showBoundingBoxes: elements.showBoundingBoxes.checked
    };

    await browser.storage.sync.set(settings);
    showToast('Settings saved successfully!', 'success');
    
  } catch (error) {
    console.error('Error saving settings:', error);
    showToast('Error saving settings', 'error');
  }
}

/**
 * Reset settings to defaults
 */
async function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to defaults?')) {
    try {
      await browser.storage.sync.set(DEFAULT_SETTINGS);
      await loadSettings();
      showToast('Settings reset to defaults', 'success');
    } catch (error) {
      console.error('Error resetting settings:', error);
      showToast('Error resetting settings', 'error');
    }
  }
}

/**
 * Clear translation cache
 */
async function clearCache() {
  if (confirm('Are you sure you want to clear the translation cache?')) {
    try {
      await browser.storage.local.remove('translationCache');
      showToast('Cache cleared successfully!', 'success');
    } catch (error) {
      console.error('Error clearing cache:', error);
      showToast('Error clearing cache', 'error');
    }
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Font size slider
  elements.fontSize.addEventListener('input', () => {
    elements.fontSizeValue.textContent = elements.fontSize.value + 'px';
  });

  // Opacity slider
  elements.overlayOpacity.addEventListener('input', () => {
    elements.opacityValue.textContent = elements.overlayOpacity.value;
    updatePreview();
  });

  // Color picker
  elements.overlayBgColor.addEventListener('input', updatePreview);
  
  // Translation API selection
  elements.translationAPI.addEventListener('change', toggleCustomAPIUrl);

  // Buttons
  elements.saveBtn.addEventListener('click', saveSettings);
  elements.resetBtn.addEventListener('click', resetSettings);
  elements.clearCacheBtn.addEventListener('click', clearCache);
}

/**
 * Update color preview
 */
function updatePreview() {
  const bgColor = elements.overlayBgColor.value;
  const opacity = elements.overlayOpacity.value;
  
  // Convert hex to rgba
  const r = parseInt(bgColor.substr(1, 2), 16);
  const g = parseInt(bgColor.substr(3, 2), 16);
  const b = parseInt(bgColor.substr(5, 2), 16);
  
  elements.colorPreview.style.background = `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Toggle custom API URL field visibility
 */
function toggleCustomAPIUrl() {
  if (elements.translationAPI.value === 'libretranslate-custom') {
    elements.customAPIUrlRow.style.display = 'block';
  } else {
    elements.customAPIUrlRow.style.display = 'none';
  }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
  elements.toast.textContent = message;
  elements.toast.style.background = type === 'success' ? '#28a745' : '#dc3545';
  elements.toast.classList.add('show');
  
  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 3000);
}

// Initialize when page loads
init();
