// OS-aware download buttons. The release links live in assets/config.js (one place per release).
// The HTML already contains working links (baked by tools/build.mjs); this picks the primary button by OS and
// re-reads config.js so a new release only needs that one file. No network requests.
(() => {
  'use strict';
  const cfg = window.KAVERET_CONFIG;
  if (!cfg) return;
  const ua = navigator.userAgent.toLowerCase();
  const plat = ((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '').toLowerCase();
  const os = /android/.test(ua) ? 'android' : /iphone|ipad|ipod/.test(ua) ? 'other'
    : plat.startsWith('win') || ua.includes('windows') ? 'win' : plat.startsWith('mac') || ua.includes('mac os') ? 'mac' : 'other';

  const q = (s, r = document) => [...r.querySelectorAll(s)];
  // fresh links for the per-OS cards
  q('[data-dl="win"]').forEach((a) => { if (cfg.WINDOWS && cfg.WINDOWS.url) a.href = cfg.WINDOWS.url; });
  q('[data-dl="android"]').forEach((a) => { if (cfg.ANDROID && cfg.ANDROID.url) a.href = cfg.ANDROID.url; });
  q('[data-dl="mac"]').forEach((a) => { if (a.tagName === 'A' && cfg.MAC && cfg.MAC.url) a.href = cfg.MAC.url; });

  // the primary button(s): Windows -> installer, Android -> APK, Mac with a build -> it, everything else -> the download section
  const macReady = !!(cfg.MAC && cfg.MAC.url);
  const pick = os === 'android' && cfg.ANDROID ? 'android' : os === 'mac' && macReady ? 'mac' : os === 'win' && cfg.WINDOWS ? 'win' : 'all';
  q('[data-dl="primary"]').forEach((a) => {
    const label = a.querySelector('[data-dl-label]');
    if (pick === 'android') { a.href = cfg.ANDROID.url; label.textContent = a.dataset.labelAndroid; }
    else if (pick === 'mac') { a.href = cfg.MAC.url; label.textContent = a.dataset.labelMac || a.dataset.labelAll; }
    else if (pick === 'win') { a.href = cfg.WINDOWS.url; label.textContent = a.dataset.labelWin; }
    else { a.href = '#download'; a.removeAttribute('rel'); label.textContent = a.dataset.labelAll; }
  });
  q('[data-dl-note]').forEach((n) => { n.textContent = pick === 'win' ? n.dataset.noteWin : pick === 'android' ? n.dataset.noteAndroid : n.dataset.noteOther; });

  // highlight the matching card
  const card = q('.dl-card').find((c) => c.dataset.os === (pick === 'all' ? '' : pick));
  if (card) card.classList.add('is-rec');

  // the GitHub source links stay hidden until launch
  if (cfg.LAUNCHED && cfg.REPO) q('[data-gh]').forEach((a) => { a.hidden = false; a.href = cfg.REPO; });
})();
