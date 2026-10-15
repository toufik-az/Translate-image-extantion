# Bundled OCR runtime

- Tesseract.js / worker: 4.1.1, Apache-2.0, https://github.com/naptha/tesseract.js
- Tesseract.js-core: 4.0.4, Apache-2.0, https://github.com/naptha/tesseract.js-core

The `.wasm.js` bundles embed their WebAssembly binary. Firefox uses the SIMD core.
The extension requires Firefox 140 or newer. Run `../download-tesseract.ps1` to
restore these pinned files from jsDelivr. No executable code is loaded from a
CDN during normal use. English, French and Arabic language data is bundled in
`traineddata` from https://tessdata.projectnaptha.com/4.0.0. Restore it with
`python scripts/download-languages.py` from the project root. Other languages
download from the same source on first use. Tesseract caches models in extension IndexedDB.

These third-party files retain their upstream license; see LICENSE-tesseract.txt.

Mozilla's validator reports five warnings in the unmodified Tesseract.js 4.1.1
distributions: three Function-constructor fallbacks used for runtime/global
initialization, and two scanner errors on WebAssembly feature detection. The
extension does not enable `unsafe-eval` or execute text returned by a provider.
The pinned upstream sources are [Tesseract.js v4.1.1](https://github.com/naptha/tesseract.js/tree/v4.1.1)
and [Tesseract.js-core v4.0.4](https://github.com/naptha/tesseract.js-core/tree/v4.0.4).
These warnings remain visible for reviewer inspection rather than changing or
suppressing upstream code to hide them.

Bundled compressed model SHA-256 checksums:

| Model | SHA-256 |
| --- | --- |
| eng.traineddata.gz | ed350f3752f81ee8f38769edc14d92d997dababe23b565c59879372cc46a2468 |
| fra.traineddata.gz | 1c0916fac2dbd6f121ca8a57a92f08e4a119227602c7c984da986222eab6cd3b |
| ara.traineddata.gz | 400ab30fe4f4c4a03feeabe0779a7122cee6aa4fffb1629bb5b1671942859c9e |
