/* Weapon Upgrade Tiers — procedural vector weapons (ported from the Claude Design
   component "Weapon Upgrade Tiers.dc.html"). WeaponArt.svg(type, lv) returns an
   inline animated SVG string for one of the 4 weapons at upgrade level 1..20.
   Types: 'minigun' (gatling), 'sniper', 'hammer', 'saw'. */
(function () {
'use strict';

const TIERS = [
  { lv: 1,  name: 'Standard',       el: 'steel',     acc: '#b6bcc6', fx: 'Base rounds' },
  { lv: 2,  name: 'Honed',          el: 'steel',     acc: '#c2c8d0', fx: 'Tighter spread' },
  { lv: 3,  name: 'Reinforced',     el: 'steel',     acc: '#9fb0c4', fx: 'Armor plating' },
  { lv: 4,  name: 'Heavy Barrel',   el: 'steel',     acc: '#8fa6be', fx: 'Bigger muzzle' },
  { lv: 5,  name: 'Twin Feed',      el: 'steel',     acc: '#9bb4cc', fx: 'Extra barrel' },
  { lv: 6,  name: 'Rapid Array',    el: 'steel',     acc: '#a8c2d8', fx: 'Max barrels' },
  { lv: 7,  name: 'Incendiary',     el: 'fire',      acc: '#ff8a3a', fx: 'Burn damage' },
  { lv: 8,  name: 'Inferno',        el: 'fire',      acc: '#ff5f24', fx: 'Spreading fire' },
  { lv: 9,  name: 'Magma Core',     el: 'fire',      acc: '#ff3514', fx: 'Molten rounds' },
  { lv: 10, name: 'Static Charge',  el: 'electric',  acc: '#62d2ff', fx: 'Shock stun' },
  { lv: 11, name: 'Tesla Coil',     el: 'electric',  acc: '#8ab0ff', fx: 'Chain lightning' },
  { lv: 12, name: 'Overload',       el: 'electric',  acc: '#b884ff', fx: 'Arc surge' },
  { lv: 13, name: 'Cryo Rounds',    el: 'ice',       acc: '#9fe4ff', fx: 'Slow on hit' },
  { lv: 14, name: 'Glacial',        el: 'ice',       acc: '#62b6f0', fx: 'Freeze chance' },
  { lv: 15, name: 'Absolute Zero',  el: 'ice',       acc: '#cdf2ff', fx: 'Flash-freeze' },
  { lv: 16, name: 'Venom',          el: 'poison',    acc: '#9ee34a', fx: 'Poison DoT' },
  { lv: 17, name: 'Corrosive',      el: 'poison',    acc: '#6ccf3a', fx: 'Armor melt' },
  { lv: 18, name: 'Plague Bringer', el: 'poison',    acc: '#3fb02e', fx: 'Toxic cloud' },
  { lv: 19, name: 'Plasma Surge',   el: 'plasma',    acc: '#ff6ad6', fx: 'Energy burst' },
  { lv: 20, name: 'Apex Prime',     el: 'prismatic', acc: '#ffd24d', fx: 'All-element overload' },
];
const VB = { minigun: '0 0 392 300', sniper: '0 0 360 300', hammer: '0 0 360 300', saw: '0 0 360 300' };
const FLASH = { steel: '#ffba4d', fire: '#ff7a2e', electric: '#7fe0ff', ice: '#cdf2ff', poison: '#b6f25a', plasma: '#ff7ae0', prismatic: '#ffe48a' };
const SAW_COG = 'M174,72.2 L171,54.4 L189,54.4 L186,72.2 L200.3,74.8 L203.5,57 L220.5,63.2 L211.5,78.8 L224.1,86.1 L233.2,70.5 L247,82.1 L233.3,93.8 L242.6,105 L256.5,93.4 L265.5,109 L248.6,115.3 L253.6,129 L270.6,122.9 L273.7,140.6 L255.7,140.7 L255.7,155.3 L273.7,155.4 L270.6,173.1 L253.6,167 L248.6,180.7 L265.5,187 L256.5,202.6 L242.6,191 L233.3,202.2 L247,213.9 L233.2,225.5 L224.1,209.9 L211.5,217.2 L220.5,232.8 L203.5,239 L200.3,221.2 L186,223.8 L189,241.6 L171,241.6 L174,223.8 L159.7,221.2 L156.5,239 L139.5,232.8 L148.5,217.2 L135.9,209.9 L126.8,225.5 L113,213.9 L126.7,202.2 L117.4,191 L103.5,202.6 L94.5,187 L111.4,180.7 L106.4,167 L89.4,173.1 L86.3,155.4 L104.3,155.3 L104.3,140.7 L86.3,140.6 L89.4,122.9 L106.4,129 L111.4,115.3 L94.5,109 L103.5,93.4 L117.4,105 L126.7,93.8 L113,82.1 L126.8,70.5 L135.9,86.1 L148.5,78.8 L139.5,63.2 L156.5,57 L159.7,74.8 Z';

const ATTR = { strokeWidth: 'stroke-width', strokeLinejoin: 'stroke-linejoin', strokeLinecap: 'stroke-linecap' };
const OUT = { stroke: '#23262e', strokeLinejoin: 'round' };

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }
function kebab(p) { return p.replace(/[A-Z]/g, m => '-' + m.toLowerCase()); }
function styleStr(st) { return typeof st === 'string' ? st : Object.keys(st).map(k => kebab(k) + ':' + st[k]).join(';'); }
// minimal hyperscript that emits an SVG element string (React-createElement compatible signature)
function h(tag, attrs, children) {
  let s = '<' + tag;
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || k === 'key') continue;
    if (k === 'style') s += ' style="' + esc(styleStr(v)) + '"';
    else s += ' ' + (ATTR[k] || k) + '="' + esc(v) + '"';
  }
  s += '>';
  if (children != null) { const arr = Array.isArray(children) ? children : [children]; for (const c of arr) if (c) s += c; }
  return s + '</' + tag + '>';
}
const A = (n, s, e) => n + ' calc(var(--m,1)*' + s + 's) ' + (e || 'linear infinite');
function star(cx, cy, s) { let p = ''; const n = 8; for (let i = 0; i < n * 2; i++) { const r = i % 2 ? s * 0.45 : s; const a = i * Math.PI / n - Math.PI / 2; p += (i ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1) + ' '; } return p + 'Z'; }

