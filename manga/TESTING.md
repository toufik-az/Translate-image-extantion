# 🧪 Testing Guide

This guide will help you test the Manga Translator extension to ensure it's working correctly.

## Pre-Installation Testing

Before installing the extension, verify you have:
- ✅ Firefox browser (version 91.0 or later recommended)
- ✅ Active internet connection
- ✅ All extension files in the folder

## Installation Test

### Step 1: Load Extension
1. Open Firefox
2. Navigate to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select `manifest.json`

**Expected Result:**
- ✅ Extension loads without errors
- ✅ Icon appears in toolbar
- ✅ No error messages in debugging page

**Troubleshooting:**
- ❌ If errors appear, check console for details
- ❌ Verify all files are present
- ❌ Check manifest.json is valid JSON

## Functional Testing

### Test 1: Popup Interface

**Steps:**
1. Click extension icon in toolbar
2. Observe popup window

**Expected Result:**
- ✅ Popup opens smoothly
- ✅ UI elements visible and properly styled
- ✅ Language selectors populated
- ✅ Status shows "Inactive"
- ✅ "Activate Translation" button enabled

**Screenshot Areas:**
- Header with title
- Status indicator (gray dot)
- Language dropdowns
- Activation button
- Settings/Help buttons

### Test 2: Settings Page

**Steps:**
1. Click ⚙️ Settings button in popup
2. Verify settings page opens

**Expected Result:**
- ✅ Settings page opens in new tab
- ✅ All sections visible
- ✅ Controls functional (sliders, dropdowns, checkboxes)
- ✅ Color pickers work
- ✅ Preview updates in real-time

**Test Changes:**
1. Adjust font size slider → Value updates
2. Change background color → Preview updates
3. Click "Save Settings" → Toast appears
4. Refresh page → Settings persist

### Test 3: Basic Translation

**Setup:**
You need a test page with images. Options:
1. Create a simple HTML page with images
2. Visit any manga reading website
3. Use a test page (instructions below)

**Creating a Test Page:**

