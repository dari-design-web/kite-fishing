/* D449（GPT 1120 Q3「雨後擦窗」）：客廳窗戶的可選小活動。三格玻璃，每格先用刮水器「上下直拖」刮掉水珠，再用軟布來回擦掉霧痕；
   三格都清楚就看到港口（沿用 assets/card_harbor.jpg）。不倒數、不加分、不存檔、不讀天氣，隨時可以重來或離開。
   D452：窗外港景每局輪換四張（GPT 1420 Q2 三張新景）。D450：換上 GPT 1220 五張圖（窗框 600×720、水珠／霧痕 534×640 鋪滿玻璃、刮水器／軟布 128×128）；沒載到時照舊用程式畫。 */
(function () {
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  var P = 3, COLS = 6, ROWS = 14, DONE = 0.8;
  var IMG = {}, ASSET = { frame: 'assets/wipe/frame.png', drops: 'assets/wipe/drops.png', fog: 'assets/wipe/fog.png', squeegee: 'assets/wipe/squeegee.png', cloth: 'assets/wipe/cloth.png' };
  Object.keys(ASSET).forEach(function (k) { var im = new Image(); im.onload = function () { IMG[k] = im; }; im.src = ASSET[k]; });
  /* D452（GPT 1420 Q2）：窗外港景每開一局換一張（白天＋傍晚／夜燈／清晨霧散），本局三格同一張；只是插畫主題，不讀時間天氣、不存看過哪張。載不到就用白天港景 */
  var SCENES = [
    { src: 'assets/card_harbor.jpg', name: '白天的港口' },
    { src: 'assets/wipe/harbor_sunset.jpg', name: '傍晚的港口' },
    { src: 'assets/wipe/harbor_lights.jpg', name: '夜裡亮燈的港口' },
    { src: 'assets/wipe/harbor_morning.jpg', name: '清晨霧散的港口' }
  ], sceneOk = [true, false, false, false], lastScene = -1;
  SCENES.forEach(function (sc, i) { if (!i) return; var im = new Image(); im.onload = function () { sceneOk[i] = true; }; im.src = sc.src; });
  function pickScene() {
    var c = []; SCENES.forEach(function (sc, i) { if (sceneOk[i] && i !== lastScene) c.push(i); });
    if (!c.length) c = [0];
    lastScene = c[Math.floor(Math.random() * c.length)]; return lastScene;
  }
  var SVG = {
    squeegee: '<svg viewBox="0 0 64 64"><rect x="6" y="10" width="52" height="9" rx="3" fill="#3B4A57"/><rect x="8" y="17" width="48" height="5" rx="2" fill="#1F2A33"/><rect x="28" y="22" width="8" height="34" rx="4" fill="#E9A23B" stroke="#9A6417" stroke-width="2"/></svg>',
    cloth: '<svg viewBox="0 0 64 64"><path d="M10 20 Q32 8 54 20 L50 50 Q32 58 14 50 Z" fill="#7EC4E6" stroke="#3E87AE" stroke-width="3"/><path d="M16 28 Q32 20 48 28 M17 38 Q32 31 47 38" fill="none" stroke="#B9E2F5" stroke-width="3" stroke-linecap="round"/></svg>'
  };
  function toolHTML(k) { return IMG[k] ? '<img src="' + ASSET[k] + '" alt="" draggable="false">' : SVG[k]; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  /* 水珠：藍灰薄膜＋大大小小的水珠（暗邊、亮點）＋幾條往下流的水痕 */
  function paintDrops(c, w, h, s) {
    var g = c.getContext('2d'); g.setTransform(s, 0, 0, s, 0, 0); g.clearRect(0, 0, w, h);
    if (IMG.drops) { g.drawImage(IMG.drops, 0, 0, w, h); return; }
    g.fillStyle = 'rgba(150,175,195,.42)'; g.fillRect(0, 0, w, h);
    for (var i = 0; i < 14; i++) { var x = rnd(0, w), y0 = rnd(0, h * .6), len = rnd(30, h * .4); g.strokeStyle = 'rgba(225,238,246,.55)'; g.lineWidth = rnd(2, 4); g.beginPath(); g.moveTo(x, y0); g.bezierCurveTo(x + rnd(-4, 4), y0 + len * .3, x + rnd(-4, 4), y0 + len * .7, x + rnd(-3, 3), y0 + len); g.stroke(); }
    var n = Math.round(w * h / 230);
    for (i = 0; i < n; i++) {
      var r = Math.random() < .8 ? rnd(1.6, 4) : rnd(4, 8), dx = rnd(0, w), dy = rnd(0, h);
      g.fillStyle = 'rgba(90,120,145,.42)'; g.beginPath(); g.ellipse(dx, dy, r, r * 1.12, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(235,245,252,.75)'; g.beginPath(); g.ellipse(dx, dy + r * .12, r * .72, r * .8, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.arc(dx - r * .32, dy - r * .35, Math.max(.8, r * .26), 0, 7); g.fill();
    }
  }
  /* 霧痕：白霧＋一團團較濃的抹痕，畫一次當材質 */
  function makeFog(w, h, s) {
    var c = document.createElement('canvas'); c.width = w * s; c.height = h * s; var g = c.getContext('2d'); g.setTransform(s, 0, 0, s, 0, 0);
    if (IMG.fog) { g.drawImage(IMG.fog, 0, 0, w, h); return c; }
    g.fillStyle = 'rgba(236,241,244,.7)'; g.fillRect(0, 0, w, h);
    for (var i = 0; i < 26; i++) { var x = rnd(0, w), y = rnd(0, h), r = rnd(18, 46), gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineCap = 'round';
    for (i = 0; i < 10; i++) { g.lineWidth = rnd(6, 12); g.beginPath(); var sx = rnd(0, w), sy = rnd(0, h); g.moveTo(sx, sy); g.quadraticCurveTo(sx + rnd(-30, 30), sy + rnd(-20, 20), sx + rnd(-40, 40), sy + rnd(-10, 10)); g.stroke(); }
    return c;
  }
  var css = el('style');
  css.textContent = '.wp{position:fixed;inset:0;z-index:60;max-width:430px;margin:0 auto;display:flex;flex-direction:column;background:linear-gradient(#E9DCC4,#D9C29E);font-family:inherit;touch-action:manipulation;-webkit-user-select:none;user-select:none;overflow:hidden}' +
    '.wp .top{margin:10px;display:flex;align-items:center;gap:8px;background:#FFFDF8;border-radius:14px;padding:8px 12px;box-shadow:0 3px 10px rgba(0,0,0,.18)}.wp .top b{font-size:15px;white-space:nowrap}.wp .top span{margin-left:auto;font:800 13px/1 sans-serif;color:#2B6E8F;white-space:nowrap}' +
    '.wp .tip{margin:0 10px 6px;padding:8px 12px;border-radius:12px;background:rgba(255,241,204,.97);color:#5B4A3A;text-align:center;font-weight:800;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,.12);min-height:22px}.wp .tip.warn{background:#FFE1D6;color:#8A3B1E}' +
    '.wp .sp{flex:1;min-height:4px}.wp .win{position:relative;margin:0 auto;width:min(88vw,370px,calc((100vh - 270px) * .8333));aspect-ratio:5/6;padding:5.5%;box-sizing:border-box;border-radius:10px;background:linear-gradient(135deg,#B27A49,#8A5A33);box-shadow:inset 0 0 0 3px #6B4426,0 6px 16px rgba(60,35,15,.35)}.wp .win.img{background:transparent;box-shadow:none;padding:0}' +
    '.wp .gl{position:relative;width:100%;height:100%;overflow:hidden;border-radius:4px;background:#BFD9E6 url(assets/card_harbor.jpg) center/cover no-repeat;box-shadow:inset 0 0 0 2px #6B4426;touch-action:none}.wp .win.img .gl{position:absolute;left:5.5%;top:5.5%;width:89%;height:89%}' +
    '.wp canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.wp .mn{position:absolute;top:0;bottom:0;width:4%;margin-left:-2%;background:linear-gradient(90deg,#8A5A33,#B27A49 50%,#8A5A33);box-shadow:0 0 0 1px #6B4426;pointer-events:none;z-index:3}.wp .frImg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:4}.wp .win.img .mn{display:none}.wp .cur.sq img{transform:translateY(12.5%)}' +
    '.wp .ok{position:absolute;top:8px;width:26px;height:26px;margin-left:-13px;border-radius:50%;background:#3E9B4F;color:#fff;font:900 16px/26px sans-serif;text-align:center;z-index:5;opacity:0;transform:scale(.4);transition:all .3s;pointer-events:none}.wp .ok.on{opacity:1;transform:none}' +
    '.wp .stg{position:absolute;bottom:8px;width:30%;margin-left:-15%;text-align:center;font:800 11px/1.2 sans-serif;color:#4A3426;z-index:5;pointer-events:none}.wp .stg i{display:inline-block;padding:2px 6px;border-radius:8px;background:rgba(255,253,248,.88);font-style:normal}' +
    '.wp .cur{position:absolute;width:56px;height:56px;margin:-28px 0 0 -28px;pointer-events:none;z-index:6;display:none;filter:drop-shadow(0 3px 3px rgba(0,0,0,.3))}.wp .cur svg,.wp .cur img,.wp .tl svg,.wp .tl img{width:100%;height:100%;display:block}' +
    '.wp .spk{position:absolute;pointer-events:none;z-index:6;font-size:18px;animation:wpS .7s ease-out forwards}@keyframes wpS{0%{opacity:0;transform:scale(.4)}30%{opacity:1}100%{opacity:0;transform:translateY(-18px) scale(1.15)}}' +
    '.wp .bow{position:absolute;left:-20%;right:-20%;top:4%;aspect-ratio:2/1;border-radius:50% 50% 0 0;background:radial-gradient(circle at 50% 100%,transparent 52%,rgba(150,90,200,.35) 53%,rgba(70,130,230,.35) 56%,rgba(80,190,110,.35) 59%,rgba(250,220,70,.4) 62%,rgba(250,150,60,.38) 65%,rgba(240,80,80,.35) 68%,transparent 69%);opacity:0;transition:opacity 1.6s;pointer-events:none;z-index:2}.wp .bow.on{opacity:1}' +
    '.wp .tools{display:flex;justify-content:center;gap:12px;margin:8px 10px 6px}.wp .tl{display:flex;align-items:center;gap:6px;min-height:52px;padding:4px 14px 4px 6px;border:0;border-radius:16px;background:#FFFDF8;color:#4A3426;font:800 14px/1.1 inherit;font-family:inherit;box-shadow:0 2px 8px rgba(0,0,0,.18);cursor:pointer;-webkit-tap-highlight-color:transparent}.wp .tl span{width:44px;height:44px;flex:none}.wp .tl.on{background:#FFE7A8;box-shadow:0 0 0 3px #E9A23B,0 2px 8px rgba(0,0,0,.18)}.wp .tl.hint{animation:wpH 1s ease-in-out infinite}@keyframes wpH{50%{box-shadow:0 0 0 5px rgba(62,155,79,.6),0 2px 8px rgba(0,0,0,.18)}}' +
    '.wp .row{display:flex;gap:8px;padding:8px 12px calc(10px + env(safe-area-inset-bottom,0px));background:#6B4A2E}.wp .row .btn{flex:1}.wp .row .btn.ghost{color:#FFF4D6}' +
    '.wp .yay{position:absolute;left:6%;right:6%;bottom:12%;padding:12px;border-radius:14px;background:rgba(255,253,248,.95);color:#4A3426;text-align:center;z-index:7;box-shadow:0 4px 14px rgba(0,0,0,.25);animation:wpY .5s ease-out}.wp .yay b{display:block;font-size:17px;margin-bottom:4px}.wp .yay p{margin:0;font-size:13px}@keyframes wpY{from{opacity:0;transform:translateY(12px)}}' +
    '.wp .gl.shake{animation:wpK .3s}@keyframes wpK{30%{transform:translateX(-3px)}70%{transform:translateX(3px)}}' +
    '@media (prefers-reduced-motion:reduce){.wp .tl.hint,.wp .spk,.wp .yay{animation:none}.wp .bow{transition:none}}';
  document.head.appendChild(css);

  /* opt：{ onClose() } */
  function start(opt) {
    opt = opt || {};
    var w = el('div', 'wp');
    w.innerHTML = '<div class="top"><b>🪟 雨後擦窗</b><span id="wpN">清楚 0／3 格</span></div><div class="tip" id="wpTip">剛下過雨，窗戶濕濕的。先拿刮水器上下拖，把水珠刮掉</div>' +
      '<div class="sp"></div><div class="win" id="wpWin"><div class="gl" id="wpGl"><div class="bow" id="wpBow"></div><canvas id="wpFog"></canvas><canvas id="wpDrop"></canvas><div class="mn" style="left:33.333%"></div><div class="mn" style="left:66.667%"></div><div class="cur" id="wpCur"></div></div></div><div class="sp"></div>' +
      '<div class="tools"><button type="button" class="tl on" data-t="squeegee"><span>' + toolHTML('squeegee') + '</span>刮水器</button><button type="button" class="tl" data-t="cloth"><span>' + toolHTML('cloth') + '</span>軟布</button></div>' +
      '<div class="row"><button class="btn ghost" id="wpAg">重新來</button><button class="btn" id="wpX">回客廳</button></div>';
    document.body.appendChild(w);
    var win = $('wpWin'), gl = $('wpGl'), cD = $('wpDrop'), cF = $('wpFog'), cur = $('wpCur'), tip = $('wpTip');
    if (IMG.frame) { win.classList.add('img'); var fi = el('img', 'frImg'); fi.src = ASSET.frame; fi.alt = ''; win.appendChild(fi); }
    var scene = 0, tool = 'squeegee', W = 0, H = 0, S = 1, fogTex = null, mask = document.createElement('canvas'), panes, strokes = { sq: 0, cl: 0 }, finished = false, warnT = 0, fogDirty = false;
    mask.width = P * COLS; mask.height = ROWS;
    for (var i = 0; i < P; i++) {
      var ok = el('div', 'ok', '✓'); ok.id = 'wpOk' + i; ok.style.left = (100 / P * (i + .5)) + '%'; gl.appendChild(ok);
      var sg = el('div', 'stg', '<i>💧 水珠</i>'); sg.id = 'wpSg' + i; sg.style.left = (100 / P * (i + .5)) + '%'; gl.appendChild(sg);
    }
    function reset() {
      var r = gl.getBoundingClientRect(); W = r.width; H = r.height; S = Math.min(2, window.devicePixelRatio || 1);
      [cD, cF].forEach(function (c) { c.width = Math.round(W * S); c.height = Math.round(H * S); });
      paintDrops(cD, W, H, S); fogTex = makeFog(W, H, S);
      panes = []; for (var p = 0; p < P; p++) { var d = [], f = []; for (var k = 0; k < COLS * ROWS; k++) { d.push(1); f.push(1); } panes.push({ d: d, f: f, dOk: false, done: false }); }
      for (p = 0; p < P; p++) { $('wpOk' + p).classList.remove('on'); $('wpSg' + p).innerHTML = '<i>💧 水珠</i>'; }
      $('wpBow').classList.remove('on'); var y = w.querySelector('.yay'); if (y) y.remove();
      scene = pickScene(); gl.style.backgroundImage = 'url(' + SCENES[scene].src + ')'; gl.dataset.scene = scene;
      strokes = { sq: 0, cl: 0 }; finished = false; setTool('squeegee'); drawFog(); count();
      tip.classList.remove('warn'); tip.textContent = '剛下過雨，窗戶濕濕的。先拿刮水器上下拖，把水珠刮掉';
    }
    function pw() { return W / P; }
    function cellOf(x, y) { var p = Math.max(0, Math.min(P - 1, Math.floor(x / pw()))), lx = x - p * pw(); return { p: p, c: Math.max(0, Math.min(COLS - 1, Math.floor(lx / pw() * COLS))), r: Math.max(0, Math.min(ROWS - 1, Math.floor(y / H * ROWS))) }; }
    function ratio(a) { var n = 0; a.forEach(function (v) { if (v <= .25) n++; }); return n / a.length; }
    /* 霧用小遮罩（每格一個像素）放大成柔邊，再把霧材質套上去 */
    function drawFog() {
      fogDirty = false;
      var mg = mask.getContext('2d'), im = mg.createImageData(mask.width, mask.height);
      for (var p = 0; p < P; p++) for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) { var o = ((r * mask.width) + p * COLS + c) * 4; im.data[o + 3] = Math.round(255 * Math.max(0, Math.min(1, panes[p].f[r * COLS + c]))); }
      mg.putImageData(im, 0, 0);
      var g = cF.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, cF.width, cF.height);
      g.imageSmoothingEnabled = true; g.drawImage(mask, 0, 0, cF.width, cF.height);
      g.globalCompositeOperation = 'source-in'; g.drawImage(fogTex, 0, 0); g.globalCompositeOperation = 'source-over';
    }
    function queueFog() { if (fogDirty) return; fogDirty = true; requestAnimationFrame(drawFog); }
    function spark(x, y, t) { var s = el('div', 'spk', t || '✨'); s.style.left = (x - 9) + 'px'; s.style.top = (y - 12) + 'px'; gl.appendChild(s); setTimeout(function () { s.remove(); }, 750); }
    function warn(t) { tip.textContent = t; tip.classList.add('warn'); clearTimeout(warnT); warnT = setTimeout(function () { tip.classList.remove('warn'); hint(); }, 1600); }
    function hint() {
      if (finished) return;
      var needD = panes.filter(function (q) { return !q.dOk; }).length, needF = panes.filter(function (q) { return q.dOk && !q.done; }).length;
      tip.textContent = tool === 'squeegee' ? (needD ? '刮水器：上下直直拖，水珠就刮掉了' : '水珠都刮好了！換軟布擦霧') : (needF ? '軟布：在刮乾淨的地方來回擦，把霧擦掉' : '還有水珠的格子，先用刮水器刮');
      w.querySelector('[data-t=cloth]').classList.toggle('hint', tool === 'squeegee' && needF > 0 && !needD);
      w.querySelector('[data-t=squeegee]').classList.toggle('hint', tool === 'cloth' && needD > 0 && !needF);
    }
    function count() { var n = panes.filter(function (q) { return q.done; }).length; $('wpN').textContent = '清楚 ' + n + '／3 格'; return n; }
    function setTool(t) { tool = t; w.querySelectorAll('.tl').forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); }); cur.innerHTML = toolHTML(t); cur.classList.toggle('sq', t === 'squeegee'); hint(); }
    /* 刮水器：只吃「上下」的拖；刀片約半格寬，所以每格要刮兩三下 */
    function squeegee(p, x0, y0, x1, y1) {
      var bw = pw() * .3, cx = (x0 + x1) / 2, ya = Math.min(y0, y1) - 3, yb = Math.max(y0, y1) + 3, left = p * pw(), q = panes[p];
      var g = cD.getContext('2d'); g.setTransform(S, 0, 0, S, 0, 0); g.save(); g.beginPath(); g.rect(left, 0, pw(), H); g.clip();
      g.globalCompositeOperation = 'destination-out'; g.fillRect(cx - bw, ya, bw * 2, yb - ya); g.restore();
      var got = 0;
      for (var r = 0; r < ROWS; r++) { var my = (r + .5) / ROWS * H; if (my < ya - H / ROWS / 2 || my > yb + H / ROWS / 2) continue; for (var c = 0; c < COLS; c++) { var mx = left + (c + .5) / COLS * pw(); if (Math.abs(mx - cx) <= bw + pw() / COLS * .3 && q.d[r * COLS + c] > 0) { q.d[r * COLS + c] = 0; got++; } } }
      if (got && !q.dOk && ratio(q.d) >= DONE) {
        q.dOk = true; g.save(); g.globalCompositeOperation = 'destination-out'; g.fillRect(left, 0, pw(), H); g.restore(); for (var k = 0; k < q.d.length; k++) q.d[k] = 0;
        $('wpSg' + p).innerHTML = '<i>🌫️ 霧痕</i>'; spark(left + pw() / 2, H * .5, '💦'); hint();
      }
    }
    /* 軟布：圓形來回擦，只擦得到已經沒有水珠的地方；同一處要擦兩三回才會乾淨 */
    function cloth(x0, y0, x1, y1) {
      var rad = pw() * .3, dist = Math.hypot(x1 - x0, y1 - y0), amt = Math.min(.5, dist / (pw() * .9)), wet = false, changed = false;
      for (var p = 0; p < P; p++) { var q = panes[p], left = p * pw(); if (q.done) continue;
        for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) { var mx = left + (c + .5) / COLS * pw(), my = (r + .5) / ROWS * H; if (Math.hypot(mx - x1, my - y1) > rad) continue; var k = r * COLS + c; if (q.d[k] > 0) { wet = true; continue; } if (q.f[k] > 0) { q.f[k] = Math.max(0, q.f[k] - amt); changed = true; } }
        if (changed && ratio(q.f) >= DONE) { q.done = true; for (var j = 0; j < q.f.length; j++) q.f[j] = 0; $('wpOk' + p).classList.add('on'); $('wpSg' + p).innerHTML = '<i>✨ 清楚</i>'; spark(left + pw() * .3, H * .35); spark(left + pw() * .7, H * .55); if (count() >= P) setTimeout(finish, 350); else hint(); }
      }
      if (changed) queueFog();
      return wet && !changed;
    }
    function finish() {
      if (finished) return; finished = true; $('wpBow').classList.add('on'); tip.classList.remove('warn');
      tip.textContent = '三格都清楚了！';
      w.querySelectorAll('.tl').forEach(function (b) { b.classList.remove('hint'); });
      var y = el('div', 'yay', '<b>🌈 雨停了，' + SCENES[scene].name + '看得好清楚！</b><p>刮了 ' + strokes.sq + ' 下、擦了 ' + strokes.cl + ' 下。想再擦一次按「重新來」。</p>');
      gl.appendChild(y);
    }
    var drag = null;
    function at(e) { var r = gl.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    gl.addEventListener('pointerdown', function (e) {
      if (finished) return; e.preventDefault(); try { gl.setPointerCapture(e.pointerId); } catch (_) {}
      var a = at(e); drag = { x: a[0], y: a[1], p: cellOf(a[0], a[1]).p, side: 0, vert: 0, wetN: 0 };
      cur.style.display = 'block'; cur.style.left = a[0] + 'px'; cur.style.top = a[1] + 'px';
    });
    gl.addEventListener('pointermove', function (e) {
      if (!drag) return; var a = at(e), dx = a[0] - drag.x, dy = a[1] - drag.y;
      cur.style.left = a[0] + 'px'; cur.style.top = a[1] + 'px';
      if (Math.hypot(dx, dy) < 4) return;
      if (tool === 'squeegee') {
        if (Math.abs(dx) > Math.abs(dy) * 1.2) { drag.side += Math.hypot(dx, dy); if (drag.side > 40) { drag.side = -999; warn('刮水器要上下直直拖喔，不是左右刷'); } }
        else if (!panes[drag.p].dOk) { squeegee(drag.p, drag.x, drag.y, a[0], a[1]); drag.vert += Math.abs(dy); }
      } else if (cloth(drag.x, drag.y, a[0], a[1])) { if (++drag.wetN === 6) { warn('這裡還有水珠，先用刮水器刮掉'); gl.classList.remove('shake'); void gl.offsetWidth; gl.classList.add('shake'); } }
      drag.x = a[0]; drag.y = a[1];
    });
    function up() { if (!drag) return; if (tool === 'squeegee' && drag.vert > 12) strokes.sq++; if (tool === 'cloth') strokes.cl++; drag = null; cur.style.display = 'none'; }
    gl.addEventListener('pointerup', up); gl.addEventListener('pointercancel', up);
    w.querySelectorAll('.tl').forEach(function (b) { b.onclick = function () { setTool(b.dataset.t); }; });
    $('wpAg').onclick = reset;
    $('wpX').onclick = function () { w.remove(); window.__wipe = null; opt.onClose && opt.onClose(); };
    requestAnimationFrame(reset);
    window.__wipe = {
      st: function () { return { scene: scene, tool: tool, drops: panes.map(function (q) { return Math.round(ratio(q.d) * 100); }), fog: panes.map(function (q) { return Math.round(ratio(q.f) * 100); }), done: panes.map(function (q) { return q.done; }), finished: finished, strokes: strokes }; },
      box: function () { var r = gl.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }
    };
  }
  window.WIPE = { start: start };
})();
