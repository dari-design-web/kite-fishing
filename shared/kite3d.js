/* 小鳶來港 共用 3D 模型（D137，Dari 10/20 23:10「鯨鯊細節還需要多一點」「小鳶也可以做一個很細節的 3D？試試看」）
   全部用程式即時算出來（three.js），不用模型檔、不用付費素材。卡通描邊（反轉外殼）＋三階明暗（toon），跟 2D 插畫風格接近。
   makeShark(THREE)：鯨鯊——寬扁頭、大嘴、鰓裂 5 條、背脊稜線、白肚、白點與格紋、兩片背鰭、新月形尾鰭、身體 S 形擺動
   makeKite(THREE)：小鳶——大頭、奶油色臉、大眼睛（反光點）、黃色勾嘴、腮紅、頭頂呆毛、分層羽毛翅膀、奶油色肚子、黃腳
   兩個都回傳 Group，group.userData.tick(t, k) 每格呼叫做動畫（k＝動作強度 0～1）。 */
export function toonRamp(THREE) {
  const d = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
}
function canvasTex(THREE, w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
/* 卡通描邊：同一個形狀放大一點、只畫背面、塗深色 */
function outline(THREE, mesh, color, k, mat) { const o = new THREE.Mesh(mesh.geometry, mat || new THREE.MeshBasicMaterial({ color, side: THREE.BackSide })); o.scale.setScalar(k || 1.05); o.renderOrder = -1; mesh.add(o); return o; }
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function interp(keys, t) { for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [t0, v0] = keys[i - 1], [t1, v1] = keys[i], k = (t - t0) / (t1 - t0), s = (1 - Math.cos(k * Math.PI)) / 2; return v0 + (v1 - v0) * s; } return keys[keys.length - 1][1]; }

