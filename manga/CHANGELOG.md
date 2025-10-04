# Changelog

All notable changes to the Manga Translator extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-04

### Added
- Initial release of Manga Translator extension
- OCR text extraction using Tesseract.js
- Translation using LibreTranslate API (free)
- Visual overlay system for translated text
- Browser action popup interface
- Comprehensive settings page
- Language support:
  - Source: Japanese, Korean, Chinese, English, Auto-detect
  - Target: 12+ languages including English, Spanish, French, etc.
- Appearance customization:
  - Font size adjustment
  - Color customization (background and text)
  - Opacity control
  - Font family selection
- Performance features:
  - Concurrent processing control
  - Translation caching system
  - Cache expiry management
- Advanced features:
  - Debug mode
  - Bounding box visualization
  - Vertical text detection
  - Minimum image size filtering
- UI features:
  - Real-time progress tracking
  - Statistics display (total, processed, failed)
  - Toggle between original and translated views
  - Loading indicators
  - Success/error notifications
- Custom LibreTranslate instance support
- Configurable API timeout
- Automatic cache cleanup
- Dark mode support in CSS
- Reduced motion support for accessibility
- High contrast mode support
- Print-friendly styles
- Mobile responsive design

### Technical Details
- Firefox Manifest V2 compatible
- No external dependencies in production
- Client-side processing for privacy
- Efficient batch processing
- Smart image filtering
- Cross-origin image handling
- Extension state management
- Message passing between components
- Browser storage API for settings and cache

### Documentation
- Comprehensive README.md
- Quick Start Guide (QUICKSTART.md)
- Inline code documentation
- Installation instructions
- Troubleshooting guide
- Development setup guide

### Files Included
- manifest.json - Extension configuration
- popup/ - Browser action interface
  - popup.html, popup.js, popup.css
- content/ - Content script for page interaction
  - content.js, content.css
- background/ - Background service worker
  - background.js
- options/ - Settings page
  - options.html, options.js
- icons/ - Extension icons
  - icon-48.png, icon-96.png
  - Icon generation scripts

### Known Limitations
- OCR accuracy depends on image quality
- Translation quality varies by language pair
- CORS restrictions on some websites
- First load requires downloading OCR data
- Processing large batches can be memory-intensive

### Future Plans
- Chrome/Edge support (Manifest V3)
- Better text positioning algorithms
- Offline translation mode
- Keyboard shortcuts
- Context menu integration
- Export functionality
- Video/animation support
- More OCR engines
- Better error handling

---

## Release Notes

### What's New in v1.0.0

🎉 **First Release!**

This is the initial public release of Manga Translator, a completely free Firefox extension that brings manga and manhwa translation to everyone.

**Key Features:**
- 🆓 100% Free - No API keys or subscriptions
- 🔒 Privacy-Focused - Processing happens in your browser
- 🌐 Multi-Language - Support for Japanese, Korean, Chinese, and more
- ⚡ Fast - Batch processing with intelligent caching
- 🎨 Customizable - Full control over appearance and behavior

**Getting Started:**
1. Install the extension
2. Visit a manga/manhwa site
3. Click the extension icon
4. Select your languages
5. Activate and enjoy!

**Need Help?**
- Read the QUICKSTART.md for quick setup
- Check README.md for detailed documentation
- Enable Debug Mode if you encounter issues

**Feedback Welcome!**
This is the first version, and we'd love to hear your thoughts. Please report any bugs or suggest features!

---

**Thank you for using Manga Translator! 📖✨**
