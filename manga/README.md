# 📖 Manga Translator - Firefox Extension

A powerful Firefox browser extension that translates text in manga and manhwa images using **free** OCR and translation services. No API keys required!

## 🌟 Features

- **🔍 Automatic Image Detection** - Scans all images on web pages
- **📝 OCR Text Extraction** - Uses Tesseract.js to extract text from images
- **🌐 Free Translation** - Leverages LibreTranslate API (completely free)
- **🎨 Visual Overlays** - Displays translated text over original images
- **⚡ Client-Side Processing** - Everything runs in your browser
- **💾 Smart Caching** - Avoids re-translating the same images
- **🎯 Multi-Language Support** - Japanese, Korean, Chinese, English, and more
- **⚙️ Customizable** - Font size, colors, opacity, and more

## 🚀 Installation

### Method 1: Install from Files (Recommended for Development)

1. **Download or Clone this Repository**
   ```bash
   git clone <repository-url>
   cd manga-translator-extension
   ```

2. **Open Firefox**

3. **Navigate to Add-ons**
   - Type `about:debugging` in the address bar
   - Click "This Firefox" in the left sidebar

4. **Load the Extension**
   - Click "Load Temporary Add-on"
   - Navigate to the extension folder
   - Select the `manifest.json` file

5. **Done!** The extension is now installed temporarily

### Method 2: Permanent Installation (For Advanced Users)

To install permanently, you'll need to:
1. Package the extension as a `.xpi` file
2. Sign it with Mozilla (or use Firefox Developer Edition/Nightly with signing disabled)

**To create a .xpi file:**
```bash
# Navigate to the extension directory
cd manga-translator-extension

# Create a zip file with all contents
# On Windows (PowerShell):
Compress-Archive -Path * -DestinationPath manga-translator.zip

# Rename to .xpi
Rename-Item manga-translator.zip manga-translator.xpi
```

Then in Firefox:
- Go to `about:addons`
- Click the gear icon ⚙️
- Select "Install Add-on From File"
- Choose your `.xpi` file

## 📖 How to Use

### Basic Usage

1. **Navigate to a manga/manhwa reading website**
   - Examples: Any website with manga panels or manhwa chapters

2. **Click the Extension Icon** in your Firefox toolbar
   - You'll see the popup interface

3. **Select Languages**
   - **Source Language**: Language of the manga (Japanese, Korean, Chinese, or Auto-detect)
   - **Target Language**: Your preferred language (English, Spanish, French, etc.)

4. **Click "Activate Translation"**
   - The extension will:
     - Scan all images on the page
     - Extract text using OCR
     - Translate the text
     - Display translations overlaid on images

5. **Toggle Views**
   - Click "Show Original" to hide translations
   - Click "Show Translations" to show them again

### Advanced Features

#### Settings Page

Access via the ⚙️ Settings button in the popup:

- **Language Settings**
  - Source and target language selection
  - Auto-detection support

- **Appearance Settings**
  - Font size (10-32px)
  - Background color and opacity
  - Text color
  - Font family selection

- **OCR Settings**
  - Vertical text detection (for Japanese manga)
  - Minimum image size filter
  - OCR engine selection

- **Translation API Settings**
  - Choose between public LibreTranslate or custom instance
  - Set API timeout
  - Configure custom API URL

- **Performance Settings**
  - Maximum concurrent translations
  - Caching options
  - Cache expiry duration

- **Advanced Settings**
  - Debug mode for troubleshooting
  - Show bounding boxes (visualize detected text regions)

## 🔧 Technical Details

### Architecture

```
manga-translator-extension/
├── manifest.json           # Extension configuration
├── popup/                  # Browser action popup UI
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── content/                # Content script (runs on web pages)
│   ├── content.js         # Main translation logic
│   └── content.css        # Overlay styles
├── background/             # Background service worker
│   └── background.js
├── options/                # Settings page
│   ├── options.html
│   └── options.js
└── icons/                  # Extension icons
    ├── icon-48.png
    └── icon-96.png
```

### Technologies Used

- **Tesseract.js** - OCR engine (loaded from CDN)
  - Supports multiple languages
  - Runs entirely in browser using WebAssembly
  - GitHub: https://github.com/naptha/tesseract.js

- **LibreTranslate** - Translation API
  - Free and open-source
  - No API key required
  - Public instance: https://libretranslate.com
  - Can be self-hosted: https://github.com/LibreTranslate/LibreTranslate

- **Firefox WebExtensions API**
  - Manifest V2 compatible
  - Storage API for settings and cache
  - Tabs API for page interaction

### How It Works

1. **Image Detection**
   - Content script scans DOM for `<img>` elements
   - Filters by minimum size and visibility
   - Excludes icons and small images

2. **OCR Processing**
   - Tesseract.js worker initialized with selected language
   - Images processed in batches (configurable concurrency)
   - Text bounding boxes extracted

