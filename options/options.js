'use strict';
const keys = ['autoTranslate', 'sourceLang', 'targetLang', 'displayMode', 'verticalText', 'minImageSize', 'showBoundingBoxes', 'fontSize', 'overlayBgColor', 'textColor', 'overlayOpacity', 'fontFamily', 'translationAPI', 'customAPIUrl', 'apiKey', 'apiTimeout', 'enableCache', 'cacheExpiry'];
const $ = id => document.getElementById(id);
function preview() { $('fontSizeValue').value = `${$('fontSize').value}px`; $('opacityValue').value = `${Math.round($('overlayOpacity').value * 100)}%`; $('libreBox').hidden = !$('translationAPI').value.startsWith('libretranslate'); $('customAPIUrl').disabled = $('translationAPI').value !== 'libretranslate-custom'; }
async function load() { const values = await browser.storage.sync.get(MangaCore.DEFAULTS); for (const key of keys) { const input = $(key); if (input.type === 'checkbox') input.checked = values[key]; else input.value = values[key]; } preview(); }
function status(text) { $('status').textContent = text; }
$('settingsForm').addEventListener('submit', async e => {
  e.preventDefault(); const values = {};
  for (const key of keys) { const input = $(key); values[key] = input.type === 'checkbox' ? input.checked : ['number', 'range'].includes(input.type) ? Number(input.value) : input.value; }
  try { await browser.storage.sync.set(MangaCore.settings(values)); status('Settings saved.'); } catch (error) { status(error.message); }
});
for (const key of ['fontSize', 'overlayOpacity', 'translationAPI']) $(key).addEventListener('input', preview);
$('clearCache').addEventListener('click', async () => { try { await browser.storage.local.remove('translationCache'); status('Translation cache cleared.'); } catch (e) { status(e.message); } });
$('reset').addEventListener('click', async () => { try { await browser.storage.sync.set(MangaCore.DEFAULTS); await load(); status('Defaults restored.'); } catch (e) { status(e.message); } });
load().catch(e => status(e.message));
