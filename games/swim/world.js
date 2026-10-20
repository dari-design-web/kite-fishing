/* 鯨鯊快游 v3 海底世界（D138，Dari 10/21 01:51：場景要好看、珊瑚礁小丑魚、走一段就換一種場景；障礙要有礁石、巨大垃圾、魚叉）
   全部程式算出來（three.js），不用模型檔。
   THEMES：四種場景輪流（珊瑚礁→海草森林→沉船港區→深海發光），每種有水色、沙色、裝飾、背景生物、大型生物。
   裝飾 deco(theme)、障礙 OBST.xxx()、背景魚群、彎道（bendMaterial）都在這裡；遊戲邏輯在 index.html。 */
import { toonRamp } from '../../shared/kite3d.js';
export function makeWorld(THREE) {
  const ramp = toonRamp(THREE), rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[Math.floor(Math.random() * a.length)];
  const T = (c, o) => new THREE.MeshToonMaterial(Object.assign({ color: c, gradientMap: ramp }, o || {}));
  const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const INK = '#10293D', olM = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  const ol = (m, k) => { const o = new THREE.Mesh(m.geometry, olM); o.scale.setScalar(k || 1.06); m.add(o); return m; };

  /* ---- 彎道：所有材質在畫面空間依距離平方往左右／上下偏，看起來像整條海溝在轉彎（像地鐵跑酷） ---- */
  const bend = { value: new THREE.Vector2(0, 0) };
  function bendMaterial(m) {
    if (!m || m.userData.bent) return; m.userData.bent = true; const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => { if (prev) prev.call(m, sh, r); sh.uniforms.uBend = bend; sh.vertexShader = 'uniform vec2 uBend;\n' + sh.vertexShader.replace('#include <project_vertex>', THREE.ShaderChunk.project_vertex).replace('gl_Position = projectionMatrix * mvPosition;', 'mvPosition.xy += uBend * mvPosition.z * mvPosition.z;\n\tgl_Position = projectionMatrix * mvPosition;'); };
    m.customProgramCacheKey = () => 'bend' + (m.type || '') + (prev ? '+' : '');
    m.needsUpdate = true;
  }
  const bendAll = (o) => o.traverse((x) => { if (x.material) (Array.isArray(x.material) ? x.material : [x.material]).forEach(bendMaterial); });

  /* ---- 共用貼圖 ---- */
  const dot = tex(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
  const sand = tex(256, 256, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.08)'; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); } c.strokeStyle = 'rgba(0,0,0,.07)'; c.lineWidth = 4; for (let y = 10; y < h; y += 26) { c.beginPath(); for (let x = 0; x <= w; x += 8) c.lineTo(x, y + Math.sin(x * 0.05 + y) * 6); c.stroke(); } });
  sand.wrapS = sand.wrapT = THREE.RepeatWrapping; sand.repeat.set(7, 30);
  const caustic = tex(256, 256, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineCap = 'round'; const pts = []; for (let i = 0; i < 26; i++) pts.push([Math.random() * w, Math.random() * h]);
    for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) { let d1 = 1e9, d2 = 1e9; for (const [px, py] of pts) for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { const d = (x - px - ox) ** 2 + (y - py - oy) ** 2; if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; } const e = Math.sqrt(d2) - Math.sqrt(d1); if (e < 3) { c.fillStyle = 'rgba(255,255,255,' + (0.6 - e * 0.18) + ')'; c.fillRect(x, y, 4, 4); } } });
  caustic.wrapS = caustic.wrapT = THREE.RepeatWrapping; caustic.repeat.set(5, 22);

  /* ---- 場景 ---- */
  const THEMES = [
    { id: 'reef', name: '🐠 珊瑚礁', sea: '#2AA5C4', fog: [24, 82], sand: '#E9D7A8', light: 1.9, life: ['clown', 'tang', 'school'], big: 'manta', obst: { trash: 1, pillar: 2, arch: 1.5, net: 1.5, harpoon: 1, jelly: 0.6, tire: 0.6 } },
    { id: 'kelp', name: '🌿 海草森林', sea: '#2E8F86', fog: [20, 74], sand: '#CDBE8C', light: 1.7, life: ['school', 'tang'], big: 'turtle', obst: { trash: 1, pillar: 1, arch: 1, net: 1.5, harpoon: 1.2, jelly: 0.6, tire: 0.8, kelpwall: 1.5 } },
    { id: 'wreck', name: '⚓ 沉船港區', sea: '#1E6884', fog: [18, 70], sand: '#B9AD8C', light: 1.5, life: ['school'], big: 'whale', obst: { trash: 2, tire: 1.6, drum: 1.6, chain: 1.2, net: 1.5, harpoon: 1.4, container: 1.4 } },
    { id: 'deep', name: '🌌 深海發光', sea: '#0D3654', fog: [14, 62], sand: '#5E6E7A', light: 1.0, life: ['glow'], big: 'whale', obst: { jelly: 2.2, pillar: 1.2, arch: 1.2, net: 1, harpoon: 1.2, trash: 1 } }
  ];

  /* 小丑魚：橘身三條白帶（黑邊），頂點上色 */
  function clownGeo() { const g = new THREE.SphereGeometry(0.22, 18, 12); g.scale(1.6, 1, 0.75); const p = g.attributes.position, col = [];
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) / 0.352; let c = [1, 0.45, 0.1]; for (const b of [-0.55, 0.05, 0.62]) { const d = Math.abs(x - b); if (d < 0.1) c = [1, 1, 1]; else if (d < 0.14) c = [0.08, 0.08, 0.1]; } col.push(...c); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g; }
  const clownG = clownGeo(), clownM = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp }), finO = T('#FF7A1A');
  const tailG = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.22, 0.16); s.lineTo(0.22, -0.16); s.lineTo(0, 0); return new THREE.ShapeGeometry(s); })();
  function fish(kind) { const g = new THREE.Group();
    if (kind === 'clown') { const b = ol(new THREE.Mesh(clownG, clownM), 1.08); g.add(b); const t = new THREE.Mesh(tailG, finO); t.position.x = -0.33; t.rotation.y = Math.PI; t.material.side = THREE.DoubleSide; g.add(t); const e = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: '#111' })); e.position.set(0.24, 0.05, 0.12); g.add(e); const e2 = e.clone(); e2.position.z = -0.12; g.add(e2); }
    else if (kind === 'tang') { const b = ol(new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 10), T('#2D6CE0')), 1.08); b.scale.set(1.3, 1.1, 0.5); g.add(b); const t = new THREE.Mesh(tailG, T('#FFD23A', { side: THREE.DoubleSide })); t.position.x = -0.3; t.rotation.y = Math.PI; g.add(t); }
    else { const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), T('#CFE2EC')); b.scale.set(1.8, 0.8, 0.5); g.add(b); }
    g.userData.ph = rnd(0, 6); return g; }

  /* 珊瑚、海葵、海草、岩石…… */
  const coralC = ['#FF7F6E', '#FFB547', '#C774E8', '#FF6FA8', '#5FD3C2', '#FFE066'];
  function branchCoral(col, s) { const g = new THREE.Group(), m = T(col); const grow = (p, dir, len, r, d) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r, len, 7), m); const mid = p.clone().addScaledVector(dir, len / 2); c.position.copy(mid); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); g.add(c); const end = p.clone().addScaledVector(dir, len);
      if (d <= 0) { const tip = new THREE.Mesh(new THREE.SphereGeometry(r * 0.9, 8, 6), m); tip.position.copy(end); g.add(tip); return; } for (let k = 0; k < 2 + (Math.random() < 0.4 ? 1 : 0); k++) { const nd = dir.clone().add(new THREE.Vector3(rnd(-0.7, 0.7), rnd(0, 0.4), rnd(-0.7, 0.7))).normalize(); grow(end, nd, len * 0.75, r * 0.72, d - 1); } };
    grow(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), 0.7 * s, 0.13 * s, 3); return g; }
  const brainTex = tex(128, 128, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = 4; for (let i = 0; i < 40; i++) { c.beginPath(); let x = Math.random() * w, y = Math.random() * h; c.moveTo(x, y); for (let k = 0; k < 8; k++) { x += rnd(-14, 14); y += rnd(-14, 14); c.lineTo(x, y); } c.stroke(); } });
  function brainCoral(col, s) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.8 * s, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), T(col, { map: brainTex })); ol(m, 1.04); const g = new THREE.Group(); m.scale.y = 0.75; g.add(m); return g; }
  const fanTex = tex(128, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = '#fff'; c.lineWidth = 3; for (let a = -1.2; a <= 1.2; a += 0.12) { c.beginPath(); c.moveTo(64, 128); c.lineTo(64 + Math.sin(a) * 120, 128 - Math.cos(a) * 120); c.stroke(); } for (let r = 20; r < 128; r += 12) { c.beginPath(); c.arc(64, 128, r, Math.PI + 0.3, -0.3); c.stroke(); } });
  function fanCoral(col, s) { const m = new THREE.Mesh(new THREE.CircleGeometry(1.2 * s, 20, 0, Math.PI), new THREE.MeshToonMaterial({ color: col, map: fanTex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, gradientMap: ramp })); const g = new THREE.Group(); g.add(m); g.userData.sway = rnd(0, 6); return g; }
  function anemone(withClown) { const g = new THREE.Group(), base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 0.35, 14), T('#8E4FC9')); base.position.y = 0.17; g.add(base); const tm = T('#F7A8D8'), tipM = T('#FFE3F3');
    const sw = []; for (let k = 0; k < 4; k++) { const sg = new THREE.Group(); sg.position.y = 0.33; g.add(sg); sw.push(sg); }
    for (let i = 0; i < 26; i++) { const a = rnd(0, 6.28), r = rnd(0, 0.42), tg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, rnd(0.45, 0.8), 6), tm); tg.geometry.translate(0, tg.geometry.parameters.height / 2, 0); tg.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); tg.rotation.set(rnd(-0.4, 0.4), 0, rnd(-0.4, 0.4)); const tip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), tipM); tip.position.y = tg.geometry.parameters.height; tg.add(tip); sw[i % 4].add(tg); }
    g.userData.anemone = sw; if (withClown) { const cf = []; for (let i = 0; i < 2; i++) { const f = fish('clown'); f.scale.setScalar(1.1); g.add(f); cf.push(f); } g.userData.clowns = cf; } return g; }
  const kelpTex = tex(64, 256, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#3F9B4C'; c.fillRect(28, 0, 8, h); c.fillStyle = '#5DBB5A'; for (let y = 8; y < h; y += 22) { c.beginPath(); c.ellipse(y % 44 ? 18 : 46, y, 16, 8, y % 44 ? -0.5 : 0.5, 0, 7); c.fill(); } });
  function kelp(hgt) { const g = new THREE.Group(); for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, hgt, 1, 8), new THREE.MeshLambertMaterial({ map: kelpTex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide })); m.geometry.translate(0, hgt / 2, 0); m.rotation.y = i * 1.05; g.add(m); } g.userData.sway = rnd(0, 6); g.userData.kelp = true; return g; }
  const rockM = T('#5B7F8C'), rockM2 = T('#7A8F8A');
  function rock(s) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 2), Math.random() < 0.5 ? rockM : rockM2); const p = m.geometry.attributes.position, ph = rnd(0, 6); for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = 1 + 0.12 * Math.sin(x * 2.1 + ph) * Math.cos(z * 1.7 + ph) + 0.06 * Math.sin(y * 3.3); p.setXYZ(i, x * n, y * n * 0.72, z * n); } m.geometry.computeVertexNormals(); ol(m, 1.03); return m; }
  const contC = ['#C0392B', '#2E86C1', '#F39C12', '#27AE60'];
  const contTex = tex(128, 64, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(0,0,0,.18)'; for (let x = 0; x < w; x += 8) c.fillRect(x, 0, 3, h); c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(0, 0, w, 4); c.fillRect(0, h - 4, w, 4); });
  function container(col) { const m = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 1.1), T(col, { map: contTex })); ol(m, 1.03); return m; }
  const jellyM = new THREE.MeshToonMaterial({ color: '#FFB2E6', emissive: '#7A2D6B', gradientMap: ramp, transparent: true, opacity: 0.8 }), jellyGlow = new THREE.MeshToonMaterial({ color: '#8EF3FF', emissive: '#1A7A90', gradientMap: ramp, transparent: true, opacity: 0.8 });
  function jelly(glow) { const g = new THREE.Group(), bell = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), glow ? jellyGlow : jellyM); bell.scale.y = 0.8; g.add(bell); for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28, t = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.01, rnd(0.6, 1.1), 4), glow ? jellyGlow : jellyM); t.position.set(Math.cos(a) * 0.25, -0.35, Math.sin(a) * 0.25); g.add(t); } g.userData.jelly = rnd(0, 6); return g; }

  function deco(th, small, near) {      // 跑道兩側的裝飾，回傳 Group（呼叫端負責放 x、z）；small＝水道之間地上的小東西
    const g = new THREE.Group(), k = Math.random();
    if (small) { const s = rnd(0.25, 0.4); if (th.id === 'reef') g.add(Math.random() < 0.5 ? branchCoral(pick(coralC), s) : brainCoral(pick(coralC), s)); else if (th.id === 'kelp') { const kk = kelp(rnd(0.8, 1.4)); g.add(kk); } else if (th.id === 'wreck') { const r = rock(s * 1.2); g.add(r); } else { const c = branchCoral('#4FE3D1', s); c.traverse((x) => { if (x.material) x.material = T('#4FE3D1', { emissive: '#127C70' }); }); g.add(c); } bendAll(g); return g; }
    if (th.id === 'reef') { if (k < 0.3) { const a = anemone(Math.random() < 0.7); a.scale.setScalar(rnd(1, 1.5)); g.add(a); } else if (k < 0.55) g.add(branchCoral(pick(coralC), rnd(0.9, 1.5))); else if (k < 0.72) g.add(brainCoral(pick(coralC), rnd(0.8, 1.3))); else if (k < 0.88) { const f = fanCoral(pick(coralC), rnd(0.9, 1.5)); f.rotation.y = rnd(-0.6, 0.6); g.add(f); } else { g.add(rock(rnd(0.8, 1.6))); g.add(branchCoral(pick(coralC), 0.7)); }
      for (let i = 0; i < 2; i++) if (Math.random() < 0.5) { const c = branchCoral(pick(coralC), rnd(0.4, 0.7)); c.position.set(rnd(-1, 1), 0, rnd(-1, 1)); g.add(c); } }
    else if (th.id === 'kelp') { if (k < 0.7) { for (let i = 0; i < 3; i++) { const kk = kelp(rnd(4, 8)); kk.position.set(rnd(-1.2, 1.2), 0, rnd(-1.2, 1.2)); g.add(kk); } } else g.add(rock(rnd(1, 2))); }
    else if (th.id === 'wreck') { if (k < 0.35) { const c = container(pick(contC)); c.rotation.set(0, rnd(0, 3), rnd(-0.3, 0.3)); c.position.y = 0.4; g.add(c); } else if (k < 0.55) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.3, 10, 18), T('#2A2A2E')); t.rotation.x = 1.3; t.position.y = 0.2; ol(t, 1.04); g.add(t); } else if (k < 0.75 && !near) { const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 4, 16, 1, true, 0, Math.PI), T('#6B4A35', { side: THREE.DoubleSide })); hull.rotation.set(0, rnd(0, 3), Math.PI / 2 + 0.3); hull.position.y = 0.6; g.add(hull); } else { g.add(rock(rnd(1, 1.8))); } }
    else { if (k < 0.45) { const j = jelly(true); j.position.y = rnd(2, 5); g.add(j); } else if (k < 0.75) { g.add(rock(rnd(1, 2))); const c = branchCoral('#4FE3D1', 0.8); c.traverse((x) => { if (x.material) x.material = T('#4FE3D1', { emissive: '#127C70' }); }); g.add(c); } else { g.add(rock(rnd(1.2, 2.2))); } }
    bendAll(g); return g;
  }

  /* 大型生物路過：魟魚、海龜、遠方鯨魚影子 */
  function bigCreature(kind) { const g = new THREE.Group();
    if (kind === 'manta') { const m = T('#2C3E50'), b = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 10), m); b.scale.set(1, 0.25, 1.3); g.add(b); const wings = [-1, 1].map((s) => { const sh = new THREE.Shape(); sh.moveTo(0, 0.6); sh.quadraticCurveTo(s * 2.4, 0.2, s * 2.8, -0.4); sh.quadraticCurveTo(s * 1.2, -0.3, 0, -0.9); const w = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshToonMaterial({ color: '#2C3E50', gradientMap: ramp, side: THREE.DoubleSide })); w.rotation.x = -Math.PI / 2; const p = new THREE.Group(); p.add(w); g.add(p); return p; }); const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 2.2, 5), m); tail.rotation.x = Math.PI / 2; tail.position.z = 1.8; g.add(tail); g.userData.flap = wings; g.scale.setScalar(1.6); }
    else if (kind === 'turtle') { const sh = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 10, 0, 6.29, 0, Math.PI / 2), T('#7A8F3C')); sh.scale.y = 0.55; g.add(sh); const body = T('#A7C27A'); const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), body); head.position.set(0, 0.05, -1.05); g.add(head); const fl = [-1, 1].map((s) => { const f = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 6), body); f.scale.set(1, 0.12, 0.35); f.position.set(s * 0.95, 0, -0.4); const p = new THREE.Group(); p.add(f); g.add(p); return p; }); g.userData.flap = fl; g.scale.setScalar(1.4); }
    else { const m = new THREE.MeshBasicMaterial({ color: '#0B2A40', transparent: true, opacity: 0.55, fog: false }), b = new THREE.Mesh(new THREE.SphereGeometry(3, 18, 10), m); b.scale.set(1, 0.7, 4); g.add(b); const t = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1, 3), m); t.rotation.set(Math.PI / 2, 0, 0); t.scale.set(1.8, 1, 0.3); t.position.z = 12.5; g.add(t); g.userData.flap = []; }
    bendAll(g); return g; }

  /* ---- 障礙：每種都標「擋哪幾條水道」lanes 與「擋哪個高度」y0～y1（鯨鯊在中 1.9、高 3.6、低 0.5） ---- */
  const Lx = [-2.4, 0, 2.4], X0 = -3.65, X1 = 3.65;
  const netTex = tex(128, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = '#FFD84D'; c.lineWidth = 7; for (let k = -w; k <= w * 2; k += 32) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + h, h); c.stroke(); c.beginPath(); c.moveTo(k + h, 0); c.lineTo(k, h); c.stroke(); } c.fillStyle = '#FFE98A'; for (let x = 0; x <= w; x += 32) for (let y = 0; y <= h; y += 32) { c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); } });
  netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping;
  const ropeM = new THREE.MeshBasicMaterial({ color: '#FFC21F', fog: false }), fR = new THREE.MeshBasicMaterial({ color: '#E8442C', fog: false }), fW = new THREE.MeshBasicMaterial({ color: '#FFFFFF', fog: false });
  function netPanel(x0, x1, y0, y1) { const g = new THREE.Group(), w = x1 - x0, h = y1 - y0, t = netTex.clone(); t.needsUpdate = true; t.repeat.set(w / 0.8, h / 0.8);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide, fog: false })); pl.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0); g.add(pl);
    const rope = (ax, ay, bx, by) => { const len = Math.hypot(bx - ax, by - ay), c = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, len, 8), ropeM); c.position.set((ax + bx) / 2, (ay + by) / 2, 0); c.rotation.z = Math.atan2(by - ay, bx - ax) - Math.PI / 2; g.add(c); };
    rope(x0, y0, x1, y0); rope(x0, y1, x1, y1); rope(x0, y0, x0, y1); rope(x1, y0, x1, y1);
    for (let x = x0 + 0.5, i = 0; x < x1; x += 1.0, i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), i % 2 ? fW : fR); f.position.set(x, y1, 0); g.add(f); } return g; }
  const sign = (txt) => tex(256, 128, (c) => { c.fillStyle = '#FFE45C'; c.strokeStyle = INK; c.lineWidth = 10; c.beginPath(); c.roundRect(8, 8, 240, 112, 30); c.fill(); c.stroke(); c.fillStyle = INK; c.font = '900 60px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, 128, 68); });
  const SG = { down: sign('⬇ 潛'), up: sign('⬆ 游高'), lane: sign('⬅ ➡'), updown: sign('⬆ 或 ⬇') };
  function warn(kind, x, y) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: SG[kind], fog: false, depthTest: false })); s.scale.set(2.2, 1.1, 1); s.position.set(x, y, 0); s.renderOrder = 5; return s; }
  const ALL = [0, 1, 2], TOP = [1.25, 9], LOW = [-2, 2.55], MID = [1.15, 2.65], FULL = [-2, 9];
  const O = {
    netTop() { const g = new THREE.Group(); g.add(netPanel(X0, X1, 1.25, 5.2)); g.add(warn('down', 0, 5.9)); return { g, lanes: ALL, y: TOP, tip: '往下滑，潛過去！', net: 1 }; },
    netLow() { const g = new THREE.Group(); g.add(netPanel(X0, X1, -0.7, 2.55)); g.add(warn('up', 0, 3.4)); return { g, lanes: ALL, y: LOW, tip: '往上滑，游過去！', net: 1 }; },
    netWall(open) { const g = new THREE.Group(), cov = ALL.filter((i) => i !== open); cov.forEach((i) => g.add(netPanel(Lx[i] - 1.2, Lx[i] + 1.2, -0.7, 5.2))); g.add(warn('lane', Lx[open], 4.6)); const r = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.09, 8, 28), new THREE.MeshBasicMaterial({ color: '#7DFFB0', fog: false })); r.position.set(Lx[open], 1.9, 0); g.add(r); return { g, lanes: cov, y: FULL, tip: '找綠色圈圈的缺口！', net: 1 }; },
    pillar(lane) { const g = new THREE.Group(); for (let i = 0; i < 3; i++) { const r = rock(rnd(0.9, 1.15)); r.position.set(rnd(-0.15, 0.15), i * 1.5, 0); g.add(r); } const c = branchCoral(pick(coralC), 0.6); c.position.y = 4.2; g.add(c); g.position.x = Lx[lane]; return { g, lanes: [lane], y: FULL, tip: '礁石！左右滑閃開', hit: '撞到礁石！' }; },
    arch() { const g = new THREE.Group(); [X0 - 0.4, X1 + 0.4].forEach((x) => { const r = rock(1.4); r.scale.y = 2.6; r.position.set(x, 1.5, 0); g.add(r); }); for (let x = X0; x <= X1 + 0.1; x += 1.25) { const r = rock(rnd(0.85, 1.05)); r.position.set(x, 2.25 + rnd(0, 0.5), 0); g.add(r); } const c = branchCoral(pick(coralC), 0.8); c.position.set(0, 3, 0); g.add(c); g.add(warn('down', 0, 5.2)); return { g, lanes: ALL, y: [1.25, 9], tip: '礁石拱門！往下潛', hit: '撞到礁石！' }; },
    trash(lane) { const g = new THREE.Group(), k = Math.floor(Math.random() * 3); let m;
      if (k === 0) { m = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.8, 14), new THREE.MeshToonMaterial({ color: '#7FD3E8', gradientMap: ramp, transparent: true, opacity: 0.85 })); const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 10), T('#C0392B')); cap.position.y = 1.05; m.add(cap); m.rotation.z = 1.25; }
      else if (k === 1) { m = new THREE.Mesh(new THREE.SphereGeometry(1.1, 14, 10), new THREE.MeshToonMaterial({ color: '#F4F4F0', gradientMap: ramp, transparent: true, opacity: 0.9 })); m.scale.set(1, 0.75, 0.6); }
      else { m = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.1, 1.1), T('#D9A066')); }
      ol(m, 1.05); g.add(m); g.position.set(Lx[lane], 1.9, 0); g.userData.spin = rnd(-1, 1); return { g, lanes: [lane], y: MID, tip: '巨大垃圾！閃開', hit: '撞到垃圾！' }; },
    tire(lane) { const g = new THREE.Group(), t = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.42, 12, 24), T('#26262B')); ol(t, 1.04); const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.3, 16), T('#9AA3AA')); hub.rotation.x = Math.PI / 2; t.add(hub); t.rotation.y = Math.PI / 2; g.add(t); g.position.set(Lx[lane], 1.0, 0); g.userData.roll = t; return { g, lanes: [lane], y: [-2, 2.7], tip: '大輪胎滾過來！', hit: '被輪胎撞到！' }; },
    drum(lane) { const g = new THREE.Group(); for (let i = 0; i < 2; i++) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.4, 16), T(i ? '#2E86C1' : '#E67E22')); ol(d, 1.05); d.position.y = i * 1.5; g.add(d); } g.position.set(Lx[lane], 0.7, 0); return { g, lanes: [lane], y: [-2, 3.0], tip: '油桶！閃開', hit: '撞到油桶！' }; },
    container(lane) { const g = new THREE.Group(), c = container(pick(contC)); c.rotation.y = Math.PI / 2; c.scale.set(1, 2.2, 1.4); g.add(c); g.position.set(Lx[lane], 1.2, 0); return { g, lanes: [lane], y: FULL, tip: '貨櫃！左右滑', hit: '撞到貨櫃！' }; },
    chain(lane) { const g = new THREE.Group(), m = T('#5B6770'); for (let i = 0; i < 14; i++) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 6, 12), m); l.position.y = -0.4 + i * 0.42; l.rotation.y = i % 2 ? Math.PI / 2 : 0; g.add(l); } const an = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.8, 4), m); an.position.y = -0.5; an.rotation.x = Math.PI; g.add(an); g.position.x = Lx[lane]; return { g, lanes: [lane], y: FULL, tip: '錨鍊！左右滑', hit: '撞到錨鍊！' }; },
    harpoon() { const g = new THREE.Group(), sp = new THREE.Group(), shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8), T('#8D6E63')); shaft.rotation.z = Math.PI / 2; sp.add(shaft); const head = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 8), T('#B0BEC5')); head.rotation.z = Math.PI / 2; head.position.x = -1.9; sp.add(head); ol(head, 1.1); sp.position.set(X1 + 6, 1.9, 0); g.add(sp);
      const laser = new THREE.Mesh(new THREE.BoxGeometry(X1 - X0 + 2, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: '#FF3B30', transparent: true, opacity: 0.8, fog: false })); laser.position.y = 1.9; g.add(laser); g.add(warn('updown', 0, 4.4)); g.userData.harpoon = sp; g.userData.laser = laser;
      return { g, lanes: ALL, y: MID, tip: '魚叉！往上或往下閃', hit: '被魚叉擦到！' }; },
    jelly(lanes) { const g = new THREE.Group(); lanes.forEach((l) => { for (let i = 0; i < 3; i++) { const j = jelly(false); j.position.set(Lx[l] + rnd(-0.6, 0.6), rnd(1.4, 2.6), rnd(-0.6, 0.6)); g.add(j); } }); return { g, lanes, y: MID, tip: '水母群！換水道或上下閃', hit: '被水母螫到！' }; },
    kelpwall(open) { const g = new THREE.Group(), cov = ALL.filter((i) => i !== open); cov.forEach((l) => { for (let i = 0; i < 4; i++) { const k = kelp(6); k.position.set(Lx[l] + rnd(-0.9, 0.9), -0.7, rnd(-0.4, 0.4)); g.add(k); } }); const r = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.09, 8, 28), new THREE.MeshBasicMaterial({ color: '#7DFFB0', fog: false })); r.position.set(Lx[open], 1.9, 0); g.add(r); g.add(warn('lane', Lx[open], 4.6)); return { g, lanes: cov, y: FULL, tip: '海草牆！找缺口', hit: '被海草纏住！' }; }
  };

  return { THEMES, deco, bigCreature, fish, O, bendMaterial, bendAll, bend, sand, caustic, dot, T, ramp, tex, Lx };
}
