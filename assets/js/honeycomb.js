// The capabilities honeycomb: hover / focus / tap a cell to read it; auto-tours the cells while on screen.
(() => {
  'use strict';
  const comb = document.querySelector('[data-comb]'), ro = document.querySelector('[data-readout]');
  if (!comb || !ro) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cells = [...comb.querySelectorAll('.cell')];
  const h = ro.querySelector('[data-ro-h]'), p = ro.querySelector('[data-ro-p]'), ic = ro.querySelector('.ro-ic');
  cells.forEach((c, i) => c.style.setProperty('--i', i));
  let cur = 0, timer = 0, held = false, seen = false;
  const show = (i) => {
    if (i === cur && ro.dataset.ready) return;
    cells[cur].classList.remove('on'); cur = i; const c = cells[i]; c.classList.add('on');
    h.textContent = (c.querySelector('h3').firstChild.textContent || '').trim();
    p.textContent = c.querySelector('.sr-only').textContent;
    ic.innerHTML = c.querySelector('.cell-ic').innerHTML;
    ro.dataset.ready = '1';
    if (!reduce) { ro.classList.remove('swap'); void ro.offsetWidth; ro.classList.add('swap'); }
  };
  const tour = () => { clearTimeout(timer); if (reduce || held || !seen || document.hidden) return; timer = setTimeout(() => { show((cur + 1) % cells.length); tour(); }, 3600); };
  cells.forEach((c, i) => {
    c.addEventListener('pointerenter', () => { held = true; show(i); });
    c.addEventListener('pointerleave', () => { held = false; tour(); });
    c.addEventListener('focus', () => { held = true; show(i); });
    c.addEventListener('blur', () => { held = false; tour(); });
    c.addEventListener('click', () => show(i));
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { seen = es[0].isIntersecting; seen ? tour() : clearTimeout(timer); }, { threshold: 0.3 }).observe(comb);
  }
  document.addEventListener('visibilitychange', tour);
})();
