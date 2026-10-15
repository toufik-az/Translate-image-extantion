'use strict';
const $ = id => document.getElementById(id);
let tabId, current = {}, preferences;
async function send(action) { return browser.tabs.sendMessage(tabId, typeof action === 'string' ? { action } : action); }
function mode(value) { for (const b of document.querySelectorAll('[data-mode]')) { const selected = b.dataset.mode === value; b.classList.toggle('active', selected); b.setAttribute('aria-pressed', selected); } }
function render(state) {
  current = state; $('auto').checked = !!state.isActive; $('auto').disabled = false;
  const s = state.stats || { total: 0, processed: 0, failed: 0 };
  $('status').textContent = state.isProcessing ? 'Translating…' : state.isActive ? 'Ready as you scroll' : 'Ready';
  $('count').textContent = state.isActive ? `${s.processed} / ${s.total} images` : '';
  $('message').textContent = state.error || state.message || 'Choose the source language and turn on translation.';
  $('progress').hidden = !state.isProcessing;
  $('progress').value = s.total ? (s.processed + s.failed + (s.skipped || 0)) / s.total * 100 : 0;
  $('actions').hidden = !state.isActive; $('toggleView').hidden = !state.hasTranslations;
  $('toggleView').textContent = state.showingOriginal ? 'Show translations' : 'Show original';
  $('retry').hidden = !s.failed;
}
function showError(e) { $('message').textContent = e.message; $('status').textContent = 'Could not translate'; $('auto').disabled = false; $('auto').checked = !!current.isActive; }
async function init() {
  tabId = (await browser.tabs.query({ active: true, currentWindow: true }))[0]?.id;
  preferences = await browser.storage.sync.get(MangaCore.DEFAULTS);
  $('sourceLang').value = preferences.sourceLang; $('targetLang').value = preferences.targetLang; mode(preferences.displayMode);
  try { render(await send('getState')); } catch { showError(new Error('Open a manga chapter and refresh it after reloading the extension.')); }
}
$('auto').addEventListener('change', async () => {
  const enabled = $('auto').checked; $('auto').disabled = true;
  try { await send(enabled ? { action: 'startTranslation', settings: await browser.storage.sync.get(MangaCore.DEFAULTS) } : 'stopTranslation'); render(await send('getState')); } catch (e) { showError(e); }
});
for (const key of ['sourceLang', 'targetLang']) $(key).addEventListener('change', () => browser.storage.sync.set({ [key]: $(key).value }).catch(showError));
for (const button of document.querySelectorAll('[data-mode]')) button.addEventListener('click', async () => {
  try { await browser.storage.sync.set({ displayMode: button.dataset.mode }); mode(button.dataset.mode); } catch (e) { showError(e); }
});
$('toggleView').addEventListener('click', () => send('toggleView').then(render).catch(showError));
$('selectArea').addEventListener('click', () => send('selectArea').then(() => window.close()).catch(showError));
$('retry').addEventListener('click', () => send('retryFailed').catch(showError));
$('openOptions').addEventListener('click', () => browser.runtime.openOptionsPage());
browser.runtime.onMessage.addListener((msg, sender) => { if (msg.action === 'updatePopup' && sender.tab?.id === tabId) render(msg); });
init().catch(showError);
