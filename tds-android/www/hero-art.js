/* ===== Procedural hero art — 6 western defenders (face RIGHT) =====
   Same approach as tank-art.js / castle-art.js: a parametric cartoon figure drawn
   as an inline SVG, distinguished per hero by palette + hat + weapon. Replaces the
   missing hero PNG sprites so heroes look real in the menu AND on the battle canvas.

   HeroArt.svg(id, prefix, px, fr) -> SVG string
     id      'ranger' | 'kate' | 'doc' | 'slinger' | 'outlaw' | 'nomad'
     prefix  unique id seed (multiple on one page)
     px      true -> emit 200x280 pixel size (to rasterize onto <canvas>); else 100%
     fr      optional static frame { bob, shoot } (no SMIL); omit for the animated menu pose */
window.HeroArt = (() => {
  const O = '#241f1a';                          // shared cartoon outline
  const CFG = {
    ranger:  { coat:'#b9803f', coatDk:'#8a5c28', hat:'cowboy',  hatCol:'#6d4824', skin:'#e6b48c', hair:'#3a2616', gun:'rifle',    accent:'#caa15f', mustache:true },
    kate:    { coat:'#3E97D6', coatDk:'#2b6fa3', hat:'sheriff', hatCol:'#2f5f8c', skin:'#f3c79c', hair:'#7a4f28', gun:'pistol',   accent:'#8fd0ff', ponytail:true, badge:true },
    doc:     { coat:'#454b59', coatDk:'#2d323d', hat:'top',     hatCol:'#1d2026', skin:'#e9bd92', hair:'#2a2018', gun:'pistol',   accent:'#39c0a0', vest:'#2d323d', mustache:true },
    slinger: { coat:'#9B5DE0', coatDk:'#6e3fa6', hat:'wide',    hatCol:'#5a3f6e', skin:'#e6b48c', hair:'#23170f', gun:'revolver', accent:'#c79bf0', poncho:true, mustache:true },
    outlaw:  { coat:'#5a4636', coatDk:'#3c2e22', hat:'cowboy',  hatCol:'#2c2118', skin:'#d9a877', hair:'#1a120b', gun:'shotgun',  accent:'#e0533a', mask:'#c0392b' },
    nomad:   { coat:'#d9b877', coatDk:'#b3924f', hat:'hood',    hatCol:'#cdab68', skin:'#cf9a66', hair:'#1a120b', gun:'rifle',    accent:'#F4B731', robe:true },
  };

  const rr = (x,y,w,h,r,fill,st,sw) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"${st?` stroke="${st}" stroke-width="${sw||5}"`:''} stroke-linejoin="round"/>`;
  const ci = (cx,cy,r,fill,st,sw) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${st?` stroke="${st}" stroke-width="${sw||4}"`:''}/>`;
  const pth = (d,fill,st,sw) => `<path d="${d}" fill="${fill||'none'}"${st?` stroke="${st}" stroke-width="${sw||5}"`:''} stroke-linejoin="round" stroke-linecap="round"/>`;
  const pl = (pts,fill,st,sw) => `<polygon points="${pts}" fill="${fill}"${st?` stroke="${st}" stroke-width="${sw||5}"`:''} stroke-linejoin="round"/>`;
  const star = (cx,cy,r,fill) => { let p=''; for(let k=0;k<10;k++){ const a=-Math.PI/2+k*Math.PI/5, rad=(k%2?r*0.45:r); p+=`${(cx+Math.cos(a)*rad).toFixed(1)},${(cy+Math.sin(a)*rad).toFixed(1)} `; } return `<polygon points="${p}" fill="${fill}" stroke="${O}" stroke-width="2"/>`; };

  function drawGun(type, x, y, shoot){
    let g = '', tip = x;
    if (type === 'rifle'){ g += rr(x,y-4,66,9,3,'#3a3d42',O,4) + rr(x-7,y-7,17,18,4,'#5a3c22',O,4) + rr(x+10,y-5,40,4,2,'#5a5d63','',0); tip = x+66; }
    else if (type === 'shotgun'){ g += rr(x,y-7,54,7,3,'#3a3d42',O,4) + rr(x,y+1,54,7,3,'#2f3237',O,4) + rr(x-7,y-8,17,20,4,'#5a3c22',O,4); tip = x+54; }
    else if (type === 'revolver'){ g += rr(x,y-3,26,8,3,'#4a4d52',O,4) + ci(x+6,y+1,7,'#6a6d72',O,3) + rr(x-3,y+4,9,13,3,'#3a2c1e',O,3); tip = x+26; }
    else { g += rr(x,y-3,30,8,3,'#4a4d52',O,4) + rr(x+4,y-2,16,3,2,'#6a6d72','',0) + rr(x-3,y+4,9,13,3,'#3a2c1e',O,3); tip = x+30; }
    if (shoot){
      let p1='',p2=''; const fcx=tip+9, fcy=y, R1=19, R2=11;
      for(let k=0;k<10;k++){ const a=k/10*Math.PI*2, rad=(k%2?R1:R1*0.5); p1+=`${(fcx+Math.cos(a)*rad).toFixed(1)},${(fcy+Math.sin(a)*rad).toFixed(1)} `; }
      for(let k=0;k<10;k++){ const a=k/10*Math.PI*2+0.3, rad=(k%2?R2:R2*0.5); p2+=`${(fcx+Math.cos(a)*rad).toFixed(1)},${(fcy+Math.sin(a)*rad).toFixed(1)} `; }
      g += `<polygon points="${p1}" fill="#ff8a1e"/><polygon points="${p2}" fill="#ffe24d"/><circle cx="${fcx}" cy="${fcy}" r="5" fill="#fff"/>`;
    }
    return g;
  }

  function drawHat(type, hx, topY, col, accent){
    if (type === 'cowboy') return pl(`${hx-30},${topY+3} ${hx+34},${topY+3} ${hx+29},${topY-2} ${hx-25},${topY-2}`, col, O, 5) + rr(hx-15,topY-18,31,21,9,col,O,5) + rr(hx-15,topY-6,31,5,2,'rgba(0,0,0,.22)','',0);
    if (type === 'sheriff') return drawHat('cowboy',hx,topY,col,accent) + star(hx+1,topY-9,5,accent);
    if (type === 'top') return rr(hx-25,topY,48,8,3,col,O,5) + rr(hx-15,topY-31,32,33,5,col,O,5) + rr(hx-15,topY-9,32,6,2,accent,'',0);
    if (type === 'wide') return pl(`${hx-37},${topY+4} ${hx+41},${topY+4} ${hx+34},${topY-3} ${hx-30},${topY-3}`, col, O, 5) + rr(hx-14,topY-17,29,19,8,col,O,5) + rr(hx-14,topY-5,29,4,2,accent,'',0);
    if (type === 'hood') return pth(`M ${hx-23} ${topY+10} Q ${hx-26} ${topY-26} ${hx+4} ${topY-24} Q ${hx+28} ${topY-20} ${hx+23} ${topY+10}`, col, O, 5) + pth(`M ${hx+19} ${topY-4} Q ${hx+33} ${topY+8} ${hx+25} ${topY+30}`, col, O, 4) + rr(hx-22,topY+6,46,7,3,accent,'',0);
    return '';
  }

  function build(id, prefix, fr){
    const c = CFG[id] || CFG.ranger;
    const shoot = !!(fr && fr.shoot), SMIL = !fr;
    const hx = 104, hy = 100, topY = hy - 18;
    let G = '';

    // legs + boots (scissor stride so the hero looks like it's walking)
    const st = (fr && fr.step) || 0, blx = 84 + st * 9, flx = 105 - st * 9, bLift = st > 0 ? 4 : 0, fLift = st < 0 ? 4 : 0;
    G += rr(blx,206 + bLift,23,58 - bLift,10,c.coatDk,O,5);
    G += rr(flx,208 + fLift,23,56 - fLift,10,c.coat,O,5);
    G += rr(blx - 4,256 + bLift,33,13,5,'#3a2c1e',O,4);
    G += rr(flx - 4,258 + fLift,35,13,5,'#4a3826',O,4);

    // back arm (behind torso)
    G += rr(98,150,42,15,7,c.coatDk,O,5);

    // torso / coat
    G += rr(72,124,60,90,18,c.coat,O,6);
    G += rr(78,130,46,28,12,c.coatDk,'',0);
    if (c.poncho){ G += pl('66,128 138,128 146,178 60,178', c.accent, O, 5) + rr(60,170,86,9,4,c.coatDk,'',0); }
    if (c.vest){ G += rr(84,128,36,72,10,c.vest,O,4) + rr(100,130,4,68,2,'#11141a','',0); }
    if (c.robe){ G += pl('68,138 134,138 144,266 60,266', c.coat, O, 6) + pth('M 100 140 L 100 264','none',c.coatDk,4); }
    // belt
    G += rr(72,192,60,15,5,'#5a3c22',O,4) + rr(95,194,15,11,3,c.accent,O,3);
    if (c.badge) G += star(90,150,7,c.accent);

    // gun (held, points right)
    G += drawGun(c.gun, 132, 152, shoot);
    // front arm + glove over the gun grip
    G += rr(98,150,46,15,7,c.coat,O,5);
    G += ci(142,159,8,'#3a2c1e',O,3);

    // head + hair
    if (c.ponytail) G += pth(`M ${hx-15} ${hy-6} Q ${hx-32} ${hy+8} ${hx-22} ${hy+34}`, c.hair, O, 4);
    G += ci(hx,hy,21,c.skin,O,5);
    if (c.hat !== 'hood') G += pth(`M ${hx-19} ${hy-4} Q ${hx-21} ${hy-23} ${hx+2} ${hy-23}`,'none',c.hair,8);
    // face
    if (c.mask){ G += rr(hx+1,hy-3,24,15,4,c.mask,O,3) + ci(hx+11,hy-7,2.8,'#fff'); }
    else {
      G += ci(hx+11,hy-4,3,O);                            // eye
      if (c.mustache) G += rr(hx+2,hy+7,19,4,2,c.hair,'',0);
    }
    G += ci(hx+20,hy+2,3.4,c.skin,O,2);                   // nose

    // hat
    G += drawHat(c.hat, hx, topY, c.hatCol, c.accent);

    const body = SMIL
      ? `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -4;0 0" dur="2.6s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>${G}</g>`
      : `<g transform="translate(0 ${fr.bob || 0})">${G}</g>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280" width="100%" height="100%" preserveAspectRatio="xMidYMax meet" style="display:block;overflow:visible;">${body}</svg>`;
  }

  function svg(id, prefix, px, fr){
    let s = build(id, prefix || ('h' + id), fr || null);
    if (px) s = s.replace('width="100%" height="100%"', 'width="200" height="280"');
    return s;
  }
  return { CFG, svg };
})();
