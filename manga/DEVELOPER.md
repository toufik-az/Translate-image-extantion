# 🛠️ Developer Guide

This guide is for developers who want to understand, modify, or contribute to the Manga Translator extension.

## 📁 Project Structure

```
manga-translator-extension/
│
├── manifest.json              # Extension manifest (Manifest V2)
├── package.json              # NPM package info (optional)
├── README.md                 # User documentation
├── QUICKSTART.md            # Quick installation guide
├── CHANGELOG.md             # Version history
├── LICENSE                  # MIT License
│
├── popup/                   # Browser action popup
│   ├── popup.html          # Popup UI structure
│   ├── popup.js            # Popup logic and state management
│   └── popup.css           # Popup styling
│
├── content/                 # Content script (injected into pages)
│   ├── content.js          # Main translation engine
│   └── content.css         # Overlay styles
│
├── background/              # Background script
│   └── background.js       # Extension lifecycle & messaging
│
├── options/                 # Settings page
│   ├── options.html        # Settings UI
│   └── options.js          # Settings management
│
└── icons/                   # Extension icons
    ├── icon-48.png         # 48x48 icon
    ├── icon-96.png         # 96x96 icon
    ├── create_icons.js     # Node.js icon generator
    ├── create_icons.py     # Python icon generator
    └── generate-icons.html # HTML icon generator
```

## 🔧 Core Components

### 1. Manifest (manifest.json)

**Purpose**: Extension configuration and permissions

**Key Sections:**
- `permissions`: Required permissions for the extension
  - `activeTab`: Access current tab
  - `storage`: Store settings and cache
  - `<all_urls>`: Access all websites
  - `tabs`: Tab management

- `browser_action`: Popup configuration
- `content_scripts`: Scripts injected into pages
- `background`: Background service worker
- `web_accessible_resources`: Files accessible from web pages

### 2. Popup (popup/)

**Purpose**: User interface for controlling the extension

**popup.js - Key Functions:**
```javascript
init()                    // Initialize popup
loadSettings()           // Load saved settings from storage
loadTabState()           // Get current translation state
toggleTranslation()      // Start/stop translation
sendMessageToTab()       // Communicate with content script
handleContentScriptUpdate() // Handle updates from content script
```

**State Management:**
- `isActive`: Translation is running
- `currentTabId`: Active tab identifier
- Uses browser.storage.sync for persistent settings

### 3. Content Script (content/content.js)

**Purpose**: Main translation engine running on web pages

**Architecture:**
```javascript
State {
  isActive: boolean          // Is translation active
  isProcessing: boolean      // Currently processing
  showingOriginal: boolean   // Show/hide translations
  images: Array             // Detected images
  translations: Map         // Image → translation mapping
  settings: Object          // User settings
  stats: Object            // Processing statistics
}
```

**Key Functions:**

```javascript
// Initialization
init()                    // Set up listeners and load cache
initTesseract()          // Initialize OCR engine

// Image Processing
findImages()             // Detect images on page
processBatch()           // Process multiple images
processImage()           // Process single image

// OCR
performOCR(imageData)    // Extract text from image

// Translation
translateText(text)      // Translate using LibreTranslate API
getTranslationAPIUrl()   // Get API endpoint

// Rendering
renderOverlay()          // Display translation on image
toggleView()             // Show/hide translations
removeAllOverlays()      // Clean up

// Caching
loadCache()              // Load from storage
saveCache()              // Save to storage
getCacheKey(src)         // Generate cache key
```

**Message Handling:**
- `getState`: Return current state
- `startTranslation`: Begin processing
- `stopTranslation`: Stop and clean up
- `toggleView`: Toggle original/translated
- `retryFailed`: Retry failed images
- `updateSettings`: Update settings on-the-fly

### 4. Background Script (background/background.js)

**Purpose**: Extension lifecycle management

**Key Functions:**
```javascript
init()                   // Initialize background script
handleInstall()          // First install or update
handleMessage()          // Message routing
handleTabRemoved()       // Cleanup on tab close
setDefaultSettings()     // Set default configuration
cleanupCache()           // Remove expired cache entries
```

**Responsibilities:**
- Set default settings on install
- Forward messages between components
- Track active tabs
- Periodic cache cleanup (every 24 hours)
- Handle extension updates

