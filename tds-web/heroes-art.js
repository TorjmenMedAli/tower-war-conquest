/* ===== Hero Squad — 10 chibi hero sprites (ported from the Claude Design project
   "Zombie game character assets", file Hero Squad.dc.html) =====

   Same procedural chibi rig as undead-art.js but the figures face RIGHT (the design
   mirrors the svg with scaleX(-1)) and carry hero gear: weapons, helmets, shield, cape,
   jetpack. CSS keyframes don't run in a rasterised <img>, so the limb/body transforms are
   recomputed per frame in JS and baked as static SVG transforms (canvas-raster approach).

   HeroSquad.ROSTER                        — 10 heroes (combat profile + art flags)
   HeroSquad.svg(idx, prefix, px, anim, p) — SVG string (anim 'walk'|'attack'|'shoot'|'bomb'|'idle') */
window.HeroSquad = (() => {
  const OUT = '#1f2a28';

  // id/name/rarity/combat + art flags. atk: 'melee' | 'ranged' | 'bomb'
  const ROSTER = [
    { id:'rifleman', name:'Rifleman', rarity:'Common', atk:'ranged', dmg:18, rate:2.6, range:1.00, spd:1000, splash:0,
      skin:'#f0c29c', skinDark:'#d29b6e', shirt:'#5d6b46', shirtDark:'#454f33', pants:'#48512f', shoe:'#2c2922',
      helmColor:'#5d6b46', accent2:'#2f3a22', soldierHelm:true, rifle:true, muzzle:true, proj:true, projType:'plain', projX:18, projY:150, projColor:'#ffd86b',
      legs:true, showTorso:true, showArms:true, size:'', flyer:false },
    { id:'juggernaut', name:'Juggernaut', rarity:'Epic', atk:'melee', dmg:46, rate:1.1, range:0.55, spd:720, splash:55,
      skin:'#e7b489', skinDark:'#c58e5c', shirt:'#7d4a2e', shirtDark:'#5b351f', pants:'#3f4654', shoe:'#222222',
      helmColor:'#9a2f2f', accent2:'#5c1f1f', bandana:true, hammer:true,
      legs:true, showTorso:true, showArms:true, size:'fat', flyer:false },
    { id:'scout', name:'Scout', rarity:'Common', atk:'melee', dmg:13, rate:3.6, range:0.55, spd:820, splash:0,
      skin:'#d6a071', skinDark:'#b57f50', shirt:'#3f6b52', shirtDark:'#2c4c3a', pants:'#3a3f46', shoe:'#2a2a2a',
      helmColor:'#2f3a44', accent2:'#1f262e', cap:true, knife:true,
      legs:true, showTorso:true, showArms:true, size:'skinny', flyer:false },
    { id:'pyro', name:'Pyro', rarity:'Rare', atk:'ranged', dmg:15, rate:4.2, range:0.60, spd:680, splash:42,
      skin:'#caa078', skinDark:'#a87e57', shirt:'#8a4a24', shirtDark:'#622f16', pants:'#4a3a2a', shoe:'#2a2118',
      helmColor:'#3a2a22', accent2:'#e8772c', hood:true, goggles:true, flamer:true, muzzle:true, proj:true, projType:'fire', projX:18, projY:134, projColor:'#ff7a1a',
      legs:true, showTorso:true, showArms:true, size:'', flyer:false },
    { id:'riot', name:'Riot Guard', rarity:'Rare', atk:'melee', dmg:22, rate:1.7, range:0.55, spd:820, splash:0,
      skin:'#e0a878', skinDark:'#bd8553', shirt:'#2c3441', shirtDark:'#1d2530', pants:'#2c3441', shoe:'#1a1a1a',
      helmColor:'#2c3441', accent2:'#9fd0e6', riotHelm:true, baton:true, shield:true,
      legs:true, showTorso:true, showArms:true, size:'', flyer:false },
    { id:'knight', name:'Knight', rarity:'Epic', atk:'melee', dmg:38, rate:1.6, range:0.55, spd:850, splash:0,
      skin:'#ecbd92', skinDark:'#ca9a6e', shirt:'#bac3cc', shirtDark:'#8f99a3', pants:'#6b7079', shoe:'#3a3f46',
      helmColor:'#9a2f3a', accent2:'#f2c14e', knightHelm:true, sword:true, cape:true,
      legs:true, showTorso:true, showArms:true, size:'', flyer:false },
    { id:'archer', name:'Archer', rarity:'Rare', atk:'ranged', dmg:26, rate:1.9, range:1.20, spd:1300, splash:0,
      skin:'#d9a878', skinDark:'#b9885a', shirt:'#3f6b3a', shirtDark:'#2c4c28', pants:'#5a4a35', shoe:'#3a2e22',
      helmColor:'#3a5a35', accent2:'#e8c24a', hood:true, feather:true, bow:true, proj:true, projType:'arrow', projX:24, projY:120, projColor:'#caa35a',
      legs:true, showTorso:true, showArms:true, size:'', flyer:false },
    { id:'mage', name:'Mage', rarity:'Legendary', atk:'ranged', dmg:34, rate:1.6, range:1.15, spd:1000, splash:48,
      skin:'#e6c0a0', skinDark:'#c89c78', shirt:'#3a3f7a', shirtDark:'#2a2e5c', pants:'#3a3f7a', shoe:'#2a2e5c',
      helmColor:'#3a3f7a', accent2:'#f2c14e', wizardHat:true, staff:true, ghost:true, proj:true, projType:'plain', projX:30, projY:82, projColor:'#9fd8ff',
      legs:false, showTorso:true, showArms:true, size:'', flyer:true },
    { id:'jet', name:'Jet Trooper', rarity:'Epic', atk:'ranged', dmg:22, rate:3.2, range:1.00, spd:1050, splash:0,
      skin:'#e0a878', skinDark:'#bd8553', shirt:'#6b7079', shirtDark:'#4a4f57', pants:'#4a4f57', shoe:'#2a2a2a',
      helmColor:'#5a6b3a', accent2:'#bfe6ff', soldierHelm:true, goggles:true, jetpack:true, pistol:true, muzzle:true, proj:true, projType:'plain', projX:22, projY:150, projColor:'#ffd86b',
      legs:true, showTorso:true, showArms:true, size:'', flyer:true },
    { id:'skybomber', name:'Sky Bomber', rarity:'Legendary', atk:'bomb', dmg:50, rate:1.0, range:0.90, spd:800, splash:80,
      skin:'#d6a071', skinDark:'#b67f50', shirt:'#7a5a2e', shirtDark:'#5a4220', pants:'#3f4654', shoe:'#2a2a2a',
      helmColor:'#5a4a2e', accent2:'#ffd24a', pilotCap:true, goggles:true, jetpack:true, gren:true, proj:true, projType:'plain', projX:56, projY:150, projColor:'#3a4048',
      legs:true, showTorso:true, showArms:true, size:'', flyer:true },
  ];

  const kf = (p, stops) => {
    if (p <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++){
      if (p <= stops[i][0]){ const [t0,v0]=stops[i-1],[t1,v1]=stops[i]; return v0 + (v1-v0)*(p-t0)/(t1-t0||1); }
    }
    return stops[stops.length-1][1];
  };
  function frame(z, anim, p){
    const tau = Math.PI*2, fly = z.flyer;
    const F = { legF:0, legB:0, armF:0, armB:0, bobY:0, rootRot:0, lungeX:0, proj:null, flash:0, opacity:1 };
    if (fly && anim !== 'hurt' && anim !== 'death') F.bobY = -9 * Math.sin(p*tau);
    if (anim === 'hurt'){                                              // hurtShake + hurtFlash (red tint)
      F.lungeX = kf(p, [[0,0],[0.15,7],[0.30,-6],[0.45,5],[0.60,-4],[1,0]]);
      F.rootRot = kf(p, [[0,0],[0.15,2],[0.30,-2],[0.45,0],[1,0]]);
      F.flash = kf(p, [[0,0],[0.25,1],[0.55,1],[1,0]]);
      return F;
    }
    if (anim === 'death'){                                            // die — topple over then fade
      F.bobY = kf(p, [[0,0],[0.12,-3],[0.45,24],[1,24]]);
      F.rootRot = kf(p, [[0,0],[0.12,-7],[0.45,82],[1,82]]);
      F.opacity = kf(p, [[0,1],[0.80,1],[0.92,0],[1,0]]);
      return F;
    }
    if (anim === 'walk' || anim === 'idle'){
      if (fly){ F.armF = 6*Math.sin(p*tau); F.armB = -6*Math.sin(p*tau); }
      else if (anim === 'idle'){ F.bobY = -3*(0.5-0.5*Math.cos(p*tau)); }
      else {
        const sw = Math.sin(p*tau);
        F.legF = 22*sw; F.legB = -22*sw; F.armF = -15*sw; F.armB = 15*sw;
        F.bobY = -5*Math.abs(Math.sin(p*tau)); F.rootRot = -1.5 - Math.abs(sw);
      }
    } else if (anim === 'attack'){
      F.armF = kf(p, [[0,-12],[0.25,-78],[0.55,34],[0.78,18],[1,-12]]);   // clawSwipe (melee weapon swing)
      if (!fly){ F.lungeX = kf(p, [[0,0],[0.35,7],[0.6,-13],[1,0]]); F.legF = kf(p, [[0,0],[0.35,-6],[0.6,10],[1,0]]); }
    } else if (anim === 'shoot' || anim === 'bomb'){
      F.rootRot += kf(p, [[0,0],[0.3,7],[0.58,-9],[1,0]]);
      F.proj = kf(p, [[0,-1],[0.18,-1],[0.2,0],[1,1]]);
    }
    return F;
  }

  // ---- weapon held in the front hand (hand at 50,150; barrel points -x → +x after mirror) ----
  function weapon(z, muzzleOp){
    const sk = z.skin, a2 = z.accent2, pc = z.projColor;
    const muzzle = (tag) => muzzleOp > 0 ? `<g opacity="${muzzleOp.toFixed(2)}">${tag}</g>` : '';
    if (z.rifle) return `<g><rect x="12" y="146" width="46" height="8" rx="2" fill="#3a3f46" stroke="${OUT}" stroke-width="2"/><rect x="15" y="148" width="9" height="4" fill="#5a6068"/><path d="M48,150 l15,13 l-6,4 l-13,-11 z" fill="#5a4630" stroke="${OUT}" stroke-width="2"/><rect x="30" y="154" width="8" height="13" rx="2" fill="#3a3f46" stroke="${OUT}" stroke-width="2"/><circle cx="50" cy="150" r="6" fill="${sk}" stroke="${OUT}" stroke-width="2"/>`
      + muzzle(`<path d="M12,150 l-13,-6 l3,6 l-3,6 z" fill="#ffd86b"/><circle cx="11" cy="150" r="4.5" fill="#fff2c0"/>`) + `</g>`;
    if (z.pistol) return `<g><path d="M30,145 l23,0 l0,8 l-11,0 l-4,11 l-8,0 l1,-11 l-2,0 z" fill="#3a3f46" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/><rect x="25" y="146" width="8" height="6" fill="#5a6068"/><circle cx="50" cy="150" r="6" fill="${sk}" stroke="${OUT}" stroke-width="2"/>`
      + muzzle(`<path d="M25,149 l-11,-5 l2,5 l-2,5 z" fill="#ffd86b"/><circle cx="24" cy="149" r="3.8" fill="#fff2c0"/>`) + `</g>`;
    if (z.flamer) return `<g><rect x="22" y="145" width="34" height="9" rx="3" fill="#3a3f46" stroke="${OUT}" stroke-width="2"/><rect x="14" y="146" width="10" height="7" rx="2" fill="#5a626b" stroke="${OUT}" stroke-width="2"/><rect x="38" y="153" width="7" height="12" rx="2" fill="#2a2e34" stroke="${OUT}" stroke-width="2"/><circle cx="50" cy="150" r="6" fill="${sk}" stroke="${OUT}" stroke-width="2"/>`
      + muzzle(`<path d="M14,150 q-14,-7 -22,0 q-7,4 0,8 q-13,2 -9,9 q16,-3 31,-7 z" fill="#ff7a1a"/><path d="M12,150 q-9,-4 -15,0 q-4,3 0,5 q11,1 15,-5 z" fill="#ffd24a"/>`) + `</g>`;
    if (z.sword) return `<g><path d="M48,156 l-35,-59 q-2,-5 3,-3 l41,53 z" fill="#dfe6ec" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/><path d="M14,96 l9,-2 l-4,7 z" fill="#aeb8c2"/><path d="M39,150 l24,-13 l4,7 l-24,13 z" fill="${a2}" stroke="${OUT}" stroke-width="2"/><rect x="47" y="148" width="9" height="18" rx="3" fill="#6b4a2e" stroke="${OUT}" stroke-width="2"/><circle cx="51" cy="168" r="4.2" fill="${a2}" stroke="${OUT}" stroke-width="2"/><circle cx="50" cy="150" r="6.5" fill="${sk}" stroke="${OUT}" stroke-width="2"/></g>`;
    if (z.knife) return `<g><path d="M46,152 l-24,-28 q-3,-3 1,-4 l28,26 z" fill="#dfe6ec" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/><rect x="44" y="148" width="7" height="13" rx="2" fill="#2a2a2a" stroke="${OUT}" stroke-width="2"/><circle cx="50" cy="150" r="6" fill="${sk}" stroke="${OUT}" stroke-width="2"/></g>`;
    if (z.baton) return `<g transform="rotate(-22 50 150)"><rect x="12" y="146" width="42" height="8" rx="4" fill="#2a2e34" stroke="${OUT}" stroke-width="2"/><rect x="14" y="147" width="6" height="6" rx="2" fill="#4a4f57"/><circle cx="50" cy="150" r="6" fill="${sk}" stroke="${OUT}" stroke-width="2"/></g>`;
    if (z.hammer) return `<g><g transform="rotate(18 50 150)"><rect x="42" y="92" width="9" height="68" rx="3" fill="#6b4a2e" stroke="${OUT}" stroke-width="2"/><rect x="23" y="78" width="46" height="32" rx="6" fill="#5a626b" stroke="${OUT}" stroke-width="2.5"/><rect x="23" y="78" width="12" height="32" rx="3" fill="#737c86"/><rect x="57" y="78" width="12" height="32" rx="3" fill="#42484f"/></g><circle cx="50" cy="150" r="7" fill="${sk}" stroke="${OUT}" stroke-width="2"/></g>`;
    if (z.bow) return `<g><path d="M42,106 q-32,44 0,88" fill="none" stroke="#6b4a2e" stroke-width="6" stroke-linecap="round"/><path d="M42,106 q-32,44 0,88" fill="none" stroke="#8a6238" stroke-width="2.4" stroke-linecap="round"/><path d="M42,106 L42,194" stroke="#e8e8e8" stroke-width="1.6"/><path d="M42,150 l-30,0" stroke="#caa35a" stroke-width="3"/><path d="M8,150 l9,-3.5 l0,7 z" fill="#dfe6ec" stroke="${OUT}" stroke-width="1.4"/><circle cx="50" cy="150" r="6" fill="${sk}" stroke="${OUT}" stroke-width="2"/></g>`;
    if (z.staff) return `<g><rect x="30" y="74" width="7" height="92" rx="3.5" transform="rotate(12 50 150)" fill="#6b4a2e" stroke="${OUT}" stroke-width="2"/><g transform="rotate(12 50 150)"><circle cx="33" cy="70" r="11" fill="${pc}" stroke="${OUT}" stroke-width="2"/><circle cx="30" cy="67" r="4" fill="#ffffff" opacity="0.7"/><path d="M33,55 l0,-7 M21,70 l-7,0 M45,70 l7,0 M33,85 l0,7" stroke="${pc}" stroke-width="2"/></g><circle cx="50" cy="150" r="6.5" fill="${sk}" stroke="${OUT}" stroke-width="2"/></g>`;
    if (z.gren) return `<g><circle cx="43" cy="157" r="11" fill="#3a4048" stroke="${OUT}" stroke-width="2.5"/><ellipse cx="39" cy="153" rx="3" ry="2" fill="#5a626b" opacity="0.8"/><rect x="39" y="143" width="8" height="6" rx="1.5" fill="#5a626b" stroke="${OUT}" stroke-width="1.6"/><path d="M47,146 q7,-2 9,3" stroke="${OUT}" stroke-width="1.6" fill="none"/><circle cx="50" cy="150" r="6" fill="${sk}" stroke="${OUT}" stroke-width="2"/></g>`;
    return '';
  }

  // ---- headgear (drawn over the head) ----
  function headgear(z){
    const hc = z.helmColor, a2 = z.accent2;
    let g = '';
    if (z.soldierHelm) g += `<g><path d="M52,44 q5,-48 48,-48 q43,0 48,48 q-2,7 -10,8 q-38,-13 -76,0 q-8,-1 -10,-8 z" fill="${hc}" stroke="${OUT}" stroke-width="2.5"/><path d="M56,40 q44,-13 88,0" stroke="#000000" stroke-width="3" opacity="0.16" fill="none"/><rect x="91" y="-7" width="18" height="13" rx="3" fill="${hc}" stroke="${OUT}" stroke-width="2"/><path d="M100,-7 l0,13" stroke="${OUT}" stroke-width="1.5" opacity="0.5"/></g>`;
    if (z.knightHelm) g += `<g><g transform="rotate(0)"><path d="M118,2 q28,-6 26,32 q-4,22 -22,26 q12,-28 4,-58 z" fill="${hc}" stroke="${OUT}" stroke-width="2"/></g><path d="M50,53 q4,-53 50,-53 q46,0 50,53 q-4,8 -13,7 l0,-13 q-37,-13 -74,0 l0,13 q-9,1 -13,-7 z" fill="#cdd6de" stroke="${OUT}" stroke-width="2.5"/><rect x="57" y="45" width="86" height="11" rx="4" fill="#aab4be" stroke="${OUT}" stroke-width="2"/><path d="M70,48 l4,5 M85,48 l3,5 M100,48 l3,5 M115,48 l4,5" stroke="${OUT}" stroke-width="1.8"/><path d="M100,0 q5,-9 0,-16" stroke="${OUT}" stroke-width="2.4" fill="none"/></g>`;
    if (z.riotHelm) g += `<g><path d="M50,50 q5,-50 50,-50 q45,0 50,50 q-3,7 -12,7 q-38,-13 -76,0 q-9,0 -12,-7 z" fill="${hc}" stroke="${OUT}" stroke-width="2.5"/><path d="M55,45 q45,-13 90,0 l0,5 q-45,-12 -90,0 z" fill="#000000" opacity="0.22"/><path d="M55,54 q45,38 90,0 l0,30 q-45,30 -90,0 z" fill="#bfe6ff" opacity="0.24" stroke="${OUT}" stroke-width="2"/><path d="M97,2 l6,0 l-2,14 l-2,0 z" fill="${a2}"/></g>`;
    if (z.cap) g += `<g><path d="M53,42 q5,-45 47,-45 q42,0 47,45 q-2,6 -9,7 q-38,-13 -76,0 q-7,-1 -9,-7 z" fill="${hc}" stroke="${OUT}" stroke-width="2.5"/><path d="M146,38 q17,1 20,10 q-3,6 -20,4 q3,-7 0,-14 z" fill="${hc}" stroke="${OUT}" stroke-width="2"/><path d="M70,15 q30,-10 60,0" stroke="${a2}" stroke-width="4" fill="none" opacity="0.85"/><circle cx="100" cy="5" r="3.6" fill="${a2}" stroke="${OUT}" stroke-width="1.2"/></g>`;
    if (z.wizardHat) g += `<g><path d="M99,-54 q17,32 41,78 q-49,16 -90,0 q24,-46 41,-78 q4,-6 8,0 z" fill="${hc}" stroke="${OUT}" stroke-width="2.5"/><path d="M122,-30 q-9,21 -2,46" stroke="#000000" stroke-width="3" opacity="0.16" fill="none"/><ellipse cx="98" cy="24" rx="53" ry="10" fill="${hc}" stroke="${OUT}" stroke-width="2.5"/><path d="M63,18 q35,9 69,-3" stroke="${a2}" stroke-width="6" fill="none"/><path d="M119,-42 l3,8 l8,1 l-6,5 l2,8 l-7,-4 l-7,4 l2,-8 l-6,-5 l8,-1 z" fill="${a2}" stroke="${OUT}" stroke-width="1.2"/></g>`;
    if (z.bandana) g += `<g><path d="M54,40 q46,-22 92,0 q-2,-16 -12,-24 q-34,-12 -68,0 q-10,8 -12,24 z" fill="${hc}" stroke="${OUT}" stroke-width="2.5"/><path d="M54,40 q46,-22 92,0" stroke="#000000" stroke-width="2.5" opacity="0.18" fill="none"/><path d="M140,28 q18,-6 26,4 q-9,3 -10,12 q-10,-9 -16,-16 z" fill="${hc}" stroke="${OUT}" stroke-width="2"/></g>`;
    if (z.pilotCap) g += `<g><path d="M50,54 q4,-54 50,-54 q46,0 50,54 q-8,7 -17,5 q-33,-13 -66,0 q-9,2 -17,-5 z" fill="${hc}" stroke="${OUT}" stroke-width="2.5"/><path d="M50,50 q6,12 20,12 l0,17 q-15,-2 -23,-13 z" fill="${hc}" stroke="${OUT}" stroke-width="2.5"/><path d="M150,50 q-6,12 -20,12 l0,17 q15,-2 23,-13 z" fill="${hc}" stroke="${OUT}" stroke-width="2.5"/><path d="M70,16 q30,-9 60,0" stroke="#000000" stroke-width="3" opacity="0.16" fill="none"/></g>`;
    if (z.goggles) g += `<g><path d="M50,46 q22,-7 48,-5 q26,-2 48,5" stroke="#3a2f24" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.9"/><ellipse cx="80" cy="44" rx="13" ry="11" fill="#bfe6ff" opacity="0.55" stroke="${OUT}" stroke-width="2.5"/><ellipse cx="112" cy="46" rx="11" ry="9" fill="#bfe6ff" opacity="0.55" stroke="${OUT}" stroke-width="2.5"/><path d="M92,45 l9,1" stroke="${OUT}" stroke-width="2.5"/><ellipse cx="76" cy="40" rx="4" ry="3" fill="#ffffff" opacity="0.6"/></g>`;
    if (z.feather) g += `<path d="M150,20 q24,-8 32,-30 q-1,24 -10,36 q-11,6 -22,2 z" fill="${a2}" stroke="${OUT}" stroke-width="2"/>`;
    return g;
  }

  function build(z, F, anim, p, prefix){
    const rot = (deg, cx, cy, body) => `<g transform="rotate(${deg.toFixed(2)} ${cx} ${cy})">${body}</g>`;
    let G = '';

    // cape (behind)
    if (z.cape) G += `<g><path d="M70,106 q-17,44 -8,88 q42,-13 76,0 q9,-44 -8,-88 q-30,13 -60,0 z" fill="${z.helmColor}" stroke="${OUT}" stroke-width="2.5"/><path d="M100,110 l0,82" stroke="#000000" stroke-width="2" opacity="0.14"/></g>`;
    // jetpack (behind torso) with flame
    if (z.jetpack){
      const flameH = z.flyer ? (0.85 + 0.3 * Math.abs(Math.sin(p * Math.PI * 6))) : 1;
      G += `<g><rect x="108" y="100" width="22" height="46" rx="7" fill="#4a525c" stroke="${OUT}" stroke-width="2.5"/><rect x="112" y="105" width="14" height="16" rx="4" fill="#6b7480"/><circle cx="119" cy="133" r="4" fill="#3a4048" stroke="${OUT}" stroke-width="1.5"/>`
        + `<g transform="translate(119 146) scale(1 ${flameH.toFixed(2)}) translate(-119 -146)"><path d="M111,146 q8,20 0,42 q-8,-20 0,-42 z" fill="#ffd24a"/><path d="M114,148 q5,14 0,30 q-5,-14 0,-30 z" fill="#ff7a1a"/></g></g>`;
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
    // ghost robe-tail (Mage)
    if (z.ghost) G += `<path d="M72,148 q-18,32 -8,50 q10,-10 18,-2 q9,11 18,-3 q9,11 18,-4 q9,-26 -6,-41 q-30,12 -58,0 z" fill="${z.shirt}" stroke="${OUT}" stroke-width="2.5" opacity="0.98"/>`;
    // torso
    if (z.showTorso){
      G += `<g><path d="M66,108 q34,-14 68,0 q4,28 2,50 L130,166 L122,158 L114,167 L106,158 L98,167 L90,158 L82,168 L74,158 L68,162 q-4,-26 -2,-54 z" fill="${z.shirt}" stroke="${OUT}" stroke-width="2.5"/>`
        + `<path d="M84,108 l16,13 l16,-13" stroke="${OUT}" stroke-width="2" fill="none"/>`
        + `<path d="M92,124 l9,17 l-4,2 z" fill="${z.shirtDark}"/>`
        + `<circle cx="100" cy="132" r="2.4" fill="${OUT}"/><circle cx="100" cy="148" r="2.4" fill="${OUT}"/>`
        + `<path d="M116,128 l14,4 l-3,13 l-13,-3 z" fill="${z.shirtDark}" opacity="0.7"/></g>`;
    }
    // front leg
    if (z.legs){
      const l = `<path d="M76,158 q10,-3 18,0 l-2,44 q-7,3 -14,0 z" fill="${z.pants}" stroke="${OUT}" stroke-width="2"/>`
        + `<ellipse cx="84" cy="186" rx="5" ry="4" fill="${z.skin}" opacity="0.85"/>`
        + `<path d="M58,200 q-4,3 -4,9 q0,7 12,7 l22,0 q5,0 5,-7 l0,-6 q-16,-7 -33,-3 z" fill="${z.shoe}" stroke="${OUT}" stroke-width="2"/>`;
      G += rot(F.legF, 85, 159, l);
    }
    // front arm (+ held weapon + muzzle)
    if (z.showArms){
      let muzzleOp = 0;
      if (z.muzzle && (anim === 'shoot' || anim === 'bomb')) muzzleOp = (p >= 0.1 && p <= 0.34) ? 1 : 0;
      const a = `<path d="M84,108 q-20,8 -30,30 q-3,9 5,12 q9,3 13,-6 q9,-20 18,-28 z" fill="${z.skin}" stroke="${OUT}" stroke-width="2"/>`
        + `<circle cx="50" cy="150" r="8.5" fill="${z.skin}" stroke="${OUT}" stroke-width="2"/>`
        + `<path d="M44,150 q-7,2 -8,8 M48,158 q-2,7 1,9 M55,159 q2,6 6,5 M56,150 q6,1 8,6" stroke="${OUT}" stroke-width="1.8" fill="none"/>`
        + weapon(z, muzzleOp);
      G += rot(F.armF, 86, 110, a);
    }
    // shield (front)
    if (z.shield) G += `<g><path d="M40,112 q28,-9 44,0 q5,32 -2,64 q-20,9 -40,0 q-7,-33 -2,-64 z" fill="${z.helmColor}" stroke="${OUT}" stroke-width="3"/><path d="M44,118 q24,-7 36,0" stroke="${z.accent2}" stroke-width="4" fill="none" opacity="0.85"/><rect x="50" y="132" width="22" height="24" rx="3" fill="${z.accent2}" opacity="0.9" stroke="${OUT}" stroke-width="1.5"/><ellipse cx="61" cy="144" rx="4" ry="6" fill="${OUT}" opacity="0.5"/></g>`;
    // head
    let head = '';
    if (z.showTorso) head += `<path d="M88,98 q12,5 24,0 l-1,12 q-11,4 -22,0 z" fill="${z.skin}" stroke="${OUT}" stroke-width="1.5"/>`;
    if (z.hood) head += `<path d="M40,70 q-2,-72 60,-72 q62,0 60,72 q-14,-30 -30,-34 q-6,20 -8,36 q-24,-10 -48,0 q-2,-16 -8,-36 q-16,4 -28,34 z" fill="${z.helmColor}" stroke="${OUT}" stroke-width="2.5"/>`;
    head += `<ellipse cx="100" cy="64" rx="46" ry="50" fill="${z.skin}" stroke="${OUT}" stroke-width="2.5"/>`
      + `<path d="M55,60 q-9,2 -8,12 q6,4 10,-2 z" fill="${z.skin}" stroke="${OUT}" stroke-width="2"/>`
      + `<path d="M143,58 q13,1 9,17 q-9,3 -12,-6 z" fill="${z.skin}" stroke="${OUT}" stroke-width="2"/>`
      + `<ellipse cx="82" cy="84" rx="10" ry="6" fill="${z.skinDark}" opacity="0.32"/>`
      + `<path d="M63,43 q12,-7 24,-2" stroke="#3a2a22" stroke-width="3.2" fill="none" stroke-linecap="round"/>`
      + `<path d="M104,45 q10,-4 18,1" stroke="#3a2a22" stroke-width="2.8" fill="none" stroke-linecap="round" opacity="0.92"/>`
      // pupils sit hard toward the SOURCE-facing side (left) and level — after the rig's mirror
      // the hero clearly looks RIGHT, at the enemies (they used to read as gazing down-backward)
      + `<g><ellipse cx="80" cy="60" rx="11.5" ry="13.5" fill="#ffffff" stroke="${OUT}" stroke-width="2"/><circle cx="72.5" cy="60.5" r="5.4" fill="#27333d"/><circle cx="70" cy="57" r="2" fill="#ffffff"/></g>`
      + `<g><ellipse cx="112" cy="62" rx="8.2" ry="10.2" fill="#ffffff" stroke="${OUT}" stroke-width="2"/><circle cx="106.5" cy="62.5" r="4.1" fill="#27333d"/><circle cx="104.5" cy="59.5" r="1.5" fill="#ffffff"/></g>`
      + `<path d="M67,87 q14,9 26,2" stroke="#7a3b32" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    head += headgear(z);
    G += `<g>${head}</g>`;

    // projectile (ranged/bomb) — visible while flying during a shoot/bomb frame
    if (z.proj && F.proj != null && F.proj >= 0){
      const bomb = z.atk === 'bomb', vec = bomb ? [-26, 72] : [-96, 4], fr = F.proj;
      const px = z.projX + vec[0] * fr, py = z.projY + vec[1] * fr, t = `transform="translate(${px.toFixed(1)} ${py.toFixed(1)})"`;
      if (z.projType === 'arrow') G += `<g ${t}><rect x="-2" y="-1.5" width="28" height="3" rx="1.5" fill="#8a6238" stroke="${OUT}" stroke-width="1"/><path d="M-2,0 l-11,-5 l3,5 l-3,5 z" fill="#cdd6de" stroke="${OUT}" stroke-width="1"/><path d="M24,-4 l6,4 l-6,4 M21,-4 l6,4 l-6,4" stroke="#caa35a" stroke-width="1.6" fill="none"/></g>`;
      else if (z.projType === 'fire') G += `<g ${t}><path d="M12,0 q-11,-9 -22,0 q-9,6 0,13 q-13,2 -7,11 q20,-3 35,-9 q5,-11 -6,-15 z" fill="#ff7a1a"/><path d="M7,0 q-8,-6 -15,0 q-6,4 0,9 q13,1 19,-3 q3,-7 -4,-6 z" fill="#ffd24a"/></g>`;
      else G += `<g><circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="7.5" fill="${z.projColor}" stroke="${OUT}" stroke-width="1.5"/><circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="2.4" fill="#ffffff" opacity="0.5"/></g>`;
    }

    // size scale about bottom-center
    let sx = 1, sy = 1;
    if (z.size === 'fat'){ sx = 1.07 * 1.16; sy = 1.07; }
    else if (z.size === 'skinny'){ sx = 0.85; }
    else if (z.size === 'small'){ sx = sy = 0.82; }
    const scaled = (sx !== 1 || sy !== 1)
      ? `<g transform="translate(100 214) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(-100 -214)">${G}</g>` : G;
    // hurt flash — brighten + redden the whole figure (feColorMatrix, intensity = F.flash)
    let defs = '', flt = '';
    if (F.flash > 0){
      const a = F.flash, id = (prefix || 'h') + '_hf';
      defs = `<defs><filter id="${id}" x="-20%" y="-20%" width="140%" height="140%"><feColorMatrix type="matrix" values="${(1+0.5*a).toFixed(3)} 0 0 0 ${(0.4*a).toFixed(3)} 0 ${(1-0.45*a).toFixed(3)} 0 0 0 0 0 ${(1-0.45*a).toFixed(3)} 0 0 0 0 0 1 0"/></filter></defs>`;
      flt = ` filter="url(#${id})"`;
    }
    const op = (F.opacity != null && F.opacity < 1) ? ` opacity="${F.opacity.toFixed(3)}"` : '';
    const inner = `<g${op}${flt} transform="translate(${F.lungeX.toFixed(2)} ${F.bobY.toFixed(2)}) rotate(${F.rootRot.toFixed(2)} 100 210)">${scaled}</g>`;
    // mirror so the hero faces RIGHT (toward the enemies)
    return defs + `<g transform="translate(200 0) scale(-1 1)">${inner}</g>`;
  }

  function svg(idx, prefix, px, anim, p){
    const z = ROSTER[idx] || ROSTER[0];
    const F = frame(z, anim || 'walk', p || 0);
    const sz = px ? 'width="200" height="302"' : 'width="100%" height="100%"';   // extra headroom so tall hats (wizard) aren't clipped
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -60 200 302" ${sz} preserveAspectRatio="xMidYMax meet" style="display:block;overflow:visible;">${build(z, F, anim || 'walk', p || 0, prefix || 'h')}</svg>`;
  }

  return { ROSTER, svg };
})();