function mods(lv) {
  const t = (lv - 1) / 19;
  return { t, rows: 3 + Math.round(t * 3), muzR: 14 + t * 9, barLen: 84 + t * 18, barLen2: 84 + t * 30,
    armor: lv >= 3, gold: lv === 20, coil: lv >= 7 };
}
function glow(el, glowOn) { return glowOn && el !== 'steel'; }

// ambient elemental particles around anchor [ax,ay]
function fx(el, anchor, acc, glowOn) {
  const ax = anchor[0], ay = anchor[1]; const out = [];
  if (glow(el, glowOn)) {
    out.push(h('circle', { cx: ax, cy: ay, r: 36, fill: acc, opacity: .13, style: { animation: A('aura-pulse', 1.4, 'ease-in-out infinite'), transformBox: 'view-box', transformOrigin: ax + 'px ' + ay + 'px' } }));
    out.push(h('circle', { cx: ax, cy: ay, r: 21, fill: acc, opacity: .2, style: { animation: A('aura-pulse', 1.1, 'ease-in-out infinite'), transformBox: 'view-box', transformOrigin: ax + 'px ' + ay + 'px' } }));
  }
  if (!glowOn) return out;
  if (el === 'fire' || el === 'prismatic') {
    for (let i = 0; i < 4; i++) out.push(h('circle', { cx: ax - 18 + i * 11, cy: ay - 4, r: 3.2 - i * 0.3, fill: i % 2 ? '#ffd24d' : acc, style: { animation: A('ember-rise', 1.0 + i * 0.2), animationDelay: 'calc(var(--m,1)*' + (-i * 0.28) + 's)' } }));
  }
  if (el === 'electric') {
    out.push(h('polyline', { points: (ax - 60) + ',' + (ay - 22) + ' ' + (ax - 40) + ',' + (ay - 4) + ' ' + (ax - 46) + ',' + ay + ' ' + (ax - 18) + ',' + (ay + 16) + ' ' + (ax - 24) + ',' + (ay + 20) + ' ' + ax + ',' + (ay + 34), fill: 'none', stroke: '#eaf6ff', strokeWidth: 2.4, strokeLinejoin: 'round', strokeLinecap: 'round', style: { animation: A('bolt-flicker', 0.4) } }));
    out.push(h('polyline', { points: (ax - 70) + ',' + (ay + 6) + ' ' + (ax - 52) + ',' + (ay + 10) + ' ' + (ax - 58) + ',' + (ay + 22) + ' ' + (ax - 30) + ',' + (ay + 26), fill: 'none', stroke: acc, strokeWidth: 2.2, strokeLinejoin: 'round', strokeLinecap: 'round', style: { animation: A('bolt-flicker', 0.4), animationDelay: 'calc(var(--m,1)*-0.18s)' } }));
  }
  if (el === 'ice') {
    [[ax - 30, ay - 18], [ax - 6, ay - 22], [ax + 16, ay - 16]].forEach(p => out.push(h('path', { d: 'M' + p[0] + ',' + p[1] + ' l7,0 l-3.5,16 Z', fill: '#dff4ff', stroke: '#9fd6f0', strokeWidth: 1.4 })));
    for (let i = 0; i < 2; i++) out.push(h('ellipse', { cx: ax - 10 + i * 22, cy: ay + 6, rx: 9, ry: 7, fill: '#cfeaff', style: { animation: A('frost-mist', 1.6 + i * 0.3, 'ease-out infinite'), animationDelay: 'calc(var(--m,1)*' + (-i * 0.5) + 's)' } }));
  }
  if (el === 'poison') {
    for (let i = 0; i < 4; i++) out.push(h('circle', { cx: ax - 20 + i * 12, cy: ay + 10, r: 3 + (i % 2), fill: acc, opacity: .85, style: { animation: A('bubble-rise', 1.2 + i * 0.2, 'ease-out infinite'), animationDelay: 'calc(var(--m,1)*' + (-i * 0.32) + 's)' } }));
  }
  if (el === 'plasma' || el === 'prismatic') {
    const cols = el === 'prismatic' ? ['#ff6ad6', '#62d2ff', '#ffd24d'] : ['#ff6ad6', '#ff9ae6', '#c77aff'];
    cols.forEach((c, i) => out.push(h('g', { style: { animation: A('spin', 1.6 + i * 0.4), transformBox: 'view-box', transformOrigin: ax + 'px ' + ay + 'px' } }, [h('circle', { cx: ax + 26, cy: ay, r: 4.5, fill: c, opacity: .92 })])));
  }
  if (el === 'prismatic') {
    [[ax - 40, ay - 26], [ax + 22, ay - 30], [ax - 14, ay + 30], [ax + 34, ay + 8]].forEach((p, i) => out.push(h('path', { d: star(p[0], p[1], 6), fill: '#ffe9a8', style: { animation: A('sparkle', 0.9), animationDelay: 'calc(var(--m,1)*' + (-i * 0.3) + 's)' } })));
  }
  return out;
}

