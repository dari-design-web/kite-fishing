/* D165／D168（Dari 10/23）：廚房小遊戲 v2——參考「胡鬧廚房」的單人版，用 GPT G105 的前景工作檯（kitchen_counter.webp＋工作檯座標 v2 hit_rect）。
   小鳶在後面的廚房；前面工作檯：藤籃（拿食材）→ 砧板（連點切，換成切好的圖）→ 左爐（下鍋、顧火：煮中→剛好→焦）→ 起鍋 → 飯鍋（裝飯）→ 便當盒／盤子 → 完成。
   星星只記在菜譜冊，不影響點數或券；可以隨時按「請小鳶幫忙做好」跳過。手機用 pointerdown 立即反應（D167）。 */
(function () {
  var CHOP = 5, COOK_MS = 3500, GOOD_MS = 3200, LIMIT = 45, A = 'assets/home/';
  /* 工作檯 1080×700 上的互動區（G105_工作檯座標_v2 hit_rect_normalized：x0,y0,x1,y1） */
  var HIT = { basket: [0.124, 0.107, 0.281, 0.271], board: [0.306, 0.293, 0.565, 0.469], stove: [0.595, 0.174, 0.723, 0.307], stove2: [0.765, 0.174, 0.895, 0.307], rice: [0.096, 0.314, 0.264, 0.471], box: [0.659, 0.357, 0.895, 0.476] };
  function $(id) { return document.getElementById(id); }
  function tap(e0, fn) { var last = 0; e0.addEventListener('pointerdown', function (e) { if (e.button > 0) return; e.preventDefault(); last = Date.now(); fn(); }); e0.addEventListener('click', function () { if (Date.now() - last < 700) return; fn(); }); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function pct(r) { return 'left:' + r[0] * 100 + '%;top:' + r[1] / 0.7 * 70 + '%;width:' + (r[2] - r[0]) * 100 + '%;height:' + (r[3] - r[1]) * 100 + '%'; }
  var css = el('style');
  css.textContent = '.ck{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;justify-content:flex-end;max-width:430px;margin:0 auto;background:linear-gradient(rgba(30,20,10,0) 30%,rgba(30,20,10,.35));font-family:inherit;touch-action:manipulation;-webkit-user-select:none;user-select:none}' +
    '.ck .top{position:absolute;left:10px;right:10px;top:10px;display:flex;align-items:center;gap:8px;background:rgba(255,253,248,.95);border-radius:14px;padding:8px 10px;box-shadow:0 3px 10px rgba(0,0,0,.2)}.ck .top b{font-size:15px}.ck .top .tk{margin-left:auto;font:800 16px/1 sans-serif;color:#2F7A3A}.ck .top .tk.hurry{color:#C0392B}' +
    '.ck .order{position:absolute;left:10px;right:10px;top:60px;display:flex;gap:6px;flex-wrap:wrap}.ck .order span{background:#FFF8EA;border:2px solid #E5D49B;border-radius:10px;padding:3px 8px;font-size:13px;font-weight:700}.ck .order span.ok{background:#E3F4E5;border-color:#3E9B4F;text-decoration:line-through;color:#2F7A3A}' +
    '.ck .tip{margin:0 10px 6px;padding:8px 12px;border-radius:12px;background:rgba(255,241,204,.97);color:#5B4A3A;text-align:center;font-weight:800;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,.25)}' +
    '.ck .tray{display:flex;gap:6px;flex-wrap:wrap;margin:0 10px 6px;min-height:48px;padding:6px;border-radius:14px;background:rgba(139,94,60,.92);box-shadow:0 2px 8px rgba(0,0,0,.25)}.ck .tray:empty::after{content:"籃子空了";color:#F3E3C8;font-size:13px;margin:auto}.ck .tray.hl{box-shadow:0 0 0 3px #F4BB42}' +
    '.ck .tray button{border:0;border-radius:12px;background:#FFF8EA;padding:4px 8px 4px 4px;font:700 13px/1.1 inherit;font-family:inherit;display:flex;align-items:center;gap:4px;min-height:44px;cursor:pointer}.ck .tray button[disabled]{opacity:.35}.ck .tray img{width:34px;height:34px;object-fit:contain}.ck .tray .e{font-size:24px;width:34px;text-align:center}' +
    '.ck .desk{position:relative;width:100%;aspect-ratio:1080/700;background:url(' + A + 'kitchen_counter.webp) center/100% 100% no-repeat}' +
    '.ck .hz{position:absolute;border:0;background:none;padding:0;cursor:pointer;border-radius:14px;-webkit-tap-highlight-color:transparent}.ck .hz.hl{box-shadow:0 0 0 3px #F4BB42;animation:ckP 1s infinite}@keyframes ckP{50%{box-shadow:0 0 0 6px rgba(244,187,66,.5)}}' +
    '.ck .hz .lb{position:absolute;left:50%;bottom:-2px;transform:translate(-50%,100%);white-space:nowrap;font:800 11px/1 sans-serif;color:#fff;background:rgba(74,52,38,.85);border-radius:8px;padding:3px 6px;pointer-events:none}' +
    '.ck .onb{position:absolute;left:50%;top:50%;width:44%;transform:translate(-50%,-55%);pointer-events:none;transition:transform .08s}.ck .onb img{width:100%;display:block}.ck .onb .e{font-size:30px;text-align:center;display:block}.ck .hz.chop .onb{transform:translate(-50%,-45%) scale(.94)}' +
    '.ck .knife{position:absolute;right:4%;top:-30%;font-size:26px;pointer-events:none;transform-origin:80% 80%}.ck .hz.chop .knife{transform:rotate(-30deg) translateY(10px)}' +
    '.ck .pot{position:absolute;left:50%;bottom:6%;width:150%;transform:translateX(-50%);pointer-events:none}.ck .pot img{width:100%;display:block}.ck .steam{position:absolute;left:50%;top:-20%;font-size:20px;animation:ckS 1.2s infinite;opacity:.85}@keyframes ckS{to{transform:translateY(-18px);opacity:0}}' +
    '.ck .bar{position:absolute;left:10%;right:10%;top:-12px;height:7px;border-radius:4px;background:rgba(0,0,0,.25);overflow:hidden;pointer-events:none}.ck .bar i{display:block;height:100%;width:0;background:#E39A1F}.ck .bar.ok i{background:#3E9B4F}.ck .bar.burn i{background:#C0392B}' +
    '.ck .boxin{position:absolute;inset:8% 6%;display:flex;align-items:center;justify-content:space-around;pointer-events:none}.ck .boxin span{font-size:20px}.ck .boxin img{width:30%;}' +
    '.ck .row{display:flex;gap:8px;padding:6px 12px calc(10px + env(safe-area-inset-bottom,0px));background:#6B4A2E}.ck .row .btn{flex:1}' +
    '.ck .fly{position:fixed;z-index:70;width:34px;height:34px;pointer-events:none;transition:transform .35s ease-in,opacity .35s;display:flex;align-items:center;justify-content:center;font-size:26px}.ck .fly img{width:100%}' +
    '.ck .done{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(30,20,10,.6);color:#fff;text-align:center;gap:6px}.ck .done .stars{font-size:44px;letter-spacing:4px}.ck .done b{font-size:20px}';
  document.head.appendChild(css);

  /* recipe：{ name, need:{k:n}, kind:'bento'|'dish', items:{k:{name,e,type,img,cut}} }；type：chop 要切、cook 直接下鍋、rice 裝飯 */
  function start(r, onDone) {
    var t0 = Date.now(), burnt = false, ended = false, tickT;
    var list = [];
    Object.keys(r.need).forEach(function (k) { for (var i = 0; i < r.need[k]; i++) list.push({ k: k, it: r.items[k], st: 'basket' }); });
    var needRice = list.filter(function (x) { return x.it.type === 'rice'; }).length, riceIn = 0;
    var potItems = 0, potNeed = list.filter(function (x) { return x.it.type !== 'rice'; }).length;
    var board = null, chop = 0, pot = { st: 'idle', t: 0 }, boxFood = false;
    function pic(it, cut) { return cut && it.cut ? '<img src="' + A + it.cut + '.webp" alt="">' : it.img ? '<img src="' + A + it.img + '.webp" alt="">' : '<span class="e">' + it.e + '</span>'; }
    var w = el('div', 'ck');
    w.innerHTML = '<div class="top"><b>做' + r.name + '</b><span class="tk" id="ckT">0 秒</span></div><div class="order" id="ckO"></div>' +
      '<div class="tip" id="ckTip"></div><div class="tray" id="ckTray"></div>' +
      '<div class="desk">' +
      '<button class="hz" id="ckBasket" style="' + pct(HIT.basket) + '" aria-label="藤籃"><span class="lb">藤籃</span></button>' +
      '<button class="hz" id="ckBoard" style="' + pct(HIT.board) + '" aria-label="砧板"><span class="onb" id="ckOnB"></span><span class="knife">🔪</span><span class="bar" id="ckCBw"><i id="ckCB"></i></span><span class="lb">砧板・連點切</span></button>' +
      '<button class="hz" id="ckPot" style="' + pct(HIT.stove) + '" aria-label="爐子"><span class="pot" id="ckPotImg"></span><span class="bar" id="ckPBw"><i id="ckPB"></i></span><span class="lb" id="ckPS">爐子</span></button>' +
      '<button class="hz" id="ckRice" style="' + pct(HIT.rice) + '" aria-label="飯鍋"><span class="lb" id="ckRS">飯鍋</span></button>' +
      '<button class="hz" id="ckBox" style="' + pct(HIT.box) + '" aria-label="' + (r.kind === 'bento' ? '便當盒' : '盤子') + '"><span class="boxin" id="ckBoxIn"></span><span class="lb" id="ckBS">' + (r.kind === 'bento' ? '便當盒' : '盤子') + '</span></button>' +
      '</div><div class="row"><button class="btn ghost" id="ckHelp">請小鳶幫忙做好</button></div>';
    document.body.appendChild(w);
    function tip(t) { $('ckTip').textContent = t; }
    function order() { $('ckO').innerHTML = list.map(function (x) { return '<span class="' + (x.st === 'done' ? 'ok' : '') + '">' + x.it.e + x.it.name + '</span>'; }).join(''); }
    function tray() {
      var b = $('ckTray'); b.innerHTML = '';
      list.forEach(function (x, i) {
        if (x.st !== 'basket') return;
        var btn = el('button', '', pic(x.it) + x.it.name + (x.it.type === 'chop' ? '・切' : x.it.type === 'rice' ? '・裝飯' : '・下鍋'));
        btn.type = 'button';
        btn.disabled = (x.it.type === 'chop' && !!board) || (x.it.type === 'cook' && pot.st !== 'idle');
        tap(btn, function () { if (!btn.disabled && btn.isConnected) take(i, btn); });
        b.appendChild(btn);
      });
      hl();
    }
    function fly(fromEl, toId, html) {
      try { var a = fromEl.getBoundingClientRect(), b = $(toId).getBoundingClientRect(), f = el('div', 'fly', html); f.style.left = a.left + a.width / 2 - 17 + 'px'; f.style.top = a.top + 'px'; w.appendChild(f); requestAnimationFrame(function () { f.style.transform = 'translate(' + (b.left + b.width / 2 - a.left - a.width / 2) + 'px,' + (b.top + b.height / 2 - a.top - 17) + 'px) scale(.8)'; f.style.opacity = '.3'; }); setTimeout(function () { f.remove(); }, 380); } catch (x) {}
    }
    function take(i, btn) {
      var x = list[i];
      if (x.it.type === 'chop') { if (board) return; board = x; chop = 0; x.st = 'board'; fly(btn, 'ckBoard', pic(x.it)); tip('連點砧板，把' + x.it.name + '切好！'); boardState(); }
      else if (x.it.type === 'cook') { if (pot.st !== 'idle') return; x.st = 'pot'; potItems++; fly(btn, 'ckPot', pic(x.it)); tip(x.it.name + '下鍋了！'); maybeCook(); }
      else { if (pot.st === 'cooking' && false) return; x.st = 'rice'; tip('點飯鍋，把飯裝進' + (r.kind === 'bento' ? '便當盒' : '盤子')); }
      order(); tray(); boxState();
    }
    function boardState() { $('ckOnB').innerHTML = board ? pic(board.it, board.st === 'cut') : ''; $('ckCB').style.width = board ? Math.min(100, chop / CHOP * 100) + '%' : '0'; $('ckCBw').style.display = board ? '' : 'none'; }
    function maybeCook() { if (pot.st === 'idle' && potItems >= potNeed && potNeed > 0) { pot.st = 'cooking'; pot.t = Date.now(); tip('開火！顧好鍋子，好了就點爐子起鍋'); } potState(); }
    tap($('ckBasket'), function () { $('ckTray').classList.add('hl'); setTimeout(function () { var t = $('ckTray'); if (t) t.classList.remove('hl'); }, 900); tip('食材在上面的籃子裡，點一樣拿出來'); });
    tap($('ckBoard'), function () {
      if (!board) { tip('先從籃子拿要切的菜'); return; }
      if (board.st === 'cut') { tip(board.it.name + '切好了，點爐子放進鍋'); return; }
      chop++; var bd = $('ckBoard'); bd.classList.add('chop'); setTimeout(function () { bd.classList.remove('chop'); }, 80);
      if (chop >= CHOP) { board.st = 'cut'; tip(board.it.name + '切好了，點爐子放進鍋'); }
      boardState(); hl();
    });
    tap($('ckPot'), function () {
      if (board && board.st === 'cut') { if (pot.st !== 'idle') { tip('鍋子在用，等一下'); return; } board.st = 'pot'; potItems++; fly($('ckBoard'), 'ckPot', pic(board.it, true)); board = null; chop = 0; boardState(); order(); tray(); maybeCook(); return; }
      if (pot.st === 'ready' || pot.st === 'burn') {
        if (pot.st === 'burn') burnt = true;
        pot.st = 'served'; list.forEach(function (x) { if (x.st === 'pot') x.st = 'done'; }); boxFood = true; fly($('ckPot'), 'ckBox', '🥘'); tip(burnt ? '有點焦焦的…沒關係，還是很香！' : '起鍋！剛剛好～'); order(); potState(); boxState(); check(); return;
      }
      if (pot.st === 'cooking') { tip('還在煮，再等一下下'); return; }
      tip(potNeed ? '先把食材放進鍋子（切好的菜、蛋、肉、奶）' : '這道不用開火喔');
    });
    tap($('ckRice'), function () {
      var x = list.find(function (y) { return y.st === 'rice'; }) || list.find(function (y) { return y.st === 'basket' && y.it.type === 'rice'; });
      if (!x) { tip(needRice ? '飯已經裝好了' : '這道不用裝飯'); return; }
      x.st = 'done'; riceIn++; fly($('ckRice'), 'ckBox', '🍚'); tip(riceIn >= needRice ? '飯裝好了！' : '再裝一份飯'); order(); tray(); boxState(); check();
    });
    tap($('ckBox'), function () { if (!check()) tip(riceIn < needRice ? '還要裝飯（點飯鍋）' : '還要等鍋子裡的菜'); });
    function potState() {
      var s = $('ckPS'), b = $('ckPB'), bw = $('ckPBw'), im = $('ckPotImg');
      bw.className = 'bar' + (pot.st === 'ready' ? ' ok' : pot.st === 'burn' ? ' burn' : '');
      if (pot.st === 'idle') { s.textContent = potNeed ? '爐子 ' + potItems + '/' + potNeed : '爐子'; b.style.width = potNeed ? potItems / potNeed * 100 + '%' : '0'; im.innerHTML = potItems ? '<img src="' + A + 'pot_cooking.webp" alt="" style="filter:grayscale(.6)">' : ''; }
      else if (pot.st === 'cooking') { s.textContent = '煮煮煮…'; im.innerHTML = '<img src="' + A + 'pot_cooking.webp" alt=""><span class="steam">♨️</span>'; }
      else if (pot.st === 'ready') { s.textContent = '好了！快起鍋'; im.innerHTML = '<img src="' + A + 'pot_ready.webp" alt=""><span class="steam">✨</span>'; }
      else if (pot.st === 'burn') { s.textContent = '焦了！快起鍋'; im.innerHTML = '<img src="' + A + 'pot_overdone.webp" alt=""><span class="steam">💨</span>'; }
      else { s.textContent = '起鍋了'; b.style.width = '100%'; im.innerHTML = ''; }
      hl();
    }
    function boxState() {
      $('ckRS').textContent = needRice ? '飯鍋 ' + riceIn + '/' + needRice : '飯鍋';
      $('ckBoxIn').innerHTML = (riceIn ? '<span>' + '🍚'.repeat(riceIn) + '</span>' : '') + (boxFood ? '<span>🥘</span>' : '');
    }
    function hl() {
      ['ckBoard', 'ckPot', 'ckRice', 'ckBox'].forEach(function (id) { $(id).classList.remove('hl'); });
      if (board && board.st === 'board') $('ckBoard').classList.add('hl');
      else if ((board && board.st === 'cut') || pot.st === 'ready' || pot.st === 'burn') $('ckPot').classList.add('hl');
      else if (list.some(function (y) { return y.st === 'rice'; })) $('ckRice').classList.add('hl');
    }
    function check() {
      if (ended) return true;
      if (riceIn >= needRice && (boxFood || !potNeed)) {
        ended = true; clearInterval(tickT);
        var sec = Math.round((Date.now() - t0) / 1000), stars = Math.max(1, 3 - (burnt ? 1 : 0) - (sec > LIMIT ? 1 : 0));
        var d = el('div', 'done', '<div style="font-size:64px">' + (r.kind === 'bento' ? '🍱' : '🍽️') + '</div><b>' + r.name + '完成！</b><div class="stars">' + '⭐'.repeat(stars) + '<span style="opacity:.3">' + '⭐'.repeat(3 - stars) + '</span></div><p>' + sec + ' 秒' + (burnt ? '・有一點焦' : '') + (stars >= 3 ? '・完美！' : '') + '</p>');
        w.appendChild(d); setTimeout(function () { w.remove(); onDone(stars); }, 1600);
        return true;
      }
      return false;
    }
    tap($('ckHelp'), function () { if (ended) return; ended = true; clearInterval(tickT); w.remove(); onDone(0); });
    tickT = setInterval(function () {
      var sec = Math.floor((Date.now() - t0) / 1000), tk = $('ckT'); if (!tk) { clearInterval(tickT); return; }
      tk.textContent = sec + ' 秒'; tk.classList.toggle('hurry', sec > LIMIT - 10);
      if (pot.st === 'cooking' || pot.st === 'ready' || pot.st === 'burn') {
        var a = Date.now() - pot.t, b = $('ckPB');
        if (a < COOK_MS) { b.style.width = a / COOK_MS * 100 + '%'; }
        else if (a < COOK_MS + GOOD_MS) { if (pot.st !== 'ready') { pot.st = 'ready'; potState(); } b.style.width = '100%'; }
        else if (pot.st !== 'burn') { pot.st = 'burn'; potState(); }
      }
    }, 100);
    order(); tray(); boardState(); potState(); boxState();
    tip(list.some(function (x) { return x.it.type === 'chop'; }) ? '從上面的籃子拿菜，放到砧板切' : '從上面的籃子拿食材');
  }
  window.COOK = { start: start };
})();
