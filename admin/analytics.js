/* 小鳶來港 後台・分析中心 v1（D101，Dari 10/17：分析要能選區間、有排版與圖、能細分到單一會員、各分析互相連結）
   由 admin/index.html 在第一次畫面前呼叫（window.__ADM_EXT），拿到後台內部的工具後註冊新的分析頁。
   所有數字都從同一份資料（後台 data()：會員、點數帳本、遊戲、兌換、服務台、店家 QR）算出，只差在期間篩選。 */
(window.__ADM_EXT = window.__ADM_EXT || []).push(function (A) {
  'use strict';
  const K = A.K, V = A.V, esc = A.esc, num = A.num, dt = A.dt, GN = A.GN, LN = A.LN, TL = A.TL, mins = A.mins;
  const $ = (id) => document.getElementById(id), DAY = 86400000;
  /* 色票：dataviz 參考調色盤（淺色），類別依固定順序指定，不輪換 */
  const C = { blue: '#2a78d6', orange: '#eb6834', aqua: '#1baf7a', yellow: '#eda100', magenta: '#e87ba4', green: '#008300', violet: '#6250d6', red: '#e34948', grid: '#E6ECEE', ink: '#1E2B30', muted: '#6B7F86' };
  const SER = [C.blue, C.orange, C.aqua, C.yellow, C.magenta, C.green, C.violet, C.red];
  const SRC = [['store', '店家消費', C.blue], ['game', '遊戲', C.orange], ['travel', '旅行帶回', C.aqua], ['backfill', '補登', C.yellow], ['adjust', '後台調整', C.violet]];
  const sum = (a, f) => a.reduce((n, x) => n + (f ? f(x) : x), 0);
  const uniq = (a) => Object.keys(a.reduce((o, x) => (o[x] = 1, o), {}));
  const pct = (a, b) => b ? Math.round(a / b * 1000) / 10 + '%' : '—';
  const md = (d) => d.slice(5).replace('-', '/');

  /* ---------- 樣式（只加一次） ---------- */
  if (!$('a-style')) { const st = document.createElement('style'); st.id = 'a-style'; st.textContent = `
    .arange{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:14px}.arange .btn{padding:6px 12px}.arange input[type=date]{width:150px}
    .akpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:14px}
    .akpi{background:#fff;border:1px solid var(--line,#E3E9EB);border-radius:14px;padding:12px 14px;cursor:default}.akpi[data-av],.akpi[data-am]{cursor:pointer}.akpi[data-av]:hover{border-color:#2F7F86}
    .akpi .l{font-size:12.5px;color:${C.muted}}.akpi .v{font-size:24px;font-weight:800;color:${C.ink};margin:2px 0}.akpi .d{font-size:12px;font-weight:700}.akpi .d.up{color:#1a7f4b}.akpi .d.dn{color:#b4402d}.akpi .d.eq{color:${C.muted}}.akpi .s{font-size:12px;color:${C.muted}}
    .agrid2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}.agrid3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:14px}.agrid21{display:grid;grid-template-columns:2fr 1fr;gap:14px;margin-bottom:14px}
    @media (max-width:900px){.agrid2,.agrid3,.agrid21{grid-template-columns:1fr}}
    .acard{background:#fff;border:1px solid var(--line,#E3E9EB);border-radius:16px;padding:14px 16px;margin-bottom:14px;min-width:0}.agrid2 .acard,.agrid3 .acard,.agrid21 .acard{margin-bottom:0}
    .acard h2{font-size:15px;margin:0 0 10px;display:flex;align-items:center;gap:8px}.acard h2 .sp{flex:1}.acard .hint{font-size:12px;color:${C.muted};margin:-4px 0 8px}
    .alegend{display:flex;flex-wrap:wrap;gap:12px;font-size:12.5px;color:${C.ink};margin-top:6px}.alegend i{display:inline-block;width:12px;height:4px;border-radius:2px;margin-right:5px;vertical-align:middle}
    .ab{display:flex;flex-direction:column;gap:6px}.ab-row{display:grid;grid-template-columns:minmax(90px,38%) 1fr auto;align-items:center;gap:8px;font-size:13px;border-radius:8px;padding:2px 4px}.ab-row[data-am],.ab-row[data-ap],.ab-row[data-ag],.ab-row[data-as],.ab-row[data-av]{cursor:pointer}.ab-row[data-am]:hover,.ab-row[data-ap]:hover,.ab-row[data-ag]:hover,.ab-row[data-as]:hover{background:#F2F7F7}
    .ab-l{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ab-t{height:12px;background:#F0F3F4;border-radius:6px;overflow:hidden}.ab-t i{display:block;height:100%;border-radius:0 6px 6px 0}.ab-v{font-weight:700;font-variant-numeric:tabular-nums;text-align:right;min-width:52px}.ab-v small{font-weight:400;color:${C.muted};margin-left:4px}
    .alink{color:#2F7F86;font-weight:700;cursor:pointer;text-decoration:none;border-bottom:1px dashed rgba(47,127,134,.5)}.alink:hover{border-bottom-style:solid}
    .ainsight{margin:0;padding-left:18px;font-size:14px;line-height:1.8}.ainsight b{color:${C.ink}}
    .adonut{display:flex;gap:14px;align-items:center;flex-wrap:wrap}.adonut ul{list-style:none;margin:0;padding:0;font-size:13px;flex:1;min-width:160px}.adonut li{display:flex;align-items:center;gap:6px;padding:2px 0}.adonut li i{width:10px;height:10px;border-radius:3px;flex:none}.adonut li b{margin-left:auto;font-variant-numeric:tabular-nums}
    .atl{list-style:none;margin:0;padding:0;font-size:13px;max-height:420px;overflow:auto}.atl li{display:grid;grid-template-columns:130px 92px 1fr auto;gap:8px;padding:6px 2px;border-bottom:1px solid #F0F3F4}.atl li .p{font-weight:700;font-variant-numeric:tabular-nums}.atl .pos{color:#1a7f4b}.atl .neg{color:#b4402d}
    .ahead{display:flex;gap:14px;align-items:center;flex-wrap:wrap}.ahead img{width:64px;height:64px;border-radius:50%;background:#F4EEE2;object-fit:cover}.ahead h2{margin:0;font-size:20px}.ahead .meta{font-size:13px;color:${C.muted}}
    .aback{margin-bottom:10px}
    #atip{position:fixed;z-index:500;pointer-events:none;background:#1E2B30;color:#fff;font-size:12.5px;line-height:1.55;padding:7px 10px;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.2);display:none;max-width:260px}
    .rep{background:#fff;max-width:980px;margin:0 auto;padding:28px 34px;border:1px solid var(--line,#E3E9EB);border-radius:12px}.rep h1{font-size:24px;margin:0}.rep .sub{color:${C.muted};font-size:13px;margin:4px 0 18px}.rep h3{font-size:16px;border-left:4px solid #2F7F86;padding-left:8px;margin:22px 0 10px}.rep table{width:100%;border-collapse:collapse;font-size:13px}.rep th,.rep td{border-bottom:1px solid #E6ECEE;padding:6px 8px;text-align:left}.rep td.n,.rep th.n{text-align:right;font-variant-numeric:tabular-nums}
    @media print{.side,.bar,.test,.arange,.noprint,#atip{display:none!important}.main{margin:0!important}.content{padding:0!important}.rep{border:0;padding:0;max-width:none}.rep h3{break-after:avoid}.acard,.agrid2>div,table{break-inside:avoid}body{background:#fff}}
  `; document.head.appendChild(st); }
  if (!$('atip')) { const t = document.createElement('div'); t.id = 'atip'; document.body.appendChild(t);
    document.addEventListener('mouseover', (e) => { const el = e.target.closest && e.target.closest('[data-tip]'); const tip = $('atip'); if (!el) { tip.style.display = 'none'; return; } tip.innerHTML = esc(el.getAttribute('data-tip')).replace(/\n/g, '<br>'); tip.style.display = 'block'; });
    document.addEventListener('mousemove', (e) => { const tip = $('atip'); if (tip.style.display === 'block') { const x = Math.min(innerWidth - tip.offsetWidth - 8, e.clientX + 14), y = Math.min(innerHeight - tip.offsetHeight - 8, e.clientY + 14); tip.style.left = x + 'px'; tip.style.top = y + 'px'; } });
    /* 各分析互相連結：點會員／贈品／遊戲／店家／指標就跳到對應的分析 */
    document.addEventListener('click', (e) => {
      const el = e.target.closest && e.target.closest('[data-am],[data-ap],[data-ag],[data-as],[data-av]'); if (!el || !el.closest('.main, #drawer')) return;
      if (el.closest('table.tbl') && el.tagName === 'TH') return;
      const dr = $('drawer'); if (dr) dr.classList.remove('on');
      if (el.dataset.am != null) { V.a_member.id = el.dataset.am; return A.go('a_member'); }
      if (el.dataset.ap != null) { V.a_redeem.pid = el.dataset.ap; return A.go('a_redeem'); }
      if (el.dataset.ag != null) { V.a_game.g = el.dataset.ag; return A.go('a_game'); }
      if (el.dataset.as != null) { V.a_store.s = el.dataset.as; return A.go('a_store'); }
      if (el.dataset.av) A.go(el.dataset.av);
    });
  }

  /* D130：指標卡排版——依張數決定欄數，避免最後一排只剩一兩張（5＋1、5＋3） */
  if (!A.kpiFix) { A.kpiFix = 1; const fix = () => document.querySelectorAll('.akpis').forEach((g) => { if (g.style.gridTemplateColumns) return; const n = g.children.length, w = g.clientWidth || 1000, max = Math.max(1, Math.floor((w + 12) / 172)); let k = n <= max ? n : [4, 3, 5, 2].filter((x) => x <= max && n % x === 0)[0] || Math.min(max, 4); g.style.gridTemplateColumns = 'repeat(' + k + ',minmax(0,1fr))'; });
    new MutationObserver(() => requestAnimationFrame(fix)).observe(document.getElementById('root') || document.body, { childList: true, subtree: true }); addEventListener('resize', () => { document.querySelectorAll('.akpis').forEach((g) => { g.style.gridTemplateColumns = ''; }); fix(); }); }

  /* 點左側選單＝回到該分析的總表（清掉上次點進去的單一會員／贈品／遊戲／店家） */
  if (!A.navReset) { A.navReset = 1; document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('.side button[data-v]'); if (!b) return; V.a_member.id = ''; V.a_redeem.pid = ''; V.a_game.g = ''; V.a_store.s = ''; }, true); }

  /* ---------- 期間 ---------- */
  const R = A.R = A.R || { p: '30', from: '', to: '' };
  function earliest(D) { let t = Date.now(); D.ms.forEach((m) => { if (m.created && m.created < t) t = m.created; }); D.led.forEach((e) => { if (e.t < t) t = e.t; }); return K.dayKey(t); }
  function range(D) {
    const today = K.dayKey(), now = new Date(); let from = today, to = today;
    if (R.p === '7') from = K.dayKey(Date.now() - 6 * DAY); else if (R.p === '30') from = K.dayKey(Date.now() - 29 * DAY); else if (R.p === '90') from = K.dayKey(Date.now() - 89 * DAY);
    else if (R.p === 'month') from = today.slice(0, 8) + '01';
    else if (R.p === 'lastweek') { const d = new Date(), w = (d.getDay() + 6) % 7; from = K.dayKey(Date.now() - (w + 7) * DAY); to = K.dayKey(Date.now() - (w + 1) * DAY); }      // G94-D03：完整的上一週，週報用
    else if (R.p === 'lastmonth') { const f = new Date(now.getFullYear(), now.getMonth() - 1, 1), l = new Date(now.getFullYear(), now.getMonth(), 0); from = K.dayKey(f.getTime()); to = K.dayKey(l.getTime()); }
    else if (R.p === 'all') from = earliest(D);
    else if (R.p === 'custom' && R.from && R.to) { from = R.from <= R.to ? R.from : R.to; to = R.from <= R.to ? R.to : R.from; }
    const days = []; for (let t = new Date(from + 'T12:00:00').getTime(); K.dayKey(t) <= to && days.length < 400; t += DAY) days.push(K.dayKey(t));
    const pTo = K.dayKey(new Date(from + 'T12:00:00').getTime() - DAY), pFrom = K.dayKey(new Date(from + 'T12:00:00').getTime() - days.length * DAY);
    const e0 = earliest(D); A.R.noPrev = e0 > pTo ? 'none' : e0 > pFrom ? 'part' : '';      // G95-R05：前期是真的 0，還是根本還沒有資料
    return { from, to, days, pFrom, pTo, noPrev: A.R.noPrev, label: from === to ? md(from) : md(from) + '～' + md(to) + '（' + days.length + ' 天）' };
  }
  function rangeBar(D, rg) {
    const P = [['today', '今天'], ['7', '近 7 天'], ['lastweek', '上週'], ['30', '近 30 天'], ['month', '本月'], ['lastmonth', '上個月'], ['90', '近 90 天'], ['all', '全部']];
    return '<div class="arange noprint"><b style="margin-right:4px">期間</b>' + P.map((p) => '<button class="btn ' + (R.p === p[0] ? '' : 'alt') + '" data-rg="' + p[0] + '">' + p[1] + '</button>').join('') +
      '<span style="margin-left:8px" class="small">自訂</span><input type="date" id="rgF" value="' + rg.from + '"> ～ <input type="date" id="rgT" value="' + rg.to + '"><button class="btn alt" id="rgGo">套用</button>' +
      '<span class="small muted" style="margin-left:auto">比較：前一段同長度 ' + md(rg.pFrom) + '～' + md(rg.pTo) + '</span></div>' + '<div class="small muted noprint" style="margin:-8px 0 12px">🕒 台北時間・資料截至 ' + new Date().toTimeString().slice(0, 5) + (rg.to >= K.dayKey() ? '・<b style="color:#9A6A10">今天還沒結束</b>，圖上今天用虛線、空心點表示，不要跟完整的日子直接比' : '・期間都是完整的日子') + '</div>';      // G94-A06／D01
  }
  function wireRange(c) {
    c.querySelectorAll('[data-rg]').forEach((b) => { b.onclick = () => { R.p = b.dataset.rg; A.app(); }; });
    const go = $('rgGo'); if (go) go.onclick = () => { R.p = 'custom'; R.from = $('rgF').value; R.to = $('rgT').value; A.app(); };
  }

  /* ---------- 統一算數字 ---------- */
  function build(D, from, to) {
    const inr = (t) => { if (!t) return false; const d = K.dayKey(t); return d >= from && d <= to; };
    const given = {}; D.desk.forEach((g) => { given[g.rcode] = g; });
    const L = D.led.filter((e) => inr(e.t)), P = D.plays.filter((p) => inr(p.t));
    const Rd = D.red.filter((r) => inr(r.t)).map((r) => Object.assign({}, r, { st: given[r.id] ? 'done' : r.status, gt: given[r.id] ? given[r.id].t : null, staff: given[r.id] ? given[r.id].staff : '' }));
    const G = D.desk.filter((g) => inr(g.t)), TX = D.tx.filter((x) => inr(x.t));
    const gainBy = { store: 0, game: 0, travel: 0, backfill: 0, adjust: 0 }; let phys = 0, bento = 0, expired = 0, refund = 0, adjNeg = 0;
    L.forEach((e) => { if (e.pts > 0) { if (e.type === 'refund') refund += e.pts; else gainBy[e.type] = (gainBy[e.type] || 0) + e.pts; } else if (e.pts < 0) { if (e.type === 'redeem') { if (e.virtual) bento -= e.pts; else phys -= e.pts; } else if (e.type === 'expire') expired -= e.pts; else adjNeg -= e.pts; } });
    const gain = sum(Object.values(gainBy)), spent = phys + bento - refund;
    const storeE = L.filter((e) => e.type === 'store' || e.type === 'backfill');
    const visitIn = (m) => (m.visits || []).filter((d) => d >= from && d <= to);
    const act = {}; L.forEach((e) => { act[e.mid] = 1; }); P.forEach((p) => { act[p.mid] = 1; }); Rd.forEach((r) => { act[r.mid] = 1; }); D.ms.forEach((m) => { if (visitIn(m).length) act[m.id] = 1; });
    const newM = D.ms.filter((m) => inr(m.created));
    const cpIss = [], cpUsed = []; D.ms.forEach((m) => (m.coupons || []).forEach((x) => { if (inr(x.t)) cpIss.push(Object.assign({ mid: m.id }, x)); if (x.status === 'used' && inr(x.usedT)) cpUsed.push(Object.assign({ mid: m.id }, x)); }));
    const eff = Rd.filter((r) => r.st !== 'cancel' && r.st !== 'expired');
    return { inr, L, P, Rd, G, TX, gainBy, gain, spent, phys, bento, expired, refund, adjNeg, storeE, amount: sum(storeE, (e) => e.amount || 0), active: Object.keys(act), newM, cpIss, cpUsed,
      done: Rd.filter((r) => r.st === 'done').length, wait: Rd.filter((r) => r.st === 'wait').length, cx: Rd.filter((r) => r.st === 'cancel' || r.st === 'expired').length, eff: eff.length,
      players: uniq(P.map((p) => p.mid)), visitIn };
  }
  function delta(cur, prev, lowerBetter) {
    if (A.R.noPrev === 'none') return '<span class="d eq">前期還沒有資料，無法比較</span>';
    if (!prev && !cur) return '<span class="d eq">與上期相同</span>'; if (!prev) return '<span class="d eq">上期 0 → 多 ' + num(cur) + '（無法算百分比）</span>';
    const r = Math.round((cur - prev) / prev * 100); if (!r) return '<span class="d eq">與上期持平</span>';
    if (prev < 10) return '<span class="d eq">' + (cur >= prev ? '多 ' : '少 ') + num(Math.abs(cur - prev)) + '（上期只有 ' + num(prev) + '，基數小不算百分比）</span>';      // G94-A07
    const good = lowerBetter ? r < 0 : r > 0; return '<span class="d ' + (good ? 'up' : 'dn') + '">' + (r > 0 ? '▲ ' : '▼ ') + Math.abs(r) + '%（上期 ' + num(prev) + '）</span>';
  }
  const kpi = (l, v, cur, prev, s, link, lowerBetter) => '<div class="akpi"' + (link ? ' data-av="' + link + '" title="點一下看細節"' : '') + '><div class="l">' + l + '</div><div class="v">' + v + '</div>' + (prev != null ? delta(cur, prev, lowerBetter) : '') + (s ? '<div class="s">' + s + '</div>' : '') + '</div>';

  /* ---------- 圖 ---------- */
  function niceMax(v) { if (v <= 5) return 5; const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
  function line(series, labels, o) {      // series: [{name, color, vals}]
    o = o || {}; const W = 760, H = o.h || 220, PL = 44, PR = 12, PT = 12, PB = 26, n = labels.length;
    const mx = niceMax(Math.max(1, ...series.flatMap((s) => s.vals))), x = (i) => PL + (W - PL - PR) * (n <= 1 ? 0.5 : i / (n - 1)), y = (v) => PT + (H - PT - PB) * (1 - v / mx);
    let g = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="display:block;max-height:' + (H + 10) + 'px" role="img" aria-label="' + esc(o.title || '趨勢圖') + '">';
    const TK = mx % 4 ? 5 : 4; for (let k = 0; k <= TK; k++) { const v = mx * k / TK, yy = y(v); g += '<line x1="' + PL + '" x2="' + (W - PR) + '" y1="' + yy + '" y2="' + yy + '" stroke="' + C.grid + '"/><text x="' + (PL - 6) + '" y="' + (yy + 4) + '" font-size="11" text-anchor="end" fill="' + C.muted + '">' + num(Math.round(v)) + '</text>'; }
    const step = Math.ceil(n / 10); labels.forEach((l, i) => { if (i % step === 0 || i === n - 1) g += '<text x="' + x(i) + '" y="' + (H - 7) + '" font-size="11" text-anchor="middle" fill="' + C.muted + '">' + esc(l) + '</text>'; });
    const part = n > 1 && labels[n - 1] === md(K.dayKey());      // G94-A06：最後一天是今天＝還沒結束，用虛線＋空心點
    series.forEach((s) => { const vv = part ? s.vals.slice(0, n - 1) : s.vals; g += '<polyline fill="none" stroke="' + s.color + '" stroke-width="2" stroke-linejoin="round" points="' + vv.map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1)).join(' ') + '"/>'; if (part) g += '<line x1="' + x(n - 2).toFixed(1) + '" y1="' + y(s.vals[n - 2]).toFixed(1) + '" x2="' + x(n - 1).toFixed(1) + '" y2="' + y(s.vals[n - 1]).toFixed(1) + '" stroke="' + s.color + '" stroke-width="2" stroke-dasharray="4 4"/><circle cx="' + x(n - 1).toFixed(1) + '" cy="' + y(s.vals[n - 1]).toFixed(1) + '" r="4" fill="#fff" stroke="' + s.color + '" stroke-width="2"/>'; if (n <= 45) g += vv.map((v, i) => '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="3" fill="' + s.color + '" stroke="#fff" stroke-width="1.5"/>').join(''); });
    const bw = (W - PL - PR) / Math.max(1, n - 1);
    labels.forEach((l, i) => { g += '<rect x="' + (x(i) - bw / 2).toFixed(1) + '" y="' + PT + '" width="' + bw.toFixed(1) + '" height="' + (H - PT - PB) + '" fill="transparent" data-tip="' + esc(l + '\n' + series.map((s) => '● ' + s.name + '：' + num(s.vals[i])).join('\n')) + '"/>'; });
    g += '</svg>';
    return g + (series.length > 1 || o.legend ? '<div class="alegend">' + series.map((s) => '<span><i style="background:' + s.color + '"></i>' + esc(s.name) + '　<b>' + (s.avg ? '平均每天 ' + (sum(s.vals) / (s.vals.length || 1)).toFixed(1) : '合計 ' + num(sum(s.vals))) + '</b></span>').join('') + '</div>' : '');
  }
  function hbars(rows, o) {      // rows: [{label, v, sub, attr, color}]
    o = o || {}; if (!rows.length) return '<p class="muted small">這段期間沒有資料</p>';
    const mx = Math.max(1, ...rows.map((r) => r.v));
    return '<div class="ab">' + rows.slice(0, o.limit || 12).map((r) => '<div class="ab-row"' + (r.attr || '') + ' data-tip="' + esc(r.label + '：' + num(r.v) + (o.unit || '') + (r.sub ? '\n' + r.sub : '')) + '"><span class="ab-l">' + esc(r.label) + '</span><span class="ab-t"><i style="width:' + Math.max(2, r.v / mx * 100).toFixed(1) + '%;background:' + (r.color || o.color || C.blue) + '"></i></span><span class="ab-v">' + num(r.v) + (o.unit || '') + (r.sub ? '<small>' + esc(r.sub) + '</small>' : '') + '</span></div>').join('') + '</div>' + (rows.length > (o.limit || 12) ? '<div class="small muted" style="margin-top:4px">只列前 ' + (o.limit || 12) + ' 名</div>' : '');
  }
  function donut(parts, o) {      // parts: [{label, v, color, attr}]
    o = o || {}; const tot = sum(parts, (p) => p.v); if (!tot) return '<p class="muted small">這段期間沒有資料</p>';
    const r = 54, cx = 70, cy = 70, sw = 22; let a0 = -Math.PI / 2, g = '<svg viewBox="0 0 140 140" width="140" height="140" role="img" aria-label="' + esc(o.title || '比例') + '">';
    parts.filter((p) => p.v > 0).forEach((p) => { const a1 = a0 + p.v / tot * Math.PI * 2 - 0.02, big = a1 - a0 > Math.PI ? 1 : 0; g += '<path d="M' + (cx + r * Math.cos(a0)).toFixed(2) + ' ' + (cy + r * Math.sin(a0)).toFixed(2) + ' A' + r + ' ' + r + ' 0 ' + big + ' 1 ' + (cx + r * Math.cos(a1)).toFixed(2) + ' ' + (cy + r * Math.sin(a1)).toFixed(2) + '" fill="none" stroke="' + p.color + '" stroke-width="' + sw + '" data-tip="' + esc(p.label + '：' + num(p.v) + (o.unit || '') + '（' + pct(p.v, tot) + '）') + '"/>'; a0 = a1 + 0.02; });
    g += '<text x="70" y="66" text-anchor="middle" font-size="18" font-weight="800" fill="' + C.ink + '">' + num(tot) + '</text><text x="70" y="84" text-anchor="middle" font-size="11" fill="' + C.muted + '">' + esc(o.center || '合計') + '</text></svg>';
    return '<div class="adonut">' + g + '<ul>' + parts.map((p) => '<li' + (p.attr || '') + (p.attr ? ' style="cursor:pointer"' : '') + '><i style="background:' + p.color + '"></i>' + esc(p.label) + '<b>' + num(p.v) + (o.unit || '') + ' <span class="muted" style="font-weight:400">' + pct(p.v, tot) + '</span></b></li>').join('') + '</ul></div>';
  }
  function cols(vals, labels, o) {      // 直條圖（分布、時段）
    o = o || {}; const W = 760, H = o.h || 170, PL = 36, PB = 24, PT = 10, n = vals.length, mx = niceMax(Math.max(1, ...vals)), bw = (W - PL - 8) / n;
    let g = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="display:block;max-height:' + (H + 10) + 'px" role="img" aria-label="' + esc(o.title || '分布圖') + '">';
    const TK = mx % 4 ? 5 : 4; for (let k = 0; k <= TK; k++) { const yy = PT + (H - PT - PB) * k / TK; g += '<line x1="' + PL + '" x2="' + (W - 8) + '" y1="' + yy + '" y2="' + yy + '" stroke="' + C.grid + '"/><text x="' + (PL - 5) + '" y="' + (yy + 4) + '" font-size="11" text-anchor="end" fill="' + C.muted + '">' + num(Math.round(mx * (1 - k / TK))) + '</text>'; }
    vals.forEach((v, i) => { const h = (H - PT - PB) * v / mx, xx = PL + i * bw + 1; g += '<path d="M' + xx.toFixed(1) + ' ' + (H - PB) + ' v' + (-Math.max(0, h - 4)).toFixed(1) + ' q0 -4 4 -4 h' + Math.max(0, bw - 10).toFixed(1) + ' q4 0 4 4 v' + Math.max(0, h - 4).toFixed(1) + ' z" fill="' + (o.color || C.blue) + '" ' + (v ? '' : 'opacity="0"') + '/>'; g += '<rect x="' + (PL + i * bw) + '" y="' + PT + '" width="' + bw + '" height="' + (H - PT - PB) + '" fill="transparent" data-tip="' + esc(labels[i] + '：' + num(v) + (o.unit || '')) + '"/>'; if (n <= 24 || i % Math.ceil(n / 12) === 0) g += '<text x="' + (PL + i * bw + bw / 2) + '" y="' + (H - 7) + '" font-size="11" text-anchor="middle" fill="' + C.muted + '">' + esc(labels[i]) + '</text>'; });
    return g + '</svg>';
  }
  const card = (title, body, o) => '<div class="acard"' + (o && o.id ? ' id="' + o.id + '"' : '') + '><h2>' + title + '<span class="sp"></span>' + ((o && o.right) || '') + '</h2>' + (o && o.hint ? '<p class="hint">' + o.hint + '</p>' : '') + body + '</div>';
  const daily = (rg, arr, tf, vf) => rg.days.map((d) => sum(arr.filter((x) => K.dayKey(tf(x)) === d), vf || (() => 1)));
  function mname(D, id) { const m = D.ms.filter((x) => x.id === id)[0]; return m && m.name ? m.name : id; }
  const ml = (D, id) => '<a class="alink" data-am="' + esc(id) + '">' + esc(mname(D, id)) + '</a>';
  const pl = (D, pid) => { const p = D.cfg.prizes.filter((x) => x.id === pid)[0]; return '<a class="alink" data-ap="' + esc(pid) + '">' + esc(p ? p.name : pid) + '</a>'; };
  const gl = (g) => '<a class="alink" data-ag="' + esc(g) + '">' + esc(GN(g)) + '</a>';
  const sl = (D, sid) => { const s = K.storeById(sid); return '<a class="alink" data-as="' + esc(sid) + '">' + esc(s ? s.name : sid) + '</a>'; };
  function tbl(id, cols2, rows, o) { return A.table(id, cols2, rows, o); }
  function wire(ids) { ids.forEach((i) => A.wireTable(i, A.app)); }
  const hourCols = (times, o) => { const h = new Array(24).fill(0); times.forEach((t) => { h[new Date(t).getHours()]++; }); return cols(h, h.map((_, i) => i + '時'), Object.assign({ unit: ' 次', title: '時段分布' }, o || {})); };

  /* ====== 1. 營運總覽 ====== */
  V.a_overview = function (c, D) {
    const rg = range(D), M = build(D, rg.from, rg.to), Pm = build(D, rg.pFrom, rg.pTo);
    const topPrize = D.cfg.prizes.map((p) => ({ label: p.name, v: M.Rd.filter((r) => r.prize === p.id && r.st !== 'cancel').length, attr: ' data-ap="' + p.id + '"' })).filter((r) => r.v).sort((a, b) => b.v - a.v);
    const topStore = D.cfg.stores.map((s) => ({ label: s.name, v: sum(M.storeE.filter((e) => e.store === s.id), (e) => e.amount || 0), sub: M.storeE.filter((e) => e.store === s.id).length + ' 筆', attr: ' data-as="' + s.id + '"' })).filter((r) => r.v).sort((a, b) => b.v - a.v);
    const topGame = Object.keys(K.GAMES).map((g, i) => ({ label: GN(g), v: M.P.filter((p) => p.game === g).length, sub: uniq(M.P.filter((p) => p.game === g).map((p) => p.mid)).length + ' 人', attr: ' data-ag="' + g + '"', color: SER[i] })).filter((r) => r.v).sort((a, b) => b.v - a.v);
    const mrows = memberRows(D, M).sort((a, b) => b.score - a.score).slice(0, 10);
    const ins = [];
    const ch = (a, b) => b ? Math.round((a - b) / b * 100) : null;
    if (ch(M.active.length, Pm.active.length) != null) ins.push('活躍會員 <b>' + num(M.active.length) + ' 人</b>，比上期' + (M.active.length >= Pm.active.length ? '多' : '少') + ' ' + Math.abs(ch(M.active.length, Pm.active.length)) + '%。');
    else if (M.active.length) ins.push('這段期間有 <b>' + num(M.active.length) + ' 位</b>會員有活動（' + (A.R.noPrev === 'none' ? '前期還沒有資料可比' : '上期 0 位') + '）。');
    const srcTop = SRC.map((s) => [s[1], M.gainBy[s[0]] || 0]).sort((a, b) => b[1] - a[1])[0]; if (M.gain) ins.push('發出 <b>' + num(M.gain) + ' 點</b>，最大來源是「' + srcTop[0] + '」（' + pct(srcTop[1], M.gain) + '）；用掉 <b>' + num(M.spent) + ' 點</b>，' + (M.spent > M.gain ? '用得比發得多。' : '點數池淨增 ' + num(M.gain - M.spent) + ' 點。'));
    if (topPrize[0]) ins.push('最熱門贈品是 <a class="alink" data-ap="' + topPrize[0].attr.match(/"(.+)"/)[1] + '">' + esc(topPrize[0].label) + '</a>（' + topPrize[0].v + ' 張）；領取率 ' + pct(M.done, M.eff) + '，還有 ' + M.wait + ' 張待領。');
    if (topStore[0]) ins.push('消費集點最多的是 <a class="alink" data-as="' + topStore[0].attr.match(/"(.+)"/)[1] + '">' + esc(topStore[0].label) + '</a>（NT$ ' + num(topStore[0].v) + '）。');
    if (topGame[0]) ins.push('最多人玩的是 <a class="alink" data-ag="' + topGame[0].attr.match(/"(.+)"/)[1] + '">' + esc(topGame[0].label) + '</a>（' + topGame[0].v + ' 局、' + topGame[0].sub + '）。');
    if (!ins.length) ins.push('這段期間還沒有資料。測試玩家開始集點、玩遊戲、兌換後，這裡會自動整理重點。');
    c.innerHTML += rangeBar(D, rg) +
      '<div class="akpis">' + kpi('新會員', num(M.newM.length), M.newM.length, Pm.newM.length, '', 'a_member') + kpi('活躍會員', num(M.active.length), M.active.length, Pm.active.length, '有集點、遊戲、兌換或來訪', 'a_member') +
      kpi('發出點數', num(M.gain), M.gain, Pm.gain, SRC.filter((s) => M.gainBy[s[0]]).map((s) => s[1] + ' ' + num(M.gainBy[s[0]])).join('・'), 'a_points') + kpi('淨用點（扣點−退回）', num(M.spent), M.spent, Pm.spent, '兌換扣 ' + num(M.phys + M.bento) + '−退回 ' + num(M.refund) + '・實體 ' + num(M.phys) + '・便當 ' + num(M.bento), 'a_points') +
      kpi('遊戲局數', num(M.P.length), M.P.length, Pm.P.length, M.players.length + ' 人玩・' + mins(sum(M.P, (p) => p.sec || 0)), 'a_game') + kpi('店家消費（已集點）', 'NT$ ' + num(M.amount), M.amount, Pm.amount, M.storeE.length + ' 筆', 'a_store') +
      kpi('實體兌換單', num(M.Rd.length), M.Rd.length, Pm.Rd.length, '已領 ' + M.done + '・待領 ' + M.wait, 'a_redeem') + kpi('領取率', pct(M.done, M.eff), M.done, Pm.done, '已領 ÷（兌換單 − 取消、逾期）', 'a_redeem') + '</div>' +
      card('📝 這段期間的重點', '<ul class="ainsight">' + ins.map((s) => '<li>' + s + '</li>').join('') + '</ul>', { hint: rg.label + '（點底線文字可以直接看那一項的分析）' }) +
      '<div class="agrid21">' + card('點數發出與用掉（每天）', line([{ name: '發出點數', color: C.blue, vals: daily(rg, M.L.filter((e) => e.pts > 0 && e.type !== 'refund'), (e) => e.t, (e) => e.pts) }, { name: '兌換扣點（未扣退回）', color: C.orange, vals: daily(rg, M.L.filter((e) => e.type === 'redeem'), (e) => e.t, (e) => -e.pts) }], rg.days.map(md), { title: '點數發出與用掉' }), { right: '<a class="alink" data-av="a_points">點數分析 →</a>' }) +
      card('點數從哪裡來', donut(SRC.map((s) => ({ label: s[1], v: M.gainBy[s[0]] || 0, color: s[2], attr: s[0] === 'store' ? ' data-av="a_store"' : s[0] === 'game' ? ' data-av="a_game"' : '' })), { unit: ' 點', center: '發出點數' })) + '</div>' +
      '<div class="agrid21">' + card('會員活躍（每天）', line([{ name: '有活動的會員', avg: 1, color: C.aqua, vals: rg.days.map((d) => dayActive(D, M, d)) }, { name: '新會員', color: C.violet, vals: daily(rg, M.newM, (m) => m.created) }], rg.days.map(md), { title: '會員活躍' }), { right: '<a class="alink" data-av="a_member">會員分析 →</a>' }) +
      card('點數用到哪裡', donut([{ label: '實體贈品', v: M.phys - M.refund > 0 ? M.phys - M.refund : 0, color: C.blue, attr: ' data-av="a_redeem"' }, { label: '小鳶便當', v: M.bento, color: C.orange, attr: ' data-av="a_redeem"' }, { label: '到期失效', v: M.expired, color: C.yellow }, { label: '後台扣點', v: M.adjNeg, color: C.violet }], { unit: ' 點', center: '用掉＋失效' })) + '</div>' +
      '<div class="agrid3">' + card('🎁 熱門贈品', hbars(topPrize, { unit: ' 張', color: C.blue }), { right: '<a class="alink" data-av="a_redeem">兌換分析 →</a>' }) + card('🧾 店家消費', hbars(topStore, { unit: '', color: C.aqua }), { right: '<a class="alink" data-av="a_store">店家分析 →</a>' }) + card('🎮 遊戲', hbars(topGame, { unit: ' 局' }), { right: '<a class="alink" data-av="a_game">遊戲分析 →</a>' }) + '</div>' +
      (window.__ADM_CP ? (function () { const L = window.__ADM_CP.live(D); return card('🎯 行銷活動（正在進行與排程）', L.length ? '<div class="ab">' + L.slice(0, 6).map((it) => '<div class="ab-row" data-av="a_campaign" style="grid-template-columns:auto 1fr auto"><span class="cp-st ' + it.st[0] + '">' + esc(it.st[1]) + '</span><span class="ab-l"><b>' + esc(it.e.title) + '</b>　<span class="muted">' + esc(window.__ADM_CP.rule(D.cfg, it)) + '</span></span><span></span></div>').join('') + '</div>' : '<p class="muted small">目前沒有進行中的活動。</p>', { right: '<a class="alink" data-av="a_campaign">活動成效 →</a>　<a class="alink" data-av="campaigns">管理 →</a>' }); })() : '') +
      card('🏅 最活躍的會員（前 10）', tbl('a_ov_m', memberCols(D), mrows), { hint: '依期間內集點、遊戲、兌換、來訪綜合排序；點會員看他的完整分析' }) +
      card('使用時段（期間內）', A.heat(M.P.map((p) => p.t).concat(M.L.map((e) => e.t))));
    wireRange(c); wire(['a_ov_m']);
  };
  function dayActive(D, M, d) { const s = {}; M.L.forEach((e) => { if (K.dayKey(e.t) === d) s[e.mid] = 1; }); M.P.forEach((p) => { if (K.dayKey(p.t) === d) s[p.mid] = 1; }); D.ms.forEach((m) => { if ((m.visits || []).indexOf(d) >= 0) s[m.id] = 1; }); return Object.keys(s).length; }
  function memberRows(D, M) {
    return D.ms.map((m) => { const L = M.L.filter((e) => e.mid === m.id), P = M.P.filter((p) => p.mid === m.id), Rd = M.Rd.filter((r) => r.mid === m.id), vis = M.visitIn(m).length, st = L.filter((e) => e.type === 'store' || e.type === 'backfill');
      const earned = sum(L.filter((e) => e.pts > 0 && e.type !== 'refund'), (e) => e.pts), spent = -sum(L.filter((e) => e.type === 'redeem'), (e) => e.pts) - sum(L.filter((e) => e.type === 'refund'), (e) => e.pts);
      return { id: m.id, name: m.name || '', bal: m.points || 0, earned, spent, plays: P.length, best: Math.max(0, ...P.map((p) => p.score || 0)), amount: sum(st, (e) => e.amount || 0), stores: st.length, red: Rd.filter((r) => r.st !== 'cancel').length, vis, created: m.created, status: m.status === 'frozen' ? '凍結' : '正常', score: earned + spent + P.length * 2 + vis * 3 + st.length * 3 }; });
  }
  function memberCols(D) { return [{ k: 'name', t: '會員', f: (r) => ml(D, r.id) + '<div class="small muted">' + esc(r.id) + '</div>', csv: (r) => r.id + ' ' + r.name }, { k: 'vis', t: '來訪天數', num: 1 }, { k: 'earned', t: '獲得點數', num: 1 }, { k: 'spent', t: '用掉點數', num: 1 }, { k: 'plays', t: '遊戲局數', num: 1 }, { k: 'amount', t: '消費金額', num: 1, f: (r) => num(r.amount) }, { k: 'red', t: '實體兌換', num: 1 }, { k: 'bal', t: '目前點數', num: 1 }]; }


  /* D130：會員留存與轉換漏斗 */
  function retention(D, rg) {
    const td = K.dayKey(), DAYN = [1, 7, 30], ad = (d, n) => K.dayKey(new Date(d + 'T12:00:00').getTime() + n * DAY);
    const back = (m, n) => { const c0 = K.dayKey(m.created), lim = ad(c0, n); return (m.visits || []).some((d) => d > c0 && d <= lim) || (m.plays || []).some((p) => { const d = K.dayKey(p.t); return d > c0 && d <= lim; }) || (m.ledger || []).some((e) => { const d = K.dayKey(e.t); return d > c0 && d <= lim; }); };
    const coh = D.ms.filter((m) => m.created && K.dayKey(m.created) >= rg.from && K.dayKey(m.created) <= rg.to);
    const rate = (arr, n) => { const el = arr.filter((m) => ad(K.dayKey(m.created), n) <= td); return el.length ? { v: el.filter((m) => back(m, n)).length / el.length, n: el.length } : null; };
    const wk = {}; coh.forEach((m) => { const d = new Date(m.created); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); const k = K.dayKey(d.getTime()); (wk[k] = wk[k] || []).push(m); });
    const cell = (r) => r ? '<td style="text-align:right;background:rgba(27,175,122,' + (0.08 + r.v * 0.55).toFixed(2) + ')"><b>' + Math.round(r.v * 100) + '%</b><div class="small muted">' + r.n + ' 人可算</div></td>' : '<td style="text-align:right" class="muted small">還沒到</td>';
    const tot = DAYN.map((n) => rate(coh, n));
    return card('🔁 新會員留存（加入後有沒有再回來）', coh.length ? '<div class="akpis">' + DAYN.map((n, i) => kpi('第 ' + n + ' 天內回來', tot[i] ? Math.round(tot[i].v * 100) + '%' : '—', null, null, tot[i] ? Math.round(tot[i].v * tot[i].n) + ' / ' + tot[i].n + ' 人（只算加入滿 ' + n + ' 天的人）' : '還沒有人加入滿 ' + n + ' 天')).join('') + '</div>' +
      '<div class="scroll"><table class="tbl"><tr><th>加入的那一週</th><th style="text-align:right">新會員</th>' + DAYN.map((n) => '<th style="text-align:right">第 ' + n + ' 天內回來</th>').join('') + '</tr>' + Object.keys(wk).sort().reverse().map((k) => '<tr><td>' + md(k) + ' 那週</td><td style="text-align:right">' + wk[k].length + '</td>' + DAYN.map((n) => cell(rate(wk[k], n))).join('') + '</tr>').join('') + '</table></div>' : '<p class="muted small">這段期間沒有新會員。</p>',
      { hint: '算法：「N 天內回來」＝加入當天之後的 N 個日曆日內，有任何一天再來訪、玩遊戲或集點（加入當天不算）。只算這段期間加入、而且已經加入滿 N 天的人；未滿的不算進分母、顯示「還沒到」，不填 0%。' });
  }
  function funnel(D, rg) {
    const M = build(D, rg.from, rg.to), act = M.active, has = (f) => act.filter((id) => f(id)).length;
    const pl = {}; M.P.forEach((p) => { pl[p.mid] = 1; }); const st = {}; M.storeE.forEach((e) => { st[e.mid] = 1; }); const rd = {}; M.Rd.forEach((r) => { if (r.st !== 'cancel') rd[r.mid] = 1; }); M.L.forEach((e) => { if (e.type === 'redeem') rd[e.mid] = 1; });
    const steps = [['全部會員', D.ms.filter((m) => !m.created || K.dayKey(m.created) <= rg.to).length], ['期間內有來（活躍）', act.length], ['有玩遊戲', has((id) => pl[id])], ['有到店消費集點', has((id) => st[id])], ['有兌換', has((id) => rd[id])]];
    const mx = Math.max(1, steps[0][1]), base = steps[1][1];      // G95-R01：涵蓋不是逐層漏斗——後三項都除以同一個母體（期間內活躍）
    return card('🧭 會員行為涵蓋（不要求先後順序）', '<div class="ab">' + steps.map((s, i) => { const r = i >= 2 ? s[1] + ' / ' + base + '（' + pct(s[1], base) + '）' : i === 1 ? '佔全部會員 ' + pct(s[1], steps[0][1]) : ''; return '<div class="ab-row" data-tip="' + esc(s[0] + '：' + s[1] + ' 人' + (r ? '\n' + r : '')) + '"><span class="ab-l">' + (i >= 2 ? '　└ ' : '') + s[0] + '</span><span class="ab-t" style="height:18px"><i style="width:' + Math.max(2, s[1] / mx * 100).toFixed(1) + '%;background:' + SER[i] + '"></i></span><span class="ab-v">' + num(s[1]) + ' 人 <small>' + r + '</small></span></div>'; }).join('') + '</div>',
      { hint: '母體＝期間內活躍的會員；玩遊戲、到店集點、兌換這三項都除以這個母體，可以重疊、不看先後（沒玩遊戲直接消費也正常）。比例低的那一項就是可以加強的地方，例如到店集點比例低 → 可以辦「消費集點加倍」。' });
  }

  /* G94-A10：點數對帳——把「期間流量」和「餘額」分開，期初＋增加－減少＝期末，並跟目前餘額核對 */
  function recon(D, rg) {
    const end = new Date(rg.to + 'T00:00:00').getTime() + DAY, st = new Date(rg.from + 'T00:00:00').getTime();
    const bal = (t) => sum(D.led.filter((e) => e.t < t), (e) => e.pts || 0);
    const L = D.led.filter((e) => e.t >= st && e.t < end), g = (f) => sum(L.filter(f), (e) => e.pts);
    const open = bal(st), close = bal(end), now = sum(D.ms, (m) => m.points || 0), ledNow = sum(D.led, (e) => e.pts || 0);
    const rows = [['期初餘額（' + md(rg.from) + ' 00:00）', open, ''], ['＋ 發出（集點、遊戲、旅行、補登）', g((e) => e.pts > 0 && e.type !== 'refund' && e.type !== 'adjust'), 'pos'], ['＋ 退回（取消兌換退點）', g((e) => e.type === 'refund'), 'pos'], ['＋ 後台加點', g((e) => e.type === 'adjust' && e.pts > 0), 'pos'],
      ['－ 兌換扣點（實體＋便當）', -g((e) => e.type === 'redeem'), 'neg'], ['－ 到期失效', -g((e) => e.type === 'expire'), 'neg'], ['－ 後台扣點', -g((e) => e.type === 'adjust' && e.pts < 0), 'neg'], ['＝ 期末餘額（' + md(rg.to) + ' 24:00 或現在）', close, 'tot']];
    const diff = now - ledNow, ok = !diff;
    return card('🧮 點數對帳（期間流量 vs 餘額）', '<div class="scroll"><table class="tbl" style="max-width:620px">' + rows.map((r) => '<tr' + (r[2] === 'tot' ? ' style="font-weight:800;background:#F7FAF9"' : '') + '><td>' + r[0] + '</td><td style="text-align:right;font-variant-numeric:tabular-nums" class="' + r[2] + '">' + (r[2] === 'neg' && r[1] ? '−' : '') + num(Math.abs(r[1])) + ' 點</td></tr>').join('') + '</table></div>' +
      '<p class="small" style="margin:8px 0 0;color:' + (ok ? '#1E8A4C' : '#C8442F') + '">' + (ok ? '✓ 帳本加總 ' + num(ledNow) + ' 點＝全部會員目前餘額 ' + num(now) + ' 點，對得起來。' : '⚠ 帳本加總 ' + num(ledNow) + ' 點，但會員目前餘額合計 ' + num(now) + ' 點，差 ' + num(diff) + ' 點（可能有舊資料沒有帳本明細，或匯入時只帶了餘額）。') + '</p>',
      { hint: '「發出／用掉」是這段期間的流量；「期初／期末」是當下的存量，兩者不要混在一起看。期末餘額由帳本推算；若期間包含今天，就是截至現在。' });
  }

  /* G94-C03：有先後順序的路徑——同一批新會員、加入後 30 天內，依時間先後一步一步走 */
  function seqFunnel(D, rg) {
    const WIN = 30 * DAY, coh = D.ms.filter((m) => m.created && K.dayKey(m.created) >= rg.from && K.dayKey(m.created) <= rg.to);
    if (!coh.length) return card('🛤️ 新會員路徑（有先後順序）', '<p class="muted small">這段期間沒有新會員。</p>');
    const done = {}; D.desk.forEach((g) => { done[g.rcode] = g.t; });
    const g = { j: 0, g1: 0, s1: 0, r1: 0, p1: 0, d1: 0, dr: 0, dp: 0 };
    coh.forEach((m) => { const end = m.created + WIN; g.j++;
      const fg = Math.min(Infinity, ...(m.plays || []).filter((p) => p.t >= m.created && p.t < end).map((p) => p.t));
      const st = (m.ledger || []).filter((e) => (e.type === 'store' || e.type === 'backfill') && e.t >= m.created && e.t < end).map((e) => e.t), rd = (m.redeems || []).filter((r) => r.t >= m.created && r.t < end && r.status !== 'cancel');
      if (fg < Infinity) { g.g1++; const s1 = Math.min(Infinity, ...st.filter((t) => t > fg)); if (s1 < Infinity) { g.s1++; const r1 = rd.filter((r) => r.t > s1).sort((a, b) => a.t - b.t)[0]; if (r1) { g.r1++; if (done[r1.id] || r1.status === 'done') g.p1++; } } }
      const s0 = Math.min(Infinity, ...st); if (s0 < Infinity && !(fg < s0)) { g.d1++; const r0 = rd.filter((r) => r.t > s0).sort((a, b) => a.t - b.t)[0]; if (r0) { g.dr++; if (done[r0.id] || r0.status === 'done') g.dp++; } } });
    const row = (lab, v, prev, col) => '<div class="ab-row"><span class="ab-l">' + lab + '</span><span class="ab-t" style="height:16px"><i style="width:' + Math.max(2, v / g.j * 100).toFixed(1) + '%;background:' + col + '"></i></span><span class="ab-v">' + num(v) + ' 人 <small>' + (prev != null ? '佔上一步 ' + pct(v, prev) : '') + '</small></span></div>';
    const young = coh.filter((m) => Date.now() - m.created < WIN).length;
    return card('🛤️ 新會員路徑（有先後順序）', '<div class="agrid2" style="margin:0"><div><div class="small" style="font-weight:700;margin-bottom:6px">遊戲帶路：加入 → 玩遊戲 → 之後到店集點 → 之後兌換 → 領到</div><div class="ab">' + row('加入', g.j, null, SER[0]) + row('　→ 玩遊戲', g.g1, g.j, SER[1]) + row('　→ 之後到店集點', g.s1, g.g1, SER[2]) + row('　→ 之後兌換', g.r1, g.s1, SER[3]) + row('　→ 領到贈品', g.p1, g.r1, SER[4]) + '</div></div>' +
      '<div><div class="small" style="font-weight:700;margin-bottom:6px">直接消費：加入 → 先到店集點 → 之後兌換 → 領到</div><div class="ab">' + row('加入', g.j, null, SER[0]) + row('　→ 先到店集點', g.d1, g.j, SER[2]) + row('　→ 之後兌換', g.dr, g.d1, SER[3]) + row('　→ 領到贈品', g.dp, g.dr, SER[4]) + '</div></div></div>',
      { hint: '只看這段期間加入的 ' + g.j + ' 位新會員、各自加入後 30 天內的行為，每一步都要發生在上一步之後。兩條路都正常，沒先玩遊戲直接消費的人算在右邊。' + (young ? young + ' 位加入還不滿 30 天，數字之後還會增加。' : '') });
  }
  /* ====== 2. 點數分析 ====== */
  V.a_points = function (c, D) {
    const rg = range(D), M = build(D, rg.from, rg.to), Pm = build(D, rg.pFrom, rg.pTo);
    const bal = D.ms.map((m) => m.points || 0), tot = sum(bal), exp30 = sum(D.ms, (m) => K.expiring(m, 30).due);
    const byStore = D.cfg.stores.map((s, i) => ({ label: s.name, v: sum(M.storeE.filter((e) => e.store === s.id), (e) => e.pts), sub: 'NT$ ' + num(sum(M.storeE.filter((e) => e.store === s.id), (e) => e.amount || 0)), attr: ' data-as="' + s.id + '"', color: SER[i % 8] })).filter((r) => r.v).sort((a, b) => b.v - a.v);
    const byGame = Object.keys(K.GAMES).map((g, i) => ({ label: GN(g), v: sum(M.L.filter((e) => e.type === 'game' && e.game === g), (e) => e.pts), attr: ' data-ag="' + g + '"', color: SER[i % 8] })).filter((r) => r.v).sort((a, b) => b.v - a.v);
    const BK = [[0, 0, '0'], [1, 9, '1–9'], [10, 29, '10–29'], [30, 49, '30–49'], [50, 79, '50–79'], [80, 149, '80–149'], [150, 1e12, '150+']];
    const dist = BK.map((b) => bal.filter((v) => v >= b[0] && v <= b[1]).length);
    const canBuy = D.cfg.prizes.filter((p) => p.on !== false).map((p) => ({ label: p.name + '（' + p.points + ' 點）', v: D.ms.filter((m) => (m.points || 0) >= p.points).length, attr: ' data-ap="' + p.id + '"' })).sort((a, b) => b.v - a.v);
    const mr = memberRows(D, M).filter((r) => r.earned || r.spent).sort((a, b) => b.earned - a.earned);
    c.innerHTML += rangeBar(D, rg) +
      '<div class="akpis">' + kpi('發出點數', num(M.gain), M.gain, Pm.gain, '每位活躍會員平均 ' + (M.active.length ? Math.round(M.gain / M.active.length) : 0) + ' 點') + kpi('淨用點（扣點−退回）', num(M.spent), M.spent, Pm.spent, '兌換扣 ' + num(M.phys + M.bento) + '−退回 ' + num(M.refund) + '・實體 ' + num(M.phys) + '・便當 ' + num(M.bento) + '・退回 ' + num(M.refund), 'a_redeem') + kpi('淨增（發出−用掉−失效）', num(M.gain - M.spent - M.expired), M.gain - M.spent - M.expired, Pm.gain - Pm.spent - Pm.expired) + kpi('目前全部會員餘額', num(tot) + ' 點', null, null, '有點數 ' + bal.filter((v) => v > 0).length + ' 人・30 天內將到期 ' + num(exp30) + ' 點') + '</div>' +
      recon(D, rg) +
      card('每天點數（依來源）', line(SRC.map((s) => ({ name: s[1], color: s[2], vals: daily(rg, M.L.filter((e) => e.type === s[0] && e.pts > 0), (e) => e.t, (e) => e.pts) })).filter((s) => sum(s.vals)).concat([{ name: '兌換扣點（未扣退回）', color: C.red, vals: daily(rg, M.L.filter((e) => e.type === 'redeem'), (e) => e.t, (e) => -e.pts) }]), rg.days.map(md), { legend: true, title: '每天點數' }), { hint: rg.label }) +
      '<div class="agrid2">' + card('店家集點發出的點數', hbars(byStore, { unit: ' 點' }), { right: '<a class="alink" data-av="a_store">店家分析 →</a>' }) + card('遊戲發出的點數（記在當天入帳的遊戲）', hbars(byGame, { unit: ' 點', color: C.orange }), { right: '<a class="alink" data-av="a_game">遊戲分析 →</a>' }) + '</div>' +
      '<div class="agrid2">' + card('會員目前點數分布', cols(dist, BK.map((b) => b[2] + ' 點'), { unit: ' 人', color: C.aqua, title: '點數分布' }), { hint: '橫軸是目前餘額，直條是人數' }) + card('餘額達門檻人數（只看點數，不含庫存、限換）', hbars(canBuy, { unit: ' 人', color: C.violet }), { hint: '用來判斷贈品點數訂得太高或太低；點贈品看兌換情況' }) + '</div>' +
      card('會員點數排行（期間內）', tbl('a_pt_m', memberCols(D), mr), { right: '<button class="btn alt sm" id="exPtM">匯出 CSV</button>', hint: '點會員看他每一筆點數從哪來、用到哪' });
    wireRange(c); wire(['a_pt_m']); $('exPtM').onclick = () => { const T = A.table.last.a_pt_m; A.csv('點數分析_會員', T.cols, T.rows); };
  };

  /* ====== 3. 兌換分析（可點進單一贈品） ====== */
  V.a_redeem = function (c, D) {
    const rg = range(D), M = build(D, rg.from, rg.to), Pm = build(D, rg.pFrom, rg.pTo), pid = V.a_redeem.pid;
    const lag = M.Rd.filter((r) => r.st === 'done' && r.gt).map((r) => r.gt - r.t).sort((a, b) => a - b), medLag = lag.length ? A.median(lag) : null;
    const fmtLag = (ms) => ms == null ? '—' : ms < 3600000 ? Math.round(ms / 60000) + ' 分鐘' : ms < DAY ? (ms / 3600000).toFixed(1) + ' 小時' : (ms / DAY).toFixed(1) + ' 天';
    const B = M.L.filter((e) => e.type === 'redeem' && e.virtual);
    let html = rangeBar(D, rg);
    if (pid) {
      const p = D.cfg.prizes.filter((x) => x.id === pid)[0] || { id: pid, name: pid, points: 0 }, a = M.Rd.filter((r) => r.prize === pid), Pa = Pm.Rd.filter((r) => r.prize === pid);
      const ppl = uniq(a.filter((r) => r.st !== 'cancel').map((r) => r.mid));
      html += '<div class="aback noprint"><button class="btn alt sm" id="aBack">← 全部贈品</button></div>' +
        '<div class="acard"><div class="ahead"><img src="' + K.prizeImg(pid) + '" alt="" style="border-radius:14px"><div><h2>' + esc(p.name) + '</h2><div class="meta">' + p.points + ' 點・目前可兌換 ' + K.stockLeft(pid) + '・實物現存 ' + K.onHand(pid) + (p.perUser ? '・每人' + ({ day: '每天', month: '每月' }[p.perUserPer] || '') + '限 ' + p.perUser + ' 份' : '') + '</div></div></div></div>' +
        '<div class="akpis">' + kpi('兌換單', num(a.length), a.length, Pa.length) + kpi('兌換人數', num(ppl.length), ppl.length, uniq(Pa.map((r) => r.mid)).length) + kpi('已領／待領', a.filter((r) => r.st === 'done').length + '／' + a.filter((r) => r.st === 'wait').length) + kpi('取消／逾期退點', num(a.filter((r) => r.st === 'cancel' || r.st === 'expired').length)) + kpi('用掉點數', num(sum(a.filter((r) => r.st !== 'cancel' && r.st !== 'expired'), (r) => r.pts || 0))) + '</div>' +
        card('每天兌換', line([{ name: '兌換單', color: C.blue, vals: daily(rg, a, (r) => r.t) }, { name: '服務台發放', color: C.aqua, vals: daily(rg, M.G.filter((g) => g.prize === pid), (g) => g.t) }], rg.days.map(md))) +
        card('換了這個贈品的會員', tbl('a_rd_pm', [{ k: 't', t: '兌換時間', f: (r) => dt(r.t), csv: (r) => dt(r.t) }, { k: 'mid', t: '會員', f: (r) => ml(D, r.mid) }, { k: 'id', t: '兌換碼' }, { k: 'st', t: '狀態', f: (r) => ({ done: '已領', wait: '待領', cancel: '取消', expired: '逾期退點' })[r.st] || r.st }, { k: 'gt', t: '領取時間', f: (r) => r.gt ? dt(r.gt) : '' }, { k: 'staff', t: '經手' }], a.sort((x, y) => y.t - x.t)));
    }
    const prow = D.cfg.prizes.map((p, i) => { const a = M.Rd.filter((r) => r.prize === p.id); return { label: p.name, v: a.filter((r) => r.st !== 'cancel').length, sub: a.filter((r) => r.st === 'done').length + ' 已領', attr: ' data-ap="' + p.id + '"', color: SER[i % 8] }; }).filter((r) => r.v).sort((a, b) => b.v - a.v);
    const cpRows = (D.cfg.coupons || []).map((cp) => { const iss = M.cpIss.filter((x) => x.cid === cp.id).length, used = M.cpUsed.filter((x) => x.cid === cp.id).length; return { name: cp.name, store: cp.store || '', iss, used, rate: pct(used, iss), on: cp.on ? '開' : '關' }; });
    const mr = memberRows(D, M).filter((r) => r.red || r.spent).sort((a, b) => b.red - a.red || b.spent - a.spent);
    const given = {}; D.desk.forEach((g) => { given[g.rcode] = 1; });
    const waitL = D.red.filter((r) => r.status === 'wait' && !given[r.id]).sort((a, b) => a.t - b.t);
    html += (pid ? '<h3 style="margin:18px 2px 10px;font-size:15px">全部贈品</h3>' : '') +
      '<div class="akpis">' + kpi('實體兌換單', num(M.Rd.length) + ' 張', M.Rd.length, Pm.Rd.length, '共 ' + num(sum(M.Rd, (r) => r.qty || 1)) + ' 件・' + uniq(M.Rd.map((r) => r.mid)).length + ' 人（一張單可以換多件）') + kpi('領取率', pct(M.done, M.eff), M.done, Pm.done, '已領 ' + M.done + '・待領 ' + M.wait + '・取消逾期 ' + M.cx) + kpi('兌換到領取（中位數）', lag.length ? fmtLag(medLag) : '無法計算', null, null, lag.length ? lag.length + ' / ' + M.done + ' 張已領有領取時間' : '已領 ' + M.done + ' 張都沒有服務台領取紀錄（0 / ' + M.done + '），只有服務台核發的單才算得出等待時間') + kpi('小鳶便當', num(B.length) + ' 份', B.length, Pm.L.filter((e) => e.type === 'redeem' && e.virtual).length, '用掉 ' + num(M.bento) + ' 點') + kpi('券：發出／核銷', num(M.cpIss.length) + '／' + num(M.cpUsed.length), M.cpUsed.length, Pm.cpUsed.length, '核銷率 ' + pct(M.cpUsed.length, M.cpIss.length)) + '</div>' +
      card('每天兌換數量', line([{ name: '實體兌換單', color: C.blue, vals: daily(rg, M.Rd, (r) => r.t) }, { name: '服務台發放', color: C.aqua, vals: daily(rg, M.G, (g) => g.t) }, { name: '小鳶便當', color: C.orange, vals: daily(rg, B, (e) => e.t) }, { name: '券核銷', color: C.violet, vals: daily(rg, M.cpUsed, (x) => x.usedT) }], rg.days.map(md)), { hint: rg.label }) +
      '<div class="agrid21">' + card('各贈品兌換（點贈品看細節）', hbars(prow, { unit: ' 張' })) + card('兌換單狀態', donut([{ label: '已領', v: M.done, color: C.aqua }, { label: '待領', v: M.wait, color: C.yellow }, { label: '取消／逾期退點', v: M.cx, color: C.red }], { unit: ' 張', center: '兌換單' })) + '</div>' +
      '<div class="agrid2">' + card('便當', hbars((D.cfg.bentos || []).map((b, i) => ({ label: b.name + '（' + b.points + ' 點）', v: B.filter((e) => e.bento === b.id).length, sub: uniq(B.filter((e) => e.bento === b.id).map((e) => e.mid)).length + ' 人', color: SER[(i + 1) % 8] })), { unit: ' 份' })) +
      card('旅行帶回的券', tbl('a_rd_cp', [{ k: 'name', t: '券' }, { k: 'store', t: '專櫃' }, { k: 'on', t: '狀態' }, { k: 'iss', t: '發出', num: 1 }, { k: 'used', t: '核銷', num: 1 }, { k: 'rate', t: '核銷率', num: 1 }], cpRows)) + '</div>' +
      card('會員兌換排行', tbl('a_rd_m', memberCols(D), mr), { right: '<button class="btn alt sm" id="exRdM">匯出 CSV</button>' }) +
      card('目前待領取（由舊到新）', tbl('a_rd_w', [{ k: 't', t: '兌換時間', f: (r) => dt(r.t), csv: (r) => dt(r.t) }, { k: 'mid', t: '會員', f: (r) => ml(D, r.mid) }, { k: 'name', t: '贈品', f: (r) => pl(D, r.prize) }, { k: 'id', t: '兌換碼' }, { k: 'age', t: '已等', f: (r) => fmtLag(Date.now() - r.t) }, { k: 'due', t: '領取期限', f: (r) => { const hd = D.cfg.redeemHoldDays; if (!hd) return '<span class="muted">不限</span>'; const due = r.t + hd * DAY, left = due - Date.now(); return K.dayKey(due).slice(5).replace('-', '/') + '　' + (left < 0 ? '<span class="pill r">已過期限・會員下次開官方 LINE 時自動退點</span>' : left < 3 * DAY ? '<span class="pill o">剩 ' + Math.ceil(left / DAY) + ' 天</span>' : '<span class="muted">剩 ' + Math.ceil(left / DAY) + ' 天</span>'); }, csv: (r) => D.cfg.redeemHoldDays ? K.dayKey(r.t + D.cfg.redeemHoldDays * DAY) : '' }], waitL), { hint: '領取期限照後台「點數規則」的兌換單保留天數；快到期的先通知客人（目前不推播，請服務台留意）。' });      // G94-A15
    c.innerHTML += html; wireRange(c); wire(['a_rd_cp', 'a_rd_m', 'a_rd_w', 'a_rd_pm']);
    if ($('aBack')) $('aBack').onclick = () => { V.a_redeem.pid = ''; A.app(); };
    $('exRdM').onclick = () => { const T = A.table.last.a_rd_m; A.csv('兌換分析_會員', T.cols, T.rows); };
  };

  /* ====== 4. 遊戲分析（可點進單一遊戲） ====== */
  V.a_game = function (c, D) {
    const rg = range(D), M = build(D, rg.from, rg.to), Pm = build(D, rg.pFrom, rg.pTo), g = V.a_game.g;
    const games = Object.keys(K.GAMES).filter((k) => K.GAMES[k].levels && Object.keys(K.GAMES[k].levels).length || D.plays.some((p) => p.game === k));
    let html = rangeBar(D, rg);
    const gp = (P, k) => P.filter((p) => p.game === k);
    if (g) {
      const P = gp(M.P, g), PP = gp(Pm.P, g), lv = Object.keys(K.GAMES[g] ? K.GAMES[g].levels : {}).concat(uniq(P.map((p) => p.level))).filter((v, i, a) => a.indexOf(v) === i);
      const sc = P.map((p) => p.score || 0), mx = Math.max(1, ...sc), bucket = niceMax(mx) / 10, hist = new Array(10).fill(0); sc.forEach((s) => { hist[Math.min(9, Math.floor(s / bucket))]++; });
      const top = uniq(P.map((p) => p.mid)).map((mid) => { const a = P.filter((p) => p.mid === mid); return { id: mid, n: a.length, best: Math.max(...a.map((p) => p.score || 0)), avg: Math.round(sum(a, (p) => p.score || 0) / a.length), sec: sum(a, (p) => p.sec || 0), pts: sum(M.L.filter((e) => e.type === 'game' && e.game === g && e.mid === mid), (e) => e.pts) }; }).sort((a, b) => b.best - a.best);
      html += '<div class="aback noprint"><button class="btn alt sm" id="aBack">← 全部遊戲</button></div><h2 style="margin:0 2px 10px">' + esc(GN(g)) + '</h2>' +
        '<div class="akpis">' + kpi('局數', num(P.length), P.length, PP.length) + kpi('玩家', num(top.length), top.length, uniq(PP.map((p) => p.mid)).length, '每位玩家平均 ' + (top.length ? (P.length / top.length).toFixed(1) : 0) + ' 局') + kpi('平均分', num(Math.round(sum(sc) / (sc.length || 1))), null, null, '最高 ' + num(Math.max(0, ...sc))) + kpi('遊玩時間', mins(sum(P, (p) => p.sec || 0))) + kpi('發出遊戲點數', num(sum(M.L.filter((e) => e.type === 'game' && e.game === g), (e) => e.pts)) + ' 點') + '</div>' +
        card('每天局數與玩家', line([{ name: '局數', color: SER[games.indexOf(g) % 8] || C.blue, vals: daily(rg, P, (p) => p.t) }, { name: '玩家', avg: 1, color: C.violet, vals: rg.days.map((d) => uniq(P.filter((p) => K.dayKey(p.t) === d).map((p) => p.mid)).length) }], rg.days.map(md))) +
        '<div class="agrid2">' + card('各關卡', tbl('a_gm_lv', [{ k: 'l', t: '關卡' }, { k: 'n', t: '局數', num: 1 }, { k: 'pp', t: '玩家', num: 1 }, { k: 'avg', t: '平均分', num: 1 }, { k: 'best', t: '最高分', num: 1 }, { k: 'min', t: '分鐘', num: 1 }], lv.map((l) => { const a = P.filter((p) => String(p.level) === String(l)); return { l: LN(g, l), n: a.length, pp: uniq(a.map((p) => p.mid)).length, avg: a.length ? Math.round(sum(a, (p) => p.score || 0) / a.length) : 0, best: Math.max(0, ...a.map((p) => p.score || 0)), min: Math.round(sum(a, (p) => p.sec || 0) / 60) }; }))) +
        card('分數分布', cols(hist, hist.map((_, i) => num(i * bucket) + '～'), { unit: ' 局', color: C.orange, title: '分數分布' }), { hint: '每一條是一個分數區間的局數' }) + '</div>' +
        card('玩家排行（點會員看完整分析）', tbl('a_gm_top', [{ k: 'id', t: '會員', f: (r) => ml(D, r.id) }, { k: 'n', t: '局數', num: 1 }, { k: 'best', t: '最高分', num: 1 }, { k: 'avg', t: '平均分', num: 1 }, { k: 'sec', t: '時間', num: 1, f: (r) => mins(r.sec) }, { k: 'pts', t: '換到點數', num: 1 }], top)) +
        card('什麼時段在玩', hourCols(P.map((p) => p.t), { unit: ' 局' }));
    }
    const rows = games.map((k, i) => { const a = gp(M.P, k); return { label: GN(k), v: a.length, sub: uniq(a.map((p) => p.mid)).length + ' 人', attr: ' data-ag="' + k + '"', color: SER[i % 8] }; }).filter((r) => r.v).sort((a, b) => b.v - a.v);
    const gameMaster = games.map((k) => { const a = gp(M.P, k); return { k, g: GN(k), n: a.length, pp: uniq(a.map((p) => p.mid)).length, avg: a.length ? Math.round(sum(a, (p) => p.score || 0) / a.length) : 0, best: Math.max(0, ...a.map((p) => p.score || 0)), min: Math.round(sum(a, (p) => p.sec || 0) / 60), pts: sum(M.L.filter((e) => e.type === 'game' && e.game === k), (e) => e.pts) }; }).filter((r) => r.n);
    html += (g ? '<h3 style="margin:18px 2px 10px;font-size:15px">全部遊戲</h3>' : '') +
      '<div class="akpis">' + kpi('遊戲局數', num(M.P.length), M.P.length, Pm.P.length) + kpi('玩家', num(M.players.length), M.players.length, Pm.players.length, '每位玩家平均 ' + (M.players.length ? (M.P.length / M.players.length).toFixed(1) : 0) + ' 局') + kpi('遊玩時間', mins(sum(M.P, (p) => p.sec || 0))) + kpi('遊戲發出點數', num(M.gainBy.game) + ' 點', M.gainBy.game, Pm.gainBy.game, '', 'a_points') + '</div>' +
      card('每天局數（依遊戲）', line(games.map((k, i) => ({ name: GN(k), color: SER[i % 8], vals: daily(rg, gp(M.P, k), (p) => p.t) })).filter((s) => sum(s.vals)), rg.days.map(md), { legend: true }), { hint: rg.label }) +
      '<div class="agrid21">' + card('各遊戲（點遊戲看細節）', tbl('a_gm_all', [{ k: 'g', t: '遊戲', f: (r) => gl(r.k) }, { k: 'n', t: '局數', num: 1 }, { k: 'pp', t: '玩家', num: 1 }, { k: 'avg', t: '平均分', num: 1 }, { k: 'best', t: '最高分', num: 1 }, { k: 'min', t: '分鐘', num: 1 }, { k: 'pts', t: '發出點數', num: 1 }], gameMaster)) + card('局數占比', hbars(rows, { unit: ' 局' })) + '</div>' +
      card('什麼時段在玩', hourCols(M.P.map((p) => p.t), { unit: ' 局' }));
    c.innerHTML += html; wireRange(c); wire(['a_gm_lv', 'a_gm_top', 'a_gm_all']);
    if ($('aBack')) $('aBack').onclick = () => { V.a_game.g = ''; A.app(); };
  };

  /* ====== 5. 店家消費分析（可點進單一店家） ====== */
  V.a_store = function (c, D) {
    const rg = range(D), M = build(D, rg.from, rg.to), Pm = build(D, rg.pFrom, rg.pTo), s = V.a_store.s;
    const sE = (E, id) => E.filter((e) => e.store === id), claimed = {}; D.led.forEach((e) => { if (e.ref) claimed[e.ref] = 1; });
    let html = rangeBar(D, rg);
    if (s) {
      const st = K.storeById(s) || { name: s }, E = sE(M.storeE, s), PE = sE(Pm.storeE, s), TX = M.TX.filter((x) => x.store === s), un = TX.filter((x) => !claimed[x.nonce] && !x.void).length;
      const mm = uniq(E.map((e) => e.mid)).map((mid) => { const a = E.filter((e) => e.mid === mid); return { id: mid, n: a.length, amt: sum(a, (e) => e.amount || 0), pts: sum(a, (e) => e.pts), last: Math.max(...a.map((e) => e.t)) }; }).sort((a, b) => b.amt - a.amt);
      const BK = [[0, 99, '<100'], [100, 299, '100–299'], [300, 499, '300–499'], [500, 999, '500–999'], [1000, 1999, '1000–1999'], [2000, 1e12, '2000+']];
      html += '<div class="aback noprint"><button class="btn alt sm" id="aBack">← 全部店家</button></div><h2 style="margin:0 2px 10px">' + esc(st.name) + '</h2>' +
        '<div class="akpis">' + kpi('集點筆數', num(E.length), E.length, PE.length) + kpi('消費金額', 'NT$ ' + num(sum(E, (e) => e.amount || 0)), sum(E, (e) => e.amount || 0), sum(PE, (e) => e.amount || 0)) + kpi('平均客單', 'NT$ ' + num(E.length ? Math.round(sum(E, (e) => e.amount || 0) / E.length) : 0)) + kpi('集點會員', num(mm.length), mm.length, uniq(PE.map((e) => e.mid)).length, '回購（2 次以上）' + mm.filter((m) => m.n >= 2).length + ' 人') + kpi('出碼沒被領走', num(un) + ' 張', null, null, '共出碼 ' + TX.length + ' 張（' + pct(un, TX.length) + '）') + '</div>' +
        card('每天消費金額', line([{ name: '消費金額', color: C.blue, vals: daily(rg, E, (e) => e.t, (e) => e.amount || 0) }], rg.days.map(md)) + line([{ name: '集點筆數', color: C.aqua, vals: daily(rg, E, (e) => e.t) }], rg.days.map(md), { h: 140, legend: true })) +
        '<div class="agrid2">' + card('客單分布', cols(BK.map((b) => E.filter((e) => (e.amount || 0) >= b[0] && (e.amount || 0) <= b[1]).length), BK.map((b) => b[2]), { unit: ' 筆', color: C.aqua })) + card('什麼時段消費', hourCols(E.map((e) => e.t), { unit: ' 筆', color: C.blue })) + '</div>' +
        card('在這家集點的會員', tbl('a_st_m', [{ k: 'id', t: '會員', f: (r) => ml(D, r.id) }, { k: 'n', t: '筆數', num: 1 }, { k: 'amt', t: '金額', num: 1, f: (r) => num(r.amt) }, { k: 'pts', t: '點數', num: 1 }, { k: 'last', t: '最近一次', f: (r) => dt(r.last) }], mm));
    }
    const rows = D.cfg.stores.map((x) => { const E = sE(M.storeE, x.id), TX = M.TX.filter((t) => t.store === x.id); return { k: x.id, name: x.name, n: E.length, amt: sum(E, (e) => e.amount || 0), pts: sum(E, (e) => e.pts), avg: E.length ? Math.round(sum(E, (e) => e.amount || 0) / E.length) : 0, mem: uniq(E.map((e) => e.mid)).length, tx: TX.length, un: TX.filter((t) => !claimed[t.nonce] && !t.void).length }; });
    const ua = M.storeE.filter((e) => !D.cfg.stores.some((x) => x.id === e.store)); if (ua.length) rows.push({ k: '', name: '⚠ 未歸屬店家（舊資料或店家已移除）', n: ua.length, amt: sum(ua, (e) => e.amount || 0), pts: sum(ua, (e) => e.pts), avg: 0, mem: uniq(ua.map((e) => e.mid)).length, tx: 0, un: 0 });      // G95-R03：總數要跟各店加起來對得上
    const withAmt = M.storeE.filter((e) => e.amount > 0), noAmt = M.storeE.length - withAmt.length;
    html += (s ? '<h3 style="margin:18px 2px 10px;font-size:15px">全部店家</h3>' : '') + (ua.length || noAmt ? '<div class="test" style="margin-bottom:12px">對帳提醒：' + (ua.length ? ua.length + ' 筆集點找不到對應的店家（列在表格最後一列）' : '') + (ua.length && noAmt ? '；' : '') + (noAmt ? noAmt + ' 筆沒有記錄消費金額（客單價不算這幾筆）' : '') + '。總數＝各店加總＋未歸屬。</div>' : '') +
      '<div class="akpis">' + kpi('集點筆數', num(M.storeE.length), M.storeE.length, Pm.storeE.length) + kpi('消費金額', 'NT$ ' + num(M.amount), M.amount, Pm.amount) + kpi('平均客單', withAmt.length ? 'NT$ ' + num(Math.round(sum(withAmt, (e) => e.amount) / withAmt.length)) : '資料不足', null, null, '有記錄金額的 ' + withAmt.length + ' 筆平均') + kpi('消費發出點數', num(M.gainBy.store) + ' 點', M.gainBy.store, Pm.gainBy.store, '', 'a_points') + kpi('集點會員', num(uniq(M.storeE.map((e) => e.mid)).length), uniq(M.storeE.map((e) => e.mid)).length, uniq(Pm.storeE.map((e) => e.mid)).length) + '</div>' +
      card('每天消費金額（依店家）', line(D.cfg.stores.map((x, i) => ({ name: x.name, color: SER[i % 8], vals: daily(rg, sE(M.storeE, x.id), (e) => e.t, (e) => e.amount || 0) })).filter((q) => sum(q.vals)), rg.days.map(md), { legend: true }), { hint: rg.label }) +
      '<div class="agrid21">' + card('各店家（點店家看細節）', tbl('a_st_all', [{ k: 'name', t: '店家', f: (r) => r.k ? sl(D, r.k) : '<span style="color:#9A6A10">' + esc(r.name) + '</span>' }, { k: 'n', t: '筆數', num: 1 }, { k: 'amt', t: '金額', num: 1, f: (r) => num(r.amt) }, { k: 'avg', t: '客單', num: 1, f: (r) => num(r.avg) }, { k: 'pts', t: '點數', num: 1 }, { k: 'mem', t: '會員', num: 1 }, { k: 'un', t: '出碼沒領', num: 1 }], rows)) + card('金額占比', donut(rows.map((r, i) => ({ label: r.name, v: r.amt, color: SER[i % 8], attr: ' data-as="' + r.k + '"' })), { center: '消費金額' })) + '</div>';
    c.innerHTML += html; wireRange(c); wire(['a_st_m', 'a_st_all']);
    if ($('aBack')) $('aBack').onclick = () => { V.a_store.s = ''; A.app(); };
  };

  /* ====== 6. 會員分析（列表 → 單一會員完整分析） ====== */
  V.a_member = function (c, D) {
    const rg = range(D), M = build(D, rg.from, rg.to), Pm = build(D, rg.pFrom, rg.pTo), id = V.a_member.id;
    if (id && D.ms.some((m) => m.id === id)) return memberDetail(c, D, rg, M, id);
    const rows = memberRows(D, M), f = (V.a_member.q || '').toUpperCase(), seg = V.a_member.seg || '';
    const ago30 = K.dayKey(Date.now() - 29 * DAY);
    const S = { new: (r) => M.newM.some((m) => m.id === r.id), back: (r) => r.vis >= 2, once: (r) => r.vis === 1, idle: (r) => r.bal > 0 && !((D.ms.filter((m) => m.id === r.id)[0] || {}).visits || []).some((d) => d >= ago30), frozen: (r) => r.status === '凍結' };
    const SN = { new: '期間內新會員', back: '期間內活躍 2 天以上', once: '期間內只來 1 天', idle: '有點數但 30 天沒來（截至現在）', frozen: '凍結中（截至現在）' };
    const list = rows.filter((r) => (!f || (r.id + r.name).toUpperCase().indexOf(f) >= 0) && (!seg || S[seg](r))).sort((a, b) => b.score - a.score);
    c.innerHTML += rangeBar(D, rg) +
      '<div class="akpis">' + Object.keys(SN).map((k) => '<div class="akpi" data-seg="' + k + '" style="cursor:pointer;' + (seg === k ? 'border-color:#2F7F86;box-shadow:0 0 0 2px rgba(47,127,134,.2)' : '') + '"><div class="l">' + SN[k] + '</div><div class="v">' + rows.filter(S[k]).length + '</div><div class="s">點一下只看這群</div></div>').join('') + kpi('活躍會員', num(M.active.length), M.active.length, Pm.active.length, '全部會員 ' + D.ms.length + ' 位') + '</div>' +
      card('會員列表（點會員看他的完整分析）', '<div class="filters noprint" style="margin-bottom:8px"><input id="amQ" placeholder="搜尋會員編號或名稱" value="' + esc(V.a_member.q || '') + '" style="width:240px"><button class="btn alt" id="amGo">搜尋</button>' + (seg ? '<button class="btn alt" id="amSeg">清除篩選：' + SN[seg] + '</button>' : '') + '<span class="sp"></span><button class="btn alt sm" id="exAm">匯出 CSV</button></div>' + tbl('a_mb_all', memberCols(D).concat([{ k: 'created', t: '加入', f: (r) => r.created ? dt(r.created).slice(0, 10) : '' }, { k: 'status', t: '狀態' }]), list), { hint: '數字都是' + rg.label + '的期間內；「目前點數」是現在的餘額' }) +
      '<div class="agrid2">' + card('每天活躍會員', line([{ name: '有活動的會員', avg: 1, color: C.aqua, vals: rg.days.map((d) => dayActive(D, M, d)) }, { name: '新會員', color: C.violet, vals: daily(rg, M.newM, (m) => m.created) }], rg.days.map(md))) +
      card('會員來訪天數分布（期間內）', cols([1, 2, 3, 4, 5].map((n, i) => rows.filter((r) => i < 4 ? r.vis === n : r.vis >= n).length), ['1 天', '2 天', '3 天', '4 天', '5 天以上'], { unit: ' 人', color: C.aqua }), { hint: '回訪越多越好' }) + '</div>' + retention(D, rg) + funnel(D, rg) + seqFunnel(D, rg);
    wireRange(c); wire(['a_mb_all']);
    $('amGo').onclick = () => { V.a_member.q = $('amQ').value.trim(); A.app(); }; $('amQ').onkeydown = (e) => { if (e.key === 'Enter') $('amGo').onclick(); };
    if ($('amSeg')) $('amSeg').onclick = () => { V.a_member.seg = ''; A.app(); };
    c.querySelectorAll('[data-seg]').forEach((b) => { b.onclick = () => { V.a_member.seg = V.a_member.seg === b.dataset.seg ? '' : b.dataset.seg; A.app(); }; });
    $('exAm').onclick = () => { const T = A.table.last.a_mb_all; A.csv('會員分析', T.cols, T.rows); };
    const T = A.table.last.a_mb_all; if (T) T.click = null;
  };
  function memberDetail(c, D, rg, M, id) {
    const m = D.ms.filter((x) => x.id === id)[0], L = M.L.filter((e) => e.mid === id), P = M.P.filter((p) => p.mid === id), Rd = M.Rd.filter((r) => r.mid === id);
    const Lall = D.led.filter((e) => e.mid === id), all = memberRows(D, M), me = all.filter((r) => r.id === id)[0];
    const act = all.filter((r) => r.score > 0), rank = (k) => { const s = act.map((r) => r[k]).sort((a, b) => b - a), i = s.indexOf(me[k]); return act.length && me[k] ? '前 ' + Math.max(1, Math.round((i + 1) / act.length * 100)) + '%' : '—'; };
    const gainBy = {}; L.filter((e) => e.pts > 0 && e.type !== 'refund').forEach((e) => { gainBy[e.type] = (gainBy[e.type] || 0) + e.pts; });
    const st = L.filter((e) => e.type === 'store' || e.type === 'backfill');
    const gameRows = uniq(P.map((p) => p.game + '|' + p.level)).map((k) => { const [g, l] = k.split('|'), a = P.filter((p) => p.game === g && String(p.level) === l); return { g, gl: GN(g) + '・' + LN(g, l), n: a.length, best: Math.max(...a.map((p) => p.score || 0)), avg: Math.round(sum(a, (p) => p.score || 0) / a.length), sec: sum(a, (p) => p.sec || 0) }; }).sort((a, b) => b.n - a.n);
    const storeRows = uniq(st.map((e) => e.store)).map((s) => { const a = st.filter((e) => e.store === s); return { s, n: a.length, amt: sum(a, (e) => e.amount || 0), pts: sum(a, (e) => e.pts) }; }).sort((a, b) => b.amt - a.amt);
    const tl = L.map((e) => ({ t: e.t, kind: TL(e), what: e.storeName ? e.storeName + ' NT$' + num(e.amount) : e.prizeName || (e.game ? GN(e.game) + (e.note ? '（' + e.note + '）' : '') : e.note || ''), pts: e.pts })).concat(P.map((p) => ({ t: p.t, kind: '遊戲', what: GN(p.game) + '・' + LN(p.game, p.level) + ' ' + num(p.score) + ' 分' + (p.counted ? '' : '（不計分）'), pts: null }))).concat(Rd.map((r) => ({ t: r.t, kind: '兌換單', what: r.name + '・' + ({ done: '已領', wait: '待領', cancel: '取消', expired: '逾期退點' })[r.st] + '・' + r.id, pts: null }))).concat((m.coupons || []).filter((x) => M.inr(x.t)).map((x) => ({ t: x.t, kind: '拿到券', what: x.name + '・' + ({ ok: '未使用', used: '已使用', expired: '已過期' })[x.status], pts: null }))).sort((a, b) => b.t - a.t);
    const flt = V.a_member.tl || '';
    c.innerHTML += '<div class="aback noprint"><button class="btn alt sm" id="aBack">← 全部會員</button> <button class="btn alt sm" id="aOps">會員操作（調點、凍結、標籤）</button></div>' + rangeBar(D, rg) +
      '<div class="acard"><div class="ahead"><img src="' + ((m.line && m.line.pic) || '../travel/assets/kite_hello.png') + '" alt=""><div><h2>' + esc(m.name || '會員 ' + m.id) + ' <span class="pill ' + (m.status === 'frozen' ? 'r' : 'g') + '">' + (m.status === 'frozen' ? '凍結' : '正常') + '</span></h2><div class="meta">' + esc(m.id) + '・加入 ' + (m.created ? dt(m.created) : '—') + '・來過 ' + (m.visits || []).length + ' 天・最近 ' + ((m.visits || []).slice(-1)[0] || '—') + (m.line ? '・已綁 LINE' : '') + ((m.tags || []).length ? '・標籤：' + esc(m.tags.join('、')) : '') + '</div></div><div style="margin-left:auto;text-align:right"><div class="small muted">目前點數</div><div style="font-size:30px;font-weight:900">' + num(m.points || 0) + '</div><div class="small muted">30 天內到期 ' + num(K.expiring(m, 30).due) + ' 點</div></div></div></div>' +
      '<div class="akpis">' + kpi('期間來訪', me.vis + ' 天', null, null, '活躍會員中 ' + rank('vis')) + kpi('獲得點數', num(me.earned), null, null, '活躍會員中 ' + rank('earned')) + kpi('用掉點數', num(me.spent), null, null, '實體兌換 ' + me.red + ' 張') + kpi('遊戲局數', num(me.plays), null, null, '活躍會員中 ' + rank('plays') + '・' + mins(sum(P, (p) => p.sec || 0))) + kpi('消費集點', 'NT$ ' + num(me.amount), null, null, me.stores + ' 筆・' + storeRows.length + ' 家店') + '</div>' +
      '<div class="agrid21">' + card('每天的活動', line([{ name: '獲得點數', color: C.blue, vals: daily(rg, L.filter((e) => e.pts > 0 && e.type !== 'refund'), (e) => e.t, (e) => e.pts) }, { name: '用掉點數', color: C.orange, vals: daily(rg, L.filter((e) => e.type === 'redeem'), (e) => e.t, (e) => -e.pts) }, { name: '遊戲局數', color: C.violet, vals: daily(rg, P, (p) => p.t) }], rg.days.map(md)), { hint: rg.label }) + card('點數從哪裡來', donut(SRC.map((s) => ({ label: s[1], v: gainBy[s[0]] || 0, color: s[2] })), { unit: ' 點', center: '獲得' })) + '</div>' +
      '<div class="agrid2">' + card('玩過的遊戲', tbl('a_md_g', [{ k: 'gl', t: '遊戲／關卡', f: (r) => '<a class="alink" data-ag="' + r.g + '">' + esc(r.gl) + '</a>' }, { k: 'n', t: '局數', num: 1 }, { k: 'best', t: '最高分', num: 1 }, { k: 'avg', t: '平均分', num: 1 }, { k: 'sec', t: '時間', num: 1, f: (r) => mins(r.sec) }], gameRows)) +
      card('去過的店家', tbl('a_md_s', [{ k: 's', t: '店家', f: (r) => sl(D, r.s) }, { k: 'n', t: '筆數', num: 1 }, { k: 'amt', t: '金額', num: 1, f: (r) => num(r.amt) }, { k: 'pts', t: '點數', num: 1 }], storeRows)) + '</div>' +
      '<div class="agrid2">' + card('兌換與券', tbl('a_md_r', [{ k: 't', t: '時間', f: (r) => dt(r.t) }, { k: 'name', t: '贈品', f: (r) => pl(D, r.prize) }, { k: 'st', t: '狀態', f: (r) => ({ done: '已領', wait: '待領', cancel: '取消', expired: '逾期退點' })[r.st] || r.st }, { k: 'pts', t: '點數', num: 1 }], Rd.sort((a, b) => b.t - a.t)) + ((m.coupons || []).length ? '<div class="small" style="margin-top:8px"><b>券：</b>' + m.coupons.map((x) => esc(x.name) + '（' + ({ ok: '未使用', used: '已使用', expired: '過期' })[x.status] + '）').join('、') + '</div>' : '')) +
      card('什麼時段來', hourCols(L.map((e) => e.t).concat(P.map((p) => p.t)), { unit: ' 次', color: C.aqua, h: 150 })) + '</div>' +
      card('時間軸（期間內每一筆）', '<div class="filters noprint" style="margin-bottom:6px">' + ['', '店家集點', '遊戲換點', '遊戲', '兌換', '兌換單', '兌換便當', '旅行帶回', '拿到券', '手動調整', '到期'].map((k) => '<button class="btn ' + (flt === k ? '' : 'alt') + ' sm" data-tlf="' + k + '">' + (k || '全部') + '</button>').join('') + '</div><ul class="atl">' + (tl.filter((x) => !flt || x.kind === flt).slice(0, 300).map((x) => '<li><span class="muted">' + dt(x.t) + '</span><span>' + esc(x.kind) + '</span><span>' + esc(x.what) + '</span><span class="p ' + (x.pts > 0 ? 'pos' : x.pts < 0 ? 'neg' : '') + '">' + (x.pts == null ? '' : (x.pts > 0 ? '+' : '') + x.pts) + '</span></li>').join('') || '<li class="muted">這段期間沒有紀錄</li>') + '</ul>', { hint: '全部歷史共 ' + Lall.length + ' 筆點數紀錄；換上方期間就能看別段時間' });
    wireRange(c); wire(['a_md_g', 'a_md_s', 'a_md_r']);
    $('aBack').onclick = () => { V.a_member.id = ''; A.app(); };
    $('aOps').onclick = () => A.memberDrawer(id);
    c.querySelectorAll('[data-tlf]').forEach((b) => { b.onclick = () => { V.a_member.tl = b.dataset.tlf; A.app(); }; });
  }

  /* ====== 7. 營運報告（排版、可列印／存 PDF） ====== */

  /* G94-A27／C01～C05：營運報告首頁先回答主管每週最想問的五個問題（每題一句結論＋建議＋資料限制） */
  function fiveQ(D, rg, M) {
    const ad = (d, n) => K.dayKey(new Date(d + 'T12:00:00').getTime() + n * DAY), td = K.dayKey();
    const did = (m, d0, d1) => (m.plays || []).some((p) => { const d = K.dayKey(p.t); return d >= d0 && d <= d1; }) || (m.ledger || []).some((e) => { const d = K.dayKey(e.t); return d >= d0 && d <= d1 && (e.type === 'store' || e.type === 'redeem' || e.type === 'backfill'); });
    const nm = M.newM, mat = nm.filter((m) => ad(K.dayKey(m.created), 7) <= td), used = mat.filter((m) => did(m, K.dayKey(m.created), ad(K.dayKey(m.created), 7)));
    const back = mat.filter((m) => { const c0 = K.dayKey(m.created), lim = ad(c0, 7); return (m.visits || []).some((d) => d > c0 && d <= lim) || did(m, ad(c0, 1), lim); });
    const sleep = D.ms.filter((m) => (m.points || 0) > 0 && !(m.visits || []).some((d) => d > ad(td, -14)));
    const pl = uniq(M.P.map((p) => p.mid)), sc = uniq(M.storeE.map((e) => e.mid)), both = pl.filter((id) => sc.indexOf(id) >= 0);
    const exp30 = sum(D.ms, (m) => (K.expiring ? K.expiring(m, 30).due : 0)), low = D.cfg.prizes.filter((p) => K.stockLeft(p.id) <= 5 && p.on !== false);
    const topS = D.cfg.stores.map((s) => ({ n: s.name, v: sum(M.storeE.filter((e) => e.store === s.id), (e) => e.amount || 0) })).sort((a, b) => b.v - a.v)[0];
    const topG = Object.keys(K.GAMES).map((g) => ({ n: GN(g), v: uniq(M.P.filter((p) => p.game === g).map((p) => p.mid)).length })).sort((a, b) => b.v - a.v)[0];
    let camp = null; if (window.__ADM_CP) { const L = window.__ADM_CP.all(D.cfg).filter((it) => it.e.on).map((it) => ({ it, ef: window.__ADM_CP.effect(D, it, rg.from, rg.to) })).filter((x) => x.ef.lift != null).sort((a, b) => b.ef.lift - a.ef.lift); camp = L[0] || null; }
    const q = (n, title, ans, sug, lim) => '<div style="border:1px solid #E3E9EB;border-radius:10px;padding:10px 12px;margin:0 0 8px;break-inside:avoid"><div style="font-weight:800;font-size:14px">Q' + n + '　' + title + '</div><div style="font-size:13.5px;margin-top:4px">' + ans + '</div>' + (sug ? '<div style="font-size:13px;margin-top:3px;color:#1E6B70">→ ' + sug + '</div>' : '') + (lim ? '<div style="font-size:11.5px;color:' + C.muted + ';margin-top:3px">資料限制：' + lim + '</div>' : '') + '</div>';
    return '<h3>本期五個重點問題</h3>' +
      q(1, '新會員有開始使用嗎？', nm.length ? '本期新會員 <b>' + nm.length + '</b> 位；已加入滿 7 天的 ' + mat.length + ' 位中，<b>' + used.length + ' 位</b>（' + pct(used.length, mat.length) + '）7 天內有玩遊戲、到店集點或兌換。' : '本期沒有新會員。', mat.length && used.length / mat.length < 0.5 ? '一半以上的新會員加入後沒動作，可以在加入頁加「第一次玩遊戲送點」的提示或活動。' : '', mat.length < nm.length ? (nm.length - mat.length) + ' 位加入還不滿 7 天，沒有算進比例。' : '') +
      q(2, '會員會回來嗎？哪些人需要關心？', mat.length ? '加入滿 7 天的新會員中，<b>' + back.length + ' / ' + mat.length + '</b>（' + pct(back.length, mat.length) + '）7 天內有再回來。' : '新會員還不夠久，暫時無法算回訪。', sleep.length ? '<b>' + sleep.length + ' 位</b>會員手上有點數但超過 14 天沒來，可以列為下次活動的對象（目前不推播，可用公告或現場提醒）。' : '', '「回來」＝加入隔天之後有來訪、遊戲或集點。') +
      q(3, '遊戲有沒有帶動到店消費？', pl.length ? '本期玩遊戲的 ' + pl.length + ' 人中，<b>' + both.length + ' 人</b>（' + pct(both.length, pl.length) + '）也有到店消費集點；到店集點的 ' + sc.length + ' 人中有 ' + pct(both.length, sc.length) + ' 也玩遊戲。' : '本期沒有遊戲紀錄。', pl.length && both.length / pl.length < 0.3 ? '遊戲玩家很少到店，可以試「玩完遊戲當天消費加倍」的消費集點加倍活動。' : '', '這是同期間有沒有做過，不代表先玩遊戲才去消費。') +
      q(4, '點數與贈品運轉健康嗎？本週要處理什麼？', '本期發出 <b>' + num(M.gain) + '</b> 點、淨用 <b>' + num(M.spent) + '</b> 點；待領兌換單 <b>' + M.wait + '</b> 張' + (exp30 ? '；未來 30 天內有 ' + num(exp30) + ' 點會到期' : '') + (low.length ? '；庫存 5 個以下：' + low.map((p) => esc(p.name)).join('、') : '') + '。', [M.wait ? '服務台留意 ' + M.wait + ' 張待領單的領取期限' : '', low.length ? '補貨或暫停低庫存贈品' : '', exp30 ? '可以發公告提醒點數快到期' : ''].filter(Boolean).join('；'), '') +
      q(5, '哪個活動、店家、遊戲值得下週繼續？', [topS && topS.v ? '集點消費最多的店家：<b>' + esc(topS.n) + '</b>（NT$ ' + num(topS.v) + '）' : '', topG && topG.v ? '最多人玩的遊戲：<b>' + esc(topG.n) + '</b>（' + topG.v + ' 人）' : '', camp ? '觀察到差異最明顯的活動：<b>' + esc(camp.it.e.title) + '</b>（' + esc(camp.ef.liftL) + ' ' + (camp.ef.lift >= 0 ? '▲' : '▼') + Math.abs(Math.round(camp.ef.lift * 100)) + '%）' : '活動資料還不足，暫不比較'].filter(Boolean).join('；') + '。', camp && camp.ef.lift > 0 ? '「' + esc(camp.it.e.title) + '」可以考慮下週續辦。' : '', '活動差異是觀察值，不代表一定是活動造成的；店家金額只含有集點的消費。');
  }
  V.a_report = function (c, D) {
    const rg = range(D), M = build(D, rg.from, rg.to), Pm = build(D, rg.pFrom, rg.pTo), site = (D.cfg.site || {}).name || '';
    const r2 = (cur, prev) => { if (A.R.noPrev === 'none') return '前期無資料'; if (!prev) return cur ? '上期 0' : '—'; if (prev < 10) return (cur >= prev ? '+' : '−') + num(Math.abs(cur - prev)); const r = Math.round((cur - prev) / prev * 100); return (r > 0 ? '+' : '') + r + '%'; };
    const kp = [['新會員', M.newM.length, Pm.newM.length], ['活躍會員', M.active.length, Pm.active.length], ['發出點數', M.gain, Pm.gain], ['淨用點（扣點−退回）', M.spent, Pm.spent], ['遊戲局數', M.P.length, Pm.P.length], ['遊戲玩家', M.players.length, Pm.players.length], ['店家消費（元）', M.amount, Pm.amount], ['集點筆數', M.storeE.length, Pm.storeE.length], ['實體兌換單', M.Rd.length, Pm.Rd.length], ['已領', M.done, Pm.done], ['便當', M.L.filter((e) => e.type === 'redeem' && e.virtual).length, Pm.L.filter((e) => e.type === 'redeem' && e.virtual).length], ['券核銷', M.cpUsed.length, Pm.cpUsed.length]];
    const prizeT = D.cfg.prizes.map((p) => { const a = M.Rd.filter((r) => r.prize === p.id); return [p.name, a.filter((r) => r.st !== 'cancel').length, a.filter((r) => r.st === 'done').length, K.stockLeft(p.id)]; }).filter((r) => r[1] || r[3] <= 10);
    const storeT = D.cfg.stores.map((s) => { const a = M.storeE.filter((e) => e.store === s.id); return [s.name, a.length, sum(a, (e) => e.amount || 0), sum(a, (e) => e.pts), uniq(a.map((e) => e.mid)).length]; });
    const gameT = Object.keys(K.GAMES).map((g) => { const a = M.P.filter((p) => p.game === g); return [GN(g), a.length, uniq(a.map((p) => p.mid)).length, a.length ? Math.round(sum(a, (p) => p.score || 0) / a.length) : 0, Math.round(sum(a, (p) => p.sec || 0) / 60)]; }).filter((r) => r[1]);
    const topM = memberRows(D, M).sort((a, b) => b.score - a.score).slice(0, 10);
    const T = (head, rows, numCols) => '<table><tr>' + head.map((h, i) => '<th' + (numCols.indexOf(i) >= 0 ? ' class="n"' : '') + '>' + h + '</th>').join('') + '</tr>' + (rows.length ? rows.map((r) => '<tr>' + r.map((v, i) => '<td' + (numCols.indexOf(i) >= 0 ? ' class="n"' : '') + '>' + (typeof v === 'number' ? num(v) : v) + '</td>').join('') + '</tr>').join('') : '<tr><td colspan="' + head.length + '" style="color:' + C.muted + '">沒有資料</td></tr>') + '</table>';
    c.innerHTML += rangeBar(D, rg) + '<div class="noprint" style="display:flex;gap:8px;margin-bottom:12px"><button class="btn" id="rpPrint">🖨️ 列印／存成 PDF</button><button class="btn alt" id="rpCsv">匯出摘要 CSV</button><span class="small muted" style="align-self:center">列印時會自動隱藏選單與按鈕；要細節表格請到「明細匯出」</span></div>' +
      '<div class="rep"><h1>營運報告</h1><div class="sub">' + esc(site) + '・期間 ' + rg.from + ' ～ ' + rg.to + '（' + rg.days.length + ' 天）・與前一段同長度期間（' + rg.pFrom + ' ～ ' + rg.pTo + '）比較・產生時間 ' + dt(Date.now()) + '</div>' +
      fiveQ(D, rg, M) +
      '<h3>一、摘要數字</h3>' + T(['項目', '本期', '上期', '變化'], kp.map((k) => [k[0], k[1], A.R.noPrev === 'none' ? '—' : k[2], r2(k[1], k[2])]), [1, 2, 3]) +
      '<h3>二、點數</h3><div class="agrid21"><div>' + line([{ name: '發出', color: C.blue, vals: daily(rg, M.L.filter((e) => e.pts > 0 && e.type !== 'refund'), (e) => e.t, (e) => e.pts) }, { name: '兌換扣點（未扣退回）', color: C.orange, vals: daily(rg, M.L.filter((e) => e.type === 'redeem'), (e) => e.t, (e) => -e.pts) }], rg.days.map(md)) + '</div><div>' + donut(SRC.map((s) => ({ label: s[1], v: M.gainBy[s[0]] || 0, color: s[2] })), { unit: ' 點', center: '發出' }) + '</div></div>' +
      '<p style="font-size:13px">發出 ' + num(M.gain) + ' 點（' + SRC.filter((s) => M.gainBy[s[0]]).map((s) => s[1] + ' ' + num(M.gainBy[s[0]])).join('、') + '）；用掉 ' + num(M.spent) + ' 點（實體 ' + num(M.phys) + '、便當 ' + num(M.bento) + '、退回 ' + num(M.refund) + '）；到期 ' + num(M.expired) + ' 點；目前全部會員餘額 ' + num(sum(D.ms, (m) => m.points || 0)) + ' 點。</p>' +
      '<h3>三、會員</h3>' + line([{ name: '有活動的會員', avg: 1, color: C.aqua, vals: rg.days.map((d) => dayActive(D, M, d)) }, { name: '新會員', color: C.violet, vals: daily(rg, M.newM, (x) => x.created) }], rg.days.map(md), { h: 170 }) +
      '<h3>四、兌換</h3><p style="font-size:13px">實體兌換單 ' + M.Rd.length + ' 張，已領 ' + M.done + '、待領 ' + M.wait + '、取消或逾期 ' + M.cx + '，領取率 ' + pct(M.done, M.eff) + '。</p>' + T(['贈品', '兌換', '已領', '目前可兌換'], prizeT, [1, 2, 3]) +
      '<h3>五、店家消費</h3>' + T(['店家', '集點筆數', '消費金額', '發出點數', '會員數'], storeT, [1, 2, 3, 4]) +
      '<h3>六、遊戲</h3>' + T(['遊戲', '局數', '玩家', '平均分', '分鐘'], gameT, [1, 2, 3, 4]) +
      '<h3>七、最活躍的會員（前 10）</h3>' + T(['會員', '來訪天數', '獲得', '用掉', '局數', '消費金額'], topM.map((r) => [esc(r.name || r.id) + ' <span style="color:' + C.muted + '">' + esc(r.id) + '</span>', r.vis, r.earned, r.spent, r.plays, r.amount]), [1, 2, 3, 4, 5]) +
      '<p style="font-size:12px;color:' + C.muted + ';margin-top:18px">資料來源：雲端測試資料庫（各裝置同步）。「活躍會員」＝期間內有集點、遊戲、兌換或來訪。「領取率」＝已領 ÷（兌換單 − 取消 − 逾期退點）。</p></div>';
    wireRange(c);
    $('rpPrint').onclick = () => { K.audit('列印營運報告 ' + rg.from + '～' + rg.to); window.print(); };
    $('rpCsv').onclick = () => A.csv('營運報告摘要_' + rg.from + '_' + rg.to, [{ k: 0, t: '項目' }, { k: 1, t: '本期' }, { k: 2, t: '上期' }, { k: 3, t: '變化' }], kp.map((k) => ({ 0: k[0], 1: k[1], 2: k[2], 3: r2(k[1], k[2]) })));
  };

  /* 選單：分析群組換成新的分析中心；舊網址導向新頁 */
  window.__ADM_UI = { C, SER, SRC, sum, uniq, pct, md, range, rangeBar, wireRange, build, delta, kpi, line, hbars, donut, cols, card, daily, ml, gl, sl, tbl, wire, hourCols };      // D130：給 campaigns.js（行銷活動）共用同一套圖表與期間
  A.setAnalyticsNav([['a_overview', '📈 營運總覽'], ['a_points', '🪙 點數分析'], ['a_redeem', '🎁 兌換分析'], ['a_game', '🎮 遊戲分析'], ['a_store', '🧾 店家消費分析'], ['a_member', '👤 會員分析'], ['a_report', '📄 營運報告'], ['reports', '📋 明細匯出']], { pstats: 'a_points', rstats: 'a_redeem', mstats: 'a_member' });
});