function buildMinigun(tier, m, glowOn) {
  const muzzleX = 214 + m.barLen, by = 183;
  const ys = []; for (let i = 0; i < m.rows; i++) ys.push(by + (i - (m.rows - 1) / 2) * 13);
  const recoilKids = [
    h('rect', { key: 'grip', x: 34, y: 110, width: 17, height: 48, rx: 8, transform: 'rotate(-30 60 150)', fill: 'url(#mDark)', ...OUT, strokeWidth: 3.5 }),
    h('rect', { key: 'hous', x: 66, y: 150, width: 120, height: 66, rx: 16, fill: 'url(#mMetal)', ...OUT, strokeWidth: 4 }),
    h('path', { key: 'h1', d: 'M94,150 v-16 q0,-12 12,-12 h40 q12,0 12,12 v16', fill: 'none', stroke: '#23262e', strokeWidth: 10, strokeLinecap: 'round' }),
    h('path', { key: 'h2', d: 'M94,150 v-16 q0,-12 12,-12 h40 q12,0 12,12 v16', fill: 'none', stroke: '#bcc2cb', strokeWidth: 3.5, strokeLinecap: 'round' }),
    m.armor ? h('rect', { key: 'arm', x: 72, y: 156, width: 34, height: 42, rx: 6, fill: 'url(#mDark)', ...OUT, strokeWidth: 2.5 }) : null,
    m.armor ? h('circle', { key: 'ab1', cx: 80, cy: 163, r: 2.4, fill: '#2a2d34' }) : null,
    m.armor ? h('circle', { key: 'ab2', cx: 98, cy: 163, r: 2.4, fill: '#2a2d34' }) : null,
    h('rect', { key: 'br', x: 182, y: 155, width: 36, height: 56, rx: 11, fill: 'url(#mDark)', ...OUT, strokeWidth: 3.5 }),
    m.coil ? h('rect', { key: 'coil', x: 150, y: 158, width: 24, height: 9, rx: 4, fill: tier.acc, opacity: .95 }) : null,
  ];
  ys.forEach((y, i) => recoilKids.push(h('rect', { key: 'bar' + i, x: 214, y: y - 5.5, width: m.barLen, height: 11, rx: 5, fill: 'url(#mBar)', ...OUT, strokeWidth: 2.5 })));
  const bores = [h('circle', { key: 'bc', cx: muzzleX, cy: by, r: m.muzR, fill: 'url(#mDark)', ...OUT, strokeWidth: 3.5 })];
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 - Math.PI / 2; bores.push(h('circle', { key: 'bo' + i, cx: muzzleX + m.muzR * 0.58 * Math.cos(a), cy: by + m.muzR * 0.58 * Math.sin(a), r: Math.max(3, m.muzR * 0.22), fill: '#33373f' })); }
  bores.push(h('circle', { key: 'bcc', cx: muzzleX, cy: by, r: Math.max(3, m.muzR * 0.22), fill: '#2a2d34' }));
  recoilKids.push(h('g', { key: 'clu', style: { animation: A('spin', 0.28), transformBox: 'view-box', transformOrigin: muzzleX + 'px ' + by + 'px' } }, bores));
  const anchor = [muzzleX + m.muzR + 6, by];
  return [
    h('ellipse', { key: 'sh', cx: 172, cy: 280, rx: 66, ry: 11, fill: '#000', opacity: .22 }),
    h('path', { key: 'ped', d: 'M118,279 L139,234 H205 L226,279 Z', fill: 'url(#mMetal)', ...OUT, strokeWidth: 3.5 }),
    h('rect', { key: 'ring0', x: 131, y: 213, width: 82, height: 26, rx: 7, fill: 'url(#mDark)', ...OUT, strokeWidth: 3.5 }),
    h('ellipse', { key: 'ring1', cx: 172, cy: 213, rx: 41, ry: 8, fill: 'url(#mMetal)', ...OUT, strokeWidth: 3 }),
    h('g', { key: 'recoil', style: { animation: A('mg-recoil', 0.1, 'ease-in-out infinite') } }, recoilKids),
    h('g', { key: 'flash', style: { animation: A('mg-flash', 0.12), transformBox: 'view-box', transformOrigin: anchor[0] + 'px ' + by + 'px' } }, [h('path', { d: star(anchor[0], by, m.muzR * 1.5), fill: FLASH[tier.el] }), h('circle', { cx: anchor[0], cy: by, r: m.muzR * 0.45, fill: '#fff8e2' })]),
    h('g', { key: 'smoke', style: { animation: A('mg-smoke', 1.9, 'ease-out infinite') } }, [h('ellipse', { cx: muzzleX, cy: 156, rx: 10, ry: 8, fill: '#aeb4bd' })]),
    h('g', { key: 'sh1', style: { animation: A('mg-shell', 0.55) } }, [h('rect', { x: 178, y: 206, width: 6, height: 11, rx: 2, fill: '#e3b94c', stroke: '#8a6a18', strokeWidth: 1.3 })]),
    ...fx(tier.el, anchor, tier.acc, glowOn),
  ];
}

