// Page motion, all vanilla: header state, staggered scroll reveals, hero/stage parallax, device-frame depth, tilt, marquee.
// Everything pauses off-screen; with prefers-reduced-motion nothing animates and everything is visible.
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // header
  const top = document.querySelector('.top');
  const onTop = () => top && top.classList.toggle('scrolled', scrollY > 8);
  onTop(); addEventListener('scroll', onTop, { passive: true });

  // staggered reveal: siblings reveal 70ms apart
  const rv = $('.rv');
  const groups = new Map();
  rv.forEach((el) => { const g = groups.get(el.parentElement) || []; g.push(el); groups.set(el.parentElement, g); });
  groups.forEach((g) => g.forEach((el, i) => { if (g.length > 1) el.style.setProperty('--d', Math.min(i, 6) * 0.07 + 's'); }));
  if (reduce || !('IntersectionObserver' in window)) rv.forEach((el) => el.classList.add('in'));
  else {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    rv.forEach((el) => io.observe(el));
  }

  // pause CSS animations of things that are off-screen
  if ('IntersectionObserver' in window) {
    const po = new IntersectionObserver((es) => es.forEach((e) => {
      e.target.classList.toggle('is-paused', !e.isIntersecting);
      if (e.target.matches('[data-marquee]')) e.target.classList.toggle('run', e.isIntersecting && !reduce);
    }), { rootMargin: '60px' });
    $('[data-hero], [data-stage], [data-marquee], [data-final]').forEach((el) => po.observe(el));
  }
  document.addEventListener('visibilitychange', () => document.documentElement.classList.toggle('tab-hidden', document.hidden));

  if (reduce) return;

  // scroll-linked: hero copy drifts and fades, device frames rise into place, phones float at different speeds
  const hero = document.querySelector('[data-hero]'), heroCopy = document.querySelector('[data-hero-copy]');
  const stage = document.querySelector('[data-stage]'), phones = document.querySelector('[data-phones]');
  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = innerHeight;
    if (hero && heroCopy) {
      const k = clamp(scrollY / (vh * 0.8), 0, 1);
      heroCopy.style.transform = `translate3d(0, ${(k * 60).toFixed(1)}px, 0)`;
      heroCopy.style.opacity = (1 - k * 0.9).toFixed(3);
    }
    if (stage) {
      const r = stage.getBoundingClientRect();
      stage.style.setProperty('--p', clamp((vh - r.top) / (vh * 0.85), 0, 1).toFixed(3));
    }
    if (phones) {
      const r = phones.getBoundingClientRect();
      phones.style.setProperty('--py', clamp(((r.top + r.height / 2) - vh / 2) / vh, -1, 1).toFixed(3));
    }
  };
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', req, { passive: true }); addEventListener('resize', req); update();

  // depth: tilt screenshots toward the pointer (desktop only)
  if (fine) {
    $('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 7 + 'deg');
        el.style.setProperty('--rx', (0.5 - (e.clientY - r.top) / r.height) * 5 + 'deg');
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--ry', '0deg'); el.style.setProperty('--rx', '0deg'); });
    });
    // soft spotlight that follows the pointer on cards
    $('.card, .step, .dl-card').forEach((el) => el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }));
  }
})();
