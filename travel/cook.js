/* D165（Dari 10/23）：廚房小遊戲 v1——參考「胡鬧廚房」的單人版：
   畫面前面跳出廚具台（小鳶在後面廚房），照菜單把食材「拿 → 切 → 下鍋 → 顧火 → 起鍋 → 裝盒」。
   切菜要連點砧板；鍋子煮好有一段「剛剛好」時間，太久會焦（焦了還是能吃，只是星星少）。
   不影響點數或券；星星只記在菜譜冊。可以隨時按「請小鳶幫忙做好」跳過。圖先用 emoji＋CSS，等 GPT 出廚具台圖。 */
(function () {
  var CHOP = 5, COOK_MS = 3500, GOOD_MS = 3200, LIMIT = 45;
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  var css = el('style');
  css.textContent = '.ck{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;justify-content:flex-end;max-width:430px;margin:0 auto;background:linear-gradient(rgba(30,20,10,.15),rgba(30,20,10,.55) 45%);font-family:inherit;touch-action:manipulation;-webkit-user-select:none;user-select:none}' +
    '.ck .top{position:absolute;left:10px;right:10px;top:10px;display:flex;align-items:center;gap:8px;background:rgba(255,253,248,.95);border-radius:14px;padding:8px 10px;box-shadow:0 3px 10px rgba(0,0,0,.2)}' +
    '.ck .top b{font-size:15px}.ck .top .tk{margin-left:auto;font:800 16px/1 sans-serif;color:#2F7A3A}.ck .top .tk.hurry{color:#C0392B}' +
    '.ck .order{position:absolute;left:10px;right:10px;top:62px;display:flex;gap:6px;flex-wrap:wrap}.ck .order span{background:#FFF8EA;border:2px solid #E5D49B;border-radius:10px;padding:3px 8px;font-size:13px;font-weight:700}.ck .order span.ok{background:#E3F4E5;border-color:#3E9B4F;text-decoration:line-through;color:#2F7A3A}' +
    '.ck .tip{margin:0 12px 10px;padding:8px 12px;border-radius:12px;background:rgba(255,241,204,.96);color:#5B4A3A;text-align:center;font-weight:800;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,.25)}' +
    '.ck .counter{position:relative;background:linear-gradient(#C99A6B 0 9%,#A8774B 9% 11%,#E9D8BC 11%);border-radius:22px 22px 0 0;box-shadow:0 -6px 20px rgba(0,0,0,.35);display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:auto auto;gap:10px;padding:22px 12px 12px}' +
    '.ck .st{position:relative;border:0;border-radius:16px;background:rgba(255,255,255,.55);box-shadow:inset 0 -4px 0 rgba(0,0,0,.08);display:flex;flex-direction:column;align-items:center;justify-content:center;font:700 12px/1.2 inherit;font-family:inherit;color:#4A3426;cursor:pointer;padding:6px 4px;min-height:118px;width:100%}' +
    '.ck .st .ic{font-size:40px;line-height:1.1}.ck .st small{font-size:11px;color:#7A5A3A}.ck .st.hl{box-shadow:0 0 0 3px #F4BB42,inset 0 -4px 0 rgba(0,0,0,.08);animation:ckP 1s infinite}@keyframes ckP{50%{transform:scale(1.04)}}' +
    '.ck .basket{grid-column:1/4;flex-direction:row;flex-wrap:wrap;gap:6px;min-height:64px;justify-content:flex-start;align-content:flex-start;padding:8px;background:#8B5E3C;cursor:default}.ck .basket:empty::after{content:"籃子空了";color:#F3E3C8;font-size:13px;margin:auto}'+'.ck .basket button{border:0;border-radius:12px;background:#FFF8EA;padding:6px 8px;font:700 13px/1.1 inherit;font-family:inherit;display:flex;align-items:center;gap:4px;min-height:44px;cursor:pointer}.ck .basket button[disabled]{opacity:.35}.ck .basket button .e{font-size:22px}' +
    '.ck .board .ic{transition:transform .08s}.ck .board.chop .ic{transform:rotate(-18deg) translateY(4px)}.ck .bar{width:80%;height:8px;border-radius:4px;background:rgba(0,0,0,.12);overflow:hidden;margin-top:4px}.ck .bar i{display:block;height:100%;width:0;background:#E39A1F}' +
    '.ck .pot.cooking .ic{animation:ckB .5s infinite}@keyframes ckB{50%{transform:translateY(-3px)}}.ck .pot.ready{background:#DDF3DF}.ck .pot.ready .bar i{background:#3E9B4F}.ck .pot.burn{background:#F7D6CF}.ck .pot.burn .bar i{background:#C0392B}' +
    '.ck .steam{position:absolute;top:-6px;font-size:18px;animation:ckS 1.2s infinite;opacity:.8}@keyframes ckS{to{transform:translateY(-16px);opacity:0}}' +
    '.ck .box .ic{font-size:44px}.ck .row{display:flex;gap:8px;padding:8px 12px calc(10px + env(safe-area-inset-bottom,0px));background:#E9D8BC}.ck .row .btn{flex:1}' +
    '.ck .fly{position:fixed;z-index:70;font-size:30px;pointer-events:none;transition:transform .35s ease-in,opacity .35s}' +
    '.ck .done{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(30,20,10,.55);color:#fff;text-align:center;gap:6px}.ck .done .stars{font-size:44px;letter-spacing:4px}.ck .done b{font-size:20px}';
  document.head.appendChild(css);

  /* recipe：{ name, need:{k:n}, kind:'bento'|'dish', items:{k:{name,e,type}} }；type：chop 要切、cook 直接下鍋、rice 裝飯 */
  function start(r, onDone) {
    var t0 = Date.now(), burnt = false, chopsTotal = 0, ended = false, tickT;
    var list = [];      // 要處理的每一份食材
    Object.keys(r.need).forEach(function (k) { for (var i = 0; i < r.need[k]; i++) list.push({ k: k, it: r.items[k], st: 'basket' }); });
    var needRice = list.filter(function (x) { return x.it.type === 'rice'; }).length, riceIn = 0;
    var potItems = 0, potNeed = list.filter(function (x) { return x.it.type !== 'rice'; }).length;
    var board = null, chop = 0, pot = { st: 'idle', t: 0 }, boxFood = false;
    var w = el('div', 'ck');
    w.innerHTML = '<div class="top"><b>做' + r.name + '</b><span class="tk" id="ckT">0 秒</span></div><div class="order" id="ckO"></div><div class="tip" id="ckTip"></div>' +
      '<div class="counter"><button class="st board" id="ckBoard"><span class="ic">🪵</span>砧板<small>連點切菜</small><span class="bar"><i id="ckCB"></i></span></button>' +
      '<button class="st pot" id="ckPot"><span class="ic">🍲</span>鍋子<small id="ckPS">放食材進來</small><span class="bar"><i id="ckPB"></i></span></button>' +
      '<button class="st box" id="ckBox"><span class="ic">' + (r.kind === 'bento' ? '🍱' : '🍽️') + '</span>' + (r.kind === 'bento' ? '便當盒' : '盤子') + '<small id="ckBS">等飯和菜</small></button>' +
      '<div class="st basket" id="ckBasket"></div></div><div class="row"><button class="btn ghost" id="ckHelp">請小鳶幫忙做好</button></div>';
    document.body.appendChild(w);
    function tip(t) { $('ckTip').textContent = t; }
    function order() {
      $('ckO').innerHTML = list.map(function (x) { return '<span class="' + (x.st === 'done' ? 'ok' : '') + '">' + x.it.e + x.it.name + '</span>'; }).join('') + (needRice ? '' : '');
    }
    function basket() {
      var b = $('ckBasket'); b.innerHTML = '';
      list.forEach(function (x, i) {
        if (x.st !== 'basket') return;
        var btn = el('button', '', '<span class="e">' + x.it.e + '</span>' + x.it.name + (x.it.type === 'chop' ? '・要切' : x.it.type === 'rice' ? '・裝飯' : '・下鍋'));
        btn.type = 'button';
        btn.disabled = (x.it.type === 'chop' && !!board) || (x.it.type === 'cook' && pot.st !== 'idle') || (x.it.type === 'rice' && false);
        btn.onclick = function () { take(i, btn); };
        b.appendChild(btn);
      });
      hl();
    }
    function fly(fromEl, toId, e) {
      try { var a = fromEl.getBoundingClientRect(), b = $(toId).getBoundingClientRect(), f = el('div', 'fly', e); f.style.left = a.left + a.width / 2 - 15 + 'px'; f.style.top = a.top + 'px'; w.appendChild(f); requestAnimationFrame(function () { f.style.transform = 'translate(' + (b.left + b.width / 2 - a.left - a.width / 2) + 'px,' + (b.top + 10 - a.top) + 'px) scale(.8)'; f.style.opacity = '.2'; }); setTimeout(function () { f.remove(); }, 380); } catch (x) {}
    }
    function take(i, btn) {
      var x = list[i];
      if (x.it.type === 'chop') { if (board) return; board = x; chop = 0; x.st = 'board'; fly(btn, 'ckBoard', x.it.e); tip('連點砧板，把' + x.it.name + '切好！'); }
      else if (x.it.type === 'cook') { if (pot.st !== 'idle') return; x.st = 'pot'; potItems++; fly(btn, 'ckPot', x.it.e); tip(x.it.name + '下鍋了！'); maybeCook(); }
      else { x.st = 'done'; riceIn++; fly(btn, 'ckBox', x.it.e); tip('飯裝好了！'); }
      order(); basket(); boxState();
    }
    function maybeCook() { if (pot.st === 'idle' && potItems >= potNeed && potNeed > 0) { pot.st = 'cooking'; pot.t = Date.now(); tip('開火！顧好鍋子，好了就點鍋子起鍋'); } potState(); }
    $('ckBoard').onclick = function () {
      if (!board) { tip('先從下面的籃子拿要切的菜'); return; }
      chop++; chopsTotal++; var bd = $('ckBoard'); bd.classList.add('chop'); setTimeout(function () { bd.classList.remove('chop'); }, 80);
      $('ckCB').style.width = Math.min(100, chop / CHOP * 100) + '%';
      if (chop >= CHOP) { board.st = 'cut'; tip(board.it.name + '切好了，點鍋子放進去'); }
    };
    $('ckPot').onclick = function () {
      if (board && board.st === 'cut') { if (pot.st !== 'idle') { tip('鍋子在用，等一下'); return; } board.st = 'pot'; potItems++; fly($('ckBoard'), 'ckPot', board.it.e); board = null; chop = 0; $('ckCB').style.width = '0'; order(); basket(); maybeCook(); return; }
      if (pot.st === 'ready' || pot.st === 'burn') {
        if (pot.st === 'burn') burnt = true;
        pot.st = 'served'; list.forEach(function (x) { if (x.st === 'pot') x.st = 'done'; }); boxFood = true; fly($('ckPot'), 'ckBox', '🥘'); tip(burnt ? '有點焦焦的…沒關係，還是很香！' : '起鍋！剛剛好～'); order(); potState(); boxState(); check(); return;
      }
      if (pot.st === 'cooking') { tip('還在煮，再等一下下'); return; }
      tip(potNeed ? '把食材放進鍋子' : '這道不用開火喔');
    };
    $('ckBox').onclick = function () { check(true); };
    function potState() {
      var p = $('ckPot'); p.classList.remove('cooking', 'ready', 'burn'); var s = $('ckPS'), b = $('ckPB');
      if (pot.st === 'idle') { s.textContent = potItems + ' / ' + potNeed + ' 樣食材'; b.style.width = potNeed ? potItems / potNeed * 100 + '%' : '0'; }
      else if (pot.st === 'cooking') { p.classList.add('cooking'); s.textContent = '煮煮煮…'; }
      else if (pot.st === 'ready') { p.classList.add('ready'); s.textContent = '好了！快點起鍋'; }
      else if (pot.st === 'burn') { p.classList.add('burn'); s.textContent = '焦了！快起鍋'; }
      else { s.textContent = '起鍋了'; b.style.width = '100%'; }
      hl();
    }
    function boxState() { $('ckBS').textContent = (needRice ? '飯 ' + riceIn + '/' + needRice + '・' : '') + (potNeed ? (boxFood ? '菜 ✓' : '等菜') : ''); }
    function hl() {
      ['ckBoard', 'ckPot', 'ckBox'].forEach(function (id) { $(id).classList.remove('hl'); });
      if (board && board.st === 'board') $('ckBoard').classList.add('hl');
      else if ((board && board.st === 'cut') || pot.st === 'ready' || pot.st === 'burn') $('ckPot').classList.add('hl');
    }
    function check() {
      if (ended) return;
      if (riceIn >= needRice && (boxFood || !potNeed)) {
        ended = true; clearInterval(tickT);
        var sec = Math.round((Date.now() - t0) / 1000), stars = 3 - (burnt ? 1 : 0) - (sec > LIMIT ? 1 : 0);
        var d = el('div', 'done', '<div style="font-size:64px">' + (r.kind === 'bento' ? '🍱' : '🍽️') + '</div><b>' + r.name + '完成！</b><div class="stars">' + '⭐'.repeat(Math.max(1, stars)) + '<span style="opacity:.3">' + '⭐'.repeat(3 - Math.max(1, stars)) + '</span></div><p>' + sec + ' 秒' + (burnt ? '・有一點焦' : '') + (stars >= 3 ? '・完美！' : '') + '</p>');
        w.appendChild(d); setTimeout(function () { w.remove(); onDone(Math.max(1, stars)); }, 1600);
      }
    }
    $('ckHelp').onclick = function () { if (ended) return; ended = true; clearInterval(tickT); w.remove(); onDone(0); };
    tickT = setInterval(function () {
      var sec = Math.floor((Date.now() - t0) / 1000), tk = $('ckT'); if (!tk) { clearInterval(tickT); return; }
      tk.textContent = sec + ' 秒'; tk.classList.toggle('hurry', sec > LIMIT - 10);
      if (pot.st === 'cooking' || pot.st === 'ready' || pot.st === 'burn') {
        var a = Date.now() - pot.t, b = $('ckPB');
        if (a < COOK_MS) { pot.st = 'cooking'; b.style.width = a / COOK_MS * 100 + '%'; }
        else if (a < COOK_MS + GOOD_MS) { if (pot.st !== 'ready') { pot.st = 'ready'; potState(); } b.style.width = '100%'; }
        else if (pot.st !== 'burn') { pot.st = 'burn'; potState(); }
      }
    }, 100);
    order(); basket(); potState(); boxState();
    tip(list.some(function (x) { return x.it.type === 'chop'; }) ? '從下面的籃子拿菜，放到砧板切' : '從下面的籃子拿食材');
  }
  window.COOK = { start: start };
})();