function buildSniper(tier, m, glowOn) {
  const muzzleX = 210 + m.barLen2, by = 151;
  const recoilKids = [
    h('path', { key: 'stk', d: 'M40,138 L116,142 V172 L58,182 Q40,180 40,160 Q40,142 40,138 Z', fill: 'url(#snStock)', ...OUT, strokeWidth: 3.5 }),
    h('rect', { key: 'rec', x: 116, y: 136, width: 104, height: 32, rx: 7, fill: 'url(#snStock)', ...OUT, strokeWidth: 3.5 }),
    h('rect', { key: 'rail', x: 120, y: 128, width: 92, height: 9, rx: 3, fill: 'url(#snDark)', ...OUT, strokeWidth: 2 }),
    h('path', { key: 'tg', d: 'M150,168 q0,16 16,16 h8 q-12,-3 -12,-16 Z', fill: 'url(#snStock)', ...OUT, strokeWidth: 2.5 }),
    h('rect', { key: 'mag', x: 158, y: 168, width: 26, height: 30, rx: 4, fill: 'url(#snStock)', ...OUT, strokeWidth: 3 }),
    h('rect', { key: 'sr1', x: 138, y: 120, width: 9, height: 18, fill: 'url(#snDark)', ...OUT, strokeWidth: 2 }),
    h('rect', { key: 'sr2', x: 190, y: 120, width: 9, height: 18, fill: 'url(#snDark)', ...OUT, strokeWidth: 2 }),
    h('rect', { key: 'sc', x: 126, y: 106, width: 82, height: 18, rx: 9, fill: 'url(#snDark)', ...OUT, strokeWidth: 3 }),
    h('ellipse', { key: 'lens', cx: 206, cy: 115, rx: 5, ry: 8, fill: '#222530', ...OUT, strokeWidth: 2 }),
    h('rect', { key: 'barl', x: 210, y: 146, width: m.barLen2, height: 11, rx: 5, fill: 'url(#snDark)', ...OUT, strokeWidth: 2.5 }),
    h('rect', { key: 'brake', x: muzzleX - 8, y: 140, width: 15, height: 23, rx: 4, fill: 'url(#snDark)', ...OUT, strokeWidth: 2.5 }),
    m.armor ? h('rect', { key: 'cheek', x: 74, y: 128, width: 46, height: 9, rx: 4, fill: 'url(#snStock)', ...OUT, strokeWidth: 2.5 }) : null,
    m.coil ? h('rect', { key: 'coil', x: 158, y: 138, width: 30, height: 8, rx: 4, fill: tier.acc, opacity: .95 }) : null,
    h('g', { key: 'bolt', style: { animation: A('sn-bolt', 1.7, 'ease-in-out infinite') } }, [h('rect', { x: 206, y: 166, width: 8, height: 18, rx: 4, fill: 'url(#snDark)', ...OUT, strokeWidth: 2 }), h('circle', { cx: 210, cy: 187, r: 7, fill: 'url(#snDark)', ...OUT, strokeWidth: 2.5 })]),
  ];
  const anchor = [muzzleX + 12, by];
  return [
    h('g', { key: 'recoil', style: { animation: A('sn-fire', 1.7, 'cubic-bezier(.2,.8,.3,1) infinite') } }, recoilKids),
    h('g', { key: 'flash', style: { animation: A('sn-flash', 1.7), transformBox: 'view-box', transformOrigin: anchor[0] + 'px ' + by + 'px' } }, [h('path', { d: star(anchor[0], by, 20), fill: FLASH[tier.el] }), h('circle', { cx: anchor[0], cy: by, r: 7, fill: '#fff8e2' })]),
    h('g', { key: 'smoke', style: { animation: A('sn-smoke', 1.7, 'ease-out infinite') } }, [h('ellipse', { cx: muzzleX + 6, cy: 150, rx: 11, ry: 8, fill: '#b6bcc4' })]),
    h('g', { key: 'shell', style: { animation: A('sn-shell', 1.7) } }, [h('rect', { x: 206, y: 128, width: 6, height: 12, rx: 2, fill: '#e3b94c', stroke: '#8a6a18', strokeWidth: 1.3 })]),
    ...fx(tier.el, anchor, tier.acc, glowOn),
  ];
}

