/* 鯨鯊快游 v4 海底世界（D140：換上 GPT G99 插畫素材，3D 跑道＋插畫貼圖的 2.5D）
   素材在 games/swim/assets（G99 原圖縮小轉 webp）。這支檔案負責：載入貼圖、四種場景的裝飾清單、障礙的長相與判定範圍、彎道。
   障礙判定：lanes＝擋哪幾條水道，y＝擋哪個高度（鯨鯊高 3.6、中 1.9、低 0.5）。 */
export async function makeWorld(THREE, base, onProgress) {
  const rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[Math.floor(Math.random() * a.length)];
  const keep = (x) => { x.userData.keep = true; return x; };
  const NAMES = ['shark_1', 'shark_2', 'shark_3', 'shark_4', 'shark_hit',
    'coral_branch', 'coral_brain', 'coral_fan', 'anemone_clownfish', 'reef_rock', 'starfish_shells', 'bg_coral',
    'seagrass_tall', 'seagrass_cluster', 'seagrass_bent', 'kelp_rock', 'algae_pebbles', 'turtle_side', 'bg_seagrass',
    'shipwreck_buried', 'cargo_decor', 'tire_decor', 'anchor_decor', 'fishing_boat_broken', 'harbor_buoy', 'harbor_signal', 'bg_harbor',
    'jellyfish_glow', 'coral_glow', 'anglerfish', 'deep_rock', 'tube_sponge_glow', 'shells_glow', 'bg_deep',
    'ob_net', 'ob_net_vertical', 'ob_reef_pillar', 'ob_reef_arch', 'ob_bottle', 'ob_plastic_bag', 'ob_tire', 'ob_oil_barrel', 'ob_cargo', 'ob_harpoon', 'ob_jellyfish_group',
    'food_plankton', 'food_krill', 'food_roe', 'food_small_fish', 'item_speed_ring', 'item_bubble_shield', 'kite_dive_v1', 'item_dash_lightning', 'item_frenzy_flame'];
  const TX = {}, AR = {}, loader = new THREE.TextureLoader(); let done = 0;
  await Promise.all(NAMES.map((n) => loader.loadAsync(base + n + '.webp').then((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; TX[n] = keep(t); AR[n] = t.image.width / t.image.height; done++; onProgress && onProgress(done / NAMES.length); })));

  /* ---- 彎道：所有材質在畫面空間依距離平方往左右／上下偏（插畫貼圖也一起彎） ---- */
  const bend = { value: new THREE.Vector2(0, 0) };
  function bendMaterial(m) {
    if (!m || m.userData.bent) return; m.userData.bent = true; const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => { if (prev) prev.call(m, sh, r); sh.uniforms.uBend = bend; sh.vertexShader = 'uniform vec2 uBend;\n' + sh.vertexShader.replace('#include <project_vertex>', THREE.ShaderChunk.project_vertex).replace('gl_Position = projectionMatrix * mvPosition;', 'mvPosition.xy += uBend * mvPosition.z * mvPosition.z;\n\tgl_Position = projectionMatrix * mvPosition;'); };
    m.customProgramCacheKey = () => 'bend' + (m.type || '') + (prev ? '+' : ''); m.needsUpdate = true;
  }
  const bendAll = (o) => o.traverse((x) => { if (x.material) (Array.isArray(x.material) ? x.material : [x.material]).forEach(bendMaterial); });

  /* ---- 插畫貼圖立起來（Sprite 永遠面向鏡頭）；同一張圖共用材質 ---- */
  const SM = {};
  const smat = (n) => SM[n] || (SM[n] = keep(new THREE.SpriteMaterial({ map: TX[n], transparent: true, alphaTest: 0.25, depthWrite: true })));
  function spr(n, h, ground) { const s = new THREE.Sprite(smat(n)); s.scale.set(h * AR[n], h, 1); if (ground) s.center.set(0.5, 0.04); return s; }

  /* ---- 場景 ---- */
  const THEMES = [
    { id: 'reef', name: '🐠 珊瑚礁', place: '潮境', sea: '#36B3CC', fog: [26, 86], sand: '#F1DFB0', light: 1.9, bg: 'bg_coral', big: 'turtle_side',
      deco: [['coral_branch', 3.2], ['coral_brain', 2.6], ['coral_fan', 3.4], ['anemone_clownfish', 2.8], ['reef_rock', 2.6]], small: [['reef_rock', 0.9], ['coral_brain', 0.8]],
      obst: { trash: 1, pillar: 2, arch: 1.5, net: 1.5, harpoon: 1, jelly: 0.6, tire: 0.6 } },
    { id: 'kelp', name: '🌿 海草森林', place: '八斗子', sea: '#2E9C8E', fog: [22, 78], sand: '#D8C995', light: 1.7, bg: 'bg_seagrass', big: 'turtle_side',
      deco: [['seagrass_tall', 6.5], ['seagrass_cluster', 3.2], ['seagrass_bent', 3.0], ['kelp_rock', 2.8], ['seagrass_tall', 5]], small: [['algae_pebbles', 0.9], ['seagrass_cluster', 1.0]],
      obst: { trash: 1, pillar: 1, arch: 1, net: 1.5, harpoon: 1.2, jelly: 0.6, tire: 0.8, kelpwall: 1.5 } },
    { id: 'wreck', name: '⚓ 沉船港區', place: '正濱', sea: '#2A7896', fog: [20, 74], sand: '#C9BC98', light: 1.5, bg: 'bg_harbor', big: 'turtle_side',
      deco: [['shipwreck_buried', 4.2], ['cargo_decor', 2.8], ['tire_decor', 2.2], ['anchor_decor', 3.0], ['fishing_boat_broken', 3.6], ['harbor_buoy', 3.0], ['harbor_signal', 4.2]], small: [['anchor_decor', 0.9], ['algae_pebbles', 0.8]],
      obst: { trash: 2, tire: 1.6, drum: 1.6, net: 1.5, harpoon: 1.4, container: 1.4 } },
    { id: 'deep', name: '🌌 深海發光', place: '基隆嶼', sea: '#123E62', fog: [16, 66], sand: '#5E7088', light: 1.1, bg: 'bg_deep', big: 'anglerfish',
      deco: [['coral_glow', 3.0], ['deep_rock', 3.0], ['tube_sponge_glow', 3.0], ['jellyfish_glow', 2.4, 'float'], ['anglerfish', 2.0, 'float']], small: [['shells_glow', 0.9], ['coral_glow', 0.9]],
      obst: { jelly: 2.2, pillar: 1.2, arch: 1.2, net: 1, harpoon: 1.2, trash: 1 } }
  ];
  /* D142：會動的裝飾——海草、海葵、扇珊瑚以底部為軸左右擺；漂浮的水母、燈籠魚上下浮、身體一縮一放 */
  const SWAY = { seagrass_tall: 0.12, seagrass_cluster: 0.08, seagrass_bent: 0.1, anemone_clownfish: 0.06, coral_fan: 0.05, kelp_rock: 0.04, algae_pebbles: 0.04 };
  function deco(th, small) { const list = small ? th.small : th.deco, [n, h, f] = pick(list), s = spr(n, h * rnd(0.85, 1.15), !f);
    if (f) { s.position.y = rnd(2.5, 5.5); s.userData.float = rnd(0, 6); s.userData.pulse = 1; s.userData.sy = s.scale.y; }
    if (SWAY[n] && !small) { s.material = s.material.clone(); s.userData.sway = SWAY[n]; s.userData.ph = rnd(0, 6); }
    bendAll(s); return s; }
  function bigCreature(th) { const s = spr(th.big, th.big === 'anglerfish' ? 2.6 : 3.6); s.material = s.material.clone(); s.userData.sy = s.scale.y; s.userData.sx = s.scale.x; bendAll(s); return s; }      // D142：材質各自一份，才能各自擺動

  /* ---- 警告牌（文字） ---- */
  const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return keep(t); };
  const sign = (txt) => tex(256, 128, (c) => { c.fillStyle = '#FFE45C'; c.strokeStyle = '#10293D'; c.lineWidth = 10; c.beginPath(); c.roundRect(8, 8, 240, 112, 30); c.fill(); c.stroke(); c.fillStyle = '#10293D'; c.font = '900 60px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, 128, 68); });
  const SG = { down: sign('⬇ 潛'), up: sign('⬆ 游高'), lane: sign('⬅ ➡'), updown: sign('⬆ 或 ⬇') }, SGM = {};
  function warn(kind, x, y) { const s = new THREE.Sprite(SGM[kind] || (SGM[kind] = keep(new THREE.SpriteMaterial({ map: SG[kind], fog: false, depthTest: false })))); s.scale.set(2.2, 1.1, 1); s.position.set(x, y, 0); s.renderOrder = 5; return s; }
  const ringM = keep(new THREE.MeshBasicMaterial({ color: '#7DFFB0', fog: false })), ringG = keep(new THREE.TorusGeometry(1.1, 0.09, 8, 28));
  function gap(x) { const r = new THREE.Mesh(ringG, ringM); r.position.set(x, 1.9, 0); return r; }

  /* ---- 障礙（插畫） ---- */
  const Lx = [-2.4, 0, 2.4], ALL = [0, 1, 2], FULL = [-2, 9], MID = [1.15, 2.65], FLOOR = -0.7;
  const at = (s, x, y) => { s.position.set(x, y, 0); return s; };
  const O = {
    netTop() { const g = new THREE.Group(), s = spr('ob_net', 4.6); s.scale.x = 8.6; g.add(at(s, 0, 3.4)); g.add(warn('down', 0, 6.2)); return { g, lanes: ALL, y: [1.25, 9], tip: '往下滑，潛過去！', net: 1, hit: '被漁網纏住！' }; },
    netLow() { const g = new THREE.Group(), s = spr('ob_net', 3.8); s.scale.x = 8.6; g.add(at(s, 0, 0.75)); g.add(warn('up', 0, 3.4)); return { g, lanes: ALL, y: [-2, 2.55], tip: '往上滑，游過去！', net: 1, hit: '被漁網纏住！' }; },
    netWall(open) { const g = new THREE.Group(), cov = ALL.filter((i) => i !== open); cov.forEach((i) => { g.add(at(spr('ob_net_vertical', 5.6, true), Lx[i], FLOOR)); });      /* G99 補圖：直立圍網 */ g.add(gap(Lx[open])); g.add(warn('lane', Lx[open], 4.9)); return { g, lanes: cov, y: FULL, tip: '找綠色圈圈的缺口！', net: 1, hit: '被漁網纏住！' }; },
    pillar(l) { const g = new THREE.Group(); g.add(at(spr('ob_reef_pillar', 6.2, true), Lx[l], FLOOR)); return { g, lanes: [l], y: FULL, tip: '礁石！左右滑閃開', hit: '撞到礁石！' }; },
    arch() { const g = new THREE.Group(), s = spr('ob_reef_arch', 8.8); s.scale.x = 15; g.add(at(s, 0, 1.3 + 8.8 * 0.2)); g.add(gap(0)); return { g, lanes: [0, 2], y: FULL, tip: '礁石拱門！從中間的洞穿過', hit: '撞到拱門的柱子！' }; },      // D146：畫面上洞在中間，就讓中間水道直接穿過（原本要往下潛，跟畫面不合）
    trash(l) { const g = new THREE.Group(); g.add(at(spr(pick(['ob_bottle', 'ob_plastic_bag']), 2.6), Lx[l], 1.9)); g.userData.wob = 1; return { g, lanes: [l], y: MID, tip: '巨大垃圾！閃開', hit: '撞到垃圾！' }; },
    tire(l) { const g = new THREE.Group(), s = spr('ob_tire', 2.8); s.material = s.material.clone(); g.add(at(s, Lx[l], 0.9)); g.userData.roll = s; return { g, lanes: [l], y: [-2, 2.7], tip: '大輪胎滾過來！', hit: '被輪胎撞到！' }; },
    drum(l) { const g = new THREE.Group(); g.add(at(spr('ob_oil_barrel', 3.8, true), Lx[l], FLOOR)); return { g, lanes: [l], y: [-2, 3.0], tip: '油桶！閃開', hit: '撞到油桶！' }; },
    container(l) { const g = new THREE.Group(); g.add(at(spr('ob_cargo', 5, true), Lx[l], FLOOR)); return { g, lanes: [l], y: [-2, 3.3], tip: '貨櫃！左右閃或往上游', hit: '撞到貨櫃！' }; },
    harpoon() { const g = new THREE.Group(), s = spr('ob_harpoon', 1.6); g.add(at(s, 9, 1.9)); const laser = new THREE.Mesh(new THREE.BoxGeometry(9, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: '#FF3B30', transparent: true, opacity: 0.8, fog: false })); laser.position.y = 1.9; g.add(laser); g.add(warn('updown', 0, 4.4)); g.userData.harpoon = s; g.userData.laser = laser; return { g, lanes: ALL, y: MID, tip: '魚叉！往上或往下閃', hit: '被魚叉擦到！' }; },
    jelly(lanes) { const g = new THREE.Group(); lanes.forEach((l) => { const s = spr('ob_jellyfish_group', 2.9); s.userData.float = rnd(0, 6); g.add(at(s, Lx[l], 1.9)); }); return { g, lanes, y: MID, tip: '水母群！換水道或上下閃', hit: '被水母螫到！' }; },
    kelpwall(open) { const g = new THREE.Group(), cov = ALL.filter((i) => i !== open); cov.forEach((l) => { for (let k = -1; k <= 1; k++) g.add(at(spr('seagrass_tall', 6.6, true), Lx[l] + k * 0.75, FLOOR)); }); g.add(gap(Lx[open])); g.add(warn('lane', Lx[open], 5.2)); return { g, lanes: cov, y: FULL, tip: '海草牆！找缺口', hit: '被海草纏住！' }; }
  };
  return { keep, TX, AR, THEMES, deco, bigCreature, O, spr, smat, bendMaterial, bendAll, bend, tex, Lx };
}
