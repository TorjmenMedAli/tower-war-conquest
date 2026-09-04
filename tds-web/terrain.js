/* ============================================================================================
   TERRAIN — high-quality procedural battle backgrounds.
   Each region gets a hand-tuned palette and a set of detail passes (macro blotches, fine grain,
   region-specific features, vignette). The whole thing is baked ONCE into an offscreen canvas
   per (region, level, size) and blitted with a single drawImage each frame, so it is free.
   ============================================================================================ */
(function (global) {
  'use strict';

  const rngOf = seed => { let a = (seed | 0) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  /* Per-region art direction. `sky` is the top-of-screen tint, `deep` the bottom; the mids build
     the body of the ground. `accent` is used by the region's signature feature pass. */
  const PAL = {
    1: { light: 1.0, sky: '#8fd97a', top: '#74c25c', mid: '#5faa4b', deep: '#3f7d3a', accent: '#c8f08a', shade: '#2c5c2f', warm: '#e9f7a8' },
    2: { light: 0.85, sky: '#f2dda2', top: '#e6c982', mid: '#d3ae63', deep: '#a9834a', accent: '#fff0c0', shade: '#8a6537', warm: '#ffe9ae' },
    3: { sky: '#e6f2fd', top: '#cfe2f2', mid: '#b0cbe1', deep: '#7fa2c0', accent: '#ffffff', shade: '#6d8aa5', warm: '#dff0ff', light: 0.45 },
    4: { light: 0.7, sky: '#6b4a3e', top: '#583b32', mid: '#432c26', deep: '#2a1a17', accent: '#ff7a2a', shade: '#1b100e', warm: '#ffb347' },
    5: { sky: '#6e7885', top: '#5a636f', mid: '#474f59', deep: '#2f353d', accent: '#aab6c4', shade: '#1c2128', warm: '#ffd24a', light: 0.6 },
  };

  const cache = new Map();

  /* -------- small painting helpers -------- */
  function blob(c, x, y, rx, ry, rot, col, alpha, blur) {
    c.save(); c.globalAlpha = alpha; c.fillStyle = col;
    if (blur) c.filter = 'blur(' + blur + 'px)';
    c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, 6.283); c.fill(); c.restore();
  }
  function grain(c, w, h, rnd, col, n, size, alpha) {
    c.save(); c.globalAlpha = alpha; c.fillStyle = col;
    for (let i = 0; i < n; i++) { const x = rnd() * w, y = rnd() * h, s = size * (0.5 + rnd()); c.fillRect(x, y, s, s * 0.8); }
    c.restore();
  }

  /* -------- region feature passes -------- */
  function grassTufts(c, w, h, rnd, P) {
    c.save(); c.lineCap = 'round';
    for (let i = 0; i < 900; i++) {
      const x = rnd() * w, y = rnd() * h, len = 5 + rnd() * 9, lean = (rnd() - 0.5) * 6;
      c.globalAlpha = 0.10 + rnd() * 0.16;
      c.strokeStyle = rnd() < 0.35 ? P.accent : P.shade;
      c.lineWidth = 1 + rnd() * 1.2;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + lean * 0.5, y - len * 0.6, x + lean, y - len); c.stroke();
    }
    // scattered wildflowers
    for (let i = 0; i < 70; i++) {
      const x = rnd() * w, y = rnd() * h; c.globalAlpha = 0.5 + rnd() * 0.3;
      c.fillStyle = ['#ffe66d', '#ff9ecb', '#fff', '#ffd24a'][(rnd() * 4) | 0];
      c.beginPath(); c.arc(x, y, 1.2 + rnd() * 1.6, 0, 6.283); c.fill();
    }
    c.restore();
  }
  function duneRipples(c, w, h, rnd, P) {
    c.save(); c.lineCap = 'round';
    for (let i = 0; i < 55; i++) {
      const y0 = rnd() * h, x0 = -60 + rnd() * w, len = 120 + rnd() * 380, amp = 6 + rnd() * 16;
      c.globalAlpha = 0.05 + rnd() * 0.08; c.lineWidth = 3 + rnd() * 7;
      c.strokeStyle = rnd() < 0.5 ? P.accent : P.shade;
      c.beginPath();
      for (let x = 0; x <= len; x += 14) c.lineTo(x0 + x, y0 + Math.sin(x / 90 + i) * amp);
      c.stroke();
    }
    // pebbles
    for (let i = 0; i < 160; i++) { const x = rnd() * w, y = rnd() * h; c.globalAlpha = 0.14 + rnd() * 0.14; c.fillStyle = P.shade; c.beginPath(); c.ellipse(x, y, 1.5 + rnd() * 3, 1 + rnd() * 2, rnd() * 3, 0, 6.283); c.fill(); }
    c.restore();
  }
  function snowDrifts(c, w, h, rnd, P) {
    c.save();
    for (let i = 0; i < 26; i++) { const x = rnd() * w, y = rnd() * h; blob(c, x, y, 60 + rnd() * 170, 24 + rnd() * 60, rnd() * 3, '#ffffff', 0.30 + rnd() * 0.25, 26); }
    // ice cracks
    c.lineCap = 'round';
    for (let i = 0; i < 34; i++) {
      let x = rnd() * w, y = rnd() * h, a = rnd() * 6.283;
      c.globalAlpha = 0.12 + rnd() * 0.14; c.strokeStyle = P.shade; c.lineWidth = 0.8 + rnd() * 1.4;
      c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 5; k++) { a += (rnd() - 0.5) * 1.5; x += Math.cos(a) * (12 + rnd() * 26); y += Math.sin(a) * (12 + rnd() * 26); c.lineTo(x, y); }
      c.stroke();
    }
    // sparkle
    for (let i = 0; i < 120; i++) { const x = rnd() * w, y = rnd() * h; c.globalAlpha = 0.35 + rnd() * 0.5; c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 0.7 + rnd() * 1.3, 0, 6.283); c.fill(); }
    c.restore();
  }
  function lavaCracks(c, w, h, rnd, P) {
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    // glowing fissures — drawn twice: wide soft glow, then a hot core
    for (let i = 0; i < 16; i++) {
      const pts = []; let x = rnd() * w, y = rnd() * h, a = rnd() * 6.283;
      for (let k = 0; k < 9; k++) { pts.push([x, y]); a += (rnd() - 0.5) * 1.1; x += Math.cos(a) * (26 + rnd() * 50); y += Math.sin(a) * (26 + rnd() * 50); }
      const trace = () => { c.beginPath(); pts.forEach((p, j) => j ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); };
      c.globalAlpha = 0.30; c.strokeStyle = P.accent; c.lineWidth = 11; c.filter = 'blur(9px)'; trace();
      c.filter = 'none'; c.globalAlpha = 0.85; c.strokeStyle = P.warm; c.lineWidth = 2.4; trace();
      c.globalAlpha = 0.9; c.strokeStyle = '#fff3c4'; c.lineWidth = 0.9; trace();
    }
    // cooled basalt chunks + ember specks
    c.filter = 'none';
    for (let i = 0; i < 200; i++) { const x = rnd() * w, y = rnd() * h; c.globalAlpha = 0.16 + rnd() * 0.2; c.fillStyle = rnd() < 0.5 ? P.shade : P.sky; c.beginPath(); c.ellipse(x, y, 2 + rnd() * 6, 1.5 + rnd() * 4, rnd() * 3, 0, 6.283); c.fill(); }
    for (let i = 0; i < 60; i++) { const x = rnd() * w, y = rnd() * h; c.globalAlpha = 0.5 + rnd() * 0.4; c.fillStyle = P.warm; c.beginPath(); c.arc(x, y, 0.8 + rnd() * 1.4, 0, 6.283); c.fill(); }
    c.restore();
  }
  function cityPlates(c, w, h, rnd, P) {
    c.save();
    const cell = 88;
    // concrete slabs, each with its own tone and a lit top edge
    for (let gy = -1; gy * cell < h + cell; gy++) for (let gx = -1; gx * cell < w + cell; gx++) {
      const x = gx * cell, y = gy * cell, v = rnd();
      c.globalAlpha = 0.10 + v * 0.16; c.fillStyle = v < 0.5 ? P.sky : P.shade;
      c.fillRect(x + 3, y + 3, cell - 6, cell - 6);
      c.globalAlpha = 0.10; c.fillStyle = '#fff'; c.fillRect(x + 3, y + 3, cell - 6, 2);
      c.globalAlpha = 0.16; c.fillStyle = '#000'; c.fillRect(x + 3, y + cell - 5, cell - 6, 2);
    }
    // expansion joints
    c.globalAlpha = 0.4; c.strokeStyle = P.shade; c.lineWidth = 3;
    for (let gy = 0; gy * cell < h + cell; gy++) { c.beginPath(); c.moveTo(0, gy * cell); c.lineTo(w, gy * cell); c.stroke(); }
    for (let gx = 0; gx * cell < w + cell; gx++) { c.beginPath(); c.moveTo(gx * cell, 0); c.lineTo(gx * cell, h); c.stroke(); }
    c.globalAlpha = 0.14; c.strokeStyle = '#fff'; c.lineWidth = 1;
    for (let gy = 0; gy * cell < h + cell; gy++) { c.beginPath(); c.moveTo(0, gy * cell + 2); c.lineTo(w, gy * cell + 2); c.stroke(); }

    // painted lane markings running down the plate
    c.globalAlpha = 0.20; c.fillStyle = '#e8edf3';
    for (let i = 0; i < 3; i++) { const x = 60 + rnd() * (w - 120); for (let y = -20; y < h; y += 54) c.fillRect(x, y, 7, 30); }

    // hazard stripe bands at slab edges
    for (let i = 0; i < 7; i++) {
      const x = rnd() * w, y = rnd() * h, ww = 90 + rnd() * 180, vert = rnd() < 0.5;
      c.save(); c.translate(x, y); if (vert) c.rotate(1.5708); c.globalAlpha = 0.45;
      for (let k = 0; k < ww; k += 18) { c.fillStyle = (k / 18 | 0) % 2 ? '#ffd24a' : '#20252c'; c.beginPath(); c.moveTo(k, 0); c.lineTo(k + 10, 0); c.lineTo(k + 4, 14); c.lineTo(k - 6, 14); c.closePath(); c.fill(); }
      c.restore();
    }
    // grates, rivets and oil stains
    for (let i = 0; i < 9; i++) {
      const x = rnd() * w, y = rnd() * h, gw = 42, gh = 30;
      c.globalAlpha = 0.30; c.fillStyle = P.shade; c.fillRect(x, y, gw, gh);
      c.globalAlpha = 0.20; c.fillStyle = P.accent;
      for (let k = 3; k < gw - 3; k += 7) c.fillRect(x + k, y + 3, 3, gh - 6);
    }
    c.globalAlpha = 0.22; c.fillStyle = P.accent;
    for (let i = 0; i < 300; i++) { const x = rnd() * w, y = rnd() * h; c.beginPath(); c.arc(x, y, 1.1, 0, 6.283); c.fill(); }
    for (let i = 0; i < 14; i++) blob(c, rnd() * w, rnd() * h, 24 + rnd() * 60, 14 + rnd() * 34, rnd() * 3, '#12161b', 0.16 + rnd() * 0.12, 10);
    c.restore();
  }

  const FEATURE = { 1: grassTufts, 2: duneRipples, 3: snowDrifts, 4: lavaCracks, 5: cityPlates };

  /* Bake the full-screen ground for one region. */
  function bake(regionId, w, h, seed) {
    const P = PAL[regionId] || PAL[1];
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(w)); cv.height = Math.max(1, Math.round(h));
    const c = cv.getContext('2d');
    const rnd = rngOf(seed * 2654435761 + regionId * 9176);

    // 1. base gradient — light at the horizon, deeper toward the player
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, P.sky); g.addColorStop(0.34, P.top); g.addColorStop(0.72, P.mid); g.addColorStop(1, P.deep);
    c.fillStyle = g; c.fillRect(0, 0, w, h);

    // 2. macro colour variation — big soft blotches in both directions
    for (let i = 0; i < 22; i++) blob(c, rnd() * w, rnd() * h, 90 + rnd() * 260, 50 + rnd() * 150, rnd() * 3, rnd() < 0.5 ? P.shade : P.accent, 0.06 + rnd() * 0.10, 34);
    // 3. mid-scale patches with a crisper edge
    for (let i = 0; i < 16; i++) blob(c, rnd() * w, rnd() * h, 40 + rnd() * 110, 22 + rnd() * 60, rnd() * 3, rnd() < 0.5 ? P.top : P.deep, 0.10 + rnd() * 0.10, 12);

    // 4. region signature pass
    (FEATURE[regionId] || grassTufts)(c, w, h, rnd, P);

    // 5. fine grain to kill any remaining banding
    grain(c, w, h, rnd, P.shade, 2600, 1.6, 0.05);
    grain(c, w, h, rnd, P.accent, 1800, 1.4, 0.05);

    // 6. lighting: warm top-left key light, cool bottom vignette
    const key = c.createRadialGradient(w * 0.28, h * 0.16, 10, w * 0.28, h * 0.16, Math.max(w, h) * 0.9);
    key.addColorStop(0, 'rgba(255,255,255,' + (0.18 * (P.light != null ? P.light : 1)).toFixed(3) + ')'); key.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = key; c.fillRect(0, 0, w, h);
    const vig = c.createRadialGradient(w / 2, h * 0.46, Math.min(w, h) * 0.32, w / 2, h * 0.5, Math.max(w, h) * 0.78);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.34)');
    c.fillStyle = vig; c.fillRect(0, 0, w, h);
    return cv;
  }

  const Terrain = {
    palette: id => PAL[id] || PAL[1],
    /* Cached full-screen ground texture. Only re-bakes when region/level/size changes. */
    get(regionId, w, h, seed) {
      const key = regionId + '|' + Math.round(w) + 'x' + Math.round(h) + '|' + seed;
      let cv = cache.get(key);
      if (!cv) { cv = bake(regionId, w, h, seed); if (cache.size > 6) cache.delete(cache.keys().next().value); cache.set(key, cv); }
      return cv;
    },
    clear() { cache.clear(); },
  };
  global.Terrain = Terrain;
})(window);
