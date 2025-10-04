# 🔄 Extension Architecture & Flow Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FIREFOX BROWSER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────┐         ┌────────────────┐                  │
│  │  Browser UI    │         │  Web Page      │                  │
│  │  (Toolbar)     │         │  (DOM)         │                  │
│  └────────┬───────┘         └────────┬───────┘                  │
│           │                          │                           │
│           │                          │                           │
│  ┌────────▼───────┐         ┌────────▼────────┐                 │
│  │  Popup UI      │◄────────┤  Content Script │                 │
│  │  (popup.js)    │ Message │  (content.js)   │                 │
│  └────────┬───────┘ Passing └────────┬────────┘                 │
│           │                          │                           │
│           │                          │                           │
│           │         ┌────────────────▼──────┐                   │
│           └────────►│  Background Script    │                   │
│                     │  (background.js)      │                   │
│                     └────────┬──────────────┘                   │
│                              │                                   │
│                     ┌────────▼──────────────┐                   │
│                     │  Browser Storage API   │                  │
│                     │  - Sync (Settings)     │                  │
│                     │  - Local (Cache)       │                  │
│                     └───────────────────────┘                   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP Requests
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌────────▼─────────┐   ┌──────▼──────┐
│  Tesseract.js  │   │  LibreTranslate  │   │  CDN/Web    │
│  (CDN)         │   │  API             │   │  Resources  │
│  OCR Engine    │   │  Translation     │   │             │
└────────────────┘   └──────────────────┘   └─────────────┘
```

## Component Interaction Flow

```
USER ACTIONS → POPUP → BACKGROUND → CONTENT → EXTERNAL APIs
    ↓           ↓          ↓           ↓            ↓
  Click      Update    Forward     Process      OCR +
  Button     State     Message     Images    Translation
    ↓           ↓          ↓           ↓            ↓
  Select     Send      Manage      Render      Return
  Language   Message   Settings    Overlay      Data