3. **Translation**
   - Detected text sent to LibreTranslate API
   - Source language auto-detected or specified
   - Translated text returned

4. **Overlay Rendering**
   - Translation overlays created as DOM elements
   - Positioned over original images
   - Styled according to user preferences

5. **Caching**
   - Translation results stored in browser storage
   - Cache key based on image URL
   - Automatic expiry after configured days

## 🌐 Supported Languages

### Source Languages (OCR)
- 🇯🇵 Japanese (ja)
- 🇰🇷 Korean (ko)
- 🇨🇳 Chinese Simplified (zh)
- 🇬🇧 English (en)
- 🔄 Auto-detect (multi-language)

### Target Languages (Translation)
- English, Japanese, Korean, Chinese
- Spanish, French, German, Portuguese
- Russian, Arabic, Hindi, Italian
- And many more supported by LibreTranslate

## ⚠️ Limitations & Known Issues

### Current Limitations

1. **OCR Accuracy**
   - Accuracy depends on image quality
   - Works best with clear, high-resolution images
   - May struggle with stylized fonts or handwriting

2. **Translation Quality**
   - LibreTranslate is good but not perfect
   - Context may be lost in short phrases
   - Idioms and cultural references may not translate well

3. **Performance**
   - Processing many large images can be slow
   - First load downloads Tesseract language data (~20MB per language)
   - May use significant memory for large manga chapters

4. **CORS Restrictions**
   - Some websites block cross-origin image access
   - Extension cannot process images from these sites
   - Workaround: Right-click image → "Open in new tab"

### Troubleshooting

**Extension not working?**
- Check console for errors (F12 → Console)
- Enable Debug Mode in settings
- Try refreshing the page
- Reload the extension

**No text detected?**
- Ensure correct source language is selected
- Try "Auto-detect" for source language
- Check if images are high enough resolution
- Verify minimum image size setting isn't too high

**Translation fails?**
- Check internet connection
- LibreTranslate public API may have rate limits
- Consider self-hosting LibreTranslate
- Increase API timeout in settings

**Overlays not displaying correctly?**
- Check overlay opacity settings
- Try different background colors
- Adjust font size
- Disable browser zoom

## 🔐 Privacy & Security

- ✅ **No data collection** - Extension doesn't track or store personal data
- ✅ **Local processing** - OCR runs entirely in your browser
- ✅ **No accounts required** - No sign-up or API keys needed
- ⚠️ **Image data** - Images are processed client-side, but text is sent to LibreTranslate API
- ⚠️ **Self-host option** - For complete privacy, host your own LibreTranslate instance

## 🛠️ Development

### Prerequisites
- Firefox Browser
- Basic knowledge of JavaScript
- Text editor or IDE

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd manga-translator-extension
   ```

2. **Make your changes**
   - Edit files in the extension directory
   - Test changes by reloading extension in Firefox

3. **Reload Extension**
   - Go to `about:debugging`
   - Click "Reload" button next to the extension

4. **Debug**
   - Use browser console for debugging
   - Enable Debug Mode in extension settings
   - Check background script console in `about:debugging`

### Building Icons

If you need to regenerate icons:

**Using Node.js:**
```bash
cd icons
node create_icons.js
```

**Using Python (if Pillow installed):**
```bash
cd icons
pip install Pillow
python create_icons.py
```

**Using Browser:**
Open `icons/generate-icons.html` in a browser

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Ideas for Contributions

- [ ] Support for more OCR engines
- [ ] Better text positioning algorithms
- [ ] Vertical text layout support
- [ ] Offline mode with cached translations
- [ ] Custom translation services integration
- [ ] Keyboard shortcuts
- [ ] Context menu integration
- [ ] Export translated chapters as PDF
- [ ] Support for video/animated content
- [ ] Better error handling and user feedback

## 📝 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- **Tesseract.js** - For the amazing OCR library
- **LibreTranslate** - For free translation API
- **Mozilla** - For the Firefox WebExtensions platform
- **Open Source Community** - For inspiration and tools

## 📞 Support

Having issues? Here's how to get help:

1. **Check the troubleshooting section** in this README
2. **Enable debug mode** and check console logs
3. **Open an issue** on GitHub with:
   - Firefox version
   - Extension version
   - Steps to reproduce the problem
   - Console error messages
   - Screenshots if applicable

## 🔮 Roadmap

Future enhancements planned:

- [ ] Chrome/Edge support (Manifest V3)
- [ ] Better UI/UX with animations
- [ ] Batch download and translate manga chapters
- [ ] Integration with popular manga reading sites
- [ ] Save favorite translations
- [ ] Share translations with others
- [ ] Machine learning for better text detection
- [ ] Support for comic books and webtoons
- [ ] Mobile Firefox support

## ⭐ Star History

If you find this extension useful, please consider giving it a star on GitHub!

---

**Made with ❤️ for manga and manhwa readers worldwide**

**Enjoy reading manga in your language! 📖✨**
