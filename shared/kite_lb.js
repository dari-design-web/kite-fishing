/* 小鳶來港 共用：排行榜視窗（D104，Dari 10/17）
   KiteLB.open({ title, game, tabs: [[level, '午後場'], ...] })  → 遊戲各關前 10 名，可切「本月／全部」
   KiteLB.open({ title, travel: true })                         → 小鳶去旅行收藏排行
   KiteLB.button(parent, opts, label)                           → 放一顆小 🏆 按鈕 */
(function (G) {
  'use strict';
  var K = G.KiteCore, css = false, st = { tab: 0, period: 'month' };
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function addCss() {
    if (css) return; css = true; var s = document.createElement('style');
    s.textContent = '.klb-mask{position:fixed;inset:0;z-index:9000;background:rgba(14,30,40,.55);display:flex;align-items:flex-end;justify-content:center;font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,sans-serif;animation:klbf .2s ease-out}' +
      '@keyframes klbf{from{opacity:0}}@keyframes klbu{from{transform:translateY(40px);opacity:0}}' +
      '.klb{width:min(480px,100%);max-height:88vh;overflow:auto;background:#FFFDF8;color:#24343A;border-radius:22px 22px 0 0;padding:14px 14px calc(16px + env(safe-area-inset-bottom,0px));box-shadow:0 -10px 30px rgba(0,0,0,.25);animation:klbu .3s cubic-bezier(.2,1.2,.4,1)}' +
      '.klb-h{display:flex;align-items:center;gap:8px;margin:0 2px 10px}.klb-h b{font-size:18px;flex:1}.klb-x{width:44px;height:44px;border:0;background:#F1ECE2;border-radius:12px;font-size:18px;color:#24343A}' +
      '.klb-tabs{display:flex;gap:6px;margin-bottom:8px;overflow-x:auto}.klb-tabs button{flex:1;min-height:40px;border-radius:999px;border:1px solid #E3D9C8;background:#fff;font:inherit;font-weight:800;font-size:14px;color:#24343A;white-space:nowrap;padding:0 10px}.klb-tabs button[aria-pressed=true]{background:#2F7F86;border-color:#2F7F86;color:#fff}' +
      '.klb-per{display:flex;gap:6px;margin-bottom:10px}.klb-per button{min-height:34px;border-radius:10px;border:1px solid #E3D9C8;background:#fff;font:inherit;font-size:13px;font-weight:700;padding:0 12px;color:#5C6E74}.klb-per button[aria-pressed=true]{background:#FFF1D6;border-color:#E8A33A;color:#8A5310}' +
      '.klb ol{list-style:none;margin:0;padding:0}.klb li{display:grid;grid-template-columns:40px 1fr auto;align-items:center;gap:8px;padding:9px 6px;border-bottom:1px solid #F0EADF;font-size:15px}.klb li.me{background:#E9F5F3;border-radius:12px;border-bottom-color:transparent}' +
      '.klb .rk{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-weight:900;background:#F1ECE2;color:#6B7F86}.klb .r1{background:#FFD45C;color:#7A4A00}.klb .r2{background:#DDE3E6;color:#4A5A60}.klb .r3{background:#F0B98A;color:#6E3A12}' +
      '.klb .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700}.klb .nm small{display:block;font-weight:400;color:#6B7F86;font-size:12px}.klb .sc{font-weight:900;font-variant-numeric:tabular-nums;color:#E2702A}' +
      '.klb-me{margin-top:10px;padding:10px 12px;border-radius:14px;background:#F6F1E6;font-size:14px}.klb-empty{padding:24px 6px;text-align:center;color:#6B7F86}.klb-note{margin:10px 2px 0;font-size:12px;color:#6B7F86;line-height:1.5}' +
      '.klb-btn{display:inline-flex;align-items:center;gap:4px;min-height:44px;min-width:44px;padding:0 12px;border-radius:14px;border:1px solid rgba(0,0,0,.08);background:#FFF6DE;color:#7A4A00;font:inherit;font-weight:800;font-size:14px;box-shadow:0 2px 0 rgba(0,0,0,.08)}';
    document.head.appendChild(s);
  }
  function row(r, sub, val) { return '<li class="' + (r.me ? 'me' : '') + '"><span class="rk ' + (r.rank <= 3 ? 'r' + r.rank : '') + '">' + r.rank + '</span><span class="nm">' + esc(r.name) + (r.me ? '（你）' : '') + (sub ? '<small>' + sub + '</small>' : '') + '</span><span class="sc">' + val + '</span></li>'; }
  function render(box, o) {
    var h = '<div class="klb-h"><b>🏆 ' + esc(o.title || '排行榜') + '</b><button class="klb-x" type="button" aria-label="關閉">✕</button></div>', R;
    if (o.travel) {
      R = K.travelBoard(10);
      h += R.top.length ? '<ol>' + R.top.map(function (r) { return row(r, '紀念品 ' + r.sv + '・旅行 ' + r.trips + ' 次', r.cards + ' 張'); }).join('') + '</ol>' : '<div class="klb-empty">還沒有人上榜，帶小鳶去旅行收集明信片吧！</div>';
      h += R.mine && R.mine.rank > 10 ? '<div class="klb-me">你目前第 <b>' + R.mine.rank + '</b> 名・明信片 ' + R.mine.cards + ' 張</div>' : '';
      h += '<p class="klb-note">依收集到的明信片張數排名（常設 24 張）；一樣多時比紀念品，再比旅行次數，再比誰先達到。</p>';
    } else {
      var tab = o.tabs[Math.min(st.tab, o.tabs.length - 1)];
      h += '<div class="klb-tabs">' + o.tabs.map(function (t, i) { return '<button type="button" data-t="' + i + '" aria-pressed="' + (t === tab) + '">' + esc(t[1]) + '</button>'; }).join('') + '</div>';
      h += '<div class="klb-per"><button type="button" data-p="month" aria-pressed="' + (st.period === 'month') + '">本月</button><button type="button" data-p="all" aria-pressed="' + (st.period === 'all') + '">全部</button></div>';
      R = K.leaderboard(o.game, tab[0], st.period, 10);
      h += R.top.length ? '<ol>' + R.top.map(function (r) { return row(r, '', r.score.toLocaleString() + ' 分'); }).join('') + '</ol>' : '<div class="klb-empty">' + (st.period === 'month' ? '這個月' : '') + '還沒有人上榜，快來搶第一名！</div>';
      h += R.mine ? (R.mine.rank > 10 ? '<div class="klb-me">你目前第 <b>' + R.mine.rank + '</b> 名・最高 ' + R.mine.score.toLocaleString() + ' 分</div>' : '') : '<div class="klb-me">你在「' + esc(tab[1]) + '」還沒有成績</div>';
      h += '<p class="klb-note">每位會員取' + (st.period === 'month' ? '這個月' : '') + '這一關的最高分。名字是會員的顯示名稱，可以在官方 LINE「我的資訊」修改。</p>';
    }
    box.innerHTML = h;
    box.querySelector('.klb-x').onclick = close;
    box.querySelectorAll('[data-t]').forEach(function (b) { b.onclick = function () { st.tab = +b.dataset.t; render(box, o); }; });
    box.querySelectorAll('[data-p]').forEach(function (b) { b.onclick = function () { st.period = b.dataset.p; render(box, o); }; });
  }
  var mask = null;
  function close() { if (mask) { mask.remove(); mask = null; } }
  function open(o) {
    if (!K) return; addCss(); close(); if (o.tab != null) st.tab = o.tab;
    mask = document.createElement('div'); mask.className = 'klb-mask'; mask.innerHTML = '<div class="klb" role="dialog" aria-label="排行榜"></div>';
    mask.onclick = function (e) { if (e.target === mask) close(); };
    document.body.appendChild(mask); var box = mask.firstChild; render(box, o);
    if (K.cloudStatus && K.cloudStatus().url && K.cloudPull) K.cloudPull(true).then(function () { if (mask && mask.firstChild === box) render(box, o); });      // 打開時跟雲端對一次，拿最新名次
  }
  function button(parent, o, label) { addCss(); var b = document.createElement('button'); b.type = 'button'; b.className = 'klb-btn'; b.innerHTML = '🏆' + (label ? '<span>' + esc(label) + '</span>' : ''); b.setAttribute('aria-label', '排行榜'); b.onclick = function (e) { e.stopPropagation(); open(typeof o === 'function' ? o() : o); }; parent.appendChild(b); return b; }
  G.KiteLB = { open: open, close: close, button: button };
})(window);