```

## Translation Process Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: USER INTERACTION                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ User clicks      │
                    │ "Activate"       │
                    │ in Popup         │
                    └────────┬─────────┘
                             │
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: MESSAGE PASSING                                          │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Popup sends      │
                    │ "startTranslation"│
                    │ message to       │
                    │ Content Script   │
                    └────────┬─────────┘
                             │
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: INITIALIZATION                                           │
└─────────────────────────────────────────────────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │ Content Script   │
                    │ receives message │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ Initialize       │
                    │ Tesseract.js     │
                    │ (Download if     │
                    │  first time)     │
                    └────────┬─────────┘
                             │
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: IMAGE DETECTION                                          │
└─────────────────────────────────────────────────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │ Scan DOM for     │
                    │ <img> elements   │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ Filter images:   │
                    │ - Size > min     │
                    │ - Visible        │
                    │ - Loaded         │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ Create image     │
                    │ array (10 found) │
                    └────────┬─────────┘
                             │
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: BATCH PROCESSING                                         │
└─────────────────────────────────────────────────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │ Split into       │
                    │ batches of 3     │
                    │ (concurrent)     │
                    └────────┬─────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
         ┌──────▼──────┐ ┌──▼──────┐ ┌──▼──────┐
         │ Image 1     │ │ Image 2 │ │ Image 3 │
         │ Processing  │ │ Process │ │ Process │
         └──────┬──────┘ └──┬──────┘ └──┬──────┘
                │            │            │
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: PER-IMAGE PROCESSING                                     │
└─────────────────────────────────────────────────────────────────┘
                │            │            │
                │  ┌─────────▼─────────┐  │
                │  │ Check cache for  │  │
                │  │ this image       │  │
                │  └─────────┬─────────┘  │
                │            │            │
                │      ┌─────▼─────┐      │
                │      │ Cache hit? │─────┤─── YES ──┐
                │      └─────┬─────┘      │          │
                │            │            │          │
                │           NO            │          │
                │            │            │          │
                │  ┌─────────▼─────────┐  │          │
                │  │ Perform OCR      │  │          │
                │  │ (Tesseract.js)   │  │          │
                │  └─────────┬─────────┘  │          │
                │            │            │          │
                │  ┌─────────▼─────────┐  │          │
                │  │ Extract text:    │  │          │
                │  │ "こんにちは"      │  │          │
                │  └─────────┬─────────┘  │          │
                │            │            │          │
                │  ┌─────────▼─────────┐  │          │
                │  │ Translate text   │  │          │
                │  │ (LibreTranslate) │  │          │
                │  └─────────┬─────────┘  │          │
                │            │            │          │
                │  ┌─────────▼─────────┐  │          │
                │  │ Get translation: │  │          │
                │  │ "Hello"          │  │          │
                │  └─────────┬─────────┘  │          │
                │            │            │          │
                │  ┌─────────▼─────────┐  │          │
                │  │ Save to cache    │  │          │
                │  └─────────┬─────────┘  │          │
                │            │            │          │
                └────────────┼────────────┘          │
                             │                       │
┌─────────────────────────────────────────────────────────────────┐
│ STEP 7: OVERLAY RENDERING                                        │
└─────────────────────────────────────────────────────────────────┘
                             │                       │
                      ┌──────▼───────────────────────▼──────┐
                      │ Create overlay DIV element        │
                      └──────┬─────────────────────────────┘
                             │
                      ┌──────▼───────────────────────────┐
                      │ Position over original image    │
                      └──────┬─────────────────────────┘
                             │
                      ┌──────▼───────────────────────────┐
                      │ Style with user settings:       │
                      │ - Background: rgba(0,0,0,0.7)   │
                      │ - Font size: 16px               │
                      │ - Color: white                  │
                      └──────┬─────────────────────────┘
                             │
                      ┌──────▼───────────────────────────┐
                      │ Insert translated text          │
                      └──────┬─────────────────────────┘
                             │
                      ┌──────▼───────────────────────────┐
                      │ Append to DOM                   │
                      └──────┬─────────────────────────┘
                             │
┌─────────────────────────────────────────────────────────────────┐
│ STEP 8: PROGRESS UPDATES                                         │
└─────────────────────────────────────────────────────────────────┘
                             │
                      ┌──────▼───────────────────────────┐
                      │ Send progress to popup:         │
                      │ - Processed: 3/10              │
                      │ - Progress: 30%                │
                      └──────┬─────────────────────────┘
                             │
                      ┌──────▼───────────────────────────┐
                      │ Popup updates UI:               │
                      │ - Progress bar                 │
                      │ - Statistics                   │
                      │ - Status text                  │
                      └──────┬─────────────────────────┘
                             │
┌─────────────────────────────────────────────────────────────────┐
│ STEP 9: COMPLETION                                               │
└─────────────────────────────────────────────────────────────────┘
                             │
                      ┌──────▼───────────────────────────┐
                      │ All images processed           │
                      └──────┬─────────────────────────┘
                             │
                      ┌──────▼───────────────────────────┐
                      │ Send "complete" to popup       │
                      └──────┬─────────────────────────┘
                             │
                      ┌──────▼───────────────────────────┐
                      │ Popup shows success            │
                      │ Status: "Complete"             │
                      │ Show "Toggle View" button      │
                      └──────┬─────────────────────────┘
                             │
                      ┌──────▼───────────────────────────┐
                      │ User can now:                  │
                      │ - Toggle original/translated   │
                      │ - Deactivate                   │
                      │ - Adjust settings              │
                      └────────────────────────────────┘
```

## Data Structures

### Image Object
```javascript
{
  element: HTMLImageElement,    // DOM reference
  index: 0,                     // Image number
  width: 800,                   // Natural width
  height: 1200,                 // Natural height
  src: "https://..."            // Image URL
}
```

### Translation Result
```javascript
{
  original: "こんにちは世界",     // Original text
  translated: "Hello world",    // Translated text
  boxes: [                      // Text bounding boxes
    {
      text: "こんにちは",
      bbox: { x0: 10, y0: 20, x1: 100, y1: 50 },
      confidence: 0.95
    }
  ],
  timestamp: 1704412800000      // For cache expiry
}
```

### State Object
```javascript
{
  isActive: true,               // Translation active
  isProcessing: false,          // Currently processing
  showingOriginal: false,       // View mode
  images: [...],                // Array of image objects
  translations: Map,            // Image → Translation
  settings: {...},              // User settings
  stats: {
    total: 10,                  // Total images
    processed: 8,               // Successfully processed
    failed: 2                   // Failed to process
  }
}
```

## Message Types

