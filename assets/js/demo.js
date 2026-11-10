// The interactive approval-card demo. Everything happens on the page: no email is sent, no request is made.
(() => {
  'use strict';
  const demo = document.querySelector('[data-demo]');
  if (!demo) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const msgs = demo.querySelector('.msgs'), tpl = demo.querySelector('template');
  const live = demo.querySelector('[data-live]'), reset = demo.querySelector('[data-reset]');
  const D = demo.dataset;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
  const bot = (text) => { const m = document.createElement('div'); m.className = 'msg bot'; m.textContent = text; msgs.append(m); return m; };

  function start() {
    msgs.querySelectorAll('[data-dyn]').forEach((n) => n.remove());
    const card = tpl.content.firstElementChild.cloneNode(true);
    card.dataset.dyn = '1';
    msgs.append(card);
    reset.hidden = true;
    card.querySelectorAll('button[data-decision]').forEach((b) => b.addEventListener('click', () => decide(card, b.dataset.decision)));
    card.addEventListener('keydown', (e) => { if (e.key === 'Escape') decide(card, 'deny'); });
  }
  async function decide(card, d) {
    if (card.dataset.done) return;
    card.dataset.done = '1';
    const ok = d === 'allow';
    const settled = document.createElement('div');
    settled.className = 'perm settled'; settled.dataset.dyn = '1';
    settled.innerHTML = `<span class="perm-ic">${card.querySelector('.perm-ic').innerHTML}</span><span class="perm-sub"></span><span class="outcome ${ok ? 'ok' : 'no'}"></span>`;
    settled.querySelector('.perm-sub').textContent = D.short;
    settled.querySelector('.outcome').textContent = ok ? D.allowed : D.denied;
    card.replaceWith(settled);
    live.textContent = ok ? D.allowed : D.denied;
    const typing = document.createElement('div');
    typing.className = 'msg bot typing'; typing.dataset.dyn = '1'; typing.setAttribute('aria-hidden', 'true');
    typing.innerHTML = '<i></i><i></i><i></i>';
    msgs.append(typing);
    await wait(900);
    typing.remove();
    const m = bot(ok ? D.sent : D.notSent); m.dataset.dyn = '1';
    live.textContent = m.textContent;
    reset.hidden = false;
    reset.focus({ preventScroll: true });
  }
  reset.addEventListener('click', () => { start(); const b = demo.querySelector('.perm button'); if (b) b.focus({ preventScroll: true }); });
  start();
})();
