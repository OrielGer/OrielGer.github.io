// Kaveret landing site: launch switch, OS-aware download buttons, the approval-card demo, small UI touches.
// No network requests: everything here runs on the page.
(() => {
  'use strict';
  const cfg = window.KAVERET_CONFIG || { LAUNCHED: false, REPO: '' };
  const he = document.documentElement.lang === 'he';
  const L = he ? {
    win: 'הורדה ל־Windows', macArm: 'הורדה ל־Mac (Apple silicon) · בטא', macIntel: 'הורדה ל־Mac (Intel) · בטא', mac: 'הורדה ל־Mac · בטא',
    other: 'להורדה ב־GitHub', all: 'כל הגרסאות וההורדות', noteWin: 'Windows · קוד פתוח (MIT) · התקנה לא חתומה: Windows עשוי להציג אזהרת SmartScreen',
    noteMac: 'macOS בבטא, לא חתומה · Windows עם קובץ התקנה', noteOther: 'Windows עם קובץ התקנה · macOS ו־Linux בבטא',
  } : {
    win: 'Download for Windows', macArm: 'Download for Mac (Apple silicon) · beta', macIntel: 'Download for Mac (Intel) · beta', mac: 'Download for Mac · beta',
    other: 'Download on GitHub', all: 'All versions and downloads', noteWin: 'Windows · open source (MIT) · unsigned installer: Windows may show a SmartScreen warning',
    noteMac: 'macOS is a beta, unsigned · Windows has an installer', noteOther: 'Windows has an installer · macOS and Linux are beta',
  };

  // ---------- launch switch ----------
  async function detectOS() {
    const uaData = navigator.userAgentData;
    const plat = (uaData?.platform || navigator.platform || '').toLowerCase();
    const ua = navigator.userAgent.toLowerCase();
    if (/android|iphone|ipad|ipod/.test(ua)) return 'other';
    if (plat.startsWith('win') || ua.includes('windows')) return 'win';
    if (plat.startsWith('mac') || ua.includes('mac os')) {
      try {
        if (uaData?.getHighEntropyValues) {
          const v = await uaData.getHighEntropyValues(['architecture']);
          if (v.architecture === 'arm') return 'macArm';
          if (v.architecture === 'x86') return 'macIntel';
        }
      } catch { /* not available */ }
      try {
        const gl = document.createElement('canvas').getContext('webgl');
        const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
        const r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
        if (/apple m\d/i.test(r)) return 'macArm'; // Chrome: "ANGLE (Apple, Apple M1 …)"; Safari only says "Apple GPU" (unknown)
        if (/intel|amd|radeon/i.test(r)) return 'macIntel';
      } catch { /* no webgl */ }
      return 'mac';
    }
    return 'other';
  }
  async function applyLaunch() {
    if (!cfg.LAUNCHED || !cfg.REPO) return; // the HTML already shows "coming soon" and hides GitHub links
    const latest = `${cfg.REPO}/releases/latest`;
    const os = await detectOS();
    document.querySelectorAll('[data-dl]').forEach((el) => {
      const a = document.createElement('a');
      a.className = el.className.replace('is-soon', 'btn-primary');
      a.href = latest; a.rel = 'noopener';
      a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19h14"/></svg>';
      a.append(document.createTextNode(L[os]));
      el.replaceWith(a);
    });
    document.querySelectorAll('[data-dl-note]').forEach((el) => {
      el.textContent = os === 'win' ? L.noteWin : os.startsWith('mac') ? L.noteMac : L.noteOther;
      el.append(' · ');
      const all = document.createElement('a'); all.href = `${cfg.REPO}/releases`; all.rel = 'noopener'; all.textContent = L.all;
      el.append(all);
    });
    document.querySelectorAll('[data-gh]').forEach((el) => { el.hidden = false; if (el.tagName === 'A') el.href = cfg.REPO; else el.querySelector('a')?.setAttribute('href', cfg.REPO); });
  }
  applyLaunch();

  // ---------- header border on scroll ----------
  const top = document.querySelector('.top');
  if (top) {
    const onScroll = () => top.classList.toggle('scrolled', window.scrollY > 8);
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ---------- reveal on scroll ----------
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rev = document.querySelectorAll('.reveal');
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    rev.forEach((el) => io.observe(el));
  } else rev.forEach((el) => el.classList.add('in'));

  // ---------- the approval-card demo ----------
  const demo = document.querySelector('[data-demo]');
  if (demo) {
    const msgs = demo.querySelector('.msgs');
    const tpl = demo.querySelector('template');
    const live = demo.querySelector('[data-live]');
    const reset = demo.querySelector('[data-reset]');
    const D = demo.dataset;
    const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
    const bot = (text) => { const m = document.createElement('div'); m.className = 'msg bot'; m.textContent = text; msgs.append(m); return m; };
    async function start() {
      msgs.querySelectorAll('[data-dyn]').forEach((n) => n.remove());
      const card = tpl.content.firstElementChild.cloneNode(true);
      card.dataset.dyn = '1';
      msgs.append(card);
      reset.hidden = true;
      card.querySelectorAll('button[data-decision]').forEach((b) => b.addEventListener('click', () => decide(card, b.dataset.decision)));
      card.addEventListener('keydown', (e) => { if (e.key === 'Escape') decide(card, 'deny'); });
    }
    async function decide(card, d) {
      if (card.dataset.done) return; card.dataset.done = '1';
      const ok = d === 'allow';
      const settled = document.createElement('div');
      settled.className = 'perm settled'; settled.dataset.dyn = '1';
      settled.innerHTML = `<span class="perm-ic">${card.querySelector('.perm-ic').innerHTML}</span><span class="perm-sub"></span><span class="outcome ${ok ? 'ok' : 'no'}"></span>`;
      settled.querySelector('.perm-sub').textContent = D.short;
      settled.querySelector('.outcome').textContent = ok ? D.allowed : D.denied;
      card.replaceWith(settled);
      live.textContent = ok ? D.allowed : D.denied;
      const typing = document.createElement('div'); typing.className = 'msg bot typing'; typing.dataset.dyn = '1'; typing.innerHTML = '<i></i><i></i><i></i>';
      typing.setAttribute('aria-hidden', 'true');
      msgs.append(typing);
      await wait(900);
      typing.remove();
      const m = bot(ok ? D.sent : D.notSent); m.dataset.dyn = '1';
      live.textContent = m.textContent;
      reset.hidden = false;
      reset.focus({ preventScroll: true });
    }
    reset.addEventListener('click', () => { start(); demo.querySelector('.perm button')?.focus({ preventScroll: true }); });
    start();
  }
})();
