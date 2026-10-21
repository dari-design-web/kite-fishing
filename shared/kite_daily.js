/* 小鳶來港 共用：每日挑戰（G97，ChatGPT 設計；Claude 實作 v1）
   - 每天（台北日期）一題，全員同一個亂數種子＝同樣的障礙／掉落順序；題目在 3 個小遊戲間輪替，每題一個「今日變化」
   - 正式挑戰每人每天 3 次，開始就扣（記在會員的遊戲紀錄裡，換手機也一樣）；練習不限次數、不計榜
   - D141（Dari 10/21）：正式局的分數也算進「今日遊戲積分」可換點（照該遊戲換算比例）；不佔一般遊戲次數；今日榜只比同一天同一題，同分同名次
   - 挑戰朋友：只複製一段文字＋今日挑戰連結（D04：不真的發送；連結不含會員資料或分數）
   KiteDaily.today() → { date, game, name, vary, key, seed, url }；KiteDaily.rng(seed) → 0～1 的固定亂數；KiteDaily.left() → 今天剩幾次 */
(function (G) {
  'use strict';
  var K = G.KiteCore;
  var BASE = (function () { var sc = document.currentScript; return sc && sc.src ? sc.src.replace(/shared\/kite_daily\.js.*$/, '') : '../'; })();
  /* 輪替題目：每題只改一個條件（文字一句）。D143：後台「遊戲 → 今日挑戰」可改開關、每天次數、輪替順序與文字（cfg.daily） */
  var GM = { swim: { name: '鯨鯊快游', path: 'games/swim/index.html' }, merge: { name: '小鳶合成港', path: 'games/merge/index.html' }, stack: { name: '小鳶疊貨櫃', path: 'games/stack/index.html' } };
  var VARY = { swim: { rings: '金圈日：今天的金色加速圈多一倍', shield: '泡泡護航：今天一開始就有泡泡盾', food: '大餐日：今天食物多一倍' }, merge: { same: '同款開場：今天大家掉下來的海鮮順序都一樣' }, stack: { same: '同一陣風：今天的風和事件大家都一樣' } };
  var DEF = [['swim', 'rings'], ['merge', 'same'], ['stack', 'same'], ['swim', 'shield'], ['merge', 'same'], ['swim', 'food'], ['stack', 'same']];
  function conf() { var c = (K && K.cfg && K.cfg().daily) || {}, raw = c.list && c.list.length ? c.list : DEF.map(function (x) { return { game: x[0], key: x[1] }; });
    var list = raw.filter(function (x) { return x && GM[x.game]; }).map(function (x) { var key = VARY[x.game][x.key] ? x.key : Object.keys(VARY[x.game])[0]; return { game: x.game, key: key, name: GM[x.game].name, path: GM[x.game].path, vary: (x.vary || '').trim() || VARY[x.game][key] }; });
    if (!list.length) list = DEF.map(function (x) { return { game: x[0], key: x[1], name: GM[x[0]].name, path: GM[x[0]].path, vary: VARY[x[0]][x[1]] }; });
    return { on: c.on !== false, tries: Math.max(1, Math.min(10, +c.tries || 3)), list: list }; }
  function tries() { return conf().tries; }
  function on() { return conf().on; }
  function dayKey() { return K && K.dayKey ? K.dayKey() : new Date().toISOString().slice(0, 10); }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function today() { var LIST = conf().list, d = dayKey(), n = Math.floor(Date.parse(d + 'T00:00:00+08:00') / 864e5), f = (function () { try { return localStorage.getItem('kiteDailyForce'); } catch (e) { return null; } })(), c = LIST[f != null && f !== '' ? +f % LIST.length : ((n % LIST.length) + LIST.length) % LIST.length];      // kiteDailyForce：測試用，指定題目
    return { date: d, game: c.game, name: c.name, vary: c.vary, key: c.key, seed: hash('kite-daily|' + d + '|' + c.game), url: BASE + c.path + '?daily=' }; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function used() { return K && K.dailyUsed ? K.dailyUsed(dayKey()) : 0; }
  function left() { return Math.max(0, tries() - used()); }
  /* 遊戲頁：?daily=official／practice。回傳本局資訊或 null */
  function session() {
    var q = new URLSearchParams(location.search).get('daily'); if (!q || !on()) return null;
    var td = today(), here = location.pathname.indexOf('/games/' + td.game + '/') >= 0; if (!here) return null;
    var official = q === 'official' && left() > 0;
    return { td: td, official: official, practice: !official, id: null, rnd: rng(td.seed) };
  }
  function begin(s) { if (!s || !s.official || !K.reportDaily) return; s.id = K.reportDaily(s.td.date, s.td.game, 0); }      // 開始就扣一次
  function finish(s, score) {
    if (!s) return null; var td = s.td, out = { official: s.official, left: left(), best: 0, rank: 0, total: 0 };
    if (s.official && K.reportDaily) out.tier = K.reportDaily(td.date, td.game, score, s.id);
    try { var L = K.leaderboard('daily', td.date, 'all', 10); out.best = L.mine ? L.mine.score : 0; out.rank = L.mine ? L.mine.rank : 0; out.total = L.total; } catch (e) {}
    out.left = left(); return out;
  }
  function shareText(score) { var td = today(), me = K.lbMe ? K.lbMe() : null; return '我' + (me ? '用「' + me.alias + '」' : '') + '在 ' + td.date.slice(5).replace('-', '/') + ' 的今日挑戰（' + td.name + '）拿到 ' + Number(score || 0).toLocaleString() + ' 分，一起來挑戰！' + location.origin + location.pathname.replace(/games\/[^/]+\/.*$/, '') + 'line/index.html?p=park'; }
  function copyShare(score, btn) { var t = shareText(score), ok = function () { if (btn) { var o = btn.textContent; btn.textContent = '已複製，貼給朋友吧！'; setTimeout(function () { btn.textContent = o; }, 1800); } };
    try { navigator.clipboard.writeText(t).then(ok, function () { prompt('複製這段文字給朋友：', t); }); } catch (e) { prompt('複製這段文字給朋友：', t); } }
  /* 結算區塊（HTML），三個小遊戲共用 */
  function resultHtml(s, r, score) {
    if (!s || !r) return '';
    var h = '<div class="kd-res"><b>📅 今日挑戰・' + (s.official ? '正式' : '練習（不計榜）') + '</b>';
    if (s.official && r.tier && K.tierLine) h += '<div>🪙 ' + K.tierLine(r.tier) + '</div>';
    if (s.official) h += '<div>今日最佳 ' + Number(r.best).toLocaleString() + ' 分' + (r.rank ? '・今日第 ' + r.rank + ' 名' : '・名次更新中') + '</div><div>今天還有 ' + r.left + ' 次正式挑戰</div>';
    h += '<div class="kd-btns">' + (r.left > 0 ? '<a class="kd-b" href="?daily=official">再正式挑戰</a>' : '') + '<a class="kd-b" href="?daily=practice">' + (s.official ? '練習' : '再練一次') + '</a>' + (s.official ? '<button type="button" class="kd-b" data-kd="share">挑戰朋友</button>' : '') + '<button type="button" class="kd-b" data-kd="lb">看今日榜</button></div></div>';
    return h;
  }
  function wire(root, score) { if (!root) return; var b = root.querySelector('[data-kd=share]'); if (b) b.onclick = function () { copyShare(score, b); }; var l = root.querySelector('[data-kd=lb]'); if (l) l.onclick = function () { if (G.KiteLB) G.KiteLB.hub('daily'); }; }
  var css = '.kd-res{margin:8px 0;padding:8px 10px;border-radius:12px;background:#FFF1D6;color:#10293D;font-size:13px;font-weight:700;text-align:left;line-height:1.6}.kd-res b{display:block;font-size:14px}.kd-btns{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.kd-b{flex:1 1 40%;min-height:38px;border:2px solid #10293D;border-radius:999px;background:#fff;color:#10293D;font:inherit;font-weight:800;font-size:13px;text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center}' +
    '.kd-banner{display:inline-block;margin:6px auto 0;padding:4px 12px;border-radius:999px;background:#FFE45C;color:#10293D;font-weight:900;font-size:13px}';
  if (document.head) { var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }
  G.KiteDaily = { tries: tries, on: on, conf: conf, GM: GM, VARY: VARY, DEF: DEF, today: today, rng: rng, used: used, left: left, session: session, begin: begin, finish: finish, shareText: shareText, copyShare: copyShare, resultHtml: resultHtml, wire: wire };
})(window);