export function makeShark(THREE, opt) {
  opt = opt || {}; const L = opt.length || 3.4, g = new THREE.Group(), ramp = toonRamp(THREE), INK = '#0E2433';
  /* 身體：沿著頭→尾一圈一圈的橢圓，頭寬扁、背上三條稜線、肚子比較平 */
  const W = [[0, 0.03], [0.025, 0.32], [0.07, 0.5], [0.14, 0.62], [0.3, 0.66], [0.5, 0.58], [0.7, 0.38], [0.86, 0.17], [0.96, 0.08], [1, 0.05]];
  const Hh = [[0, 0.03], [0.025, 0.12], [0.07, 0.21], [0.14, 0.31], [0.3, 0.43], [0.5, 0.41], [0.7, 0.29], [0.86, 0.15], [0.96, 0.09], [1, 0.06]];
  const NR = 56, NS = 44, pos = [], uv = [], idx = [];
  for (let i = 0; i <= NR; i++) { const t = i / NR, w = interp(W, t), h = interp(Hh, t), z = -L / 2 + t * L, ridge = smooth(0.12, 0.25, t) * (1 - smooth(0.7, 0.9, t));
    for (let j = 0; j <= NS; j++) { const a = j / NS * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      let r = 1 + ridge * 0.07 * (Math.exp(-((Math.abs(a - Math.PI) - Math.PI + 0.55) ** 2) / 0.006) + Math.exp(-((Math.abs(a - Math.PI) - Math.PI + 1.15) ** 2) / 0.006));
      const y = h * ca * r * (ca < 0 ? 0.78 : 1) - (t < 0.12 ? (0.12 - t) * 0.5 : 0); pos.push(w * sa * r, y, z); uv.push(j / NS, t); } }
  for (let i = 0; i < NR; i++) for (let j = 0; j < NS; j++) { const a = i * (NS + 1) + j, b = a + NS + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  /* 花紋：背深藍灰＋白點＋淡格紋，往肚子漸白 */
  const skin = canvasTex(THREE, 1024, 512, (c, w, h) => {
    for (let x = 0; x < w; x++) { const top = Math.cos(x / w * Math.PI * 2); c.fillStyle = top > -0.1 ? '#35647F' : top > -0.32 ? '#7E9FB2' : '#F2F5F3'; c.fillRect(x, 0, 1, h); }
    const back = (u) => Math.cos(u * Math.PI * 2) > 0.02;
    c.strokeStyle = 'rgba(235,245,250,.55)'; c.lineWidth = 3;
    for (let k = 0; k < 13; k++) { const v = 0.15 + k * 0.055; c.beginPath(); let on = false; for (let x = 0; x <= w; x += 6) { const u = x / w; if (!back(u)) { on = false; continue; } const y = v * h + Math.sin(x * 0.04 + k) * 3; if (!on) { c.moveTo(x, y); on = true; } else c.lineTo(x, y); } c.stroke(); }
    for (let k = 0; k < 18; k++) { const u = k / 18; if (!back(u)) continue; c.beginPath(); c.moveTo(u * w, h * 0.15); c.lineTo(u * w + 10, h * 0.85); c.stroke(); }
    c.fillStyle = '#F4FAFC';
    for (let i = 0; i < 900; i++) { const u = Math.random(), v = Math.random(); if (!back(u) || v < 0.03) continue; const r = (v < 0.15 ? 2 : 3.2) + Math.random() * 2.4 * (1 - v * 0.6); c.beginPath(); c.arc(u * w, v * h, r, 0, 7); c.fill(); }
  });
  const uT = { value: 0 }, uA = { value: 0.12 };
  const bend = (m) => { m.onBeforeCompile = (sh) => { sh.uniforms.uT = uT; sh.uniforms.uA = uA; sh.vertexShader = 'uniform float uT; uniform float uA;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n float bw = smoothstep(' + (-L * 0.25).toFixed(2) + ', ' + (L * 0.5).toFixed(2) + ', transformed.z);\n transformed.x += uA * sin(uT * 7.0 - transformed.z * 1.7) * bw * bw;'); }; return m; };
  const bodyM = bend(new THREE.MeshToonMaterial({ map: skin, gradientMap: ramp }));
  const body = new THREE.Mesh(geo, bodyM); g.add(body);
  outline(THREE, body, INK, 1.035, bend(new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide })));
  const bendX = (z, t) => { const bw = smooth(-L * 0.25, L * 0.5, z); return uA.value * Math.sin(t * 7 - z * 1.7) * bw * bw; };
  /* 嘴、眼睛、鰓裂 */
  const ink = new THREE.MeshBasicMaterial({ color: '#13202A' });
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 6, 28, Math.PI), ink); mouth.scale.set(1.05, 0.28, 1); mouth.rotation.z = Math.PI; mouth.position.set(0, -0.07, -L / 2 + 0.07); g.add(mouth);
  const eyeM = new THREE.MeshToonMaterial({ color: '#0B1218', gradientMap: ramp }), shine = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
  [-1, 1].forEach((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), eyeM); e.position.set(s * interp(W, 0.07) * 0.93, 0.02, -L / 2 + 0.24); g.add(e); const sp = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), shine); sp.position.set(s * 0.025, 0.03, -0.035); e.add(sp); });
  const gillM = new THREE.MeshBasicMaterial({ color: '#203B4C' });
  [-1, 1].forEach((s) => { for (let k = 0; k < 5; k++) { const t = 0.15 + k * 0.028, w = interp(W, t), gl = new THREE.Mesh(new THREE.BoxGeometry(0.012, interp(Hh, t) * 0.95, 0.025), gillM); gl.position.set(s * w * 1.0, -0.02, -L / 2 + t * L); gl.rotation.set(0, 0, s * 0.18); g.add(gl); } });
  /* 鰭：有厚度的圓角薄片 */
  const finM = new THREE.MeshToonMaterial({ color: '#2F5B74', gradientMap: ramp });
  const fin = (draw, depth) => { const sh = new THREE.Shape(); draw(sh); const ge = new THREE.ExtrudeGeometry(sh, { depth: depth || 0.04, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 10 }); ge.translate(0, 0, -(depth || 0.04) / 2); const m = new THREE.Mesh(ge, finM); outline(THREE, m, INK, 1.06); return m; };
  const d1 = fin((s) => { s.moveTo(0, 0); s.quadraticCurveTo(0.12, 0.5, 0.42, 0.66); s.quadraticCurveTo(0.42, 0.25, 0.78, 0); s.lineTo(0, 0); });
  d1.rotation.y = -Math.PI / 2; d1.position.set(0, interp(Hh, 0.42) * 0.95, -L / 2 + 0.36 * L); g.add(d1);
  const d2 = fin((s) => { s.moveTo(0, 0); s.quadraticCurveTo(0.05, 0.2, 0.18, 0.26); s.quadraticCurveTo(0.2, 0.08, 0.32, 0); s.lineTo(0, 0); }, 0.03);
  d2.rotation.y = -Math.PI / 2; d2.position.set(0, interp(Hh, 0.74) * 0.95, -L / 2 + 0.72 * L); g.add(d2);
  const pecs = [-1, 1].map((s) => { const p = fin((sh) => { sh.moveTo(0, 0); sh.quadraticCurveTo(0.55, 0.05, 1.05, 0.62); sh.quadraticCurveTo(0.55, 0.5, 0.05, 0.42); sh.lineTo(0, 0); }, 0.04);
    const piv = new THREE.Group(); piv.position.set(s * interp(W, 0.3) * 0.85, -interp(Hh, 0.3) * 0.45, -L / 2 + 0.26 * L); p.rotation.set(Math.PI / 2, 0, 0); p.scale.x = s; p.scale.multiplyScalar(0.78); p.scale.x = s * 0.78; piv.add(p); piv.rotation.z = -s * 0.32; g.add(piv); return piv; });
  [-1, 1].forEach((s) => { const pv = fin((sh) => { sh.moveTo(0, 0); sh.quadraticCurveTo(0.2, 0.02, 0.3, 0.2); sh.quadraticCurveTo(0.15, 0.17, 0, 0.15); sh.lineTo(0, 0); }, 0.03); pv.rotation.set(Math.PI / 2, 0, 0); pv.scale.x = s; pv.position.set(s * interp(W, 0.62) * 0.7, -interp(Hh, 0.62) * 0.7, -L / 2 + 0.6 * L); pv.rotation.z = -s * 0.5; g.add(pv); });
  const tail = new THREE.Group(); tail.position.set(0, 0, L / 2 - 0.08);
  const cf = fin((s) => { s.moveTo(0, 0); s.quadraticCurveTo(0.28, 0.4, 0.72, 0.98); s.quadraticCurveTo(0.48, 0.38, 0.48, 0.0); s.quadraticCurveTo(0.52, -0.28, 0.6, -0.6); s.quadraticCurveTo(0.24, -0.28, 0, 0); }, 0.05);
  cf.rotation.y = -Math.PI / 2; tail.add(cf); g.add(tail);
  g.userData = { L, uT, uA, tail, pecs, tick(t, k) { uT.value = t; uA.value = 0.09 + (k || 0) * 0.07; tail.position.x = bendX(L / 2 - 0.08, t); tail.rotation.y = -Math.cos(t * 7 - (L / 2) * 1.7) * uA.value * 1.6; pecs.forEach((p, i) => { p.rotation.x = Math.sin(t * 2.2 + i) * 0.08; }); } };
  return g;
}