### 5. Options Page (options/)

**Purpose**: Comprehensive settings interface

**Settings Categories:**
- Language settings
- Appearance customization
- OCR configuration
- Translation API setup
- Performance tuning
- Advanced options

**Key Functions:**
```javascript
init()                   // Initialize options page
loadSettings()           // Load from storage
saveSettings()           // Save to storage
resetSettings()          // Reset to defaults
clearCache()             // Clear translation cache
updatePreview()          // Live preview of colors
toggleCustomAPIUrl()     // Show/hide custom API field
showToast()             // User notifications
```

## 🔄 Data Flow

### Translation Process Flow

```
User clicks "Activate Translation"
         ↓
popup.js sends "startTranslation" message
         ↓
content.js receives message
         ↓
Initialize Tesseract worker
         ↓
Find all images on page (findImages)
         ↓
Filter by size and visibility
         ↓
Process in batches (processBatch)
         ↓
For each image:
  ├─ Check cache
  ├─ Perform OCR (Tesseract.js)
  ├─ Translate text (LibreTranslate API)
  ├─ Cache result
  └─ Render overlay
         ↓
Update popup with progress
         ↓
Complete - overlays visible
```

### Message Passing Flow

```
Popup ←→ Background ←→ Content Script

Example: Start Translation
Popup → Content: { action: "startTranslation", settings: {...} }
Content → Popup: { action: "updatePopup", progress: 50, stats: {...} }
```

## 🎨 Styling Architecture

### CSS Organization

**content.css:**
- `.manga-translator-overlay`: Container for translations
- `.manga-translator-text`: Translated text box
- `.manga-translator-bbox`: Bounding boxes (debug)
- `.manga-translator-loading`: Loading indicator
- `.manga-translator-toggle`: Toggle button

**Design Principles:**
- High z-index for overlays (999999+)
- Pointer events management
- Accessibility features (ARIA, keyboard navigation)
- Responsive design
- Dark mode support
- Print-friendly styles

## 🔌 External Dependencies

### Tesseract.js (OCR)

**Loading:**
```javascript
// Loaded dynamically from CDN
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js';
```

**Initialization:**
```javascript
const worker = await Tesseract.createWorker('jpn+kor+chi_sim');
const { data } = await worker.recognize(image);
```

**Language Codes:**
- Japanese: `jpn`
- Korean: `kor`
- Chinese Simplified: `chi_sim`
- English: `eng`
- Multi-language: `eng+jpn+kor+chi_sim`

### LibreTranslate API

**Public Endpoint:**
```
https://libretranslate.com/translate
```

**Request Format:**
```javascript
POST /translate
Content-Type: application/json

{
  "q": "こんにちは",
  "source": "ja",
  "target": "en",
  "format": "text"
}
```

**Response Format:**
```javascript
{
  "translatedText": "Hello"
}
```

**Rate Limits:**
- Public API: ~20 requests/minute
- Self-hosted: No limits

## 💾 Storage Schema

### Sync Storage (Settings)

```javascript
{
  sourceLang: "auto",          // Source language
  targetLang: "en",            // Target language
  fontSize: 16,                // Font size (px)
  overlayBgColor: "#000000",   // Background color (hex)
  overlayOpacity: 0.7,         // Opacity (0-1)
  textColor: "#ffffff",        // Text color (hex)
  fontFamily: "Arial",         // Font family
  ocrEngine: "tesseract",      // OCR engine
  verticalText: true,          // Detect vertical text
  minImageSize: 10000,         // Minimum image area (px²)
  translationAPI: "libretranslate", // API service
  customAPIUrl: "",            // Custom API URL
  apiTimeout: 30,              // Timeout (seconds)
  maxConcurrent: 3,            // Concurrent translations
  enableCache: true,           // Enable caching
  cacheExpiry: 7,              // Cache expiry (days)
  debugMode: false,            // Debug logging
  showBoundingBoxes: false     // Show OCR boxes
}
```

### Local Storage (Cache)

```javascript
{
  translationCache: {
    "<image-hash>": {
      original: "原文",
      translated: "Translation",
      boxes: [...],
      timestamp: 1234567890
    }
  }
}
```

