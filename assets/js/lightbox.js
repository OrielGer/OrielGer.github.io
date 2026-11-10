// Screenshots: click / tap / Enter opens a full-size viewer. Vanilla; Esc closes, arrows browse, Tab is trapped inside, focus returns.
(() => {
  'use strict';
  const he = document.documentElement.lang === 'he';
  const T = he ? { close: 'סגירה', prev: 'הקודם', next: 'הבא', zoom: 'להגדלה', dlg: 'צילום מסך מוגדל' } : { close: 'Close', prev: 'Previous', next: 'Next', zoom: 'Click to enlarge', dlg: 'Enlarged screenshot' };
  const hosts = [...document.querySelectorAll('.dev-win, .dev-phone, .frame, .shot')];
  if (!hosts.length) return;
  // one entry per host; the cross-fading hero pair is a single entry that opens the one currently showing
  const items = hosts.map((host) => ({ host, imgs: [...host.querySelectorAll('img')] }));
  const best = (img) => {
    const parts = (img.getAttribute('srcset') || '').split(',').map((x) => x.trim().split(/\s+/)).filter((x) => x[0]);
    parts.sort((a, b) => parseInt(b[1] || '0', 10) - parseInt(a[1] || '0', 10));
    return parts.length ? parts[0][0] : img.currentSrc || img.src;
  };
  const current = (it) => it.imgs.reduce((a, b) => (+getComputedStyle(b).opacity > +getComputedStyle(a).opacity ? b : a), it.imgs[0]);
  let box = null, idx = 0, opener = null;
  const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; };
  function show(i, it) {
    idx = (i + items.length) % items.length;
    const src = items[idx], im = it || current(src);
    const big = box.querySelector('img');
    big.src = best(im); big.alt = im.alt;
    box.querySelector('[data-cap]').textContent = im.alt;
  }
  function close() {
    if (!box) return;
    box.remove(); box = null; document.body.classList.remove('lb-open');
    document.removeEventListener('keydown', onKey, true);
    if (opener && opener.focus) opener.focus({ preventScroll: true });
  }
  function onKey(e) {
    if (!box) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + (he ? -1 : 1)); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(idx + (he ? 1 : -1)); return; }
    if (e.key === 'Tab') { // focus trap
      const f = [...box.querySelectorAll('button')]; const first = f[0], last = f[f.length - 1];
      if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  function open(i, from) {
    opener = from; close(); opener = from;
    box = mk('div', 'lb'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', T.dlg);
    const bar = mk('div', 'lb-bar'), cap = mk('p'); cap.dataset.cap = '';
    const btns = mk('div', 'lb-btns');
    const prev = mk('button', '', he ? '→' : '←'), next = mk('button', '', he ? '←' : '→'), x = mk('button', '', '✕');
    prev.type = next.type = x.type = 'button';
    prev.setAttribute('aria-label', T.prev); next.setAttribute('aria-label', T.next); x.setAttribute('aria-label', T.close);
    prev.addEventListener('click', () => show(idx - 1)); next.addEventListener('click', () => show(idx + 1)); x.addEventListener('click', close);
    btns.append(prev, next, x); bar.append(cap, btns);
    const stage = mk('div', 'lb-stage'), big = mk('img'); stage.append(big);
    stage.addEventListener('click', (e) => { if (e.target === stage) close(); });
    box.append(bar, stage); document.body.append(box); document.body.classList.add('lb-open');
    document.addEventListener('keydown', onKey, true);
    show(i); x.focus({ preventScroll: true });
  }
  items.forEach((it, i) => {
    it.host.classList.add('has-zoom');
    const t = it.host.querySelector('img'); // the first (visible-by-default) image is the focusable target
    const hint = mk('span', 'zoom-hint', T.zoom); hint.setAttribute('aria-hidden', 'true');
    it.host.append(hint);
    it.host.setAttribute('data-zoomable', '');
    it.host.tabIndex = 0; it.host.setAttribute('role', 'button');
    it.host.setAttribute('aria-label', (he ? 'הגדלת צילום המסך: ' : 'Enlarge screenshot: ') + (t.alt || ''));
    it.host.addEventListener('click', () => open(i, it.host));
    it.host.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i, it.host); } });
  });
})();
