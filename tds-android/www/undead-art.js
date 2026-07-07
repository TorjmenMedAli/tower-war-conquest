/* ===== Undead Squad — 10 chibi zombie enemies (ported from the Claude Design
   project "Zombie game character assets", file Undead Squad.dc.html) =====

   The design ships as a procedural SVG with CSS-keyframe animations. CSS anims do
   NOT run inside an <img>-rasterised SVG (the canvas pipeline), so the limb/​body
   transforms are recomputed per frame in JS (same trick as hero-art.js / tank-art.js)
   and baked as static SVG `transform` attributes. The figures face LEFT — enemies
   march in from the right toward the convoy, so no horizontal flip is needed.

   UndeadArt.ROSTER          — 10 enemy types, ordered weakest → strongest (danger asc)
   UndeadArt.svg(idx, prefix, px, anim, p) -> SVG string
       idx     index into ROSTER
       prefix  unique id seed
       px      true -> fixed 200x262 px (to rasterize onto <canvas>); else 100%
       anim    'walk' | 'attack' | 'shoot' | 'idle'
       p       phase 0..1 within the animation cycle */
window.UndeadArt = (() => {
  const OUT = '#1f2a28';

  // Roster — visual props (from the design's Z[] array) + combat factors used by the game.
  // Combat factors are relative to the base enemy (hp 112 · speed 76 · dmg 9). `danger`
  // ascends with the array index; higher levels draw from the stronger tail of the list.
  const ROSTER = [
    { name:'Shuffler',    type:'Melee',  atkClass:'melee',  flyer:false, ranged:false, bomb:false,
      skin:'#7ec6b8', skinDark:'#5aa193', shirt:'#6b4a39', shirtDark:'#4f3528', pants:'#5f7da0', shoe:'#2d3550',
      legs:true, showTorso:true, showArms:true, size:'',
      hpF:1.00, spdF:0.90, dmgF:1.00, dispH:92, standoff:0 },
    { name:'Conehead',    type:'Melee',  atkClass:'melee',  flyer:false, ranged:false, bomb:false,
      skin:'#7ec6b8', skinDark:'#5aa193', shirt:'#59697a', shirtDark:'#3f4d5c', pants:'#6a5a4a', shoe:'#2d2d2d',
      legs:true, showTorso:true, showArms:true, cone:true, size:'',
      hpF:1.50, spdF:1.05, dmgF:1.10, dispH:96, standoff:0 },
    { name:'Sprinter',    type:'Melee',  atkClass:'melee',  flyer:false, ranged:false, bomb:false,
      skin:'#a7d58f', skinDark:'#84b46d', shirt:'#9a3636', shirtDark:'#6f2626', pants:'#6a6a7c', shoe:'#2c2c2c',
      legs:true, showTorso:true, showArms:true, size:'skinny',
      hpF:0.65, spdF:1.75, dmgF:0.90, dispH:88, standoff:0 },
    { name:'Spitter',     type:'Ranged', atkClass:'ranged', flyer:false, ranged:true,  bomb:false,
      skin:'#bcca7c', skinDark:'#99a85b', shirt:'#57683a', shirtDark:'#41502b', pants:'#6a5a4a', shoe:'#333333',
      legs:true, showTorso:true, showArms:true, proj:true, projX:48, projY:90, projColor:'#bdf24a', size:'',
      hpF:0.90, spdF:0.80, dmgF:1.30, dispH:92, standoff:250 },
    { name:'Bonechucker', type:'Ranged', atkClass:'ranged', flyer:false, ranged:true,  bomb:false,
      skin:'#b6a6d6', skinDark:'#9a86c0', shirt:'#45455a', shirtDark:'#303043', pants:'#5a4a5a', shoe:'#2a2a3a',
      legs:true, showTorso:true, showArms:true, proj:true, projX:46, projY:150, projColor:'#ece3c8', size:'small',
      hpF:0.80, spdF:0.90, dmgF:1.15, dispH:84, standoff:300 },
    { name:'Buckethead',  type:'Melee',  atkClass:'melee',  flyer:false, ranged:false, bomb:false,
      skin:'#a3b3ab', skinDark:'#82928a', shirt:'#5a5f63', shirtDark:'#3f4346', pants:'#44505a', shoe:'#1f1f1f',
      legs:true, showTorso:true, showArms:true, bucket:true, size:'',
      hpF:2.30, spdF:0.70, dmgF:1.40, dispH:96, standoff:0 },
    { name:'Batwing',     type:'Melee',  atkClass:'melee',  flyer:true,  ranged:false, bomb:false,
      skin:'#8fbf8a', skinDark:'#6f9d6b', shirt:'#5a4a3a', shirtDark:'#3f3327', pants:'#4a5a64', shoe:'#202020',
      legs:true, showTorso:true, showArms:true, wings:true, size:'',
      hpF:1.00, spdF:1.45, dmgF:1.25, dispH:86, standoff:0 },
    { name:'Brute',       type:'Melee',  atkClass:'melee',  flyer:false, ranged:false, bomb:false,
      skin:'#8aa86b', skinDark:'#6c8a4f', shirt:'#7a5638', shirtDark:'#5c3f28', pants:'#46553f', shoe:'#242424',
      legs:true, showTorso:true, showArms:true, size:'fat',
      hpF:3.00, spdF:0.60, dmgF:1.90, dispH:108, standoff:0 },
    { name:'Wraith',      type:'Melee',  atkClass:'melee',  flyer:true,  ranged:false, bomb:false,
      skin:'#cdbdf0', skinDark:'#ab9bd4', shirt:'#b3a3db', shirtDark:'#9484c4', pants:'#000000', shoe:'#000000',
      legs:false, showTorso:true, showArms:true, ghost:true, ghosted:true, size:'',
      hpF:1.35, spdF:1.35, dmgF:1.60, dispH:92, standoff:0 },
    { name:'Boomhead',    type:'Ranged', atkClass:'bomb',   flyer:true,  ranged:true,  bomb:true,
      skin:'#9aa890', skinDark:'#79886f', shirt:'#000000', shirtDark:'#000000', pants:'#000000', shoe:'#000000',
      legs:false, showTorso:false, showArms:false, fuse:true, proj:true, projX:84, projY:122, projColor:'#33373f', size:'small',
      hpF:1.70, spdF:0.95, dmgF:2.30, dispH:84, standoff:300 },
  ];

  // piecewise-linear keyframe lerp: stops = [[t,val], ...] with t ascending 0..1
  const kf = (p, stops) => {
    if (p <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++){
      if (p <= stops[i][0]){
        const [t0, v0] = stops[i - 1], [t1, v1] = stops[i];
        return v0 + (v1 - v0) * (p - t0) / (t1 - t0 || 1);
      }
    }
    return stops[stops.length - 1][1];
  };

  // per-frame transform params for one zombie + animation phase
  function frame(z, anim, p){
    const tau = Math.PI * 2, fly = z.flyer;
    const F = { legF:0, legB:0, armF:0, armB:0, bobY:0, rootRot:0, lungeX:0, wingDeg:0, proj:null };
    if (fly){ F.bobY = -9 * Math.sin(p * tau); F.wingDeg = 18 * Math.sin(p * tau * 3); }
    if (anim === 'walk' || anim === 'idle'){
      if (fly){ F.armF = 7 * Math.sin(p * tau); F.armB = -7 * Math.sin(p * tau); }
      else if (anim === 'idle'){ F.bobY = -3 * (0.5 - 0.5 * Math.cos(p * tau)); }
      else {
        const sw = Math.sin(p * tau);
        F.legF = 22 * sw; F.legB = -22 * sw; F.armF = -15 * sw; F.armB = 15 * sw;
        F.bobY = -5 * Math.abs(Math.sin(p * tau)); F.rootRot = -1.5 - Math.abs(sw);
      }
    } else if (anim === 'attack'){
      F.armF = kf(p, [[0,-12],[0.25,-78],[0.55,34],[0.78,18],[1,-12]]);   // clawSwipe
      if (!fly){
        F.lungeX = kf(p, [[0,0],[0.35,7],[0.6,-13],[1,0]]);               // lunge (left = toward target)
        F.legF   = kf(p, [[0,0],[0.35,-6],[0.6,10],[1,0]]);
      }
    } else if (anim === 'shoot'){
      F.rootRot += kf(p, [[0,0],[0.3,7],[0.58,-9],[1,0]]);                // spitLean
      F.proj = kf(p, [[0,-1],[0.18,-1],[0.2,0],[1,1]]);                   // projectile travel 0..1
    }
    return F;
  }

  // assemble the figure (parts in back→front order, each limb wrapped in a rotate group)
  function build(z, F){
    const rot = (deg, cx, cy, body) => `<g transform="rotate(${deg.toFixed(2)} ${cx} ${cy})">${body}</g>`;
    let G = '';

    // wings (flyer) — behind everything
    if (z.wings){
      const w = `<path d="M150,104 q46,-30 72,-10 q-22,5 -22,18 q16,-1 21,9 q-23,2 -29,13 q11,4 8,13 q-30,-9 -47,-22 z" fill="${z.skinDark}" stroke="${OUT}" stroke-width="2"/>`
              + `<path d="M96,108 q-30,-12 -44,-4 q14,2 15,12 q-12,0 -13,8 q16,1 22,9 q-6,3 -3,11 q19,-7 28,-18 z" fill="${z.shirtDark}" stroke="${OUT}" stroke-width="2"/>`;
      G += rot(F.wingDeg, 150, 108, w);
    }
    // back arm
    if (z.showArms){
      const a = `<path d="M114,108 q16,5 19,28 q0,9 -8,10 q-9,1 -12,-8 q-3,-20 -3,-30 z" fill="${z.skinDark}" stroke="${OUT}" stroke-width="2"/>`
              + `<circle cx="121" cy="148" r="8" fill="${z.skinDark}" stroke="${OUT}" stroke-width="2"/>`
              + `<path d="M115,153 q-2,6 2,8 M121,156 q0,6 3,7 M127,153 q2,6 5,5" stroke="${OUT}" stroke-width="1.8" fill="none"/>`;
      G += rot(F.armB, 116, 110, a);
    }
    // back leg
    if (z.legs){
      const l = `<path d="M104,158 q10,-3 18,0 l-3,42 q-7,3 -14,0 z" fill="${z.pants}" stroke="${OUT}" stroke-width="2" opacity="0.92"/>`
              + `<path d="M96,198 q-3,3 -3,9 q0,7 12,7 l22,0 q5,0 5,-7 l0,-6 q-16,-7 -33,-3 z" fill="${z.shoe}" stroke="${OUT}" stroke-width="2"/>`;
      G += rot(F.legB, 113, 159, l);
    }
    // ghost tail (Wraith)
    if (z.ghost){
      G += `<path d="M76,150 q-12,28 -2,44 q6,-12 14,-3 q7,9 13,-4 q8,9 15,-9 q7,-26 -3,-44 z" fill="${z.skin}" stroke="${OUT}" stroke-width="1.5" opacity="0.95"/>`;
    }
    // torso
    if (z.showTorso){
      G += `<g>`
        + `<path d="M66,108 q34,-14 68,0 q4,28 2,50 L130,166 L122,158 L114,167 L106,158 L98,167 L90,158 L82,168 L74,158 L68,162 q-4,-26 -2,-54 z" fill="${z.shirt}" stroke="${OUT}" stroke-width="2.5"/>`
        + `<path d="M84,108 l16,13 l16,-13" stroke="${OUT}" stroke-width="2" fill="none"/>`
        + `<path d="M92,124 l9,17 l-4,2 z" fill="${z.shirtDark}"/>`
        + `<circle cx="100" cy="132" r="2.4" fill="${OUT}"/><circle cx="100" cy="148" r="2.4" fill="${OUT}"/>`
        + `<path d="M116,128 l14,4 l-3,13 l-13,-3 z" fill="${z.shirtDark}" opacity="0.7"/>`
        + `</g>`;
    }
    // front leg
    if (z.legs){
      const l = `<path d="M76,158 q10,-3 18,0 l-2,44 q-7,3 -14,0 z" fill="${z.pants}" stroke="${OUT}" stroke-width="2"/>`
              + `<ellipse cx="84" cy="186" rx="5" ry="4" fill="${z.skin}" opacity="0.85"/>`
              + `<path d="M58,200 q-4,3 -4,9 q0,7 12,7 l22,0 q5,0 5,-7 l0,-6 q-16,-7 -33,-3 z" fill="${z.shoe}" stroke="${OUT}" stroke-width="2"/>`;
      G += rot(F.legF, 85, 159, l);
    }
    // front arm
    if (z.showArms){
      const a = `<path d="M84,108 q-20,8 -30,30 q-3,9 5,12 q9,3 13,-6 q9,-20 18,-28 z" fill="${z.skin}" stroke="${OUT}" stroke-width="2"/>`
              + `<circle cx="50" cy="150" r="8.5" fill="${z.skin}" stroke="${OUT}" stroke-width="2"/>`
              + `<path d="M44,150 q-7,2 -8,8 M48,158 q-2,7 1,9 M55,159 q2,6 6,5 M56,150 q6,1 8,6" stroke="${OUT}" stroke-width="1.8" fill="none"/>`;
      G += rot(F.armF, 86, 110, a);
    }
    // head (always)
    let head = '';
    if (z.showTorso) head += `<path d="M88,98 q12,5 24,0 l-1,12 q-11,4 -22,0 z" fill="${z.skin}" stroke="${OUT}" stroke-width="1.5"/>`;
    head += `<ellipse cx="100" cy="64" rx="46" ry="50" fill="${z.skin}" stroke="${OUT}" stroke-width="2.5"/>`
      + `<path d="M55,60 q-9,2 -8,12 q6,4 10,-2 z" fill="${z.skin}" stroke="${OUT}" stroke-width="2"/>`
      + `<path d="M143,58 q13,1 9,17 q-9,3 -12,-6 z" fill="${z.skin}" stroke="${OUT}" stroke-width="2"/>`
      + `<ellipse cx="110" cy="80" rx="9" ry="6" fill="${z.skinDark}" opacity="0.5"/>`
      + `<path d="M112,30 l0,15 M108,33 l8,0 M108,40 l8,0" stroke="#243029" stroke-width="1.6" opacity="0.55" fill="none"/>`
      + `<path d="M93,15 q3,-9 9,-5 M104,14 q3,-8 8,-3" stroke="#243029" stroke-width="2" fill="none"/>`
      + `<g><ellipse cx="82" cy="58" rx="15" ry="17" fill="#ffffff" stroke="${OUT}" stroke-width="2"/>`
      + `<circle cx="76" cy="62" r="6" fill="#20303a"/><circle cx="73" cy="58" r="2.2" fill="#ffffff"/></g>`
      + `<path d="M68,46 a15,17 0 0 1 28,3 q-14,-8 -28,-3 z" fill="#000000" opacity="0.13"/>`
      + `<path d="M67,40 q13,-5 25,-1" stroke="#243029" stroke-width="2.5" fill="none"/>`
      + `<path d="M58,90 q18,9 36,2" stroke="#3a2422" stroke-width="3" fill="none" stroke-linecap="round"/>`
      + `<path d="M64,90 l-3,7 M73,93 l-2,7 M82,93 l1,7 M90,91 l3,6" stroke="#3a2422" stroke-width="1.8"/>`
      + `<rect x="62" y="89" width="5" height="7" rx="1" fill="#ffffff" stroke="${OUT}" stroke-width="1"/>`;
    if (z.cone){
      head += `<g><path d="M91,2 L109,2 L126,46 L74,46 Z" fill="#e8772c" stroke="#b85618" stroke-width="2"/>`
        + `<path d="M83,28 L117,28 L121,38 L79,38 Z" fill="#f4f0e8" stroke="#b85618" stroke-width="1.4"/>`
        + `<ellipse cx="100" cy="46" rx="26" ry="5" fill="#cf5f1f" stroke="#b85618" stroke-width="2"/></g>`;
    }
    if (z.bucket){
      head += `<g><path d="M62,18 q38,-13 76,0 l-5,33 q-33,9 -66,0 z" fill="#97a0a8" stroke="#5d666c" stroke-width="2.5"/>`
        + `<path d="M66,22 q34,40 68,0" stroke="#6b747a" stroke-width="2.5" fill="none"/>`
        + `<ellipse cx="100" cy="18" rx="38" ry="9" fill="#b3bbc1" stroke="#5d666c" stroke-width="2"/>`
        + `<ellipse cx="100" cy="18" rx="29" ry="6" fill="#828c93"/>`
        + `<circle cx="76" cy="42" r="2" fill="#5d666c"/><circle cx="124" cy="42" r="2" fill="#5d666c"/></g>`;
    }
    if (z.fuse){
      head += `<g><path d="M104,16 q4,-16 16,-20" stroke="#5a4a36" stroke-width="3" fill="none"/>`
        + `<g><circle cx="122" cy="-6" r="6" fill="#ffd24a"/><circle cx="122" cy="-6" r="3" fill="#ff7a1a"/>`
        + `<path d="M122,-15 l0,5 M131,-6 l-5,1 M122,3 l0,-5 M113,-6 l5,0" stroke="#ffd24a" stroke-width="1.6"/></g></g>`;
    }
    G += `<g>${head}</g>`;

    // projectile (ranged / bomb) — visible while flying during a 'shoot' frame
    if (z.proj && F.proj != null && F.proj >= 0){
      const vec = z.bomb ? [-26, 72] : [-96, 4], fr = F.proj;
      const px = (z.projX + vec[0] * fr).toFixed(1), py = (z.projY + vec[1] * fr).toFixed(1);
      G += `<g><circle cx="${px}" cy="${py}" r="7.5" fill="${z.projColor}" stroke="${OUT}" stroke-width="1.5"/>`
        + `<circle cx="${px}" cy="${py}" r="2.4" fill="#ffffff" opacity="0.5"/></g>`;
    }

    // size scale (about bottom-center 100,214)
    let sx = 1, sy = 1;
    if (z.size === 'fat'){ sx = 1.07 * 1.16; sy = 1.07; }
    else if (z.size === 'skinny'){ sx = 0.85; }
    else if (z.size === 'small'){ sx = sy = 0.82; }
    const scaled = (sx !== 1 || sy !== 1)
      ? `<g transform="translate(100 214) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(-100 -214)">${G}</g>`
      : G;

    const op = z.ghosted ? ' opacity="0.98"' : '';   // ghosts kept nearly solid so they read clearly (was 0.9)
    return `<g${op} transform="translate(${F.lungeX.toFixed(2)} ${F.bobY.toFixed(2)}) rotate(${F.rootRot.toFixed(2)} 100 210)">${scaled}</g>`;
  }

  function svg(idx, prefix, px, anim, p){
    const z = ROSTER[idx] || ROSTER[0];
    const F = frame(z, anim || 'walk', p || 0);
    const sz = px ? 'width="200" height="262"' : 'width="100%" height="100%"';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -20 200 262" ${sz} preserveAspectRatio="xMidYMax meet" style="display:block;overflow:visible;">${build(z, F)}</svg>`;
  }

  return { ROSTER, svg, frame };
})();
