/* ===== Rank heroes — imported from the Claude Design project "Tower Defense Characters"
   (renderer.js, project 562100ba). 10 upgradeable soldiers (Recruit → Juggernaut), flat vector
   cartoon, side view facing RIGHT, transparent bg. Fully procedural — no PNGs needed.
   window.TDSRenderer = { CHARACTERS, GUNS, ANIMS, FRAMES, WEAPON_CANVAS, drawFrame, drawWeapon, getSocket }
   drawFrame(ctx, size, charIndex, animName, t[, {gun:'none'}]) draws one pose; getSocket() gives the
   gun attach point for body-only frames so the game can rotate the weapon to AIM at its target. */
(function () {
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const ease = (t) => t * t * (3 - 2 * t);

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const f = amt / 100;
    if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
    else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }

  function rr(ctx, x, y, w, h, r, fill, ol) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = fill; ctx.fill();
    if (ol) { ctx.lineWidth = 1.4; ctx.strokeStyle = ol; ctx.stroke(); }
  }
  function circ(ctx, x, y, r, fill, ol) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = fill; ctx.fill();
    if (ol) { ctx.lineWidth = 1.4; ctx.strokeStyle = ol; ctx.stroke(); }
  }
  function limb(ctx, x1, y1, ex, ey, x2, y2, w, color, ol) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(ex, ey); ctx.lineTo(x2, y2);
    ctx.strokeStyle = ol; ctx.lineWidth = w + 2.8; ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
  }
  function seg(ctx, x1, y1, x2, y2, w, color, ol) {
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = ol; ctx.lineWidth = w + 2.8; ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
  }
  // two-bone IK: returns [elbowX, elbowY, handX, handY(clamped)]
  function ik(ax, ay, tx, ty, l1, l2, dir) {
    let dx = tx - ax, dy = ty - ay, d = Math.hypot(dx, dy);
    const m = Math.min(Math.max(d, 0.1), l1 + l2 - 0.5);
    if (d > 0.001) { dx *= m / d; dy *= m / d; } else { dx = 0; dy = m; }
    d = m;
    const a = Math.atan2(dy, dx);
    const cos = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
    const b = a - dir * Math.acos(cos);
    return [ax + Math.cos(b) * l1, ay + Math.sin(b) * l1, ax + dx, ay + dy];
  }

  /* ---------------- guns ---------------- */
  const GC = { metal: '#51565D', dark: '#2B2E33', wood: '#8C5A33', drum: '#5F6A39', outline: '#1C1E22' };
  const GUNS = {
    pistol: { rof: 1, fore: 5, muz: [16, -3.5], hold: 'shoulder', draw(ctx) {
      rr(ctx, -1, -1, 5, 9, 1.5, GC.dark, GC.outline);
      rr(ctx, -3, -6, 19, 5.5, 1.5, GC.metal, GC.outline);
    } },
    mpistol: { rof: 2, fore: 7, muz: [20, -3.8], hold: 'shoulder', draw(ctx) {
      rr(ctx, -1, -1, 5, 10, 1.5, GC.dark, GC.outline);
      rr(ctx, 6, -1, 4, 8, 1, GC.metal, GC.outline);
      rr(ctx, -3, -6.5, 23, 6, 1.5, GC.metal, GC.outline);
    } },
    smg: { rof: 3, fore: 12, muz: [25, -4.2], hold: 'shoulder', draw(ctx) {
      rr(ctx, -8, -5, 7, 3.6, 1, GC.dark, GC.outline);
      rr(ctx, 0, -1, 4.5, 9, 1, GC.dark, GC.outline);
      rr(ctx, 8, -2, 4.5, 10, 1, GC.metal, GC.outline);
      rr(ctx, -4, -7, 28, 5.5, 2, GC.metal, GC.outline);
    } },
    shotgun: { rof: 1, fore: 14, muz: [30, -4], hold: 'shoulder', draw(ctx) {
      rr(ctx, -9, -6.5, 8, 7, 2, GC.wood, GC.outline);
      rr(ctx, 0, -1, 4.5, 8, 1, GC.dark, GC.outline);
      rr(ctx, -2, -6.5, 32, 5, 1.5, GC.metal, GC.outline);
      rr(ctx, 10, -2.5, 9, 4, 1.5, GC.wood, GC.outline);
    } },
    rifle: { rof: 3, fore: 16, muz: [33, -4.5], hold: 'shoulder', draw(ctx) {
      rr(ctx, -10, -6.5, 8, 6, 1.5, GC.dark, GC.outline);
      rr(ctx, 0, -1, 4.5, 8.5, 1, GC.dark, GC.outline);
      rr(ctx, 7, -1.5, 5, 10, 1, GC.metal, GC.outline);
      rr(ctx, -4, -7, 31, 5.5, 1.5, GC.metal, GC.outline);
      rr(ctx, 26, -6, 7, 3, 1, GC.dark, GC.outline);
    } },
    dmr: { rof: 1, fore: 17, muz: [38, -4.5], hold: 'shoulder', draw(ctx) {
      rr(ctx, -11, -7, 9, 6.5, 1.5, GC.dark, GC.outline);
      rr(ctx, 0, -1, 4.5, 8.5, 1, GC.dark, GC.outline);
      rr(ctx, 8, -1.5, 5, 9, 1, GC.metal, GC.outline);
      rr(ctx, -4, -7, 35, 5.5, 1.5, GC.metal, GC.outline);
      rr(ctx, 30, -6, 8, 2.8, 1, GC.dark, GC.outline);
      rr(ctx, 4, -11, 12, 4, 1.8, GC.dark, GC.outline);
    } },
    lmg: { rof: 4, fore: 16, muz: [37, -5], hold: 'shoulder', draw(ctx) {
      rr(ctx, -11, -7.5, 9, 7, 1.5, GC.dark, GC.outline);
      rr(ctx, 0, -1, 5, 9, 1, GC.dark, GC.outline);
      rr(ctx, 5, -1, 8, 10, 1.5, GC.drum, GC.outline);
      rr(ctx, -5, -8, 35, 6.5, 2, GC.metal, GC.outline);
      rr(ctx, 29, -6.5, 8, 3.5, 1, GC.dark, GC.outline);
    } },
    glrifle: { rof: 2, fore: 15, muz: [35, -5], hold: 'shoulder', draw(ctx) {
      rr(ctx, -11, -7, 9, 6.5, 1.5, GC.dark, GC.outline);
      rr(ctx, 0, -1, 5, 9, 1, GC.dark, GC.outline);
      rr(ctx, 7, -1.5, 5, 10, 1, GC.metal, GC.outline);
      rr(ctx, -4, -7.5, 33, 6, 1.5, GC.metal, GC.outline);
      rr(ctx, 28, -6.5, 7, 3.5, 1, GC.dark, GC.outline);
      rr(ctx, 8, -1.2, 14, 5, 2.5, GC.dark, GC.outline);
    } },
    hmg: { rof: 5, fore: 17, muz: [42, -5.5], hold: 'shoulder', draw(ctx) {
      rr(ctx, -12, -8.5, 10, 8, 2, GC.dark, GC.outline);
      rr(ctx, 0, -1, 5.5, 9.5, 1, GC.dark, GC.outline);
      rr(ctx, 4, -1, 9, 11, 1.5, GC.metal, GC.outline);
      rr(ctx, -6, -9, 39, 7.5, 2, GC.metal, GC.outline);
      rr(ctx, 32, -7.5, 10, 4.5, 1.5, GC.dark, GC.outline);
      ctx.fillStyle = GC.dark;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(12 + i * 6, -5.5, 1.3, 0, TAU); ctx.fill(); }
    } },
    minigun: { rof: 5, fore: 13, muz: [43, -3.5], hold: 'hip', draw(ctx, spin) {
      const hot = Math.floor((spin || 0) * 6) % 3;
      for (let i = 0; i < 3; i++) rr(ctx, 7, -7.2 + i * 3.4, 35, 2.4, 1.2, i === hot ? '#767C85' : GC.dark, GC.outline);
      rr(ctx, 36, -8, 5, 10.5, 1.8, GC.dark, GC.outline);
      rr(ctx, -12, -8.5, 20, 12.5, 3.5, GC.metal, GC.outline);
      rr(ctx, -1, 4, 5, 7, 1.2, GC.dark, GC.outline);
    } },
  };

  const GENERIC = { rof: 2, fore: 12, muz: [20, -4], hold: 'shoulder', draw() {} };
  function drawFlash(ctx) {
    ctx.fillStyle = '#FFC93C';
    ctx.beginPath();
    ctx.moveTo(-1, -3.2); ctx.lineTo(5, -6.5); ctx.lineTo(4.5, -1.5); ctx.lineTo(12, 0);
    ctx.lineTo(4.5, 1.5); ctx.lineTo(5, 6.5); ctx.lineTo(-1, 3.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFF3C4'; ctx.beginPath(); ctx.arc(2.2, 0, 2.6, 0, TAU); ctx.fill();
  }

  const GUN_LABEL = { pistol: 'Pistol', mpistol: 'Machine pistol', smg: 'SMG', shotgun: 'Shotgun', rifle: 'Assault rifle', dmr: 'Marksman rifle', lmg: 'LMG', glrifle: 'Rifle + GL', hmg: 'Heavy MG', minigun: 'Minigun' };

  /* ---------------- characters ---------------- */
  const CHARACTERS = [
    { id: '01-recruit', name: 'Recruit', gun: 'pistol', bulk: 0.88, hscale: 0.95, skin: '#E9B888', uni: '#79806B', pants: '#69705C', boot: '#3F4238', head: 'visor', helm: '#848B76', visor: '#F2C14E', vest: null, pads: 0, glove: null },
    { id: '02-private', name: 'Private', gun: 'mpistol', bulk: 0.94, hscale: 0.97, skin: '#D9A06B', uni: '#6F7663', pants: '#5F6654', boot: '#3A3D33', head: 'visor', helm: '#7A816C', visor: '#F0B345', vest: '#525948', pads: 0, glove: '#4A4F42' },
    { id: '03-specialist', name: 'Specialist', gun: 'smg', bulk: 1.0, hscale: 1.0, skin: '#E9B888', uni: '#666D5B', pants: '#575E4D', boot: '#363930', head: 'visor', helm: '#707765', visor: '#EEA43C', vest: '#4B5142', pads: 1, glove: '#43483C' },
    { id: '04-corporal', name: 'Corporal', gun: 'shotgun', bulk: 1.06, hscale: 1.02, skin: '#C68B59', uni: '#5E6554', pants: '#4F5647', boot: '#32352C', head: 'visor', helm: '#68705E', visor: '#EC9635', vest: '#454B3D', pads: 1, glove: '#3D4137' },
    { id: '05-sergeant', name: 'Sergeant', gun: 'rifle', bulk: 1.12, hscale: 1.04, skin: '#E2AC79', uni: '#565C4D', pants: '#484E41', boot: '#2E302A', head: 'visor', helm: '#5F6657', visor: '#E8872F', vest: '#3F4438', pads: 2, glove: '#383C33' },
    { id: '06-lieutenant', name: 'Lieutenant', gun: 'dmr', bulk: 1.18, hscale: 1.06, skin: '#D9A06B', uni: '#4F5449', pants: '#42463C', boot: '#2A2C27', head: 'full', helm: '#575C50', visor: '#E27729', vest: '#393D33', pads: 2, glove: '#33362E' },
    { id: '07-captain', name: 'Captain', gun: 'lmg', bulk: 1.26, hscale: 1.08, skin: '#C68B59', uni: '#484C44', pants: '#3C3F38', boot: '#262824', head: 'full', helm: '#4F5349', visor: '#DC6423', vest: '#333630', pads: 2, glove: '#2E302B' },
    { id: '08-commando', name: 'Commando', gun: 'glrifle', bulk: 1.34, hscale: 1.1, skin: '#8D5A3B', uni: '#49523A', pants: '#3F4734', boot: '#2A2925', head: 'full', helm: '#39412E', vest: '#333B2C', pads: 2, glove: '#2C2A25', visor: '#D8842F' },
    { id: '09-heavy', name: 'Heavy', gun: 'hmg', bulk: 1.46, hscale: 1.12, skin: '#E9B888', uni: '#4E5257', pants: '#43474D', boot: '#26282B', head: 'full', helm: '#5A5F66', vest: '#3A3E44', pads: 3, glove: '#2B2D31', visor: '#E2603C' },
    { id: '10-juggernaut', name: 'Juggernaut', gun: 'minigun', bulk: 1.6, hscale: 1.15, skin: '#E9B888', uni: '#43474E', pants: '#383C42', boot: '#1F2124', head: 'full', helm: '#4E535B', vest: '#2F3339', pads: 3, glove: '#232529', visor: '#E04A33' },
  ];
  CHARACTERS.forEach((c, i) => { c.outline = shade(c.uni, -62); c.tier = i + 1; c.gunLabel = GUN_LABEL[c.gun]; });

  const ANIMS = {
    idle: { loop: 1 }, walk: { loop: 1 }, shoot: { loop: 1 },
    hit: { loop: 0 }, die: { loop: 0 }, reload: { loop: 0 }, melee: { loop: 0 },
  };
  const FRAMES = 10;

  /* ---------------- poses ---------------- */
  function pose(anim, t, G) {
    const p = { bob: 0, lean: 0, xoff: 0, hipDrop: 0, walk: -1, lunge: 0, gunAng: 0, gunRec: 0, flash: 0, flinch: 0, fall: 0, armsUp: 0, magT: -1, thrust: 0, slash: 0, spin: 0, gunDropT: 0 };
    switch (anim) {
      case 'idle':
        p.bob = Math.sin(t * TAU) * 1.6;
        p.gunAng = Math.sin(t * TAU) * 2;
        break;
      case 'walk':
        p.walk = t;
        p.bob = -Math.abs(Math.sin(t * TAU)) * 2;
        p.lean = 5;
        break;
      case 'shoot': {
        const n = G.rof, ph = (t * n) % 1;
        const r = Math.max(0, 1 - ph * 3.5);
        p.gunRec = r * 4; p.lean = -r * 4.5;
        p.flash = ph < 0.24 ? 1 : 0;
        p.spin = t;
        break;
      }
      case 'hit': {
        const k = Math.sin(Math.PI * clamp(t * 1.15, 0, 1));
        p.lean = -17 * k; p.xoff = -4.5 * k; p.flinch = k; p.gunAng = 9 * k; p.bob = k;
        break;
      }
      case 'die': {
        const f = ease(clamp(t / 0.72, 0, 1));
        p.fall = f;
        p.armsUp = Math.sin(Math.PI * clamp(t * 1.5, 0, 1));
        p.hipDrop = f * 7;
        p.xoff = f * 42;
        p.gunDropT = clamp((t - 0.06) / 0.8, 0, 1);
        if (t > 0.75) p.fall = Math.min(1, f + Math.sin((t - 0.75) / 0.25 * Math.PI) * 0.03);
        break;
      }
      case 'reload': {
        const k = Math.sin(Math.PI * t);
        p.gunAng = 24 * k; p.lean = 3; p.bob = k;
        if (t > 0.3 && t < 0.85) p.magT = (t - 0.3) / 0.55;
        break;
      }
      case 'melee': {
        const k = Math.sin(Math.PI * clamp(t * 1.35, 0, 1));
        p.thrust = k * 9; p.lean = k * 14; p.xoff = k * 4; p.lunge = k;
        p.slash = t > 0.18 && t < 0.55 ? 1 : 0;
        break;
      }
    }
    return p;
  }

  /* ---------------- head / helmet ---------------- */
  function drawHead(ctx, cfg, hx, hy, r) {
    const ol = cfg.outline;
    if (cfg.head !== 'full') {
      circ(ctx, hx, hy, r, cfg.skin, ol);
      // eye
      circ(ctx, hx + r * 0.52, hy - r * 0.08, 1.5, '#26261F');
      // ear
      circ(ctx, hx - r * 0.15, hy + r * 0.1, 1.8, shade(cfg.skin, -14));
    }
    switch (cfg.head) {
      case 'cap':
        ctx.beginPath(); ctx.arc(hx, hy - 1, r + 1.2, Math.PI, TAU); ctx.closePath();
        ctx.fillStyle = cfg.helm; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = ol; ctx.stroke();
        rr(ctx, hx + r * 0.25, hy - r * 0.62, r * 1.15, 2.8, 1.2, cfg.helm, ol);
        break;
      case 'helmet':
        ctx.beginPath(); ctx.arc(hx, hy - 0.5, r + 2, Math.PI * 0.96, TAU + Math.PI * 0.04); ctx.closePath();
        ctx.fillStyle = cfg.helm; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = ol; ctx.stroke();
        rr(ctx, hx - r - 2, hy - r * 0.28, (r + 2) * 2, 3.2, 1.5, shade(cfg.helm, -14), ol);
        break;
      case 'combat':
        ctx.beginPath(); ctx.arc(hx, hy - 0.5, r + 2.2, Math.PI * 0.94, TAU + Math.PI * 0.06); ctx.closePath();
        ctx.fillStyle = cfg.helm; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = ol; ctx.stroke();
        rr(ctx, hx - r - 2, hy - r * 0.28, (r + 2.2) * 2, 3.2, 1.5, shade(cfg.helm, -14), ol);
        rr(ctx, hx - r * 0.55, hy - r * 0.1, r * 0.75, r * 0.85, 2, cfg.helm, ol); // ear cover
        break;
      case 'visor':
        ctx.beginPath(); ctx.arc(hx, hy, r + 2.4, Math.PI * 0.82, TAU + Math.PI * 0.28); ctx.closePath();
        ctx.fillStyle = cfg.helm; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = ol; ctx.stroke();
        rr(ctx, hx + r * 0.05, hy - r * 0.42, r * 1.15, r * 0.55, 2, cfg.visor, ol);
        break;
      case 'full': {
        circ(ctx, hx, hy, r + 2.4, cfg.helm, ol);
        ctx.beginPath(); ctx.arc(hx, hy + 1, r + 2.4, Math.PI * 0.12, Math.PI * 0.88); ctx.closePath();
        ctx.fillStyle = shade(cfg.helm, -18); ctx.fill();
        rr(ctx, hx + r * 0.12, hy - r * 0.38, r * 1.05, r * 0.42, 2, cfg.visor, ol);
        if (cfg.pads >= 3) rr(ctx, hx - 2.5, hy - r - 4.5, 6, 4, 1.5, shade(cfg.helm, -12), ol); // crest
        break;
      }
    }
  }

  /* ---------------- main draw ---------------- */
  function drawFrame(ctx, size, ci, anim, t, opts) {
    const cfg = CHARACTERS[ci];
    const ov = opts && opts.gun;
    const showGun = ov !== 'none';
    const G = ov ? (ov === 'none' ? GENERIC : GUNS[ov]) : GUNS[cfg.gun];
    const p = pose(anim, t, G);
    ctx.save();
    ctx.scale(size / 128, size / 128);
    const groundY = 116;
    const bk = cfg.bulk, hs = cfg.hscale, ol = cfg.outline;
    const H = (y) => groundY - (groundY - y) * hs;
    const gscale = 1.05 + (bk - 1) * 0.45;
    const cx0 = 46;
    const cx = cx0 + p.xoff;

    // dropped gun stays in world space (before body fall rotation)
    const dropped = anim === 'die' && p.gunDropT > 0.02;
    if (dropped && showGun) {
      const dt = p.gunDropT;
      const gx = cx0 + 16 + dt * 8;
      const gy = Math.min(groundY - 5, H(56) + 9 + dt * dt * 72);
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(0.85 * dt); ctx.scale(gscale, gscale);
      G.draw(ctx, 0); ctx.restore();
    }

    if (p.fall > 0) {
      ctx.translate(cx + 6, groundY); ctx.rotate(-p.fall * 1.42); ctx.translate(-(cx + 6), -groundY);
    }

    const hipY = H(82) + p.bob + p.hipDrop;
    const legTop = H(82);
    const legLen = groundY - 3 - legTop;
    const ll = legLen * 0.56;
    const lean = p.lean * RAD;
    const tlen = H(82) - H(56);
    const shX = cx + Math.sin(lean) * tlen, shY = hipY - Math.cos(lean) * tlen;
    const neck = H(56) - H(43);
    const hx = shX + Math.sin(lean) * neck, hy = shY - Math.cos(lean) * neck;
    const hr = 10 * (0.9 + bk * 0.12);
    const torsoW = 15 * bk;
    const legW = 6.4 * bk, armW = 5.2 * bk;
    const armL = 10.5 * hs;

    // feet targets
    let feet;
    if (p.walk >= 0) {
      feet = [0.5, 0].map((off) => {
        const ph = p.walk + off;
        const fx = cx + Math.sin(TAU * ph) * 11 * Math.min(1, legLen / 31);
        const lift = Math.max(0, Math.cos(TAU * ph)) * 5.5;
        return [fx, groundY - 3 - lift];
      });
    } else if (p.lunge > 0) {
      feet = [[cx - 8 - p.lunge * 6, groundY - 3], [cx + 8 + p.lunge * 7, groundY - 3]];
    } else if (anim === 'die') {
      feet = [[cx - 3, groundY - 3], [cx + 10, groundY - 3]];
    } else {
      const spread = 7 * (1 + (bk - 1) * 0.5);
      feet = [[cx - spread, groundY - 3], [cx + spread, groundY - 3]];
    }

    // gun anchor + hand targets
    let ga = p.gunAng * RAD;
    let gx, gy;
    if (G.hold === 'hip') { gx = shX + 9; gy = shY + tlen * 0.58; }
    else { gx = shX + 11; gy = shY + 7.5; }
    gx += p.thrust * 0.8 - p.gunRec;
    const gc = Math.cos(ga), gs = Math.sin(ga);
    const gpt = (lx, ly) => [gx + (lx * gc - ly * gs) * gscale, gy + (lx * gs + ly * gc) * gscale];

    const farSh = [shX - 2.5, shY + 1.5], nearSh = [shX + 1.5, shY + 1];
    let nearHand = gpt(1, 3);
    // clamp far hand along gun to reachable point
    let foreX = G.fore;
    let farHand = gpt(foreX, 2.5);
    for (let i = 0; i < 10; i++) {
      if (Math.hypot(farHand[0] - farSh[0], farHand[1] - farSh[1]) <= armL * 1.88) break;
      foreX *= 0.86; farHand = gpt(foreX, 2.5);
    }
    if (p.magT >= 0) farHand = gpt(Math.max(3, foreX - 3), 5 + Math.sin(p.magT * Math.PI) * 7);
    if (p.armsUp > 0 && dropped) {
      nearHand = [shX + 3 - 7 * p.armsUp, shY - 1 - 12 * p.armsUp];
      farHand = [shX - 4 - 5 * p.armsUp, shY + 2 - 15 * p.armsUp];
    }

    // ---- draw order ----
    // backpack
    if (cfg.pads >= 2) {
      rr(ctx, cx - torsoW * 0.5 - 6.5, shY + 2, 7.5, tlen * 0.62, 3, shade(cfg.uni, -26), ol);
      if (cfg.pads >= 3) seg(ctx, cx - torsoW * 0.5 - 3, shY + 3, cx - torsoW * 0.5 - 5, shY - 9, 1.6, shade(cfg.uni, -30), 'rgba(0,0,0,0)');
    }
    // far arm
    {
      const [ex, ey, hxx, hyy] = ik(farSh[0], farSh[1], farHand[0], farHand[1], armL, armL, -1);
      limb(ctx, farSh[0], farSh[1], ex, ey, hxx, hyy, armW - 0.6, shade(cfg.uni, -18), ol);
      circ(ctx, hxx, hyy, 2.7 * bk, cfg.glove ? shade(cfg.glove, -8) : shade(cfg.skin, -14), ol);
    }
    // back leg
    {
      const [kx, ky, fx, fy] = ik(cx - 1.5, hipY, feet[0][0], feet[0][1], ll, ll, 1);
      limb(ctx, cx - 1.5, hipY, kx, ky, fx, fy, legW, shade(cfg.pants, -16), ol);
      rr(ctx, fx - 3, fy - 2.5, 9.5 * (0.85 + bk * 0.15), 5.2, 2, shade(cfg.boot, -10), ol);
      if (cfg.pads >= 2) circ(ctx, kx, ky, 3 * bk, shade(cfg.pants, -28), ol);
    }
    // torso
    seg(ctx, cx, hipY, shX, shY, torsoW, cfg.uni, ol);
    if (cfg.vest) {
      const vx1 = cx + (shX - cx) * 0.12, vy1 = hipY + (shY - hipY) * 0.12;
      const vx2 = cx + (shX - cx) * 0.85, vy2 = hipY + (shY - hipY) * 0.85;
      seg(ctx, vx1, vy1, vx2, vy2, torsoW + 3.5, cfg.vest, ol);
      // vest pouch
      rr(ctx, cx + torsoW * 0.12, hipY - tlen * 0.42, 5.5 * bk, 5 * bk, 1.5, shade(cfg.vest, -16), ol);
    }
    if (cfg.pads >= 1) seg(ctx, shX + torsoW * 0.28, shY - 2, cx - torsoW * 0.28, hipY - 2, 2.6, shade(cfg.uni, -30), 'rgba(0,0,0,0)');
    // belt
    seg(ctx, cx - torsoW * 0.45, hipY - 1, cx + torsoW * 0.45, hipY - 1, 3, shade(cfg.pants, -30), 'rgba(0,0,0,0)');
    // head
    drawHead(ctx, cfg, hx, hy, hr);
    // shoulder pads
    if (cfg.pads >= 1) circ(ctx, shX + 1, shY, 5.2 * bk, cfg.vest ? shade(cfg.vest, -6) : cfg.helm, ol);
    // front leg
    {
      const [kx, ky, fx, fy] = ik(cx + 1.5, hipY, feet[1][0], feet[1][1], ll, ll, 1);
      limb(ctx, cx + 1.5, hipY, kx, ky, fx, fy, legW, cfg.pants, ol);
      rr(ctx, fx - 3, fy - 2.5, 9.5 * (0.85 + bk * 0.15), 5.2, 2, cfg.boot, ol);
      if (cfg.pads >= 2) circ(ctx, kx, ky, 3 * bk, shade(cfg.pants, -24), ol);
    }
    // gun
    if (!dropped && showGun) {
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(ga); ctx.scale(gscale, gscale);
      G.draw(ctx, p.spin * (anim === 'shoot' ? 3 : 0));
      ctx.restore();
    }
    // near arm
    {
      const [ex, ey, hxx, hyy] = ik(nearSh[0], nearSh[1], nearHand[0], nearHand[1], armL, armL, -1);
      limb(ctx, nearSh[0], nearSh[1], ex, ey, hxx, hyy, armW, cfg.uni, ol);
      circ(ctx, hxx, hyy, 2.8 * bk, cfg.glove || cfg.skin, ol);
    }
    // muzzle flash
    if (p.flash && !dropped && showGun) {
      const m = gpt(G.muz[0], G.muz[1]);
      ctx.save(); ctx.translate(m[0], m[1]); ctx.rotate(ga); ctx.scale(gscale, gscale);
      drawFlash(ctx);
      ctx.restore();
    }
    // melee slash
    if (p.slash && showGun) {
      const m = gpt(G.muz[0] + 3, G.muz[1]);
      ctx.save(); ctx.translate(m[0], m[1]);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineCap = 'round'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(0, 0, 10, -1.15, 1.15); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,201,60,0.9)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(0, 0, 13.5, -0.9, 0.9); ctx.stroke();
      ctx.restore();
    }
    // falling magazine
    if (p.magT >= 0 && showGun) {
      const base = gpt(Math.max(4, foreX - 2), 5);
      const my = Math.min(groundY - 4, base[1] + p.magT * p.magT * 58);
      const mx = base[0] + p.magT * 3;
      ctx.save(); ctx.translate(mx, my); ctx.rotate(0.8 * p.magT);
      rr(ctx, -2.2, -4.5, 4.6, 9, 1.2, GC.dark, ol);
      ctx.restore();
    }
    // hit flash (whiten everything drawn)
    if (p.flinch > 0) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(255,255,255,' + (p.flinch * 0.55).toFixed(3) + ')';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }
    ctx.restore();
  }

  /* weapon rendered standalone on a 104x56 canvas, grip at (26,32), scale 1.35 */
  const WEAPON_CANVAS = { w: 104, h: 56, grip: [26, 32], scale: 1.35 };
  function drawWeapon(ctx, gunName, fire, spin) {
    const G = GUNS[gunName];
    ctx.save();
    ctx.translate(WEAPON_CANVAS.grip[0], WEAPON_CANVAS.grip[1]);
    ctx.scale(WEAPON_CANVAS.scale, WEAPON_CANVAS.scale);
    G.draw(ctx, spin || 0);
    if (fire) { ctx.save(); ctx.translate(G.muz[0], G.muz[1]); drawFlash(ctx); ctx.restore(); }
    ctx.restore();
  }

  /* gun attachment socket for a body-only frame (rendered with {gun:'none'}), in 128px space */
  function getSocket(ci, anim, t) {
    const cfg = CHARACTERS[ci], G = GENERIC;
    const p = pose(anim, t, G);
    const groundY = 116, hs = cfg.hscale, bk = cfg.bulk;
    const H = (y) => groundY - (groundY - y) * hs;
    const gscale = 1.05 + (bk - 1) * 0.45;
    const cx = 46 + p.xoff;
    const hipY = H(82) + p.bob + p.hipDrop;
    const lean = p.lean * RAD;
    const tlen = H(82) - H(56);
    const shX = cx + Math.sin(lean) * tlen, shY = hipY - Math.cos(lean) * tlen;
    const sx = shX + 11 + p.thrust * 0.8 - p.gunRec, sy = shY + 7.5;
    return {
      x: +sx.toFixed(2), y: +sy.toFixed(2),
      angle: +(p.gunAng * RAD).toFixed(4),
      scale: +gscale.toFixed(3),
      visible: !(anim === 'die' && t > 0.06),
      flash: p.flash === 1,
    };
  }

  window.TDSRenderer = { CHARACTERS, GUNS, ANIMS, FRAMES, WEAPON_CANVAS, drawFrame, drawWeapon, getSocket, drawFlash };
})();
