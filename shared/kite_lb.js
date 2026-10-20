/* 小鳶來港 共用：排行榜視窗（D104，Dari 10/17）
   KiteLB.open({ title, game, tabs: [[level, '午後場'], ...] })  → 遊戲各關前 10 名，可切「本月／全部」
   KiteLB.open({ title, travel: true })                         → 小鳶去旅行收藏排行
   KiteLB.button(parent, opts, label)                           → 放一顆小 🏆 按鈕 */
(function (G) {
  'use strict';
  var K = G.KiteCore, css = false, st = { tab: 0, period: 'month' }, BASE = (function () { var sc = document.currentScript; return sc && sc.src ? sc.src.replace(/kite_lb\.js.*$/, '') : 'shared/'; })();
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function addCss() {
    if (css) return; css = true; var s = document.createElement('style');
    s.textContent = '.klb-mask{position:fixed;inset:0;z-index:9000;background:rgba(14,30,40,.55);display:flex;align-items:flex-end;justify-content:center;font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,sans-serif;animation:klbf .2s ease-out}' +
      '@keyframes klbf{from{opacity:0}}@keyframes klbu{from{transform:translateY(40px);opacity:0}}' +
      '.klb{width:min(480px,100%);max-height:88vh;overflow:auto;background:#FFFDF8;color:#24343A;border-radius:22px 22px 0 0;padding:14px 14px calc(16px + env(safe-area-inset-bottom,0px));box-shadow:0 -10px 30px rgba(0,0,0,.25);animation:klbu .3s cubic-bezier(.2,1.2,.4,1)}' +
      '.klb-h{display:flex;align-items:center;gap:8px;margin:0 2px 10px}.klb-h b{font-size:18px;flex:1}.klb-x{width:44px;height:44px;border:0;background:#F1ECE2;border-radius:12px;font-size:18px;color:#24343A}' +
      '.klb-tabs{display:flex;gap:6px;margin-bottom:8px;overflow-x:auto}.klb-tabs button{flex:1;min-height:40px;border-radius:999px;border:1px solid #E3D9C8;background:#fff;font:inherit;font-weight:800;font-size:14px;color:#24343A;white-space:nowrap;padding:0 10px}.klb-tabs button[aria-pressed=true]{background:#2F7F86;border-color:#2F7F86;color:#fff}' +
      '.klb-per{display:flex;gap:6px;margin-bottom:10px}.klb-per button{min-height:34px;border-radius:10px;border:1px solid #E3D9C8;background:#fff;font:inherit;font-size:13px;font-weight:700;padding:0 12px;color:#5C6E74}.klb-per button[aria-pressed=true]{background:#FFF1D6;border-color:#E8A33A;color:#8A5310}' +
      '.klb ol{list-style:none;margin:0;padding:0}.klb li{display:grid;grid-template-columns:40px 1fr auto;align-items:center;gap:8px;padding:9px 6px;border-bottom:1px solid #F0EADF;font-size:15px}.klb li.me{background:#E9F5F3;border-radius:12px;border-bottom-color:transparent;box-shadow:0 0 0 2px #2F7F86 inset;animation:klbg 2.4s ease-in-out infinite}@keyframes klbg{50%{background:#D3EEEA}}@media (prefers-reduced-motion:reduce){.klb li.me{animation:none}}' +
      '.klb .rk{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-weight:900;background:#F1ECE2;color:#6B7F86}.klb .r1{background:#FFD45C;color:#7A4A00}.klb .r2{background:#DDE3E6;color:#4A5A60}.klb .r3{background:#F0B98A;color:#6E3A12}' +
      '.klb .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700}.klb .nm small{display:block;font-weight:400;color:#6B7F86;font-size:12px}.klb .sc{font-weight:900;font-variant-numeric:tabular-nums;color:#E2702A}' +
      '.klb-me{margin-top:10px;padding:10px 12px;border-radius:14px;background:#F6F1E6;font-size:14px}.klb-empty{padding:24px 6px;text-align:center;color:#6B7F86}.klb-note{margin:10px 2px 0;font-size:12px;color:#6B7F86;line-height:1.5}' +
      '.klb .rk img{width:34px;height:34px}.klb .rk.ri{background:none}.klb-btn img{width:26px;height:26px}' +
      '.klb-alias{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin-top:10px;padding:10px 12px;border-radius:14px;border:1px dashed #E3D9C8;font-size:14px}.klb-alias b{color:#2F7F86}.klb-alias button{min-height:40px;border-radius:10px;border:1px solid #E3D9C8;background:#fff;font:inherit;font-size:14px;font-weight:700;padding:0 12px;color:#24343A}.klb-alias label{display:flex;align-items:center;gap:6px;min-height:40px}.klb-alias input[type=checkbox]{width:22px;height:22px}.klb-alias button.ok{background:#2F7F86;border-color:#2F7F86;color:#fff}.klb-alias input[type=text]{flex:1;min-width:120px;min-height:40px;border:1px solid #E3D9C8;border-radius:10px;padding:0 10px;font:inherit}' +
      '.klb-sumlk{display:block;width:100%;min-height:44px;margin-top:10px;border:1px solid #E3D9C8;border-radius:14px;background:#FFF6DE;color:#7A4A00;font:inherit;font-weight:800;font-size:14px}' +
      '.klb-cats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:0 0 10px}.klb-cats button{min-height:40px;padding:0 6px;border-radius:12px;border:1px solid #E3D9C8;background:#fff;font:inherit;font-weight:800;font-size:14px;color:#24343A}.klb-cats button[aria-selected=true]{background:#2F7F86;border-color:#2F7F86;color:#fff}' +
      '.klb-sync{margin:0 2px 8px;font-size:13px;color:#8A5310;background:#FFF6DE;border-radius:10px;padding:7px 10px}' +
      '.klb-btn{display:inline-flex;align-items:center;gap:4px;min-height:44px;min-width:44px;padding:0 12px;border-radius:14px;border:1px solid rgba(0,0,0,.08);background:#FFF6DE;color:#7A4A00;font:inherit;font-weight:800;font-size:14px;box-shadow:0 2px 0 rgba(0,0,0,.08)}';
    document.head.appendChild(s);
  }
  function row(r, sub, val) { return '<li class="' + (r.me ? 'me' : '') + '"><span class="rk ' + (r.rank <= 3 ? 'r' + r.rank + ' ri' : '') + '">' + (r.rank <= 3 ? '<img src="' + BASE + 'assets/rank_' + r.rank + '.png" alt="第 ' + r.rank + ' 名">' : r.rank) + '</span><span class="nm">' + esc(r.name) + (r.me ? '（你' + (r.hide ? '・不公開' : '') + '）' : '') + (sub ? '<small>' + sub + '</small>' : '') + '</span><span class="sc">' + val + '</span></li>'; }
  /* D123（Dari 10/19 14:46）：只留一顆排行榜按鈕，進去再分類：捕魚／飛行／合成港／疊貨櫃／旅行／總分 */
  var CATS = [['fish', '捕魚', { title: '小鳶捕魚排行榜', game: 'fish', tabs: [['keelung', '基隆港'], ['s2', '八斗子'], ['s3', '和平島'], ['s4', '基隆嶼']] }], ['fly', '飛行', { title: '飛行冒險排行榜', game: 'fly', tabs: [['1', '第 1 關'], ['2', '第 2 關'], ['3', '第 3 關'], ['4', '第 4 關'], ['5', '第 5 關'], ['6', '第 6 關'], ['7', '第 7 關'], ['8', '第 8 關']] }],
    ['merge', '合成港', { title: '小鳶合成港排行榜', game: 'merge', mini: true, tabs: [['all', '合成港']] }], ['stack', '疊貨櫃', { title: '小鳶疊貨櫃排行榜', game: 'stack', mini: true, tabs: [['all', '疊貨櫃']] }], ['swim', '鯨鯊', { title: '鯨鯊快游排行榜', game: 'swim', mini: true, tabs: [['all', '鯨鯊快游']] }], ['travel', '旅行', { title: '小鳶旅行收藏排行', travel: true }], ['sum', '總分', { title: '累積總分排行榜', sum: true }]];
  function catOf(o) { return o.cat || (o.sum ? 'sum' : o.travel ? 'travel' : o.game) || 'fish'; }
  function render(box, o) {
    var cat = catOf(o), h = '<div class="klb-h"><b>🏆 排行榜</b><button class="klb-x" type="button" aria-label="關閉">✕</button></div>', R, sy = K.lbSync ? K.lbSync() : { st: 'ok' };
    h += '<div class="klb-cats" role="tablist">' + CATS.map(function (c) { return '<button type="button" role="tab" data-c="' + c[0] + '" aria-selected="' + (c[0] === cat) + '">' + c[1] + '</button>'; }).join('') + '</div>';;
    if (sy.st === 'local') h += '<div class="klb-sync">目前只顯示這支手機的成績</div>';
    else if (sy.st === 'old') h += '<div class="klb-sync">雲端尚未更新，暫時只看得到自己的成績</div>';
    else if (sy.st === 'wait') h += '<div class="klb-sync">正在讀取大家的成績…</div>';
    else if (sy.st === 'fail') h += '<div class="klb-sync">連不上雲端，暫時只看得到自己的成績</div>';
    if (o.sum) {
      h += '<div class="klb-per"><button type="button" data-p="month" aria-pressed="' + (st.period === 'month') + '">本月</button><button type="button" data-p="all" aria-pressed="' + (st.period === 'all') + '">全部</button></div>';
      R = K.sumBoard(st.period, 10);
      h += R.top.length ? '<ol>' + R.top.map(function (r) { return row(r, '', K.fmtScore(r.score) + ' 分'); }).join('') + '</ol>' : '<div class="klb-empty">' + (st.period === 'month' ? '這個月' : '') + '還沒有人上榜</div>';
      h += R.mine ? (R.mine.rank > 10 ? '<div class="klb-me">你目前第 <b>' + R.mine.rank + '</b> 名・累積 ' + K.fmtScore(R.mine.score) + ' 分</div>' : '') : '<div class="klb-me">你還沒有分數</div>';
      h += '<p class="klb-note">捕魚＋飛行每局分數加總</p>';
    } else if (o.travel) {
      R = K.travelBoard(10);
      h += R.top.length ? '<ol>' + R.top.map(function (r) { return row(r, '紀念品 ' + r.sv + '・旅行 ' + r.trips + ' 次', r.cards + ' 張'); }).join('') + '</ol>' : '<div class="klb-empty">還沒有人上榜</div>';
      h += R.mine && R.mine.rank > 10 ? '<div class="klb-me">你目前第 <b>' + R.mine.rank + '</b> 名・明信片 ' + R.mine.cards + ' 張</div>' : '';
      h += '<p class="klb-note">比收集到的明信片張數</p>';
    } else {
      var tab = o.tabs[Math.min(st.tab, o.tabs.length - 1)];
      if (o.tabs.length > 1) h += '<div class="klb-tabs">' + o.tabs.map(function (t, i) { return '<button type="button" data-t="' + i + '" aria-pressed="' + (t === tab) + '">' + esc(t[1]) + '</button>'; }).join('') + '</div>';
      h += '<div class="klb-per"><button type="button" data-p="month" aria-pressed="' + (st.period === 'month') + '">本月</button><button type="button" data-p="all" aria-pressed="' + (st.period === 'all') + '">全部</button></div>';
      R = K.leaderboard(o.game, tab[0], st.period, 10);
      h += R.top.length ? '<ol>' + R.top.map(function (r) { return row(r, '', K.fmtScore(r.score) + ' 分'); }).join('') + '</ol>' : '<div class="klb-empty">' + (st.period === 'month' ? '這個月' : '') + '還沒有人上榜，快來搶第一！</div>';
      h += R.mine ? (R.mine.rank > 10 ? '<div class="klb-me">你目前第 <b>' + R.mine.rank + '</b> 名・最高 ' + K.fmtScore(R.mine.score) + ' 分</div>' : '') : '<div class="klb-me">你這關還沒有成績</div>';
      if (o.mini) h += '<p class="klb-note">每人取最高一局</p>';
      else h += '<button type="button" class="klb-sumlk" data-sum="1">看累積總分 ›</button>';
      if (!o.mini) h += '<p class="klb-note">每人取這關最高一局</p>';
    }
    if (R && R.hidden) h += '<p class="klb-note">有人不公開，名次可能跳號</p>';
    var me = K.lbMe ? K.lbMe() : null;
    if (me) h += st.edit ? '<div class="klb-alias"><input type="text" maxlength="10" value="' + esc(me.alias) + '" aria-label="排行榜名字" placeholder="最多 10 個字"><button type="button" data-a="save" class="ok">確認</button><button type="button" data-a="cancel">取消</button>' + (st.err ? '<span style="color:#C0392B;width:100%">' + esc(st.err) + '</span>' : '') + '</div>'
      : '<div class="klb-alias"><span>排行榜名字：<b>' + esc(me.alias) + '</b></span><button type="button" data-a="edit">改名</button><label><input type="checkbox" data-a="hide"' + (me.hide ? ' checked' : '') + '>不公開</label></div>';
    if (me) h += '<p class="klb-note">只顯示這個名字，不會出現 LINE 名稱或頭像</p>';
    box.innerHTML = h;
    box.querySelectorAll('[data-a]').forEach(function (b) {
      var a = b.dataset.a;
      if (a === 'hide') b.onchange = function () { K.setLbMe({ hide: b.checked }); if (K.cloudPush) K.cloudPush(); render(box, o); };
      else b.onclick = function () { if (a === 'edit') st.edit = true; else if (a === 'cancel') { st.edit = false; st.err = ''; } else { var v = box.querySelector('.klb-alias input[type=text]').value, res = K.setLbMe({ alias: v }); if (!res.ok) { st.err = res.msg; render(box, o); return; } st.edit = false; st.err = ''; if (K.cloudPush) K.cloudPush(); } render(box, o); };
    });
    var ai = box.querySelector('.klb-alias input[type=text]'); if (ai) { ai.focus(); ai.onkeydown = function (e) { if (e.key === 'Enter') box.querySelector('[data-a=save]').click(); else if (e.key === 'Escape') box.querySelector('[data-a=cancel]').click(); }; }
    box.querySelector('.klb-x').onclick = close;
    box.querySelectorAll('[data-t]').forEach(function (b) { b.onclick = function () { st.tab = +b.dataset.t; render(box, o); }; });
    box.querySelectorAll('[data-c]').forEach(function (b) { b.onclick = function () { var c = CATS.filter(function (x) { return x[0] === b.dataset.c; })[0]; st.tab = 0; render(box, Object.assign({ cat: c[0] }, c[2], o.cat === c[0] || catOf(o) === c[0] ? o : {})); }; });
    box.querySelectorAll('[data-sum]').forEach(function (b) { b.onclick = function () { render(box, { title: '累積總分排行榜', sum: true, cat: 'sum' }); }; });
    box.querySelectorAll('[data-p]').forEach(function (b) { b.onclick = function () { st.period = b.dataset.p; render(box, o); }; });
  }
  var mask = null;
  function close() { st.edit = false; if (mask) { mask.remove(); mask = null; } }
  function open(o) {
    if (!K) return; addCss(); close(); if (o.tab != null) st.tab = o.tab;
    mask = document.createElement('div'); mask.className = 'klb-mask'; mask.innerHTML = '<div class="klb" role="dialog" aria-label="排行榜"></div>';
    mask.onclick = function (e) { if (e.target === mask) close(); };
    document.body.appendChild(mask); var box = mask.firstChild; render(box, o);
    if (K.cloudStatus && K.cloudStatus().url && K.cloudPull) K.cloudPull(true).then(function () { if (mask && mask.firstChild === box) render(box, o); });      // 打開時跟雲端對一次，拿最新名次
  }
  function button(parent, o, label) { addCss(); var b = document.createElement('button'); b.type = 'button'; b.className = 'klb-btn'; b.innerHTML = '<img src="' + BASE + 'assets/rank_btn.png" alt="">' + (label ? '<span>' + esc(label) + '</span>' : ''); b.setAttribute('aria-label', '排行榜'); b.onclick = function (e) { e.stopPropagation(); open(typeof o === 'function' ? o() : o); }; parent.appendChild(b); return b; }
  function hub(cat) { var c = CATS.filter(function (x) { return x[0] === cat; })[0] || CATS[0]; st.tab = 0; open(Object.assign({ cat: c[0] }, c[2])); }
  G.KiteLB = { open: open, close: close, button: button, hub: hub, CATS: CATS };
})(window);
