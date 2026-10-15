/* Shared, DOM-independent pipeline rules. Also loaded by the Node regression tests. */
(function (root) {
  'use strict';
  const DEFAULTS = Object.freeze({
    sourceLang: 'en', targetLang: 'ar', fontSize: 20, displayMode: 'overlay', autoTranslate: false,
    overlayBgColor: '#ffffff', overlayOpacity: 1, textColor: '#111111',
    fontFamily: 'Arial, Tahoma, sans-serif', ocrEngine: 'tesseract',
    verticalText: true, minImageSize: 10000, translationAPI: 'google',
    customAPIUrl: '', apiKey: '', apiTimeout: 30, maxConcurrent: 1,
    enableCache: true, cacheExpiry: 7, debugMode: false, showBoundingBoxes: false
  });
  const LANGUAGES = { en: 'eng', fr: 'fra', ar: 'ara', ja: 'jpn', ko: 'kor', zh: 'chi_sim' };
  function settings(input = {}) {
    const s = { ...DEFAULTS, ...input };
    if (!(s.sourceLang in LANGUAGES) && s.sourceLang !== 'auto') s.sourceLang = 'en';
    if (!['overlay', 'panel'].includes(s.displayMode)) s.displayMode = 'overlay';
    if (!/^[a-z]{2}(?:-[A-Za-z]+)?$/.test(s.targetLang)) s.targetLang = 'ar';
    for (const [key, min, max] of [['fontSize', 10, 48], ['apiTimeout', 5, 120], ['cacheExpiry', 1, 30], ['minImageSize', 100, 1000000], ['overlayOpacity', 0, 1]]) {
      s[key] = Number.isFinite(Number(s[key])) ? Math.max(min, Math.min(max, Number(s[key]))) : DEFAULTS[key];
    }
    return s;
  }
  function ocrLanguage(s) {
    if (s.sourceLang === 'auto') return 'eng+fra+ara+jpn+kor+chi_sim';
    return LANGUAGES[s.sourceLang] + (s.sourceLang === 'ja' && s.verticalText ? '+jpn_vert' : '');
  }
  function cleanText(text) {
    return String(text || '').normalize('NFC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/\s+/gu, ' ').trim();
  }
  function validLine(line) {
    const b = line.bbox;
    return b && [b.x0, b.y0, b.x1, b.y1].every(Number.isFinite) && b.x1 > b.x0 && b.y1 > b.y0 &&
      /[\p{L}\p{N}]/u.test(cleanText(line.text)) && (line.confidence == null || line.confidence >= 30);
  }
  const area = b => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0);
  function overlap(a, b) {
    const intersection = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
    return intersection / Math.max(1, Math.min(area(a), area(b)));
  }
  function mergeLines(lines) {
    const out = [];
    // Prefer complete lines: a confident fragment must not replace a whole sentence.
    const score = line => (line.confidence || 0) * Math.sqrt((line.text.match(/[\p{L}\p{N}]/gu) || []).length);
    for (const line of lines.filter(validLine).sort((a, b) => score(b) - score(a))) {
      const other = out.find(other => overlap(other.bbox, line.bbox) > 0.55);
      if (!other) out.push({ ...line, text: cleanText(line.text) });
      else if (other.words?.length && line.words?.length) {
        const words = [];
        for (const word of [...other.words, ...line.words].sort((a, b) => b.confidence - a.confidence)) {
          if (!words.some(w => overlap(w.bbox, word.bbox) > 0.5)) words.push(word);
        }
        words.sort((a, b) => other.rtl ? b.bbox.x0 - a.bbox.x0 : a.bbox.x0 - b.bbox.x0);
        other.words = words;
        other.text = words.map(w => w.text).join(other.separator ?? ' ');
        other.bbox = { x0: Math.min(...words.map(w => w.bbox.x0)), y0: Math.min(...words.map(w => w.bbox.y0)), x1: Math.max(...words.map(w => w.bbox.x1)), y1: Math.max(...words.map(w => w.bbox.y1)) };
        other.confidence = words.reduce((sum, w) => sum + w.confidence, 0) / words.length;
      }
    }
    return out.sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);
  }
  function groupLines(lines, source = 'en') {
    const groups = [];
    for (const line of mergeLines(lines)) {
      const b = line.bbox, h = b.y1 - b.y0;
      let match;
      for (const group of groups) {
        const prev = group.lines[group.lines.length - 1].bbox;
        const ph = prev.y1 - prev.y0;
        const xOverlap = Math.max(0, Math.min(prev.x1, b.x1) - Math.max(prev.x0, b.x0));
        const minWidth = Math.min(prev.x1 - prev.x0, b.x1 - b.x0);
        const gap = b.y0 - prev.y1;
        const centerDistance = Math.abs((b.x0 + b.x1 - prev.x0 - prev.x1) / 2);
        if (gap >= -Math.min(h, ph) * 0.2 && gap < Math.max(h, ph) * 0.85 &&
            xOverlap / minWidth > 0.45 && centerDistance < Math.max(h, ph) * 2.5 &&
            Math.max(h, ph) / Math.min(h, ph) < 2) match = group;
      }
      if (match) {
        match.lines.push(line);
        match.bbox = { x0: Math.min(match.bbox.x0, b.x0), y0: Math.min(match.bbox.y0, b.y0), x1: Math.max(match.bbox.x1, b.x1), y1: Math.max(match.bbox.y1, b.y1) };
      } else groups.push({ bbox: { ...b }, lines: [line] });
    }
    return groups.map(g => ({ ...g, text: g.lines.map(l => l.text).join(['ja', 'zh'].includes(source) ? '' : ' ') }));
  }
  function tiles(width, height, size = 1600, overlapSize = 180) {
    const result = [];
    for (let y = 0; y < height; y += size - overlapSize) {
      for (let x = 0; x < width; x += size - overlapSize) {
        result.push({ x, y, width: Math.min(size, width - x), height: Math.min(size, height - y) });
        if (x + size >= width) break;
      }
      if (y + size >= height) break;
    }
    return result;
  }
  function chunks(text, maxBytes = 450) {
    const encoder = new TextEncoder(), result = [];
    let part = '';
    for (const token of text.match(/\s+|\S+/gu) || []) {
      if (encoder.encode(part + token).length <= maxBytes) { part += token; continue; }
      if (part) { result.push(part); part = ''; }
      // Only split within a token when that token alone exceeds the byte limit.
      for (const char of token) {
        if (encoder.encode(part + char).length > maxBytes && part) { result.push(part); part = ''; }
        part += char;
      }
    }
    if (part) result.push(part);
    return result;
  }
  function cacheKey(url, s) {
    // Keep the complete URL (including query), language pair and OCR revision. No prefix collisions.
    return JSON.stringify([4, url, s.sourceLang, s.targetLang, !!s.verticalText, s.translationAPI, s.customAPIUrl]);
  }
  function cacheValid(entry, s, now = Date.now()) {
    return entry?.version === 4 && entry.timestamp > now - s.cacheExpiry * 86400000 && Array.isArray(entry.result?.regions) && entry.result.regions.length > 0;
  }
  function planImageQueue(images, viewportHeight, ahead = 5) {
    const usable = images.filter(({ rect }) => rect.width > 0 && rect.height > 0);
    const visible = usable.filter(({ rect }) => rect.bottom > 0 && rect.top < viewportHeight).sort((a, b) => a.rect.top - b.rect.top);
    // Count from the reading position, including completed images. Finishing a
    // job must not move this window and start translating the whole chapter.
    const upcoming = usable.filter(({ rect }) => rect.top >= viewportHeight).sort((a, b) => a.rect.top - b.rect.top).slice(0, ahead);
    const behind = usable.filter(({ rect }) => rect.bottom <= 0 && rect.bottom >= -400).sort((a, b) => b.rect.bottom - a.rect.bottom);
    return [...visible, ...upcoming, ...behind];
  }
  const api = { DEFAULTS, LANGUAGES, settings, ocrLanguage, cleanText, validLine, mergeLines, groupLines, tiles, chunks, cacheKey, cacheValid, overlap, planImageQueue };
  root.MangaCore = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
