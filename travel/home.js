/* D162／D164（Dari 10/22）：小鳶在家 v2 原型——花園菜圃直接畫在底圖上、開墾、牧場養殖、廚房做配菜和手作便當。
   紅線（Claude × GPT G103）：不產生點數或券；手作便當出門不抽伴手禮點數／券；菜不會枯死、動物不會餓壞。
   港灣蓋章掃到朋友 → 解鎖那位朋友的種子與招牌菜（kiteFriends1／kiteStamp1，站→朋友照 stamp 的 PAL_OF）。
   存在 kiteTravel1 的 S.home。圖：G103＋G104（牧場、動物、稻米牧草、肉蛋奶、手作便當）；數值依 G104 A／B v3。肉品走「合作農場備料箱」說法（G104 C）。 */
(function () {
  var FAST = /[?&]fast=1/.test(location.search), MIN = FAST ? 1000 : 60000;      // 測試：1 分鐘變 1 秒
  var PAL_OF = { 1: 1, 2: 3, 3: 4, 4: 6, 5: 2, 6: 5 };
  var A = 'assets/home/';
  /* ===== 作物：每種長大時間不同（分鐘） ===== */
  var CROP = {
    base: { name: '小白菜', f: 'cabbage', y: 3, min: 30, from: '小屋菜籃（隨時可種）' },
    rice: { name: '稻米', f: 'rice', y: 4, min: 45, from: '小屋菜籃（隨時可種）' },
    grass: { name: '牧草', f: 'grass', y: 3, min: 20, from: '小屋菜籃（隨時可種）・牛的飼料' },
    s1: { name: '地瓜', f: 'sweetpotato', min: 120, spot: 1, from: '第 1 站・旅客服務中心的探頭小鳶' },
    s2: { name: '玉米', f: 'corn', min: 90, spot: 2, from: '第 2 站・郵輪碼頭的剛到港口小鳶' },
    s3: { name: '番茄', f: 'tomato', min: 60, spot: 3, from: '第 3 站・鯨鯊拍照點的鯨鯊' },
    s4: { name: '青蔥', f: 'scallion', min: 40, spot: 4, from: '第 4 站・美食區的小卷' },
    s5: { name: '南瓜', f: 'pumpkin', min: 180, spot: 5, from: '第 5 站・休息區的打盹小鳶' },
    s6: { name: '紅蘿蔔', f: 'carrot', min: 60, spot: 6, from: '第 6 站・停車場出口的海龜' }
  };
  var SEEDS = ['base', 'rice', 'grass', 's1', 's2', 's3', 's4', 's5', 's6'];
  /* ===== 牧場產品 ===== */
  var GOOD = { gohan: { name: '白飯', em: '🍚' }      /* D190：白飯碗圖 product_gohan（GPT G105 食物 v2 rice_bowl_v1） */, egg: { name: '雞蛋', em: '🥚' }, chicken: { name: '雞肉', em: '🍗', meat: 1 }, pork: { name: '豬肉', em: '🥩', meat: 1 }, milk: { name: '牛奶', em: '🥛' }, beef: { name: '牛肉', em: '🍖', meat: 1 } };      /* 圖：assets/home/product_*.webp（G104） */
  /* ===== D166（Dari 10/23）：牧場改成「一大片、大家和樂融融」——不分棚，動物在同一片草地走來走去，定時自己產東西，點一下就收。
     雞：雞蛋 30 分、雞肉 2 小時；豬：豬肉 90 分；牛：牛奶 40 分、牛肉 2.5 小時。可以餵飼料讓下一批快一半（選做）。
     動物要「領養」才會變多；條件先用收成次數暫代（之後改成任務／某種購買條件，Dari 還在想）。狗狗：全部產品時間少 25%。 */
  var ANI = {
    chicken: { name: '小雞', em: '🐔', make: { egg: 30, chicken: 120 }, feed: 'rice', says: ['咕咕，今天想種什麼呢？', '穀物香香的，謝謝你！', '咕咕！有東西可以收囉～'] },
    pig: { name: '小豬', em: '🐷', make: { pork: 90 }, feed: 'base', says: ['哼哼，我在這裡陪你聊天。', '慢慢吃，吃完再一起玩。', '哼哼！快來看看～'] },
    cow: { name: '牛牛', em: '🐮', make: { milk: 40, beef: 150 }, feed: 'grass', says: ['哞，今天的風好舒服。', '牧草香香的，謝謝你！', '哞～準備好了，來看看吧。'] },
    dog: { name: '狗狗', em: '🐶', make: {}, says: ['汪！我幫大家顧牧場！', '汪汪，大家都乖乖的～', '汪！'] },
    sheep: { name: '綿羊', em: '🐑', make: { milk: 50 }, feed: 'grass', says: ['咩～草地軟軟的。', '牧草好好吃，謝謝你！', '咩！羊奶好了喔（冰箱算牛奶）。'] }
  };
  var ADOPT = [      /* 領養清單：need＝收成／收集次數（暫代條件） */
    { k: 'chicken', need: 0 }, { k: 'chicken', need: 4 }, { k: 'pig', need: 6 }, { k: 'cow', need: 10 },
    { k: 'dog', need: 14, note: '狗狗會幫忙顧牧場：大家產東西的時間少 25%' }, { k: 'chicken', need: 18 }, { k: 'pig', need: 24 }, { k: 'cow', need: 30 },
    { k: 'sheep', need: 12, note: '綿羊：羊奶 50 分（放進冰箱算牛奶）' }
  ];
  /* ===== 菜圃 9 格（花園底圖上的位置，百分比）；前 3 格一開始就有，其他要「收成次數」到了才能開墾 ===== */
  /* D168：G105 九格菜園底圖（room_garden_v2，九塊空土已畫好）；每格 [命中框 x0,y0,x1,y1, 作物底 x,y, 作物寬]（%，照 G105_九格菜園座標_v1） */
  var PLOTG = [[18.3, 49.1, 37.4, 56.5, 27.8, 54.6, 13.4], [40, 49.1, 59, 56.5, 49.2, 54.6, 13.4], [60.2, 49.1, 82.7, 56.5, 71.9, 54.7, 13.4],
    [12, 58.2, 35.6, 67.6, 24.2, 65.6, 15.7], [38.5, 58.2, 60.9, 67.6, 49.8, 65.6, 15.7], [63.5, 58.2, 88.1, 67.6, 76.1, 65.6, 15.7],
    [5.6, 69.6, 34.2, 82.8, 19.5, 79.9, 18], [36.1, 69.6, 62.9, 82.8, 49.4, 79.9, 18], [66.3, 69.6, 96.1, 82.8, 80.6, 79.9, 18]];
  var PLOT = PLOTG.map(function (g) { return [g[4], g[5]]; });
  var LAND = [0, 0, 0, 3, 6, 10, 15, 20, 28], CLEAR_MIN = 10;
  /* ===== 料理：配菜（帶出門得料理小記）＋手作便當（帶出門旅行，不抽點數／券） ===== */
  var DISH = {
    base: { name: '青菜飯', f: 'cabbage', lm: 'home', need: { base: 1, gohan: 1 }, story: ['小屋小記', '青菜飯做好囉。下次想一起去小屋坐坐，把今天的小故事說給小鳶聽。'] },
    s1: { name: '地瓜粥', f: 'sweetpotato', lm: 'center', need: { s1: 1, gohan: 1 }, story: ['旅客中心小記', '小鳶端來暖暖的地瓜粥。下次想一起去旅客服務中心，看看大家今天想去哪裡。'] },
    s2: { name: '玉米濃湯', f: 'corn', lm: 'cruise', need: { s2: 1, milk: 1 }, story: ['郵輪碼頭小記', '玉米濃湯香香的。下次想一起去郵輪碼頭，找找大船上的小窗戶。'] },
    s3: { name: '番茄炒蛋', f: 'tomato', lm: 'whaleshark', need: { s3: 1, egg: 1 }, story: ['鯨鯊小記', '番茄炒蛋紅紅黃黃的。下次想一起去鯨鯊拍照點，和鯨鯊朋友拍張照。'] },
    s4: { name: '蔥花蛋餅', f: 'scallion', lm: 'food', need: { s4: 1, egg: 1 }, story: ['美食區小記', '蔥花蛋餅切好了。下次想一起去美食區，看看還有什麼香香的食物。'] },
    s5: { name: '南瓜湯', f: 'pumpkin', lm: 'rest', need: { s5: 1, milk: 1 }, story: ['休息區小記', '南瓜湯暖呼呼的。下次想一起去室內休息區，坐一下，讓小鳶陪你休息。'] },
    s6: { name: '紅蘿蔔炒飯', f: 'carrot', lm: 'exit', need: { s6: 1, gohan: 1 }, story: ['回家路上小記', '紅蘿蔔炒飯裝進盒子囉。下次想一起去停車場出口，牽好大人的手，慢慢走回家。'] }
  };
  var DORDER = ['base', 's1', 's2', 's3', 's4', 's5', 's6'];
  var BENTO = {      // 對應 index.html CFG.bentos 的 hb_*（去哪裡、幾小時在那邊定）
    hb_egg: { name: '雞蛋飯糰便當', em: '🍙', need: { gohan: 1, egg: 1 }, main: 'egg', veg: [0, 2] },      /* D189：便當＝白飯＋主菜＋自己挑的配菜（任何一種菜都可以），veg＝[最少, 最多] 格 */
    hb_chicken: { name: '雞腿便當', em: '🍗', need: { gohan: 1, chicken: 1 }, main: 'chicken', veg: [1, 2] },
    hb_pork: { name: '豬排便當', em: '🥩', need: { gohan: 1, pork: 1 }, main: 'pork', veg: [1, 2] },
    hb_beef: { name: '牛肉便當', em: '🍱', need: { gohan: 1, beef: 1 }, main: 'beef', veg: [1, 2] }
  };
  var BORDER = ['hb_egg', 'hb_chicken', 'hb_pork', 'hb_beef'];
  var BIMG = { hb_egg: 'bento_egg', hb_chicken: 'bento_chicken', hb_pork: 'bento_pork', hb_beef: 'bento_beef' };

  function $(id) { return document.getElementById(id); }
  function rd(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function H() {
    if (!S.home || typeof S.home !== 'object') S.home = {};
    var h = S.home;
    if (!h.plots) h.plots = [];
    if (!(h.v >= 2)) {      /* v1 → v2：補到 9 格、送一點起步材料，第一道菜和第一個便當馬上做得出來（D189 修：原本寫 h.v !== 2，升到 v3 後每次都重跑） */
      while (h.plots.length < 9) h.plots.push({ v: '', t: 0 });
      if (!h.plots[0].v) h.plots[0] = { v: 'base', t: 0 }; if (!h.plots[1].v) h.plots[1] = { v: 'base', t: 0 }; if (!h.plots[2].v) h.plots[2] = { v: 'rice', t: 0 };
      h.fridge = h.fridge || {}; h.fridge.rice = (h.fridge.rice || 0) + 3; h.fridge.egg = (h.fridge.egg || 0) + 2;
      h.pens = h.pens || {}; h.v = 2; h.fridge.gohan = (h.fridge.gohan || 0) + 2;
    }
    if (h.v === 2) {      /* D189 v2 → v3：稻米要用電鍋煮成白飯；舊存檔的稻米換成等量白飯，再送 1 份稻米試試電鍋 */
      h.fridge = h.fridge || {}; var r0 = h.fridge.rice || 0; if (r0) h.fridge.gohan = (h.fridge.gohan || 0) + r0; h.fridge.rice = 1; h.v = 3;
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
  function sm(ms) { var m = Math.max(1, Math.ceil(ms / MIN)); return m >= 60 ? Math.floor(m / 60) + '時' + (m % 60 ? m % 60 + '分' : '') : m + '分'; }      /* D174：菜圃上的小標籤用短字 */
  function itemName(k) { return CROP[k] ? CROP[k].name : GOOD[k] ? GOOD[k].name : k; }
  function itemIc(k, cls) { if (CROP[k] && CROP[k].f) return img('crop_' + CROP[k].f + '_mature', cls); if (GOOD[k] && !GOOD[k].noImg) return img('product_' + k, cls); var e = CROP[k] ? CROP[k].em : GOOD[k] ? GOOD[k].em : '❔'; return '<span class="' + (cls || 'hi') + ' emo">' + e + '</span>'; }
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
  var UNIT = { gohan: '碗', egg: '顆' };      /* D192：GPT 1820 B——白飯「碗」、雞蛋「顆」、其他「份」，只改顯示 */
  function unitOf(k) { return UNIT[k] || '份'; }
  function lackShort(need) { var h = H(), a = []; Object.keys(need).forEach(function (v) { var d = need[v] - (h.fridge[v] || 0); if (d > 0) a.push(itemName(v) + ' ' + d + ' ' + unitOf(v)); }); return a.length ? '還差' + a[0] + (a.length > 1 ? '，另差 ' + (a.length - 1) + ' 種' : '') : ''; }      /* D191：GPT 1720 菜單意見——缺料寫名稱和差多少，多項只寫第一項＋另差 N 種 */
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
    if (s === 3) { var nm = CROP[p.v].name, yy = CROP[p.v].y || 2; give(mk(p.v, yy)); h.xp++; h.plots[i] = { v: '', t: 0 }; sv(); if (window.KiteBoard) KiteBoard.ev('home_harvest', { crop: p.v }); pop(xy[0], xy[1] - 8, '+' + yy + ' ' + nm); render(); say(['收成' + nm + '！放進冰箱囉～', '好大一個' + nm + '！', '又長好了耶！'][Math.floor(Math.random() * 3)]); return; }
    say(CROP[p.v].name + '還要 ' + mins(p.t + grow(p.v) - Date.now()) + '，我幫它澆澆水～'); pop(xy[0], xy[1] - 6, '💧');
  }
  function seedPick(i) {
    var html = '<h3>要種什麼？</h3><p class="mu sm">每種菜長大的時間不一樣，長好了會一直等你，不會枯掉。</p><div class="list" style="margin:0">';
    var lockedS = SEEDS.filter(function (k) { return !open(k); });
    SEEDS.filter(open).forEach(function (k) { var o = true, c = CROP[k]; html += '<button type="button" class="opt" data-k="' + k + '"' + (o ? '' : ' disabled') + '><span class="ic em">' + (o ? cropImg(k, 3) : '❔') + '</span><span class="tx">' + (o ? c.name + '<em class="tm">' + mins(c.min * MIN) + '</em><em class="tm">收 ' + (c.y || 2) + ' 份</em>' : '還沒拿到的種子') + '<small>' + c.from + '</small></span></button>'; });
    if (lockedS.length) html += '<div class="lockRow"><span>' + lockedS.map(function () { return '❔'; }).join('') + '</span>還有 ' + lockedS.length + ' 種種子：在港灣蓋章認識港口朋友就會拿到</div>';
    html += '</div><div class="row"><button class="btn ghost" id="hmX">關閉</button></div>';
    modal(html);
    document.querySelectorAll('.hm .opt[data-k]').forEach(function (b) { b.onclick = function () { H().plots[i] = { v: b.dataset.k, t: Date.now() }; sv(); if (window.KiteBoard) KiteBoard.ev('home_plant', { crop: b.dataset.k }); close(); pop(PLOT[i][0], PLOT[i][1] - 6, '🌱'); say('種好了，' + CROP[b.dataset.k].name + '加油！'); }; });
    $('hmX').onclick = close;
  }
  function ic(n, c) { return '<img class="' + (c || 'lbs') + '" src="../shared/assets/icons/' + n + '.webp" alt="">'; }
  function gardenHTML() {
    var h = H(), html = '';
    PLOTG.forEach(function (g, i) {
      var p = h.plots[i], ok = landOpen(i), s = ok ? stage(p) : -2, lbl = '', lc = '';
      if (!ok) { if (h.land[i]) lbl = ic('a10', 'lbs lbv') + sm(h.land[i] - Date.now()); else if (h.xp >= LAND[i]) { lbl = ic('a10', 'lbs lbv'); lc = ' lbc'; } else lbl = ic('a11', 'lbk'); }
      else if (s < 0) lbl = '＋'; else if (s === 3) lbl = '<img class="lbi" src="../shared/assets/icons/a08.webp" alt="">'; else lbl = ic('a09') + sm(p.t + grow(p.v) - Date.now());
      var bw = g[2] - g[0], bh = g[3] - g[1], cx = (g[4] - g[0]) / bw * 100, cw = g[6] / bw * 100;
      html += '<button type="button" class="hmPlot' + (!ok ? ' wild' : s === 3 ? ' ripe' : '') + '" data-i="' + i + '" style="left:' + g[0] + '%;top:' + g[1] + '%;width:' + bw + '%;height:' + bh + '%" aria-label="菜圃 ' + (i + 1) + '：' + (!ok ? (h.land[i] ? '開墾中' : h.xp >= LAND[i] ? '可以開墾' : '還沒開墾') : s < 0 ? '空地，點一下種菜' : s === 3 ? '可以收成' : '長大中') + '">' +
        (!ok ? '<span class="cover">' + img(h.land[i] ? 'soil_clearing' : 'soil_weeds', 'si') + '</span>' : '') +
        (ok && s >= 0 ? '<span class="crop" style="left:' + cx + '%;width:' + cw + '%;bottom:' + ((g[3] - g[5]) / bh * 100) + '%">' + cropImg(p.v, s) + '</span>' : '') + '<span class="lb' + lc + '">' + lbl + '</span></button>';
    });
    return html;
  }

  /* ===== 牧場：一大片草地，動物自由走動 ===== */
  function zoo() { var h = H(); if (!h.zoo) { h.zoo = []; adoptAdd('chicken'); } return h.zoo; }
  function adoptAdd(k) { var h = H(), t = {}, now = Date.now(); Object.keys(ANI[k].make).forEach(function (g) { t[g] = now; }); h.zoo = h.zoo || []; h.zoo.push({ id: 'a' + now.toString(36) + Math.floor(Math.random() * 99), k: k, t: t }); }
  function hasDog() { return zoo().some(function (a) { return a.k === 'dog'; }); }
  function period(g, k) { return ANI[k].make[g] * MIN * (hasDog() ? 0.75 : 1); }
  function readyOf(a) { return Object.keys(ANI[a.k].make).filter(function (g) { return Date.now() - a.t[g] >= period(g, a.k); }); }
  function nextOf(a) { var m = 1e15; Object.keys(ANI[a.k].make).forEach(function (g) { m = Math.min(m, a.t[g] + period(g, a.k) - Date.now()); }); return m; }
  function zooReady() { return zoo().filter(function (a) { return readyOf(a).length; }).length; }
  function aniTap(id) {
    var h = H(), a = zoo().find(function (x) { return x.id === id; }); if (!a) return; var A0 = ANI[a.k], pos = POS[id] || { x: 50, y: 80 };
    var r = readyOf(a);
    if (r.length) { var got = {}; r.forEach(function (g) { got[g] = 1; a.t[g] = Date.now(); }); give(got); h.xp++; sv(); pop(pos.x, pos.y - 14, '+' + r.map(function (g) { return GOOD[g].meat ? '備料箱（' + GOOD[g].name + '）' : GOOD[g].name; }).join('＋')); say(A0.says[2]); zooRender(true); return; }
    if (a.k === 'dog') { say(A0.says[Math.floor(Math.random() * 2)]); return; }
    var lines = Object.keys(A0.make).map(function (g) { return '<span class="fi">' + itemIc(g, 'fic') + GOOD[g].name + '：還要 ' + mins(a.t[g] + period(g, a.k) - Date.now()) + '</span>'; }).join('<br>');
    var fd = A0.feed, ok = (h.fridge[fd] || 0) >= 1;
    modal('<h3 class="aniH">' + spP(a.k) + A0.name + '</h3><p>' + lines + '</p><p class="mu sm">餵一份' + itemName(fd) + '，下一批會快一半（可以不餵，時間到也會自己好）。' + (hasDog() ? '狗狗在顧牧場，大家都快了 25%。' : '') + '</p><div class="row"><button class="btn" id="hmFeed"' + (ok ? '' : ' disabled') + '>' + (ok ? '餵' + itemName(fd) + '×1' : '冰箱沒有' + itemName(fd)) + '</button><button class="btn ghost" id="hmX">關閉</button></div>');
    $('hmFeed').onclick = function () { if ((h.fridge[fd] || 0) < 1) return; take(mk(fd, 1)); Object.keys(A0.make).forEach(function (g) { var left = a.t[g] + period(g, a.k) - Date.now(); if (left > 0) a.t[g] -= left / 2; }); sv(); close(); say(A0.says[1]); zooRender(true); };
    $('hmX').onclick = close;
  }
  function adoptSheet() {
    var h = H(), z = zoo(), ad = h.adopted || [0], html = '<h3>💌 港口朋友的照護委託</h3><p class="mu sm">收成和收集越多次，朋友就會寄來新的介紹信（現在 ' + h.xp + ' 次）。完成一個照護小故事，再邀請動物來牧場住。</p><div class="list" style="margin:0">';
    ADOPT.forEach(function (o, i) { if (!i) return; var c = CARE[i], has = ad.indexOf(i) >= 0, can = !has && h.xp >= o.need; html += '<button type="button" class="opt' + (can ? ' can' : '') + '" data-ad="' + i + '"' + (can ? '' : ' disabled') + '><span class="ic em">' + (has || can ? spP(o.k) : '<span class="hi emo">✉️</span>') + '</span><span class="tx">' + (has ? ANI[o.k].name + '<small><b class="ok">已經住進牧場了</b>・' + FR[c.f].n + '介紹的</small>' : can ? FR[c.f].n + '的介紹信<small>' + c.story.slice(0, 18) + '…<br><b class="ok">點一下打開</b></small>' : '還沒寄來的介紹信<small>收成或收集 ' + o.need + ' 次後寄來' + (o.note ? '<br>' + o.note : '') + '</small>') + '</span></button>'; });
    html += '</div><p class="mu sm">牧場現在有 ' + z.length + ' 隻。</p><div class="row"><button class="btn ghost" id="hmX">關閉</button></div>';
    modal(html);
    document.querySelectorAll('[data-ad]').forEach(function (b) { b.onclick = function () { careOpen(+b.dataset.ad); }; });
    $('hmX').onclick = close;
  }
  function careOpen(i) {
    var h = H(), o = ADOPT[i], c = CARE[i], F = FR[c.f]; h.care = h.care || {};
    if ((h.adopted || [0]).indexOf(i) >= 0 || h.xp < o.need) return;
    if (h.care[i]) return careInvite(i);
    var opts = DORDER.filter(function (k) { return h.box[k]; }).concat(BORDER.filter(function (k) { return h.hb[k]; }));
    var html = '<div class="vCard">' + vimg(c.f) + '<div class="vMood">' + spP(o.k) + '<b>' + ANI[o.k].name + '</b></div></div><h3>💌 ' + F.n + '的介紹信</h3><p>「' + c.story + '」</p><p><b>' + c.ask + '</b></p><div class="list" style="margin:0">' + c.ch.map(function (t, n) { return '<button type="button" class="opt" data-ch="' + n + '"><span class="ic em"><span class="hi emo">' + ['🌿', '🌬️', '🎵'][n] + '</span></span><span class="tx">' + t + '<small>照護小故事・不用材料</small></span></button>'; }).join('') + '</div>';
    if (opts.length) html += '<p class="mu sm">也可以送' + F.n + '一份料理當謝禮（可以不送）：</p><div class="list" style="margin:0">' + opts.map(function (k) { var fd = food(k); return '<button type="button" class="opt" data-cf="' + k + '"><span class="ic em">' + fd.pic + '</span><span class="tx">' + fd.name + '<small>送給' + F.n + '・用掉 1 份</small></span></button>'; }).join('') + '</div>';
    html += '<div class="row"><button class="btn ghost" id="hmBk">回委託板</button></div>';
    modal(html);
    function done(line) { h.care[i] = Date.now(); rec(c.f).h++; sv(); careInvite(i, line); }
    document.querySelectorAll('[data-ch]').forEach(function (b) { b.onclick = function () { done('你選了「' + c.ch[+b.dataset.ch] + '」。' + c.end); }; });
    document.querySelectorAll('[data-cf]').forEach(function (b) { b.onclick = function () { var k = b.dataset.cf; if (DISH[k]) { if (!(h.box[k] > 0)) return; h.box[k]--; } else { if (!(h.hb[k] > 0)) return; h.hb[k]--; } done(F.n + '吃了' + food(k).name + '：「' + F.yum + '」' + c.end); }; });
    $('hmBk').onclick = adoptSheet;
  }
  function careInvite(i, line) {
    var o = ADOPT[i], c = CARE[i], A0 = ANI[o.k], prof = Object.keys(A0.make).map(function (g) { return GOOD[g].name + ' ' + A0.make[g] + ' 分'; }).join('、') || o.note || '';
    modal('<div class="vCard">' + vimg(c.f) + '<div class="vMood">' + spP(o.k) + '<b>' + A0.name + '</b></div></div><h3>' + A0.em + ' ' + A0.name + '</h3>' + (line ? '<p>' + line + '</p>' : '') + '<p class="mu sm" id="hmProf" style="display:none">' + A0.name + '的小檔案：' + (o.note || prof) + '。來了以後會在牧場跟大家一起走來走去' + (prof && o.k !== 'dog' ? '，定時產' + Object.keys(A0.make).map(function (g) { return GOOD[g].name; }).join('和') : '') + '。</p><div class="row"><button class="btn ghost" id="hmLook">先看看牠</button><button class="btn" id="hmInv">邀請來住</button></div><div class="row" style="margin-top:6px"><button class="btn ghost" id="hmLater">晚點再說</button></div>');
    $('hmLook').onclick = function () { $('hmProf').style.display = ''; say(A0.says[0]); };
    $('hmInv').onclick = function () { var h = H(); h.adopted = h.adopted || [0]; if (h.adopted.indexOf(i) >= 0) return; h.adopted.push(i); adoptAdd(o.k); sv(); close(); say('歡迎' + A0.name + '加入牧場！謝謝' + FR[c.f].n + '～'); zooRender(true); };
    $('hmLater').onclick = adoptSheet;
  }
  var POS = {}, zooT = 0;
  /* D168：G105 共居牧場（room_ranch_v2）＋五種動物 10 格動作圖（sprite_*.webp）。雞豬牛羊：走0–3 吃4–5 睡6–7 開心8–9；狗：走0–3 坐4–5 搖尾6–9。
     動物大小照 G105_共居牧場座標_v3 display_size（÷1080）；走動範圍：草地多邊形 y 68～93%。 */
  var ASZ = { chicken: 15.7, pig: 17.6, cow: 22.2, sheep: 18, dog: 16.7 };
  function night() { var hh = new Date().getHours(); return hh >= 21 || hh < 6; }
  function zooRender(force) {
    var f = $('hmFarm'); if (!f || S.room !== 'ranch') return;
    var box = f.querySelector('.hmZoo'); if (!box) { box = document.createElement('div'); box.className = 'hmZoo'; f.appendChild(box); }
    var seen = {};
    zoo().forEach(function (a, n) {
      seen[a.id] = 1;
      var e = box.querySelector('[data-a="' + a.id + '"]');
      if (!e) { e = document.createElement('button'); e.type = 'button'; e.className = 'hmAni ' + a.k; e.dataset.a = a.id; box.appendChild(e); var p0 = POS[a.id] || { x: 15 + Math.random() * 70, y: 72 + Math.random() * 20, f: 1 }; POS[a.id] = p0; e.style.left = p0.x + '%'; e.style.top = p0.y + '%'; }
      var r = readyOf(a), pz = POS[a.id], mode = r.length ? (a.k === 'dog' ? 'wag' : 'joy') : pz.walk ? 'walk' : a.k === 'dog' ? (pz.eat ? 'sit' : 'idle') : night() && !pz.walk ? 'sleep' : pz.eat ? 'eat' : 'idle', src = '<span class="sp ' + a.k + ' ' + mode + '"></span>';
      var key = mode + r.join(',');
      if (force || e.dataset.key !== key) { e.dataset.key = key; e.classList.toggle('ready', !!r.length); e.innerHTML = '<span class="aw">' + src + '</span>' + (r.length ? '<span class="bub">' + r.map(function (g) { return GOOD[g].meat ? '<span class="pb crate">📦</span>' : img('product_' + g, 'pb'); }).join('')      /* D172：肉品不從動物頭上冒，改成合作農場備料箱（G104 C） */ + '</span>' : ''); e.setAttribute('aria-label', ANI[a.k].name + (r.length ? '：可以收' : '')); }
      e.style.zIndex = Math.round(POS[a.id].y); e.style.width = ASZ[a.k] + '%';
      e.style.setProperty('--fx', POS[a.id].f);
    });
    box.querySelectorAll('.hmAni').forEach(function (e) { if (!seen[e.dataset.a]) e.remove(); });
  }
  function zooWander() {
    if (S.room !== 'ranch' || !$('home') || !$('home').classList.contains('on')) return;
    var box = document.querySelector('#hmFarm .hmZoo'); if (!box) return;
    zoo().forEach(function (a) {
      var p0 = POS[a.id], e = box.querySelector('[data-a="' + a.id + '"]'); if (!p0 || !e || readyOf(a).length) return;
      if (p0.walk && Date.now() < p0.walk) return;
      if (p0.walk) { p0.walk = 0; zooRender(); }
      if (night() && a.k !== 'dog' && Math.random() < 0.85) return;
      if (Math.random() < 0.4) { p0.eat = Math.random() < 0.45; zooRender(); return; }
      var nx = Math.max(12, Math.min(88, p0.x + (Math.random() - 0.5) * (a.k === 'cow' ? 18 : a.k === 'dog' ? 40 : 28))), ny = Math.max(72, Math.min(93, p0.y + (Math.random() - 0.5) * 10));
      var dur = (a.k === 'cow' ? 4 : a.k === 'dog' ? 1.6 : 2.6) * 1000;
      p0.f = nx >= p0.x ? -1 : 1; p0.eat = false; p0.x = nx; p0.y = ny; p0.walk = Date.now() + dur; zooRender();
      e.style.transitionDuration = dur / 1000 + 's'; e.style.left = nx + '%'; e.style.top = ny + '%';
    });
  }
  setInterval(zooWander, 1100);

  /* ===== 廚房：配菜＋手作便當 ===== */
  function kitchen(tab) {
    var h = H(); tab = tab || kitchen.tab || 'bento'; kitchen.tab = tab;
    if (S.state !== 'home' && S.state !== 'back') { modal('<h3>🍳 廚房</h3><p>小鳶出門了，等牠回家再一起煮飯吧！菜園和牧場還是會自己長大喔。</p><div class="row"><button class="btn" id="hmX">好</button></div>'); $('hmX').onclick = close; return; }
    var html = '<h3>🍳 小鳶的廚房</h3><div class="tabs hmT"><button type="button" data-t="bento" aria-pressed="' + (tab === 'bento') + '">手作便當</button><button type="button" data-t="dish" aria-pressed="' + (tab === 'dish') + '">配菜</button></div><div class="list" style="margin:0">';
    if (tab === 'bento') {
      var bc = [], bn = [], noRice = false;      /* D191：同頁兩組——「現在能做」在上、「還差材料」在下（GPT 1720 菜單意見 C） */
      BORDER.forEach(function (k) { var b = BENTO[k], vegOk = VEG.filter(function (v) { return (h.fridge[v] || 0) > 0; }).length >= b.veg[0], ok = have(b.need) && vegOk, c = (window.__travel && __travel.CFG.bentos[k]) || {}; if (!ok && (h.fridge.gohan || 0) < (b.need.gohan || 0)) noRice = true; (ok ? bc : bn).push('<button type="button" class="opt' + (ok ? ' can' : ' lk') + '" data-b="' + k + '"' + (ok ? '' : ' disabled') + '><span class="ic em">' + img(BIMG[k]) + '</span><span class="tx">' + b.name + '<small>' + (ok ? '白飯＋' + itemName(b.main) + '＋配菜 ' + b.veg[0] + '～' + b.veg[1] + ' 樣' + (c.note ? '<br>' + c.note : '') + '<br><b class="ok">材料齊了，點一下挑配菜</b>' : '<b class="no">' + (lackShort(b.need) || '還差配菜 1 樣') + '</b>') + '</small></span><span class="n">' + (h.hb[k] ? '有 ' + h.hb[k] : '') + '</span></button>'); });
      html += grpHTML(bc, bn, noRice ? '<button type="button" class="goRc" id="hmGoRc">🍚 白飯不夠？去電鍋煮飯 ›</button>' : '');
    } else {
      var lockedD = DORDER.filter(function (k) { return !open(k); });
      var dc = [], dn = [];
      DORDER.filter(open).forEach(function (k) { var d = DISH[k], ok = have(d.need); (ok ? dc : dn).push('<button type="button" class="opt' + (ok ? ' can' : ' lk') + '" data-k="' + k + '"' + (ok ? '' : ' disabled') + '><span class="ic em">' + dishImg(k) + '</span><span class="tx">' + d.name + (h.book[k] ? '' : ' <em class="nw">新菜</em>') + '<small>' + (ok ? needLine(d.need) + '<br><b class="ok">材料齊了，點一下開始做</b>' : '<b class="no">' + lackShort(d.need) + '</b>') + '</small></span><span class="n">' + (h.box[k] ? '料理盒 ' + h.box[k] : '') + '</span></button>'); });
      html += grpHTML(dc, dn, '');
      html += fishOpt(h);      /* D175：香煎白帶魚小碟（練習） */
      if (lockedD.length) html += '<div class="lockRow"><span>' + lockedD.map(function () { return '❔'; }).join('') + '</span>還有 ' + lockedD.length + ' 道招牌菜：在港灣蓋章認識港口朋友，就會學到</div>';      /* D174：還沒學會的不再一排排灰色，收成一行 */
    }
    html += '</div><p class="mu sm">' + (tab === 'bento' ? '手作便當可以帶小鳶出門旅行（打包時在「便當」裡選）。手作便當的旅行不會撿到點數或券；點數便當還是到港口換禮換。' : '配菜帶出門，第一次帶回來會有一張料理小記。') + '</p><p class="mu sm">冰箱：' + fridgeLine() + '</p><div class="row"><button class="btn ghost" id="hmOrd">📋 訂單</button><button class="btn ghost" id="hmBook">📖 菜譜</button><button class="btn ghost" id="hmX">關閉</button></div>';
    modal(html);
    document.querySelectorAll('.hmT button').forEach(function (b) { b.onclick = function () { kitchen(b.dataset.t); }; });
    document.querySelectorAll('.hm .opt[data-k]').forEach(function (b) { b.onclick = function () { cook('d', b.dataset.k); }; });
    document.querySelectorAll('.hm .opt[data-b]').forEach(function (b) { b.onclick = function () { bentoBuild(b.dataset.b); }; });
    if ($('hmFish')) $('hmFish').onclick = fishDish;
    if ($('hmGoRc')) $('hmGoRc').onclick = riceCooker;
    $('hmBook').onclick = book; $('hmOrd').onclick = ordersSheet; $('hmX').onclick = close;
  }
  function grpHTML(can, no, extra) { return (can.length ? '<div class="kgH">現在能做（' + can.length + '）</div>' + can.join('') : '<div class="kgH">還差一點材料，先準備這些</div>') + (no.length ? (can.length ? '<div class="kgH">還差材料（' + no.length + '）</div>' : '') + no.join('') : '') + extra; }
  function cook(type, k, veg) {
    var d0 = type === 'd' ? DISH[k] : BENTO[k], need0 = Object.assign({}, d0.need); (veg || []).forEach(function (v) { need0[v] = (need0[v] || 0) + 1; }); var d = { name: d0.name, need: need0 }, prog = 0, done = false;
    function finish(stars) {
      if (done) return; done = true;
      var h = H(); if (!have(d.need)) { close(); return; }
      take(d.need); var first = false;
      if (type === 'd') { first = !h.book[k]; h.book[k] = h.book[k] || Date.now(); h.box[k] = (h.box[k] || 0) + 1; } else { h.hb[k] = (h.hb[k] || 0) + 1; h.hbVeg = h.hbVeg || {}; (h.hbVeg[k] = h.hbVeg[k] || []).push(veg || []); }
      h.best = h.best || {}; if (stars && stars > (h.best[k] || 0)) h.best[k] = stars;
      if (!sv()) { give(d.need); toast('手機存不下來，這次先不算'); return; }
      if (window.KiteBoard && type === 'd') KiteBoard.ev('home_cook', { dish: k });      /* D175：告示板委託 */
      modal((type === 'd' ? '<div class="dish">' + dishImg(k) + '</div>' : bentoBox(BENTO[k].main, veg, 0, 'big')) + '<h3 style="text-align:center">' + d.name + '做好了！' + (stars ? ' ' + '⭐'.repeat(stars) : '') + '</h3><p style="text-align:center">' + (first ? '第一次做，收進菜譜冊了！<br>' : '') + (type === 'd' ? '放進料理盒，打包出門時可以帶一份當配菜。' : ((veg || []).length ? '配菜：' + veg.map(itemName).join('、') + ((veg.length >= 2 && veg[0] !== veg[1]) ? '・🌈 彩色便當！' : '') + '<br>' : '') + '打包出門時，在「便當」裡選它就能帶小鳶去旅行。') + '</p><div class="row"><button class="btn" id="hmOk">好</button></div>');
      $('hmOk').onclick = function () { kitchen(); };
    }
    if (window.COOK) { close(); COOK.start({ name: d.name, need: d.need, kind: type === 'd' ? 'dish' : 'bento', items: cookItems(d.need) }, function (stars) { finish(stars); }); return; }
    modal('<h3>做' + d.name + '</h3><button type="button" class="pot" id="hmPot" aria-label="攪拌">' + img('pot_still', 'potI') + '</button><div class="bar"><i id="hmBar"></i></div><div class="row"><button class="btn ghost" id="hmAuto">請小鳶幫忙做好</button></div>');
    function bump() { prog = Math.min(100, prog + 9); var b = $('hmBar'); if (b) b.style.width = prog + '%'; var p = $('hmPot'); if (p) { var pi = p.querySelector('img'); pi.src = A + 'pot_stir.webp'; clearTimeout(bump.t); bump.t = setTimeout(function () { pi.src = A + 'pot_still.webp'; }, 220); p.classList.remove('stir'); void p.offsetWidth; p.classList.add('stir'); } if (prog >= 100) setTimeout(finish, 250); }
    $('hmPot').onclick = bump; $('hmAuto').onclick = function () { prog = 100; finish(0); };
  }
  var EMO = { base: '🥬', gohan: '🍚', rice: '🌾', grass: '🌿', s1: '🍠', s2: '🌽', s3: '🍅', s4: '🧅', s5: '🎃', s6: '🥕' };
  /* D189：每種食材自己的準備動作（給 cook.js）：葉菜連點切；根莖先左右滑削皮再切；玉米往下滑剝粒；蛋點兩下打蛋再滑攪拌；肉點三下撒鹽 */
  var PREP = { base: [['切', 5, 'tap']], s4: [['切', 5, 'tap']], s3: [['切', 4, 'tap']], s1: [['削皮', 3, 'swipe'], ['切', 3, 'tap']], s5: [['削皮', 3, 'swipe'], ['切', 3, 'tap']], s6: [['削皮', 3, 'swipe'], ['切', 3, 'tap']], s2: [['剝玉米粒', 3, 'swipe', 'down']], egg: [['打蛋', 2, 'tap'], ['攪拌', 4, 'swipe']], chicken: [['撒鹽', 3, 'tap']], pork: [['撒鹽', 3, 'tap']], beef: [['撒鹽', 3, 'tap']] };
  function prepOf(k) { return (PREP[k] || []).map(function (x) { return { v: x[0], n: x[1], g: x[2], dir: x[3] }; }); }
  function cookItems(need) { var o = {}; Object.keys(need).forEach(function (k) { var c = CROP[k]; o[k] = { name: itemName(k), e: EMO[k] || (GOOD[k] && GOOD[k].em) || '🍴', type: k === 'gohan' ? 'rice' : PREP[k] ? 'chop' : 'cook', steps: prepOf(k), img: c && c.f ? 'crop_' + c.f + '_mature' : GOOD[k] && !GOOD[k].noImg ? 'product_' + k : '', cut: c && c.f && k !== 'rice' && k !== 'grass' ? 'cut_' + c.f : '' }; if (k === 'egg') { o[k].cut = 'egg_bowl'; o[k].cutMid = 1; } });      /* D190：打完蛋，砧板上換成 GPT 打蛋碗（攪拌、下鍋都用這張） */ return o; }
  function book() {
    var h = H(), html = '<h3>📖 菜譜冊與料理小記</h3><div class="list" style="margin:0">';
    DORDER.forEach(function (k) { var d = DISH[k], has = h.book[k], st = h.stories[k]; html += '<button type="button" class="opt"' + (st ? ' data-st="' + k + '"' : ' disabled') + (has ? '' : ' style="opacity:.5"') + '><span class="ic em">' + (st ? img('landmark_' + d.lm) : has ? dishImg(k) : '❔') + '</span><span class="tx">' + (has ? d.name + (h.best && h.best[k] ? ' ' + '⭐'.repeat(h.best[k]) : '') : '還沒做過') + '<small>' + (st ? '<b>' + d.story[0] + '</b>・點一下看' : has ? '帶這道菜出門一趟，就會收到料理小記' : '') + '</small></span></button>'; });
    html += '</div><p class="mu sm">小記存在這台手機，換手機或清除資料可能會看不到。</p><div class="row"><button class="btn ghost" id="hmK">回廚房</button></div>';
    modal(html); $('hmK').onclick = function () { kitchen(); };
    document.querySelectorAll('[data-st]').forEach(function (b) { b.onclick = function () { story(b.dataset.st); }; });
  }
  function story(k) {
    var d = DISH[k];
    modal('<div class="stc"><div class="stIn">' + img('landmark_' + d.lm, 'stL') + dishImg(k).replace('class="hi"', 'class="stD"') + '<b>' + d.story[0] + '</b><p>' + d.story[1] + '</p></div></div><div class="row"><button class="btn" id="hmBk">回菜譜冊</button></div>');
    $('hmBk').onclick = book;
  }
  /* ===== D175（GPT G105 0330 方案 2 縮小版）：捕魚認識白帶魚以後，廚房多一道「香煎白帶魚小碟」免費練習 =====
     只看捕魚圖鑑（kiteFishingDex2）有沒有白帶魚；不扣材料、不發食材、不放進料理盒、不能帶出門，只留一句紀念。 */
  function knowHairtail() { var dx = rd('kiteFishingDex2') || {}; return !!dx.hairtail; }
  function fishOpt(h) {
    var ok = knowHairtail(), n = (h.fishDish && h.fishDish.n) || 0;
    return '<button type="button" class="opt' + (ok ? ' can' : '') + '" id="hmFish"' + (ok ? '' : ' disabled') + '><span class="ic em">' + img('dish_hairtail') + '</span><span class="tx">香煎白帶魚小碟 <em class="nw">練習</em><small>' + (ok ? '你在捕魚認識了白帶魚！<br><b class="ok">免費練習做做看（不用材料）</b>' : '先在「小鳶捕魚」抓到一次白帶魚，就能來練習') + '</small></span><span class="n">' + (n ? '做過 ' + n + ' 次' : '') + '</span></button>';
  }
  function fishDish() {
    if (!knowHairtail()) return;
    var step = 0;
    function show() {
      var h = H(), tip = '<p class="mu sm" style="text-align:center">這是練習：不用材料，也不會放進料理盒。</p>';
      if (step === 0) modal('<h3 style="text-align:center">香煎白帶魚小碟</h3><div class="dish"><img class="hi" src="../assets/fish_hairtail_v2.png" alt="" style="width:100%;max-width:260px;height:auto" draggable="false"></div><p style="text-align:center">在港口認識的白帶魚，回家做成一道小菜吧！</p>' + tip + '<div class="row"><button class="btn" id="hmGo">🔪 請小鳶切成三段</button><button class="btn ghost" id="hmX">先不要</button></div>');
      else if (step === 1) modal('<h3 style="text-align:center">切成三段了！</h3><p class="mu sm" style="text-align:center;margin:0">白帶魚小碟練習</p><div class="dish">' + img('hairtail_cut') + '</div><p style="text-align:center">放進鍋子，煎一煎吧！</p><div class="row"><button class="btn" id="hmGo">🍳 放進鍋子</button><button class="btn ghost" id="hmX">先不做了</button></div>');
      else if (step === 2) modal('<h3 style="text-align:center">🔥 滋滋滋……</h3><div class="dish">' + img('pan_hairtail') + '</div><p style="text-align:center">一面煎得金黃了，幫它翻個面！</p><div class="row"><button class="btn" id="hmGo">🔄 翻面</button><button class="btn ghost" id="hmX">先不做了</button></div>');
      else {
        var n = ((h.fishDish && h.fishDish.n) || 0) + 1; h.fishDish = { n: n, t: Date.now(), first: (h.fishDish && h.fishDish.first) || Date.now() }; sv();
        modal('<div class="dish">' + img('dish_hairtail') + '</div><h3 style="text-align:center">香煎白帶魚小碟做好了！</h3><p style="text-align:center">' + (n === 1 ? '第一次做就好香！' : '這是第 ' + n + ' 次練習，越來越熟練了！') + '<br>你練習做了：<b>香煎白帶魚</b></p>' + tip + '<div class="row"><button class="btn" id="hmOk">回廚房</button></div>');
        $('hmOk').onclick = function () { kitchen('dish'); }; return;
      }
      $('hmGo').onclick = function () { step++; show(); }; $('hmX').onclick = function () { kitchen('dish'); };
    }
    show();
  }

  /* ===== D189 食物系統 v2（Dari 10/27：「稻米是不是該煮才會有飯」「摘菜取肉可以一鍵領取」「這麼多種類的菜都沒用」） ===== */
  /* --- 電鍋：稻米 1 份煮 20 分鐘變 2 碗白飯；一次最多放 3 份 --- */
  var RC_MIN = 20, RC_MAX = 3;
  function rcState() { var h = H(), r = h.rc; if (!r) return { st: 'idle' }; var left = r.t + RC_MIN * MIN - Date.now(); return left > 0 ? { st: 'cook', left: left, n: r.n } : { st: 'done', n: r.n }; }
  /* D201（GPT 1015 C）：真正盛飯成功後，三朵淡蒸氣從電鍋飄向小鳶，小鳶原圖往電鍋那邊微微前傾再回位，說「飯香跑過來啦！」。不加分、不加步驟；小鳶不在畫面上就照舊。 */
  function riceSniff() {
    try {
      var room = $('room'), b = $('bird'); if (!room || !b || b.style.display === 'none' || !b.offsetWidth || !b.animate) return false;
      var R = room.getBoundingClientRect(), B = b.getBoundingClientRect(); if (!R.width) return false;
      var bx = (B.left + B.width / 2 - R.left) / R.width * 100, by = (B.top + B.height * 0.35 - R.top) / R.height * 100, sx = 26, sy = 56, dir = bx < sx ? 1 : -1;
      for (var i = 0; i < 3; i++) { (function (i) { var e = document.createElement('div'); e.className = 'hmSteam'; e.style.left = sx + '%'; e.style.top = sy + '%'; room.appendChild(e); var dx = (bx - sx) / 100 * R.width, dy = (by - sy) / 100 * R.height; e.animate([{ transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 }, { transform: 'translate(calc(-50% + ' + dx * 0.35 + 'px),calc(-50% + ' + (dy * 0.35 - 26) + 'px)) scale(1)', opacity: 0.75, offset: 0.35 }, { transform: 'translate(calc(-50% + ' + dx + 'px),calc(-50% + ' + dy + 'px)) scale(1.4)', opacity: 0 }], { duration: 1300, delay: i * 180, easing: 'ease-out', fill: 'both' }); setTimeout(function () { e.remove(); }, 1300 + i * 180 + 80); })(i); }
      setTimeout(function () { var b2 = $('bird'); if (b2 && b2.animate) b2.animate([{ rotate: '0deg' }, { rotate: (dir * 7) + 'deg', offset: 0.4 }, { rotate: (dir * 7) + 'deg', offset: 0.6 }, { rotate: '0deg' }], { duration: 700, easing: 'ease-in-out' }); say('飯香跑過來啦！'); }, 750);
      return true;
    } catch (x) { return false; }
  }
  function riceCooker() {
    var h = H(), r = rcState();
    if (r.st === 'done') { give({ gohan: r.n * 2 }); h.rc = null; sv(); pop(26, 52, '+' + r.n * 2 + ' 白飯'); render(); if (!riceSniff()) say(['飯煮好了，好香！', '白飯熱騰騰的～', '電鍋跳起來了！'][Math.floor(Math.random() * 3)]); return; }
    if (r.st === 'cook') { say('飯還要 ' + mins(r.left) + '，電鍋咕嘟咕嘟～'); return; }
    var have0 = h.fridge.rice || 0;
    var html = '<h3>🍚 電鍋煮飯</h3><div class="rcPic">' + img('rc_empty') + '<span>→</span>' + img('product_gohan') + '<b>×2</b></div><p>稻米要先煮成<b>白飯</b>，做菜和便當才用得到。<br>1 份稻米 → 2 碗白飯，大約 ' + mins(RC_MIN * MIN) + '。</p><p class="mu sm">冰箱：稻米 ' + have0 + ' 份・白飯 ' + (h.fridge.gohan || 0) + ' 碗</p>';
    if (!have0) html += '<p class="mu sm">冰箱沒有稻米了，去花園種稻米吧！</p><div class="row"><button class="btn" id="hmGo2">去花園</button><button class="btn ghost" id="hmX">關閉</button></div>';
    else html += '<div class="rcN">' + [1, 2, 3].filter(function (n) { return n <= Math.min(RC_MAX, have0); }).map(function (n) { return '<button type="button" class="btn' + (n === Math.min(RC_MAX, have0) ? '' : ' ghost') + '" data-rc="' + n + '">放 ' + n + ' 份稻米（煮出 ' + n * 2 + ' 碗）</button>'; }).join('') + '</div><div class="row"><button class="btn ghost" id="hmX">先不要</button></div>';
    modal(html);
    document.querySelectorAll('[data-rc]').forEach(function (b) { b.onclick = function () { var n = +b.dataset.rc; if ((h.fridge.rice || 0) < n) return; take(mk('rice', n)); h.rc = { t: Date.now(), n: n }; sv(); close(); say('洗米、加水、按下去！電鍋開始煮飯囉～'); }; });
    if ($('hmGo2')) $('hmGo2').onclick = function () { $('modal').classList.remove('on'); setRoom('garden'); render(); };
    $('hmX').onclick = close;
  }
  /* --- 一鍵收成：花園全部收、牧場全部收；偶爾大豐收多 1 份 --- */
  function harvestAll() {
    var h = H(), got = {}, n = 0, lucky = 0;
    h.plots.forEach(function (p, i) { if (!landOpen(i) || stage(p) !== 3) return; var yy = CROP[p.v].y || 2; if (Math.random() < 0.12) { yy++; lucky++; } got[p.v] = (got[p.v] || 0) + yy; h.xp++; n++; if (window.KiteBoard) KiteBoard.ev('home_harvest', { crop: p.v }); h.plots[i] = { v: '', t: 0 }; });
    if (!n) return; give(got); sv(); render(); sumModal('🧺 收成了 ' + n + ' 格菜圃' + (lucky ? '・大豐收 ' + lucky + ' 次！' : ''), got, '空出來的菜圃可以再種新的菜。');
  }
  function collectAll() {
    var h = H(), got = {}, n = 0;
    zoo().forEach(function (a) { var r = readyOf(a); if (!r.length) return; r.forEach(function (g) { got[g] = (got[g] || 0) + 1; a.t[g] = Date.now(); }); h.xp++; n++; });
    if (!n) return; give(got); sv(); zooRender(true); render(); sumModal('🧺 從 ' + n + ' 隻動物那裡收好了', got, Object.keys(got).some(function (g) { return GOOD[g].meat; }) ? '肉品是合作農場備料箱送來的，一樣放進冰箱。' : '');
  }
  function sumModal(title, got, note) { modal('<h3>' + title + '</h3><div class="sumG">' + Object.keys(got).map(function (k) { return '<span>' + itemIc(k, 'sgi') + '<b>' + itemName(k) + '</b>+' + got[k] + '</span>'; }).join('') + '</div>' + (note ? '<p class="mu sm">' + note + '</p>' : '') + '<div class="row"><button class="btn" id="hmOk">好</button></div>'); $('hmOk').onclick = close; say('收好了，冰箱滿滿的！'); }
  /* --- 便當自己配菜：任何一種菜都能放；兩種不同的菜＝彩色便當，出門的信會提到吃了什麼 --- */
  var VEG = ['base', 's1', 's2', 's3', 's4', 's5', 's6'];
  /* D190：GPT G105 食物 v2「配菜旅行感想・小鳶口吻 v1」7 種各 2 句，信裡用「便當裡有○○和○○。小鳶說：『…』」 */
  var VEGLINE = { base: ['我把小白菜吃光光了！', '出門帶著小白菜，我好開心！'], s1: ['我咬一口地瓜，心裡甜甜的！', '我把地瓜留到最後，慢慢吃完！'], s2: ['我一口一口吃玉米，好開心！', '我帶著玉米出門，便當好香呀！'], s3: ['我吃到番茄，嘴角都笑彎了！', '這趟有番茄陪我，我好喜歡！'], s4: ['我聞到青蔥香，就想吃便當了！', '我把青蔥拌進飯裡，好香呀！'], s5: ['我吃著南瓜，開心地晃晃腳！', '我吃完南瓜，還捨不得蓋上便當！'], s6: ['我把紅蘿蔔吃光了，一口也沒剩！', '出門吃到紅蘿蔔，我笑咪咪的！'] };
  /* D190：三格便當盒（GPT bento_box_empty_top_v3＋12 種便當格食材，座標照「三格便當靜態建議座標_v1」換成盒子裁切後的 %）：左大格白飯、右上主菜、右下配菜（兩種各占一半）。
     edit＝挑配菜畫面：配菜格可以點，空的顯示＋。全部用 span／button，放進信裡的 <p> 也不會斷。 */
  var BXR = { rice: [6.1, 11.4, 40, 76.5], main: [54.4, 11.4, 38.8, 32.3], v1: [54.4, 52.2, 38.8, 35.7], vA: [54.4, 52.2, 18.8, 35.7], vB: [74.4, 52.2, 18.8, 35.7] };
  function bfImg(k) { var f = k === 'gohan' ? 'rice' : CROP[k] && CROP[k].f ? CROP[k].f : k; return '<img src="' + A + 'bf_' + f + '.webp" alt="' + itemName(k) + '" draggable="false">'; }
  function bxAt(r) { return 'left:' + r[0] + '%;top:' + r[1] + '%;width:' + r[2] + '%;height:' + r[3] + '%'; }
  function bentoBox(main, veg, edit, cls) {
    veg = veg || []; var slots = edit ? Math.max(1, edit) : veg.length, html = '<span class="bbox' + (cls ? ' ' + cls : '') + '"><img class="bbg" src="' + A + 'bento_box_top.webp" alt="" draggable="false"><span class="bf" style="' + bxAt(BXR.rice) + '">' + bfImg('gohan') + '</span><span class="bf" style="' + bxAt(BXR.main) + '">' + bfImg(main) + '</span>';
    for (var n = 0; n < slots; n++) { var r = slots >= 2 ? (n ? BXR.vB : BXR.vA) : BXR.v1, v = veg[n];
      html += edit ? '<button type="button" class="bf vs' + (v ? ' on' + (slots >= 2 ? ' two' : '') : ' empty') + '" data-rm="' + n + '" style="' + bxAt(r) + '" aria-label="' + (v ? '拿出' + itemName(v) : '空的配菜格') + '">' + (v ? bfImg(v) : '<b>＋</b><small>配菜</small>') + '</button>' : '<span class="bf' + (slots >= 2 ? ' two' : '') + '" style="' + bxAt(r) + '">' + bfImg(v) + '</span>'; }
    return html + '</span>';
  }
  function bentoBuild(k, sel) {
    var h = H(), b = BENTO[k]; sel = sel || [];
    var vs = VEG.filter(function (v) { return open(v) && (h.fridge[v] || 0) > 0; });
    var need = Object.assign({}, b.need); sel.forEach(function (v) { need[v] = (need[v] || 0) + 1; });
    var okN = sel.length >= b.veg[0], ok = okN && have(need), colorful = sel.length >= 2 && sel[0] !== sel[1];
    var html = '<h3>🍱 ' + b.name + '</h3>' + bentoBox(b.main, sel, b.veg[1]) + '<p class="bxl">白飯・' + itemName(b.main) + '・' + (sel.length ? sel.map(itemName).join('＋') : '配菜') + '</p>';      /* D190：直接看到真的便當盒，選的菜就放在右下格 */
    html += '<p class="mu sm">點下面的菜放進便當格（' + (b.veg[0] ? '至少 ' + b.veg[0] + ' 樣，' : '') + '最多 ' + b.veg[1] + ' 種；點便當裡的菜可以拿出來）。放兩種不一樣的菜，就是<b>彩色便當</b>！</p><div class="vegPick">' + (vs.length ? vs.map(function (v) { var used = sel.filter(function (x) { return x === v; }).length; return '<button type="button" data-vg="' + v + '"' + ((h.fridge[v] || 0) - used <= 0 || sel.length >= b.veg[1] ? ' disabled' : '') + '>' + itemIc(v) + itemName(v) + '<em>' + ((h.fridge[v] || 0) - used) + '</em></button>'; }).join('') : '<span class="mu sm">冰箱沒有菜，先去花園收成吧！</span>') + '</div>';
    html += (colorful ? '<p class="cfl">🌈 彩色便當！小鳶出門會寫信告訴你吃起來怎麼樣</p>' : '') + '<p class="mu sm">' + (ok ? '<b class="ok">材料齊了！</b>' : '<b class="no">' + (!okN ? '再放 ' + (b.veg[0] - sel.length) + ' 樣配菜' : '還缺 ' + lack(need)) + '</b>') + '</p><div class="row"><button class="btn" id="hmGo"' + (ok ? '' : ' disabled') + '>開始做</button><button class="btn ghost" id="hmBk">回廚房</button></div>';
    modal(html);
    document.querySelectorAll('[data-vg]').forEach(function (x) { x.onclick = function () { bentoBuild(k, sel.concat([x.dataset.vg])); }; });
    document.querySelectorAll('[data-rm]').forEach(function (x) { x.onclick = function () { var n = +x.dataset.rm; if (sel[n]) { var c = sel.slice(); c.splice(n, 1); bentoBuild(k, c); } }; });
    $('hmGo').onclick = function () { if (ok) cook('b', k, sel); }; $('hmBk').onclick = function () { kitchen('bento'); };
  }
  function kitchenHTML() { var r = rcState(); return '<button type="button" class="hmStove" style="left:72%;top:62%" aria-label="做菜">' + img('pot_still', 'si') + '<span class="lb">點鍋子做菜</span></button><button type="button" class="hmStove hmRc ' + r.st + '" style="left:26%;top:60%" aria-label="電鍋">' + img(r.st === 'done' ? 'rc_ready' : r.st === 'cook' ? 'rc_cooking' : 'rc_empty', 'si rci') + '<span class="lb">' + (r.st === 'done' ? '🍚 飯好了！' : r.st === 'cook' ? '煮飯中 ' + sm(r.left) : '電鍋煮飯') + '</span></button>'; }

  /* ===== 打包：配菜＋手作便當 ===== */
  var side = '';
  function packHTML() {
    var h = H(), ks = DORDER.filter(function (k) { return h.box[k]; });
    if (!ks.length) return '<h3>配菜（可不帶）</h3><p class="pad muted" style="margin:0 16px;font-size:13px">料理盒空空的。不帶也能照常出發；想帶的話，到廚房做一道配菜。</p>';
    if (side && !h.box[side]) side = '';
    return '<h3>配菜（可不帶）</h3><p class="pad muted" style="margin:0 16px 6px;font-size:12px">不帶也能照常出發。出發時才會從料理盒拿走一份。</p><div class="list">' + ks.map(function (k) { var d = DISH[k], on = side === k; return '<button type="button" class="opt" data-side="' + k + '" aria-pressed="' + on + '"><span class="ic em">' + dishImg(k) + '</span><span class="tx">' + d.name + '<small>' + (on ? '<b class="ok">已選帶 1 份・再點一次取消</b><br>' : '') + (h.stories[k] ? '已經拿過小記，再帶會多一段小故事' : '第一次帶出門，回來會有一張料理小記') + '</small></span><span class="n">' + h.box[k] + '</span></button>'; }).join('') + '</div>';
  }
  function bindPack(rerender) { document.querySelectorAll('[data-side]').forEach(function (b) { b.onclick = function () { side = side === b.dataset.side ? '' : b.dataset.side; rerender(); /* 選中狀態寫在卡片上 */ }; }); }
  function onDepart(trip) { var h = H(); if (side && h.box[side] > 0) { h.box[side]--; trip.side = side; } side = ''; if (BENTO[trip.bento] && h.hb[trip.bento] > 0) { h.hb[trip.bento]--; var q = (h.hbVeg || {})[trip.bento]; if (q && q.length) trip.hbVeg = q.shift(); } }
  /* D191：N1 出門前掀蓋看便當（GPT bento_lid_top_v1，425×294 蓋子對齊盒子可見框、放 102%）。看的是這次真的會帶走的那一盒（hbVeg 佇列第一個），不另外扣材料 */
  var LIDLINE = { egg: '蛋飯糰，我要帶你出門！', chicken: '香香雞腿，等等一起吃！', pork: '有豬排，出門好開心！', beef: '牛肉配白飯，我好期待！' };      /* D192：GPT 1820 A——掀蓋後依主菜說一句 */
  function lidPeek(k, go) {
    var h = H(), b = BENTO[k]; if (!b) { go(); return; }
    var q = ((h.hbVeg || {})[k] || [])[0] || [], vv = q.filter(function (x, i, a) { return a.indexOf(x) === i; });
    modal('<h3 style="text-align:center">🍱 出門前，看一眼便當</h3><button type="button" class="lidW" id="hmLid" aria-label="掀開便當蓋">' + bentoBox(b.main, q, 0, 'big') + '<img class="lid" src="' + A + 'bento_lid_top.webp" alt="" draggable="false"></button><p class="lidT" id="hmLidT">點蓋子，打開看看！</p><div class="row"><button class="btn" id="hmLidGo">出發</button></div>');
    var opened = false;
    function open1() { if (opened) return; opened = true; $('hmLid').classList.add('open'); $('hmLidT').innerHTML = '白飯、' + itemName(b.main) + (vv.length ? '，還有' + vv.map(itemName).join('和') : '') + '！<br>小鳶說：「' + (LIDLINE[b.main] || '我會好好吃完的！') + '」'; }
    $('hmLid').onclick = open1;
    $('hmLidGo').onclick = function () { $('modal').classList.remove('on'); go(); };
  }
  function hbCount(k) { return H().hb[k] || 0; }
  function bentoIcon(k) { return BIMG[k] ? '<img class="ic" src="' + A + BIMG[k] + '.webp" alt="">' : '<span class="ic emo hbI">🍱</span>'; }
  /* D192：N3 回家小故事卡（GPT 1820 C，新圖 0）——手作便當那趟，信拆完後多兩張紙卡：①我帶的便當 ③我回家了（②路上小發現等 N2，有資料才放）。略過也照樣入冊、不重扣不重發 */
  function story(tr) {
    if (!tr || !tr.hbVeg || !tr.hbVeg.length || !BENTO[tr.bento]) return null;
    var b = BENTO[tr.bento], vv = tr.hbVeg.filter(function (x, i, a) { return a.indexOf(x) === i; });
    if (!tr.hbLine) { var pv = vv[Math.floor(Math.random() * vv.length)]; tr.hbLine = (VEGLINE[pv] || [''])[Math.floor(Math.random() * 2)] || ''; sv(); }
    return { box: bentoBox(b.main, tr.hbVeg, 0, 'big'), what: '白飯、' + itemName(b.main) + '，還有' + vv.map(itemName).join('和'), line: tr.hbLine };
  }
  function letterExtra(tr, noBento) {
    var vl = '';
    if (!noBento && tr && tr.hbVeg && tr.hbVeg.length && BENTO[tr.bento]) {      /* D189／D190：手作便當的配菜，信裡附一張便當小圖，小鳶說一句（從真的放進去的菜裡挑，挑過就記在這趟旅行上） */
      var vv = tr.hbVeg.filter(function (x, i, a) { return a.indexOf(x) === i; });
      if (!tr.hbLine) { var pv = vv[Math.floor(Math.random() * vv.length)]; tr.hbLine = (VEGLINE[pv] || [''])[Math.floor(Math.random() * 2)] || ''; sv(); }
      vl = bentoBox(BENTO[tr.bento].main, tr.hbVeg, 0, 'ltr') + '便當裡有' + vv.map(itemName).join('和') + '。小鳶說：「' + tr.hbLine + '」';
    }
    if (!tr || !tr.side || !DISH[tr.side]) return vl;
    var h = H(), k = tr.side, d = DISH[k];
    if (!tr.sideDone) { tr.sideDone = h.stories[k] ? 'again' : 'new'; if (!h.stories[k]) h.stories[k] = Date.now(); sv(); }
    return (vl ? vl + '<br>' : '') + (tr.sideDone === 'new' ? '帶了' + d.name + '，收到一張「' + d.story[0] + '」（在廚房菜譜冊）' : '路上吃了' + d.name + '，小鳶說好好吃！');
  }

  /* ===== D169（G105 A3／A4／A5＋C 方案一，GPT 14 張圖）：朋友帶著心情敲門、港邊兩張小訂單（雙爐）、我的港景小房間、朋友的照護委託
     紅線不變：不產生點數或券、沒有新貨幣；朋友不會因為沒招待而生氣；每個委託都有一條不用材料的照護小故事。 */
  var FR = {      /* D171：台詞換 GPT D169 逐句修訂 v1 */
    1: { n: "探頭小鳶", mood: ["share", "warm"], knock: "叩叩！我從牆後面探頭過來囉～", yum: "就是這個！有你陪我吃，心裡暖暖的！", ok: "謝謝招待，肚子飽飽的！", chat: "我們一起數港口的船，數到第 12 艘就忘記了，哈哈。" },
    2: { n: "打盹小鳶", mood: ["warm", "share"], knock: "呼啊……我睡醒就聞到香味，走過來了。", yum: "好好吃……有你陪我，好幸福。", ok: "嗯嗯，好吃。謝謝你陪我吃。", chat: "我夢見港口的船都會唱歌耶！" },
    3: { n: "剛到港口的小鳶", mood: ["colorful", "share"], knock: "我剛下船！背包裡有張明信片，給你看看！", yum: "哇，好好吃！今天又多了一件開心的事！", ok: "謝謝！吃飽飽，我又有精神了！", chat: "你看這張明信片！下次想一起去看海邊的彩色小屋。" },
    4: { n: "鯨鯊", mood: ["fresh", "colorful"], knock: "我游過來敲門了～（尾巴拍拍）", yum: "哇，真好吃！尾巴都忍不住擺呀擺！", ok: "謝謝，我要游回去跟大家說。", chat: "今天和小魚一起游泳，好開心！" },
    5: { n: "海龜", mood: ["fresh", "warm"], knock: "慢慢走……終於走到你家了。", yum: "剛剛好的味道，慢慢吃最好吃。", ok: "謝謝你，我會慢慢消化的。", chat: "我喜歡乾乾淨淨的海。小魚游呀游，看多久都不膩。" },
    6: { n: "小卷", mood: ["colorful", "fresh"], knock: "叩叩！我來找你玩囉～（輕輕揮揮觸腕）", yum: "好好吃！我的心情像小燈一樣亮亮的！", ok: "謝謝招待！我要去看看港邊的燈囉～", chat: "晚上看港邊的燈亮起來，我就會想起今天！" }
  };
  var MOOD = { warm: '暖暖的', fresh: '清爽的', colorful: '好多顏色', share: '一起吃' };
  var DMOOD = { base: 'fresh', s1: 'warm', s2: 'warm', s3: 'colorful', s4: 'fresh', s5: 'warm', s6: 'colorful' };
  function moodOf(k) { return BENTO[k] ? 'share' : DMOOD[k]; }
  function met(f) { var fr = rd('kiteFriends1') || {}, st = rd('kiteStamp1') || {}; if (fr[f]) return true; for (var n in PAL_OF) if (PAL_OF[n] === f && st.spots && st.spots[n]) return true; return false; }
  function friends() { var a = [1, 2, 3, 4, 5, 6].filter(met); if (a.indexOf(1) < 0) a.unshift(1); return a; }      /* 探頭小鳶是小屋常客，還沒去現場也會來；其他朋友在港灣蓋章認識後才會來 */
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function vimg(f, cls) { return img('visitor_f' + f, cls || 'vi'); }
  function mimg(m, cls) { return img('mood_' + m, cls || 'mi'); }
  function rec(f) { var h = H(); h.fr = h.fr || {}; return h.fr[f] = h.fr[f] || { n: 0, h: 0 }; }
  function food(k) { return DISH[k] ? { name: DISH[k].name, pic: dishImg(k) } : { name: BENTO[k].name, pic: img(BIMG[k]) }; }
  /* --- A3 朋友帶著心情敲門 --- */
  var VIS_MIN = 180;
  function visTick() { var h = H(); if (!S.firstDone || !(S.trips > 0)) return null;      /* D172：第一次旅行回來以後朋友才開始來敲門，新手第一個畫面不要那麼多事 */
    h.vis = h.vis || { next: Date.now() + MIN }; if (!h.vis.cur && Date.now() >= h.vis.next) { var f = pick(friends()); h.vis.cur = { f: f, m: pick(FR[f].mood) }; sv(); } return h.vis.cur; }
  function visDone(line, gain, f, extra) {
    var h = H(), r0 = rec(f); r0.n++; r0.h += gain; h.vis.cur = null; h.vis.next = Date.now() + VIS_MIN * MIN; sv();
    modal('<div class="vCard">' + vimg(f) + '</div><h3 style="text-align:center">' + FR[f].n + '</h3><p style="text-align:center">「' + line + '」</p>' + (extra || '') + '<p class="mu sm" style="text-align:center">' + (gain ? '💛 +' + gain + '（和' + FR[f].n + '的回憶 ' + r0.h + '）' : '一起度過了一段時間') + '・' + FR[f].n + '來玩過 ' + r0.n + ' 次</p><div class="row"><button class="btn" id="hmOk">好</button></div>');
    $('hmOk').onclick = close; say(gain > 1 ? '朋友好開心！' : '下次還要再來喔～');
  }
  function visitSheet() {
    var h = H(), v = visTick(); if (!v) { say('現在沒有人敲門，等等再看看。'); return; }
    var F = FR[v.f], opts = DORDER.filter(function (k) { return h.box[k]; }).concat(BORDER.filter(function (k) { return h.hb[k]; }));
    var html = '<div class="vCard">' + vimg(v.f) + '<div class="vMood">' + mimg(v.m) + '<b>' + MOOD[v.m] + '</b></div></div><h3>' + F.n + '來敲門了！</h3><p>「' + F.knock + '今天想吃<b>' + MOOD[v.m] + '</b>東西。」</p>';
    if (opts.length) html += '<p class="mu sm">從料理盒或手作便當挑一份招待（配合心情的有 💛💛）：</p><div class="list" style="margin:0">' + opts.map(function (k) { var fd = food(k), m = moodOf(k) === v.m; return '<button type="button" class="opt' + (m ? ' can' : '') + '" data-vk="' + k + '"><span class="ic em">' + fd.pic + '</span><span class="tx">' + fd.name + '<small>' + MOOD[moodOf(k)] + (m ? '・<b class="ok">剛好是今天的心情 💛💛</b>' : '・💛') + '</small></span><span class="n">' + (DISH[k] ? h.box[k] : h.hb[k]) + '</span></button>'; }).join('') + '</div>';
    else html += '<p class="mu sm">料理盒和手作便當都空空的。到廚房做一道配菜，下次就能招待朋友（不招待也沒關係）。</p>';
    html += '<div class="row"><button class="btn ghost" id="hmChat">陪牠聊聊天</button><button class="btn ghost" id="hmX">晚點再說</button></div>';
    modal(html);
    document.querySelectorAll('[data-vk]').forEach(function (b) { b.onclick = function () { var k = b.dataset.vk, m = moodOf(k) === v.m; if (DISH[k]) { if (!(h.box[k] > 0)) return; h.box[k]--; } else { if (!(h.hb[k] > 0)) return; h.hb[k]--; } visDone(m ? F.yum : F.ok, m ? 2 : 1, v.f, '<div class="dish" style="width:96px;height:96px">' + food(k).pic + '</div>'); }; });
    $('hmChat').onclick = function () { visDone(F.chat, 0, v.f); }; $('hmX').onclick = close;
  }
  /* --- A4 港邊兩張小訂單（回禮＝房間裝飾，一次性，不發點券） --- */
  var GIFT = { rug: { n: '圓編織地毯', r: [386.7581, 828.803, 446.8828], z: 1 }, lamp: { n: '小燈塔燈', r: [141.8055, 442.5037, 172.3691], z: 2 }, planter: { n: '窗台小盆栽', r: [281.5863, 470.6269, 84.467], z: 2 }, frame: { n: '港景木框畫', r: [553.2842, 452.5316, 261.3895], z: 2 } };
  var GORDER = ['rug', 'lamp', 'planter', 'frame'], ORD_MIN = 90, osel = [];
  function recipeOf(k) { return DISH[k] || BENTO[k]; }
  function ordTick() {
    var h = H(), o = h.ord = h.ord || { list: [], next: 0, done: 0 }, now = Date.now(), ch = false;
    if (!o.init) { o.init = 1; ch = true; }
    for (var guard = 0; guard < 3 && o.list.length < 2; guard++) {
      if (o.next && now < o.next) break;
      var fs = friends().filter(function (f) { return !o.list.some(function (x) { return x.f === f; }); }), ks = DORDER.filter(open).concat(BORDER).filter(function (k) { return !o.list.some(function (x) { return x.k === k; }); });
      ks = ks.filter(canMake); if (!ks.length) break;
      var f = pick(fs.length ? fs : friends()), k = pick(ks); o.list.push({ id: 'o' + now.toString(36) + guard, f: f, k: k, m: moodOf(k) }); o.next = 0; ch = true;
    }
    if (o.list.length < 2 && !o.next) { o.next = now + ORD_MIN * MIN; ch = true; }
    if (ch) sv();
    return o;
  }
  var SRC = { egg: ['chicken'], chicken: ['chicken'], pork: ['pig'], milk: ['cow', 'sheep'], beef: ['cow'] };
  function canMake(k) { var n = recipeOf(k).need, ks0 = zoo().map(function (a) { return a.k; }); return Object.keys(n).every(function (v) { return v === 'gohan' ? true : CROP[v] ? open(v) : (SRC[v] || []).some(function (a) { return ks0.indexOf(a) >= 0; }); }); }      /* D172：只開現在做得出來的訂單（沒有豬就不會出豬排便當） */
  function swapOrder(id) { var o = H().ord; o.list = o.list.filter(function (x) { return x.id !== id; }); o.next = 0; osel = osel.filter(function (x) { return x !== id; }); ordTick(); }
  function needSum(ks) { var t = {}; ks.forEach(function (k) { var n = recipeOf(k).need; Object.keys(n).forEach(function (v) { t[v] = (t[v] || 0) + n[v]; }); }); return t; }
  function ordersSheet() {
    var h = H(); if (S.state !== 'home' && S.state !== 'back') { modal('<h3>📋 港邊訂單</h3><p>小鳶出門了，等牠回家再一起接訂單吧！</p><div class="row"><button class="btn" id="hmX">好</button></div>'); $('hmX').onclick = close; return; }
    var o = ordTick(); osel = osel.filter(function (id) { return o.list.some(function (x) { return x.id === id; }); });
    var gl = GORDER.filter(function (g) { return !(h.deco || {})[g]; });
    var html = '<h3>📋 港邊兩張小訂單</h3><p class="mu sm">挑一張或兩張一起做。兩張一起做時，①用左爐、②用右爐，自己安排先後。完成可以拿到朋友的回禮（擺進客廳）。</p><div class="list" style="margin:0">';
    o.list.forEach(function (x, n) { var d = recipeOf(x.k), on = osel.indexOf(x.id) >= 0, gi = gl[n] ; html += '<button type="button" class="opt ordC" data-o="' + x.id + '" aria-pressed="' + on + '"><span class="ic em">' + vimg(x.f, 'hi') + '</span><span class="tx">' + FR[x.f].n + '：「今天想吃' + d.name + '！」<small>心情：' + MOOD[x.m] + '<br>' + needLine(d.need) + '<br>' + (gi ? '回禮：' + GIFT[gi].n : '回禮：港口貼紙（一天 1 枚）') + (on ? '<br><b class="ok">已選・再點一次取消</b>' : '') + '</small></span><span class="ic em">' + food(x.k).pic + '</span></button><button type="button" class="btn ghost oSwap" data-sw="' + x.id + '">換一張</button>'; });
    if (o.list.length < 2) html += '<p class="mu sm">下一張訂單大約 ' + mins(o.next - Date.now()) + '後來。</p>';
    var ks = osel.map(function (id) { return o.list.find(function (x) { return x.id === id; }).k; }), need = needSum(ks), ok = ks.length && have(need);
    html += '</div><p class="mu sm">' + (ks.length ? (ok ? '<b class="ok">材料夠了！</b>' : '<b class="no">還缺 ' + lack(need) + '</b>') : '先點訂單選起來') + '</p><div class="row"><button class="btn" id="hmGo"' + (ok ? '' : ' disabled') + '>' + (ks.length > 1 ? '兩張一起做（雙爐）' : '開始做') + '</button><button class="btn ghost" id="hmX">關閉</button></div>';
    modal(html);
    document.querySelectorAll('[data-o]').forEach(function (b) { b.onclick = function () { var id = b.dataset.o, i = osel.indexOf(id); if (i >= 0) osel.splice(i, 1); else osel.push(id); ordersSheet(); }; });
    document.querySelectorAll('[data-sw]').forEach(function (b) { b.onclick = function () { swapOrder(b.dataset.sw); ordersSheet(); }; });
    $('hmGo').onclick = function () { if (ok) cookOrders(osel.slice()); }; $('hmX').onclick = close;
  }
  function cookOrders(ids) {
    var h = H(), os = ids.map(function (id) { return h.ord.list.find(function (x) { return x.id === id; }); }).filter(Boolean); if (!os.length) return;
    var need = needSum(os.map(function (x) { return x.k; }));
    var rs = os.map(function (x) { var d = recipeOf(x.k); return { name: d.name, need: d.need, kind: BENTO[x.k] ? 'bento' : 'dish', items: cookItems(d.need) }; });
    close(); osel = [];
    function fin(stars) {
      if (!have(need)) { close(); return; }
      take(need); var gifts = [];
      os.forEach(function (x) { h.ord.list = h.ord.list.filter(function (y) { return y.id !== x.id; }); h.deco = h.deco || {}; h.decoOn = h.decoOn || {}; var g = GORDER.find(function (q) { return !h.deco[q]; }); if (g) { h.deco[g] = Date.now(); h.decoOn[g] = 1; gifts.push(g); } rec(x.f).h++; h.ord.done = (h.ord.done || 0) + 1; });
      if (!h.ord.next) h.ord.next = Date.now() + ORD_MIN * MIN;
      if (!sv()) { give(need); toast('手機存不下來，這次先不算'); return; }
      var stk = !gifts.length && window.KiteBoard && KiteBoard.gift ? KiteBoard.gift('home', '港邊訂單的謝禮') : null;      /* D183：家具送完以後，謝禮是一枚港口貼紙（一天最多 1 枚） */
      modal('<div class="vRow">' + os.map(function (x) { return vimg(x.f); }).join('') + '</div><h3 style="text-align:center">訂單送到了！' + (stars ? ' ' + '⭐'.repeat(stars) : '') + '</h3><p style="text-align:center">' + os.map(function (x) { return FR[x.f].n + '：「' + FR[x.f].yum + '」'; }).join('<br>') + '</p>' + (gifts.length ? '<div class="vRow gifts">' + gifts.map(function (g) { return img('gift_' + g); }).join('') + '</div><p style="text-align:center"><b>收到回禮：' + gifts.map(function (g) { return GIFT[g].n; }).join('、') + '</b><br>已經擺進客廳了（客廳的「佈置」可以收起來）。</p>' : (stk ? '<div class="vRow gifts">' + KiteBoard.sticker(stk, 84) + '</div><p style="text-align:center"><b>收到一枚港口貼紙！</b><br>收進小鳶樂園「我的港口記憶」，集 7 枚可以做一張港口海報。</p>' : '<p style="text-align:center">朋友說謝謝 💛' + (window.KiteBoard ? '<br><small>今天的港口貼紙已經拿過了，明天的訂單謝禮還會有</small>' : '') + '</p>')) + '<div class="row">' + (gifts.length ? '<button class="btn" id="hmSee">去客廳看看</button>' : '') + '<button class="btn ghost" id="hmOk">好</button></div>');
      if ($('hmSee')) $('hmSee').onclick = function () { $('modal').classList.remove('on'); setRoom('living'); render(); };
      $('hmOk').onclick = close;
    }
    COOK.start(rs.length > 1 ? { dual: rs, name: '兩張訂單', kind: 'dish', need: need } : rs[0], fin);
  }
  /* --- A5 我的港景小房間（G105 擺放點 v2：整張透明 PNG 的繪製矩形，1080×1350 底圖） --- */
  function decoHTML() { var h = H(), d = h.deco || {}, on = h.decoOn || {}; return GORDER.filter(function (g) { return d[g] && on[g]; }).map(function (g) { var r = GIFT[g].r; return '<img class="hmDeco ' + g + '" src="' + A + 'gift_' + g + '.webp" alt="' + GIFT[g].n + '" style="left:' + (r[0] / 10.8) + '%;top:' + (r[1] / 13.5) + '%;width:' + (r[2] / 10.8) + '%;z-index:' + GIFT[g].z + '">'; }).join(''); }
  function decoSheet() {
    var h = H(), d = h.deco || {}, on = h.decoOn = h.decoOn || {};
    var html = '<h3>🪴 佈置小房間</h3><p class="mu sm">朋友的回禮可以擺在客廳固定的位置，點一下擺出來或收起來。</p><div class="list" style="margin:0">' + GORDER.map(function (g) { var has = d[g]; return '<button type="button" class="opt" data-dc="' + g + '" aria-pressed="' + !!(has && on[g]) + '"' + (has ? '' : ' disabled') + '><span class="ic em">' + (has ? img('gift_' + g) : '❔') + '</span><span class="tx">' + (has ? GIFT[g].n : '還沒拿到') + '<small>' + (has ? (on[g] ? '<b class="ok">擺在客廳・點一下收起來</b>' : '收在櫃子裡・點一下擺出來') : '完成廚房的港邊訂單，朋友會送回禮') + '</small></span></button>'; }).join('') + '</div><div class="row"><button class="btn ghost" id="hmX">關閉</button></div>';
    modal(html);
    document.querySelectorAll('[data-dc]').forEach(function (b) { b.onclick = function () { var g = b.dataset.dc; on[g] = on[g] ? 0 : 1; sv(); decoRender(); decoSheet(); }; });
    $('hmX').onclick = close;
  }
  function decoRender() { var room = $('room'); if (!room) return; var l = $('hmDecoL'); if (!l) { l = document.createElement('div'); l.id = 'hmDecoL'; room.insertBefore(l, room.firstChild); } var html = S.room === 'living' ? decoHTML() : ''; if (l._h !== html) { l.innerHTML = html; l._h = html; } }
  /* --- C 方案一：港口朋友的照護委託（取代單純「收成次數到了就領養」；次數仍決定介紹信什麼時候寄來） --- */
  var CARE = [null,      /* D171：介紹信換 GPT D169 逐句修訂 v1（結尾停在「想先看看牧場」，邀不邀請由玩家決定） */
    { f: 1, story: "欸，我在港邊遇到一隻小雞！牠一直探頭，想知道牧場是什麼樣子。", ask: "想怎麼陪小雞認識新地方？", ch: ["慢慢走一小段", "停下來聽咕咕聲", "陪牠看看四周"], end: "小雞咕咕兩聲，放鬆了些，想先看看牧場。" },
    { f: 2, story: "呼啊……有隻小豬來找我一起打盹。牠想找個可以安心休息的地方。", ask: "想怎麼陪小豬休息一下？", ch: ["輕輕哼一小段歌", "安靜坐著陪牠", "陪牠伸個懶腰"], end: "小豬伸個懶腰，哼哼兩聲，想先看看牧場。" },
    { f: 5, story: "有一頭牛牛每天站在岸邊看海，好像很想交朋友。", ask: "要怎麼跟牛牛打招呼？", ch: ["輕輕揮手", "唱一首歌", "坐在旁邊陪牠"], end: "牛牛慢慢走近，輕輕哞了一聲，想先看看牧場。" },
    { f: 3, story: "剛下船時，一隻狗狗跑來聞聞我的背包。牠一路東看看、西看看，對新地方很好奇。", ask: "想怎麼跟狗狗熟悉一下？", ch: ["陪牠走一小段", "輕聲跟牠說話", "陪牠看看四周"], end: "狗狗搖搖尾巴，想先看看牧場。" },
    { f: 6, story: "晚上，我和一隻小雞一起看港口的燈光。牠想找個舒服的地方休息。", ask: "晚上要怎麼讓小雞安心？", ch: ["掛一盞小燈", "數星星給牠聽", "把窩鋪厚一點"], end: "小雞安心地咕咕叫，想先看看牧場。" },
    { f: 4, story: "我游過來的時候，看到一隻小豬在岸邊玩水，牠說好想要好朋友。", ask: "要跟小豬玩什麼？", ch: ["踩水花", "追泡泡", "滾泥巴"], end: "小豬開心地哼哼叫，想先看看牧場。" },
    { f: 1, story: "我又從牆後面看到一頭小牛，牠在找可以吃牧草的地方。", ask: "帶小牛去哪裡？", ch: ["最綠的那片草", "有樹蔭的地方", "牛牛旁邊"], end: "小牛跟著你慢慢走，想先看看牧場。" },
    { f: 5, story: "海風把一隻綿羊的毛吹得蓬蓬的，牠想找個地方好好整理一下。", ask: "怎麼幫綿羊？", ch: ["用梳子梳梳", "找一塊擋風的地方", "陪牠曬太陽"], end: "綿羊輕輕咩了一聲，想先看看牧場。" }
  ];
  function spP(k) { return '<span class="spP" style="background-image:url(' + A + 'sprite_' + k + '.webp)"></span>'; }
  function careCan() { var h = H(), ad = h.adopted || [0]; return ADOPT.filter(function (o, i) { return i && ad.indexOf(i) < 0 && h.xp >= o.need; }).length; }

  /* ===== 畫在房間底圖上 ===== */
  /* D165：農地常要按好幾次 → 用 pointerdown/up 自己判斷（手指稍微滑動也算點），不靠 click；小鳶不會再擋到 */
  function bindFarm(f) {
    var start = null;
    function hit(e) {      /* 菜圃用「離哪一格的土最近」來判斷（上一排的菜會疊到下一排，不再按錯格） */
      var best = null, bd = 1e9;
      f.querySelectorAll('.hmPlot').forEach(function (so) { var r = so.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, dx = (e.clientX - cx) / (r.width / 2 + 12), dy = (e.clientY - cy) / (r.height / 2 + 12), d = Math.max(Math.abs(dx), Math.abs(dy)); if (d < bd) { bd = d; best = so; } });      /* 九格不重疊：在格子框內（含 12px 容錯）才算 */
      if (best && bd <= 1) return best;
      var t = e.target && e.target.closest && e.target.closest('.hmAni,.hmStove,.hmDoor'); return t && f.contains(t) ? t : null;
    }
    f.addEventListener('pointerdown', function (e) { var t = hit(e); if (!t) return; start = { t: t, x: e.clientX, y: e.clientY, at: Date.now() }; f._down = 1; t.classList.add('press'); }, { passive: true });
    function end(e, cancel) {
      f._down = 0; if (!start) return; var s0 = start; start = null; s0.t.classList.remove('press');
      if (cancel || Math.hypot(e.clientX - s0.x, e.clientY - s0.y) > 24 || Date.now() - s0.at > 1500) return;
      f._last = Date.now(); window.__hmGhost = Date.now() + 500; act(s0.t);      /* D167：手機放開後還會補一個 click，會點到剛跳出來的選單（種子被自動選走）→ 0.5 秒內擋掉 */
    }
    f.addEventListener('pointerup', function (e) { end(e); }); f.addEventListener('pointercancel', function (e) { end(e, true); });
    f.addEventListener('click', function (e) { var t = hit(e); if (!t) return; e.stopPropagation(); if (Date.now() - (f._last || 0) < 600) return; act(t); });      /* 鍵盤或沒有 pointer 事件時的備用 */
  }
  document.addEventListener('click', function (e) { if (Date.now() < (window.__hmGhost || 0)) { var f0 = document.getElementById('hmFarm'); if (!f0 || !f0.contains(e.target)) { e.stopPropagation(); e.preventDefault(); } } }, true);
  function act(t) { if (t.classList.contains('hmPlot')) plotTap(+t.dataset.i); else if (t.classList.contains('hmAni')) aniTap(t.dataset.a); else if (t.classList.contains('hmDoor')) visitSheet(); else if (t.classList.contains('hmRc')) riceCooker(); else kitchen(); }
  function render() {
    var room = $('room'); if (!room || typeof S === 'undefined') return;
    var f = $('hmFarm'); if (!f) { f = document.createElement('div'); f.id = 'hmFarm'; room.appendChild(f); }
    var rid = S.room, h = H();
    var vis = visTick(), html = rid === 'garden' ? gardenHTML() : rid === 'ranch' ? '' : rid === 'kitchen' ? kitchenHTML() : rid === 'living' && vis ? '<button type="button" class="hmDoor" aria-label="' + FR[vis.f].n + '來敲門">' + vimg(vis.f) + '<span class="lb">叩叩！</span></button>' : '';
    decoRender();
    if (f._html !== html && !f._down) { var zb = f.querySelector('.hmZoo'); f.innerHTML = html; f._html = html; if (zb && rid === 'ranch') f.appendChild(zb); }
    room.dataset.farm = rid === 'garden' || rid === 'ranch' ? '1' : '';
    if (!f._bound) { f._bound = 1; bindFarm(f); }
    if (rid === 'ranch') zooRender();
    var a = $('hmAct'), wrap = document.querySelector('.roomwrap'); if (!a && wrap) { a = document.createElement('div'); a.id = 'hmAct'; wrap.appendChild(a); }
    if (!a) return;
    var ripe = h.plots.filter(function (p, i) { return landOpen(i) && stage(p) === 3; }).length, penReady = zooReady();
    var btn = '';
    var ol = ordTick().list.length, cc = careCan(), hasDeco = GORDER.some(function (g) { return (h.deco || {})[g]; });
    if (rid === 'kitchen') btn = '<button type="button" id="hmO">📋 訂單' + (ol ? '<em>' + ol + '</em>' : '') + '</button><button type="button" id="hmB">📖 菜譜冊</button>';
    else if (rid === 'living') btn = (vis ? '<button type="button" id="hmV">🚪 有人敲門<em>!</em></button>' : '<button type="button" id="hmL">' + (ripe ? '🥬 菜長好了<em>' + ripe + '</em>' : penReady ? '🐔 牧場可以收<em>' + penReady + '</em>' : '🌱 去花園種菜') + '</button>') + (hasDeco ? '<button type="button" id="hmDc">🪴 佈置</button>' : '');
    else if (rid === 'garden' || rid === 'ranch') btn = (rid === 'garden' && ripe ? '<button type="button" id="hmHA" class="allB">🧺 全部收成<em>' + ripe + '</em></button>' : '') + (rid === 'ranch' && penReady ? '<button type="button" id="hmCA" class="allB">🧺 全部收<em>' + penReady + '</em></button>' : '') + (rid === 'ranch' ? '<button type="button" id="hmAd">💌 委託' + (cc ? '<em>' + cc + '</em>' : '') + '</button>' : '') + '<button type="button" id="hmF">' + img('icon_fridge', 'bi') + '冰箱</button>';
    a.innerHTML = btn;
    if ($('hmB')) $('hmB').onclick = book;
    if ($('hmAd')) $('hmAd').onclick = adoptSheet; if ($('hmHA')) $('hmHA').onclick = harvestAll; if ($('hmCA')) $('hmCA').onclick = collectAll;
    if ($('hmO')) $('hmO').onclick = ordersSheet; if ($('hmV')) $('hmV').onclick = visitSheet; if ($('hmDc')) $('hmDc').onclick = decoSheet;
    if ($('hmF')) $('hmF').onclick = function () { modal('<h3>冰箱</h3><p>' + fridgeLine() + '</p><p class="mu sm">收成和收集一共 ' + h.xp + ' 次。次數越多，可以開墾的菜圃越多，也能領養更多動物。</p><div class="row"><button class="btn" id="hmK2">去廚房</button><button class="btn ghost" id="hmX">關閉</button></div>'); $('hmK2').onclick = function () { setRoom('kitchen'); kitchen(); }; $('hmX').onclick = close; };
    if ($('hmL')) $('hmL').onclick = function () { setRoom(!ripe && penReady ? 'ranch' : 'garden'); };
  }
  var css = document.createElement('style');
  css.textContent = '#hmAct{position:absolute;right:10px;top:52px;z-index:4;display:flex;gap:8px}' +
    '#hmAct button{position:relative;display:inline-flex;align-items:center;gap:4px;min-height:44px;padding:6px 14px;border:0;border-radius:999px;background:#FFFDF8;color:#4A3426;font:700 14px/1 inherit;font-family:inherit;box-shadow:0 3px 10px rgba(0,0,0,.22);cursor:pointer}' +
    '#hmAct .allB{background:#3E9B4F;color:#fff;animation:hmB 1.6s ease-in-out infinite}.sumG{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:6px 0}.sumG span{display:flex;flex-direction:column;align-items:center;background:#F3EAD8;border-radius:12px;padding:6px 10px;font-weight:800;color:#2F7A3A;min-width:64px}.sumG b{font-size:12px;color:#4A3426}.sumG .sgi{width:40px;height:40px;font-size:30px}.rcN{display:flex;flex-direction:column;gap:8px}' +
    '.bbx{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;background:#C99A62;border-radius:14px;padding:8px;margin:4px 0 8px}.bbx .cell{background:#FFF3DA;border-radius:10px;aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:11px}.bbx .cell .hi,.bbx .cell .emo{width:62%;height:62%;font-size:26px}.bbx .veg{border:2px dashed #C9A36A;cursor:pointer}.bbx .veg.on{border:2px solid #3E9B4F}.bbx .plus{font-size:24px;color:#B08A55;font-weight:800}' +
    '.bbox{position:relative;display:block;width:min(300px,88%);aspect-ratio:425/294;margin:2px auto 4px}.bbox .bbg{width:100%;height:100%;display:block}.bbox .bf{position:absolute;display:flex;align-items:center;justify-content:center;border:0;background:none;padding:0;font-family:inherit}.bbox .bf img{max-width:94%;max-height:94%;object-fit:contain;filter:drop-shadow(0 2px 2px rgba(80,40,0,.25))}.bbox .vs{cursor:pointer;border-radius:10px}.bbox .vs.on img{animation:bfIn .28s ease-out}.bbox .vs.empty{border:2px dashed rgba(140,90,30,.55);background:rgba(255,248,230,.45);flex-direction:column;color:#8A5A2B;line-height:1}.bbox .vs.empty b{font-size:22px}.bbox .vs.empty small{font-size:11px}@keyframes bfIn{from{transform:scale(.4) translateY(-30%);opacity:.2}to{transform:none;opacity:1}}.bbox.big{width:min(320px,92%)}.bbox .bf.two img{max-width:100%;max-height:100%;transform:scale(1.06)}.lidW{position:relative;display:block;width:100%;border:0;background:none;padding:0;cursor:pointer}.lidW .bbox{margin:2px auto 4px}.lidW .lid{position:absolute;left:50%;top:50%;width:min(326px,93.8%);transform:translate(-50%,-50%);filter:drop-shadow(0 4px 4px rgba(80,40,0,.3));transition:transform .7s cubic-bezier(.3,1.4,.5,1),opacity .5s .35s;pointer-events:none}.lidW.open .lid{transform:translate(-30%,-118%) rotate(-14deg);opacity:0}.lidW:not(.open) .lid{animation:lidW 1.6s ease-in-out infinite}@keyframes lidW{0%,70%,100%{transform:translate(-50%,-50%)}80%{transform:translate(-50%,-53%) rotate(-1.5deg)}90%{transform:translate(-50%,-51%) rotate(1deg)}}.lidT{text-align:center;font-weight:700;color:#5A3E28;min-height:42px;margin:6px 0}.kgH{font-weight:800;font-size:13px;color:#7A5A3A;margin:8px 4px 4px}.hm .opt.lk .ic{filter:saturate(.45);opacity:.75}.hm .opt.lk[disabled]{opacity:1}.goRc{display:block;width:100%;margin:6px 0 2px;border:2px dashed #E0B66A;background:#FFF8E6;border-radius:12px;padding:9px;font:800 13px/1.2 inherit;font-family:inherit;color:#8A5A2B;cursor:pointer}.bbox.ltr{width:min(220px,70%);margin:6px auto}.bxl{text-align:center;font-size:12px;color:#7A5A3A;margin:0 0 6px}.rcPic{display:flex;align-items:center;justify-content:center;gap:6px}.rcPic .hi{width:70px;height:70px;object-fit:contain}.rcPic span{font-size:20px;color:#B08A55}.rcPic b{font-size:16px;color:#4A3426}.hmStove .si.rci{width:72%}' +
    '.vegPick{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}.vegPick button{display:flex;align-items:center;gap:3px;border:2px solid #E5D49B;background:#FFFDF8;border-radius:999px;padding:3px 10px 3px 4px;font:700 13px/1 inherit;font-family:inherit;color:#4A3426;cursor:pointer;min-height:40px}.vegPick button[disabled]{opacity:.4}.vegPick .hi,.vegPick .emo{width:30px;height:30px;font-size:22px}.vegPick em{font-style:normal;font-size:11px;color:#8A7A66;margin-left:2px}.cfl{text-align:center;font-weight:800;color:#C0392B;margin:6px 0}.hmRc.cook .si{animation:rcS .9s ease-in-out infinite}.hmRc.done .lb{background:#3E9B4F;color:#fff}@keyframes rcS{50%{transform:translateY(-3%) rotate(-2deg)}}' +
    '#hmAct em{position:absolute;top:-6px;right:-4px;min-width:20px;height:20px;border-radius:10px;background:#E8674A;color:#fff;font:700 12px/20px sans-serif;font-style:normal;text-align:center;padding:0 4px}' +
    '#hmFarm{position:absolute;inset:0;z-index:200;pointer-events:none}#hmFarm>*{pointer-events:auto;touch-action:manipulation}.room[data-farm="1"] .bird{pointer-events:none}.hmPlot.press,.hmPen.press,.hmStove.press{filter:brightness(1.15);transform:translate(-50%,-100%) scale(.96)}' +
    '.hmPlot,.hmPen,.hmStove{position:absolute;transform:translate(-50%,-100%);border:0;background:none;padding:0;cursor:pointer;display:flex;flex-direction:column;align-items:center;font-family:inherit;-webkit-tap-highlight-color:transparent}' +
    '.hmPlot{transform:none!important}.hmPlot .cover{position:absolute;inset:-6% -4%}.hmPlot .cover .si{width:100%;height:100%;object-fit:fill;opacity:.95}' +
    '.hmPlot .crop{position:absolute;transform:translateX(-50%);aspect-ratio:1;pointer-events:none}.hmPlot .crop .hi{width:100%;height:100%;object-fit:contain;object-position:50% 100%}.hmPlot .crop .emo{font-size:min(9vw,40px);align-items:flex-end}' +
    '.hmPlot .lb,.hmStove .lb{white-space:nowrap;font-size:11px;font-weight:700;background:rgba(255,253,248,.92);color:#4A3426;border-radius:8px;padding:2px 6px;box-shadow:0 1px 3px rgba(0,0,0,.2)}.hmPlot .lb{position:absolute;left:50%;bottom:6%;transform:translateX(-50%);z-index:2;pointer-events:none;margin:0;font-size:10.5px;padding:1px 6px;border-radius:999px;opacity:.92}.hmPlot.ripe .lb{font-size:15px;padding:2px 5px;bottom:58%;animation:hmB 1.2s ease-in-out infinite;box-shadow:0 0 0 2px #fff,0 2px 6px rgba(0,0,0,.3)}.hmPlot.wild .lb{background:rgba(0,0,0,.45);color:#fff}.hmPlot.wild .lb.lbc{background:rgba(255,253,248,.92);color:#4A3426}.hmPlot.press{filter:brightness(1.12)}' +
    '.hmPlot.ripe .lb,.hmPen.ripe .lb{background:#3E9B4F;color:#fff}.hmPlot.ripe .lb{background:none;padding:0;opacity:1;bottom:4%}.hmPlot .lb .lbs{display:inline-block;width:18px;height:18px;vertical-align:-5px;margin:-2px 0 -2px -3px}.hmPlot .lb .lbv{width:24px;height:24px;vertical-align:-7px;margin:-4px -1px -4px -5px}.hmPlot .lb .lbk{display:block;width:24px;height:24px;margin:-3px -4px}.hmPlot .lb .lbi{display:block;width:34px;height:34px;filter:drop-shadow(0 0 2px #FFF8E8) drop-shadow(0 1px 2px rgba(60,40,20,.45))}.hmPlot.ripe .crop{animation:hmB 1.6s ease-in-out infinite}' +
    '@keyframes hmB{50%{transform:translateY(-4%) scale(1.04)}}' +
    '.hmPen{width:31%;aspect-ratio:1}.hmPen .pi{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}.hmPen .ai{position:absolute;left:22%;bottom:4%;width:56%;height:56%;object-fit:contain}' +
    '.hmPen .bub{position:absolute;left:42%;bottom:44%;width:16%;aspect-ratio:1;animation:hmB 1.2s infinite}.hmPen .bub img{width:100%;height:100%}' +
    '.hmPen .crate{position:absolute;right:-2%;bottom:2%;font-size:min(8vw,34px);line-height:1;animation:hmB 1.2s infinite}.hmPen .crate img{position:absolute;left:12%;top:-60%;width:80%}' +
    '.hmPen .aw{position:absolute;left:22%;bottom:4%;width:56%;height:56%}.hmPen .aw .ai{position:static;width:100%;height:100%;display:block;transform-origin:50% 90%}' +
    '.aw.idle{animation:awX 7s ease-in-out infinite}.aw.idle .ai{animation:awF 7s steps(1) infinite,awBob .6s ease-in-out infinite}.aw.chicken.idle .ai{animation:awF 5s steps(1) infinite,awPeck 1.6s ease-in-out infinite}.aw.chicken.idle{animation-duration:5s}.aw.cow.idle{animation-duration:11s}.aw.cow.idle .ai{animation:awF 11s steps(1) infinite,awBob 1.4s ease-in-out infinite}' +
    '.aw.eat .ai{animation:awEat .9s ease-in-out infinite}.aw.ready .ai{animation:awJoy 1s ease-in-out infinite}' +
    '@keyframes awX{0%,100%{transform:translateX(-14%)}45%,55%{transform:translateX(14%)}}@keyframes awF{0%{scale:1 1}50%{scale:-1 1}}' +
    '@keyframes awBob{50%{translate:0 -3%}}@keyframes awPeck{0%,60%,100%{rotate:0deg}70%,85%{rotate:16deg;translate:4% 6%}}@keyframes awEat{50%{rotate:6deg;translate:0 3%}}@keyframes awJoy{0%,100%{translate:0 0}30%{translate:0 -10%}45%{translate:0 0}60%{translate:0 -5%}}' +
    '.hmZoo{position:absolute;inset:0;pointer-events:none}.hmAni{position:absolute;width:18%;aspect-ratio:1;transform:translate(-50%,-90.6%);border:0;background:none;padding:0;pointer-events:auto;cursor:pointer;transition-property:left,top;transition-timing-function:linear;-webkit-tap-highlight-color:transparent}.hmAni.cow{width:26%}.hmAni.pig{width:22%}.hmAni.chicken{width:16%}.hmAni.dog{width:15%}' +
    '.hmAni .aw{position:absolute;inset:0;transform:scaleX(var(--fx,1));transition:transform .2s}.hmAni .sp{position:absolute;inset:0;background-repeat:no-repeat;background-size:1000% 100%;background-position:0 0}' +
    '.hmAni .sp.chicken{background-image:url(' + A + 'sprite_chicken.webp)}' +
    '.hmAni .sp.pig{background-image:url(' + A + 'sprite_pig.webp)}' +
    '.hmAni .sp.cow{background-image:url(' + A + 'sprite_cow.webp)}' +
    '.hmAni .sp.sheep{background-image:url(' + A + 'sprite_sheep.webp)}' +
    '.hmAni .sp.dog{background-image:url(' + A + 'sprite_dog.webp)}' +
    '.hmAni .sp.walk{animation:spW .64s steps(4) infinite}.hmAni .sp.eat,.hmAni .sp.sit{animation:spE .8s steps(2) infinite}.hmAni .sp.sleep{animation:spS 1.8s steps(2) infinite}.hmAni .sp.joy{animation:spJ .44s steps(2) infinite}.hmAni .sp.wag{animation:spG .6s steps(4) infinite}' +
    '@keyframes spW{from{background-position:0 0}to{background-position:44.444% 0}}@keyframes spE{from{background-position:44.444% 0}to{background-position:66.667% 0}}@keyframes spS{from{background-position:66.667% 0}to{background-position:88.889% 0}}@keyframes spJ{from{background-position:88.889% 0}to{background-position:111.111% 0}}@keyframes spG{from{background-position:66.667% 0}to{background-position:111.111% 0}}' +
    '.hmAni .bub{position:absolute;left:50%;top:-14%;transform:translateX(-50%);display:flex;gap:2px;background:#fff;border-radius:12px;padding:2px 4px;box-shadow:0 2px 6px rgba(0,0,0,.25);animation:hmB 1.2s infinite}.hmAni .bub img{width:26px;height:26px}.hmAni.press{filter:brightness(1.15)}' +
    '.hmZooTag{position:absolute;left:8px;bottom:6px;font-size:10px;background:rgba(0,0,0,.45);color:#fff;border-radius:6px;padding:2px 6px}' +
    '.hmPen .lb{position:absolute;left:50%;bottom:-8%;transform:translateX(-50%)}#hmAct .bi{width:28px;height:28px}' +
    '.hmStove{width:22%}.hmStove .si{width:100%;filter:drop-shadow(0 4px 4px rgba(0,0,0,.3));animation:hmB 2s ease-in-out infinite}' +
    '.hmSteam{position:absolute;z-index:205;width:41px;height:41px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.95) 0,rgba(255,255,255,.55) 45%,rgba(255,255,255,0) 72%);pointer-events:none;opacity:0}' +
    '.hmPop{position:absolute;z-index:210;transform:translate(-50%,-50%);font:800 14px/1.2 sans-serif;color:#2F7A3A;background:#fff;border-radius:10px;padding:3px 8px;box-shadow:0 2px 6px rgba(0,0,0,.2);animation:hmU 1.3s forwards;pointer-events:none;white-space:nowrap}@keyframes hmU{to{transform:translate(-50%,-180%);opacity:0}}' +
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
    '.dish{width:160px;height:160px;margin:0 auto;animation:hmD .6s}@keyframes hmD{0%{transform:scale(.3)}70%{transform:scale(1.15)}}' +
    '#hmDecoL{position:absolute;inset:0;pointer-events:none;z-index:1}#hmDecoL .hmDeco{position:absolute;aspect-ratio:1;object-fit:contain;animation:hmD .5s}' +
    '.hmDoor{position:absolute;left:83%;top:50%;width:24%;aspect-ratio:1;transform:translate(-50%,-100%);border:3px solid #F4BB42;border-radius:50%;background:#FFFDF8;padding:4%;box-shadow:0 4px 12px rgba(0,0,0,.3);cursor:pointer;-webkit-tap-highlight-color:transparent;animation:hmK 1.4s ease-in-out infinite}.hmDoor .vi{width:100%;height:100%;object-fit:contain;display:block}.hmDoor .lb{position:absolute;left:50%;top:-4%;transform:translateX(-50%);white-space:nowrap;font-size:12px;font-weight:800;background:#FFFDF8;color:#4A3426;border-radius:10px;padding:3px 8px;box-shadow:0 2px 6px rgba(0,0,0,.25)}.hmDoor.press{filter:brightness(1.12)}' +
    '@keyframes hmK{0%,100%{rotate:0deg}10%{rotate:-4deg}20%{rotate:4deg}30%{rotate:0deg}}' +
    '.vCard{position:relative;width:62%;max-width:220px;margin:0 auto 4px}.vCard .vi{width:100%;display:block}.vMood{position:absolute;right:-30%;top:4%;width:46%;background:#FFFDF8;border-radius:14px;padding:4px 4px 6px;box-shadow:0 3px 10px rgba(0,0,0,.2);text-align:center;transform:rotate(4deg)}.vMood .mi{width:100%;display:block}.vMood b{font-size:12px}.vMood .spP{width:100%;height:auto;aspect-ratio:1}' +
    '.vRow{display:flex;justify-content:center;gap:8px}.vRow .vi{width:40%;max-width:150px}.vRow.gifts .hi{width:84px;height:84px;animation:hmD .6s}' +
    '.spP{display:inline-block;width:44px;height:44px;background-repeat:no-repeat;background-size:1000% 100%;background-position:0 0;vertical-align:middle}.opt .em .spP{width:44px;height:44px}' +
    '.lockRow{display:flex;flex-direction:column;align-items:center;gap:2px;margin:6px 0 2px;padding:8px;border:1.5px dashed #D9CBB0;border-radius:12px;color:#8A7A66;font-size:12px;text-align:center}.lockRow span{letter-spacing:2px;font-size:14px;opacity:.7}.aniH{display:flex;align-items:center;gap:6px}.aniH .spP{width:40px;height:40px}' +
    '.ordC[aria-pressed="true"]{border-color:#E39A1F;background:#FFF6E0}.oSwap{display:block;width:auto!important;flex:none;margin:-2px 0 8px auto;min-height:32px;padding:2px 12px;font-size:12px}.hmAni .bub .crate{font-size:22px;line-height:26px;width:26px;text-align:center}' +
    '.hm .row{position:sticky;bottom:-1px;background:var(--paper,#FFFDF8);padding-top:8px;margin-bottom:-4px}';      /* D172：清單很長時「關閉」鈕黏在下面 */
  document.head.appendChild(css);
  window.HOME = { render: render, kitchen: kitchen, book: book, packHTML: packHTML, bindPack: bindPack, onDepart: onDepart, letterExtra: letterExtra, story: story, bentoKeys: function () { return BORDER; }, hbCount: hbCount, lidPeek: lidPeek, bentoIcon: bentoIcon, _H: H };
  setInterval(function () { if ($('home') && $('home').classList.contains('on') && !$('modal').classList.contains('on')) render(); }, FAST ? 1000 : 15000);
  if (document.readyState !== 'loading') setTimeout(render, 0); else document.addEventListener('DOMContentLoaded', render);
})();
