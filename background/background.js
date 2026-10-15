/* OCR and network access stay in the extension, independent of site CSP and CORS. */
'use strict';
const Core = MangaCore;
const sessions = new Map();
let queue = Promise.resolve(), worker = null, workerLanguage = '', currentJob = null;
let cacheWrites = Promise.resolve();

async function initializeSettings() {
  const saved = await browser.storage.sync.get();
  await browser.storage.sync.set(Object.fromEntries(Object.entries(Core.DEFAULTS).filter(([key]) => saved[key] === undefined)));
}
initializeSettings().catch(console.error);
function cancelTab(tabId) {
  sessions.delete(tabId);
  if (currentJob?.tabId === tabId) currentJob.controller.abort();
}
browser.tabs.onRemoved.addListener(cancelTab);
browser.tabs.onUpdated.addListener((id, info) => { if (info.status === 'loading') cancelTab(id); });
browser.runtime.onMessage.addListener((message, sender) => {
  const tabId = sender.tab?.id;
  if (message.action === 'beginSession' && tabId != null) {
    cancelTab(tabId);
    sessions.set(tabId, message.session);
    return Promise.resolve({ ok: true });
  }
  if (message.action === 'cancelSession' && tabId != null) {
    if (sessions.get(tabId) === message.session) cancelTab(tabId);
    return Promise.resolve({ ok: true });
  }
  if (message.action === 'processImage' && tabId != null) {
    const job = { ...message, tabId, pageUrl: sender.tab.url, controller: new AbortController(), settings: Core.settings(message.settings) };
    const pending = queue.then(() => runJob(job));
    queue = pending.catch(() => {});
    return pending.then(result => ({ ok: true, result }), error => ({ ok: false, error: error.message }));
  }
  return undefined;
});
function check(job) {
  if (job.controller.signal.aborted || sessions.get(job.tabId) !== job.session) throw new Error(job.fatalError || 'Translation cancelled');
}
function progress(job, message) {
  browser.tabs.sendMessage(job.tabId, { action: 'jobProgress', session: job.session, message }).catch(() => {});
}
function disposeWorker() {
  const old = worker;
  worker = null; workerLanguage = '';
  if (old) Promise.resolve(old.terminate()).catch(() => {});
}
async function bounded(job, task, ms, label) {
  check(job);
  let timer, onAbort;
  const cancelled = new Promise((_, reject) => {
    onAbort = () => reject(new Error(job.fatalError || 'Translation cancelled'));
    job.controller.signal.addEventListener('abort', onAbort, { once: true });
    timer = setTimeout(() => { job.expired = true; reject(new Error(`${label} timed out. Check your connection and retry.`)); }, ms);
  });
  try { return await Promise.race([Promise.resolve().then(task), cancelled]); }
  finally { clearTimeout(timer); job.controller.signal.removeEventListener('abort', onAbort); }
}
async function getWorker(job) {
  const language = Core.ocrLanguage(job.settings);
  if (worker && workerLanguage === language) return worker;
  disposeWorker();
  const bundled = language.split('+').every(code => ['eng', 'fra', 'ara'].includes(code));
  progress(job, `Loading OCR languages: ${language}${bundled ? '' : ' (first use downloads language data)'}…`);
  const created = await Tesseract.createWorker({
    workerPath: browser.runtime.getURL('libs/worker.min.js'),
    corePath: browser.runtime.getURL('libs/tesseract-core-simd.wasm.js'),
    langPath: bundled ? browser.runtime.getURL('libs/traineddata') : 'https://tessdata.projectnaptha.com/4.0.0', workerBlobURL: false,
    logger: m => { if (currentJob) progress(currentJob, `${m.status} ${Math.round((m.progress || 0) * 100)}%`); },
    errorHandler: error => { console.error('[Manga Translator OCR]', error); if (currentJob) { currentJob.fatalError = `OCR failed: ${error.message || error}`; currentJob.controller.abort(); } }
  });
  try { check(job); if (job.expired) throw new Error('OCR initialization timed out'); }
  catch (error) { await created.terminate(); throw error; }
  worker = created;
  await created.loadLanguage(language);
  await created.initialize(language, Tesseract.OEM.LSTM_ONLY);
  await created.setParameters({ preserve_interword_spaces: '1', user_defined_dpi: '300' });
  workerLanguage = language;
  return created;
}
async function fetchChecked(job, url, options = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  job.controller.signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, job.settings.apiTimeout * 1000);
  try {
    check(job);
    const response = await fetch(url, { ...options, signal: controller.signal, credentials: 'omit' });
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
    return options.responseType === 'blob' ? await response.blob() : await response.json();
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Request cancelled or timed out');
    throw error;
  } finally { clearTimeout(timer); job.controller.signal.removeEventListener('abort', abort); }
}
async function loadImage(job) {
  const url = new URL(job.url);
  if (!['https:', 'http:', 'data:'].includes(url.protocol) || (url.protocol === 'data:' && !job.url.startsWith('data:image/'))) throw new Error('Unsupported image URL');
  // Some manga CDNs reject downloads without the reader's Referer. Scope this to
  // our own single image request; never change requests made by a website.
  const extensionOrigin = browser.runtime.getURL('');
  const referer = (() => { try { return new URL(job.pageUrl).origin + '/'; } catch { return ''; } })();
  const addReferer = details => {
    if (details.url !== url.href || !details.originUrl?.startsWith(extensionOrigin) || !/^https?:/.test(referer)) return {};
    const headers = (details.requestHeaders || []).filter(h => h.name.toLowerCase() !== 'referer');
    headers.push({ name: 'Referer', value: referer });
    return { requestHeaders: headers };
  };
  if (url.protocol !== 'data:') browser.webRequest.onBeforeSendHeaders.addListener(addReferer, { urls: ['<all_urls>'], types: ['xmlhttprequest'] }, ['blocking', 'requestHeaders']);
  let blob;
  try { blob = await fetchChecked(job, url.href, { responseType: 'blob', cache: 'force-cache' }); }
  finally { if (browser.webRequest.onBeforeSendHeaders.hasListener(addReferer)) browser.webRequest.onBeforeSendHeaders.removeListener(addReferer); }
  if (blob.size > 40 * 1024 * 1024) throw new Error('Image exceeds the 40 MB processing limit');
  const bitmap = await createImageBitmap(blob);
  if (bitmap.width * bitmap.height > 60000000) { bitmap.close(); throw new Error('Image exceeds the 60 megapixel processing limit'); }
  return bitmap;
}
async function recognize(job, bitmap) {
  const w = await bounded(job, () => getWorker(job), 180000, 'OCR initialization');
  const crop = job.crop;
  const bounds = crop ? { x: Math.max(0, crop.x), y: Math.max(0, crop.y), width: Math.min(crop.width, bitmap.width - crop.x), height: Math.min(crop.height, bitmap.height - crop.y) } : { x: 0, y: 0, width: bitmap.width, height: bitmap.height };
  if (!(bounds.width > 0 && bounds.height > 0)) throw new Error('Invalid selected area');
  const pieces = Core.tiles(bounds.width, bounds.height).map(t => ({ ...t, x: t.x + bounds.x, y: t.y + bounds.y }));
  const lines = [];
  for (let i = 0; i < pieces.length; i++) {
    check(job);
    progress(job, `Reading image section ${i + 1}/${pieces.length}…`);
    const tile = pieces[i], scale = Math.min(2, 2000 / Math.max(tile.width, tile.height)), padding = 24;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(tile.width * scale) + padding * 2;
    canvas.height = Math.round(tile.height * scale) + padding * 2;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, tile.x, tile.y, tile.width, tile.height, padding, padding, canvas.width - padding * 2, canvas.height - padding * 2);
    const masked = crop ? null : speechMask(canvas);
    const enhanced = strengthenInk(masked || canvas);
    const passes = crop ? [{ image: canvas, psm: Tesseract.PSM.SINGLE_BLOCK, confidence: 25 }, { image: enhanced, psm: Tesseract.PSM.SINGLE_BLOCK, confidence: 25 }] : [
      { image: masked, psm: Tesseract.PSM.SPARSE_TEXT, confidence: 40 },
      { image: canvas, psm: Tesseract.PSM.SPARSE_TEXT, confidence: 65 },
      { image: enhanced, psm: Tesseract.PSM.SPARSE_TEXT, confidence: 40, recovery: true }
    ];
    for (const pass of passes) {
      const data = await bounded(job, async () => {
        await w.setParameters({ tessedit_pageseg_mode: pass.psm });
        return (await w.recognize(pass.image)).data;
      }, 90000, 'Text recognition');
      const sx = (canvas.width - padding * 2) / tile.width, sy = (canvas.height - padding * 2) / tile.height;
      const mapBox = b => ({ x0: Math.max(0, tile.x + (b.x0 - padding) / sx), y0: Math.max(0, tile.y + (b.y0 - padding) / sy), x1: Math.min(bitmap.width, tile.x + (b.x1 - padding) / sx), y1: Math.min(bitmap.height, tile.y + (b.y1 - padding) / sy) });
      for (const line of readableLines(data, canvas, pass.confidence, !!crop)) {
        const mapped = { ...line, rtl: job.settings.sourceLang === 'ar' || (job.settings.sourceLang === 'auto' && /\p{Script=Arabic}/u.test(line.text)), separator: ['ja', 'zh'].includes(job.settings.sourceLang) ? '' : ' ', bbox: mapBox(line.bbox), words: line.words.map(word => ({ ...word, bbox: mapBox(word.bbox) })) };
        if (pass.recovery) {
          // Boosted contrast can turn isolated artwork marks into letters. Keep
          // recovered sentence fragments, or independently supported phrases.
          const phrase = line.words.filter(word => /[\p{L}\p{N}]/u.test(word.text)).length >= 2 && line.confidence >= 65;
          const connected = lines.some(other => {
            const a = other.bbox, b = mapped.bbox, h = a.y1 - a.y0, bh = b.y1 - b.y0;
            const overlapY = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
            const gap = Math.max(0, a.x0 - b.x1, b.x0 - a.x1);
            return overlapY > Math.min(h, bh) * 0.5 && Math.max(h, bh) < Math.min(h, bh) * 2.2 && gap < Math.max(h, bh) * 3;
          });
          if (!phrase && !connected) continue;
        }
        lines.push(mapped);
      }
    }
    if (masked) masked.width = masked.height = 1;
    enhanced.width = enhanced.height = 1;
    canvas.width = canvas.height = 1;
  }
  return Core.groupLines(lines, job.settings.sourceLang);
}
async function translate(job, text) {
  const s = job.settings;
  if (s.sourceLang === s.targetLang) return text;
  const service = s.translationAPI, translated = [];
  for (const part of Core.chunks(text, service === 'mymemory' ? 450 : 3000)) {
    check(job);
    let output;
    if (service === 'google') {
      const url = new URL('https://translate.googleapis.com/translate_a/single');
      url.search = new URLSearchParams({ client: 'gtx', sl: s.sourceLang, tl: s.targetLang, dt: 't', q: part });
      const data = await fetchChecked(job, url.href);
      output = Array.isArray(data?.[0]) ? data[0].map(segment => segment?.[0] || '').join('') : '';
    } else if (service === 'mymemory') {
      if (s.sourceLang === 'auto') throw new Error('MyMemory needs a specific source language. Select English, French, Arabic, etc.');
      const url = new URL('https://api.mymemory.translated.net/get');
      url.search = new URLSearchParams({ q: part, langpair: `${s.sourceLang}|${s.targetLang}` });
      const data = await fetchChecked(job, url.href);
      if (Number(data.responseStatus) !== 200 || data.quotaFinished) throw new Error(data.responseDetails || 'MyMemory quota exceeded');
      output = data.responseData?.translatedText;
    } else if (service === 'libretranslate' || service === 'libretranslate-custom') {
      const base = (service === 'libretranslate-custom' ? s.customAPIUrl.trim() : 'https://libretranslate.com').replace(/\/+$/, '');
      if (!base) throw new Error('Set your LibreTranslate server URL in Settings');
      const url = new URL(base + (base.endsWith('/translate') ? '' : '/translate'));
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error('LibreTranslate URL must use HTTP or HTTPS');
      const body = { q: part, source: s.sourceLang, target: s.targetLang, format: 'text' };
      if (s.apiKey) body.api_key = s.apiKey;
      const data = await fetchChecked(job, url.href, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (data.error) throw new Error(data.error);
      output = data.translatedText;
    } else throw new Error(`Unknown translation service: ${service}`);
    if (typeof output !== 'string' || !output.trim()) throw new Error('Translation service returned no text');
    translated.push(output);
  }
  return translated.join(' ');
}
async function writeCache(key, result) {
  cacheWrites = cacheWrites.catch(() => {}).then(async () => {
    const { translationCache = {} } = await browser.storage.local.get('translationCache');
    translationCache[key] = { version: 4, timestamp: Date.now(), result };
    const entries = Object.entries(translationCache).filter(([, e]) => e.version === 4 && e.timestamp > Date.now() - 30 * 86400000).sort((a, b) => b[1].timestamp - a[1].timestamp).slice(0, 150);
    await browser.storage.local.set({ translationCache: Object.fromEntries(entries) });
  });
  await cacheWrites;
}
async function runJob(job) {
  check(job); currentJob = job;
  let bitmap;
  try {
    const key = Core.cacheKey(job.url, job.settings);
    if (job.settings.enableCache && !job.force && !job.crop) {
      const { translationCache = {} } = await browser.storage.local.get('translationCache');
      if (Core.cacheValid(translationCache[key], job.settings)) return translationCache[key].result;
    }
    progress(job, 'Loading original image…');
    bitmap = await loadImage(job);
    const regions = await recognize(job, bitmap);
    if (!regions.length && job.crop) throw new Error('No readable text found in this area. Check the source language and select a larger area.');
    for (let i = 0; i < regions.length; i++) {
      progress(job, `Translating text region ${i + 1}/${regions.length}…`);
      regions[i].translated = await translate(job, regions[i].text);
    }
    check(job);
    const result = { width: bitmap.width, height: bitmap.height, regions };
    if (job.settings.enableCache && !job.crop && regions.length) await writeCache(key, result).catch(console.warn);
    return result;
  } catch (error) { disposeWorker(); throw error; }
  finally { bitmap?.close(); currentJob = null; }
}
