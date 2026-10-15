(() => {
  'use strict';
  if (globalThis.__mangaTranslatorInstalled) return;
  globalThis.__mangaTranslatorInstalled = true;
  const C = MangaCore;
  let settings = C.settings(), active = false, processing = false, session = '', original = false;
  let entries = new Map(), pending = [], running = false, message = '', lastError = '';
  let observer, mutations, resize, timer, scanTimer, frame, selection;
  const host = document.createElement('div');
  host.id = 'manga-translator-root';
  host.style.cssText = 'all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483646;';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>
    :host{font-family:Arial,Tahoma,sans-serif}
    .layer{position:absolute;pointer-events:none;overflow:hidden}
    .box{position:absolute;box-sizing:border-box;display:flex;align-items:center;justify-content:center;text-align:center;padding:3px;border-radius:3px;pointer-events:auto;overflow:hidden;}
    .text{width:100%;white-space:normal;overflow-wrap:break-word;line-height:1.15;font-weight:600;unicode-bidi:plaintext}
    .image-tools{position:absolute;display:flex;gap:5px;z-index:2;pointer-events:auto}
    .image-tools button{width:30px;height:30px;padding:0;border:0;border-radius:50%;background:#fffffff2;color:#1a73e8;font:700 12px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 1px 3px #0004}
    .image-tools button:hover{background:#1a73e8;color:white}.image-tools button:focus-visible{outline:2px solid #1a73e8;outline-offset:2px}
    .reader-panel{box-sizing:border-box;height:100%;padding:44px 18px 18px;background:#fff;color:#202124;overflow:auto;pointer-events:auto;font:16px/1.6 system-ui,Tahoma,sans-serif}
    .reader-panel p{margin:0 0 12px;unicode-bidi:plaintext}.reader-panel details{font-size:12px;color:#5f6368;margin-bottom:16px}.reader-panel summary{cursor:pointer}.reader-panel .heading{font-size:12px;color:#5f6368;margin-bottom:18px}
    @media(prefers-color-scheme:dark){.reader-panel{background:#1f1f23;color:#e8eaed}.reader-panel details,.reader-panel .heading{color:#9aa0a6}.image-tools button{background:#1f1f23;color:#8ab4f8}}
    .box:hover{opacity:.16}.box:focus{opacity:1;outline:2px solid #3478ef;overflow:auto}
    .badge{position:fixed;bottom:12px;left:12px;max-width:380px;padding:9px 12px;background:#17212f;color:white;font:13px/1.4 Arial,sans-serif;border-radius:6px;box-shadow:0 2px 10px #0003;pointer-events:none}
    .select{position:fixed;inset:0;cursor:crosshair;pointer-events:auto;background:#0002;touch-action:none;z-index:10}
    .rect{position:absolute;border:2px solid #2684ff;background:#2684ff22;pointer-events:none}
    @media print{.badge{display:none}}
  </style>`;
  const badge = document.createElement('div'); badge.className = 'badge'; badge.hidden = true; shadow.append(badge);
  const stats = () => ({ total: entries.size, processed: [...entries.values()].filter(e => e.status === 'done').length, skipped: [...entries.values()].filter(e => e.status === 'empty').length, failed: [...entries.values()].filter(e => e.status === 'error').length });
  const snapshot = () => ({ isActive: active, isProcessing: processing, showingOriginal: original, hasTranslations: [...entries.values()].some(e => e.result?.regions.length), stats: stats(), message, error: lastError });
  function report(text) {
    if (text) message = text;
    badge.hidden = !active;
    badge.textContent = message;
    browser.runtime.sendMessage({ action: 'updatePopup', ...snapshot() }).catch(() => {});
  }
  function imageURL(img) {
    // Webtoon keeps the full chapter URLs in data-url while src is a 1px placeholder.
    const lazy = img.getAttribute('data-url') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
    const src = lazy || img.currentSrc || img.src;
    try { return src ? new URL(src, document.baseURI).href : ''; } catch { return ''; }
  }
  function updateQueue() {
    if (!active) return;
    const planned = C.planImageQueue([...entries.values()].filter(e => e.img.isConnected).map(entry => ({ entry, rect: entry.img.getBoundingClientRect() })), innerHeight);
    const rank = new Map(planned.map(({ entry }, index) => [entry, index]));
    // Drop automatic work left behind by a jump, but retain explicit retries
    // and selections. An already running image is allowed to finish.
    pending = pending.filter(task => {
      const valid = task.entry.img.isConnected && task.src === task.entry.src && task.session === session;
      if (valid && (task.force || rank.has(task.entry))) return true;
      if (task.entry.status === 'queued' && task.src === task.entry.src && task.session === session) task.entry.status = 'idle';
      return false;
    });
    for (const { entry } of planned) enqueue(entry);
    pending.sort((a, b) => Number(b.force) - Number(a.force) || (rank.get(a.entry) ?? Infinity) - (rank.get(b.entry) ?? Infinity));
  }
  function discover() {
    if (!active) return;
    const chapter = document.querySelector('#_imageList');
    const images = (chapter || document).querySelectorAll('img');
    for (const img of images) {
      const src = imageURL(img), rect = img.getBoundingClientRect();
      const width = Math.max(img.naturalWidth || 0, rect.width), height = Math.max(img.naturalHeight || 0, rect.height);
      if (!src || width < 100 || height < 70 || width * height < settings.minImageSize || getComputedStyle(img).display === 'none') continue;
      let entry = entries.get(img);
      if (!entry) {
        entry = { img, src, status: 'idle', layer: null, result: null };
        entries.set(img, entry); createControls(entry); observer.observe(img); resize.observe(img);
      } else if (entry.src !== src) {
        entry.src = src; entry.status = 'idle'; entry.result = null; entry.layer?.remove(); entry.layer = null;
      }
    }
    for (const [img, entry] of entries) if (!img.isConnected) {
      observer.unobserve(img); resize.unobserve(img); entry.layer?.remove(); entry.controls?.remove(); entries.delete(img);
    }
    updateQueue(); report();
  }
  function enqueue(entry, force = false, crop = null) {
    if (!active || (['queued', 'working'].includes(entry.status)) || (!force && entry.status !== 'idle')) return;
    entry.status = 'queued';
    pending.push({ entry, force, crop, src: entry.src, session });
    // Batch discovery before starting, so an earlier DOM image cannot beat the
    // image currently on screen merely because it was discovered first.
    queueMicrotask(() => void drain());
  }
  async function drain() {
    if (running) return;
    running = true;
    const runSession = session;
    try {
      while (active && runSession === session) {
        updateQueue();
        if (!pending.length) break;
        const task = pending.shift(), { entry } = task;
        if (!entry.img.isConnected || task.src !== entry.src || task.session !== session) continue;
        processing = true; entry.status = 'working'; lastError = '';
        report('Reading image…');
        try {
          let url = task.src;
          if (url.startsWith('blob:')) {
            const canvas = document.createElement('canvas');
            canvas.width = entry.img.naturalWidth; canvas.height = entry.img.naturalHeight;
            canvas.getContext('2d').drawImage(entry.img, 0, 0);
            url = canvas.toDataURL('image/png');
          }
          const response = await browser.runtime.sendMessage({ action: 'processImage', session: runSession, url, settings, force: task.force, crop: task.crop });
          if (!active || session !== runSession || entry.src !== task.src) continue;
          if (!response?.ok) throw new Error(response?.error || 'Extension background did not respond');
          let result = response.result;
          if (task.crop && entry.result) result = { ...result, regions: [...entry.result.regions.filter(r => C.overlap(r.bbox, { x0: task.crop.x, y0: task.crop.y, x1: task.crop.x + task.crop.width, y1: task.crop.y + task.crop.height }) < 0.2), ...result.regions] };
          entry.result = result; entry.status = result.regions.length ? 'done' : 'empty'; entry.error = '';
          render(entry);
        } catch (error) {
          if (!active || session !== runSession) continue;
          entry.status = 'error'; entry.error = error.message; lastError = error.message;
          report(error.message);
        }
      }
    } finally {
      running = false;
      if (runSession === session) {
        processing = false;
        const s = stats();
        report(lastError || `${s.processed}/${s.total} images translated${s.skipped ? ` · ${s.skipped} without detected text` : ''}${s.failed ? ` · ${s.failed} need retry` : ''}. Scroll to read more.`);
      }
      if (active && pending.length) void drain();
    }
  }
  function render(entry) {
    entry.layer?.remove();
    if (!entry.result.regions.length) { entry.layer = null; return; }
    const layer = document.createElement('div'); layer.className = 'layer';
    entry.layer = layer;
    if (settings.displayMode === 'panel') {
      const panel = document.createElement('section'); panel.className = 'reader-panel';
      const heading = document.createElement('div'); heading.className = 'heading'; heading.textContent = 'Translation'; panel.append(heading);
      for (const region of entry.result.regions) {
        const text = document.createElement('p'); text.textContent = region.translated; text.lang = settings.targetLang; text.dir = ['ar', 'he', 'fa', 'ur'].includes(settings.targetLang) ? 'rtl' : 'ltr';
        const source = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent = 'Original text';
        const originalText = document.createElement('p'); originalText.textContent = region.text; originalText.dir = 'auto'; source.append(summary, originalText); panel.append(text, source);
      }
      layer.append(panel); shadow.append(layer); layoutEntry(entry); return;
    }
    for (const region of entry.result.regions) {
      const box = document.createElement('div'); box.className = 'box'; box.tabIndex = 0;
      box.title = region.text; box.setAttribute('aria-label', `${region.translated} — ${region.text}`);
      const text = document.createElement('div'); text.className = 'text';
      text.textContent = region.translated; text.lang = settings.targetLang;
      text.dir = ['ar', 'he', 'fa', 'ur'].includes(settings.targetLang) ? 'rtl' : 'ltr';
      box.append(text); layer.append(box); box._region = region;
    }
    shadow.append(layer); layoutEntry(entry);
  }
  function createControls(entry) {
    const controls = document.createElement('div'); controls.className = 'image-tools';
    const toggle = document.createElement('button'); toggle.type = 'button'; toggle.textContent = '文A'; toggle.title = 'Translate this image / show original'; toggle.setAttribute('aria-label', toggle.title);
    toggle.onclick = () => { if (entry.result?.regions.length) { entry.hidden = !entry.hidden; layoutEntry(entry); } else enqueue(entry, true); };
    const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = '↻'; retry.title = 'Read and translate this image again'; retry.setAttribute('aria-label', retry.title);
    retry.onclick = () => { entry.hidden = false; enqueue(entry, true); };
    controls.append(toggle, retry); shadow.append(controls); entry.controls = controls; layoutEntry(entry);
  }
  function layoutEntry(entry) {
    const r = entry.img.getBoundingClientRect(), result = entry.result, layer = entry.layer;
    const invisible = !active || r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > innerHeight;
    if (entry.controls) {
      Object.assign(entry.controls.style, { display: invisible ? 'none' : 'flex', left: `${r.left + 8}px`, top: `${r.top + 8}px` });
      entry.controls.firstChild.textContent = ['working', 'queued'].includes(entry.status) ? '…' : entry.status === 'error' ? '!' : entry.result?.regions.length && !entry.hidden && !original ? '✓' : '文A';
    }
    if (!layer || !result) return;
    layer.style.display = original || entry.hidden || invisible ? 'none' : 'block';
    Object.assign(layer.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    if (settings.displayMode === 'panel') return;
    const sx = r.width / result.width, sy = r.height / result.height;
    for (const box of layer.children) {
      const b = box._region.bbox, pad = 5;
      const x = Math.max(0, b.x0 * sx - pad), y = Math.max(0, b.y0 * sy - pad);
      const width = Math.min(r.width - x, (b.x1 - b.x0) * sx + pad * 2), height = Math.min(r.height - y, (b.y1 - b.y0) * sy + pad * 2);
      const hex = /^#[0-9a-f]{6}$/i.test(settings.overlayBgColor) ? settings.overlayBgColor : '#ffffff';
      const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
      Object.assign(box.style, { left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px`, background: `rgba(${rgb},${settings.overlayOpacity})`, color: settings.textColor, fontFamily: settings.fontFamily, outline: settings.showBoundingBoxes ? '2px solid #2684ff' : '' });
      const text = box.firstElementChild;
      let size = Math.min(settings.fontSize, Math.max(12, height * 0.65));
      text.style.fontSize = `${size}px`;
      // scrollWidth/clientWidth are rounded integers. Comparing them with a
      // fractional CSS width can shrink perfectly fitting text down to 9px.
      while (size > 9 && (text.scrollHeight > box.clientHeight - 5 || text.scrollWidth > text.clientWidth + 1)) { size--; text.style.fontSize = `${size}px`; }
    }
  }
  function layout() { frame = null; for (const e of entries.values()) layoutEntry(e); updateQueue(); }
  function scheduleLayout() { if (!frame) frame = requestAnimationFrame(layout); }
  function scheduleScan() { clearTimeout(scanTimer); scanTimer = setTimeout(discover, 150); }
  async function start(input) {
    stop(); settings = C.settings(input); active = true; original = false; lastError = '';
    session = `${Date.now()}-${Math.random()}`;
    const thisSession = session;
    document.documentElement.append(host);
    await browser.runtime.sendMessage({ action: 'beginSession', session });
    if (!active || thisSession !== session) return;
    observer = new IntersectionObserver(scheduleLayout, { rootMargin: '800px 0px' });
    resize = new ResizeObserver(scheduleLayout);
    mutations = new MutationObserver(scheduleScan);
    mutations.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcset', 'data-src', 'data-url', 'data-lazy-src'] });
    document.addEventListener('load', scheduleScan, true);
    window.addEventListener('scroll', scheduleLayout, true); window.addEventListener('resize', scheduleLayout);
    timer = setInterval(scheduleLayout, 750);
    discover();
    if (!entries.size) report('No chapter images found yet. Open a chapter and scroll to its images.');
  }
  function stop() {
    const old = session;
    active = false; processing = false; session = ''; pending = []; lastError = '';
    observer?.disconnect(); mutations?.disconnect(); resize?.disconnect();
    clearInterval(timer); clearTimeout(scanTimer); cancelAnimationFrame(frame); frame = null;
    document.removeEventListener('load', scheduleScan, true);
    window.removeEventListener('scroll', scheduleLayout, true); window.removeEventListener('resize', scheduleLayout);
    closeSelection();
    for (const e of entries.values()) { e.layer?.remove(); e.controls?.remove(); }
    entries = new Map(); host.remove();
    if (old) browser.runtime.sendMessage({ action: 'cancelSession', session: old }).catch(() => {});
    report('Inactive');
  }
  function closeSelection() { selection?.remove(); selection = null; window.removeEventListener('keydown', cancelSelection); }
  function cancelSelection(e) { if (e.key === 'Escape') { closeSelection(); report('Area selection cancelled.'); } }
  function selectArea() {
    if (!active) throw new Error('Activate translation first');
    closeSelection();
    selection = document.createElement('div'); selection.className = 'select';
    const rect = document.createElement('div'); rect.className = 'rect'; selection.append(rect); shadow.append(selection);
    report('Drag a rectangle around one speech bubble. Press Escape to cancel.');
    let point, entry;
    selection.onpointerdown = e => {
      entry = [...entries.values()].find(item => { const r = item.img.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; });
      if (!entry) return;
      point = { x: e.clientX, y: e.clientY }; selection.setPointerCapture(e.pointerId);
    };
    selection.onpointermove = e => { if (point) Object.assign(rect.style, { left: `${Math.min(point.x, e.clientX)}px`, top: `${Math.min(point.y, e.clientY)}px`, width: `${Math.abs(e.clientX - point.x)}px`, height: `${Math.abs(e.clientY - point.y)}px` }); };
    selection.onpointerup = e => {
      if (!point || !entry) return;
      const r = entry.img.getBoundingClientRect();
      const nw = entry.result?.width || entry.img.naturalWidth, nh = entry.result?.height || entry.img.naturalHeight;
      const x0 = Math.max(r.left, Math.min(point.x, e.clientX)), y0 = Math.max(r.top, Math.min(point.y, e.clientY));
      const x1 = Math.min(r.right, Math.max(point.x, e.clientX)), y1 = Math.min(r.bottom, Math.max(point.y, e.clientY));
      closeSelection();
      if (x1 - x0 < 8 || y1 - y0 < 8 || !nw || !nh) { report('Select a larger area on a loaded image.'); return; }
      if (['queued', 'working'].includes(entry.status)) { report('Wait for this image to finish, then select the area again.'); return; }
      enqueue(entry, true, { x: (x0 - r.left) * nw / r.width, y: (y0 - r.top) * nh / r.height, width: (x1 - x0) * nw / r.width, height: (y1 - y0) * nh / r.height });
    };
    window.addEventListener('keydown', cancelSelection);
  }
  browser.runtime.onMessage.addListener(msg => {
    switch (msg.action) {
      case 'ping': return Promise.resolve({ status: 'ready' });
      case 'getState': return Promise.resolve(snapshot());
      case 'startTranslation': void start(msg.settings).catch(e => { stop(); lastError = e.message; report(e.message); }); return Promise.resolve({ success: true });
      case 'stopTranslation': stop(); return Promise.resolve({ success: true });
      case 'toggleView': original = !original; layout(); report(); return Promise.resolve(snapshot());
      case 'retryFailed': for (const e of entries.values()) if (e.status === 'error') enqueue(e, true); return Promise.resolve({ success: true });
      case 'selectArea': selectArea(); return Promise.resolve({ success: true });
      case 'updateSettings': if (active) void start({ ...settings, ...msg }); return Promise.resolve({ success: true });
      case 'jobProgress': if (msg.session === session && active) report(msg.message); return undefined;
      default: return undefined;
    }
  });
  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    void browser.storage.sync.get().then(input => {
      const next = C.settings(input);
      if (active && (C.cacheKey('', settings) !== C.cacheKey('', next) || settings.minImageSize !== next.minImageSize)) return start(next);
      settings = next;
      if (active) { for (const e of entries.values()) if (e.result) render(e); report(); }
      else if (changes.autoTranslate?.newValue) return start(next);
    }).catch(console.error);
  });
  browser.storage.sync.get().then(input => { if (!active && input.autoTranslate) return start(input); }).catch(console.error);
  window.addEventListener('pagehide', stop, { once: true });
})();
