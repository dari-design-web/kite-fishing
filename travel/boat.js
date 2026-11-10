/* D428（GPT 0840 Q2 推薦、G105 A8）：雨後小船送菜——小院 4×4 水槽，點一下轉 90 度，把菜園（左）接到廚房門口（右），按「放船」讓紙船載菜籃過去。
   不倒數、不扣料、接錯船會停住，可以再轉再放；到了才進原本的做菜流程（home.js 處理扣料）。圖先用程式畫，GPT 四張圖（底板／直槽／彎槽／紙船）交了再換。
   D429：換上 GPT 0920 四張圖（assets/boat/yard.webp 小院底板、ch_s／ch_c 直槽彎槽、boat.png 紙船）；接通的藍水仍用程式疊在槽上。圖載不到時退回程式畫。 */
(function () {
  var N = 4, DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];      /* 方向 0 上 1 右 2 下 3 左 */
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  /* 每種槽在旋轉 0 時的開口：直槽 上下；彎槽 上右 */
  var BASE = { s: [0, 2], c: [0, 1] };
  function opens(t) { return BASE[t.k].map(function (d) { return (d + t.r) % 4; }); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  /* 隨機走一條從左邊 sy 到右邊 ey 的路（不重複格），長度 5～10 格 */
  function makePath() {
    for (var tries = 0; tries < 400; tries++) {
      var sy = rnd(N), x = 0, y = sy, seen = {}, path = [[0, sy, 3]], ok = false; seen[x + ',' + y] = 1;
      for (var step = 0; step < 20; step++) {
        var ds = [0, 1, 2, 1, 1].sort(function () { return Math.random() - .5; }), moved = false;
        for (var i = 0; i < ds.length; i++) {
          var d = ds[i], nx = x + DX[d], ny = y + DY[d];
          if (nx < 0 || ny < 0 || ny >= N) continue;
          if (nx >= N) { if (path.length >= 5) { path[path.length - 1][3] = 1; ok = true; } break; }
          if (seen[nx + ',' + ny]) continue;
          path[path.length - 1][3] = d; path.push([nx, ny, (d + 2) % 4]); seen[nx + ',' + ny] = 1; x = nx; y = ny; moved = true; break;
        }
        if (ok || !moved) break;
      }
      if (ok && path.length <= 10) return path;
    }
    return [[0, 1, 3, 1], [1, 1, 3, 1], [2, 1, 3, 1], [3, 1, 3, 1]];
  }
  function tileFor(a, b) {
    if ((a + 2) % 4 === b) return { k: 's', r: a % 2 };
    for (var r = 0; r < 4; r++) { var o = opens({ k: 'c', r: r }); if (o.indexOf(a) >= 0 && o.indexOf(b) >= 0) return { k: 'c', r: r }; }
  }
  function puzzle() {
    var p = makePath(), g = [], sol = {};
    for (var y = 0; y < N; y++) { g.push([]); for (var x = 0; x < N; x++) g[y].push({ k: Math.random() < .5 ? 's' : 'c', r: rnd(4) }); }
    p.forEach(function (c) { var t = tileFor(c[2], c[3]); g[c[1]][c[0]] = { k: t.k, r: t.r, on: 1 }; sol[c[0] + ',' + c[1]] = t.r; });
    /* 打亂路上的槽：至少 3 格要轉（直槽轉 1 下、彎槽 1～3 下） */
    var mis = 0;
    p.forEach(function (c) { var t = g[c[1]][c[0]]; if (Math.random() < .75) { t.r = (t.r + 1 + (t.k === 'c' ? rnd(3) : 0)) % 4; mis++; } });
    for (var i = 0; mis < 3 && i < p.length; i++) { var t = g[p[i][1]][p[i][0]]; if ((t.k === 's' ? t.r % 2 : t.r) === (t.k === 's' ? sol[p[i][0] + ',' + p[i][1]] % 2 : sol[p[i][0] + ',' + p[i][1]])) { t.r = (t.r + 1) % 4; mis++; } }
    return { g: g, sy: p[0][1], ey: p[p.length - 1][1], path: p };
  }
  /* 從起點順著水流走，回傳走得到的格子 [[x,y,入,出]]，done＝接到廚房 */
  function flow(P) {
    var x = 0, y = P.sy, din = 3, out = [], seen = {};
    while (x >= 0 && y >= 0 && x < N && y < N && !seen[x + ',' + y]) {
      seen[x + ',' + y] = 1;
      var o = opens(P.g[y][x]); if (o.indexOf(din) < 0) break;
      var dout = o[0] === din ? o[1] : o[0]; out.push([x, y, din, dout]);
      if (x === N - 1 && dout === 1 && y === P.ey) return { cells: out, done: true };
      x += DX[dout]; y += DY[dout]; din = (dout + 2) % 4;
    }
    return { cells: out, done: false };
  }
  var css = el('style');
  css.textContent = '.bt{position:fixed;inset:0;z-index:60;max-width:430px;margin:0 auto;display:flex;flex-direction:column;background:linear-gradient(#9FC7D8,#CFE3D3 30%,#B9D6A3);font-family:inherit;touch-action:manipulation;-webkit-user-select:none;user-select:none;overflow:hidden}' +
    '.bt .top{margin:10px;display:flex;align-items:center;gap:8px;background:#FFFDF8;border-radius:14px;padding:8px 12px;box-shadow:0 3px 10px rgba(0,0,0,.18)}.bt .top b{font-size:15px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bt .top span{margin-left:auto;font:800 13px/1 sans-serif;color:#2B6E8F;white-space:nowrap}' +
    '.bt .tip{margin:0 10px 8px;padding:8px 12px;border-radius:12px;background:rgba(255,241,204,.97);color:#5B4A3A;text-align:center;font-weight:800;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,.15)}' +
    '.bt .yard{position:relative;margin:4px auto 0;width:min(96vw,400px);aspect-ratio:1;background:#A9CF6A url(assets/boat/yard.webp) center/100% 100% no-repeat;border-radius:18px;box-shadow:0 4px 12px rgba(0,0,0,.2)}' +
    '.bt .grid{position:absolute;left:13%;right:13%;top:13%;aspect-ratio:1;display:grid;grid-template-columns:repeat(4,1fr);gap:0;padding:6px;border-radius:16px;background:rgba(255,255,255,.12);box-shadow:inset 0 0 0 2px rgba(94,122,68,.35)}' +
    '.bt .cell{position:relative;border:0;padding:0;border-radius:10px;background:transparent;cursor:pointer;-webkit-tap-highlight-color:transparent;box-shadow:inset 0 0 0 1px rgba(94,122,68,.18)}.bt .cell:active{background:rgba(255,255,255,.18)}.bt .cell svg{position:absolute;inset:0;width:100%;height:100%;transition:transform .16s ease-out}.bt .cell.spin{filter:brightness(1.08)}' +
    '.bt .cell .ch{fill:none;stroke:#8C7A62;stroke-width:34;stroke-linecap:butt}.bt .cell .wt{fill:none;stroke:#D6E8EE;stroke-width:22;stroke-linecap:butt;transition:stroke .25s}.bt.img .cell .wt{stroke:transparent;stroke-width:24}.bt.img .cell.wet .wt{stroke:rgba(61,155,209,.88)}.bt .cell.wet .wt{stroke:#3D9BD1}.bt .cell.wet .rp{opacity:1}.bt .cell .rp{fill:none;stroke:#BFE6FA;stroke-width:3;stroke-dasharray:6 14;opacity:0;animation:btR 1s linear infinite}@keyframes btR{to{stroke-dashoffset:-20}}' +
    '.bt .end{position:absolute;top:13%;width:13%;display:flex;flex-direction:column;align-items:center;font:800 11px/1.1 sans-serif;color:#4A3426;text-align:center;pointer-events:none}.bt .end i{font-size:26px;font-style:normal;display:block;filter:drop-shadow(0 2px 2px rgba(0,0,0,.2))}' +
    '.bt .spout{position:absolute;width:13%;height:7%;background:#3D9BD1;border-radius:6px;box-shadow:inset 0 0 0 3px #C9A570,0 1px 0 #8C6A3E}.bt .end b{display:inline-block;margin-top:2px;padding:1px 6px;border-radius:8px;background:rgba(255,253,248,.92)}.bt .spout.out{background:#D6E8EE}.bt .spout.out.wet{background:#3D9BD1}' +
    '.bt .boat{position:absolute;width:15%;aspect-ratio:3/2;transform:translate(-50%,-60%);transition:left .32s linear,top .32s linear;pointer-events:none;z-index:3;filter:drop-shadow(0 3px 2px rgba(0,0,0,.25))}.bt .boat svg,.bt .boat img{width:100%;height:100%;display:block}.bt .boat i{position:absolute;left:50%;top:-6%;transform:translateX(-50%);font-size:18px;font-style:normal}.bt .boat.stuck{animation:btS .35s 2}@keyframes btS{30%{margin-left:-4px}70%{margin-left:4px}}.bt .boat.home{transition:left .6s ease-in,top .6s ease-in,opacity .6s;opacity:0}' +
    '.bt .rain{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(105deg,transparent 0 22px,rgba(255,255,255,.28) 22px 23px);background-size:60px 60px;animation:btRain 1.2s linear infinite;opacity:.5}@keyframes btRain{to{background-position:-20px 60px}}' +
    '.bt .sp{flex:1}.bt .row{display:flex;gap:8px;padding:8px 12px calc(10px + env(safe-area-inset-bottom,0px));background:#6B4A2E}.bt .row .btn{flex:1}.bt .row .btn.ghost{color:#FFF4D6}' +
    '.bt .go.ready{animation:btG 1.1s ease-in-out infinite}@keyframes btG{50%{box-shadow:0 0 0 5px rgba(244,187,66,.55)}}' +
    '.bt .yay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:rgba(30,20,10,.55);color:#fff;text-align:center;z-index:5;padding:20px}.bt .yay b{font-size:20px}.bt .yay .big{font-size:52px}' +
    '@media (prefers-reduced-motion:reduce){.bt .rain,.bt .cell .rp,.bt .go.ready{animation:none}}';
  document.head.appendChild(css);
  /* D429：圖有載入（IMGOK）就用 GPT 槽圖當底，程式只畫水；沒有就照舊整條程式畫 */
  var IMGOK = false, pre = ['assets/boat/ch_s.png', 'assets/boat/ch_c.png', 'assets/boat/boat.png'], preN = 0;
  pre.forEach(function (u) { var im = new Image(); im.onload = function () { if (++preN === pre.length) IMGOK = true; }; im.src = u; });
  function svgTile(t) {
    var d = t.k === 's' ? 'M50 0 L50 100' : 'M50 0 Q50 50 100 50';
    if (IMGOK) return '<svg viewBox="0 0 100 100" style="transform:rotate(' + t.r * 90 + 'deg)"><image href="assets/boat/ch_' + t.k + '.png" x="0" y="0" width="100" height="100"/><path class="wt" d="' + d + '"/><path class="rp" d="' + d + '"/></svg>';
    return '<svg viewBox="0 0 100 100" style="transform:rotate(' + t.r * 90 + 'deg)"><path class="ch" d="' + d + '"/><path class="wt" d="' + d + '"/><path class="rp" d="' + d + '"/></svg>';
  }
  function boatHtml() { return IMGOK ? '<img src="assets/boat/boat.png" alt="">' : '<svg viewBox="0 0 60 40"><path d="M4 18 L56 18 L46 34 L14 34 Z" fill="#FFF8EA" stroke="#8C7A62" stroke-width="2"/><path d="M14 18 L30 4 L46 18" fill="#F3E3C8" stroke="#8C7A62" stroke-width="2"/></svg>'; }
  /* opt：{ title, items:'🥬🍅', practice } → onArrive(moves) 抵達廚房；onQuit() 不送了 */
  function start(opt, onArrive, onQuit) {
    var P = puzzle(), moves = 0, sailing = false;
    var w = el('div', 'bt' + (IMGOK ? ' img' : ''));
    w.innerHTML = '<div class="top"><b>⛵ 雨後送菜：' + (opt.title || '練習') + '</b><span id="btMv">轉了 0 下</span></div><div class="tip" id="btTip">點水槽轉方向，把菜園接到廚房門口</div>' +
      '<div class="sp"></div><div class="yard" id="btYard"><div class="rain"></div><div class="grid" id="btGrid"></div></div><div class="sp"></div>' +
      '<div class="row"><button class="btn go" id="btGo">⛵ 放船</button><button class="btn ghost" id="btNew">換一題</button><button class="btn ghost" id="btX">' + (opt.practice ? '關閉' : '直接進廚房') + '</button></div>';
    document.body.appendChild(w);
    var yard = $('btYard'), grid = $('btGrid'), cells = [];
    function pos(x, y) { var gr = grid.getBoundingClientRect(), yr = yard.getBoundingClientRect(), pad = 6, cw = (gr.width - pad * 2) / N; return [gr.left - yr.left + pad + cw * (x + .5), gr.top - yr.top + pad + cw * (y + .5), cw]; }
    function build() {
      grid.innerHTML = ''; cells = [];
      yard.querySelectorAll('.end,.spout,.boat').forEach(function (e) { e.remove(); });
      for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
        (function (x, y) {
          var b = el('button', 'cell'); b.type = 'button'; b.setAttribute('aria-label', '水槽 ' + (y + 1) + '-' + (x + 1));
          b.addEventListener('pointerdown', function (e) { e.preventDefault(); spin(x, y); });
          grid.appendChild(b); cells.push(b);
        })(x, y);
      }
      requestAnimationFrame(function () {
        var a = pos(0, P.sy), z = pos(N - 1, P.ey), cw = a[2];
        var s = el('div', 'spout'); s.style.cssText = 'left:0;top:' + (a[1] - cw * .17) + 'px;width:' + (a[0] - cw / 2) + 'px;height:' + cw * .34 + 'px'; yard.appendChild(s);
        var o = el('div', 'spout out'); o.id = 'btOut'; o.style.cssText = 'right:0;top:' + (z[1] - cw * .17) + 'px;width:' + (yard.clientWidth - z[0] - cw / 2) + 'px;height:' + cw * .34 + 'px'; yard.appendChild(o);
        var e1 = el('div', 'end', '<i>🥬</i><b>菜園</b>'); e1.style.cssText = 'left:0;top:' + (a[1] + cw * .2) + 'px'; yard.appendChild(e1);
        var e2 = el('div', 'end', '<i>🏠</i><b>廚房</b>'); e2.style.cssText = 'right:0;top:' + (z[1] - cw * .17 - 44) + 'px'; yard.appendChild(e2);
        var bt = el('div', 'boat', boatHtml() + '<i>🧺</i>'); bt.id = 'btBoat'; bt.style.left = (a[0] - cw) + 'px'; bt.style.top = a[1] + 'px'; yard.appendChild(bt);
        paint();
      });
    }
    function paint() {
      var f = flow(P), wet = {}; w.classList.toggle('img', IMGOK);
      f.cells.forEach(function (c) { wet[c[0] + ',' + c[1]] = 1; });
      for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) { var b = cells[y * N + x]; b.innerHTML = svgTile(P.g[y][x]); b.classList.toggle('wet', !!wet[x + ',' + y]); }
      var o = $('btOut'); if (o) o.classList.toggle('wet', f.done);
      $('btGo').classList.toggle('ready', f.done);
      if (!sailing) $('btTip').textContent = f.done ? '水路接通了！按「放船」送菜過去' : '點水槽轉方向，讓藍色的水流到廚房門口';
      return f;
    }
    function spin(x, y) {
      if (sailing) return;
      var t = P.g[y][x], b = cells[y * N + x], sv = b.querySelector('svg');
      t.r = (t.r + 1) % 4; moves++; $('btMv').textContent = '轉了 ' + moves + ' 下';
      if (sv) { sv.style.transform = 'rotate(' + t.r * 90 + 'deg)'; if (t.r === 0) { sv.style.transition = 'none'; sv.style.transform = 'rotate(-90deg)'; void sv.offsetWidth; sv.style.transition = ''; sv.style.transform = 'rotate(0deg)'; } }
      setTimeout(paint, 170);
    }
    function sail() {
      if (sailing) return; sailing = true;
      var f = flow(P), bt = $('btBoat'), i = 0;
      bt.classList.remove('stuck', 'home');
      var a0 = pos(0, P.sy); bt.style.transition = 'none'; bt.style.left = (a0[0] - a0[2]) + 'px'; bt.style.top = a0[1] + 'px'; void bt.offsetWidth; bt.style.transition = '';
      $('btTip').textContent = '小船出發囉…';
      (function next() {
        if (i < f.cells.length) { var c = f.cells[i++], p = pos(c[0], c[1]); bt.style.left = p[0] + 'px'; bt.style.top = p[1] + 'px'; setTimeout(next, 330); return; }
        if (f.done) {
          var z = pos(N - 1, P.ey); bt.classList.add('home'); bt.style.left = (z[0] + z[2] * 1.2) + 'px';
          setTimeout(win, 650);
        } else {
          bt.classList.add('stuck'); $('btTip').textContent = '船卡住了！接著轉水槽，再按一次放船'; sailing = false;
        }
      })();
    }
    function win() {
      var y = el('div', 'yay', '<div class="big">🏠🧺</div><b>菜籃送到廚房了！</b><p style="margin:0">' + (opt.items ? '送到：' + opt.items + '<br>' : '') + '轉了 ' + moves + ' 下</p><button class="btn" id="btOk" style="min-width:160px">' + (opt.practice ? '好' : '開始做菜') + '</button>' );
      yard.appendChild(y); $('btTip').textContent = '送到了！';
      $('btOk').onclick = function () { w.remove(); onArrive && onArrive(moves); };
    }
    $('btGo').onclick = sail;
    $('btNew').onclick = function () { if (sailing) return; P = puzzle(); moves = 0; $('btMv').textContent = '轉了 0 下'; build(); };
    $('btX').onclick = function () { w.remove(); onQuit && onQuit(); };
    build();
    window.__boat = { flow: function () { return flow(P); }, solve: function () { P.path.forEach(function (c) { var t = tileFor(c[2], c[3]); P.g[c[1]][c[0]].r = t.r; }); paint(); }, get: function () { return P; } };
  }
  window.BOAT = { start: start, _flow: flow, _puzzle: puzzle };
})();