function buildHammer(tier, m, glowOn) {
  const hw = 84 + m.t * 16, hh = 46 + m.t * 8;
  const swingKids = [
    h('rect', { key: 'sft', x: 173, y: 92, width: 14, height: 118, rx: 6, fill: 'url(#mBar)', ...OUT, strokeWidth: 3 }),
    h('rect', { key: 'head', x: 180 - hw / 2, y: 84 - hh / 2, width: hw, height: hh, rx: 11, fill: 'url(#mMetal)', ...OUT, strokeWidth: 3.5 }),
    h('rect', { key: 'bL', x: 180 - hw / 2 + 10, y: 84 - hh / 2, width: 10, height: hh, fill: 'url(#mDark)', opacity: .9 }),
    h('rect', { key: 'bR', x: 180 + hw / 2 - 20, y: 84 - hh / 2, width: 10, height: hh, fill: 'url(#mDark)', opacity: .9 }),
    h('rect', { key: 'plate', x: 166, y: 71, width: 28, height: 26, rx: 4, fill: 'url(#mDark)', ...OUT, strokeWidth: 2 }),
    m.coil ? h('rect', { key: 'coil', x: 170, y: 120, width: 20, height: 8, rx: 4, fill: tier.acc, opacity: .95 }) : null,
  ];
  const anchor = [236, 250];
  return [
    h('ellipse', { key: 'sh', cx: 180, cy: 278, rx: 58, ry: 11, fill: '#000', opacity: .22 }),
    h('path', { key: 'ped', d: 'M138,278 L160,214 H200 L222,278 Z', fill: 'url(#mMetal)', ...OUT, strokeWidth: 3.5 }),
    h('ellipse', { key: 'hub0', cx: 180, cy: 214, rx: 24, ry: 7, fill: 'url(#mDark)', ...OUT, strokeWidth: 3 }),
    h('g', { key: 'swing', style: { animation: A('ham-swing', 1.5, 'cubic-bezier(.45,0,.55,1) infinite'), transformBox: 'view-box', transformOrigin: '180px 207px' } }, swingKids),
    h('circle', { key: 'piv', cx: 180, cy: 207, r: 13, fill: 'url(#mMetal)', ...OUT, strokeWidth: 3 }),
    h('circle', { key: 'piv2', cx: 180, cy: 207, r: 5.5, fill: 'url(#mDark)', ...OUT, strokeWidth: 2 }),
    h('g', { key: 'imp', style: { animation: A('ham-impact', 1.5), transformBox: 'view-box', transformOrigin: anchor[0] + 'px ' + anchor[1] + 'px' } }, [h('path', { d: star(anchor[0], anchor[1], 26), fill: FLASH[tier.el] }), h('circle', { cx: anchor[0], cy: anchor[1], r: 8, fill: '#fff3cf' })]),
    ...fx(tier.el, anchor, tier.acc, glowOn),
  ];
}

