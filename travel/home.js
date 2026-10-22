/* D162（Dari 10/22）：小鳶在家——花園種菜、廚房煮飯（Claude × GPT G103 定稿 v1）
   規則：不產生點數、不產生可換點的便當；菜不會枯死、不限種子、可略過互動。
   港灣蓋章掃到朋友 → 解鎖那位朋友的種子與招牌菜 → 出門帶配菜 → 第一次帶完成一趟，得到那位朋友的「料理小記」。
   存在 kiteTravel1 的 S.home 子資料，不動原本 cards／limited／souvenirs。圖：GPT G103 41 張（assets/home/*.webp）。 */
(function () {
  var GROW = 60 * 60000;      // 每株 60 分鐘成熟；0／20／40 分鐘換外觀
  if (/[?&]fast=1/.test(location.search)) GROW = 60000;      // 測試：1 分鐘
  // 依港灣蓋章「站」編號；朋友 id 用 stamp 的 PAL_OF（站 → 朋友），讀 kiteFriends1 或 kiteStamp1
  var PAL_OF = { 1: 1, 2: 3, 3: 4, 4: 6, 5: 2, 6: 5 };
  var VEG = {
    base: { f: 'cabbage', lm: 'home', name: '小白菜', ic: '🥬', from: '小屋菜籃（隨時可種）' },
    s1: { f: 'sweetpotato', lm: 'center', name: '地瓜', ic: '🍠', spot: 1, from: '第 1 站・旅客服務中心的探頭小鳶' },
    s2: { f: 'corn', lm: 'cruise', name: '玉米', ic: '🌽', spot: 2, from: '第 2 站・郵輪碼頭的剛到港口小鳶' },
    s3: { f: 'tomato', lm: 'whaleshark', name: '番茄', ic: '🍅', spot: 3, from: '第 3 站・鯨鯊拍照點的鯨鯊' },
    s4: { f: 'scallion', lm: 'food', name: '青蔥', ic: '🧅', spot: 4, from: '第 4 站・美食區的小卷' },
    s5: { f: 'pumpkin', lm: 'rest', name: '南瓜', ic: '🎃', spot: 5, from: '第 5 站・休息區的打盹小鳶' },
    s6: { f: 'carrot', lm: 'exit', name: '紅蘿蔔', ic: '🥕', spot: 6, from: '第 6 站・停車場出口的海龜' }
  };
  var DISH = {
    base: { f: 'cabbage', lm: 'home', name: '青菜飯', ic: '🍚', need: { base: 2 }, story: ['小屋小記', '青菜飯做好囉。下次想一起去小屋坐坐，把今天的小故事說給小鳶聽。'] },
    s1: { f: 'sweetpotato', lm: 'center', name: '地瓜粥', ic: '🥣', need: { s1: 1, base: 1 }, story: ['旅客中心小記', '小鳶端來暖暖的地瓜粥。下次想一起去旅客服務中心，看看大家今天想去哪裡。'] },
    s2: { f: 'corn', lm: 'cruise', name: '玉米濃湯', ic: '🍲', need: { s2: 1, base: 1 }, story: ['郵輪碼頭小記', '玉米濃湯香香的。下次想一起去郵輪碼頭，找找大船上的小窗戶。'] },
    s3: { f: 'tomato', lm: 'whaleshark', name: '番茄炒蛋', ic: '🍳', need: { s3: 1, base: 1 }, story: ['鯨鯊小記', '番茄炒蛋紅紅黃黃的。下次想一起去鯨鯊拍照點，和鯨鯊朋友拍張照。'] },
    s4: { f: 'scallion', lm: 'food', name: '蔥花蛋餅', ic: '🫓', need: { s4: 1, base: 1 }, story: ['美食區小記', '蔥花蛋餅切好了。下次想一起去美食區，看看還有什麼香香的食物。'] },
    s5: { f: 'pumpkin', lm: 'rest', name: '南瓜湯', ic: '🥘', need: { s5: 1, base: 1 }, story: ['休息區小記', '南瓜湯暖呼呼的。下次想一起去室內休息區，坐一下，讓小鳶陪你休息。'] },
    s6: { f: 'carrot', lm: 'exit', name: '紅蘿蔔炒飯', ic: '🍛', need: { s6: 1, base: 1 }, story: ['回家路上小記', '紅蘿蔔炒飯裝進盒子囉。下次想一起去停車場出口，牽好大人的手，慢慢走回家。'] }
  };
  var ORDER = ['base', 's1', 's2', 's3', 's4', 's5', 's6'];
  var A = 'assets/home/';
  function img(src, cls) { return '<img class="' + (cls || 'hi') + '" src="' + A + src + '.webp" alt="" draggable="false">'; }
  function vegImg(k, st) { return img(st < 0 ? 'soil_empty' : 'crop_' + VEG[k].f + '_' + (st === 3 ? 'mature' : st === 2 ? 'growing' : 'sprout')); }
  function dishImg(k) { return img('dish_' + VEG[k].f); }
  function $(id) { return document.getElementById(id); }
  function rd(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function H() {
    if (!S.home || typeof S.home !== 'object') S.home = {};
    var h = S.home;
    if (!h.plots) { var t = Date.now() - GROW; h.plots = [{ v: 'base', t: t }, { v: 'base', t: t }]; }      // 第一次：兩株已成熟的小白菜，馬上能做第一道
    h.fridge = h.fridge || {}; h.box = h.box || {}; h.book = h.book || {}; h.stories = h.stories || {};
    return h;
  }
  function spotOpen(n) {
    var fr = rd('kiteFriends1') || {}, st = rd('kiteStamp1') || {};
    return !!(fr[PAL_OF[n]] || (st.spots && st.spots[n]));
  }
  function open(k) { return k === 'base' || spotOpen(VEG[k].spot); }
  function stage(p) { if (!p || !p.v) return -1; var a = Date.now() - p.t; return a >= GROW ? 3 : a >= GROW / 2 ? 2 : 0; }      // 芽 → 長葉 → 成熟（G103 三階段圖）
  function left(p) { var m = Math.ceil((p.t + GROW - Date.now()) / 60000); return m <= 1 ? '快好了' : '約 ' + m + ' 分鐘'; }
  function sv() { try { save(); return true; } catch (e) { return false; } }
  function modal(html) { var m = $('modal'); m.innerHTML = '<div class="sheet2 hm">' + html + '</div>'; m.classList.add('on'); return m; }
  function close() { $('modal').classList.remove('on'); render(); }
  function say(t) {      // G103 UX：面板開著時，小鳶的話放在面板最上面一行，不浮在說明上
    var hm = document.querySelector('#modal.on .hm');
    if (hm) { var e = hm.querySelector('.hmSay'); if (!e) { e = document.createElement('p'); e.className = 'hmSay'; hm.insertBefore(e, hm.firstChild); } e.textContent = '小鳶：' + t; e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); return; }
    try { toast('小鳶：' + t); } catch (x) {}
  }

  /* ===== 花園 ===== */
  function garden() {
    var h = H(), html = '<h3>🌱 小鳶的菜園</h3><p class="mu">種下去約 1 小時長好，長好了會一直等你來收，不會枯掉。</p><div class="plots">';
    h.plots.forEach(function (p, i) {
      var s = stage(p);
      html += '<button type="button" class="plot s' + s + '" data-i="' + i + '"><span class="pi">' + vegImg(s < 0 ? 'base' : p.v, s) + '</span><b>' + (s < 0 ? '空的菜圃' : VEG[p.v].name) + '</b><small>' + (s < 0 ? '點一下種菜' : s === 3 ? '長好了！點一下收成' : left(p) + '・點一下澆水') + '</small></button>';
    });
    html += '</div><p class="mu">冰箱：' + fridgeLine() + '</p><p class="mu sm">掃港灣蓋章站遇到朋友，會拿到那位朋友的種子（' + ORDER.filter(function (k) { return k !== 'base' && open(k); }).length + ' / 6）</p><div class="row"><button class="btn" id="hmKitchen">去廚房煮飯</button><button class="btn ghost" id="hmX">關閉</button></div>';
    modal(html);
    document.querySelectorAll('.plot').forEach(function (b) {
      b.onclick = function () {
        var i = +b.dataset.i, p = h.plots[i], s = stage(p);
        if (s < 0) return seedPick(i);
        if (s === 3) { h.fridge[p.v] = (h.fridge[p.v] || 0) + 1; h.plots[i] = { v: '', t: 0 }; sv(); say('收成' + VEG[p.v].name + '！放進冰箱囉～'); return garden(); }
        b.classList.remove('water'); void b.offsetWidth; b.classList.add('water'); say(['咕嚕咕嚕，喝水水～', '快快長大喔！', '葉子亮亮的耶！'][Math.floor(Math.random() * 3)]);      // 澆水只是可愛互動，不加速
      };
    });
    $('hmKitchen').onclick = function () { S.room !== 'kitchen' && setRoom('kitchen'); kitchen(); };
    $('hmX').onclick = close;
  }
  function seedPick(i) {
    var h = H(), html = '<h3>要種什麼？</h3><div class="list" style="margin:0">';
    ORDER.forEach(function (k) { var o = open(k); html += '<button type="button" class="opt" data-k="' + k + '"' + (o ? '' : ' disabled') + '><span class="ic em">' + (o ? vegImg(k, 3) : '❔') + '</span><span class="tx">' + (o ? VEG[k].name : '還沒拿到的種子') + '<small>' + VEG[k].from + '</small></span></button>'; });
    html += '</div><div class="row"><button class="btn ghost" id="hmBack">回菜園</button></div>';
    modal(html);
    document.querySelectorAll('.hm .opt[data-k]').forEach(function (b) { b.onclick = function () { h.plots[i] = { v: b.dataset.k, t: Date.now() }; sv(); say('種好了，' + VEG[b.dataset.k].name + '加油！'); garden(); }; });
    $('hmBack').onclick = garden;
  }
  function fridgeLine() { var h = H(), a = ORDER.filter(function (k) { return h.fridge[k]; }).map(function (k) { return VEG[k].ic + VEG[k].name + '×' + h.fridge[k]; }); return a.length ? a.join('　') : '空空的'; }

  /* ===== 廚房 ===== */
  function canCook(k) { var h = H(), n = DISH[k].need; return Object.keys(n).every(function (v) { return (h.fridge[v] || 0) >= n[v]; }); }
  function needLine(k) { var n = DISH[k].need; return Object.keys(n).map(function (v) { return VEG[v].name + '×' + n[v]; }).join('＋') + '＋家裡的米和蛋'; }
  function lack(k) { var h = H(), n = DISH[k].need, a = []; Object.keys(n).forEach(function (v) { var d = n[v] - (h.fridge[v] || 0); if (d > 0) a.push(VEG[v].name + '×' + d); }); return a.join('、'); }
  function kitchen() {
    var h = H();
    if (S.state !== 'home' && S.state !== 'back') { modal('<h3>🍳 廚房</h3><p>小鳶出門了，等牠回家再一起煮飯吧！菜園的菜還是會自己長大喔。</p><div class="row"><button class="btn" id="hmX">好</button></div>'); $('hmX').onclick = close; return; }
    var html = '<h3>🍳 小鳶的廚房</h3><p class="mu">冰箱：' + fridgeLine() + '</p><div class="list" style="margin:0">';
    ORDER.forEach(function (k) {
      var d = DISH[k], o = open(k), ok = o && canCook(k);
      html += '<button type="button" class="opt' + (ok ? ' can' : '') + '" data-k="' + k + '"' + (ok ? '' : ' disabled') + '><span class="ic em">' + (o ? dishImg(k) : '❔') + '</span><span class="tx">' + (o ? d.name + (h.book[k] ? '' : ' <em class="nw">新菜</em>') : '還沒學會的招牌菜') + '<small>' + (o ? needLine(k) + '<br>' + (ok ? '<b class="ok">材料齊了，點一下開始做</b>' : '<b class="no">還缺 ' + lack(k) + '</b>') : '認識' + VEG[k].from.split('的').pop() + '後就會學到') + '</small></span><span class="n">' + (h.box[k] ? '料理盒 ' + h.box[k] : '') + '</span></button>';
    });
    html += '</div><p class="mu sm">做好的菜放進料理盒，打包出門時可以帶一份當配菜。家常菜不能換點數。</p><div class="row"><button class="btn ghost" id="hmGarden">去菜園</button><button class="btn ghost" id="hmX">關閉</button></div>';
    modal(html);
    document.querySelectorAll('.hm .opt[data-k]').forEach(function (b) { b.onclick = function () { cook(b.dataset.k); }; });
    $('hmGarden').onclick = function () { S.room !== 'garden' && setRoom('garden'); garden(); };
    $('hmX').onclick = close;
  }
  function cook(k) {
    var d = DISH[k], prog = 0, done = false;
    modal('<h3>做' + d.name + '</h3><p class="mu">點鍋子幫小鳶攪拌（也可以讓小鳶自己做好）</p><button type="button" class="pot" id="hmPot" aria-label="攪拌">' + img('pot_still', 'potI') + '</button><div class="bar"><i id="hmBar"></i></div><div class="row"><button class="btn ghost" id="hmAuto">請小鳶幫忙做好</button></div>');
    function finish() {
      if (done) return; done = true;
      var h = H(), n = d.need;
      if (!canCook(k)) { close(); return; }      // 雙頁同開等：材料不夠就不出菜
      Object.keys(n).forEach(function (v) { h.fridge[v] -= n[v]; if (!h.fridge[v]) delete h.fridge[v]; });
      var first = !h.book[k]; h.book[k] = h.book[k] || Date.now(); h.box[k] = (h.box[k] || 0) + 1;
      if (!sv()) { Object.keys(n).forEach(function (v) { h.fridge[v] = (h.fridge[v] || 0) + n[v]; }); h.box[k]--; if (first) delete h.book[k]; toast('手機存不下來，這次先不算'); return; }
      modal('<div class="dish">' + dishImg(k) + '</div><h3 style="text-align:center">' + d.name + '做好了！</h3><p style="text-align:center">' + (first ? '第一次做，收進菜譜冊了！<br>' : '') + '放進料理盒，打包出門時可以帶一份。</p><div class="row"><button class="btn" id="hmOk">好</button></div>');
      $('hmOk').onclick = kitchen; try { BGM.sfx && BGM.sfx('pop'); } catch (e) {}
    }
    function bump() { prog = Math.min(100, prog + 9); var b = $('hmBar'); if (b) b.style.width = prog + '%'; var p = $('hmPot'); if (p) { var pi = p.querySelector('img'); pi.src = A + 'pot_stir.webp'; clearTimeout(bump.t); bump.t = setTimeout(function () { pi.src = A + 'pot_still.webp'; }, 220); p.classList.remove('stir'); void p.offsetWidth; p.classList.add('stir'); } if (prog >= 100) setTimeout(finish, 250); }
    $('hmPot').onclick = bump; $('hmAuto').onclick = function () { prog = 100; finish(); };
  }

  /* ===== 打包配菜、回家小記 ===== */
  var side = '';
  function packHTML() {
    var h = H(), ks = ORDER.filter(function (k) { return h.box[k]; });
    if (!ks.length) return '<h3>配菜（可不帶）</h3><p class="pad muted" style="margin:0 16px;font-size:13px">料理盒空空的。不帶也能照常出發；想帶的話，到花園種菜、廚房煮一道。</p>';
    if (side && !h.box[side]) side = '';
    return '<h3>配菜（可不帶）</h3><p class="pad muted" style="margin:0 16px 6px;font-size:12px">不帶也能照常出發。出發時才會從料理盒拿走一份。</p><div class="list">' + ks.map(function (k) { var d = DISH[k], on = side === k; return '<button type="button" class="opt" data-side="' + k + '" aria-pressed="' + on + '"><span class="ic em">' + dishImg(k) + '</span><span class="tx">' + d.name + '<small>' + (on ? '<b class="ok">已選帶 1 份・再點一次取消</b><br>' : '') + (h.stories[k] ? '已經拿過小記，再帶會多一段小故事' : '第一次帶出門，回來會有一張料理小記') + '</small></span><span class="n">' + h.box[k] + '</span></button>'; }).join('') + '</div>';
  }
  function bindPack(rerender) { document.querySelectorAll('[data-side]').forEach(function (b) { b.onclick = function () { side = side === b.dataset.side ? '' : b.dataset.side; rerender(); };      // G103 UX：選中狀態寫在卡片上，不再跳浮動提示蓋住出發資訊 }); }
  function onDepart(trip) { var h = H(); if (side && h.box[side] > 0) { h.box[side]--; trip.side = side; } side = ''; }
  function onReset() { side = ''; }
  function letterExtra(tr) {      // 回信時呼叫一次；第一次帶那道菜 → 收下料理小記
    if (!tr || !tr.side || !DISH[tr.side]) return '';
    var h = H(), k = tr.side, d = DISH[k];
    if (!tr.sideDone) { tr.sideDone = h.stories[k] ? 'again' : 'new'; if (!h.stories[k]) h.stories[k] = Date.now(); sv(); }
    return tr.sideDone === 'new' ? d.ic + ' 帶了' + d.name + '，收到一張「' + d.story[0] + '」（在廚房菜譜冊）' : d.ic + ' 路上吃了' + d.name + '，小鳶說好好吃！';
  }
  function book() {
    var h = H(), html = '<h3>📖 菜譜冊與料理小記</h3><div class="list" style="margin:0">';
    ORDER.forEach(function (k) { var d = DISH[k], has = h.book[k], st = h.stories[k]; html += '<button type="button" class="opt"' + (st ? ' data-st="' + k + '"' : ' disabled') + (has ? '' : ' style="opacity:.5"') + '><span class="ic em">' + (st ? img('landmark_' + VEG[k].lm) : has ? dishImg(k) : '❔') + '</span><span class="tx">' + (has ? d.name : '還沒做過') + '<small>' + (st ? '<b>' + d.story[0] + '</b>・點一下看' : has ? '帶這道菜出門一趟，就會收到料理小記' : '') + '</small></span></button>'; });
    html += '</div><p class="mu sm">小記存在這台手機，換手機或清除資料可能會看不到。</p><div class="row"><button class="btn ghost" id="hmK">回廚房</button></div>';
    modal(html); $('hmK').onclick = kitchen;
    document.querySelectorAll('[data-st]').forEach(function (b) { b.onclick = function () { story(b.dataset.st); }; });
  }
  function story(k) {      // 料理小記卡：共用卡面＋地標＋料理
    var d = DISH[k];
    modal('<div class="stc"><div class="stIn">' + img('landmark_' + VEG[k].lm, 'stL') + dishImg(k).replace('class="hi"', 'class="stD"') + '<b>' + d.story[0] + '</b><p>' + d.story[1] + '</p></div></div><div class="row"><button class="btn" id="hmBk">回菜譜冊</button></div>');
    $('hmBk').onclick = book;
  }

  /* ===== 房間裡的按鈕（花園、廚房才出現）＋客廳提醒 ===== */
  function render() {
    var wrap = document.querySelector('.roomwrap'); if (!wrap || typeof S === 'undefined') return;
    var b = $('hmAct'); if (!b) { b = document.createElement('div'); b.id = 'hmAct'; wrap.appendChild(b); }
    var h = H(), rid = S.room, ripe = h.plots.filter(function (p) { return stage(p) === 3; }).length, empty = h.plots.filter(function (p) { return stage(p) < 0; }).length, cookable = ORDER.some(function (k) { return open(k) && canCook(k); });
    var btns = '';
    if (rid === 'garden') btns = '<button type="button" id="hmG">' + img('button_garden', 'bi') + '菜園' + (ripe ? '<small>・可收成 ' + ripe + '</small><em>' + ripe + '</em>' : empty ? '<small>・可以種</small>' : '') + '</button>';
    else if (rid === 'kitchen') btns = '<button type="button" id="hmC">' + img('button_kitchen', 'bi') + '煮飯' + (cookable ? '<small>・材料齊了</small><em>!</em>' : '') + '</button><button type="button" id="hmB">📖 菜譜冊</button>';
    else if (rid === 'living' && S.state === 'home' && (ripe || cookable)) btns = '<button type="button" id="hmL">' + (ripe ? img('button_garden', 'bi') + '菜長好了' : img('button_kitchen', 'bi') + '想煮一道嗎') + '</button>';
    b.innerHTML = btns;
    if ($('hmG')) $('hmG').onclick = garden;
    if ($('hmC')) $('hmC').onclick = kitchen;
    if ($('hmB')) $('hmB').onclick = book;
    if ($('hmL')) $('hmL').onclick = function () { if (ripe) { setRoom('garden'); garden(); } else { setRoom('kitchen'); kitchen(); } };
  }
  var css = document.createElement('style');
  css.textContent = '#hmAct{position:absolute;right:10px;bottom:10px;z-index:4;display:flex;gap:8px}' +
    '#hmAct button{position:relative;display:inline-flex;align-items:center;gap:4px;min-height:44px;padding:6px 14px 6px 8px;border:0;border-radius:999px;background:#FFFDF8;color:#4A3426;font:700 15px/1 inherit;font-family:inherit;box-shadow:0 3px 10px rgba(0,0,0,.22);cursor:pointer}' +
    '#hmAct em{position:absolute;top:-6px;right:-4px;min-width:20px;height:20px;border-radius:10px;background:#E8674A;color:#fff;font:700 12px/20px sans-serif;font-style:normal;text-align:center;padding:0 4px}' +
    '#hmAct .bi{width:32px;height:32px}#hmAct small{font-size:12px;font-weight:700;color:#3E7B45}' +
    '.hi{width:100%;height:100%;object-fit:contain;display:block}.opt .em .hi{width:44px;height:44px}' +
    '.hmSay{margin:-4px 0 8px;padding:6px 10px;border-radius:10px;background:#FFF1CC;color:#5B4A3A;font-weight:700;font-size:13px}.hmSay.pop{animation:hmP .35s}@keyframes hmP{40%{transform:scale(1.04)}}' +
    '.hm .ok{color:#2F7A3A}.hm .no{color:#B4562F}.opt.can{border-color:#3E9B4F}' +
    '.potI{width:180px;height:180px;object-fit:contain}' +
    '.stc{background:url(' + A + 'card_shared.webp) center/100% 100% no-repeat;aspect-ratio:3/2;border-radius:10px;box-shadow:0 4px 14px rgba(0,0,0,.18);position:relative}' +
    '.stIn{position:absolute;inset:12% 10%;display:grid;grid-template-columns:30% 1fr;grid-template-rows:auto 1fr;gap:2px 10px;align-items:start}.stL{grid-row:1/3;width:100%;object-fit:contain}.stD{position:absolute;right:-4%;bottom:-8%;width:24%}.stIn b{font-size:15px}.stIn p{margin:0;font-size:13px;line-height:1.55;padding-right:18%}' +
    '.hm{max-height:86vh;overflow:auto}.hm h3{margin:0 0 8px}.hm .mu{color:var(--muted);font-size:13px;margin:6px 0}.hm .sm{font-size:12px}.hm .row{display:flex;gap:8px;margin-top:12px}.hm .row .btn{flex:1}' +
    '.opt .em,.hm .em{font-size:34px;line-height:44px;text-align:center}.hm .nw{font-style:normal;font-size:11px;background:#E8674A;color:#fff;border-radius:6px;padding:1px 5px;margin-left:4px}' +
    '.plots{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:8px 0}' +
    '.plot{display:flex;flex-direction:column;align-items:center;gap:2px;padding:12px 6px;border-radius:16px;border:2px solid #C9A77A;background:#FFF8EA;font-family:inherit;color:inherit;cursor:pointer}' +
    '.plot .pi{width:96px;height:96px}.plot.s3{border-color:#3E9B4F;box-shadow:0 0 0 3px rgba(62,155,79,.25)}.plot small{font-size:12px;color:var(--muted)}' +
    '.plot.water .pi{animation:hmW .7s}@keyframes hmW{30%{transform:translateY(-6px) rotate(-6deg)}60%{transform:translateY(0) rotate(6deg)}}' +
    '.pot{display:block;margin:6px auto;padding:0;background:none;border:0;cursor:pointer;min-height:96px}.pot.stir{animation:hmS .3s}@keyframes hmS{50%{transform:rotate(-14deg) scale(1.05)}}' +
    '.bar{height:12px;border-radius:6px;background:#EADFCB;overflow:hidden}.bar i{display:block;height:100%;width:0;background:#E39A1F;transition:width .2s}' +
    '.dish{width:160px;height:160px;margin:0 auto;animation:hmD .6s}@keyframes hmD{0%{transform:scale(.3)}70%{transform:scale(1.15)}}';
  document.head.appendChild(css);
  window.HOME = { render: render, garden: garden, kitchen: kitchen, book: book, packHTML: packHTML, bindPack: bindPack, onDepart: onDepart, onReset: onReset, letterExtra: letterExtra, _GROW: function () { return GROW; } };
  setInterval(function () { if ($('home') && $('home').classList.contains('on') && !$('modal').classList.contains('on')) render(); }, 15000);
  if (document.readyState !== 'loading') setTimeout(render, 0); else document.addEventListener('DOMContentLoaded', render);
})();
