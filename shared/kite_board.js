/* 小鳶來港 共用：今日港口告示板（G105 延伸 0330；ChatGPT 題庫 v5＋反提案 v2；Claude 實作 D175）
   - 每天（手機日期）從不同遊戲抽最多 3 張小委託；孩子任選 1 張才開始算（只算選了之後的新動作）
   - 一次只有 1 張在途；跨天保留進度，不設午夜期限；可以免費換簡單的（替代題）或換別張，換了舊進度不帶過去
   - 完成拿 1 枚港口貼紙（每天最多 1 枚）；任 7 枚不同天的貼紙可以組成 1 張「我的港口記憶」海報
   - 紅線：不給點數、券、愛心或食材；不影響原本遊戲的分數、次數與每日算分
   - 存在這支手機的 kiteBoard1（還沒接雲端）
   KiteBoard.start(game) 遊戲開新局時呼叫；KiteBoard.ev(type, data) 遊戲回報事件；KiteBoard.cardHtml()／wire(root) 樂園卡片；KiteBoard.book() 港口記憶 */
(function (G) {
  'use strict';
  var K = G.KiteCore, KEY = 'kiteBoard1';
  var BASE = (function () { var sc = document.currentScript; return sc && sc.src ? sc.src.replace(/shared\/kite_board\.js.*$/, '') : '../'; })();
  var GAME = {
    fish: { name: '小鳶捕魚', path: 'index.html', icon: 'fish' },
    merge: { name: '小鳶合成港', path: 'games/merge/index.html', icon: 'merge' },
    stack: { name: '小鳶疊貨櫃', path: 'games/stack/index.html', icon: 'stack' },
    fly: { name: '飛行冒險', path: 'fly/index.html', icon: 'fly' },
    swim: { name: '鯨鯊快游', path: 'games/swim/index.html', icon: 'swim' },
    home: { name: '小鳶在家', path: 'travel/index.html', icon: 'travel' }
  };
  var ORDER = ['fish', 'merge', 'stack', 'fly', 'swim', 'home'];
  /* 題目（GPT 題庫 v5 的 18 題；每題一個主題＋一個簡單的替代題）。ev：要聽的事件；n：要幾次；run：同一局內才算；uniq：要不同魚種；chain：同一次放下連著合幾次 */
  var C1 = { ev: 'run_end', n: 1 };
  var Q = [
    ['PB-FISH-01', 'fish', '幫小鳶找一條魚吧！', '抓到任意 1 條魚', { ev: 'fish_catch', n: 1 }, '和小鳶釣一趟魚吧！', '新開一局，玩到結算（沒抓到也算）', C1],
    ['PB-FISH-02', 'fish', '幫港口找到三條魚！', '累計抓到 3 條魚（可以分好幾局）', { ev: 'fish_catch', n: 3 }, '幫小鳶找一條魚吧！', '抓到任意 1 條魚', { ev: 'fish_catch', n: 1 }],
    ['PB-FISH-03', 'fish', '找找兩種不一樣的魚！', '抓到 2 種不同的魚', { ev: 'fish_catch', n: 2, uniq: 1 }, '幫小鳶找一條魚吧！', '抓到任意 1 條魚', { ev: 'fish_catch', n: 1 }],
    ['PB-MERGE-01', 'merge', '讓兩個小夥伴合在一起！', '合成 1 次', { ev: 'merge', n: 1 }, '來港口玩一小趟！', '新開一局，玩到結算（沒合成也算）', C1],
    ['PB-MERGE-02', 'merge', '讓小夥伴合成三次！', '累計合成 3 次', { ev: 'merge', n: 3 }, '讓兩個小夥伴合在一起！', '合成 1 次', { ev: 'merge', n: 1 }],
    ['PB-MERGE-03', 'merge', '放一個，看看能不能連著合兩次！', '同一次放下，連著合成 2 次', { ev: 'merge', n: 1, chain: 2 }, '讓兩個小夥伴合在一起！', '合成 1 次', { ev: 'merge', n: 1 }],
    ['PB-STACK-01', 'stack', '幫港口放好一個貨櫃！', '放好 1 個貨櫃', { ev: 'stack_place', n: 1 }, '陪小鳶疊一趟吧！', '新開一局，玩到結算（倒了也算）', C1],
    ['PB-STACK-02', 'stack', '慢慢放好三個貨櫃！', '累計放好 3 個貨櫃', { ev: 'stack_place', n: 3 }, '幫港口放好一個貨櫃！', '放好 1 個貨櫃', { ev: 'stack_place', n: 1 }],
    ['PB-STACK-03', 'stack', '把這座小塔再疊高三層！', '同一局疊好 3 層', { ev: 'stack_place', n: 3, run: 1 }, '幫港口放好一個貨櫃！', '放好 1 個貨櫃', { ev: 'stack_place', n: 1 }],
    ['PB-FLY-01', 'fly', '幫港口清掉一個小麻煩！', '清掉 1 個垃圾或小怪', { ev: 'fly_clear', n: 1 }, '陪小鳶飛一趟吧！', '新開一局，飛到結算（沒過關也算）', C1],
    ['PB-FLY-02', 'fly', '一起清掉三個小麻煩！', '累計清掉 3 個垃圾或小怪', { ev: 'fly_clear', n: 3 }, '先清掉一個就好！', '清掉 1 個垃圾或小怪', { ev: 'fly_clear', n: 1 }],
    ['PB-FLY-03', 'fly', '陪小鳶飛一趟吧！', '新開一局，飛到結算（沒過關也算）', C1, '先清掉一個就好！', '清掉 1 個垃圾或小怪', { ev: 'fly_clear', n: 1 }],
    ['PB-SWIM-01', 'swim', '陪鯨鯊游一趟吧！', '新開一局，游到結算（撞到也算）', C1, '陪鯨鯊換一層水道！', '滑一下，換 1 次水道', { ev: 'swim_lane', n: 1 }],
    ['PB-SWIM-02', 'swim', '陪鯨鯊換兩次水道！', '換 2 次水道', { ev: 'swim_lane', n: 2 }, '陪鯨鯊換一層水道！', '滑一下，換 1 次水道', { ev: 'swim_lane', n: 1 }],
    ['PB-SWIM-03', 'swim', '陪鯨鯊游二十秒！', '累計游 20 秒（可以分幾趟）', { ev: 'swim_time', n: 20 }, '陪鯨鯊游一趟吧！', '新開一局，游到結算（撞到也算）', C1],
    ['PB-HOME-01', 'home', '種下一顆卡上畫的基本種子！', '在小鳶在家的菜圃種下 1 顆「{crop}」', { ev: 'home_plant', n: 1, crop: 1 }, '把長好的菜收回家吧！', '收成 1 次任何長好的菜', { ev: 'home_harvest', n: 1 }],
    ['PB-HOME-02', 'home', '把長好的菜收回家吧！', '收成 1 次任何長好的菜', { ev: 'home_harvest', n: 1 }, '種下一顆卡上畫的基本種子！', '在小鳶在家的菜圃種下 1 顆「{crop}」', { ev: 'home_plant', n: 1, crop: 1 }],
    ['PB-HOME-03', 'home', '一起做卡上這道飯！', '在小鳶在家的廚房做 1 份「青菜飯」（照原本的材料）', { ev: 'home_cook', n: 1, dish: 'base' }, '把長好的菜收回家吧！', '收成 1 次任何長好的菜', { ev: 'home_harvest', n: 1 }]
  ].map(function (a) { return { id: a[0], game: a[1], v: [{ line: a[2], cond: a[3], c: a[4] }, { line: a[5], cond: a[6], c: a[7] }] }; });
  var CROPS = { base: '小白菜', rice: '稻米', grass: '牧草' };      /* 隨時可種的基本種子 */
  var CROPK = ['base', 'rice', 'grass'];
  var POSTER_N = 7;

  function rd() { try { var o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && o.v === 1) return o; } catch (e) {} return { v: 1, sel: null, recs: [], posters: [], ep: 0 }; }
  function wr(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch (e) { return false; } }
  function day(t) { return K && K.dayKey ? K.dayKey(t) : new Date(t || Date.now()).toISOString().slice(0, 10); }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function qById(id) { return Q.filter(function (q) { return q.id === id; })[0]; }
  function gameOn(g) {      /* 後台關掉或維護中的遊戲不抽 */
    try { var gc = ((K && K.cfg && K.cfg().games) || {})[g === 'home' ? 'travel' : g] || {}; return gc.on !== false && !gc.maint; } catch (e) { return true; }
  }
  /* 今天的候選：每款合格遊戲用日期種子挑 1 題，再挑 3 款不同遊戲 */
  function candidates(d) {
    d = d || day();
    var gs = ORDER.filter(gameOn).sort(function (a, b) { return hash(d + '|g|' + a) - hash(d + '|g|' + b); }).slice(0, 3);
    return gs.map(function (g) { var qs = Q.filter(function (q) { return q.game === g; }); return qs[hash(d + '|q|' + g) % qs.length]; });
  }
  function target(q, vi, d) { var c = q.v[vi].c; return c.crop ? CROPK[hash(d + '|crop|' + q.id) % CROPK.length] : ''; }
  function condText(q, vi, crop) { return q.v[vi].cond.replace('{crop}', CROPS[crop] || ''); }
  function doneOn(s, d) { return s.recs.some(function (r) { return r.day === d; }); }
  function state() {
    var s = rd(), d = day(), ch = false;
    /* 前一天已經做滿、但當天已有紀念的在途題：到新的一天才收進來（同一天最多 1 枚） */
    if (s.sel && s.sel.full && !doneOn(s, d)) { finishRec(s, d); ch = true; }
    if (ch) wr(s);
    return s;
  }
  function finishRec(s, d) {
    var sel = s.sel, q = qById(sel.id); if (!q) { s.sel = null; return null; }
    var r = { id: 'R' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), day: d, t: Date.now(), q: sel.id, vid: sel.id + (sel.vi ? ':fallback1' : ':primary'), cv: 'v5', game: q.game, line: q.v[sel.vi].line };
    s.recs.push(r); s.sel = null; return r;
  }
  /* 選題：保存題目 ID＋主題／替代＋條件快照（之後題庫改了也照接受時的條件算） */
  function accept(id, vi) {
    var s = state(), d = day(), q = qById(id); if (!q || doneOn(s, d)) return false;
    vi = vi ? 1 : 0; s.ep = (s.ep || 0) + 1;
    var crop = target(q, vi, d);
    s.sel = { id: id, vi: vi, ep: s.ep, bd: d, at: Date.now(), c: JSON.parse(JSON.stringify(q.v[vi].c)), crop: crop, n: 0, sp: [], run: '' };
    return wr(s);
  }
  function drop() { var s = rd(); s.sel = null; s.ep = (s.ep || 0) + 1; return wr(s); }
  function easier() { var s = rd(); if (!s.sel || s.sel.vi) return false; return accept(s.sel.id, 1); }

  /* ===== 遊戲頁回報 ===== */
  var runs = {};      /* 這一頁裡每款遊戲最近一局開始的時間與編號 */
  function start(game) { runs[game] = { t: Date.now(), id: game + Date.now().toString(36) }; }
  function ev(type, data) {
    data = data || {};
    var s = rd(); if (!s.sel || s.sel.full) return;
    var sel = s.sel, q = qById(sel.id), c = sel.c; if (!q || c.ev !== type) return;
    var g = data.game || q.game; if (g !== q.game) return;
    var rn = runs[g];
    if (type === 'run_end' || type === 'swim_time') { if (!rn || rn.t < sel.at) return; }      /* 整局的題：這一局要在選題之後才開始 */
    if (c.chain && (data.chain || 0) < c.chain) return;
    if (c.crop && data.crop !== sel.crop) return;
    if (c.dish && data.dish !== c.dish) return;
    if (c.run) { var rid = rn ? rn.id : ''; if (sel.run !== rid) { sel.run = rid; sel.n = 0; } }
    if (c.uniq) { if (!data.sp || sel.sp.indexOf(data.sp) >= 0) return; sel.sp.push(data.sp); sel.n = sel.sp.length; }
    else if (type === 'swim_time') sel.n = Math.min(c.n, sel.n + Math.max(0, Math.floor(data.sec || 0)));
    else sel.n = Math.min(c.n, sel.n + 1);
    var r = null;
    if (sel.n >= c.n) { var d = day(); if (doneOn(s, d)) sel.full = true; else r = finishRec(s, d); }
    wr(s);
    if (r) toast('📋 委託完成！港口貼紙收進「我的港口記憶」了', 1); else if (sel.full) toast('📋 委託完成！今天已經有貼紙了，明天打開就會收進來', 1); else if (c.n > 1 && type !== 'swim_time') toast('📋 委託 ' + sel.n + '／' + c.n);
  }
  var tT = 0;
  function toast(msg, big) {
    if (!document.body) return; var el = document.getElementById('kbToast');
    if (!el) { el = document.createElement('div'); el.id = 'kbToast'; el.className = 'kb-toast'; document.body.appendChild(el); }
    el.textContent = msg; el.classList.toggle('big', !!big); el.classList.add('on'); clearTimeout(tT); tT = setTimeout(function () { el.classList.remove('on'); }, big ? 3200 : 1600);
  }

  /* ===== 畫面 ===== */
  function icon(g) { return BASE + 'hub/btn/m/btn_' + GAME[g].icon + '.webp'; }
  function sticker(r, sz) { return '<span class="kb-st" style="width:' + sz + 'px;height:' + sz + 'px"><img class="b" src="' + BASE + 'shared/assets/board/sticker_base.webp" alt=""><img class="i" src="' + BASE + 'shared/assets/board/st_' + (GAME[r.game] ? r.game : 'fish') + '.webp" alt=""></span>'; }
  function link(g) { return BASE + GAME[g].path + '?from=board'; }
  function free(s) { var used = {}; s.posters.forEach(function (p) { p.recs.forEach(function (id) { used[id] = 1; }); }); return s.recs.filter(function (r) { return !used[r.id]; }); }
  function cardHtml() {
    var s = state(), d = day(), sel = s.sel, q = sel && qById(sel.id), fr = free(s).length, h = '<div class="kb-card" id="kbCard"><div class="kb-h"><b>📋 今日港口告示板</b><button type="button" class="kb-bk" data-kb="book">我的港口記憶 ' + s.recs.length + '</button></div>';
    if (q) {
      var c = sel.c, g = q.game;
      h += '<div class="kb-on"><img src="' + icon(g) + '" alt=""><div class="t"><small>' + esc(GAME[g].name) + (sel.vi ? '・簡單版' : '') + '</small><b>' + esc(q.v[sel.vi].line) + '</b><span>' + esc(condText(q, sel.vi, sel.crop)) + '</span>' +
        (c.n > 1 ? '<span class="kb-bar"><i style="width:' + Math.round(100 * sel.n / c.n) + '%"></i></span><span class="kb-n">' + sel.n + '／' + c.n + (c.ev === 'swim_time' ? ' 秒' : '') + '</span>' : '') +
        (sel.full ? '<span class="kb-n">做好了！明天打開就收進來</span>' : '') + '</div></div>' +
        '<div class="kb-btns"><a class="go" href="' + link(g) + '">去玩</a>' + (sel.vi ? '' : '<button type="button" data-kb="easy">換簡單的</button>') + '<button type="button" data-kb="drop">換別張</button></div>';
    } else if (doneOn(s, d)) {
      h += '<div class="kb-done">' + sticker(s.recs.filter(function (r) { return r.day === d; })[0], 56) + '<div><b>今天的貼紙收好了！</b><span>明天告示板會貼新的委託。遊戲還是可以照常玩喔。</span></div></div>';
    } else {
      var cs = candidates(d);
      h += cs.length ? '<p class="kb-tip">選一張喜歡的，玩的時候小鳶會幫你記著（不用三張都做）</p><div class="kb-list">' + cs.map(function (q) {
        var crop = target(q, 0, d);
        return '<button type="button" class="kb-q" data-kb="pick" data-id="' + q.id + '"><img src="' + icon(q.game) + '" alt=""><span><small>' + esc(GAME[q.game].name) + '</small><b>' + esc(q.v[0].line) + '</b><em>' + esc(condText(q, 0, crop)) + '</em></span><i>選這張</i></button>';
      }).join('') + '</div>' : '<p class="kb-tip">今天暫時沒有可以做的委託。</p>';
    }
    h += '<div class="kb-foot">' + (fr >= POSTER_N ? '🎉 貼紙夠了！點「我的港口記憶」做一張港口海報' : '集到 ' + POSTER_N + ' 枚不同天的貼紙，就能做一張港口海報（現在 ' + fr + '／' + POSTER_N + '）') + '・不換點數</div></div>';
    return h;
  }
  function wire(root, rerender) {
    if (!root) return; var re = function () { if (rerender) rerender(); else { var c = root.querySelector('#kbCard'); if (c) c.outerHTML = cardHtml(); wire(root); } };
    root.querySelectorAll('[data-kb]').forEach(function (b) {
      var k = b.getAttribute('data-kb');
      b.onclick = function () {
        if (k === 'pick') { accept(b.getAttribute('data-id'), 0); re(); }
        else if (k === 'easy') { easier(); re(); }
        else if (k === 'drop') { drop(); re(); }
        else if (k === 'book') book(re);
      };
    });
  }
  /* 我的港口記憶：貼紙冊＋海報 */
  function posterHtml(p, s) {
    var rs = p.recs.map(function (id) { return s.recs.filter(function (r) { return r.id === id; })[0]; }).filter(Boolean);
    return '<div class="kb-poster"><img class="f" src="' + BASE + 'shared/assets/board/poster_frame.webp" alt=""><div class="in">' + rs.map(function (r) { return sticker(r, 64); }).join('') + '</div><b class="ti">我的港口記憶</b><span class="no">' + esc(rs[0] ? rs[0].day.slice(5).replace('-', '/') : '') + ' ～ ' + esc(rs.length ? rs[rs.length - 1].day.slice(5).replace('-', '/') : '') + '・' + rs.length + ' 枚貼紙</span></div>';
  }
  function book(after) {
    var s = state(), fr = free(s), ov = document.createElement('div'); ov.className = 'kb-ov';
    var h = '<div class="kb-sheet"><h3>我的港口記憶</h3><p class="kb-tip">每完成一張告示板委託，就留下一枚貼紙。貼紙不會過期，也不會被用掉。</p>';
    h += s.recs.length ? '<div class="kb-grid">' + s.recs.slice().reverse().map(function (r) { return '<div class="kb-cell">' + sticker(r, 64) + '<small>' + esc(r.day.slice(5).replace('-', '/')) + '</small><span>' + esc(r.line) + '</span></div>'; }).join('') + '</div>' : '<p class="kb-tip"><b>還沒有貼紙。</b>回樂園選一張告示板委託試試看！</p>';
    h += fr.length >= POSTER_N ? '<button type="button" class="kb-make" data-kb2="make">用 ' + POSTER_N + ' 枚貼紙做一張港口海報</button>' : '<p class="kb-tip">再 ' + (POSTER_N - fr.length) + ' 枚貼紙就能做一張海報（不用連續天數）</p>';
    if (s.posters.length) h += '<h3>我的海報</h3>' + s.posters.slice().reverse().map(function (p) { return posterHtml(p, s); }).join('');
    h += '<button type="button" class="kb-x" data-kb2="x">關閉</button></div>';
    ov.innerHTML = h; document.body.appendChild(ov);
    ov.onclick = function (e) { if (e.target === ov) close(); };
    function close() { ov.remove(); if (after) after(); }
    ov.querySelector('[data-kb2=x]').onclick = close;
    var mk = ov.querySelector('[data-kb2=make]'); if (mk) mk.onclick = function () { var s2 = rd(), f2 = free(s2); if (f2.length < POSTER_N) return; s2.posters.push({ id: 'P' + Date.now().toString(36), t: Date.now(), recs: f2.slice(0, POSTER_N).map(function (r) { return r.id; }) }); wr(s2); ov.remove(); book(after); };
  }
  var css = '.kb-card{margin:12px 12px 0;padding:12px;border-radius:18px;background:linear-gradient(135deg,#E9F6FB,#CDEBF5);color:#10293D;box-shadow:0 6px 16px rgba(0,0,0,.18);font-size:13px}' +
    '.kb-h{display:flex;align-items:center;justify-content:space-between;gap:8px}.kb-h b{font-size:15px}.kb-bk{border:2px solid #10293D;border-radius:999px;background:#fff;color:#10293D;font:inherit;font-weight:800;font-size:12px;padding:4px 10px;min-height:32px}' +
    '.kb-tip{margin:6px 0;font-size:12px;opacity:.85;line-height:1.5}.kb-list{display:flex;flex-direction:column;gap:6px}' +
    '.kb-q{display:flex;align-items:center;gap:8px;width:100%;text-align:left;border:2px solid #9CC9DA;border-radius:14px;background:#fff;color:#10293D;font:inherit;padding:6px 8px;min-height:56px}.kb-q img{width:42px;height:42px;flex:none}.kb-q span{flex:1;min-width:0;display:flex;flex-direction:column}.kb-q small{font-size:11px;opacity:.7}.kb-q b{font-size:14px}.kb-q em{font-style:normal;font-size:11px;opacity:.75}.kb-q i{font-style:normal;flex:none;background:#FFE45C;border-radius:999px;padding:4px 10px;font-weight:900;font-size:12px}' +
    '.kb-on{display:flex;gap:8px;align-items:flex-start;margin-top:6px;background:#fff;border-radius:14px;padding:8px}.kb-on img{width:46px;height:46px;flex:none}.kb-on .t{display:flex;flex-direction:column;min-width:0;flex:1}.kb-on small{font-size:11px;opacity:.7}.kb-on b{font-size:15px}.kb-on span{font-size:12px}' +
    '.kb-bar{display:block;height:8px;border-radius:99px;background:#DDEFF5;margin-top:4px;overflow:hidden}.kb-bar i{display:block;height:100%;background:#2E9CC0;border-radius:99px}.kb-n{font-weight:800;font-size:12px;margin-top:2px}' +
    '.kb-btns{display:flex;gap:6px;margin-top:8px}.kb-btns>*{flex:1;min-height:40px;border:2px solid #10293D;border-radius:999px;background:#fff;color:#10293D;font:inherit;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;text-decoration:none}.kb-btns .go{background:#FFE45C}' +
    '.kb-done{display:flex;gap:10px;align-items:center;margin-top:6px;background:#fff;border-radius:14px;padding:8px}.kb-done div{display:flex;flex-direction:column}.kb-done span{font-size:12px;opacity:.8}' +
    '.kb-foot{margin-top:8px;font-size:11px;opacity:.75}' +
    '.kb-st{position:relative;display:inline-block;flex:none}.kb-st .b{position:absolute;inset:0;width:100%;height:100%}.kb-st .i{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}' +
    '.kb-ov{position:fixed;inset:0;z-index:9999;background:rgba(6,20,30,.6);display:flex;align-items:flex-end;justify-content:center}.kb-sheet{width:100%;max-width:480px;max-height:88vh;overflow:auto;background:#FFFDF8;color:#10293D;border-radius:20px 20px 0 0;padding:14px 16px calc(14px + env(safe-area-inset-bottom));font-size:13px}.kb-sheet h3{margin:4px 0 6px;font-size:17px}' +
    '.kb-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.kb-cell{display:flex;flex-direction:column;align-items:center;text-align:center;background:#F3F9FB;border-radius:12px;padding:6px 4px}.kb-cell small{font-weight:800}.kb-cell span{font-size:11px;line-height:1.3}' +
    '.kb-make,.kb-x{display:block;width:100%;min-height:44px;margin-top:10px;border:2px solid #10293D;border-radius:999px;background:#fff;color:#10293D;font:inherit;font-weight:900;font-size:14px}.kb-make{background:#FFE45C}.kb-x{position:sticky;bottom:0}' +
    '.kb-poster{position:relative;width:100%;max-width:360px;margin:8px auto;aspect-ratio:560/700}.kb-poster .f{position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none}.kb-poster .in{position:absolute;left:18%;top:18%;width:64%;height:62%;z-index:1;background:#DFF1F7;display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:4px}' +
    '.kb-poster .ti{position:absolute;left:20%;right:20%;top:6%;height:7%;z-index:3;display:flex;align-items:center;justify-content:center;font-size:18px}.kb-poster .no{position:absolute;left:23%;right:29%;top:86%;z-index:3;text-align:center;font-size:11px;font-weight:800}' +
    '.kb-toast{position:fixed;left:50%;top:calc(10px + env(safe-area-inset-top));transform:translate(-50%,-150%);z-index:10000;max-width:90vw;padding:8px 14px;border-radius:999px;background:#10293D;color:#FFE45C;font-weight:900;font-size:13px;box-shadow:0 6px 16px rgba(0,0,0,.3);transition:transform .25s;pointer-events:none;text-align:center}.kb-toast.on{transform:translate(-50%,0)}.kb-toast.big{font-size:14px;border-radius:16px;background:#FFE45C;color:#10293D}';
  if (document.head) { var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }
  G.KiteBoard = { Q: Q, GAME: GAME, candidates: candidates, state: state, accept: accept, drop: drop, easier: easier, start: start, ev: ev, cardHtml: cardHtml, wire: wire, book: book, day: day };
})(window);
