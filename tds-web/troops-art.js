/* troops-art.js — procedural SVG portraits for the TROOPS screen / menu loadout.
   TroopArt.svg(troop, teamColor) → inline <svg> string. Soldiers are little round-headed
   infantry (helmet + rifle), tanks are chunky hull + turret. Each rarity gets its own
   silhouette details so cards read differently at a glance. */
window.TroopArt = (() => {
  const esc = s => String(s);
  const darker = (hex, k) => {
    const n = parseInt(hex.slice(1), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
  };
  function soldier(t, team){
    const c = team || '#3b8bff', d = darker(c, 0.7), acc = t.accent || '#ffd24a';
    const tier = t.tier | 0;                                    // 0 common … 4 legendary
    const helmet = tier >= 3 ? `<path d="M24 26 q26 -20 52 0 l0 6 -52 0z" fill="${d}" stroke="#0a1a38" stroke-width="3"/><rect x="20" y="30" width="60" height="7" rx="3" fill="${acc}" stroke="#0a1a38" stroke-width="2.5"/>`
                             : `<path d="M26 28 q24 -18 48 0 l0 5 -48 0z" fill="${d}" stroke="#0a1a38" stroke-width="3"/>`;
    const visor = tier >= 2 ? `<rect x="34" y="38" width="32" height="8" rx="4" fill="#0a1a38" opacity=".85"/><rect x="36" y="40" width="28" height="3" rx="1.5" fill="#7fd6ff" opacity=".9"/>` : '';
    const armor = tier >= 1 ? `<path d="M36 64 l28 0 l-4 22 l-20 0z" fill="${darker(c, 0.85)}" stroke="#0a1a38" stroke-width="2.5"/>` : '';
    const cape = tier >= 4 ? `<path d="M30 60 q-14 26 -6 46 l14 -6 l-2 -38z" fill="${acc}" stroke="#0a1a38" stroke-width="2.5"/>` : '';
    const gun = tier >= 3 ? `<rect x="58" y="70" width="44" height="9" rx="3" fill="#2c333d" stroke="#0a1a38" stroke-width="2.5"/><rect x="92" y="66" width="12" height="6" rx="2" fill="#2c333d"/><rect x="66" y="78" width="10" height="10" rx="2" fill="#5a4a30" stroke="#0a1a38" stroke-width="2"/>`
                          : `<rect x="58" y="72" width="36" height="8" rx="3" fill="#2c333d" stroke="#0a1a38" stroke-width="2.5"/><rect x="64" y="79" width="8" height="9" rx="2" fill="#5a4a30" stroke="#0a1a38" stroke-width="2"/>`;
    const stars = '★'.repeat(Math.max(1, tier + 1));
    return `<svg viewBox="0 0 120 130" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="120" rx="34" ry="7" fill="#000" opacity=".28"/>
      ${cape}
      <rect x="40" y="92" width="14" height="24" rx="5" fill="${d}" stroke="#0a1a38" stroke-width="3"/>
      <rect x="62" y="92" width="14" height="24" rx="5" fill="${d}" stroke="#0a1a38" stroke-width="3"/>
      <rect x="36" y="112" width="20" height="9" rx="4" fill="#2c333d" stroke="#0a1a38" stroke-width="2.5"/>
      <rect x="60" y="112" width="20" height="9" rx="4" fill="#2c333d" stroke="#0a1a38" stroke-width="2.5"/>
      <rect x="32" y="58" width="52" height="40" rx="12" fill="${c}" stroke="#0a1a38" stroke-width="3"/>
      ${armor}
      ${gun}
      <circle cx="30" cy="70" r="8" fill="${c}" stroke="#0a1a38" stroke-width="3"/>
      <circle cx="50" cy="40" r="22" fill="#ffd7b0" stroke="#0a1a38" stroke-width="3"/>
      ${helmet}${visor}
      <circle cx="43" cy="44" r="2.6" fill="#0a1a38"/><circle cx="57" cy="44" r="2.6" fill="#0a1a38"/>
      <path d="M44 52 q6 4 12 0" stroke="#0a1a38" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <text x="60" y="14" text-anchor="middle" font-size="11" fill="${acc}" font-family="Fredoka,sans-serif" font-weight="700">${stars}</text>
    </svg>`;
  }
  function tank(t, team){
    const c = team || '#3b8bff', d = darker(c, 0.72), acc = t.accent || '#ffd24a';
    const tier = t.tier | 0;
    const twin = tier >= 3;
    const barrel = twin
      ? `<rect x="70" y="52" width="46" height="7" rx="3" fill="#2c333d" stroke="#0a1a38" stroke-width="2.5"/><rect x="70" y="62" width="46" height="7" rx="3" fill="#2c333d" stroke="#0a1a38" stroke-width="2.5"/>`
      : `<rect x="70" y="56" width="${40 + tier * 3}" height="9" rx="3" fill="#2c333d" stroke="#0a1a38" stroke-width="2.5"/>`;
    const spikes = tier >= 4 ? `<path d="M22 72 l-10 -10 l4 14z M30 66 l-8 -14 l2 16z" fill="${acc}" stroke="#0a1a38" stroke-width="2"/>` : '';
    const plates = tier >= 1 ? `<rect x="26" y="78" width="70" height="8" rx="3" fill="${darker(c, 0.85)}" stroke="#0a1a38" stroke-width="2"/>` : '';
    const antenna = tier >= 2 ? `<path d="M48 44 l-6 -22" stroke="#0a1a38" stroke-width="2.5"/><circle cx="42" cy="21" r="3" fill="${acc}" stroke="#0a1a38" stroke-width="2"/>` : '';
    const stars = '★'.repeat(Math.max(1, tier + 1));
    return `<svg viewBox="0 0 120 130" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="118" rx="46" ry="8" fill="#000" opacity=".28"/>
      ${spikes}
      <rect x="14" y="86" width="94" height="26" rx="13" fill="#2c333d" stroke="#0a1a38" stroke-width="3"/>
      <circle cx="30" cy="99" r="8" fill="#454e5c" stroke="#0a1a38" stroke-width="2.5"/>
      <circle cx="60" cy="99" r="8" fill="#454e5c" stroke="#0a1a38" stroke-width="2.5"/>
      <circle cx="90" cy="99" r="8" fill="#454e5c" stroke="#0a1a38" stroke-width="2.5"/>
      <path d="M18 88 l84 0 l-8 -18 l-68 0z" fill="${c}" stroke="#0a1a38" stroke-width="3"/>
      ${plates}
      <rect x="36" y="46" width="44" height="28" rx="10" fill="${d}" stroke="#0a1a38" stroke-width="3"/>
      ${barrel}
      <rect x="50" y="40" width="16" height="10" rx="4" fill="${c}" stroke="#0a1a38" stroke-width="2.5"/>
      ${antenna}
      <text x="60" y="14" text-anchor="middle" font-size="11" fill="${acc}" font-family="Fredoka,sans-serif" font-weight="700">${stars}</text>
    </svg>`;
  }
  return {
    svg(t, team){ return t.kind === 'tank' ? tank(t, team) : soldier(t, team); },
  };
})();
