/* D162／D164（Dari 10/22）：小鳶在家 v2 原型——花園菜圃直接畫在底圖上、開墾、牧場養殖、廚房做配菜和手作便當。
   紅線（Claude × GPT G103）：不產生點數或券；手作便當出門不抽伴手禮點數／券；菜不會枯死、動物不會餓壞。
   港灣蓋章掃到朋友 → 解鎖那位朋友的種子與招牌菜（kiteFriends1／kiteStamp1，站→朋友照 stamp 的 PAL_OF）。
   存在 kiteTravel1 的 S.home。新東西（稻米、牧草、牧場、動物、肉蛋奶、手作便當）先用 emoji 暫用，等 GPT G104 出圖。 */
(function () {
  var FAST = /[?&]fast=1/.test(location.search), MIN = FAST ? 1000 : 60000;      // 測試：1 分鐘變 1 秒
  var PAL_OF = { 1: 1, 2: 3, 3: 4, 4: 6, 5: 2, 6: 5 };
  var A = 'assets/home/';
  /* ===== 作物：每種長大時間不同（分鐘） ===== */
  var CROP = {
    base: { name: '小白菜', f: 'cabbage', min: 30, from: '小屋菜籃（隨時可種）' },
    rice: { name: '稻米', em: '🌾', min: 45, from: '小屋菜籃（隨時可種）' },
    grass: { name: '牧草', em: '🌿', min: 20, from: '小屋菜籃（隨時可種）・牛的飼料' },
    s1: { name: '地瓜', f: 'sweetpotato', min: 120, spot: 1, from: '第 1 站・旅客服務中心的探頭小鳶' },
    s2: { name: '玉米', f: 'corn', min: 90, spot: 2, from: '第 2 站・郵輪碼頭的剛到港口小鳶' },
    s3: { name: '番茄', f: 'tomato', min: 60, spot: 3, from: '第 3 站・鯨鯊拍照點的鯨鯊' },
    s4: { name: '青蔥', f: 'scallion', min: 40, spot: 4, from: '第 4 站・美食區的小卷' },
    s5: { name: '南瓜', f: 'pumpkin', min: 180, spot: 5, from: '第 5 站・休息區的打盹小鳶' },
    s6: { name: '紅蘿蔔', f: 'carrot', min: 60, spot: 6, from: '第 6 站・停車場出口的海龜' }
  };
  var SEEDS = ['base', 'rice', 'grass', 's1', 's2', 's3', 's4', 's5', 's6'];
  /* ===== 牧場產品 ===== */
  var GOOD = { egg: { name: '雞蛋', em: '🥚' }, chicken: { name: '雞肉', em: '🍗' }, pork: { name: '豬肉', em: '🥩' }, milk: { name: '牛奶', em: '🥛' }, beef: { name: '牛肉', em: '🍖' } };
  var PEN = {
    hen: { name: '雞舍', em: '🐔', need: 0, x: 22, opts: [{ id: 'egg', label: '下蛋', feed: { rice: 1 }, min: 30, get: { egg: 2 } }, { id: 'chicken', label: '雞肉', feed: { rice: 2 }, min: 60, get: { chicken: 1 } }] },
    pig: { name: '豬圈', em: '🐷', need: 8, x: 50, opts: [{ id: 'pork', label: '豬肉', feed: { base: 2 }, min: 90, get: { pork: 1 } }] },
    cow: { name: '牛棚', em: '🐮', need: 18, x: 78, opts: [{ id: 'milk', label: '牛奶', feed: { grass: 2 }, min: 40, get: { milk: 1 } }, { id: 'beef', label: '牛肉', feed: { grass: 3 }, min: 120, get: { beef: 1 } }] }
  };
  /* ===== 菜圃 9 格（花園底圖上的位置，百分比）；前 3 格一開始就有，其他要「收成次數」到了才能開墾 ===== */
  var PLOT = [[20, 72], [50, 72], [80, 72], [19, 84], [50, 84], [81, 84], [18, 96], [50, 96], [82, 96]];
  var LAND = [0, 0, 0, 3, 6, 10, 15, 20, 28], CLEAR_MIN = 10;
  /* ===== 料理：配菜（帶出門得料理小記）＋手作便當（帶出門旅行，不抽點數／券） ===== */
  var DISH = {
    base: { name: '青菜飯', f: 'cabbage', lm: 'home', need: { base: 2, rice: 1 }, story: ['小屋小記', '青菜飯做好囉。下次想一起去小屋坐坐，把今天的小故事說給小鳶聽。'] },
    s1: { name: '地瓜粥', f: 'sweetpotato', lm: 'center', need: { s1: 1, rice: 1 }, story: ['旅客中心小記', '小鳶端來暖暖的地瓜粥。下次想一起去旅客服務中心，看看大家今天想去哪裡。'] },
    s2: { name: '玉米濃湯', f: 'corn', lm: 'cruise', need: { s2: 1, milk: 1 }, story: ['郵輪碼頭小記', '玉米濃湯香香的。下次想一起去郵輪碼頭，找找大船上的小窗戶。'] },
    s3: { name: '番茄炒蛋', f: 'tomato', lm: 'whaleshark', need: { s3: 1, egg: 1 }, story: ['鯨鯊小記', '番茄炒蛋紅紅黃黃的。下次想一起去鯨鯊拍照點，和鯨鯊朋友拍張照。'] },
    s4: { name: '蔥花蛋餅', f: 'scallion', lm: 'food', need: { s4: 1, egg: 1 }, story: ['美食區小記', '蔥花蛋餅切好了。下次想一起去美食區，看看還有什麼香香的食物。'] },
    s5: { name: '南瓜湯', f: 'pumpkin', lm: 'rest', need: { s5: 1, milk: 1 }, story: ['休息區小記', '南瓜湯暖呼呼的。下次想一起去室內休息區，坐一下，讓小鳶陪你休息。'] },
    s6: { name: '紅蘿蔔炒飯', f: 'carrot', lm: 'exit', need: { s6: 1, rice: 1, egg: 1 }, story: ['回家路上小記', '紅蘿蔔炒飯裝進盒子囉。下次想一起去停車場出口，牽好大人的手，慢慢走回家。'] }
  };
  var DORDER = ['base', 's1', 's2', 's3', 's4', 's5', 's6'];
  var BENTO = {      // 對應 index.html CFG.bentos 的 hb_*（去哪裡、幾小時在那邊定）
    hb_egg: { name: '雞蛋飯糰便當', em: '🍙', need: { rice: 2, egg: 1 } },
    hb_chicken: { name: '雞腿便當', em: '🍗', need: { rice: 2, chicken: 1, base: 1 } },
    hb_pork: { name: '豬排便當', em: '🥩', need: { rice: 2, pork: 1, base: 1 } },
    hb_beef: { name: '牛肉便當', em: '🍱', need: { rice: 2, beef: 1, base: 1 } }
  };
  var BORDER = ['hb_egg', 'hb_chicken', 'hb_pork', 'hb_beef'];

  function $(id) { return document.getElementById(id); }
  function rd(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function H() {
    if (!S.home || typeof S.home !== 'object') S.home = {};
    var h = S.home;
    if (!h.plots) h.plots = [];
    if (h.v !== 2) {      // v1 → v2：補到 9 格、送一點起步材料，第一道菜和第一個便當馬上做得出來
      while (h.plots.length < 9) h.plots.push({ v: '', t: 0 });
      if (!h.plots[0].v) h.plots[0] = { v: 'base', t: 0 }; if (!h.plots[1].v) h.plots[1] = { v: 'base', t: 0 }; if (!h.plots[2].v) h.plots[2] = { v: 'rice', t: 0 };
      h.fridge = h.fridge || {}; h.fridge.rice = (h.fridge.rice || 0) + 3; h.fridge.egg = (h.fridge.egg || 0) + 2;
      h.pens = h.pens || {}; h.v = 2;
    }
    h.fridge = h.fridge || {}; h.box = h.box || {}; h.book = h.book || {}; h.stories = h.stories || {}; h.hb = h.hb || {}; h.pens = h.pens || {};
    h.land = h.land || {}; h.xp = h.xp || 0;
    return h;
  }
  function spotOpen(n) { var fr = rd('kiteFriends1') || {}, st = rd('kiteStamp1') || {}; return !!(fr[PAL_OF[n]] || (st.spots && st.spots[n])); }
  function open(k) { return !CROP[k] || !CROP[k].spot || spotOpen(CROP[k].spot); }
  function landOpen(i) { var h = H(); return i < 3 || h.land[i] === 'ok' || (h.land[i] && Date.now() >= h.land[i]); }
  function grow(k) { return CROP[k].min * MIN; }
  function stage(p) { if (!p || !p.v) return -1; var a = Date.now() - p.t; return a >= grow(p.v) ? 3 : a >= grow(p.v) / 2 ? 2 : 0; }
  function mins(ms) { var m = Math.max(1, Math.ceil(ms / MIN)); return m >= 60 ? Math.floor(m / 60) + ' 小時' + (m % 60 ? ' ' + m % 60 + ' 分' : '') : m + ' 分鐘'; }
  function itemName(k) { return CROP[k] ? CROP[k].name : GOOD[k] ? GOOD[k].name : k; }
  function itemIc(k, cls) { if (CROP[k] && CROP[k].f) return img('crop_' + CROP[k].f + '_mature', cls); var e = CROP[k] ? CROP[k].em : GOOD[k] ? GOOD[k].em : '❔'; return '<span class="' + (cls || 'hi') + ' emo">' + e + '</span>'; }
  function img(src, cls) { return '<img class="' + (cls || 'hi') + '" src="' + A + src + '.webp" alt="" draggable="false">'; }
  function cropImg(k, st) { if (st < 0) return img('soil_empty'); if (CROP[k].f) return img('crop_' + CROP[k].f + '_' + (st === 3 ? 'mature' : st === 2 ? 'growing' : 'sprout')); return st === 3 ? '<span class="hi emo">' + CROP[k].em + '</span>' : img('crop_cabbage_sprout'); }
  function dishImg(k) { return img('dish_' + DISH[k].f); }
  function sv() { try { save(); return true; } catch (e) { return false; } }
  function modal(html) { var m = $('modal'); m.innerHTML = '<div class="sheet2 hm">' + html + '</div>'; m.classList.add('on'); return m; }
  function close() { $('modal').classList.remove('on'); render(); }
  function say(t) {
    var hm = document.querySelector('#modal.on .hm');
    if (hm) { var e = hm.querySelector('.hmSay'); if (!e) { e = document.createElement('p'); e.className = 'hmSay'; hm.insertBefore(e, hm.firstChild); } e.textContent = '小鳶：' + t; e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); return; }
    try { var sb = $('say'), box = $('sayBox'); if (sb && box) { sb.textContent = t; box.classList.remove('off'); clearTimeout(say.t); say.t = setTimeout(function () { box.classList.add('off'); }, 2600); } else toast('小鳶：' + t); } catch (x) {}
  }
  function have(need) { var h = H(); return Object.keys(need).every(function (v) { return (h.fridge[v] || 0) >= need[v]; }); }
  function lack(need) { var h = H(), a = []; Object.keys(need).forEach(function (v) { var d = need[v] - (h.fridge[v] || 0); if (d > 0) a.push(itemName(v) + '×' + d); }); return a.join('、'); }
  function needLine(need) { return Object.keys(need).map(function (v) { return itemName(v) + '×' + need[v]; }).join('＋'); }
  function take(need) { var h = H(); Object.keys(need).forEach(function (v) { h.fridge[v] -= need[v]; if (!h.fridge[v]) delete h.fridge[v]; }); }
  function give(get) { var h = H(); Object.keys(get).forEach(function (v) { h.fridge[v] = (h.fridge[v] || 0) + get[v]; }); }
  function fridgeLine() { var h = H(), a = Object.keys(h.fridge).filter(function (k) { return h.fridge[k] > 0; }).map(function (k) { return '<span class="fi">' + itemIc(k, 'fic') + itemName(k) + '×' + h.fridge[k] + '</span>'; }); return a.length ? a.join('') : '空空的'; }
  function pop(x, y, t) { var room = $('room'); if (!room) return; var e = document.createElement('div'); e.className = 'hmPop'; e.style.left = x + '%'; e.style.top = y + '%'; e.innerHTML = t; room.appendChild(e); setTimeout(function () { e.remove(); }, 1300); }
  function mk(k, n) { var o = {}; o[k] = n; return o; }

  /* ===== 花園：底圖上的 9 格菜圃 ===== */
  function plotTap(i) {
    var h = H(), p = h.plots[i], xy = PLOT[i];
    if (!landOpen(i)) {
      if (h.land[i]) { say('正在開墾，再 ' + mins(h.land[i] - Date.now()) + '就好了！'); return; }
      var need = LAND[i];
      if (h.xp < need) { say('這塊地長滿草了。收成 ' + need + ' 次以後就能開墾（現在 ' + h.xp + ' 次）'); return; }
      modal('<h3>⛏️ 開墾新菜圃</h3><p>小鳶要拔草、翻土，大約 ' + mins(CLEAR_MIN * MIN) + '。</p><div class="row"><button class="btn" id="hmDig">開始開墾</button><button class="btn ghost" id="hmX">先不要</button></div>');
      $('hmDig').onclick = function () { h.land[i] = Date.now() + CLEAR_MIN * MIN; sv(); close(); say('嘿咻嘿咻，開墾中！'); }; $('hmX').onclick = close; return;
    }
    if (h.land[i] && h.land[i] !== 'ok') { h.land[i] = 'ok'; sv(); }
    var s = stage(p);
    if (s < 0) return seedPick(i);
    if (s === 3) { var nm = CROP[p.v].name; give(mk(p.v, 1)); h.xp++; h.plots[i] = { v: '', t: 0 }; sv(); pop(xy[0], xy[1] - 8, '+1 ' + nm); render(); say(['收成' + nm + '！放進冰箱囉～', '好大一個' + nm + '！', '又長好了耶！'][Math.floor(Math.random() * 3)]); return; }
    say(CROP[p.v].name + '還要 ' + mins(p.t + grow(p.v) - Date.now()) + '，我幫它澆澆水～'); pop(xy[0], xy[1] - 6, '💧');
  }
  function seedPick(i) {
    var html = '<h3>要種什麼？</h3><p class="mu sm">每種菜長大的時間不一樣，長好了會一直等你，不會枯掉。</p><div class="list" style="margin:0">';
    SEEDS.forEach(function (k) { var o = open(k), c = CROP[k]; html += '<button type="button" class="opt" data-k="' + k + '"' + (o ? '' : ' disabled') + '><span class="ic em">' + (o ? cropImg(k, 3) : '❔') + '</span><span class="tx">' + (o ? c.name + '<em class="tm">' + mins(c.min * MIN) + '</em>' : '還沒拿到的種子') + '<small>' + c.from + '</small></span></button>'; });
    html += '</div><div class="row"><button class="btn ghost" id="hmX">關閉</button></div>';
    modal(html);
    document.querySelectorAll('.hm .opt[data-k]').forEach(function (b) { b.onclick = function () { H().plots[i] = { v: b.dataset.k, t: Date.now() }; sv(); close(); pop(PLOT[i][0], PLOT[i][1] - 6, '🌱'); say('種好了，' + CROP[b.dataset.k].name + '加油！'); }; });
    $('hmX').onclick = close;
  }
  function gardenHTML() {
    var h = H(), html = '';
    PLOT.forEach(function (xy, i) {
      var p = h.plots[i], ok = landOpen(i), s = ok ? stage(p) : -2, w = 26 + (xy[1] - 72) * 0.12, lbl = '';
      if (!ok) lbl = h.land[i] ? '⛏️ ' + mins(h.land[i] - Date.now()) : h.xp >= LAND[i] ? '⛏️ 可開墾' : '🔒';
      else if (s < 0) lbl = '＋ 種菜'; else if (s === 3) lbl = '可以收成！'; else lbl = mins(p.t + grow(p.v) - Date.now());
      html += '<button type="button" class="hmPlot' + (!ok ? ' wild' : s === 3 ? ' ripe' : '') + '" data-i="' + i + '" style="left:' + xy[0] + '%;top:' + xy[1] + '%;width:' + w + '%" aria-label="菜圃 ' + (i + 1) + '：' + lbl + '">' +
        '<span class="soil">' + (ok ? img('soil_empty', 'si') : '<span class="weeds">🌿🌾🌿</span>') + (ok && s >= 0 ? '<span class="crop">' + cropImg(p.v, s) + '</span>' : '') + '</span><span class="lb">' + lbl + '</span></button>';
    });
    return html;
  }

  /* ===== 牧場（原本的學校） ===== */
  function penOpen(k) { return H().xp >= PEN[k].need; }
  function penTap(k) {
    var h = H(), P = PEN[k], st = h.pens[k];
    if (!penOpen(k)) { say(P.name + '還沒蓋好。收成或收集 ' + P.need + ' 次就會蓋好（現在 ' + h.xp + ' 次）'); return; }
    if (st && st.t) {
      var o = P.opts.find(function (x) { return x.id === st.o; });
      if (Date.now() >= st.t) { give(o.get); h.xp++; h.pens[k] = {}; sv(); pop(P.x, 62, '+' + Object.keys(o.get).map(function (g) { return GOOD[g].em + '×' + o.get[g]; }).join(' ')); render(); say(['收好了！謝謝' + P.em, '冰箱又多了好東西！'][Math.floor(Math.random() * 2)]); return; }
      say(P.em + ' 還要 ' + mins(st.t - Date.now()) + '喔～'); return;
    }
    var html = '<h3>' + P.em + ' ' + P.name + '</h3><p class="mu sm">選一種照顧方式，用冰箱的作物當飼料。時間到了回來收；動物不會餓壞，也不會不見。</p><div class="list" style="margin:0">';
    P.opts.forEach(function (o) { var ok = have(o.feed); html += '<button type="button" class="opt' + (ok ? ' can' : '') + '" data-o="' + o.id + '"' + (ok ? '' : ' disabled') + '><span class="ic em"><span class="hi emo">' + Object.keys(o.get).map(function (g) { return GOOD[g].em; }).join('') + '</span></span><span class="tx">' + o.label + '<em class="tm">' + mins(o.min * MIN) + '</em><small>飼料：' + needLine(o.feed) + '<br>' + (ok ? '<b class="ok">飼料夠了，點一下開始</b>' : '<b class="no">還缺 ' + lack(o.feed) + '（去花園種）</b>') + '</small></span><span class="n">' + Object.keys(o.get).map(function (g) { return GOOD[g].name + '×' + o.get[g]; }).join('') + '</span></button>'; });
    html += '</div><p class="mu sm">冰箱：' + fridgeLine() + '</p><div class="row"><button class="btn ghost" id="hmX">關閉</button></div>';
    modal(html);
    document.querySelectorAll('.hm .opt[data-o]').forEach(function (b) { b.onclick = function () { var o = P.opts.find(function (x) { return x.id === b.dataset.o; }); if (!have(o.feed)) return; take(o.feed); h.pens[k] = { o: o.id, t: Date.now() + o.min * MIN }; sv(); close(); say('餵好了，' + P.em + '吃得好開心！'); }; });
    $('hmX').onclick = close;
  }
  function ranchHTML() {
    var h = H(), html = '';
    Object.keys(PEN).forEach(function (k) {
      var P = PEN[k], ok = penOpen(k), st = h.pens[k], ready = st && st.t && Date.now() >= st.t, lbl = !ok ? '🔒 ' + P.need + ' 次' : !st || !st.t ? '餵飼料' : ready ? '可以收！' : mins(st.t - Date.now());
      html += '<button type="button" class="hmPen' + (!ok ? ' wild' : ready ? ' ripe' : '') + '" data-p="' + k + '" style="left:' + P.x + '%;top:84%" aria-label="' + P.name + '：' + lbl + '"><span class="an">' + (ok ? P.em : '🚧') + '</span>' + (ready ? '<span class="gd">' + Object.keys(P.opts.find(function (x) { return x.id === st.o; }).get).map(function (g) { return GOOD[g].em; }).join('') + '</span>' : '') + '<b>' + P.name + '</b><span class="lb">' + lbl + '</span></button>';
    });
    return html + '<span class="hmTag">牧場底圖暫用花園，等 GPT 出牧場圖</span>';
  }

  /* ===== 廚房：配菜＋手作便當 ===== */
  function kitchen(tab) {
    var h = H(); tab = tab || kitchen.tab || 'bento'; kitchen.tab = tab;
    if (S.state !== 'home' && S.state !== 'back') { modal('<h3>🍳 廚房</h3><p>小鳶出門了，等牠回家再一起煮飯吧！菜園和牧場還是會自己長大喔。</p><div class="row"><button class="btn" id="hmX">好</button></div>'); $('hmX').onclick = close; return; }
    var html = '<h3>🍳 小鳶的廚房</h3><div class="tabs hmT"><button type="button" data-t="bento" aria-pressed="' + (tab === 'bento') + '">手作便當</button><button type="button" data-t="dish" aria-pressed="' + (tab === 'dish') + '">配菜</button></div><div class="list" style="margin:0">';
    if (tab === 'bento') {
      BORDER.forEach(function (k) { var b = BENTO[k], ok = have(b.need), c = (window.__travel && __travel.CFG.bentos[k]) || {}; html += '<button type="button" class="opt' + (ok ? ' can' : '') + '" data-b="' + k + '"' + (ok ? '' : ' disabled') + '><span class="ic em"><span class="hi emo">' + b.em + '</span></span><span class="tx">' + b.name + '<small>' + needLine(b.need) + (c.note ? '<br>' + c.note : '') + '<br>' + (ok ? '<b class="ok">材料齊了，點一下開始做</b>' : '<b class="no">還缺 ' + lack(b.need) + '</b>') + '</small></span><span class="n">' + (h.hb[k] ? '有 ' + h.hb[k] : '') + '</span></button>'; });
    } else {
      DORDER.forEach(function (k) { var d = DISH[k], o = open(k), ok = o && have(d.need); html += '<button type="button" class="opt' + (ok ? ' can' : '') + '" data-k="' + k + '"' + (ok ? '' : ' disabled') + '><span class="ic em">' + (o ? dishImg(k) : '❔') + '</span><span class="tx">' + (o ? d.name + (h.book[k] ? '' : ' <em class="nw">新菜</em>') : '還沒學會的招牌菜') + '<small>' + (o ? needLine(d.need) + '<br>' + (ok ? '<b class="ok">材料齊了，點一下開始做</b>' : '<b class="no">還缺 ' + lack(d.need) + '</b>') : '認識' + CROP[k].from.split('的').pop() + '後就會學到') + '</small></span><span class="n">' + (h.box[k] ? '料理盒 ' + h.box[k] : '') + '</span></button>'; });
    }
    html += '</div><p class="mu sm">' + (tab === 'bento' ? '手作便當可以帶小鳶出門旅行（打包時在「便當」裡選）。手作便當的旅行不會撿到點數或券；點數便當還是到港口換禮換。' : '配菜帶出門，第一次帶回來會有一張料理小記。') + '</p><p class="mu sm">冰箱：' + fridgeLine() + '</p><div class="row"><button class="btn ghost" id="hmBook">📖 菜譜冊</button><button class="btn ghost" id="hmX">關閉</button></div>';
    modal(html);
    document.querySelectorAll('.hmT button').forEach(function (b) { b.onclick = function () { kitchen(b.dataset.t); }; });
    document.querySelectorAll('.hm .opt[data-k]').forEach(function (b) { b.onclick = function () { cook('d', b.dataset.k); }; });
    document.querySelectorAll('.hm .opt[data-b]').forEach(function (b) { b.onclick = function () { cook('b', b.dataset.b); }; });
    $('hmBook').onclick = book; $('hmX').onclick = close;
  }
  function cook(type, k) {
    var d = type === 'd' ? DISH[k] : BENTO[k], prog = 0, done = false;
    modal('<h3>做' + d.name + '</h3><p class="mu">點鍋子幫小鳶攪拌（也可以讓小鳶自己做好）</p><button type="button" class="pot" id="hmPot" aria-label="攪拌">' + img('pot_still', 'potI') + '</button><div class="bar"><i id="hmBar"></i></div><div class="row"><button class="btn ghost" id="hmAuto">請小鳶幫忙做好</button></div>');
    function finish() {
      if (done) return; done = true;
      var h = H(); if (!have(d.need)) { close(); return; }
      take(d.need); var first = false;
      if (type === 'd') { first = !h.book[k]; h.book[k] = h.book[k] || Date.now(); h.box[k] = (h.box[k] || 0) + 1; } else h.hb[k] = (h.hb[k] || 0) + 1;
      if (!sv()) { give(d.need); toast('手機存不下來，這次先不算'); return; }
      modal('<div class="dish">' + (type === 'd' ? dishImg(k) : '<span class="hi emo big">' + d.em + '</span>') + '</div><h3 style="text-align:center">' + d.name + '做好了！</h3><p style="text-align:center">' + (first ? '第一次做，收進菜譜冊了！<br>' : '') + (type === 'd' ? '放進料理盒，打包出門時可以帶一份當配菜。' : '打包出門時，在「便當」裡選它就能帶小鳶去旅行。') + '</p><div class="row"><button class="btn" id="hmOk">好</button></div>');
      $('hmOk').onclick = function () { kitchen(); };
    }
    function bump() { prog = Math.min(100, prog + 9); var b = $('hmBar'); if (b) b.style.width = prog + '%'; var p = $('hmPot'); if (p) { var pi = p.querySelector('img'); pi.src = A + 'pot_stir.webp'; clearTimeout(bump.t); bump.t = setTimeout(function () { pi.src = A + 'pot_still.webp'; }, 220); p.classList.remove('stir'); void p.offsetWidth; p.classList.add('stir'); } if (prog >= 100) setTimeout(finish, 250); }
    $('hmPot').onclick = bump; $('hmAuto').onclick = function () { prog = 100; finish(); };
  }
  function book() {
    var h = H(), html = '<h3>📖 菜譜冊與料理小記</h3><div class="list" style="margin:0">';
    DORDER.forEach(function (k) { var d = DISH[k], has = h.book[k], st = h.stories[k]; html += '<button type="button" class="opt"' + (st ? ' data-st="' + k + '"' : ' disabled') + (has ? '' : ' style="opacity:.5"') + '><span class="ic em">' + (st ? img('landmark_' + d.lm) : has ? dishImg(k) : '❔') + '</span><span class="tx">' + (has ? d.name : '還沒做過') + '<small>' + (st ? '<b>' + d.story[0] + '</b>・點一下看' : has ? '帶這道菜出門一趟，就會收到料理小記' : '') + '</small></span></button>'; });
    html += '</div><p class="mu sm">小記存在這台手機，換手機或清除資料可能會看不到。</p><div class="row"><button class="btn ghost" id="hmK">回廚房</button></div>';
    modal(html); $('hmK').onclick = function () { kitchen(); };
    document.querySelectorAll('[data-st]').forEach(function (b) { b.onclick = function () { story(b.dataset.st); }; });
  }
  function story(k) {
    var d = DISH[k];
    modal('<div class="stc"><div class="stIn">' + img('landmark_' + d.lm, 'stL') + dishImg(k).replace('class="hi"', 'class="stD"') + '<b>' + d.story[0] + '</b><p>' + d.story[1] + '</p></div></div><div class="row"><button class="btn" id="hmBk">回菜譜冊</button></div>');
    $('hmBk').onclick = book;
  }
  function kitchenHTML() { return '<button type="button" class="hmStove" style="left:72%;top:62%" aria-label="煮飯">' + img('pot_still', 'si') + '<span class="lb">點鍋子煮飯</span></button>'; }

  /* ===== 打包：配菜＋手作便當 ===== */
  var side = '';
  function packHTML() {
    var h = H(), ks = DORDER.filter(function (k) { return h.box[k]; });
    if (!ks.length) return '<h3>配菜（可不帶）</h3><p class="pad muted" style="margin:0 16px;font-size:13px">料理盒空空的。不帶也能照常出發；想帶的話，到廚房做一道配菜。</p>';
    if (side && !h.box[side]) side = '';
    return '<h3>配菜（可不帶）</h3><p class="pad muted" style="margin:0 16px 6px;font-size:12px">不帶也能照常出發。出發時才會從料理盒拿走一份。</p><div class="list">' + ks.map(function (k) { var d = DISH[k], on = side === k; return '<button type="button" class="opt" data-side="' + k + '" aria-pressed="' + on + '"><span class="ic em">' + dishImg(k) + '</span><span class="tx">' + d.name + '<small>' + (on ? '<b class="ok">已選帶 1 份・再點一次取消</b><br>' : '') + (h.stories[k] ? '已經拿過小記，再帶會多一段小故事' : '第一次帶出門，回來會有一張料理小記') + '</small></span><span class="n">' + h.box[k] + '</span></button>'; }).join('') + '</div>';
  }
  function bindPack(rerender) { document.querySelectorAll('[data-side]').forEach(function (b) { b.onclick = function () { side = side === b.dataset.side ? '' : b.dataset.side; rerender(); /* 選中狀態寫在卡片上 */ }; }); }
  function onDepart(trip) { var h = H(); if (side && h.box[side] > 0) { h.box[side]--; trip.side = side; } side = ''; if (BENTO[trip.bento] && h.hb[trip.bento] > 0) h.hb[trip.bento]--; }
  function hbCount(k) { return H().hb[k] || 0; }
  function bentoIcon(k) { return '<span class="ic emo hbI">' + (BENTO[k] ? BENTO[k].em : '🍱') + '</span>'; }
  function letterExtra(tr) {
    if (!tr || !tr.side || !DISH[tr.side]) return '';
    var h = H(), k = tr.side, d = DISH[k];
    if (!tr.sideDone) { tr.sideDone = h.stories[k] ? 'again' : 'new'; if (!h.stories[k]) h.stories[k] = Date.now(); sv(); }
    return tr.sideDone === 'new' ? '帶了' + d.name + '，收到一張「' + d.story[0] + '」（在廚房菜譜冊）' : '路上吃了' + d.name + '，小鳶說好好吃！';
  }

  /* ===== 畫在房間底圖上 ===== */
  function render() {
    var room = $('room'); if (!room || typeof S === 'undefined') return;
    var f = $('hmFarm'); if (!f) { f = document.createElement('div'); f.id = 'hmFarm'; room.appendChild(f); }
    var rid = S.room, h = H();
    f.innerHTML = rid === 'garden' ? gardenHTML() : rid === 'ranch' ? ranchHTML() : rid === 'kitchen' ? kitchenHTML() : '';
    f.querySelectorAll('.hmPlot').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); plotTap(+b.dataset.i); }; });
    f.querySelectorAll('.hmPen').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); penTap(b.dataset.p); }; });
    f.querySelectorAll('.hmStove').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); kitchen(); }; });
    var a = $('hmAct'), wrap = document.querySelector('.roomwrap'); if (!a && wrap) { a = document.createElement('div'); a.id = 'hmAct'; wrap.appendChild(a); }
    if (!a) return;
    var ripe = h.plots.filter(function (p, i) { return landOpen(i) && stage(p) === 3; }).length, penReady = Object.keys(h.pens).filter(function (k) { var s = h.pens[k]; return s && s.t && Date.now() >= s.t; }).length;
    var btn = '';
    if (rid === 'kitchen') btn = '<button type="button" id="hmB">📖 菜譜冊</button>';
    else if (rid === 'living') btn = '<button type="button" id="hmL">' + (ripe ? '🥬 菜長好了<em>' + ripe + '</em>' : penReady ? '🐔 牧場可以收<em>' + penReady + '</em>' : '🌱 去花園種菜') + '</button>';
    else if (rid === 'garden' || rid === 'ranch') btn = '<button type="button" id="hmF">🧺 冰箱</button>';
    a.innerHTML = btn;
    if ($('hmB')) $('hmB').onclick = book;
    if ($('hmF')) $('hmF').onclick = function () { modal('<h3>🧺 冰箱</h3><p>' + fridgeLine() + '</p><p class="mu sm">收成和收集一共 ' + h.xp + ' 次。次數越多，可以開墾的菜圃越多；豬圈 ' + PEN.pig.need + ' 次、牛棚 ' + PEN.cow.need + ' 次蓋好。</p><div class="row"><button class="btn" id="hmK2">去廚房</button><button class="btn ghost" id="hmX">關閉</button></div>'); $('hmK2').onclick = function () { setRoom('kitchen'); kitchen(); }; $('hmX').onclick = close; };
    if ($('hmL')) $('hmL').onclick = function () { setRoom(!ripe && penReady ? 'ranch' : 'garden'); };
  }
  var css = document.createElement('style');
  css.textContent = '#hmAct{position:absolute;right:10px;top:52px;z-index:4;display:flex;gap:8px}' +
    '#hmAct button{position:relative;display:inline-flex;align-items:center;gap:4px;min-height:44px;padding:6px 14px;border:0;border-radius:999px;background:#FFFDF8;color:#4A3426;font:700 14px/1 inherit;font-family:inherit;box-shadow:0 3px 10px rgba(0,0,0,.22);cursor:pointer}' +
    '#hmAct em{position:absolute;top:-6px;right:-4px;min-width:20px;height:20px;border-radius:10px;background:#E8674A;color:#fff;font:700 12px/20px sans-serif;font-style:normal;text-align:center;padding:0 4px}' +
    '#hmFarm{position:absolute;inset:0;z-index:3;pointer-events:none}#hmFarm>*{pointer-events:auto}' +
    '.hmPlot,.hmPen,.hmStove{position:absolute;transform:translate(-50%,-100%);border:0;background:none;padding:0;cursor:pointer;display:flex;flex-direction:column;align-items:center;font-family:inherit;-webkit-tap-highlight-color:transparent}' +
    '.hmPlot .soil{display:block;width:100%;aspect-ratio:2/1;position:relative}.hmPlot .si{width:100%;height:100%;object-fit:contain}' +
    '.hmPlot .crop{position:absolute;left:14%;right:14%;bottom:28%;aspect-ratio:1}.hmPlot .crop .hi{width:100%;height:100%}.hmPlot .crop .emo{font-size:min(9vw,40px);align-items:flex-end}' +
    '.hmPlot .weeds{display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:min(5vw,22px);border-radius:50%;background:radial-gradient(ellipse,rgba(86,120,52,.55) 0 50%,transparent 68%);opacity:.75}.hmPlot.wild .lb{background:rgba(0,0,0,.35);color:#fff}' +
    '.hmPlot .lb{position:absolute;left:50%;top:auto;bottom:38%;transform:translate(-50%,50%);z-index:2;pointer-events:none}.hmPlot .lb,.hmPen .lb,.hmStove .lb{margin-top:-4px;white-space:nowrap;font-size:11px;font-weight:700;background:rgba(255,253,248,.92);color:#4A3426;border-radius:8px;padding:2px 6px;box-shadow:0 1px 3px rgba(0,0,0,.2)}' +
    '.hmPlot.ripe .lb,.hmPen.ripe .lb{background:#3E9B4F;color:#fff}.hmPlot.ripe .crop{animation:hmB 1.6s ease-in-out infinite}' +
    '@keyframes hmB{50%{transform:translateY(-4%) scale(1.04)}}' +
    '.hmPen{width:26%}.hmPen .an{font-size:min(12vw,54px);line-height:1.1;filter:drop-shadow(0 3px 2px rgba(0,0,0,.25))}.hmPen.wild .an{opacity:.6}.hmPen b{font-size:12px;color:#fff;text-shadow:0 1px 2px #000}.hmPen .gd{position:absolute;top:-6px;right:8%;font-size:22px;animation:hmB 1.2s infinite}' +
    '.hmPen::before{content:"";position:absolute;left:0;right:0;bottom:22px;height:40%;border:4px solid #A9784A;border-top:0;border-radius:0 0 10px 10px;z-index:-1;background:rgba(214,184,128,.35)}' +
    '.hmTag{position:absolute;left:8px;bottom:6px;font-size:10px;background:rgba(0,0,0,.45);color:#fff;border-radius:6px;padding:2px 6px}' +
    '.hmStove{width:22%}.hmStove .si{width:100%;filter:drop-shadow(0 4px 4px rgba(0,0,0,.3));animation:hmB 2s ease-in-out infinite}' +
    '.hmPop{position:absolute;z-index:5;transform:translate(-50%,-50%);font:800 14px/1.2 sans-serif;color:#2F7A3A;background:#fff;border-radius:10px;padding:3px 8px;box-shadow:0 2px 6px rgba(0,0,0,.2);animation:hmU 1.3s forwards;pointer-events:none;white-space:nowrap}@keyframes hmU{to{transform:translate(-50%,-180%);opacity:0}}' +
    '.hi{width:100%;height:100%;object-fit:contain;display:block}.opt .em .hi{width:44px;height:44px}.emo{display:flex;align-items:center;justify-content:center;font-size:32px;line-height:1}.emo.big{font-size:96px}.hbI{font-size:30px;width:44px;height:44px}' +
    '.fi{display:inline-flex;align-items:center;gap:2px;margin:0 8px 4px 0;white-space:nowrap}.fic{width:20px;height:20px;font-size:16px}' +
    '.hm .tm{font-style:normal;font-size:11px;background:#EEF7F6;color:#21585D;border-radius:6px;padding:1px 5px;margin-left:6px}.hmT{margin:0 0 8px}' +
    '.hmSay{margin:-4px 0 8px;padding:6px 10px;border-radius:10px;background:#FFF1CC;color:#5B4A3A;font-weight:700;font-size:13px}.hmSay.pop{animation:hmP .35s}@keyframes hmP{40%{transform:scale(1.04)}}' +
    '.hm .ok{color:#2F7A3A}.hm .no{color:#B4562F}.opt.can{border-color:#3E9B4F}' +
    '.potI{width:180px;height:180px;object-fit:contain}' +
    '.stc{background:url(' + A + 'card_shared.webp) center/100% 100% no-repeat;aspect-ratio:3/2;border-radius:10px;box-shadow:0 4px 14px rgba(0,0,0,.18);position:relative}' +
    '.stIn{position:absolute;inset:12% 10%;display:grid;grid-template-columns:30% 1fr;grid-template-rows:auto 1fr;gap:2px 10px;align-items:start}.stL{grid-row:1/3;width:100%;object-fit:contain}.stD{position:absolute;right:-4%;bottom:-8%;width:24%}.stIn b{font-size:15px}.stIn p{margin:0;font-size:13px;line-height:1.55;padding-right:18%}' +
    '.hm{max-height:86vh;overflow:auto}.hm h3{margin:0 0 8px}.hm .mu{color:var(--muted);font-size:13px;margin:6px 0}.hm .sm{font-size:12px}.hm .row{display:flex;gap:8px;margin-top:12px}.hm .row .btn{flex:1}' +
    '.opt .em,.hm .em{font-size:34px;line-height:44px;text-align:center}.hm .nw{font-style:normal;font-size:11px;background:#E8674A;color:#fff;border-radius:6px;padding:1px 5px;margin-left:4px}' +
    '.pot{display:block;margin:6px auto;padding:0;background:none;border:0;cursor:pointer;min-height:96px}.pot.stir{animation:hmS .3s}@keyframes hmS{50%{transform:rotate(-14deg) scale(1.05)}}' +
    '.bar{height:12px;border-radius:6px;background:#EADFCB;overflow:hidden}.bar i{display:block;height:100%;width:0;background:#E39A1F;transition:width .2s}' +
    '.dish{width:160px;height:160px;margin:0 auto;animation:hmD .6s}@keyframes hmD{0%{transform:scale(.3)}70%{transform:scale(1.15)}}';
  document.head.appendChild(css);
  window.HOME = { render: render, kitchen: kitchen, book: book, packHTML: packHTML, bindPack: bindPack, onDepart: onDepart, letterExtra: letterExtra, bentoKeys: function () { return BORDER; }, hbCount: hbCount, bentoIcon: bentoIcon, _H: H };
  setInterval(function () { if ($('home') && $('home').classList.contains('on') && !$('modal').classList.contains('on')) render(); }, FAST ? 1000 : 15000);
  if (document.readyState !== 'loading') setTimeout(render, 0); else document.addEventListener('DOMContentLoaded', render);
})();
