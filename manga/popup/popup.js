/**
 * Popup Script for Manga Translator Extension
 * Handles user interactions in the browser action popup
 */

// DOM Elements
const toggleBtn = document.getElementById('toggleBtn');
const toggleBtnText = document.getElementById('toggleBtnText');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const sourceLang = document.getElementById('sourceLang');
const targetLang = document.getElementById('targetLang');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const statsSection = document.getElementById('statsSection');
const imageCount = document.getElementById('imageCount');
const processedCount = document.getElementById('processedCount');
const toggleViewBtn = document.getElementById('toggleViewBtn');
const retryBtn = document.getElementById('retryBtn');
const settingsBtn = document.getElementById('settingsBtn');
const helpBtn = document.getElementById('helpBtn');

// State
let isActive = false;
let currentTabId = null;

/**
 * Initialize popup when opened
 */
async function init() {
  // Get current tab
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (tabs.length > 0) {
    currentTabId = tabs[0].id;
  }

  // Load saved settings
  loadSettings();

  // Load state from current tab
  loadTabState();

  // Set up event listeners
  setupEventListeners();
}

/**
 * Load saved settings from storage
 */
async function loadSettings() {
  try {
    const settings = await browser.storage.sync.get({
      sourceLang: 'auto',
      targetLang: 'en',
      fontSize: 16,
      overlayBgColor: '#000000',
      overlayOpacity: 0.7
    });

    sourceLang.value = settings.sourceLang;
    targetLang.value = settings.targetLang;
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

/**
 * Load translation state for current tab
 */
async function loadTabState() {
  if (!currentTabId) return;

  try {
    // Send message to content script to get current state
    const response = await browser.tabs.sendMessage(currentTabId, {
      action: 'getState'
    }).catch(() => null);

    if (response) {
      updateUIState(response);
    }
  } catch (error) {
    console.log('Content script not ready:', error);
  }
}

/**
 * Update UI based on current state
 */
function updateUIState(state) {
  isActive = state.isActive || false;
  
  // Update button
  if (isActive) {
    toggleBtn.classList.add('active');
    toggleBtnText.textContent = 'Deactivate Translation';
    statusIndicator.classList.remove('inactive');
    statusIndicator.classList.add('active');
    statusText.textContent = 'Active';
  } else {
    toggleBtn.classList.remove('active');
    toggleBtnText.textContent = 'Activate Translation';
    statusIndicator.classList.remove('active', 'processing');
    statusIndicator.classList.add('inactive');
    statusText.textContent = 'Inactive';
  }

  // Update stats if available
  if (state.stats) {
    imageCount.textContent = state.stats.total || 0;
    processedCount.textContent = state.stats.processed || 0;
    statsSection.style.display = 'flex';
  }

  // Show toggle view button if translations exist
  if (state.hasTranslations) {
    toggleViewBtn.style.display = 'block';
    toggleViewBtn.textContent = state.showingOriginal ? 'Show Translations' : 'Show Original';
  }

  // Show retry button if there are failures
  if (state.stats && state.stats.failed > 0) {
    retryBtn.style.display = 'block';
  }
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
  // Toggle translation button
  toggleBtn.addEventListener('click', toggleTranslation);

  // Language selection changes
  sourceLang.addEventListener('change', async () => {
    await browser.storage.sync.set({ sourceLang: sourceLang.value });
    if (isActive) {
      // Notify content script of language change
      sendMessageToTab({ action: 'updateSettings', sourceLang: sourceLang.value });
    }
  });

  targetLang.addEventListener('change', async () => {
    await browser.storage.sync.set({ targetLang: targetLang.value });
    if (isActive) {
      // Notify content script of language change
      sendMessageToTab({ action: 'updateSettings', targetLang: targetLang.value });
    }
  });

  // Toggle view button
  toggleViewBtn.addEventListener('click', () => {
    sendMessageToTab({ action: 'toggleView' });
  });

  // Retry button
  retryBtn.addEventListener('click', () => {
    sendMessageToTab({ action: 'retryFailed' });
  });

  // Settings button
  settingsBtn.addEventListener('click', () => {
    browser.runtime.openOptionsPage();
  });

  // Help button
  helpBtn.addEventListener('click', () => {
    alert('Manga Translator Help:\n\n' +
      '1. Click "Activate Translation" to start\n' +
      '2. The extension will scan all images on the page\n' +
      '3. Text will be extracted using OCR\n' +
      '4. Translated text will overlay the images\n' +
      '5. Use "Show Original" to toggle views\n\n' +
      'For best results:\n' +
      '- Use on manga/manhwa reading sites\n' +
      '- Ensure images are clearly visible\n' +
      '- Select the correct source language\n\n' +
      'Configure more settings in the Settings page.');
  });

  // Listen for updates from content script
  browser.runtime.onMessage.addListener((message) => {
    if (message.action === 'updatePopup') {
      handleContentScriptUpdate(message);
    }
  });
}

/**
 * Toggle translation on/off
 */
async function toggleTranslation() {
  if (!currentTabId) return;

  isActive = !isActive;

  if (isActive) {
    // Start translation
    statusIndicator.classList.remove('inactive');
    statusIndicator.classList.add('processing');
    statusText.textContent = 'Processing...';
    progressSection.style.display = 'block';
    toggleBtn.disabled = true;

    // Get current settings
    const settings = await browser.storage.sync.get();

    // Send message to content script to start translation
    sendMessageToTab({
      action: 'startTranslation',
      settings: settings
    });

  } else {
    // Stop translation
    sendMessageToTab({ action: 'stopTranslation' });
    
    statusIndicator.classList.remove('processing', 'active');
    statusIndicator.classList.add('inactive');
    statusText.textContent = 'Inactive';
    toggleBtnText.textContent = 'Activate Translation';
    toggleBtn.classList.remove('active');
    progressSection.style.display = 'none';
    toggleBtn.disabled = false;
  }
}

/**
 * Send message to content script in current tab
 */
async function sendMessageToTab(message) {
  if (!currentTabId) return;

  try {
    await browser.tabs.sendMessage(currentTabId, message);
  } catch (error) {
    console.error('Error sending message to tab:', error);
    // Content script might not be loaded, try to inject it
    try {
      await browser.tabs.executeScript(currentTabId, {
        file: '/content/content.js'
      });
      // Try sending message again
      setTimeout(() => {
        browser.tabs.sendMessage(currentTabId, message);
      }, 100);
    } catch (injectError) {
      console.error('Error injecting content script:', injectError);
      alert('Unable to activate on this page. Please refresh and try again.');
    }
  }
}

/**
 * Handle updates from content script
 */
function handleContentScriptUpdate(message) {
  if (message.progress !== undefined) {
    // Update progress bar
    progressFill.style.width = message.progress + '%';
    progressText.textContent = message.message || 'Processing...';
  }

  if (message.stats) {
    // Update statistics
    imageCount.textContent = message.stats.total || 0;
    processedCount.textContent = message.stats.processed || 0;
    statsSection.style.display = 'flex';
  }

  if (message.status) {
    // Update status
    switch (message.status) {
      case 'processing':
        statusIndicator.classList.remove('inactive', 'active');
        statusIndicator.classList.add('processing');
        statusText.textContent = 'Processing...';
        break;
      case 'complete':
        statusIndicator.classList.remove('inactive', 'processing');
        statusIndicator.classList.add('active');
        statusText.textContent = 'Complete';
        toggleBtn.classList.add('active');
        toggleBtnText.textContent = 'Deactivate Translation';
        toggleBtn.disabled = false;
        progressSection.style.display = 'none';
        toggleViewBtn.style.display = 'block';
        break;
      case 'error':
        statusIndicator.classList.remove('processing', 'active');
        statusIndicator.classList.add('inactive');
        statusText.textContent = 'Error';
        toggleBtn.disabled = false;
        progressSection.style.display = 'none';
        break;
    }
  }

  if (message.showingOriginal !== undefined) {
    toggleViewBtn.textContent = message.showingOriginal ? 'Show Translations' : 'Show Original';
  }
}

// Initialize when popup opens
init();