### Popup → Content Script
```javascript
// Start translation
{ 
  action: "startTranslation",
  settings: {...}
}

// Stop translation
{ 
  action: "stopTranslation"
}

// Toggle view
{ 
  action: "toggleView"
}

// Get current state
{ 
  action: "getState"
}
```

### Content Script → Popup
```javascript
// Progress update
{
  action: "updatePopup",
  progress: 50,                 // Percentage
  message: "Processing...",     // Status message
  stats: {
    total: 10,
    processed: 5,
    failed: 0
  }
}

// Status change
{
  action: "updatePopup",
  status: "complete",           // or "processing", "error"
  showingOriginal: false
}
```

## Storage Schema

### Sync Storage (Settings)
```
browser.storage.sync {
  "sourceLang": "auto",
  "targetLang": "en",
  "fontSize": 16,
  "overlayBgColor": "#000000",
  "overlayOpacity": 0.7,
  "textColor": "#ffffff",
  "fontFamily": "Arial, sans-serif",
  "verticalText": true,
  "minImageSize": 10000,
  "translationAPI": "libretranslate",
  "customAPIUrl": "",
  "apiTimeout": 30,
  "maxConcurrent": 3,
  "enableCache": true,
  "cacheExpiry": 7,
  "debugMode": false,
  "showBoundingBoxes": false
}
```

### Local Storage (Cache)
```
browser.storage.local {
  "translationCache": {
    "aHR0cHM6Ly9leGFtcGxlLmNvbS9pbWFnZS5qcGc=": {
      "original": "原文テキスト",
      "translated": "Translated text",
      "boxes": [...],
      "timestamp": 1704412800000
    }
  }
}
```

## API Interactions

### Tesseract.js OCR
```
REQUEST:
  worker.recognize(imageElement)

RESPONSE:
  {
    data: {
      text: "Extracted text",
      confidence: 95,
      lines: [
        {
          text: "Line 1",
          bbox: { x0, y0, x1, y1 },
          confidence: 98
        }
      ]
    }
  }
```

### LibreTranslate API
```
REQUEST:
  POST https://libretranslate.com/translate
  Content-Type: application/json
  
  {
    "q": "こんにちは",
    "source": "ja",
    "target": "en",
    "format": "text"
  }

RESPONSE:
  {
    "translatedText": "Hello"
  }
```

## Error Handling Flow

```
┌──────────────┐
│ Try Action   │
└──────┬───────┘
       │
       ▼
┌──────────────┐      ┌──────────────┐
│ Success?     │─YES─→│ Continue     │
└──────┬───────┘      └──────────────┘
       │
      NO
       │
       ▼
┌──────────────┐
│ Catch Error  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Log Error    │
│ (if debug)   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Update Stats │
│ (failed + 1) │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Notify User  │
│ (if critical)│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Continue or  │
│ Abort        │
└──────────────┘
```

## Performance Timeline

```
Time (seconds)  Event
─────────────   ─────────────────────────────────────────
0.0            User clicks "Activate Translation"
0.1            Message sent to content script
0.2            Content script receives message
0.5            Tesseract.js initialization starts
2.0            Tesseract.js ready (first time: +20-40s)
2.1            DOM scan for images
2.2            10 images found and filtered
2.3            Batch 1 (images 1-3) processing starts
5.0            OCR complete for image 1
5.5            Translation API call for image 1
6.0            Translation received for image 1
6.1            Overlay rendered for image 1
6.2            Cache saved for image 1
               (Parallel processing for images 2-3)
8.0            Batch 1 complete (3/10 images)
8.1            Batch 2 (images 4-6) processing starts
12.0           Batch 2 complete (6/10 images)
12.1           Batch 3 (images 7-9) processing starts
16.0           Batch 3 complete (9/10 images)
16.1           Batch 4 (image 10) processing starts
18.0           All processing complete
18.1           Status updated to "complete"
18.2           User can toggle view/deactivate
```

## Memory Usage Pattern

```
Memory (MB)
    │
500 │                    ╱╲
    │                   ╱  ╲
400 │                  ╱    ╲
    │                 ╱      ╲
300 │               ╱         ╲___
    │              ╱               ╲
200 │            ╱                  ╲
    │          ╱                     ╲
100 │________╱                        ╲________
    │
    └─────────────────────────────────────────→ Time
      Idle  Load  Process  Complete  Cleanup
```

---

**This diagram shows the complete architecture and flow of the Manga Translator extension.**
