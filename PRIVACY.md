# Manga Translator privacy policy

Updated October 15, 2026.

Manga Translator recognizes text in website images and translates it using a service you choose. The extension does not run an analytics service or send crash reports to its developer.

## Image requests and recognition

When you enable translation, the extension downloads images from their original URLs and processes them locally with Tesseract in your browser. Visible images and the next five images can be processed automatically. Image requests go to the website or image host, which receives the image URL, your IP address, normal network request information, and the reading site's origin as the Referer when needed. Image URLs can include query parameters. The extension does not send image bytes to the translation provider.

English, French, and Arabic OCR models are included. Other languages download model files from `tessdata.projectnaptha.com`. That host receives the language-file request and normal network request information, but not the images or recognized text.

## Translation requests

The extension sends recognized text, source and target languages, and request information to the selected service:

- Google Translate: `translate.googleapis.com`.
- MyMemory: `api.mymemory.translated.net`.
- LibreTranslate public service: `libretranslate.com`.
- Custom LibreTranslate: the server URL you enter in Advanced settings.

The service receives your IP address and normal network request information. The extension uses requests without browser cookies or other ambient credentials. If the source and target language are the same, it returns the recognized text without sending a translation request.

If you provide a LibreTranslate API key, the extension sends that key only to the selected LibreTranslate server and only while Firefox's optional authentication-information permission is granted. Saving a key for LibreTranslate requests that permission. Revoking it blocks requests that would send the key until you grant permission again or clear the key.

Each provider controls its own processing and retention. A custom server can use HTTP if you configure it that way; use HTTPS for remote servers, particularly when sending an API key.

## Saved data

Preferences, including language choices, provider, custom server URL, and a saved API key, use Firefox sync storage. They may synchronize through Firefox Sync according to your browser and account settings.

If caching is enabled, image URLs, recognized text, translations, text coordinates, and timestamps are saved in local extension storage. The cache keeps up to 150 entries and uses the expiry selected in settings, from 1 to 30 days. OCR language files are cached locally by Tesseract.

## Your controls

Use the popup switch to stop translation on a page. Advanced settings can disable automatic translation on new pages, change providers, remove an API key, disable caching, clear the translation cache, or reset preferences. Firefox's extension settings let you manage the optional authentication-information permission or remove the extension.

Firefox 140 or newer requests consent for website content and browsing information during installation. The extension does not transmit mouse movements, scroll events, or usage statistics to its developer.

## Contact

For privacy questions, contact the maintainer through the [project's GitHub issues](https://github.com/toufik-az/Translate-image-extantion/issues). Do not post private text or API keys in an issue.
