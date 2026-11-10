// The living hive: a hexagon field on a <canvas>, a few bees (= the user's Bots) flying between cells with tiny task labels.
// Vanilla, no requests. Pauses off-screen and in hidden tabs, adapts to slow frames, draws ONE static frame with prefers-reduced-motion.
(() => {
  'use strict';
  const cv = document.querySelector('[data-hive]');
  if (!cv || !cv.getContext) return;
  const ctx = cv.getContext('2d', { alpha: true });
  if (!ctx.roundRect) ctx.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
  const hero = cv.closest('[data-hero]') || cv.parentElement;
  const copyEl = hero.querySelector('[data-hero-copy]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rtl = document.documentElement.dir === 'rtl';
  let tasks = [];
  try { tasks = JSON.parse(cv.dataset.tasks || '[]'); } catch { /* none */ }
  if (!tasks.length) tasks = [['', '#f5b70a', 0]];

  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (u) => u * u * (3 - 2 * u);
  const SQ3 = Math.sqrt(3);

  // ---- state ----
  let W = 0, H = 0, dpr = 1, size = 34, small = false;
  let cells = [], byKey = new Map(), grid = null, glow = null;
  let bees = [], ripples = [], sparks = [];
  let excl = null; // rect of the hero copy: bees choose work-cells outside it, labels fade over it
  let running = false, visible = true, raf = 0, last = 0, t = 0, slowFrames = 0, quality = 1, skip = false;
  const ptr = { x: -9999, y: -9999, tx: -9999, ty: -9999, on: 0, a: 0 };
  let scrollY = 0;

  // ---- hex grid (pointy-top; size = circumradius) ----
  const hexPath = (c, x, y, r) => {
    for (let i = 0; i < 6; i++) {
      const a = TAU / 6 * i - Math.PI / 2;
      const px = x + r * Math.cos(a), py = y + r * Math.sin(a);
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.closePath();
  };
  function build() {
    const r = hero.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    small = W < 700;
    size = small ? 30 : W > 1500 ? 42 : 36;
    dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const dx = SQ3 * size, dy = 1.5 * size;
    cells = []; byKey = new Map();
    const rows = Math.ceil(H / dy) + 2, cols = Math.ceil(W / dx) + 2;
    for (let j = -1; j < rows; j++) {
      for (let i = -1; i < cols; i++) {
        const x = i * dx + (j & 1 ? dx / 2 : 0), y = j * dy;
        const c = { i, j, x, y, heat: 0, work: 0, wait: 0 };
        byKey.set(i + ',' + j, c); cells.push(c);
      }
    }
    // static grid on an offscreen canvas: one path, drawn once
    grid = document.createElement('canvas'); grid.width = cv.width; grid.height = cv.height;
    const g = grid.getContext('2d'); g.scale(dpr, dpr);
    g.lineWidth = 1; g.strokeStyle = 'rgba(255,226,160,.085)'; g.beginPath();
    for (const c of cells) hexPath(g, c.x, c.y, size - 1.5);
    g.stroke();
    // a few "filled" cells, like honey already stored
    g.fillStyle = 'rgba(245,183,10,.045)';
    for (const c of cells) if (((c.i * 7 + c.j * 13) % 11) === 0) { g.beginPath(); hexPath(g, c.x, c.y, size - 3); g.fill(); }
    measureExcl();
    if (excl) {
      const cx = (excl.x0 + excl.x1) / 2, cy = (excl.y0 + excl.y1) / 2, rx = (excl.x1 - excl.x0) / 2 + (small ? 40 : 170), ry = (excl.y1 - excl.y0) / 2 + (small ? 30 : 90);
      g.save(); g.globalCompositeOperation = 'destination-out'; g.translate(cx, cy); g.scale(rx, ry);
      const vg = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      vg.addColorStop(0, 'rgba(0,0,0,.86)'); vg.addColorStop(.6, 'rgba(0,0,0,.55)'); vg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = vg; g.fillRect(-1, -1, 2, 2); g.restore();
    }
    // soft glow sprite for bees
    glow = document.createElement('canvas'); glow.width = glow.height = 96;
    const gg = glow.getContext('2d'); const gr = gg.createRadialGradient(48, 48, 0, 48, 48, 48);
    gr.addColorStop(0, 'rgba(255,196,60,.55)'); gr.addColorStop(.35, 'rgba(245,160,10,.16)'); gr.addColorStop(1, 'rgba(245,160,10,0)');
    gg.fillStyle = gr; gg.fillRect(0, 0, 96, 96);
    const n = small ? 2 : quality < 1 ? 3 : 5;
    if (bees.length !== n) { bees = []; for (let k = 0; k < n; k++) bees.push(newBee(k)); }
    else bees.forEach((b) => { b.x = clamp(b.x, 0, W); b.y = clamp(b.y, 0, H); b.leg = null; b.cell = null; b.state = 'idle'; b.timer = 0.2; });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function measureExcl() {
    if (!copyEl) { excl = null; return; }
    const h = hero.getBoundingClientRect(), r = copyEl.getBoundingClientRect();
    // the visible text block: use the real children (the wrap itself is full width)
    let l = Infinity, tp = Infinity, rt = -Infinity, bt = -Infinity;
    const pad0 = small ? 8 : 26, rects = [];
    copyEl.querySelectorAll('h1, .lede, .eyebrow, .cta-row, .dl-note').forEach((e) => {
      const q = e.getBoundingClientRect(); if (!q.width) return;
      // h1 lines are centered: use the real text lines, not the full-width box
      let rs = [q];
      if (e.tagName === 'H1') { const rg = document.createRange(); rg.selectNodeContents(e); rs = [...rg.getClientRects()].filter((x) => x.width > 4); }
      rs.forEach((x) => rects.push({ x0: x.left - h.left - pad0, x1: x.right - h.left + pad0, y0: x.top - h.top - pad0 / 2, y1: x.bottom - h.top + pad0 / 2 }));
      l = Math.min(l, q.left); rt = Math.max(rt, q.right); tp = Math.min(tp, q.top); bt = Math.max(bt, q.bottom);
    });
    if (!isFinite(l)) { l = r.left; rt = r.right; tp = r.top; bt = r.bottom; }
    const pad = small ? 8 : 26;
    excl = { x0: l - h.left - pad, x1: rt - h.left + pad, y0: tp - h.top - pad, y1: bt - h.top + pad, rects };
  }
  const inExcl = (x, y, m = 0) => excl && excl.rects.some((r) => x > r.x0 - m && x < r.x1 + m && y > r.y0 - m && y < r.y1 + m);
  // push a bee out of the text block (headline lines, lede, buttons, note) so it never flies over them
  function keepOut(b) {
    if (!excl) return;
    const m = 16;
    for (let it = 0; it < 4; it++) {
      const r = excl.rects.find((q) => b.x > q.x0 - m && b.x < q.x1 + m && b.y > q.y0 - m && b.y < q.y1 + m);
      if (!r) break;
      const dl = b.x - (r.x0 - m), dr = (r.x1 + m) - b.x, dt = b.y - (r.y0 - m), db = (r.y1 + m) - b.y, mn = Math.min(dl, dr, dt, db);
      if (mn === dl) b.x = r.x0 - m; else if (mn === dr) b.x = r.x1 + m; else if (mn === dt) b.y = r.y0 - m; else b.y = r.y1 + m;
    }
    b.x = clamp(b.x, 10, W - 10); b.y = clamp(b.y, 10, H - 10);
  }
  // a bee on (x, y) plus its label (about 190 x 32, 38px above) must stay clear of the text
  const clearOfText = (x, y) => !excl || !excl.rects.some((r) => x + 100 > r.x0 && x - 100 < r.x1 && y + 22 > r.y0 && y - 56 < r.y1);
  const cellAt = (x, y) => {
    const dx = SQ3 * size, dy = 1.5 * size;
    const j0 = Math.round(y / dy); let best = null, bd = 1e9;
    for (let j = j0 - 1; j <= j0 + 1; j++) {
      const off = j & 1 ? dx / 2 : 0, i0 = Math.round((x - off) / dx);
      for (let i = i0 - 1; i <= i0 + 1; i++) {
        const c = byKey.get(i + ',' + j); if (!c) continue;
        const d = (c.x - x) ** 2 + (c.y - y) ** 2; if (d < bd) { bd = d; best = c; }
      }
    }
    return best;
  };
  const neighbors = (c) => {
    const odd = c.j & 1, out = [];
    [[1, 0], [-1, 0], [odd ? 1 : 0, -1], [odd ? 0 : -1, -1], [odd ? 1 : 0, 1], [odd ? 0 : -1, 1]].forEach(([di, dj]) => {
      const n = byKey.get((c.i + di) + ',' + (c.j + dj)); if (n) out.push(n);
    });
    return out;
  };

  // ---- bees ----
  const palette = ['#f5b70a', '#ffd25e', '#f5a30a'];
  function newBee(k) {
    const task = tasks[(k * 3) % tasks.length];
    const x = rnd(0.1, 0.9) * W, y = Math.max(124, rnd(0.12, 0.88) * H);
    const b = { k, x, y, face: rtl ? -1 : 1, phase: rnd(0, TAU), speed: rnd(105, 150), state: 'idle', timer: rnd(0, 1.2), leg: null, cell: null,
      task, lx: x, ly: y - 26, la: 0, trail: [], tIdx: (k * 3) % tasks.length, dur: 0, work: 0 };
    return b;
  }
  const pickTarget = (b) => {
    for (let n = 0; n < 40; n++) {
      const c = cells[(Math.random() * cells.length) | 0];
      if (c.x < 20 || c.x > W - 20 || c.y < 120 || c.y > H - 50) continue;
      if (n < 38 && !clearOfText(c.x, c.y)) continue;
      if (bees.some((o) => o !== b && o.cell && Math.hypot(o.cell.x - c.x, o.cell.y - c.y) < 150)) continue;
      if (Math.hypot(c.x - b.x, c.y - b.y) < 120) continue;
      return c;
    }
    return cells[(Math.random() * cells.length) | 0];
  };
  function launch(b) {
    const c = pickTarget(b);
    b.cell = c;
    const dx = c.x - b.x, dy = c.y - b.y, d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d, ny = dx / d, bend = rnd(-0.28, 0.28) * d;
    b.leg = { x0: b.x, y0: b.y, cx: (b.x + c.x) / 2 + nx * bend, cy: (b.y + c.y) / 2 + ny * bend, x1: c.x, y1: c.y, u: 0, dur: Math.max(1.1, d / b.speed) };
    b.state = 'fly';
    for (let n = 0; n < 12; n++) { b.tIdx = (b.tIdx + 1 + ((Math.random() * 3) | 0)) % tasks.length; if (!bees.some((o) => o !== b && o.task === tasks[b.tIdx])) break; }
    b.task = tasks[b.tIdx];
    b.la = 0;
  }
  function stepBee(b, dt) {
    if (b.state === 'idle') { b.timer -= dt; if (b.timer <= 0) launch(b); }
    else if (b.state === 'fly' && b.leg) {
      const L = b.leg; L.u = Math.min(1, L.u + dt / L.dur);
      const u = smooth(L.u), v = 1 - u;
      const px = b.x, nx = v * v * L.x0 + 2 * v * u * L.cx + u * u * L.x1, ny = v * v * L.y0 + 2 * v * u * L.cy + u * u * L.y1;
      if (Math.abs(nx - px) > 0.05) b.face = nx > px ? 1 : -1;
      b.x = nx; b.y = Math.max(small ? 112 : 82, ny);
      keepOut(b);
      if (L.u >= 1) {
        b.state = 'work'; b.work = 0; b.leg = null;
        b.waits = !!b.task[2]; b.dur = b.waits ? rnd(4.2, 5.4) : rnd(2.2, 3.4);
      }
    } else if (b.state === 'work') {
      b.work += dt; const c = b.cell;
      c.work = Math.min(1, b.work / b.dur);
      if (b.waits) c.wait = 1;
      if (b.work >= b.dur) {
        ripples.push({ x: c.x, y: c.y, t0: t, color: b.waits ? '255,214,102' : '245,183,10' });
        for (let k = 0; k < 6; k++) sparks.push({ x: c.x, y: c.y, vx: rnd(-60, 60), vy: rnd(-70, 20), life: 1 });
        c.work = 0; c.wait = 0; c.heat = 1;
        b.state = 'idle'; b.timer = rnd(0.2, 0.9);
      }
    }
    // label follows with a lag, like something being carried
    const ty = b.y - (small ? 26 : 38), k = 1 - Math.exp(-dt * 7);
    b.lx += (b.x - b.lx) * k; b.ly += (ty - b.ly) * k;
    b.la += ((b.state === 'idle' ? 0 : 1) - b.la) * (1 - Math.exp(-dt * 5));
    if (b.state === 'work') keepOut(b);
    // trail
    const tr = b.trail; if (b.state === 'fly') { tr.push(b.x, b.y); if (tr.length > 20) tr.splice(0, 2); } else if (tr.length) tr.splice(0, 2);
  }

  // ---- drawing ----
  function drawBee(b) {
    const bob = Math.sin(t * 5 + b.phase) * (b.state === 'fly' ? 1.4 : 2.6);
    const x = b.x, y = b.y + bob, s = small ? 0.95 : 1.3;
    // trail
    const tr = b.trail;
    for (let i = 0; i < tr.length; i += 2) {
      const a = (i / tr.length) * 0.35; ctx.fillStyle = `rgba(255,200,70,${a})`;
      ctx.beginPath(); ctx.arc(tr[i], tr[i + 1], 1 + (i / tr.length) * 2, 0, TAU); ctx.fill();
    }
    ctx.drawImage(glow, x - 34, y - 34, 68, 68);
    ctx.save(); ctx.translate(x, y); ctx.scale(b.face * s, s);
    if (b.state === 'fly') ctx.rotate(clamp((b.leg ? b.leg.y1 - b.leg.y0 : 0) / 600, -.25, .25) * 0 + Math.sin(t * 3 + b.phase) * 0.06);
    // wings
    const f = Math.abs(Math.sin(t * 44 + b.phase));
    ctx.fillStyle = 'rgba(255,248,230,.38)';
    ctx.save(); ctx.rotate(-0.5); ctx.beginPath(); ctx.ellipse(-3, -8, 6.5, 3 + f * 3, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.save(); ctx.rotate(0.2); ctx.beginPath(); ctx.ellipse(2, -8.5, 6, 2.6 + f * 3, 0, 0, TAU); ctx.fill(); ctx.restore();
    // body
    ctx.fillStyle = '#f5b70a'; ctx.beginPath(); ctx.ellipse(0, 0, 10.5, 7, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 10.5, 7, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = '#1a1405'; ctx.fillRect(-3.4, -9, 3.2, 18); ctx.fillRect(2.4, -9, 3.2, 18); ctx.restore();
    // head + eye + antenna + stinger
    ctx.fillStyle = '#1a1405'; ctx.beginPath(); ctx.arc(-10.5, 0.5, 4.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.arc(-11.6, -0.6, 1.1, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#1a1405'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-13, -3); ctx.quadraticCurveTo(-15, -7, -18, -7); ctx.stroke();
    ctx.fillStyle = '#1a1405'; ctx.beginPath(); ctx.moveTo(10.2, -1.2); ctx.lineTo(13.6, 0); ctx.lineTo(10.2, 1.2); ctx.fill();
    ctx.restore();
  }
  const FONT = '600 15px Heebo, system-ui, "Segoe UI", Arial, sans-serif';
  const FONT_S = '600 12px Heebo, system-ui, "Segoe UI", Arial, sans-serif';
  function drawLabel(b) {
    const text = b.task[0]; if (!text || b.la < 0.02) return;
    let a = b.la;
    ctx.font = small ? FONT_S : FONT; ctx.direction = rtl ? 'rtl' : 'ltr'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(text).width, pw = tw + 34, ph = small ? 25 : 31;
    let x = clamp(b.lx, pw / 2 + 8, W - pw / 2 - 8), y = Math.max(ph / 2 + 8, b.ly);
    // fade where it would sit on top of the headline
    if (excl && excl.rects.some((r) => x + pw / 2 > r.x0 && x - pw / 2 < r.x1 && y + ph / 2 > r.y0 && y - ph / 2 < r.y1)) a = 0;
    if (a < 0.02) return;
    const wait = !!b.task[2] && b.state === 'work';
    ctx.globalAlpha = a;
    ctx.beginPath(); ctx.roundRect(x - pw / 2, y - ph / 2, pw, ph, ph / 2);
    ctx.fillStyle = 'rgba(12,10,6,.82)'; ctx.fill();
    ctx.strokeStyle = wait ? `rgba(255,205,77,${0.55 + 0.35 * Math.sin(t * 6)})` : 'rgba(255,240,210,.18)'; ctx.lineWidth = 1; ctx.stroke();
    const dotX = rtl ? x + pw / 2 - 12 : x - pw / 2 + 12;
    ctx.fillStyle = b.task[1]; ctx.beginPath(); ctx.arc(dotX, y, 3.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f3eee2'; ctx.fillText(text, x + (rtl ? -6 : 6), y + 0.5);
    ctx.globalAlpha = 1;
  }
  function drawCells() {
    // cursor glow + working/waiting/ripple cells, drawn only for the few cells that need it
    const R = size * 3.4;
    for (const c of cells) {
      let a = 0, f = 0;
      if (ptr.a > 0.01) {
        const d = Math.hypot(c.x - ptr.x, c.y - ptr.y);
        if (d < R) { const k = 1 - d / R; a += k * k * 0.55 * ptr.a; }
      }
      if (c.heat > 0.01) { a += c.heat * 0.5; c.heat *= 0.94; }
      if (c.work > 0) f = c.work;
      if (c.wait) a += 0.25 + 0.2 * Math.sin(t * 6);
      for (const r of ripples) {
        const age = t - r.t0, rr = age * 190, d = Math.abs(Math.hypot(c.x - r.x, c.y - r.y) - rr);
        if (age < 1.5 && d < size * 1.1) a += (1 - d / (size * 1.1)) * (1 - age / 1.5) * 0.7;
      }
      if (a < 0.02 && f < 0.01) continue;
      ctx.beginPath(); hexPath(ctx, c.x, c.y, size - 1.5);
      if (f > 0) { ctx.fillStyle = `rgba(245,183,10,${0.04 + f * 0.26})`; ctx.fill(); }
      if (a > 0.02) {
        ctx.fillStyle = `rgba(245,183,10,${Math.min(0.3, a * 0.32)})`; ctx.fill();
        ctx.strokeStyle = `rgba(255,205,77,${Math.min(0.95, 0.15 + a)})`; ctx.lineWidth = 1.2; ctx.stroke();
      }
    }
    ripples = ripples.filter((r) => t - r.t0 < 1.5);
  }
  function drawSparks(dt) {
    for (const s of sparks) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 40 * dt; s.life -= dt * 1.6;
      if (s.life > 0) { ctx.fillStyle = `rgba(255,210,94,${s.life * 0.8})`; ctx.beginPath(); ctx.arc(s.x, s.y, 1.6 * s.life + 0.4, 0, TAU); ctx.fill(); }
    }
    sparks = sparks.filter((s) => s.life > 0);
  }
  function frame(dt) {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(grid, 0, 0, W, H);
    drawCells();
    for (const b of bees) drawBee(b);
    drawSparks(dt);
    for (const b of bees) drawLabel(b);
  }

  // ---- loop ----
  function tick(now) {
    raf = 0; if (!running) return;
    raf = requestAnimationFrame(tick);
    if (small) { skip = !skip; if (skip) return; } // phones: 30fps
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; t += dt;
    // slow-frame guard: after ~40 frames averaging > 26ms, drop to fewer bees once
    if (dt > 0.026) { if (++slowFrames > 40 && quality === 1) { quality = 0.6; bees = bees.slice(0, 3); } } else slowFrames = Math.max(0, slowFrames - 1);
    ptr.x += (ptr.tx - ptr.x) * (1 - Math.exp(-dt * 9)); ptr.y += (ptr.ty - ptr.y) * (1 - Math.exp(-dt * 9));
    ptr.a += (ptr.on - ptr.a) * (1 - Math.exp(-dt * 6));
    for (const b of bees) stepBee(b, dt);
    frame(dt);
  }
  function setRunning(on) {
    if (reduce) return;
    on = on && visible && !document.hidden;
    if (on === running) return;
    running = on;
    if (on) { last = performance.now(); raf = requestAnimationFrame(tick); } else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  // ---- inputs ----
  const toLocal = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  hero.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; [ptr.tx, ptr.ty] = toLocal(e); if (!ptr.on) { ptr.x = ptr.tx; ptr.y = ptr.ty; } ptr.on = 1; }, { passive: true });
  hero.addEventListener('pointerleave', () => { ptr.on = 0; });
  hero.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button')) return;
    const [x, y] = toLocal(e); const c = cellAt(x, y);
    if (c) { c.heat = 1; ripples.push({ x: c.x, y: c.y, t0: t, color: '245,183,10' }); }
  }, { passive: true });
  addEventListener('scroll', () => {
    scrollY = window.scrollY;
    if (scrollY < H * 1.2) cv.style.transform = `translate3d(0, ${Math.round(scrollY * 0.18)}px, 0)`;
  }, { passive: true });

  // ---- lifecycle ----
  let rt = 0;
  const rebuild = () => { build(); if (reduce || !running) staticFrame(); };
  new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(rebuild, 120); }).observe(hero);
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; setRunning(true); }, { threshold: 0 }).observe(hero);
  document.addEventListener('visibilitychange', () => setRunning(true));

  function staticFrame() {
    // reduced motion / first paint: bees parked on cells, labels visible, nothing moves
    bees.forEach((b, k) => {
      let c = null;
      for (let n = 0; n < 60 && !c; n++) { const q = cells[(k * 37 + n * 53) % cells.length]; if (q.x > 30 && q.x < W - 30 && q.y > 120 && q.y < H - 60 && clearOfText(q.x, q.y)) c = q; }
      if (c) { b.x = c.x; b.y = c.y; b.lx = c.x; b.ly = c.y - 38; b.cell = c; b.task = tasks[(k * 2) % tasks.length]; b.la = 1; b.state = 'work'; c.work = 0.6; b.waits = false; }
    });
    t = 1; frame(0);
  }
  const start = () => { build(); if (reduce) { staticFrame(); return; } staticFrame(); bees.forEach((b) => { b.la = 0; b.state = 'idle'; b.timer = rnd(0.1, 1); b.cell && (b.cell.work = 0); }); setRunning(true); };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start);
})();