function buildSaw(tier, m, glowOn) {
  const cx = 180, cy = 150;
  const spinKids = [
    h('path', { key: 'cog', d: SAW_COG, fill: 'url(#sawS)', ...OUT, strokeWidth: 3.5 }),
    h('circle', { key: 'g1', cx, cy, r: 62, fill: 'none', stroke: '#7e858f', strokeWidth: 2, opacity: .5 }),
    h('circle', { key: 'g2', cx, cy, r: 40, fill: 'none', stroke: '#8a9099', strokeWidth: 1.5, opacity: .45 }),
    h('circle', { key: 'm1', cx: 180, cy: 110, r: 4.5, fill: '#5d636d' }),
    h('circle', { key: 'm2', cx: 220, cy: 150, r: 4.5, fill: '#5d636d' }),
    h('circle', { key: 'm3', cx: 180, cy: 190, r: 4.5, fill: '#5d636d' }),
    h('circle', { key: 'm4', cx: 140, cy: 150, r: 4.5, fill: '#5d636d' }),
    h('circle', { key: 'hub', cx, cy, r: 15, fill: 'url(#mBar)', ...OUT, strokeWidth: 2.5 }),
    h('circle', { key: 'hub2', cx, cy, r: 7, fill: '#454a53', ...OUT, strokeWidth: 1.5 }),
    m.coil ? h('circle', { key: 'coil', cx, cy, r: 30, fill: 'none', stroke: tier.acc, strokeWidth: 3, opacity: .9 }) : null,
  ];
  const anchor = [104, 212];
  const sparkColor = FLASH[tier.el];
  return [
    h('ellipse', { key: 'sh', cx: 180, cy: 266, rx: 46, ry: 8, fill: '#000', opacity: .22 }),
    h('rect', { key: 'base', x: 150, y: 250, width: 60, height: 15, rx: 4, fill: 'url(#mBar)', ...OUT, strokeWidth: 3.5 }),
    h('path', { key: 'neck', d: 'M166,250 L172,212 H188 L194,250 Z', fill: 'url(#mBar)', ...OUT, strokeWidth: 3 }),
    h('circle', { key: 'blur', cx, cy, r: 100, fill: 'none', stroke: '#c7ccd4', strokeWidth: 11, opacity: .28 }),
    h('g', { key: 'spin', style: { animation: A('spin', 0.2), transformBox: 'view-box', transformOrigin: cx + 'px ' + cy + 'px' } }, spinKids),
    h('g', { key: 'spk', style: { animation: A('saw-spark', 0.08), transformBox: 'view-box', transformOrigin: anchor[0] + 'px ' + anchor[1] + 'px' } }, [
      h('circle', { cx: anchor[0], cy: anchor[1], r: 9, fill: '#fff3cf' }),
      h('line', { x1: anchor[0], y1: anchor[1], x2: 74, y2: 232, stroke: sparkColor, strokeWidth: 2.5, strokeLinecap: 'round' }),
      h('line', { x1: anchor[0], y1: anchor[1], x2: 78, y2: 244, stroke: sparkColor, strokeWidth: 2, strokeLinecap: 'round' }),
      h('line', { x1: anchor[0], y1: anchor[1], x2: 98, y2: 248, stroke: sparkColor, strokeWidth: 1.6, strokeLinecap: 'round' }),
      h('line', { x1: anchor[0], y1: anchor[1], x2: 124, y2: 232, stroke: sparkColor, strokeWidth: 1.6, strokeLinecap: 'round' }),
    ]),
    h('g', { key: 'fa', style: { animation: A('saw-flyA', 0.42) } }, [h('circle', { cx: 100, cy: 216, r: 2.6, fill: sparkColor })]),
    h('g', { key: 'fb', style: { animation: A('saw-flyB', 0.42), animationDelay: 'calc(var(--m,1)*-0.12s)' } }, [h('circle', { cx: 250, cy: 96, r: 2.4, fill: sparkColor })]),
    ...fx(tier.el, anchor, tier.acc, glowOn),
  ];
}

