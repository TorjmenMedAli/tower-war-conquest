/* Arsenal weapon art — ported from the Claude Design project "Ten cartoon game weapons"
   (Arsenal.dc.html). Each weapon is a self-contained SVG <g> on a 0 0 300 122 viewBox,
   pointing right (muzzle on the right) so it faces the incoming enemies.
   Arsenal.svgRaw(id) → standalone <svg> string (cards + canvas rasterisation).
   Arsenal.accent(id) → the weapon's accent colour. */
(function () {
'use strict';

// raw <g> markup, verbatim from the design pack
const GROUPS = {
  w1: `<g id='w1' stroke='#14171f' stroke-width='5' stroke-linejoin='round' stroke-linecap='round' fill='#9aa7b8'>
  <rect x='78' y='34' width='134' height='24' rx='6'/>
  <rect x='84' y='38' width='118' height='6' rx='3' fill='#c5cedb' stroke='none'/>
  <rect x='86' y='27' width='13' height='9' rx='2' fill='#424b59'/>
  <rect x='195' y='27' width='9' height='9' rx='2' fill='#424b59'/>
  <rect x='150' y='40' width='30' height='9' rx='2' fill='#2c333f' stroke='none'/>
  <rect x='78' y='56' width='120' height='9' rx='3' fill='#6b7686'/>
  <path d='M96 60 L114 60 L128 105 L106 109 Z' fill='#6b7686'/>
  <path d='M104 71 L120 68 M106 79 L122 76 M108 87 L124 84' stroke='#3a414d' stroke-width='3'/>
  <path d='M108 64 a14 14 0 0 0 26 6' fill='none'/>
  <rect x='116' y='61' width='5' height='12' rx='2' fill='#3a414d'/>
</g>`,
  w2: `<g id='w2' stroke='#14171f' stroke-width='5' stroke-linejoin='round' stroke-linecap='round' fill='#9aa7b8'>
  <rect x='150' y='42' width='96' height='16' rx='5'/>
  <rect x='150' y='37' width='96' height='7' rx='3' fill='#6b7686'/>
  <rect x='152' y='44' width='84' height='4' rx='2' fill='#c5cedb' stroke='none'/>
  <rect x='108' y='44' width='44' height='24' rx='4'/>
  <circle cx='130' cy='56' r='22' fill='#6b7686'/>
  <circle cx='130' cy='56' r='13' fill='#9aa7b8'/>
  <circle cx='130' cy='44' r='3' fill='#3a414d' stroke='none'/>
  <circle cx='141' cy='50' r='3' fill='#3a414d' stroke='none'/>
  <circle cx='141' cy='62' r='3' fill='#3a414d' stroke='none'/>
  <circle cx='130' cy='68' r='3' fill='#3a414d' stroke='none'/>
  <circle cx='119' cy='62' r='3' fill='#3a414d' stroke='none'/>
  <circle cx='119' cy='50' r='3' fill='#3a414d' stroke='none'/>
  <path d='M108 42 L102 32 L110 36 Z' fill='#3a414d'/>
  <path d='M112 60 L126 64 L104 106 L86 100 Z' fill='#cf8a44'/>
  <path d='M110 71 L96 96' stroke='#a9662b' stroke-width='3'/>
  <path d='M122 68 a12 12 0 0 0 22 3' fill='none'/>
</g>`,
  w3: `<g id='w3' stroke='#14171f' stroke-width='5' stroke-linejoin='round' stroke-linecap='round' fill='#9aa7b8'>
  <rect x='92' y='36' width='116' height='30' rx='5'/>
  <rect x='100' y='31' width='74' height='7' rx='3' fill='#6b7686'/>
  <circle cx='108' cy='35' r='4' fill='#3a414d'/>
  <rect x='204' y='44' width='40' height='13' rx='4' fill='#6b7686'/>
  <rect x='244' y='42' width='22' height='17' rx='5' fill='#3a414d'/>
  <rect x='150' y='66' width='22' height='40' rx='4' fill='#3a414d'/>
  <rect x='154' y='70' width='14' height='6' rx='3' fill='#f7c948' stroke='none'/>
  <path d='M118 60 L136 60 L130 96 L114 96 Z' fill='#6b7686'/>
  <path d='M120 64 a12 12 0 0 0 22 4' fill='none'/>
</g>`,
  w4: `<g id='w4' stroke='#14171f' stroke-width='5' stroke-linejoin='round' stroke-linecap='round' fill='#9aa7b8'>
  <path d='M70 46 L40 42 M70 58 L40 66' stroke='#6b7686' stroke-width='7'/>
  <rect x='30' y='39' width='11' height='32' rx='3' fill='#3a414d'/>
  <rect x='70' y='36' width='150' height='28' rx='5'/>
  <rect x='78' y='39' width='118' height='5' rx='2' fill='#c5cedb' stroke='none'/>
  <rect x='92' y='30' width='12' height='8' rx='2' fill='#3a414d'/>
  <rect x='216' y='42' width='56' height='12' rx='4' fill='#6b7686'/>
  <circle cx='230' cy='48' r='2.5' fill='#14171f' stroke='none'/>
  <circle cx='244' cy='48' r='2.5' fill='#14171f' stroke='none'/>
  <circle cx='258' cy='48' r='2.5' fill='#14171f' stroke='none'/>
  <rect x='150' y='62' width='22' height='36' rx='4' fill='#3a414d'/>
  <rect x='120' y='62' width='14' height='30' rx='5' fill='#cf8a44'/>
  <path d='M96 60 L112 60 L106 94 L92 94 Z' fill='#3a414d'/>
  <path d='M96 64 a12 12 0 0 0 22 4' fill='none'/>
</g>`,
  w5: `<g id='w5' stroke='#14171f' stroke-width='5' stroke-linejoin='round' stroke-linecap='round' fill='#9aa7b8'>
  <path d='M112 44 L120 44 L72 98 L54 92 Z' fill='#cf8a44'/>
  <rect x='47' y='85' width='10' height='23' rx='3' fill='#a9662b'/>
  <rect x='108' y='40' width='44' height='26' rx='4' fill='#6b7686'/>
  <rect x='148' y='38' width='134' height='14' rx='6'/>
  <rect x='152' y='40' width='124' height='4' rx='2' fill='#c5cedb' stroke='none'/>
  <rect x='158' y='54' width='74' height='16' rx='7' fill='#cf8a44'/>
  <path d='M168 56 L168 68 M180 56 L180 68 M192 56 L192 68 M204 56 L204 68 M216 56 L216 68' stroke='#a9662b' stroke-width='3'/>
  <path d='M118 66 L134 66 L128 96 L114 96 Z' fill='#6b7686'/>
  <path d='M120 66 a13 13 0 0 0 24 5' fill='none'/>
</g>`,
  w6: `<g id='w6' stroke='#14171f' stroke-width='5' stroke-linejoin='round' stroke-linecap='round' fill='#9aa7b8'>
  <path d='M120 42 L128 42 L72 60 L60 56 L60 40 Z' fill='#cf8a44'/>
  <rect x='51' y='37' width='10' height='23' rx='3' fill='#a9662b'/>
  <rect x='188' y='40' width='92' height='11' rx='4' fill='#6b7686'/>
  <rect x='248' y='30' width='8' height='12' rx='2' fill='#3a414d'/>
  <rect x='270' y='35' width='16' height='20' rx='4' fill='#3a414d'/>
  <rect x='120' y='36' width='76' height='26' rx='4'/>
  <rect x='126' y='39' width='60' height='5' rx='2' fill='#c5cedb' stroke='none'/>
  <rect x='178' y='50' width='34' height='13' rx='5' fill='#cf8a44'/>
  <path d='M150 62 q0 26 20 40 q10 -4 12 -12 q-14 -12 -12 -34 z' fill='#3a414d'/>
  <path d='M126 60 L142 60 L136 92 L122 92 Z' fill='#3a414d'/>
  <path d='M150 64 a12 12 0 0 0 22 4' fill='none'/>
</g>`,
  w7: `<g id='w7' stroke='#14171f' stroke-width='5' stroke-linejoin='round' stroke-linecap='round' fill='#9aa7b8'>
  <path d='M112 44 L122 44 L66 98 L48 92 Z' fill='#cf8a44'/>
  <path d='M88 50 q14 -8 26 -2 L110 60 L90 62 Z' fill='#e6ab63' stroke='none'/>
  <rect x='43' y='85' width='10' height='23' rx='3' fill='#a9662b'/>
  <rect x='150' y='46' width='142' height='11' rx='4' fill='#6b7686'/>
  <rect x='284' y='44' width='9' height='15' rx='2' fill='#3a414d'/>
  <rect x='108' y='40' width='50' height='24' rx='4'/>
  <rect x='138' y='62' width='16' height='22' rx='3' fill='#3a414d'/>
  <rect x='158' y='34' width='6' height='9' fill='#3a414d'/>
  <rect x='200' y='34' width='6' height='9' fill='#3a414d'/>
  <rect x='148' y='20' width='72' height='14' rx='7' fill='#2c333f'/>
  <circle cx='150' cy='27' r='7' fill='#3a414d'/>
  <circle cx='218' cy='27' r='7' fill='#3a414d'/>
  <circle cx='218' cy='27' r='3.5' fill='#7fd4e0' stroke='none'/>
  <path d='M126 62 L140 62 L134 90 L120 90 Z' fill='#3a414d'/>
  <path d='M126 66 a11 11 0 0 0 20 4' fill='none'/>
</g>`,
  w8: `<g id='w8' stroke='#14171f' stroke-width='5' stroke-linejoin='round' stroke-linecap='round' fill='#9aa7b8'>
  <rect x='150' y='34' width='118' height='38' rx='10' fill='#6b7686'/>
  <rect x='156' y='38' width='106' height='6' rx='3' fill='#9aa7b8' stroke='none'/>
  <rect x='156' y='49' width='106' height='6' rx='3' fill='#9aa7b8' stroke='none'/>
  <rect x='156' y='60' width='106' height='6' rx='3' fill='#9aa7b8' stroke='none'/>
  <rect x='184' y='32' width='9' height='42' rx='3' fill='#3a414d'/>
  <rect x='214' y='32' width='9' height='42' rx='3' fill='#3a414d'/>
  <rect x='244' y='32' width='9' height='42' rx='3' fill='#3a414d'/>
  <rect x='262' y='30' width='14' height='46' rx='4' fill='#2c333f'/>
  <circle cx='269' cy='42' r='3' fill='#14171f' stroke='none'/>
  <circle cx='269' cy='53' r='3' fill='#14171f' stroke='none'/>
  <circle cx='269' cy='64' r='3' fill='#14171f' stroke='none'/>
  <rect x='96' y='34' width='60' height='58' rx='12' fill='#74904a'/>
  <rect x='102' y='40' width='18' height='46' rx='6' fill='#8aa64f' stroke='none'/>
  <rect x='120' y='66' width='28' height='30' rx='4' fill='#f7c948'/>
  <path d='M127 70 L127 92 M134 70 L134 92 M141 70 L141 92' stroke='#b5891f' stroke-width='3'/>
  <rect x='104' y='12' width='9' height='26' rx='4' fill='#6b7686'/>
  <circle cx='108' cy='11' r='7' fill='#3a414d'/>
  <rect x='86' y='46' width='12' height='34' rx='5' fill='#3a414d'/>
</g>`,
  w9: `<g id='w9' stroke='#14171f' stroke-width='5' stroke-linejoin='round' stroke-linecap='round' fill='#9aa7b8'>
  <path d='M70 44 L48 30 L48 84 L70 70 Z' fill='#56702f'/>
  <ellipse cx='50' cy='57' rx='6' ry='22' fill='#2c333f' stroke='none'/>
  <rect x='66' y='40' width='186' height='34' rx='16' fill='#74904a'/>
  <rect x='80' y='45' width='150' height='7' rx='3' fill='#8aa64f' stroke='none'/>
  <rect x='244' y='36' width='16' height='42' rx='5' fill='#2c333f'/>
  <ellipse cx='252' cy='57' rx='5' ry='17' fill='#14171f' stroke='none'/>
  <rect x='150' y='20' width='30' height='20' rx='4' fill='#3a414d'/>
  <rect x='158' y='13' width='6' height='9' rx='2' fill='#3a414d'/>
  <path d='M108 74 L122 74 L120 102 L106 102 Z' fill='#3a414d'/>
  <path d='M150 74 L166 74 L160 104 L146 104 Z' fill='#3a414d'/>
</g>`,
  w10: `<g id='w10' stroke='#14171f' stroke-width='5' stroke-linejoin='round' stroke-linecap='round' fill='#9aa7b8'>
  <path d='M112 50 L122 50 L74 96 L58 90 Z' fill='#3a414d'/>
  <rect x='51' y='84' width='10' height='23' rx='3' fill='#2c333f'/>
  <rect x='108' y='44' width='46' height='26' rx='5'/>
  <rect x='176' y='40' width='96' height='22' rx='9' fill='#6b7686'/>
  <ellipse cx='270' cy='51' rx='5' ry='10' fill='#2c333f' stroke='none'/>
  <circle cx='152' cy='60' r='30' fill='#74904a'/>
  <circle cx='152' cy='60' r='10' fill='#3a414d'/>
  <circle cx='152' cy='38' r='6' fill='#f7c948'/>
  <circle cx='173' cy='52' r='6' fill='#f7c948'/>
  <circle cx='173' cy='74' r='6' fill='#f7c948'/>
  <circle cx='152' cy='84' r='6' fill='#f7c948'/>
  <circle cx='131' cy='74' r='6' fill='#f7c948'/>
  <circle cx='131' cy='52' r='6' fill='#f7c948'/>
  <path d='M120 66 L136 66 L130 100 L114 100 Z' fill='#3a414d'/>
</g>`,
};

const ACCENT = {
  w1: '#4dd0e0', w2: '#e0664d', w3: '#b06de0', w4: '#6d8ee0', w5: '#e0a84d',
  w6: '#5fcf6d', w7: '#e04d8a', w8: '#c9d04d', w9: '#e0734d', w10: '#4de08f',
};

function svgRaw(id, opts) {
  const g = GROUPS[id]; if (!g) return '';
  const o = opts || {};
  const w = o.width || '100%', h = o.height || '100%';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 122" width="${w}" height="${h}" `
    + `preserveAspectRatio="xMidYMid meet" style="display:block;overflow:visible">${g}</svg>`;
}

window.Arsenal = {
  ids: Object.keys(GROUPS),
  has(id) { return !!GROUPS[id]; },
  svgRaw,
  accent(id) { return ACCENT[id] || '#9aa7b8'; },
};
})();
