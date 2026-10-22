/* D162（Dari 10/22）：小鳶在家——花園種菜、廚房煮飯（Claude × GPT G103 定稿 v1）
   規則：不產生點數、不產生可換點的便當；菜不會枯死、不限種子、可略過互動。
   港灣蓋章掃到朋友 → 解鎖那位朋友的種子與招牌菜 → 出門帶配菜 → 第一次帶完成一趟，得到那位朋友的「料理小記」。
   存在 kiteTravel1 的 S.home 子資料，不動原本 cards／limited／souvenirs。圖示先用 emoji（暫用，等 GPT 出圖）。 */
(function () {
  var GROW = 60 * 60000;      // 每株 60 分鐘成熟；0／20／40 分鐘換外觀
  if (/[?&]fast=1/.test(location.search)) GROW = 60000;      // 測試：1 分鐘
  // 依港灣蓋章「站」編號；朋友 id 用 stamp 的 PAL_OF（站 → 朋友），讀 kiteFriends1 或 kiteStamp1
  var PAL_OF = { 1: 1, 2: 3, 3: 4, 4: 6, 5: 2, 6: 5 };
  var VEG = {
    base: { name: '小白菜', ic: '🥬', from: '小屋菜籃（隨時可種）' },
    s1: { name: '地瓜', ic: '🍠', spot: 1, from: '第 1 站・旅客服務中心的探頭小鳶' },
    s2: { name: '玉米', ic: '🌽', spot: 2, from: '第 2 站・郵輪碼頭的剛到港口小鳶' },
    s3: { name: '番茄', ic: '🍅', spot: 3, from: '第 3 站・鯨鯊拍照點的鯨鯊' },
    s4: { name: '青蔥', ic: '🧅', spot: 4, from: '第 4 站・美食區的小卷' },
    s5: { name: '南瓜', ic: '🎃', spot: 5, from: '第 5 站・休息區的打盹小鳶' },
    s6: { name: '紅蘿蔔', ic: '🥕', spot: 6, from: '第 6 站・停車場出口的海龜' }
  };
  var DISH = {
    base: { name: '青菜飯', ic: '🍚', need: { base: 2 }, story: ['小屋小記', '今天自己種、自己煮的青菜飯，配著海風吃，好香喔。下次也想帶去港邊，邊吃邊看船。'] },
    s1: { name: '地瓜粥', ic: '🥣', need: { s1: 1, base: 1 }, story: ['旅客中心小記', '探頭小鳶說，第一次來港口的人，喝一碗暖暖的地瓜粥就不緊張了。下次想一起去門口迎接新朋友。'] },
    s2: { name: '玉米濃湯', ic: '🍲', need: { s2: 1, base: 1 }, story: ['郵輪碼頭小記', '大船上的廚師也會煮玉米濃湯嗎？我一邊喝一邊數船，數到第三艘湯就喝完了。下次想一起去碼頭邊看大船靠岸。'] },
    s3: { name: '番茄炒蛋', ic: '🍳', need: { s3: 1, base: 1 }, story: ['鯨鯊小記', '鯨鯊說牠吃的是很小很小的浮游生物，番茄炒蛋就留給我吃吧！下次想一起去拍照點跟牠打招呼。'] },
    s4: { name: '蔥花蛋餅', ic: '🫓', need: { s4: 1, base: 1 }, story: ['美食區小記', '小卷說港邊的點心攤都在這附近，我學會捲蛋餅了！下次想一起去美食區聞聞香香的味道。'] },
    s5: { name: '南瓜湯', ic: '🥘', need: { s5: 1, base: 1 }, story: ['休息區小記', '下雨天在休息區喝南瓜湯，打盹小鳶又睡著了。下次想一起去坐坐，等雨停。'] },
    s6: { name: '紅蘿蔔炒飯', ic: '🍛', need: { s6: 1, base: 1 }, story: ['回家路上小記', '海龜說吃紅蘿蔔眼睛會亮亮的，晚上回家才看得到路。下次想一起在停車場出口說「下次見」。'] }
  };
  var ORDER = ['base', 's1', 's2', 's3', 's4', 's5', 's6'];
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
  function stage(p) { if (!p || !p.v) return -1; var a = Date.now() - p.t; return a >= GROW ? 3 : a >= GROW * 2 / 3 ? 2 : a >= GROW / 3 ? 1 : 0; }
  function left(p) { var m = Math.ceil((p.t + GROW - Date.now()) / 60000); return m <= 1 ? '快好了' : '約 ' + m + ' 分鐘'; }
  function sv() { try { save(); return true; } catch (e) { return false; } }
  function modal(html) { var m = $('modal'); m.innerHTML = '<div class="sheet2 hm">' + html + '</div>'; m.classList.add('on'); return m; }
  function close() { $('modal').classList.remove('on'); render(); }
  function say(t) { try { toast('小鳶：' + t); } catch (e) {} }

  /* ===== 花園 ===== */
  function garden() {
    var h = H(), html = '<h3>🌱 小鳶的菜園</h3><p class="mu">種下去約 1 小時長好，長好了會一直等你來收，不會枯掉。</p><div class="plots">';
    h.plots.forEach(function (p, i) {
      var s = stage(p), ic = s < 0 ? '🟫' : s === 0 ? '🫘' : s === 1 ? '🌱' : s === 2 ? '🌿' : VEG[p.v].ic;
      html += '<button type="button" class="plot s' + s + '" data-i="' + i + '"><span class="pi">' + ic + '</span><b>' + (s < 0 ? '空的菜圃' : VEG[p.v].name) + '</b><small>' + (s < 0 ? '點一下種菜' : s === 3 ? '長好了！點一下收成' : left(p) + '・點一下澆水') + '</small></button>';
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
    ORDER.forEach(function (k) { var o = open(k); html += '<button type="button" class="opt" data-k="' + k + '"' + (o ? '' : ' disabled') + '><span class="ic em">' + (o ? VEG[k].ic : '❔') + '</span><span class="tx">' + (o ? VEG[k].name : '還沒拿到的種子') + '<small>' + VEG[k].from + '</small></span></button>'; });
    html += '</div><div class="row"><button class="btn ghost" id="hmBack">回菜園</button></div>';
    modal(html);
    document.querySelectorAll('.hm .opt[data-k]').forEach(function (b) { b.onclick = function () { h.plots[i] = { v: b.dataset.k, t: Date.now() }; sv(); say('種好了，' + VEG[b.dataset.k].name + '加油！'); garden(); }; });
    $('hmBack').onclick = garden;
  }
  function fridgeLine() { var h = H(), a = ORDER.filter(function (k) { return h.fridge[k]; }).map(function (k) { return VEG[k].ic + VEG[k].name + '×' + h.fridge[k]; }); return a.length ? a.join('　') : '空空的'; }

  /* ===== 廚房 ===== */
  function canCook(k) { var h = H(), n = DISH[k].need; return Object.keys(n).every(function (v) { return (h.fridge[v] || 0) >= n[v]; }); }
  function needLine(k) { var n = DISH[k].need; return Object.keys(n).map(function (v) { return VEG[v].name + '×' + n[v]; }).join('＋') + '＋白米'; }
  function kitchen() {
    var h = H();
    if (S.state !== 'home' && S.state !== 'back') { modal('<h3>🍳 廚房</h3><p>小鳶出門了，等牠回家再一起煮飯吧！菜園的菜還是會自己長大喔。</p><div class="row"><button class="btn" id="hmX">好</button></div>'); $('hmX').onclick = close; return; }
    var html = '<h3>🍳 小鳶的廚房</h3><p class="mu">冰箱：' + fridgeLine() + '</p><div class="list" style="margin:0">';
    ORDER.forEach(function (k) {
      var d = DISH[k], o = open(k), ok = o && canCook(k);
      html += '<button type="button" class="opt" data-k="' + k + '"' + (ok ? '' : ' disabled') + '><span class="ic em">' + (o ? d.ic : '❔') + '</span><span class="tx">' + (o ? d.name + (h.book[k] ? '' : ' <em class="nw">新菜</em>') : '還沒學會的招牌菜') + '<small>' + (o ? needLine(k) : '去蓋章站認識' + VEG[k].from.split('的').pop() + '就會學到') + '</small></span><span class="n">' + (h.box[k] ? '料理盒 ' + h.box[k] : '') + '</span></button>';
    });
    html += '</div><p class="mu sm">做好的菜放進料理盒，打包出門時可以帶一份當配菜。家常菜不能換點數。</p><div class="row"><button class="btn ghost" id="hmGarden">去菜園</button><button class="btn ghost" id="hmX">關閉</button></div>';
    modal(html);
    document.querySelectorAll('.hm .opt[data-k]').forEach(function (b) { b.onclick = function () { cook(b.dataset.k); }; });
    $('hmGarden').onclick = function () { S.room !== 'garden' && setRoom('garden'); garden(); };
    $('hmX').onclick = close;
  }
  function cook(k) {
    var d = DISH[k], prog = 0, done = false;
    modal('<h3>' + d.ic + ' 做' + d.name + '</h3><p class="mu">點鍋子幫小鳶攪拌（也可以讓小鳶自己做好）</p><button type="button" class="pot" id="hmPot" aria-label="攪拌">🥘</button><div class="bar"><i id="hmBar"></i></div><div class="row"><button class="btn ghost" id="hmAuto">請小鳶幫忙做好</button></div>');
    function finish() {
      if (done) return; done = true;
      var h = H(), n = d.need;
      if (!canCook(k)) { close(); return; }      // 雙頁同開等：材料不夠就不出菜
      Object.keys(n).forEach(function (v) { h.fridge[v] -= n[v]; if (!h.fridge[v]) delete h.fridge[v]; });
      var first = !h.book[k]; h.book[k] = h.book[k] || Date.now(); h.box[k] = (h.box[k] || 0) + 1;
      if (!sv()) { toast('手機存不下來，這次先不算'); return; }
      modal('<div class="dish">' + d.ic + '</div><h3 style="text-align:center">' + d.name + '做好了！</h3><p style="text-align:center">' + (first ? '第一次做，收進菜譜冊了！<br>' : '') + '放進料理盒，打包出門時可以帶一份。</p><div class="row"><button class="btn" id="hmOk">好</button></div>');
      $('hmOk').onclick = kitchen; try { BGM.sfx && BGM.sfx('pop'); } catch (e) {}
    }
    function bump() { prog = Math.min(100, prog + 9); var b = $('hmBar'); if (b) b.style.width = prog + '%'; var p = $('hmPot'); if (p) { p.classList.remove('stir'); void p.offsetWidth; p.classList.add('stir'); } if (prog >= 100) setTimeout(finish, 250); }
    $('hmPot').onclick = bump; $('hmAuto').onclick = function () { prog = 100; finish(); };
  }

  /* ===== 打包配菜、回家小記 ===== */
  var side = '';
  function packHTML() {
    var h = H(), ks = ORDER.filter(function (k) { return h.box[k]; });
    if (!ks.length) return '<h3>配菜（可不帶）</h3><p class="pad muted" style="margin:0 16px;font-size:13px">料理盒空空的。到花園種菜、廚房煮一道，就能帶出門。</p>';
    if (side && !h.box[side]) side = '';
    return '<h3>配菜（可不帶）</h3><div class="list">' + ks.map(function (k) { var d = DISH[k]; return '<button type="button" class="opt" data-side="' + k + '" aria-pressed="' + (side === k) + '"><span class="ic em">' + d.ic + '</span><span class="tx">' + d.name + '<small>' + (h.stories[k] ? '已經拿過小記，再帶會多一段小故事' : '第一次帶出門，回來會有一張料理小記') + '</small></span><span class="n">' + h.box[k] + '</span></button>'; }).join('') + '</div>';
  }
  function bindPack(rerender) { document.querySelectorAll('[data-side]').forEach(function (b) { b.onclick = function () { side = side === b.dataset.side ? '' : b.dataset.side; rerender(); if (side) say(DISH[side].name + '帶著，路上吃！'); }; }); }
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
    ORDER.forEach(function (k) { var d = DISH[k], has = h.book[k], st = h.stories[k]; html += '<div class="opt"' + (has ? '' : ' style="opacity:.5"') + '><span class="ic em">' + (has ? d.ic : '❔') + '</span><span class="tx">' + (has ? d.name : '還沒做過') + '<small>' + (st ? '<b>' + d.story[0] + '</b>：' + d.story[1] : has ? '帶這道菜出門一趟，就會收到料理小記' : '') + '</small></span></div>'; });
    html += '</div><p class="mu sm">小記存在這台手機，換手機或清除資料可能會看不到。</p><div class="row"><button class="btn ghost" id="hmK">回廚房</button></div>';
    modal(html); $('hmK').onclick = kitchen;
  }

  /* ===== 房間裡的按鈕（花園、廚房才出現）＋客廳提醒 ===== */
  function render() {
    var wrap = document.querySelector('.roomwrap'); if (!wrap || typeof S === 'undefined') return;
    var b = $('hmAct'); if (!b) { b = document.createElement('div'); b.id = 'hmAct'; wrap.appendChild(b); }
    var h = H(), rid = S.room, ripe = h.plots.filter(function (p) { return stage(p) === 3; }).length, empty = h.plots.filter(function (p) { return stage(p) < 0; }).length, cookable = ORDER.some(function (k) { return open(k) && canCook(k); });
    var btns = '';
    if (rid === 'garden') btns = '<button type="button" id="hmG">🌱 菜園' + (ripe ? '<em>' + ripe + '</em>' : empty ? '<em>種</em>' : '') + '</button>';
    else if (rid === 'kitchen') btns = '<button type="button" id="hmC">🍳 煮飯' + (cookable ? '<em>!</em>' : '') + '</button><button type="button" id="hmB">📖 菜譜冊</button>';
    else if (rid === 'living' && S.state === 'home' && (ripe || cookable)) btns = '<button type="button" id="hmL">' + (ripe ? '🥬 菜長好了' : '🍳 想煮一道嗎') + '</button>';
    b.innerHTML = btns;
    if ($('hmG')) $('hmG').onclick = garden;
    if ($('hmC')) $('hmC').onclick = kitchen;
    if ($('hmB')) $('hmB').onclick = book;
    if ($('hmL')) $('hmL').onclick = function () { if (ripe) { setRoom('garden'); garden(); } else { setRoom('kitchen'); kitchen(); } };
  }
  var css = document.createElement('style');
  css.textContent = '#hmAct{position:absolute;right:10px;bottom:10px;z-index:4;display:flex;gap:8px}' +
    '#hmAct button{position:relative;min-height:44px;padding:8px 14px;border:0;border-radius:999px;background:#FFFDF8;color:#4A3426;font:700 15px/1 inherit;font-family:inherit;box-shadow:0 3px 10px rgba(0,0,0,.22);cursor:pointer}' +
    '#hmAct em{position:absolute;top:-6px;right:-4px;min-width:20px;height:20px;border-radius:10px;background:#E8674A;color:#fff;font:700 12px/20px sans-serif;font-style:normal;text-align:center;padding:0 4px}' +
    '.hm{max-height:86vh;overflow:auto}.hm h3{margin:0 0 8px}.hm .mu{color:var(--muted);font-size:13px;margin:6px 0}.hm .sm{font-size:12px}.hm .row{display:flex;gap:8px;margin-top:12px}.hm .row .btn{flex:1}' +
    '.opt .em,.hm .em{font-size:34px;line-height:44px;text-align:center}.hm .nw{font-style:normal;font-size:11px;background:#E8674A;color:#fff;border-radius:6px;padding:1px 5px;margin-left:4px}' +
    '.plots{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:8px 0}' +
    '.plot{display:flex;flex-direction:column;align-items:center;gap:2px;padding:12px 6px;border-radius:16px;border:2px solid #C9A77A;background:#FFF8EA;font-family:inherit;color:inherit;cursor:pointer}' +
    '.plot .pi{font-size:42px;line-height:60px;width:76px;height:60px;border-radius:38px 38px 14px 14px;background:radial-gradient(ellipse at 50% 90%,#9C6B43 0 45%,#C9A77A 46% 70%,transparent 71%)}.plot.s3{border-color:#3E9B4F;box-shadow:0 0 0 3px rgba(62,155,79,.25)}.plot small{font-size:12px;color:var(--muted)}' +
    '.plot.water .pi{animation:hmW .7s}@keyframes hmW{30%{transform:translateY(-6px) rotate(-6deg)}60%{transform:translateY(0) rotate(6deg)}}' +
    '.pot{display:block;margin:10px auto;font-size:84px;line-height:1;background:none;border:0;cursor:pointer;min-height:96px}.pot.stir{animation:hmS .3s}@keyframes hmS{50%{transform:rotate(-14deg) scale(1.05)}}' +
    '.bar{height:12px;border-radius:6px;background:#EADFCB;overflow:hidden}.bar i{display:block;height:100%;width:0;background:#E39A1F;transition:width .2s}' +
    '.dish{font-size:88px;text-align:center;line-height:1.1;animation:hmD .6s}@keyframes hmD{0%{transform:scale(.3)}70%{transform:scale(1.15)}}';
  document.head.appendChild(css);
  window.HOME = { render: render, garden: garden, kitchen: kitchen, book: book, packHTML: packHTML, bindPack: bindPack, onDepart: onDepart, onReset: onReset, letterExtra: letterExtra, _GROW: function () { return GROW; } };
  setInterval(function () { if ($('home') && $('home').classList.contains('on') && !$('modal').classList.contains('on')) render(); }, 15000);
  if (document.readyState !== 'loading') setTimeout(render, 0); else document.addEventListener('DOMContentLoaded', render);
})();