export function makeKite(THREE) {
  const g = new THREE.Group(), ramp = toonRamp(THREE), INK = '#3A2414';
  const M = (c) => new THREE.MeshToonMaterial({ color: c, gradientMap: ramp });
  const brown = M('#9A623C'), dark = M('#6A3F22'), cream = M('#F7E0BC'), yellow = M('#F6B72C'), beakTip = M('#3B2A1E'), pink = new THREE.MeshBasicMaterial({ color: '#F5A6A1', transparent: true, opacity: 0.75 });
  const add = (geo, mat, p, s, r, parent, ol) => { const m = new THREE.Mesh(geo, mat); if (p) m.position.set(...p); if (s) m.scale.set(...s); if (r) m.rotation.set(...r); (parent || g).add(m); if (ol !== false) outline(THREE, m, INK, ol || 1.045); return m; };
  const sph = (r, a, b) => new THREE.SphereGeometry(r, a || 32, b || 24);
  /* 身體＋奶油色肚子（上緣一圈蓬鬆毛） */
  const bodyG = new THREE.Group(); g.add(bodyG);
  add(sph(0.78), brown, [0, 0.15, 0], [1, 1.08, 0.92], null, bodyG);
  add(sph(0.6), cream, [0, 0.05, 0.36], [1, 1.08, 0.62], null, bodyG, 1.03);
  for (let i = 0; i < 6; i++) { const a = -0.9 + i * 0.36; add(sph(0.16, 16, 12), cream, [Math.sin(a) * 0.48, 0.5 + Math.cos(a) * 0.12, 0.5 + Math.cos(a) * 0.12], [1, 0.8, 0.7], null, bodyG, false); }
  for (let i = 0; i < 5; i++) add(new THREE.ConeGeometry(0.06, 0.16, 8), M('#E9CCA0'), [(i - 2) * 0.16, -0.05 - Math.abs(i - 2) * 0.05, 0.72], null, [-0.4, 0, 0], bodyG, false);      // 肚子上的小羽紋
  /* 頭：大圓頭、臉、眼睛、嘴、腮紅、呆毛 */
  const head = new THREE.Group(); head.position.set(0, 1.18, 0.05); g.add(head);
  add(sph(0.98), brown, [0, 0, 0], [1.06, 0.96, 0.98], null, head);
  [-1, 1].forEach((s) => { add(sph(0.42), cream, [s * 0.36, 0.02, 0.66], [1, 1.02, 0.55], null, head, 1.02); });
  add(sph(0.3), cream, [0, -0.28, 0.76], [1.25, 0.8, 0.6], null, head, false);
  [-1, 1].forEach((s) => {
    const eye = new THREE.Group(); eye.position.set(s * 0.36, 0.04, 0.86); head.add(eye);
    add(sph(0.29), M('#C7782F'), [0, 0, 0], [1, 1.06, 0.45], null, eye, 1.05);
    add(sph(0.23), M('#3A1F10'), [0, 0, 0.05], [1, 1.06, 0.5], null, eye, false);
    const w = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
    add(sph(0.075, 12, 10), w, [s * -0.06 + 0.02, 0.08, 0.16], null, null, eye, false); add(sph(0.035, 10, 8), w, [0.08, -0.07, 0.15], null, null, eye, false);
    add(sph(0.12, 16, 12), pink, [s * 0.66, -0.26, 0.6], [1.2, 0.7, 0.4], null, head, false);
    add(new THREE.ConeGeometry(0.1, 0.32, 8), dark, [s * 0.4, 0.42, 0.72], [1, 1, 0.5], [0.2, 0, s * 1.3], head, false);      // 眉毛羽
  });
  const beak = new THREE.Group(); beak.position.set(0, -0.18, 0.92); head.add(beak);
  add(new THREE.ConeGeometry(0.17, 0.34, 20), yellow, [0, -0.02, 0.06], [1.15, 1, 0.8], [Math.PI, 0, 0], beak, 1.06);
  add(sph(0.06, 12, 10), beakTip, [0, -0.17, 0.09], [1, 1.3, 0.9], null, beak, false);
  for (let i = 0; i < 3; i++) add(new THREE.ConeGeometry(0.13, 0.5 - Math.abs(i - 1) * 0.1, 10), i === 1 ? dark : brown, [(i - 1) * 0.2, 1.0 - Math.abs(i - 1) * 0.08, 0.0], null, [-0.15, 0, (i - 1) * -0.5], head, 1.06);      // 頭頂呆毛
  /* 翅膀：每邊 6 片羽毛，尖端深色；可以拍 */
  const wings = [-1, 1].map((s) => { const piv = new THREE.Group(); piv.position.set(s * 0.68, 0.48, -0.02); g.add(piv);
    for (let i = 0; i < 6; i++) { const len = 0.62 + i * 0.07, f = new THREE.Group(); f.rotation.z = s * (-0.35 - i * 0.2); f.rotation.y = s * 0.15; piv.add(f);
      add(sph(0.5, 20, 14), i % 2 ? dark : brown, [s * len * 0.55, 0, -i * 0.03], [len * 0.95, 0.2, 0.12], null, f, 1.06);
      add(sph(0.5, 16, 12), dark, [s * len * 0.98, 0, -i * 0.03 - 0.01], [len * 0.35, 0.16, 0.1], null, f, false); }
    return piv; });
  /* 尾羽、腳 */
  for (let i = 0; i < 3; i++) add(sph(0.5, 16, 12), i === 1 ? dark : brown, [(i - 1) * 0.16, -0.38, -0.62], [0.16, 0.5, 0.1], [0.9, 0, (i - 1) * 0.35], g, 1.06);
  [-1, 1].forEach((s) => { const leg = new THREE.Group(); leg.position.set(s * 0.28, -0.62, 0.12); g.add(leg);
    add(new THREE.CylinderGeometry(0.07, 0.08, 0.22, 12), yellow, [0, 0, 0], null, null, leg);
    for (let k = -1; k <= 1; k++) { add(new THREE.CapsuleGeometry(0.045, 0.14, 4, 8), yellow, [k * 0.08, -0.12, 0.08], null, [Math.PI / 2 - 0.2, 0, k * 0.4], leg, 1.08); add(new THREE.ConeGeometry(0.03, 0.08, 8), beakTip, [k * 0.11, -0.13, 0.2], null, [Math.PI / 2, 0, 0], leg, false); } });
  g.userData = { head, wings, tick(t, k) { k = k == null ? 1 : k; const f = Math.sin(t * (6 + k * 6)); wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * (-0.25 + f * 0.55 * k); w.rotation.x = f * 0.1 * k; }); head.rotation.z = Math.sin(t * 1.3) * 0.06; head.rotation.x = Math.sin(t * 0.9) * 0.05; g.position.y = (g.userData.y0 || 0) + Math.sin(t * 2.4) * 0.06; } };
  return g;
}
