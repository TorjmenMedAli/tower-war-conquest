/* ===== Castle showcase art — 7 build stages (frames 0..6) =====
   Ported from the Claude Design component CastleFrame.dc.html
   (project "Game UI development plan"). 2D side-profile: a FIXED stone
   watchtower stands on the right in every frame; the castle builds up to
   its left, empty claim (0) -> full fortress (6). Drawn as absolutely
   positioned CSS rectangles inside a 200x172 box, so it keeps the exact
   gradients / clip-paths / shadows of the original design.

   Usage:  CastleArt.render(boxEl, frame)   // frame 0..6
           CastleArt.FRAMES                  // 7
   The companion @keyframes flagWaveL / dustPuff live in style.css. */
window.CastleArt = (() => {
  const FRAMES = 7;

  function parts(frame) {
    const BASE = 16;
    const out = [];
    const add = s => out.push(s);
    const r = (l, b, w, h, bg, ex = '') => `position:absolute;left:${l}px;bottom:${b}px;width:${w}px;height:${h}px;background:${bg};${ex}`;

    const sandF = 'linear-gradient(90deg,#eccb8d,#cf9a5b)', sandFflat = '#d4a262';
    const sandB = 'linear-gradient(90deg,#b78f57,#9a753f)', sandBflat = '#a47c46';
    const woodF = 'linear-gradient(90deg,#8c6239,#6a4729)', woodFflat = '#7a5430';
    const woodB = 'linear-gradient(90deg,#664629,#473018)';
    const FLAG = '#E0783C';

    const merlons = (l, topB, w, n, flat) => {
      const per = w / n;
      for (let i = 0; i < n; i++)
        add(r(l + i * per + per * 0.12, topB, per * 0.6, 6, flat, 'box-shadow:inset 2px 0 0 rgba(255,255,255,.16),inset -2px 0 3px rgba(90,55,20,.28);'));
    };
    const slit = (l, b, h = 11) => add(r(l, b, 4.5, h, '#3a2a18', 'border-radius:3px 3px 1px 1px;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.08);'));
    const gate = (l, b, w, h) => {
      add(r(l, b, w, h, '#2c1e12', 'border-radius:' + (w / 2) + 'px ' + (w / 2) + 'px 0 0;'));
      add(r(l + 1.5, b, w - 3, h - 1.5, 'linear-gradient(90deg,#5a3c24,#3a2616)', 'border-radius:' + (w / 2) + 'px ' + (w / 2) + 'px 0 0;'));
      add(r(l + w / 2 - 0.8, b, 1.6, h - 4, '#241710'));
    };
    const flag = (poleL, baseB, poleH, col) => {
      add(r(poleL, baseB, 2.4, poleH, '#46321f', 'border-radius:2px;'));
      add(`position:absolute;left:${poleL - 18}px;bottom:${baseB + poleH - 13}px;width:18px;height:11px;background:${col};clip-path:polygon(100% 0,0 50%,100% 100%);box-shadow:0 1px 2px rgba(0,0,0,.18);transform-origin:right center;animation:flagWaveL 2.6s ease-in-out infinite;`);
      add(r(poleL - 1, baseB + poleH - 2, 4.2, 4.2, '#f0d28a', 'border-radius:50%;'));
    };
    const log = (l, b, w, h, pal) => add(`position:absolute;left:${l}px;bottom:${b}px;width:${w}px;height:${h}px;background:${pal};clip-path:polygon(50% 0,100% 16%,100% 100%,0 100%,0 16%);box-shadow:inset -2px 0 4px rgba(0,0,0,.25),inset 2px 0 3px rgba(255,255,255,.1);`);
    const scaffoldV = (l, b, w, h) => {
      add(r(l, b, 2.5, h, '#b07d44', 'opacity:.95;'));
      add(r(l + w - 2.5, b, 2.5, h, '#b07d44', 'opacity:.95;'));
      for (let i = 1; i <= 3; i++) add(r(l - 1, b + (h / 3) * i - 1.5, w + 2, 2.5, '#8a5d2f', 'opacity:.95;'));
      add(`position:absolute;left:${l}px;bottom:${b}px;width:${Math.hypot(w, h)}px;height:2.2px;background:#b98a4e;transform-origin:left bottom;transform:rotate(${Math.atan2(h, w) * 180 / Math.PI}deg);opacity:.8;`);
    };
    const dust = (l, b, w, h) => add(r(l, b, w, h, 'radial-gradient(circle,rgba(225,205,165,.72),transparent 70%)', 'border-radius:50%;animation:dustPuff 2.4s ease-in-out infinite;'));
    const cactus = (l, b, s = 1) => { add(r(l, b, 6 * s, 22 * s, '#5b8f4a', 'border-radius:5px;')); add(r(l - 5 * s, b + 8 * s, 4 * s, 10 * s, '#5b8f4a', 'border-radius:4px;')); add(r(l - 5 * s, b + 8 * s, 7 * s, 4 * s, '#5b8f4a', 'border-radius:3px;')); add(r(l + 6 * s, b + 11 * s, 4 * s, 8 * s, '#5b8f4a', 'border-radius:4px;')); add(r(l + 3 * s, b + 11 * s, 7 * s, 4 * s, '#5b8f4a', 'border-radius:3px;')); };
    const barrel = (l, b) => { add(r(l, b, 11, 14, 'linear-gradient(90deg,#8a6038,#6a4729)', 'border-radius:3px;')); add(r(l, b + 3, 11, 2, '#46301c')); add(r(l, b + 9, 11, 2, '#46301c')); };

    // ===== FIXED watchtower (identical in every frame) — right side =====
    const fixedTower = () => {
      const tx = 168, tw = 26, th = 64;
      add(r(tx - 4, BASE, tw + 8, 7, sandBflat, 'border-radius:3px;'));                 // wider footing
      add(r(tx, BASE, tw, th, sandF, 'border-radius:3px 3px 0 0;box-shadow:inset -4px 0 6px rgba(90,55,20,.28),inset 3px 0 4px rgba(255,255,255,.14);'));
      add(r(tx, BASE + th * 0.5, tw, 2, 'rgba(90,55,20,.18)'));                          // stone band
      add(r(tx, BASE + th * 0.78, tw, 2, 'rgba(90,55,20,.14)'));
      merlons(tx, BASE + th, tw, 2, sandFflat);                                          // battlements
      slit(tx + tw / 2 - 2.25, BASE + 34, 13);                                           // window
      add(r(tx + tw / 2 - 6, BASE, 12, 15, '#3a2616', 'border-radius:6px 6px 0 0;'));     // door
      flag(tx + 6, BASE + th + 7, 15, FLAG);                                             // flag
    };

    // ground + approach path from the LEFT
    add(r(-6, -2, 212, 26, 'linear-gradient(180deg,#e0bd80,#c39c5e)', 'box-shadow:inset 0 -5px 9px rgba(120,80,30,.2);'));
    add(`position:absolute;left:0;bottom:${BASE - 6}px;width:96px;height:14px;background:linear-gradient(90deg,#e9d3a2,#d8b87c);clip-path:polygon(0 55%,100% 0,100% 100%,0 100%);opacity:.92;`);
    add(`position:absolute;left:8px;bottom:${BASE - 1}px;width:80px;height:2px;background:repeating-linear-gradient(90deg,rgba(150,110,50,.3) 0 7px,transparent 7px 13px);`);

    const f = frame;
    if (f === 0) {
      // empty claim — only the fixed tower stands; survey stakes & sign mark the plot
      add(r(96, BASE, 3, 26, woodFflat, 'border-radius:2px;'));
      add(r(96, BASE + 18, 26, 16, 'linear-gradient(90deg,#caa06a,#a9783f)', 'border-radius:3px;box-shadow:inset 0 0 0 2px rgba(90,55,20,.4);'));
      add(r(101, BASE + 26, 16, 2.5, '#5e3f27')); add(r(101, BASE + 22, 12, 2.5, '#5e3f27'));
      [34, 60, 90, 124].forEach((x, i) => { const hh = 20 - i * 2; add(r(x, BASE, 3, hh, woodFflat, 'border-radius:2px;')); add(r(x - 2, BASE + hh - 4, 7, 4, '#d23b2b', 'border-radius:2px;')); });
      add(`position:absolute;left:34px;bottom:${BASE + 13}px;width:91px;height:2px;background:repeating-linear-gradient(90deg,#cbb48a 0 6px,transparent 6px 11px);opacity:.85;`);
      cactus(20, BASE, 0.9); barrel(140, BASE);
    } else if (f === 1) {
      // groundwork — footing, lumber, posts beside the tower
      add(r(40, BASE, 116, 9, sandF, 'border-radius:2px;box-shadow:inset 0 -3px 5px rgba(90,55,20,.3);'));
      [48, 74, 120, 148].forEach(x => add(r(x, BASE + 6, 4, 22, woodFflat, 'border-radius:2px;')));
      add(`position:absolute;left:46px;bottom:${BASE + 24}px;width:32px;height:4px;background:${woodFflat};transform:rotate(-6deg);border-radius:2px;`);
      log(96, BASE, 38, 7, woodF); log(100, BASE + 6, 38, 7, woodF);
      add(r(24, BASE - 1, 28, 12, 'radial-gradient(ellipse at 50% 30%,#c79a5e,#9c6f3a)', 'border-radius:50% 50% 5px 5px;'));
      barrel(150, BASE);
      dust(60, BASE + 8, 28, 15);
    } else if (f === 2) {
      // wooden outpost — palisade wall + gate left, linking to fixed tower
      for (let x = 28; x <= 96; x += 12) { if (x >= 40 && x <= 64) continue; log(x, BASE, 11, 34, woodF); }
      add(r(38, BASE + 30, 30, 7, '#5e3f27', 'border-radius:2px;'));
      gate(42, BASE, 22, 27);
      for (let x = 108; x <= 156; x += 12) log(x, BASE, 11, 24, woodB);   // low link wall to tower
      slit(118, BASE + 8, 8);
      cactus(18, BASE, 0.8);
    } else if (f === 3) {
      // raising walls — stone footing + scaffolds beside tower
      add(r(34, BASE, 122, 26, sandF, 'border-radius:2px;box-shadow:inset 0 -5px 8px rgba(90,55,20,.28);'));
      add(r(34, BASE + 13, 122, 2, 'rgba(90,55,20,.2)'));
      add(r(104, BASE, 34, 38, sandB, 'border-radius:2px;'));            // back half-keep
      scaffoldV(102, BASE, 38, 48);
      scaffoldV(34, BASE + 24, 56, 22);
      gate(44, BASE, 20, 22);
      add(r(16, BASE, 13, 9, sandFflat, 'border-radius:2px;')); add(r(18, BASE + 9, 11, 7, sandFflat, 'border-radius:2px;'));
      dust(116, BASE + 42, 30, 16);
    } else if (f === 4) {
      // adobe keep — front wall + gate left, keep rising behind
      add(r(104, BASE, 42, 64, sandB, 'border-radius:3px 3px 0 0;box-shadow:inset 0 -6px 9px rgba(70,45,18,.3);'));
      merlons(104, BASE + 64, 42, 4, sandBflat); slit(122, BASE + 36, 13);
      add(r(26, BASE, 104, 40, sandF, 'border-radius:2px;box-shadow:inset 0 -6px 9px rgba(90,55,20,.26),inset 0 3px 0 rgba(255,255,255,.14);'));
      add(r(26, BASE + 20, 104, 2, 'rgba(90,55,20,.18)'));
      merlons(26, BASE + 40, 104, 6, sandFflat);
      gate(38, BASE, 24, 30);
      slit(90, BASE + 16); slit(108, BASE + 16);
      add(r(8, BASE, 24, 50, sandF, 'border-radius:3px 3px 0 0;'));      // front-left tower
      merlons(8, BASE + 50, 24, 2, sandFflat); slit(17, BASE + 22, 13);
      flag(116, BASE + 64, 15, FLAG);
    } else if (f === 5) {
      // fortifying — taller keep, scaffold
      add(r(104, BASE, 44, 78, sandB, 'border-radius:3px 3px 0 0;box-shadow:inset 0 -6px 9px rgba(70,45,18,.3);'));
      merlons(104, BASE + 78, 44, 4, sandBflat); slit(124, BASE + 44, 13);
      scaffoldV(102, BASE + 40, 48, 40);
      add(r(26, BASE, 104, 40, sandF, 'border-radius:2px;box-shadow:inset 0 -6px 9px rgba(90,55,20,.26),inset 0 3px 0 rgba(255,255,255,.14);'));
      merlons(26, BASE + 40, 104, 6, sandFflat);
      gate(38, BASE, 24, 30);
      add(r(8, BASE, 24, 50, sandF, 'border-radius:3px 3px 0 0;'));
      merlons(8, BASE + 50, 24, 2, sandFflat);
      flag(116, BASE + 78, 16, FLAG);
      dust(118, BASE + 74, 38, 16);
    } else if (f === 6) {
      // full fortress — layered, all left of the fixed tower
      add(r(88, BASE, 72, 40, sandB, 'border-radius:2px;box-shadow:inset 0 -6px 9px rgba(70,45,18,.3);'));   // back wall
      merlons(88, BASE + 40, 72, 5, sandBflat);
      add(r(104, BASE, 44, 84, sandB, 'border-radius:3px 3px 0 0;box-shadow:inset 0 -7px 10px rgba(70,45,18,.32);'));  // keep
      merlons(104, BASE + 84, 44, 4, sandBflat);
      slit(114, BASE + 48, 13); slit(132, BASE + 48, 13);
      add(r(20, BASE, 116, 44, sandF, 'border-radius:2px;box-shadow:inset 0 -7px 10px rgba(90,55,20,.28),inset 0 3px 0 rgba(255,255,255,.15);'));  // front wall
      add(r(20, BASE + 22, 116, 2, 'rgba(90,55,20,.18)'));
      merlons(20, BASE + 44, 116, 7, sandFflat);
      gate(34, BASE, 26, 34);
      slit(92, BASE + 18); slit(112, BASE + 18);
      add(r(74, BASE + 44, 24, 8, '#33333a', 'border-radius:4px;box-shadow:inset 0 2px 0 rgba(255,255,255,.12);'));  // cannon
      add(r(68, BASE + 45, 8, 6, '#1c1c20', 'border-radius:50%;'));
      add(r(90, BASE + 40, 9, 9, '#2a2a30', 'border-radius:50%;box-shadow:inset 0 0 0 2px #4a4a52;'));
      add(r(2, BASE, 26, 66, sandF, 'border-radius:3px 3px 0 0;box-shadow:inset 0 -6px 9px rgba(90,55,20,.28);'));   // front-left tower
      merlons(2, BASE + 66, 26, 2, sandFflat); slit(13, BASE + 28, 13); slit(13, BASE + 48, 11);
      add(r(118, BASE + 48, 19, 24, 'linear-gradient(180deg,#E0783C,#c25f27)', 'clip-path:polygon(0 0,100% 0,100% 86%,50% 100%,0 86%);box-shadow:0 2px 4px rgba(0,0,0,.2);'));  // banner
      add(r(124, BASE + 61, 7, 7, '#ffe6cc', 'border-radius:50%;opacity:.85;'));
      barrel(66, BASE);
      flag(118, BASE + 84, 24, FLAG); flag(8, BASE + 66, 15, FLAG);
    }

    // fixed tower always last so it reads as the foremost right structure
    fixedTower();
    return out;
  }

  function render(box, frame) {
    if (!box) return;
    let f = (frame === undefined || frame === null) ? 0 : (frame | 0);
    f = ((f % FRAMES) + FRAMES) % FRAMES;
    box.innerHTML = parts(f).map(s => `<div style="${s}"></div>`).join('');
  }

  return { FRAMES, parts, render };
})();