function buildWeapon(type, tier, glowOn) {
  const m = mods(tier.lv);
  let kids;
  if (type === 'minigun') kids = buildMinigun(tier, m, glowOn);
  else if (type === 'sniper') kids = buildSniper(tier, m, glowOn);
  else if (type === 'hammer') kids = buildHammer(tier, m, glowOn);
  else kids = buildSaw(tier, m, glowOn);
  const vb = VB[type] || '0 0 360 300';
  return h('svg', { viewBox: vb, width: '100%', height: '100%', preserveAspectRatio: 'xMidYMid meet', style: { display: 'block', overflow: 'visible' } }, kids);
}

// gradient defs the weapons reference (injected once into the page)
const DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>'
  + '<linearGradient id="mMetal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d6dbe2"/><stop offset="1" stop-color="#8b929d"/></linearGradient>'
  + '<linearGradient id="mDark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#787f8a"/><stop offset="1" stop-color="#454a53"/></linearGradient>'
  + '<linearGradient id="mBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c4cad2"/><stop offset="1" stop-color="#7b828c"/></linearGradient>'
  + '<linearGradient id="snStock" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d8147"/><stop offset="1" stop-color="#4a4e29"/></linearGradient>'
  + '<linearGradient id="snDark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5c616b"/><stop offset="1" stop-color="#2f323a"/></linearGradient>'
  + '<radialGradient id="sawS" cx="0.4" cy="0.34" r="0.78"><stop offset="0" stop-color="#f1f4f7"/><stop offset=".55" stop-color="#aeb5bf"/><stop offset="1" stop-color="#7e858f"/></radialGradient>'
  + '</defs></svg>';
function injectDefs() {
  if (typeof document === 'undefined' || document.getElementById('weapon-art-defs')) return;
  const d = document.createElement('div');
  d.id = 'weapon-art-defs'; d.style.cssText = 'position:absolute;width:0;height:0';
  d.innerHTML = DEFS;
  document.body.appendChild(d);
}
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectDefs);
  else injectDefs();
}

const clampLv = lv => Math.max(1, Math.min(20, (lv | 0) || 1));
window.WeaponArt = {
  TIERS,
  svg(type, lv, glowOn) { return buildWeapon(type, TIERS[clampLv(lv) - 1], glowOn !== false); },
  tier(lv) { return TIERS[clampLv(lv) - 1]; },
};
})();
