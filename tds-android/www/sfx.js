/* Sfx — self-contained procedural sound effects (WebAudio, no audio files).
   Every sound is synthesized: oscillator sweeps + filtered noise, short and quiet.
   - Unlocks on the first user gesture (browser autoplay policy).
   - Sfx.play(name) is throttled per-sound so rapid fire doesn't stack into noise.
   - Sfx.setEnabled(bool) / Sfx.enabled — wired to Meta.sound by game.js. */
window.Sfx = (() => {
  let ctx = null, master = null, enabled = true;
  const last = {};

  function ensure(){
    if (window.__sim) return null;                          // headless calibration: no audio
    if (!ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.32; master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  ['pointerdown', 'touchstart', 'keydown'].forEach(ev =>
    window.addEventListener(ev, () => { if (enabled) ensure(); }, { passive: true }));

  // one oscillator note: type, freq from→to, duration, volume (0..1), optional start offset
  function tone(type, f0, f1, dur, vol, at){
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime + (at || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(Math.max(20, f0), t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  // filtered white-noise burst: duration, volume, lowpass from→to
  function noise(dur, vol, lp0, lp1, at){
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime + (at || 0);
    const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(lp0, t0); f.frequency.exponentialRampToValueAtTime(Math.max(60, lp1), t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }
  // springy cartoon "boing": pitch glides f0→f1 while a vibrato LFO wobbles it (depth Hz @ rate Hz)
  function boing(f0, f1, dur, vol, depth, rate, at){
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime + (at || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(Math.max(20, f0), t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    const lfo = c.createOscillator(), lg = c.createGain();       // wobble
    lfo.type = 'sine'; lfo.frequency.value = rate; lg.gain.value = depth;
    lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); lfo.start(t0); o.stop(t0 + dur + 0.02); lfo.stop(t0 + dur + 0.02);
  }

  // sound bank — name: [minimum ms between plays, synth recipe]. All tuned bouncy/cartoony.
  const BANK = {
    // toy-gun "pew!" — bright square zap sliding down + a tiny blip transient
    shoot:  [70,  () => { tone('square', 1500, 340, 0.06, 0.10); tone('triangle', 720, 200, 0.05, 0.06, 0.004); }],
    // cartoon cannon "ka-BOOM" — quick descending whistle into a round boom + soft pop
    tank:   [200, () => { tone('square', 900, 120, 0.09, 0.10); tone('triangle', 120, 42, 0.34, 0.30); noise(0.09, 0.13, 1400, 200, 0.02); }],
    // "bonk" — short springy blip where the shot lands
    hit:    [60,  () => { tone('square', 640, 240, 0.045, 0.06); tone('triangle', 300, 170, 0.05, 0.045, 0.004); }],
    // enemy poof — comedic slide-whistle down + a little pop
    die:    [90,  () => { boing(700, 150, 0.16, 0.11, 28, 22); tone('sine', 220, 90, 0.06, 0.055, 0.13); }],
    // sparkle coin — bright ascending bell triad
    coin:   [120, () => { [988, 1319, 1760].forEach((f, i) => tone('triangle', f, f, 0.08, 0.12, i * 0.05)); }],
    // spawn "boing!" — springy rising pop
    deploy: [150, () => { boing(230, 560, 0.15, 0.14, 42, 17); }],
    // airstrike — falling whistle, then a big cartoon boom
    strike: [400, () => { tone('square', 1700, 200, 0.4, 0.09); tone('triangle', 110, 36, 0.5, 0.24, 0.34); noise(0.35, 0.20, 2200, 140, 0.34); }],
    // convoy "oof" — low wobbly womp
    hurt:   [180, () => { boing(270, 120, 0.13, 0.14, 24, 19); noise(0.05, 0.05, 900, 240); }],
    // wagon crunch — comedic clang + low thud
    wagon:  [500, () => { tone('square', 320, 90, 0.22, 0.11); noise(0.24, 0.17, 2000, 200); tone('triangle', 150, 44, 0.35, 0.13, 0.02); }],
    // villain "bwaaah" — menacing low brass with a slow wobble
    boss:   [900, () => { boing(70, 165, 0.6, 0.22, 11, 7); tone('sawtooth', 104, 150, 0.5, 0.10, 0.05); }],
    // fort crumble — tumbling womp + rubble
    fort:   [900, () => { tone('square', 400, 80, 0.3, 0.11); noise(0.5, 0.20, 1600, 120); tone('triangle', 90, 32, 0.5, 0.15, 0.03); }],
    // "ta-daa!" fanfare — bright major arpeggio topped with a high sparkle
    win:    [900, () => { [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.15, 0.18, i * 0.1)); tone('sine', 1568, 1568, 0.26, 0.11, 0.42); }],
    // sad trombone — descending brassy "wah-wah-waaah"
    lose:   [900, () => { [392, 349, 294].forEach((f, i) => tone('sawtooth', f, f * 0.94, 0.3, 0.16, i * 0.22)); }],
    // treasure sparkle — quick ascending shimmer
    chest:  [300, () => { [784, 988, 1175, 1568, 1976].forEach((f, i) => tone('triangle', f, f, 0.08, 0.10, i * 0.05)); }],
    // cute UI "bloop" — little rising triangle blip
    click:  [70,  () => tone('triangle', 420, 640, 0.05, 0.06)],
  };

  function play(name){
    if (!enabled || window.__sim) return;
    const def = BANK[name]; if (!def) return;
    const now = Date.now();
    if (last[name] && now - last[name] < def[0]) return;
    last[name] = now;
    try { def[1](); } catch (e) {}
  }
  function setEnabled(v){ enabled = !!v; if (enabled) ensure(); }

  // subtle UI tick on every button press (capture phase so dynamic buttons count too)
  document.addEventListener('pointerdown', e => { if (e.target && e.target.closest && e.target.closest('button')) play('click'); }, true);

  return { play, setEnabled, get enabled(){ return enabled; } };
})();