## 🧪 Testing

### Manual Testing Checklist

**Basic Functionality:**
- [ ] Extension loads without errors
- [ ] Popup opens and displays correctly
- [ ] Settings page accessible
- [ ] Settings save and persist
- [ ] Images detected on page
- [ ] OCR extracts text
- [ ] Translation API responds
- [ ] Overlays render correctly
- [ ] Toggle view works
- [ ] Cache saves and loads

**Edge Cases:**
- [ ] No images on page
- [ ] Very large images (>10MB)
- [ ] Many images (100+)
- [ ] Low-quality images
- [ ] Images with CORS restrictions
- [ ] API timeout/failure
- [ ] Network offline
- [ ] Different zoom levels
- [ ] Mobile viewport

**Cross-Browser:**
- [ ] Firefox (latest)
- [ ] Firefox ESR
- [ ] Firefox Developer Edition

### Debug Mode

Enable in Settings → Advanced → Debug Mode

**Console Output:**
```javascript
[Manga Translator] Initializing Tesseract...
[Manga Translator] Found 15 suitable images
[Manga Translator] Processing image 0...
[Manga Translator] OCR detected text: "こんにちは..."
[Manga Translator] Translation: "Hello..."
```

## 🐛 Common Issues & Solutions

### Issue: Tesseract not loading

**Symptoms:** OCR fails, console shows Tesseract undefined

**Solutions:**
- Check CDN availability
- Verify content security policy
- Check for ad blockers
- Try different Tesseract CDN

### Issue: CORS errors

**Symptoms:** Can't access image data

**Solutions:**
- Images from different domain
- Server doesn't allow CORS
- Use proxy or download image
- Ask user to open image in new tab

### Issue: Memory leaks

**Symptoms:** Browser slows down after multiple uses

**Solutions:**
- Terminate Tesseract worker when done
- Clear overlays properly
- Limit concurrent processing
- Implement better cleanup

### Issue: Slow performance

**Symptoms:** Takes very long to process

**Solutions:**
- Reduce maxConcurrent
- Increase minImageSize
- Use smaller images
- Clear cache if too large
- Optimize OCR language selection

## 🚀 Building & Deployment

### Create XPI Package

**Using NPM Script:**
```bash
npm run package
```

**Manual (PowerShell):**
```powershell
Compress-Archive -Path manifest.json,popup,content,background,options,icons -DestinationPath manga-translator.zip
Rename-Item manga-translator.zip manga-translator.xpi
```

**Manual (Bash):**
```bash
zip -r manga-translator.xpi manifest.json popup/ content/ background/ options/ icons/
```

### Signing for Distribution

**Firefox Add-ons:**
1. Create account at https://addons.mozilla.org
2. Submit extension for review
3. Wait for approval
4. Signed version available for download

**Self-Distribution:**
1. Sign at https://addons.mozilla.org/developers/
2. Distribute signed XPI
3. Users can install directly

## 📝 Coding Standards

### JavaScript

- Use ES6+ features
- Prefer `const` over `let`
- Use async/await over promises
- Add JSDoc comments for functions
- Handle errors gracefully
- Log useful debug information

### HTML/CSS

- Semantic HTML
- Accessible markup (ARIA labels)
- Mobile-first responsive design
- Cross-browser compatibility
- Use CSS custom properties for theming

### Git Commits

Format: `type(scope): message`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Testing
- `chore`: Maintenance

## 🤝 Contributing

### Pull Request Process

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Comments explain complex logic
- [ ] No console.log (use debug mode)
- [ ] Error handling in place
- [ ] Tested manually
- [ ] Documentation updated
- [ ] No breaking changes (or documented)

## 📚 Useful Resources

### Firefox WebExtensions
- [MDN WebExtensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Firefox Extension Workshop](https://extensionworkshop.com/)

### Tesseract.js
- [GitHub Repository](https://github.com/naptha/tesseract.js)
- [Documentation](https://tesseract.projectnaptha.com/)

### LibreTranslate
- [GitHub Repository](https://github.com/LibreTranslate/LibreTranslate)
- [API Documentation](https://libretranslate.com/docs)

---

**Happy Coding! 🚀**
