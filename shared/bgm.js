/* BGM-START｜配樂 v3（C-87，Dari 10/13 09:39：主動加強畫面、配樂、動畫）
   每個場景一首不同的曲子：捕魚三場、飛行地圖與四關、去旅行五個房間、蓋章散步、合照館。
   v3：加空間殘響（比較不像電子琴）、每首多一段 B 段（A→B 輪流，不會一直重複同 8 小節）、
       強弱拍力度、海浪／雨聲／蟲鳴環境音，以及共用音效 BGM.sfx（蓋章、叮咚、快門、啵）。
   有音樂檔就播檔案：assets/bgm/<場景>.mp3（例如 assets/bgm/fly_2.mp3）；沒有檔案就用程式即時合成。
   這份是原始檔（shared/bgm.js），各頁面內嵌的是同一份內容。 */
const BGM = (() => {
  const BASE = 'assets/bgm/';
  const ALIAS = { fish: 'fish_noon', fly: 'fly_1', travel: 'travel_living' };
  const SC = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], penta: [0, 2, 4, 7, 9], mixo: [0, 2, 4, 5, 7, 9, 10] };
  /* key：主音（MIDI）；prog：每小節和弦的級數（0＝I）；meter：一小節幾個八分音符；lead／bass／arp／pad：樂器；drum：每小節的鼓點（x＝打）；g：音量校正（離線量過，讓每首差不多大聲） */
  const TR = {
    fish_noon:     { key: 60, scale: 'major', bpm: 108, prog: [0, 4, 5, 3, 0, 4, 3, 4], lead: 'pluck', bass: 'oompah', bw: 'triangle', drum: { k: 'x...x...', s: '....x...', h: '.x.x.x.x' }, amb: 'sea', dens: 0.75, seed: 11, g: 1.21 },
    fish_dusk:     { key: 65, scale: 'major', bpm: 86, prog: [0, 3, 5, 4, 0, 3, 4, 0], lead: 'flute', bass: 'long', bw: 'sine', pad: 1, drum: { h: '..x...x.' }, amb: 'sea', dens: 0.55, seed: 23, g: 1.3 },
    fish_night:    { key: 62, scale: 'dorian', bpm: 72, prog: [0, 0, 3, 3, 0, 0, 6, 4], lead: 'bell', bass: 'long', bw: 'sine', pad: 1, arp: 8, amb: 'night', dens: 0.42, seed: 37, g: 1.35 },
    fly_map:       { key: 55, scale: 'major', bpm: 112, prog: [0, 3, 4, 0, 5, 3, 4, 4], lead: 'chip', bass: 'root', bw: 'triangle', drum: { k: 'x...x...', s: '..x...xx' }, dens: 0.8, seed: 41, g: 1.28 },
    fly_1:         { key: 60, scale: 'major', bpm: 136, prog: [0, 5, 3, 4, 0, 5, 3, 4], lead: 'chip', bass: 'oct', bw: 'triangle', arp: 16, drum: { k: 'x..x..x.', s: '....x...', h: 'xxxxxxxx' }, dens: 0.85, seed: 53, g: 0.98 },
    fly_2:         { key: 62, scale: 'major', mscale: 'penta', bpm: 120, prog: [0, 0, 3, 4, 0, 0, 4, 0], lead: 'pluck', bass: 'oompah', bw: 'triangle', drum: { k: 'x...x...', w: 'x.x.xx.x' }, amb: 'rain', dens: 0.8, seed: 67, g: 1.11 },
    fly_3:         { key: 65, scale: 'major', bpm: 124, swing: 0.18, prog: [0, 3, 0, 4, 0, 3, 4, 0], lead: 'reed', bass: 'walk', bw: 'triangle', drum: { k: 'x...x...', s: '..x...x.', h: '.x.x.x.x' }, amb: 'sea', dens: 0.8, seed: 79, g: 1.24 },
    fly_4:         { key: 64, scale: 'minor', bpm: 144, prog: [0, 5, 2, 6, 0, 5, 6, 4], lead: 'chip', bass: 'root', bw: 'sawtooth', drum: { k: 'x.x.x.x.', s: '....x..x', h: 'xxxxxxxx' }, dens: 0.85, seed: 97, g: 0.89 },
    travel_living: { key: 60, scale: 'major', bpm: 84, prog: [0, 3, 4, 0, 5, 3, 4, 0], lead: 'pluck', bass: 'long', bw: 'sine', pad: 1, dens: 0.6, seed: 101, g: 1.6 },
    travel_bed:    { key: 65, scale: 'major', bpm: 66, meter: 6, prog: [0, 3, 0, 4, 0, 3, 4, 0], lead: 'bell', bass: 'long', bw: 'sine', pad: 1, dens: 0.5, seed: 113, g: 1.35 },
    travel_kitchen:{ key: 67, scale: 'major', bpm: 108, swing: 0.12, prog: [0, 4, 0, 4, 3, 0, 4, 0], lead: 'pluck', bass: 'oompah', bw: 'triangle', drum: { k: 'x...x...', w: '..x...x.' }, dens: 0.7, seed: 127, g: 1.17 },
    travel_garden: { key: 62, scale: 'major', bpm: 96, prog: [0, 3, 0, 4, 5, 3, 4, 0], lead: 'flute', bass: 'long', bw: 'sine', arp: 8, birds: 1, drum: { h: '..x...x.' }, dens: 0.6, seed: 139, g: 1.28 },
    travel_school: { key: 64, scale: 'major', bpm: 116, prog: [0, 3, 4, 0, 0, 3, 4, 0], lead: 'bell', bass: 'root', bw: 'triangle', drum: { k: 'x...x...', c: '..x...x.' }, dens: 0.75, seed: 151, g: 0.91 },
    stamp_walk:    { key: 62, scale: 'major', bpm: 100, prog: [0, 4, 3, 0, 5, 3, 4, 0], lead: 'flute', bass: 'walk', bw: 'triangle', drum: { k: 'x...x...', h: '..x...x.' }, birds: 1, amb: 'sea', dens: 0.65, seed: 163, g: 1.2 },
    photo_room:    { key: 67, scale: 'major', bpm: 92, prog: [0, 5, 3, 4, 0, 5, 3, 4], lead: 'pluck', bass: 'long', bw: 'sine', pad: 1, arp: 8, drum: { c: '....x...' }, dens: 0.7, seed: 179, g: 1.5 }
  };
  const FILE = {};      // 場景 → false（確定沒有音樂檔）
  let ac = null, out = null, bus = null, timer = null, cur = null, step = 0, next = 0, audio = null, song = null, noise = null, amb = [];
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function rng(s) { return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; }
  /* ====== 作曲：同一個種子每次寫出一樣的曲子。前四小節是 A 句，後四小節重複 A 句、最後一小節回到主音 ====== */
  function compose(T0, part) {
    const T = part ? Object.assign({}, T0, { seed: T0.seed + 1000, prog: T0.progB || [3, 0, 4, 5, 3, 0, 4, 0].slice(0, T0.prog.length) }) : T0;      // v3：B 段換和弦進行與旋律
    const r = rng(T.seed), sc = SC[T.scale], ms = SC[T.mscale || T.scale], bpb = T.meter || 8, bars = T.prog.length;
    const deg = (d, base) => base + sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
    const pool = []; for (let o = -1; o < 3; o++) for (const s of ms) { const m = T.key + s + 12 * o; if (m >= T.key - 3 && m <= T.key + 17) pool.push(m); }
    pool.sort((a, b) => a - b);
    const chordPc = (b) => [0, 2, 4].map((k) => deg(T.prog[b] + k, T.key) % 12);
    let at = pool.indexOf(pool.reduce((p, m) => (Math.abs(m - (T.key + 7)) < Math.abs(p - (T.key + 7)) ? m : p), pool[0]));
    const near = (pcs) => { let best = at, bd = 99; pool.forEach((m, i) => { if (pcs.includes(m % 12) && Math.abs(i - at) < bd) { bd = Math.abs(i - at); best = i; } }); return best; };
    const barMel = (b, end) => {
      const a = [];
      for (let s = 0; s < bpb; s++) {
        const strong = s % (bpb === 6 ? 3 : 4) === 0;
        if (end && s >= bpb - 2) { a.push(s === bpb - 2 ? null : null); continue; }
        if (end && s === bpb - 4) { at = near([T.key % 12]); a.push(pool[at]); continue; }
        if (strong || r() < T.dens * 0.8) {
          if (strong) at = near(chordPc(b));
          else { const mv = [-2, -1, -1, 1, 1, 2][Math.floor(r() * 6)]; at = Math.max(0, Math.min(pool.length - 1, at + mv)); }
          a.push(pool[at]);
        } else a.push(null);
      }
      return a;
    };
    const A = []; for (let b = 0; b < 4; b++) A.push(barMel(b, false));
    const mel = [];
    for (let b = 0; b < bars; b++) {
      if (b < 4) mel.push(A[b]);
      else if (b === bars - 1) mel.push(barMel(b, true));
      else if (b === 5) { const v = A[1].slice(); for (let s = 1; s < bpb; s += 2) if (v[s] && r() < 0.5) v[s] = null; mel.push(v); }
      else mel.push(A[b - 4]);
    }
    const flat = [].concat(...mel), dur = flat.map((m, i) => { if (!m) return 0; let d = 1; while (d < 4 && !flat[(i + d) % flat.length]) d++; return d; });
    const roots = T.prog.map((d) => deg(d, T.key - 24)), triads = T.prog.map((d) => [0, 2, 4].map((k) => deg(d + k, T.key - 12)));
    return { flat, dur, roots, triads, bpb, bars, len: bpb * bars };
  }
  /* ====== 樂器 ====== */
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + d); }
  function osc(c, type, f, t, d, dest, v, a, detune) { const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f; if (detune) o.detune.value = detune; env(g, t, a || 0.01, v, d); o.connect(g); g.connect(dest); o.start(t); o.stop(t + d + 0.05); return o; }
  function voice(c, dest, kind, m, t, d, v) {
    const f = hz(m);
    if (kind === 'chip') { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; lp.connect(dest); osc(c, 'square', f, t, d * 0.9, lp, v * 0.55, 0.005); }
    else if (kind === 'pluck') { osc(c, 'triangle', f, t, Math.min(d, 0.45) + 0.15, dest, v, 0.004); osc(c, 'sine', f * 2, t, 0.18, dest, v * 0.25, 0.003); }
    else if (kind === 'bell') { osc(c, 'sine', f, t, 1.1, dest, v * 0.9, 0.003); osc(c, 'sine', f * 2, t, 0.6, dest, v * 0.3, 0.003); osc(c, 'sine', f * 3.01, t, 0.25, dest, v * 0.12, 0.002); }
    else if (kind === 'flute') { const o = osc(c, 'sine', f, t, d + 0.1, dest, v, 0.06); osc(c, 'triangle', f, t, d + 0.1, dest, v * 0.18, 0.06); const lf = c.createOscillator(), lg = c.createGain(); lf.frequency.value = 5; lg.gain.value = f * 0.006; lf.connect(lg); lg.connect(o.frequency); lf.start(t + 0.12); lf.stop(t + d + 0.15); }
    else if (kind === 'reed') { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700; lp.connect(dest); osc(c, 'sawtooth', f, t, d * 0.95, lp, v * 0.5, 0.02); osc(c, 'sawtooth', f, t, d * 0.95, lp, v * 0.3, 0.02, 9); }
    else osc(c, kind, f, t, d, dest, v, 0.01);
  }
  function noiseBuf(c) { const b = c.createBuffer(1, c.sampleRate * 0.25, c.sampleRate), x = b.getChannelData(0); for (let i = 0; i < x.length; i++) x[i] = Math.random() * 2 - 1; return b; }
  function hit(c, dest, kind, t) {
    if (kind === 'k') { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); env(g, t, 0.003, 0.55, 0.18); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.2); return; }
    if (kind === 'w') { osc(c, 'sine', 820, t, 0.07, dest, 0.22, 0.001); osc(c, 'square', 1640, t, 0.02, dest, 0.04, 0.001); return; }
    const nb = c === ac ? (noise = noise || noiseBuf(c)) : noiseBuf(c), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = nb;
    if (kind === 'h') { f.type = 'highpass'; f.frequency.value = 7000; env(g, t, 0.002, 0.09, 0.045); }
    else if (kind === 's') { f.type = 'bandpass'; f.frequency.value = 1800; env(g, t, 0.002, 0.22, 0.14); }
    else { f.type = 'bandpass'; f.frequency.value = 1300; env(g, t, 0.002, 0.25, 0.09); env(g, t + 0.012, 0.002, 0.2, 0.1); }      // c：拍手
    s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + 0.2);
  }
  function cricket(c, dest, t) { for (let i = 0; i < 4; i++) { const u = t + i * 0.07; osc(c, 'sine', 4400, u, 0.045, dest, 0.018, 0.004); } }
  function chirp(c, dest, t) { for (let i = 0; i < 3; i++) { const o = c.createOscillator(), g = c.createGain(), u = t + i * 0.11; o.type = 'sine'; o.frequency.setValueAtTime(2600, u); o.frequency.exponentialRampToValueAtTime(3800, u + 0.06); env(g, u, 0.005, 0.05, 0.08); o.connect(g); g.connect(dest); o.start(u); o.stop(u + 0.1); } }
  /* 排一個八分音符格（即時播放和離線量音量共用） */
  function schedule(c, dest, T, S, i, t, e) {
    const b = Math.floor(i / S.bpb) % S.bars, s = i % S.bpb, k = i % S.len, beat = S.bpb === 6 ? 3 : 2;
    const acc = s % (S.bpb === 6 ? 3 : 4) === 0 ? 1.08 : 0.8 + ((k * 7919) % 13) / 13 * 0.16;      // v3：強拍重、弱拍輕一點，比較像人在彈
    const m = S.flat[k]; if (m) voice(c, dest, T.lead, m, t, S.dur[k] * e * 0.95, 0.16 * T.g * acc);
    const root = S.roots[b];
    if (T.bass === 'long' && s === 0) osc(c, T.bw, hz(root), t, S.bpb * e * 0.95, dest, 0.15 * T.g, 0.04);
    if (T.bass === 'root' && s % beat === 0) osc(c, T.bw, hz(root), t, e * beat * 0.8, dest, 0.13 * T.g, 0.006);
    if (T.bass === 'oct' && s % 1 === 0) osc(c, T.bw, hz(root + (s % 2 ? 12 : 0)), t, e * 0.8, dest, 0.12 * T.g, 0.005);
    if (T.bass === 'oompah' && s % beat === 0) osc(c, T.bw, hz(root + ((s / beat) % 2 ? 7 : 0)), t, e * 1.4, dest, 0.14 * T.g, 0.005);
    if (T.bass === 'walk' && s % beat === 0) { const w = [0, 4, 7, 9][(s / beat) % 4]; osc(c, T.bw, hz(root + w), t, e * beat * 0.85, dest, 0.14 * T.g, 0.006); }
    if (T.pad && s === 0) S.triads[b].forEach((n) => osc(c, 'triangle', hz(n), t, S.bpb * e, dest, 0.035 * T.g, 0.25));
    if (T.arp) { const tri = S.triads[b], n = T.arp === 16 ? 2 : 1; for (let j = 0; j < n; j++) osc(c, 'triangle', hz(tri[(s * n + j) % 3] + 12), t + j * e / n, e / n * 0.9, dest, 0.05 * T.g, 0.004); }
    if (T.drum) for (const key in T.drum) { const p = T.drum[key]; if (p[s % p.length] === 'x') hit(c, dest, key, t); }
    if (T.birds && k === 0) chirp(c, dest, t + e * 3);
    if (T.amb === 'night' && s === 0 && b % 2 === 0) cricket(c, dest, t + e);
  }
  const SONG = {};
  function song_(name, part) { const key = name + (part ? '_B' : ''); return SONG[key] || (SONG[key] = compose(TR[name], part)); }
  function tick() {
    const T = TR[cur]; if (!T || !ac) return; const A = song_(cur, 0), e = 60 / T.bpm / 2;
    while (next < ac.currentTime + 0.2) { const S = Math.floor(step / A.len) % 2 ? song_(cur, 1) : A, sw = step % 2 ? (T.swing || 0) * e : 0; schedule(ac, out, T, S, step, next + sw, e); next += e; step++; }
  }
  /* v3：空間殘響（程式產生的房間回音，不用外部檔案） */
  function impulse(c, sec, decay) { const n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const x = b.getChannelData(ch); for (let i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); } return b; }
  /* v3：環境音（海浪＝低頻雜訊慢慢起伏；雨＝高一點的沙沙聲；夜＝海浪＋蟲鳴） */
  function ambience(kind) {
    if (!kind || !ac) return;
    const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), x = nb.getChannelData(0); let lp = 0;
    for (let i = 0; i < x.length; i++) { const w = Math.random() * 2 - 1; lp = kind === 'rain' ? w : lp * 0.97 + w * 0.03; x[i] = kind === 'rain' ? w : lp * 6; }
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); src.buffer = nb; src.loop = true;
    f.type = kind === 'rain' ? 'bandpass' : 'lowpass'; f.frequency.value = kind === 'rain' ? 2600 : 700; f.Q.value = kind === 'rain' ? 0.4 : 0.7;
    g.gain.value = kind === 'rain' ? 0.035 : 0.05;
    src.connect(f); f.connect(g); g.connect(bus); src.start();
    const nodes = [src];
    if (kind !== 'rain') { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 0.11; lg.gain.value = 0.04; l.connect(lg); lg.connect(g.gain); l.start(); nodes.push(l); }
    amb = nodes;
  }
  function ensure() {
    try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); } catch (x) { return false; }
    if (ac.state === 'suspended') ac.resume();
    if (!out) {
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2; comp.connect(ac.destination);
      out = ac.createGain(); out.gain.value = 1.05; out.connect(comp);
      try { const rv = ac.createConvolver(), wet = ac.createGain(), hc = ac.createBiquadFilter(); rv.buffer = impulse(ac, 2.2, 3); hc.type = 'lowpass'; hc.frequency.value = 4500; wet.gain.value = 0.3; out.connect(rv); rv.connect(hc); hc.connect(wet); wet.connect(comp); } catch (x) {}
      bus = ac.createGain(); bus.gain.value = 1; bus.connect(comp);      // 環境音與音效不進殘響
    }
    return true;
  }
  function synth(name) { if (!TR[name] || !ensure()) return; step = 0; next = ac.currentTime + 0.08; timer = setInterval(tick, 30); tick(); ambience(TR[name].amb); }
  function play(name) {
    name = ALIAS[name] || name;
    ensure();      // 一定要在點擊當下建立／喚醒，手機才會出聲
    if (cur === name) { if (audio && audio.paused) audio.play().catch(() => {}); if (timer || audio) return; }
    stop(); cur = name;
    if (FILE[name] !== false && typeof Audio !== 'undefined') {
      const a = new Audio(); let failed = false; a.loop = true; a.volume = 0.9; a.preload = 'auto';
      const fail = () => { if (failed) return; failed = true; FILE[name] = false; if (audio === a) { audio = null; if (cur === name) synth(name); } };
      a.onerror = fail; a.src = BASE + name + '.mp3'; audio = a;
      const p = a.play(); if (p && p.catch) p.catch((x) => { if (!x || x.name !== 'NotAllowedError') fail(); });
      return;
    }
    synth(name);
  }
  function stop() { if (timer) clearInterval(timer); timer = null; if (audio) { audio.pause(); audio = null; } amb.forEach((n) => { try { n.stop(); } catch (x) {} }); amb = []; cur = null; }
  /* v3：共用音效。stamp＝蓋章「咚」加紙聲；chime＝集滿叮咚；shutter＝快門；pop＝放貼紙；swish＝換房間 */
  function sfx(kind) {
    if (!ensure()) return; const c = ac, t = c.currentTime + 0.01, d = bus;
    if (kind === 'stamp') { hit(c, d, 'k', t); const nb = noise = noise || noiseBuf(c), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = nb; f.type = 'bandpass'; f.frequency.value = 900; env(g, t + 0.01, 0.003, 0.35, 0.12); s.connect(f); f.connect(g); g.connect(d); s.start(t); s.stop(t + 0.2); return; }
    if (kind === 'chime') { [72, 76, 79, 84, 88].forEach((m, i) => voice(c, out, 'bell', m, t + i * 0.11, 0.6, 0.22)); return; }
    if (kind === 'shutter') { hit(c, d, 'h', t); hit(c, d, 's', t + 0.05); return; }
    if (kind === 'pop') { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(1300, t + 0.08); env(g, t, 0.003, 0.18, 0.12); o.connect(g); g.connect(d); o.start(t); o.stop(t + 0.15); return; }
    if (kind === 'swish') { const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = noise = noise || noiseBuf(c); s.loop = true; f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(3000, t + 0.25); env(g, t, 0.06, 0.12, 0.3); s.connect(f); f.connect(g); g.connect(d); s.start(t); s.stop(t + 0.35); }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (ac && ac.state === 'running') ac.suspend(); if (audio) audio.pause(); }
    else { if (ac && timer) ac.resume(); if (audio) audio.play().catch(() => {}); }
  });
  /* 測試用：離線算出一首合成曲的音量（RMS） */
  function measure(name, sec) {
    const T = TR[name], S = song_(name), sr = 22050, c = new OfflineAudioContext(1, sr * sec, sr), e = 60 / T.bpm / 2;
    const g = c.createGain(); g.gain.value = 1; g.connect(c.destination);
    for (let i = 0, t = 0.05; t < sec; i++, t += e) schedule(c, g, T, S, i, t + (i % 2 ? (T.swing || 0) * e : 0), e);
    return c.startRendering().then((b) => { const x = b.getChannelData(0); let s = 0; for (let i = 0; i < x.length; i++) s += x[i] * x[i]; return Math.sqrt(s / x.length); });
  }
  return { play, stop, sfx, measure, tracks: Object.keys(TR), TR, get on() { return !!(timer || audio); }, get cur() { return cur; } };
})();
/* 音樂與暫停圖示（C-81）：開＝音符、關＝音符加圓圈斜線；暫停＝紅色正方形，暫停中＝綠色播放箭頭 */
const SND_ICON = (() => {
  const note = '<path d="M9.5 17.2a2.9 2.9 0 1 1-1.9-2.7V5.4l10.3-2.3v11.3a2.9 2.9 0 1 1-1.9-2.7V7l-6.5 1.5z" fill="currentColor"/>';
  return {
    on: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">' + note + '</svg>',
    off: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><g transform="translate(3.6 3.6) scale(.7)" opacity=".75">' + note + '</g><circle cx="12" cy="12" r="10" fill="none" stroke="#C9473A" stroke-width="2.2"/><path d="M5 5l14 14" stroke="#C9473A" stroke-width="2.2" stroke-linecap="round"/></svg>',
    stop: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2.5" fill="#D9342B"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M8 4.8l11.5 7.2L8 19.2z" fill="#2FA84F" stroke="#2FA84F" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    get saved() { try { return localStorage.getItem('kiteBgm') !== '0'; } catch (e) { return true; } },
    save(on) { try { localStorage.setItem('kiteBgm', on ? '1' : '0'); } catch (e) {} }
  };
})();
/* BGM-END */
