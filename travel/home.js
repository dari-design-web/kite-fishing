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
  var GOOD = { egg: { name: '雞蛋', em: '🥚' }, chicken: { name: '雞肉', em: '🍗', meat: 1 }, pork: { name: '豬肉', em: '🥩', meat: 1 }, milk: { name: '牛奶', em: '🥛' }, beef: { name: '牛肉', em: '🍖', meat: 1 } };      /* 圖：assets/home/product_*.webp（G104） */
  var PEN = {
    hen: { name: '雞舍', em: '🐔', a: 'chicken', need: 0, x: 18, says: ['咕咕，今天想種什麼呢？', '穀物香香的，謝謝你！', '蛋籃準備好了，一起收好吧。'], opts: [{ id: 'egg', label: '收雞蛋', feed: { rice: 1 }, min: 30, get: { egg: 2 } }, { id: 'chicken', label: '雞肉備料', feed: { rice: 2 }, min: 60, get: { chicken: 1 } }] },
    pig: { name: '豬圈', em: '🐷', a: 'pig', need: 8, x: 50, says: ['哼哼，我在這裡陪你聊天。', '慢慢吃，吃完再一起玩。', '照顧完成囉，去看看備料箱吧。'], opts: [{ id: 'pork', label: '豬肉備料', feed: { base: 2 }, min: 90, get: { pork: 1 } }] },
    cow: { name: '牛棚', em: '🐮', a: 'cow', need: 6, x: 82, says: ['哞，今天的風好舒服。', '牧草香香的，謝謝你！', '牛奶準備好了，來看看吧。'], opts: [{ id: 'milk', label: '收牛奶', feed: { grass: 2 }, min: 40, get: { milk: 1 } }, { id: 'beef', label: '牛肉備料', need: 18, feed: { grass: 3 }, min: 120, get: { beef: 1 } }] }
  };
  /* ===== 菜圃 9 格（花園底圖上的位置，百分比）；前 3 格一開始就有，其他要「收成次數」到了才能開墾 ===== */
  var PLOT = [[20, 72], [50, 72], [80, 72], [19, 84], [50, 84], [81, 84], [18, 96], [50, 96], [82, 96]];
  var LAND = [0, 0, 0, 3, 6, 10, 15, 20, 28], CLEAR_MIN = 10;
  /* ===== 料理：配菜（帶出門得料理小記）＋手作便當（帶出門旅行，不抽點數／券） ===== */
  var DISH = {
    base: { name: '青菜飯', f: 'cabbage', lm: 'home', need: { base: 1, rice: 1 }, story: ['小屋小記', '青菜飯做好囉。下次想一起去小屋坐坐，把今天的小故事說給小鳶聽。'] },
    s1: { name: '地瓜粥', f: 'sweetpotato', lm: 'center', need: { s1: 1, rice: 1 }, story: ['旅客中心小記', '小鳶端來暖暖的地瓜粥。下次想一起去旅客服務中心，看看大家今天想去哪裡。'] },
    s2: { name: '玉米濃湯', f: 'corn', lm: 'cruise', need: { s2: 1, milk: 1 }, story: ['郵輪碼頭小記', '玉米濃湯香香的。下次想一起去郵輪碼頭，找找大船上的小窗戶。'] },
    s3: { name: '番茄炒蛋', f: 'tomato', lm: 'whaleshark', need: { s3: 1, egg: 1 }, story: ['鯨鯊小記', '番茄炒蛋紅紅黃黃的。下次想一起去鯨鯊拍照點，和鯨鯊朋友拍張照。'] },
    s4: { name: '蔥花蛋餅', f: 'scallion', lm: 'food', need: { s4: 1, egg: 1 }, story: ['美食區小記', '蔥花蛋餅切好了。下次想一起去美食區，看看還有什麼香香的食物。'] },
    s5: { name: '南瓜湯', f: 'pumpkin', lm: 'rest', need: { s5: 1, milk: 1 }, story: ['休息區小記', '南瓜湯暖呼呼的。下次想一起去室內休息區，坐一下，讓小鳶陪你休息。'] },
    s6: { name: '紅蘿蔔炒飯', f: 'carrot', lm: 'exit', need: { s6: 1, rice: 1 }, story: ['回家路上小記', '紅蘿蔔炒飯裝進盒子囉。下次想一起去停車場出口，牽好大人的手，慢慢走回家。'] }
  };
  var DORDER = ['base', 's1', 's2', 's3', 's4', 's5', 's6'];
  var BENTO = {      // 對應 index.html CFG.bentos 的 hb_*（去哪裡、幾小時在那邊定）
    hb_egg: { name: '雞蛋飯糰便當', em: '🍙', need: { rice: 2, egg: 1 } },
    hb_chicken: { name: '雞腿便當', em: '🍗', need: { rice: 2, chicken: 1, base: 1 } },
    hb_pork: { name: '豬排便當', em: '🥩', need: { rice: 2, pork: 1, base: 1 } },
    hb_beef: { name: '牛肉便當', em: '🍱', need: { rice: 2, beef: 1, base: 1 } }
  };
  var BORDER = ['hb_egg', 'hb_chicken', 'hb_pork', 'hb_beef'];
  var BIMG = { hb_egg: 'bento_egg', hb_chicken: 'bento_chicken', hb_pork: 'bento_pork', hb_beef: 'bento_beef' };

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
  function itemIc(k, cls) { if (CROP[k] && CROP[k].f) return img('crop_' + CROP[k].f + '_mature', cls); if (GOOD[k]) return img('product_' + k, cls); var e = CROP[k] ? CROP[k].em : GOOD[k] ? GOOD[k].em : '❔'; return '<span class="' + (cls || 'hi') + ' emo">' + e + '</span>'; }
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
    if (s === 3) { var nm = CROP[p.v].name, yy = CROP[p.v].y || 2; give(mk(p.v, yy)); h.xp++; h.plots[i] = { v: '', t: 0 }; sv(); pop(xy[0], xy[1] - 8, '+' + yy + ' ' + nm); render(); say(['收成' + nm + '！放進冰箱囉～', '好大一個' + nm + '！', '又長好了耶！'][Math.floor(Math.random() * 3)]); return; }
    say(CROP[p.v].name + '還要 ' + mins(p.t + grow(p.v) - Date.now()) + '，我幫它澆澆水～'); pop(xy[0], xy[1] - 6, '💧');
  }
  function seedPick(i) {
    var html = '<h3>要種什麼？</h3><p class="mu sm">每種菜長大的時間不一樣，長好了會一直等你，不會枯掉。</p><div class="list" style="margin:0">';
    SEEDS.forEach(function (k) { var o = open(k), c = CROP[k]; html += '<button type="button" class="opt" data-k="' + k + '"' + (o ? '' : ' disabled') + '><span class="ic em">' + (o ? cropImg(k, 3) : '❔') + '</span><span class="tx">' + (o ? c.name + '<em class="tm">' + mins(c.min * MIN) + '</em><em class="tm">收 ' + (c.y || 2) + ' 份</em>' : '還沒拿到的種子') + '<small>' + c.from + '</small></span></button>'; });
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
        '<span class="soil">' + (ok ? img('soil_empty', 'si') : img(h.land[i] ? 'soil_clearing' : 'soil_weeds', 'si')) + (ok && s >= 0 ? '<span class="crop">' + cropImg(p.v, s) + '</span>' : '') + '</span><span class="lb">' + lbl + '</span></button>';
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
      if (Date.now() >= st.t) { give(o.get); h.xp++; h.pens[k] = {}; sv(); pop(P.x, 56, '+' + Object.keys(o.get).map(function (g) { return GOOD[g].name + '×' + o.get[g]; }).join(' ')); render(); say(GOOD[Object.keys(o.get)[0]].meat ? '備料箱收好了，放進冰箱囉！' : P.says[2]); return; }
      say(P.says[1] + '（還要 ' + mins(st.t - Date.now()) + '）'); return;
    }
    var html = '<h3>' + P.em + ' ' + P.name + '</h3><p class="mu sm">雞蛋和牛奶從牧場收好；肉品由合作農場處理好，再送到備料箱。這裡的動物朋友會一直陪你，不會餓壞，也不會不見。</p><div class="list" style="margin:0">';
    P.opts.forEach(function (o) { var lock = o.need && h.xp < o.need, ok = !lock && have(o.feed); html += '<button type="button" class="opt' + (ok ? ' can' : '') + '" data-o="' + o.id + '"' + (ok ? '' : ' disabled') + '><span class="ic em">' + itemIc(Object.keys(o.get)[0]) + '</span><span class="tx">' + o.label + '<em class="tm">' + mins(o.min * MIN) + '</em><small>飼料：' + needLine(o.feed) + '<br>' + (lock ? '<b class="no">收成或收集 ' + o.need + ' 次後開放（現在 ' + h.xp + ' 次）</b>' : ok ? '<b class="ok">飼料夠了，點一下開始</b>' : '<b class="no">還缺 ' + lack(o.feed) + '（去花園種）</b>') + '</small></span><span class="n">' + Object.keys(o.get).map(function (g) { return GOOD[g].name + '×' + o.get[g]; }).join('') + '</span></button>'; });
    html += '</div><p class="mu sm">冰箱：' + fridgeLine() + '</p><div class="row"><button class="btn ghost" id="hmX">關閉</button></div>';
    modal(html);
    document.querySelectorAll('.hm .opt[data-o]').forEach(function (b) { b.onclick = function () { var o = P.opts.find(function (x) { return x.id === b.dataset.o; }); if ((o.need && h.xp < o.need) || !have(o.feed)) return; take(o.feed); h.pens[k] = { o: o.id, t: Date.now() + o.min * MIN }; sv(); close(); say(P.says[1]); }; });
    $('hmX').onclick = close;
  }
  function ranchHTML() {
    var h = H(), html = '';
    Object.keys(PEN).forEach(function (k) {
      var P = PEN[k], ok = penOpen(k), st = h.pens[k], busy = st && st.t, ready = busy && Date.now() >= st.t, o = busy && P.opts.find(function (x) { return x.id === st.o; }), g = o && Object.keys(o.get)[0], meat = g && GOOD[g].meat;
      var lbl = !ok ? '🔒 ' + P.need + ' 次' : !busy ? '餵飼料' : ready ? (meat ? '備料箱到了！' : '可以收！') : mins(st.t - Date.now());
      var mode = ready && !meat ? 'ready' : busy && !ready ? 'eat' : 'idle', an = ok ? '<span class="aw ' + P.a + ' ' + mode + '">' + img('animal_' + P.a + '_' + mode, 'ai') + '</span>' : '';
      html += '<button type="button" class="hmPen' + (!ok ? ' wild' : ready ? ' ripe' : '') + '" data-p="' + k + '" style="left:' + P.x + '%;top:76%" aria-label="' + P.name + '：' + lbl + '">' + img('pen_' + P.a + (ok ? '' : '_build'), 'pi') + an +
        (ready && !meat ? '<span class="bub">' + img('product_' + g, 'pb') + '</span>' : '') + (ready && meat ? '<span class="crate">📦' + img('product_' + g, 'pc') + '</span>' : '') + '<span class="lb">' + P.name + '・' + lbl + '</span></button>';
    });
    return html;
  }

  /* ===== 廚房：配菜＋手作便當 ===== */
  function kitchen(tab) {
    var h = H(); tab = tab || kitchen.tab || 'bento'; kitchen.tab = tab;
    if (S.state !== 'home' && S.state !== 'back') { modal('<h3>🍳 廚房</h3><p>小鳶出門了，等牠回家再一起煮飯吧！菜園和牧場還是會自己長大喔。</p><div class="row"><button class="btn" id="hmX">好</button></div>'); $('hmX').onclick = close; return; }
    var html = '<h3>🍳 小鳶的廚房</h3><div class="tabs hmT"><button type="button" data-t="bento" aria-pressed="' + (tab === 'bento') + '">手作便當</button><button type="button" data-t="dish" aria-pressed="' + (tab === 'dish') + '">配菜</button></div><div class="list" style="margin:0">';
    if (tab === 'bento') {
      BORDER.forEach(function (k) { var b = BENTO[k], ok = have(b.need), c = (window.__travel && __travel.CFG.bentos[k]) || {}; html += '<button type="button" class="opt' + (ok ? ' can' : '') + '" data-b="' + k + '"' + (ok ? '' : ' disabled') + '><span class="ic em">' + img(BIMG[k]) + '</span><span class="tx">' + b.name + '<small>' + needLine(b.need) + (c.note ? '<br>' + c.note : '') + '<br>' + (ok ? '<b class="ok">材料齊了，點一下開始做</b>' : '<b class="no">還缺 ' + lack(b.need) + '</b>') + '</small></span><span class="n">' + (h.hb[k] ? '有 ' + h.hb[k] : '') + '</span></button>'; });
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
    function finish(stars) {
      if (done) return; done = true;
      var h = H(); if (!have(d.need)) { close(); return; }
      take(d.need); var first = false;
      if (type === 'd') { first = !h.book[k]; h.book[k] = h.book[k] || Date.now(); h.box[k] = (h.box[k] || 0) + 1; } else h.hb[k] = (h.hb[k] || 0) + 1;
      h.best = h.best || {}; if (stars && stars > (h.best[k] || 0)) h.best[k] = stars;
      if (!sv()) { give(d.need); toast('手機存不下來，這次先不算'); return; }
      modal('<div class="dish">' + (type === 'd' ? dishImg(k) : img(BIMG[k])) + '</div><h3 style="text-align:center">' + d.name + '做好了！' + (stars ? ' ' + '⭐'.repeat(stars) : '') + '</h3><p style="text-align:center">' + (first ? '第一次做，收進菜譜冊了！<br>' : '') + (type === 'd' ? '放進料理盒，打包出門時可以帶一份當配菜。' : '打包出門時，在「便當」裡選它就能帶小鳶去旅行。') + '</p><div class="row"><button class="btn" id="hmOk">好</button></div>');
      $('hmOk').onclick = function () { kitchen(); };
    }
    if (window.COOK) { close(); COOK.start({ name: d.name, need: d.need, kind: type === 'd' ? 'dish' : 'bento', items: cookItems(d.need) }, function (stars) { finish(stars); }); return; }
    modal('<h3>做' + d.name + '</h3><button type="button" class="pot" id="hmPot" aria-label="攪拌">' + img('pot_still', 'potI') + '</button><div class="bar"><i id="hmBar"></i></div><div class="row"><button class="btn ghost" id="hmAuto">請小鳶幫忙做好</button></div>');
    function bump() { prog = Math.min(100, prog + 9); var b = $('hmBar'); if (b) b.style.width = prog + '%'; var p = $('hmPot'); if (p) { var pi = p.querySelector('img'); pi.src = A + 'pot_stir.webp'; clearTimeout(bump.t); bump.t = setTimeout(function () { pi.src = A + 'pot_still.webp'; }, 220); p.classList.remove('stir'); void p.offsetWidth; p.classList.add('stir'); } if (prog >= 100) setTimeout(finish, 250); }
    $('hmPot').onclick = bump; $('hmAuto').onclick = function () { prog = 100; finish(0); };
  }
  var EMO = { base: '🥬', rice: '🍚', grass: '🌿', s1: '🍠', s2: '🌽', s3: '🍅', s4: '🧅', s5: '🎃', s6: '🥕' };
  function cookItems(need) { var o = {}; Object.keys(need).forEach(function (k) { o[k] = { name: itemName(k), e: EMO[k] || (GOOD[k] && GOOD[k].em) || '🍴', type: k === 'rice' ? 'rice' : CROP[k] ? 'chop' : 'cook' }; }); return o; }
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
  function bentoIcon(k) { return BIMG[k] ? '<img class="ic" src="' + A + BIMG[k] + '.webp" alt="">' : '<span class="ic emo hbI">🍱</span>'; }
  function letterExtra(tr) {
    if (!tr || !tr.side || !DISH[tr.side]) return '';
    var h = H(), k = tr.side, d = DISH[k];
    if (!tr.sideDone) { tr.sideDone = h.stories[k] ? 'again' : 'new'; if (!h.stories[k]) h.stories[k] = Date.now(); sv(); }
    return tr.sideDone === 'new' ? '帶了' + d.name + '，收到一張「' + d.story[0] + '」（在廚房菜譜冊）' : '路上吃了' + d.name + '，小鳶說好好吃！';
  }

  /* ===== 畫在房間底圖上 ===== */
  /* D165：農地常要按好幾次 → 用 pointerdown/up 自己判斷（手指稍微滑動也算點），不靠 click；小鳶不會再擋到 */
  function bindFarm(f) {
    var start = null;
    function hit(e) {      /* 菜圃用「離哪一格的土最近」來判斷（上一排的菜會疊到下一排，不再按錯格） */
      var best = null, bd = 1e9;
      f.querySelectorAll('.hmPlot .soil').forEach(function (so) { var r = so.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * 0.45, dx = (e.clientX - cx) / (r.width * 0.6), dy = (e.clientY - cy) / (r.height * 0.9 + 20), d = dx * dx + dy * dy; if (d < bd) { bd = d; best = so.parentNode; } });
      if (best && bd <= 1) return best;
      var t = e.target && e.target.closest && e.target.closest('.hmPen,.hmStove'); return t && f.contains(t) ? t : null;
    }
    f.addEventListener('pointerdown', function (e) { var t = hit(e); if (!t) return; start = { t: t, x: e.clientX, y: e.clientY, at: Date.now() }; f._down = 1; t.classList.add('press'); }, { passive: true });
    function end(e, cancel) {
      f._down = 0; if (!start) return; var s0 = start; start = null; s0.t.classList.remove('press');
      if (cancel || Math.hypot(e.clientX - s0.x, e.clientY - s0.y) > 24 || Date.now() - s0.at > 1500) return;
      f._last = Date.now(); act(s0.t);
    }
    f.addEventListener('pointerup', function (e) { end(e); }); f.addEventListener('pointercancel', function (e) { end(e, true); });
    f.addEventListener('click', function (e) { var t = hit(e); if (!t) return; e.stopPropagation(); if (Date.now() - (f._last || 0) < 600) return; act(t); });      /* 鍵盤或沒有 pointer 事件時的備用 */
  }
  function act(t) { if (t.classList.contains('hmPlot')) plotTap(+t.dataset.i); else if (t.classList.contains('hmPen')) penTap(t.dataset.p); else kitchen(); }
  function render() {
    var room = $('room'); if (!room || typeof S === 'undefined') return;
    var f = $('hmFarm'); if (!f) { f = document.createElement('div'); f.id = 'hmFarm'; room.appendChild(f); }
    var rid = S.room, h = H();
    var html = rid === 'garden' ? gardenHTML() : rid === 'ranch' ? ranchHTML() : rid === 'kitchen' ? kitchenHTML() : '';
    if (f._html !== html && !f._down) { f.innerHTML = html; f._html = html; }
    if (rid === 'garden') { var RW = room.clientWidth, RH = room.clientHeight; f.querySelectorAll('.hmPlot').forEach(function (b) { var row = Math.floor(+b.dataset.i / 3), wpx = Math.min(RW * (0.26 + row * 0.015), RH * (0.2 + row * 0.012)); b.style.width = wpx + 'px'; }); }      /* D165：內容沒變就不重畫，按到一半不會被換掉 */
    room.dataset.farm = rid === 'garden' || rid === 'ranch' ? '1' : '';
    if (!f._bound) { f._bound = 1; bindFarm(f); }
    var a = $('hmAct'), wrap = document.querySelector('.roomwrap'); if (!a && wrap) { a = document.createElement('div'); a.id = 'hmAct'; wrap.appendChild(a); }
    if (!a) return;
    var ripe = h.plots.filter(function (p, i) { return landOpen(i) && stage(p) === 3; }).length, penReady = Object.keys(h.pens).filter(function (k) { var s = h.pens[k]; return s && s.t && Date.now() >= s.t; }).length;
    var btn = '';
    if (rid === 'kitchen') btn = '<button type="button" id="hmB">📖 菜譜冊</button>';
    else if (rid === 'living') btn = '<button type="button" id="hmL">' + (ripe ? '🥬 菜長好了<em>' + ripe + '</em>' : penReady ? '🐔 牧場可以收<em>' + penReady + '</em>' : '🌱 去花園種菜') + '</button>';
    else if (rid === 'garden' || rid === 'ranch') btn = '<button type="button" id="hmF">' + img('icon_fridge', 'bi') + '冰箱</button>';
    a.innerHTML = btn;
    if ($('hmB')) $('hmB').onclick = book;
    if ($('hmF')) $('hmF').onclick = function () { modal('<h3>冰箱</h3><p>' + fridgeLine() + '</p><p class="mu sm">收成和收集一共 ' + h.xp + ' 次。次數越多，可以開墾的菜圃越多；豬圈 ' + PEN.pig.need + ' 次、牛棚 ' + PEN.cow.need + ' 次蓋好（牛肉備料 18 次）。</p><div class="row"><button class="btn" id="hmK2">去廚房</button><button class="btn ghost" id="hmX">關閉</button></div>'); $('hmK2').onclick = function () { setRoom('kitchen'); kitchen(); }; $('hmX').onclick = close; };
    if ($('hmL')) $('hmL').onclick = function () { setRoom(!ripe && penReady ? 'ranch' : 'garden'); };
  }
  var css = document.createElement('style');
  css.textContent = '#hmAct{position:absolute;right:10px;top:52px;z-index:4;display:flex;gap:8px}' +
    '#hmAct button{position:relative;display:inline-flex;align-items:center;gap:4px;min-height:44px;padding:6px 14px;border:0;border-radius:999px;background:#FFFDF8;color:#4A3426;font:700 14px/1 inherit;font-family:inherit;box-shadow:0 3px 10px rgba(0,0,0,.22);cursor:pointer}' +
    '#hmAct em{position:absolute;top:-6px;right:-4px;min-width:20px;height:20px;border-radius:10px;background:#E8674A;color:#fff;font:700 12px/20px sans-serif;font-style:normal;text-align:center;padding:0 4px}' +
    '#hmFarm{position:absolute;inset:0;z-index:200;pointer-events:none}#hmFarm>*{pointer-events:auto;touch-action:manipulation}.room[data-farm="1"] .bird{pointer-events:none}.hmPlot.press,.hmPen.press,.hmStove.press{filter:brightness(1.15);transform:translate(-50%,-100%) scale(.96)}' +
    '.hmPlot,.hmPen,.hmStove{position:absolute;transform:translate(-50%,-100%);border:0;background:none;padding:0;cursor:pointer;display:flex;flex-direction:column;align-items:center;font-family:inherit;-webkit-tap-highlight-color:transparent}' +
    '.hmPlot .soil{display:block;width:100%;aspect-ratio:2/1;position:relative}.hmPlot .si{width:100%;height:100%;object-fit:contain}' +
    '.hmPlot .crop{position:absolute;left:14%;right:14%;bottom:28%;aspect-ratio:1}.hmPlot .crop .hi{width:100%;height:100%}.hmPlot .crop .emo{font-size:min(9vw,40px);align-items:flex-end}' +
    '.hmPlot .weeds{display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:min(5vw,22px);border-radius:50%;background:radial-gradient(ellipse,rgba(86,120,52,.55) 0 50%,transparent 68%);opacity:.75}.hmPlot.wild .lb{background:rgba(0,0,0,.35);color:#fff}' +
    '.hmPlot .lb{position:absolute;left:50%;top:auto;bottom:38%;transform:translate(-50%,50%);z-index:2;pointer-events:none}.hmPlot .lb,.hmPen .lb,.hmStove .lb{margin-top:-4px;white-space:nowrap;font-size:11px;font-weight:700;background:rgba(255,253,248,.92);color:#4A3426;border-radius:8px;padding:2px 6px;box-shadow:0 1px 3px rgba(0,0,0,.2)}' +
    '.hmPlot.ripe .lb,.hmPen.ripe .lb{background:#3E9B4F;color:#fff}.hmPlot.ripe .crop{animation:hmB 1.6s ease-in-out infinite}' +
    '@keyframes hmB{50%{transform:translateY(-4%) scale(1.04)}}' +
    '.hmPen{width:31%;aspect-ratio:1}.hmPen .pi{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}.hmPen .ai{position:absolute;left:22%;bottom:4%;width:56%;height:56%;object-fit:contain}' +
    '.hmPen .bub{position:absolute;left:42%;bottom:44%;width:16%;aspect-ratio:1;animation:hmB 1.2s infinite}.hmPen .bub img{width:100%;height:100%}' +
    '.hmPen .crate{position:absolute;right:-2%;bottom:2%;font-size:min(8vw,34px);line-height:1;animation:hmB 1.2s infinite}.hmPen .crate img{position:absolute;left:12%;top:-60%;width:80%}' +
    '.hmPen .aw{position:absolute;left:22%;bottom:4%;width:56%;height:56%}.hmPen .aw .ai{position:static;width:100%;height:100%;display:block;transform-origin:50% 90%}' +
    '.aw.idle{animation:awX 7s ease-in-out infinite}.aw.idle .ai{animation:awF 7s steps(1) infinite,awBob .6s ease-in-out infinite}.aw.chicken.idle .ai{animation:awF 5s steps(1) infinite,awPeck 1.6s ease-in-out infinite}.aw.chicken.idle{animation-duration:5s}.aw.cow.idle{animation-duration:11s}.aw.cow.idle .ai{animation:awF 11s steps(1) infinite,awBob 1.4s ease-in-out infinite}' +
    '.aw.eat .ai{animation:awEat .9s ease-in-out infinite}.aw.ready .ai{animation:awJoy 1s ease-in-out infinite}' +
    '@keyframes awX{0%,100%{transform:translateX(-14%)}45%,55%{transform:translateX(14%)}}@keyframes awF{0%{scale:1 1}50%{scale:-1 1}}' +
    '@keyframes awBob{50%{translate:0 -3%}}@keyframes awPeck{0%,60%,100%{rotate:0deg}70%,85%{rotate:16deg;translate:4% 6%}}@keyframes awEat{50%{rotate:6deg;translate:0 3%}}@keyframes awJoy{0%,100%{translate:0 0}30%{translate:0 -10%}45%{translate:0 0}60%{translate:0 -5%}}' +
    '.hmPen .lb{position:absolute;left:50%;bottom:-8%;transform:translateX(-50%)}#hmAct .bi{width:28px;height:28px}' +
    '.hmStove{width:22%}.hmStove .si{width:100%;filter:drop-shadow(0 4px 4px rgba(0,0,0,.3));animation:hmB 2s ease-in-out infinite}' +
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
    '.dish{width:160px;height:160px;margin:0 auto;animation:hmD .6s}@keyframes hmD{0%{transform:scale(.3)}70%{transform:scale(1.15)}}';
  document.head.appendChild(css);
  window.HOME = { render: render, kitchen: kitchen, book: book, packHTML: packHTML, bindPack: bindPack, onDepart: onDepart, letterExtra: letterExtra, bentoKeys: function () { return BORDER; }, hbCount: hbCount, bentoIcon: bentoIcon, _H: H };
  setInterval(function () { if ($('home') && $('home').classList.contains('on') && !$('modal').classList.contains('on')) render(); }, FAST ? 1000 : 15000);
  if (document.readyState !== 'loading') setTimeout(render, 0); else document.addEventListener('DOMContentLoaded', render);
})();