Save this as `test.html` and open in Firefox:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Manga Translator Test Page</title>
  <style>
    body { padding: 20px; font-family: Arial; }
    .test-image { margin: 20px; border: 2px solid #ddd; }
    h2 { color: #667eea; }
  </style>
</head>
<body>
  <h1>Manga Translator Extension Test Page</h1>
  
  <h2>Test Image 1: Japanese Text</h2>
  <img class="test-image" src="https://via.placeholder.com/400x300/ffffff/000000?text=こんにちは" alt="Test 1">
  
  <h2>Test Image 2: Korean Text</h2>
  <img class="test-image" src="https://via.placeholder.com/400x300/ffffff/000000?text=안녕하세요" alt="Test 2">
  
  <h2>Test Image 3: Chinese Text</h2>
  <img class="test-image" src="https://via.placeholder.com/400x300/ffffff/000000?text=你好" alt="Test 3">
  
  <p>Note: These are placeholder images. For best results, use actual manga/manhwa images with text.</p>
</body>
</html>
```

**Steps:**
1. Open test page or manga website
2. Click extension icon
3. Select languages:
   - Source: Japanese (or appropriate language)
   - Target: English (or your language)
4. Click "Activate Translation"
5. Wait for processing

**Expected Result:**
- ✅ Status changes to "Processing..."
- ✅ Progress bar appears and updates
- ✅ Image count shown
- ✅ Processing completes
- ✅ Status changes to "Complete"
- ✅ Translated overlays appear on images

**Timing:**
- First use: 30-60 seconds (downloading OCR data)
- Subsequent uses: 10-30 seconds
- Varies by number and size of images

### Test 4: Toggle View

**Prerequisite:** Complete Test 3

**Steps:**
1. After translation completes
2. Click "Show Original" button
3. Click "Show Translations" button

**Expected Result:**
- ✅ Overlays hide when showing original
- ✅ Overlays reappear when showing translations
- ✅ Button text updates accordingly
- ✅ Smooth transition

### Test 5: Language Detection

**Steps:**
1. Set source language to "Auto Detect"
2. Open page with mixed language images
3. Activate translation

**Expected Result:**
- ✅ Extension detects source languages
- ✅ Translations appear correctly
- ✅ No errors in console

**Note:** Auto-detect is slower and less accurate

### Test 6: Cache Functionality

**Steps:**
1. Translate a page (Test 3)
2. Click "Deactivate"
3. Click "Activate Translation" again

**Expected Result:**
- ✅ Second activation much faster
- ✅ Uses cached translations
- ✅ No API calls for cached images
- ✅ Identical results

**Verify Cache:**
1. Open `about:debugging`
2. Find extension
3. Click "Inspect"
4. Go to Storage → Local Storage
5. Check for `translationCache` key

### Test 7: Error Handling

**Test 7a: No Images**
1. Visit page with no images (e.g., text-only page)
2. Activate translation

**Expected:**
- ✅ Message: "No images found on this page"
- ✅ No errors thrown
- ✅ Extension still functional

**Test 7b: Network Error**
1. Disconnect internet
2. Activate translation (on non-cached page)

**Expected:**
- ✅ Error message about network/API
- ✅ Status shows "Error"
- ✅ Can retry when connection restored

**Test 7c: Tiny Images**
1. Set minimum image size to 100000 in settings
2. Visit page with small images
3. Activate translation

**Expected:**
- ✅ Small images ignored
- ✅ Only large images processed
- ✅ Appropriate message shown

## Performance Testing

### Test 8: Multiple Images

**Setup:**
Find or create page with 10+ images

**Steps:**
1. Activate translation
2. Monitor performance

**Expected Result:**
- ✅ No browser freeze
- ✅ Progress bar updates smoothly
- ✅ Memory usage reasonable (<500MB increase)
- ✅ All images eventually processed

**Monitor:**
- Open Task Manager / Activity Monitor
- Watch Firefox memory usage
- Check CPU usage

**Acceptable:**
- Memory: +100-500MB during processing
- CPU: 50-100% during OCR
- Time: 30-120 seconds for 10 images

### Test 9: Large Images

**Setup:**
Page with high-resolution manga scans (>2MB each)

**Steps:**
1. Activate translation
2. Wait for completion

**Expected:**
- ✅ Processes without crashing
- ✅ May take longer (expected)
- ✅ Overlays scale properly
- ✅ Text readable

### Test 10: Concurrent Limit

**Steps:**
1. Open settings
2. Set "Maximum Concurrent Translations" to 1
3. Activate on page with many images
4. Observe processing

**Expected:**
- ✅ Processes one image at a time
- ✅ Slower but more stable
- ✅ Lower memory usage

**Test with different values:**
- 1: Slowest, most stable
- 3: Balanced (default)
- 5: Faster, more memory
- 10: Fastest, may struggle

## Visual Testing

### Test 11: Overlay Appearance

**Steps:**
1. Complete basic translation
2. Check overlay styling

**Verify:**
- ✅ Text readable
- ✅ Background semi-transparent
- ✅ Proper contrast
- ✅ Centered on image
- ✅ Doesn't overflow

**Customize in Settings:**
1. Font size: 10, 16, 24, 32
2. Colors: various combinations
3. Opacity: 0.3, 0.5, 0.7, 0.9
4. Font family: different options

**Expected:**
- ✅ All settings apply correctly
- ✅ Text remains readable
- ✅ Updates without refresh

### Test 12: Responsive Design

**Steps:**
1. Activate translation
2. Resize browser window
3. Zoom in/out (Ctrl + / Ctrl -)

**Expected:**
- ✅ Overlays scale appropriately
- ✅ Text remains readable
- ✅ Layout doesn't break
- ✅ Still functional at all sizes

## Edge Case Testing

### Test 13: Special Characters

**Test with images containing:**
- Symbols: ♥ ★ ◆ ○
- Punctuation: 「」『』。、
- Numbers: 123 ４５６
- Mixed: Japanese + English

**Expected:**
- ✅ OCR handles special characters
- ✅ Translation preserves meaning
- ✅ Display formatting correct

### Test 14: Vertical Text

**Setup:**
Traditional Japanese manga (vertical text)

**Steps:**
1. Enable "Vertical Text Detection" in settings
2. Activate translation

**Expected:**
- ✅ Detects vertical text
- ✅ Processes correctly
- ✅ Overlay positions appropriately

**Note:** This feature has limited support

### Test 15: CORS-Protected Images

**Some websites block cross-origin image access**

**Steps:**
1. Visit site with CORS restrictions
2. Activate translation

**Expected:**
- ⚠️ May fail to access some images
- ✅ Handles gracefully without crashing
- ✅ Processes accessible images
- ✅ Shows appropriate message

**Workaround:**
- Right-click image → "Open in new tab"
- Then activate translation

## Debug Mode Testing

### Test 16: Debug Logging

**Steps:**
1. Open settings
2. Enable "Debug Mode"
3. Save settings
4. Open browser console (F12)
5. Activate translation

**Expected:**
- ✅ Detailed logs in console
- ✅ Shows each processing step
- ✅ Tesseract initialization logs
- ✅ OCR results visible
- ✅ Translation API responses shown

**Example Console Output:**
```
[Manga Translator] Content script loaded
[Manga Translator] Initializing Tesseract...
[Manga Translator] Found 5 suitable images
[Manga Translator] Processing image 0...
[Manga Translator] OCR detected text: "こんにちは世界"
[Manga Translator] Translation: "Hello world"
```

### Test 17: Bounding Boxes

**Steps:**
1. Enable "Show Bounding Boxes" in settings
2. Save settings
3. Activate translation

**Expected:**
- ✅ Red boxes around detected text
- ✅ Shows OCR detection regions
- ✅ Helps debug OCR accuracy
- ✅ Boxes align with text

## Compatibility Testing

### Test 18: Different Websites

Test on various types of sites:

**Manga Reading Sites:**
- ✅ MangaDex
- ✅ Various manga aggregators
- ✅ Official publisher sites

**General Image Sites:**
- ✅ Image galleries
- ✅ Social media (Twitter, Reddit)
- ✅ News sites with images

**Results:**
- Note which sites work well
- Report issues with specific sites
- Check CORS restrictions

### Test 19: Different Image Formats

**Test with:**
- JPG/JPEG
- PNG
- WebP
- GIF (static)
- SVG (may not work)

**Expected:**
- ✅ Common formats (JPG, PNG) work
- ✅ WebP supported
- ⚠️ Animated GIF uses first frame
- ❌ SVG may not work (text as paths)

## Stress Testing

### Test 20: Maximum Load

**Setup:**
Page with 100+ images

**Steps:**
1. Activate translation
2. Monitor system resources
3. Wait for completion (or timeout)

**Acceptable Behavior:**
- ✅ Eventually processes or fails gracefully
- ✅ Doesn't crash browser
- ✅ Memory eventually releases
- ⚠️ May be very slow
- ⚠️ May hit API rate limits

**Recovery:**
- Click "Deactivate" if needed
- Reduce max concurrent setting
- Close and reopen tab

## Reporting Issues

If you find bugs during testing:

### Information to Collect:

1. **Environment:**
   - Firefox version
   - OS (Windows/Mac/Linux)
   - Extension version

2. **Steps to Reproduce:**
   - Exact steps taken
   - Test number reference
   - URL if applicable

3. **Expected vs Actual:**
   - What should happen
   - What actually happened

4. **Console Output:**
   - Enable debug mode
   - Copy console messages
   - Screenshot if helpful

5. **Settings:**
   - List any non-default settings
   - Screenshot of settings page

### Where to Report:

- GitHub Issues (if repository exists)
- Direct to developer
- Include all collected information

## Success Criteria

Extension is working correctly if:

- ✅ All "Expected Result" items pass
- ✅ No console errors (except known CORS issues)
- ✅ Translations appear and are readable
- ✅ UI responsive and intuitive
- ✅ Settings save and apply
- ✅ No browser crashes
- ✅ Memory usage acceptable
- ✅ Cache functions properly

## Common Test Failures

### Tesseract Not Loading
**Symptom:** "Tesseract is not defined"
**Fix:** Check internet connection, CDN availability

### No Text Detected
**Symptom:** Overlays don't appear
**Fix:** Verify image has text, check language setting

### API Errors
**Symptom:** Translation fails
**Fix:** Check LibreTranslate availability, network connection

### Slow Performance
**Symptom:** Takes very long
**Fix:** Reduce concurrent limit, check image sizes

---

## Quick Test Checklist

Before releasing or after changes:

- [ ] Extension loads
- [ ] Popup works
- [ ] Settings save
- [ ] Translation activates
- [ ] OCR extracts text
- [ ] API translates
- [ ] Overlays display
- [ ] Toggle view works
- [ ] Cache functions
- [ ] No console errors
- [ ] Memory stable
- [ ] Works on test sites

**All checked? Extension ready! ✅**

---

**Happy Testing! 🧪**
