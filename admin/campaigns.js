/* 小鳶來港 後台・行銷活動中心 v1（D130，Dari 10/20：新增行銷活動功能要完整、分析要完整、排版清楚好看）
   一張清單管理三種活動（遊戲點數加倍 cfg.events、消費集點加倍 cfg.storeEvents、消費滿額加點 cfg.storeBonus），
   新增用精靈（類型 → 範本 → 填寫 → 檢查 → 預覽客人看到的文字 → 可同時發公告），每個活動都能看成效。
   資料格式完全沿用原本的設定（點數計算由 shared/kite_core.js 的 eventMult／storeMult／storeBonusPts 照舊處理），舊的「活動設定」頁仍可用。 */
(window.__ADM_EXT = window.__ADM_EXT || []).push(function (A) {
  'use strict';
  const K = A.K, V = A.V, esc = A.esc, num = A.num, GN = A.GN, DAY = 86400000;
  const $ = (id) => document.getElementById(id);
  const DW = '日一二三四五六';
  const TYPES = {
    game: { icon: '🎮', name: '遊戲點數加倍', key: 'events', desc: '在指定星期、時段玩遊戲，換到的點數乘上倍數（當天上限也會跟著乘）。適合拉平日人潮、延長停留。' },
    store: { icon: '🧾', name: '消費集點加倍', key: 'storeEvents', desc: '活動期間在指定店家消費，集點乘上倍數。適合週年慶、新店開幕、淡季促銷。' },
    bonus: { icon: '➕', name: '消費滿額加點', key: 'storeBonus', desc: '單筆消費滿門檻多送幾點。適合拉高客單價。' }
  };
  const TPL = {
    game: [['週末遊戲加倍', { title: '週末捕魚加倍', game: 'fish', days: [0, 6], from: '00:00', to: '23:59', mult: 2 }], ['平日午後衝人氣', { title: '平日午後飛行加倍', game: 'fly', days: [1, 2, 3, 4, 5], from: '14:00', to: '17:00', mult: 1.5 }], ['開幕週全遊戲加倍', { title: '開幕週全遊戲加倍', game: 'all', days: [0, 1, 2, 3, 4, 5, 6], from: '00:00', to: '23:59', mult: 2, week: 1 }]],
    store: [['週年慶集點加倍（7 天）', { title: '週年慶集點加倍', mult: 2, len: 7 }], ['新店開幕三天 1.5 倍', { title: '新店開幕集點 1.5 倍', mult: 1.5, len: 3 }]],
    bonus: [['滿 1,000 元加 5 點', { title: '單筆滿 1,000 元加 5 點', minAmount: 1000, add: 5, len: 14 }], ['滿 500 元加 2 點', { title: '單筆滿 500 元加 2 點', minAmount: 500, add: 2, len: 14 }]]
  };
  const today = () => K.dayKey(), addD = (d, n) => K.dayKey(new Date(d + 'T12:00:00').getTime() + n * DAY);
  const hm = (t) => { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const md = (d) => d ? d.slice(5).replace('-', '/') : '';

  /* ---------- 樣式 ---------- */
  if (!$('cp-style')) { const st = document.createElement('style'); st.id = 'cp-style'; st.textContent = `
    .cp-top{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}.cp-top .sp{flex:1}.cp-top input{width:220px;padding:7px 12px;border:1px solid var(--line);border-radius:8px;background:#fff}
    .cp-f{display:flex;gap:6px;flex-wrap:wrap}.cp-f .btn{padding:5px 12px}.cp-f .n{display:inline-block;min-width:18px;padding:0 5px;border-radius:9px;background:rgba(0,0,0,.08);font-size:11px;margin-left:2px}
    .cp-list{display:flex;flex-direction:column;gap:10px}
    .cp-item{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:12px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px 14px}
    .cp-item.off{opacity:.62}.cp-ic{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;font-size:22px;background:var(--teal2)}
    .cp-t{font-weight:800;font-size:15px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}.cp-r{font-size:13px;color:var(--ink);margin-top:3px}.cp-m{font-size:12px;color:var(--muted);margin-top:3px}
    .cp-a{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.cp-a .btn{padding:5px 10px;font-size:12.5px}
    .cp-sw{position:relative;width:40px;height:22px;border-radius:11px;background:#C9D3D6;cursor:pointer;border:0;flex:none}.cp-sw::after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .15s}.cp-sw.on{background:var(--green)}.cp-sw.on::after{left:21px}
    .cp-st{font-size:11.5px;font-weight:800;padding:2px 9px;border-radius:999px}.cp-st.live{background:#DDF3E5;color:#1E8A4C}.cp-st.armed{background:#E6F1F1;color:#2F7F86}.cp-st.sched{background:#FCF1D9;color:#9A6A10}.cp-st.ended,.cp-st.off{background:#ECEFF0;color:#6B7F86}
    .cp-kpi{font-size:12px;color:var(--muted);text-align:right;min-width:150px}.cp-kpi b{display:block;font-size:15px;color:var(--ink)}
    .cp-empty{text-align:center;padding:36px 12px;color:var(--muted)}.cp-empty b{display:block;font-size:16px;color:var(--ink);margin-bottom:6px}
    .cp-types{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:8px 0 14px}.cp-type{border:2px solid var(--line);border-radius:14px;padding:12px;cursor:pointer;background:#fff;text-align:left}.cp-type.on{border-color:var(--teal);background:#F2F8F8}.cp-type b{display:block;font-size:14px;margin:4px 0}.cp-type span{font-size:12px;color:var(--muted);line-height:1.5}
    .cp-step{font-size:12px;font-weight:800;color:var(--teal);letter-spacing:.04em;margin:16px 0 6px}
    .cp-form{display:grid;grid-template-columns:130px 1fr;gap:10px 12px;align-items:center}.cp-form label{font-size:13px;color:var(--muted);font-weight:700}.cp-form .full{grid-column:1/-1}
    .cp-form input,.cp-form select{padding:6px 9px;border:1px solid var(--line);border-radius:8px;background:#fff;font:inherit}.cp-form input:not([type]),.cp-form select{width:100%;max-width:420px}.cp-form input[type=checkbox]{padding:0}
    .cp-days{display:flex;gap:4px;flex-wrap:wrap}.cp-days label{display:inline-flex;align-items:center;justify-content:center;width:34px;height:30px;border:1px solid var(--line);border-radius:8px;cursor:pointer;font-weight:700;color:var(--ink)}.cp-days input{display:none}.cp-days label.on{background:var(--teal);color:#fff;border-color:var(--teal)}
    .cp-tpl{display:flex;gap:6px;flex-wrap:wrap}.cp-tpl .btn{font-weight:600}
    .cp-chk{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13px}.cp-chk label{display:inline-flex;gap:4px;align-items:center;color:var(--ink);font-weight:600}
    .cp-prev{background:#F7FAF9;border:1px dashed #9DC5C8;border-radius:12px;padding:12px 14px;font-size:13.5px;line-height:1.7}
    .cp-warn{margin:0;padding-left:18px;font-size:13px;line-height:1.7}.cp-warn li.e{color:#C8442F;font-weight:700}.cp-warn li.w{color:#9A6A10}.cp-warn li.ok{color:#1E8A4C;list-style:'✓ '}
    .cp-foot{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;position:sticky;bottom:-18px;background:#fff;padding:12px 0;border-top:1px solid var(--line)}
    @media (max-width:900px){.cp-item{grid-template-columns:44px 1fr}.cp-a,.cp-kpi{grid-column:1/-1;justify-content:flex-start;text-align:left}.cp-types{grid-template-columns:1fr}}
  `; document.head.appendChild(st); }

  /* ---------- 共用：把三種活動攤平成一張清單 ---------- */
  function all(cfg) {
    const out = [];
    (cfg.events || []).forEach((e, i) => out.push({ type: 'game', i, e }));
    (cfg.storeEvents || []).forEach((e, i) => out.push({ type: 'store', i, e }));
    (cfg.storeBonus || []).forEach((e, i) => out.push({ type: 'bonus', i, e }));
    return out;
  }
  const span = (it) => it.type === 'game' ? [it.e.dateFrom || '', it.e.dateTo || ''] : [it.e.from || '', it.e.to || ''];
  function status(it, now) {
    now = now || Date.now(); const e = it.e, d = K.dayKey(now), [f, t] = span(it);
    if (!e.on) return ['off', '已關閉'];
    if (t && d > t) return ['ended', '已結束'];
    if (f && d < f) return ['sched', '排程中・' + md(f) + ' 開始'];
    if (it.type === 'game') { const w = new Date(now).getDay(), h = hm(now); if ((e.days || []).indexOf(w) >= 0 && h >= e.from && h <= e.to) return ['live', '進行中']; return ['armed', '已啟用・' + nextWin(e, now)]; }
    return ['live', '進行中'];
  }
  function nextWin(e, now) { for (let k = 0; k < 8; k++) { const t = now + k * DAY, w = new Date(t).getDay(); if ((e.days || []).indexOf(w) < 0) continue; if (k === 0 && hm(now) > e.to) continue; if (e.dateTo && K.dayKey(t) > e.dateTo) break; return (k === 0 ? '今天' : k === 1 ? '明天' : '週' + DW[w]) + ' ' + e.from + ' 開始'; } return '近期沒有時段'; }
  function daysTxt(ds) { ds = (ds || []).slice().sort(); const s = ds.join(''); if (ds.length === 7) return '每天'; if (s === '06') return '週六、日'; if (s === '12345') return '週一到週五'; if (!ds.length) return '（沒選星期）'; return ds.sort((a, b) => (a || 7) - (b || 7)).map((d) => '週' + DW[d]).join('、'); }
  const storeTxt = (cfg, ids) => !ids || !ids.length ? '全館店家' : ids.map((id) => { const s = (cfg.stores || []).filter((x) => x.id === id)[0]; return s ? s.name.replace('東三東四 ', '') : id; }).join('、');
  const gameTxt = (g) => g === 'all' ? '全部遊戲' : GN(g);
  function rule(cfg, it) {
    const e = it.e, dr = (f, t) => f || t ? (f ? md(f) : '即日起') + '～' + (t ? md(t) : '不限') : '不限日期';
    if (it.type === 'game') return gameTxt(e.game) + '・' + daysTxt(e.days) + ' ' + (e.from === '00:00' && e.to === '23:59' ? '全天' : e.from + '–' + e.to) + '・點數 ×' + e.mult + '・' + dr(e.dateFrom, e.dateTo);
    if (it.type === 'store') return storeTxt(cfg, e.stores) + '・集點 ×' + e.mult + '・' + dr(e.from, e.to);
    return storeTxt(cfg, e.stores) + '・單筆滿 NT$' + num(e.minAmount) + ' 多送 ' + e.add + ' 點・' + dr(e.from, e.to);
  }
  function custText(cfg, it) {      // 客人在官方 LINE 看到的說明
    const e = it.e;
    if (it.type === 'game') { const cap = (cfg.gameDailyCap || 0) * (cfg.eventCapMult ? e.mult : 1); return '🎉 ' + e.title + '：' + daysTxt(e.days) + (e.from === '00:00' && e.to === '23:59' ? '整天' : ' ' + e.from + '～' + e.to) + '玩「' + gameTxt(e.game) + '」，換到的點數 ×' + e.mult + '！' + (e.dateFrom || e.dateTo ? '（' + (e.dateFrom ? md(e.dateFrom) : '即日起') + '～' + (e.dateTo ? md(e.dateTo) : '') + '）' : '') + (cap ? '活動期間每天遊戲最多可換 ' + Math.round(cap) + ' 點。' : ''); }
    if (it.type === 'store') return '🧾 ' + e.title + '：' + (e.from ? md(e.from) : '') + '～' + (e.to ? md(e.to) : '') + '在' + storeTxt(cfg, e.stores) + '消費，集點 ×' + e.mult + '！';
    return '➕ ' + e.title + '：' + (e.from ? md(e.from) : '') + '～' + (e.to ? md(e.to) : '') + '在' + storeTxt(cfg, e.stores) + '單筆消費滿 NT$' + num(e.minAmount) + '，多送 ' + e.add + ' 點！';
  }

  /* ---------- 成效 ---------- */
  function inWin(e, t) { const d = new Date(t), dk = K.dayKey(t), h = hm(t); return (e.days || []).indexOf(d.getDay()) >= 0 && h >= e.from && h <= e.to && (!e.dateFrom || dk >= e.dateFrom) && (!e.dateTo || dk <= e.dateTo); }
  function effect(D, it, rf, rt) {      // rf～rt：要看的日期（預設＝活動期間與近 30 天的交集）
    const e = it.e, [f0, t0] = span(it), td = today();
    let from = rf || (f0 && f0 > addD(td, -29) ? f0 : addD(td, -29)), to = rt || (t0 && t0 < td ? t0 : td); if (from > to) { const x = from; from = to; to = x; }
    const inr = (t) => { const d = K.dayKey(t); return d >= from && d <= to; }, nd = Math.round((new Date(to + 'T12:00:00') - new Date(from + 'T12:00:00')) / DAY) + 1;
    if (it.type === 'game') {
      const gs = e.game === 'all' ? ['fish', 'fly'] : [e.game], P = D.plays.filter((p) => gs.indexOf(p.game) >= 0 && !p.lbOnly && inr(p.t));
      const P1 = P.filter((p) => inWin(Object.assign({}, e, { dateFrom: '', dateTo: '' }), p.t)), P0 = P.filter((p) => P1.indexOf(p) < 0);
      const [h1, m1] = e.from.split(':').map(Number), [h2, m2] = e.to.split(':').map(Number), winH = Math.max(0.25, (h2 * 60 + m2 - h1 * 60 - m1 + 1) / 60);
      let wd = 0; for (let k = 0; k < nd; k++) { if ((e.days || []).indexOf(new Date(addD(from, k) + 'T12:00:00').getDay()) >= 0) wd++; }
      const hin = wd * winH, hout = Math.max(1, nd * 24 - hin), r1 = hin ? P1.length / hin : 0, r0 = P0.length / hout;
      const ppl = A.K ? Object.keys(P1.reduce((o, p) => (o[p.mid] = 1, o), {})).length : 0, boosted = P1.filter((p) => (p.mult || 1) > 1).length;
      const young = !P1.length && f0 && f0 >= addD(td, -1);      // 剛開始、還沒有資料：不要算成「成效比平常低」
      return { from, to, nd, kind: 'game', main: P1.length, mainL: '活動時段局數', ppl, pplL: '參與玩家', r1, r0, lift: young || P1.length + P0.length < 10 || hin < 6 ? null : r0 ? (r1 - r0) / r0 : null, thin: P1.length + P0.length < 10 || hin < 6, n0: P0.length, exact: D.plays.filter((p) => p.cp === e.id && inr(p.t)).length, boosted, liftL: '活動時段每小時局數 vs 平常', P1, hin };
    }
    const sids = e.stores && e.stores.length ? e.stores : null, ok = (x) => (x.type === 'store' || x.type === 'backfill') && (!sids || sids.indexOf(x.store) >= 0);
    const pf = addD(from, -nd), pt = addD(from, -1), inp = (t) => { const d = K.dayKey(t); return d >= pf && d <= pt; };
    const S1 = D.led.filter((x) => ok(x) && inr(x.t)), S0 = D.led.filter((x) => ok(x) && inp(x.t)), amt = (a) => a.reduce((n, x) => n + (x.amount || 0), 0), ppl = (a) => Object.keys(a.reduce((o, x) => (o[x.mid] = 1, o), {})).length;
    if (it.type === 'bonus') { const q1 = S1.filter((x) => (x.amount || 0) >= e.minAmount), q0 = S0.filter((x) => (x.amount || 0) >= e.minAmount), sh1 = S1.length ? q1.length / S1.length : 0, sh0 = S0.length ? q0.length / S0.length : 0;
      return { from, to, nd, pf, pt, kind: 'bonus', main: q1.length, mainL: '達門檻筆數', ppl: ppl(q1), pplL: '達門檻的人', extra: q1.length * e.add, sh1, sh0, exact: D.led.filter((x) => x.cpb === e.id && inr(x.t)).length, thin: S1.length < 5 || S0.length < 5, lift: S1.length < 5 || S0.length < 5 ? null : sh0 ? (sh1 - sh0) / sh0 : null, liftL: '達門檻比例 vs 前一段', avg1: S1.length ? amt(S1) / S1.length : 0, avg0: S0.length ? amt(S0) / S0.length : 0, S1, S0 }; }
    return { from, to, nd, pf, pt, kind: 'store', main: S1.length, mainL: '消費筆數', ppl: ppl(S1), pplL: '消費人數', amt1: amt(S1), amt0: amt(S0), n0: S0.length, exact: D.led.filter((x) => x.cp === e.id && inr(x.t)).length, thin: S1.length < 5 || S0.length < 5, lift: S1.length < 5 || S0.length < 5 ? null : amt(S0) ? (amt(S1) - amt(S0)) / amt(S0) : null, liftL: '消費金額 vs 前一段同長度', S1, S0 };
  }
  const liftTxt = (l) => l == null ? '<span class="muted">資料不足，暫不比較</span>' : '<b style="color:' + (l >= 0 ? '#1E8A4C' : '#C8442F') + '">' + (l >= 0 ? '▲ ' : '▼ ') + Math.abs(Math.round(l * 100)) + '%</b>';

  /* ====== 行銷活動（管理） ====== */
  V.campaigns = function (c, D) {
    const cfg = D.cfg, list = all(cfg), f = V.campaigns.f || 'all', q = (V.campaigns.q || '').trim();
    const sts = list.map((it) => Object.assign(it, { st: status(it) }));
    const grp = { all: sts.length, live: 0, armed: 0, sched: 0, ended: 0, off: 0 }; sts.forEach((it) => { grp[it.st[0]]++; });
    const show = sts.filter((it) => (f === 'all' || it.st[0] === f || (f === 'run' && (it.st[0] === 'live' || it.st[0] === 'armed'))) && (!q || (it.e.title || '').indexOf(q) >= 0));
    const order = { live: 0, armed: 1, sched: 2, off: 3, ended: 4 }; show.sort((a, b) => order[a.st[0]] - order[b.st[0]]);
    const F = [['all', '全部', grp.all], ['run', '進行中／已啟用', grp.live + grp.armed], ['sched', '排程中', grp.sched], ['off', '已關閉（草稿）', grp.off], ['ended', '已結束', grp.ended]];
    c.innerHTML += '<div class="cp-top"><div class="cp-f">' + F.map((x) => '<button class="btn ' + (f === x[0] ? '' : 'alt') + '" data-cf="' + x[0] + '">' + x[1] + '<span class="n">' + x[2] + '</span></button>').join('') + '</div><span class="sp"></span><input id="cpQ" placeholder="搜尋活動名稱" value="' + esc(q) + '"><button class="btn" id="cpNew">＋ 新增行銷活動</button></div>' +
      '<p class="small muted" style="margin:-4px 0 12px">三種活動都在這裡管理：🎮 遊戲點數加倍、🧾 消費集點加倍、➕ 消費滿額加點。同一時段有多個加倍活動時取倍數最高的一個；滿額加點同一筆只取加最多的一條。旅行帶回的點數與券在「🎉 活動設定」。</p>' +
      '<div class="cp-list">' + (show.length ? show.map((it) => { const ef = effect(D, it), id = it.type + ':' + it.i;
        return '<div class="cp-item' + (it.e.on ? '' : ' off') + '"><div class="cp-ic">' + TYPES[it.type].icon + '</div><div><div class="cp-t">' + esc(it.e.title || '（沒有名稱）') + '<span class="cp-st ' + it.st[0] + '">' + esc(it.st[1]) + '</span><span class="pill gr">' + TYPES[it.type].name + '</span></div><div class="cp-r">' + esc(rule(cfg, it)) + '</div>' + (it.e.memo ? '<div class="cp-m">🎯 目標：' + esc(it.e.memo) + '</div>' : '') + '</div>' +
          '<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;justify-content:flex-end"><div class="cp-kpi">' + ef.mainL + '<b>' + num(ef.main) + '</b>' + ef.liftL.split(' vs')[0] + ' ' + liftTxt(ef.lift) + '</div><div class="cp-a"><button class="cp-sw' + (it.e.on ? ' on' : '') + '" data-csw="' + id + '" title="' + (it.e.on ? '關閉' : '開啟') + '這個活動" aria-label="開關"></button><button class="btn alt" data-cfx="' + id + '">📈 成效</button><button class="btn alt" data-ced="' + id + '">編輯</button><button class="btn alt" data-ccp="' + id + '">複製</button><button class="btn alt" data-cdl="' + id + '">刪除</button></div></div></div>'; }).join('')
        : sts.length ? '<div class="card cp-empty"><b>沒有符合「' + esc(q || F.filter((x) => x[0] === f)[0][1]) + '」的活動</b><button class="btn" id="cpClr" style="margin-top:8px">清除搜尋與篩選，看全部 ' + sts.length + ' 個活動</button></div>' : '<div class="card cp-empty"><b>還沒有行銷活動</b>按右上角「＋ 新增行銷活動」，可以從範本開始，三步驟就建好。</div>') + '</div>';
    c.querySelectorAll('[data-cf]').forEach((b) => { b.onclick = () => { V.campaigns.f = b.dataset.cf; A.app(); }; });
    const qi = $('cpQ'); qi.onkeydown = (ev) => { if (ev.key === 'Enter') { V.campaigns.q = qi.value; A.app(); } };
    $('cpNew').onclick = () => wizard(null); if ($('cpClr')) $('cpClr').onclick = () => { V.campaigns.q = ''; V.campaigns.f = 'all'; A.app(); };
    const get = (id) => { const [t, i] = id.split(':'); return { type: t, i: +i, e: (K.cfg()[TYPES[t].key] || [])[+i] }; };
    c.querySelectorAll('[data-csw]').forEach((b) => { b.onclick = () => { const x = K.cfg(), it = get(b.dataset.csw), o = x[TYPES[it.type].key][it.i]; o.on = !o.on; K.saveCfg(x, '行銷活動「' + o.title + '」' + (o.on ? '開啟' : '關閉')); A.toast(o.on ? '已開啟：' + o.title : '已關閉：' + o.title); A.app(); }; });
    c.querySelectorAll('[data-ced]').forEach((b) => { b.onclick = () => wizard(get(b.dataset.ced)); });
    c.querySelectorAll('[data-cfx]').forEach((b) => { b.onclick = () => fxDrawer(A.data(), get(b.dataset.cfx)); });
    c.querySelectorAll('[data-ccp]').forEach((b) => { b.onclick = () => { const x = K.cfg(), it = get(b.dataset.ccp), arr = x[TYPES[it.type].key], o = JSON.parse(JSON.stringify(arr[it.i])); o.id = (it.type === 'game' ? 'ev' : it.type === 'store' ? 'se' : 'sb') + K.rid(4); o.title = o.title + '（複本）'; o.on = false; arr.push(o); K.saveCfg(x, '複製行銷活動「' + arr[it.i].title + '」'); A.toast('已複製成草稿（關閉中），請編輯日期後再開啟'); A.app(); wizard({ type: it.type, i: arr.length - 1, e: o }); }; });
    c.querySelectorAll('[data-cdl]').forEach((b) => { b.onclick = () => { if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = '確定刪除？'; b.style.background = '#C8442F'; b.style.color = '#fff'; b.style.borderColor = '#C8442F'; setTimeout(() => { if (b.isConnected) { b.dataset.sure = ''; b.textContent = '刪除'; b.style.cssText = ''; } }, 3500); return; }
      const x = K.cfg(), it = get(b.dataset.cdl), arr = x[TYPES[it.type].key], t = arr[it.i].title; arr.splice(it.i, 1); K.saveCfg(x, '刪除行銷活動「' + t + '」'); A.toast('已刪除：' + t); A.app(); }; });
  };

  /* ---------- 新增／編輯精靈 ---------- */
  function wizard(it) {
    const cfg = K.cfg(), edit = !!it, td = today();
    let type = it ? it.type : (V.campaigns.lastType || 'game');
    let e = it ? JSON.parse(JSON.stringify(it.e)) : null;
    const blank = (t) => t === 'game' ? { title: '', game: 'fish', days: [0, 6], from: '00:00', to: '23:59', dateFrom: td, dateTo: addD(td, 13), mult: 2, on: true, memo: '' }
      : t === 'store' ? { title: '', stores: [], from: td, to: addD(td, 6), mult: 2, on: true, memo: '' } : { title: '', stores: [], minAmount: 1000, add: 5, from: td, to: addD(td, 13), on: true, memo: '' };
    if (!e) e = blank(type);
    function render() {
      const T = TYPES[type], stores = cfg.stores || [];
      let h = '<h2 style="margin:0 0 4px">' + (edit ? '編輯行銷活動' : '＋ 新增行銷活動') + '</h2><p class="small muted" style="margin:0">設定存在後台規則裡，客人的官方 LINE 會即時套用；所有推播仍停用（D04），要讓客人知道可勾選「同時發一則公告」。</p>';
      h += '<div class="cp-step">① 活動類型</div><div class="cp-types">' + Object.keys(TYPES).map((k) => '<button class="cp-type' + (k === type ? ' on' : '') + '" data-ty="' + k + '"' + (edit && k !== type ? ' disabled style="opacity:.45;cursor:not-allowed"' : '') + '><div style="font-size:22px">' + TYPES[k].icon + '</div><b>' + TYPES[k].name + '</b><span>' + TYPES[k].desc + '</span></button>').join('') + '</div>';
      if (!edit) h += '<div class="cp-step">② 從範本開始（可略過）</div><div class="cp-tpl">' + TPL[type].map((t, i) => '<button class="btn alt sm" data-tp="' + i + '">' + t[0] + '</button>').join('') + '</div>';
      h += '<div class="cp-step">' + (edit ? '②' : '③') + ' 活動內容</div><div class="cp-form">';
      h += '<label>活動名稱</label><input id="w_title" value="' + esc(e.title) + '" placeholder="客人會看到，例如：週末捕魚加倍">';
      h += '<label>活動目標（內部）</label><input id="w_memo" value="' + esc(e.memo || '') + '" placeholder="例如：拉高週末下午人潮、清庫存（只有後台看得到）">';
      if (type === 'game') {
        h += '<label>哪個遊戲</label><select id="w_game">' + ['fish', 'fly', 'all'].map((g) => '<option value="' + g + '"' + (e.game === g ? ' selected' : '') + '>' + gameTxt(g) + '</option>').join('') + '</select>';
        h += '<label>星期</label><div><div class="cp-days">' + [1, 2, 3, 4, 5, 6, 0].map((d) => '<label class="' + (e.days.indexOf(d) >= 0 ? 'on' : '') + '"><input type="checkbox" data-wd="' + d + '"' + (e.days.indexOf(d) >= 0 ? ' checked' : '') + '>' + DW[d] + '</label>').join('') + '</div><div class="cp-tpl" style="margin-top:6px"><button class="btn alt sm" data-dq="0,1,2,3,4,5,6">每天</button><button class="btn alt sm" data-dq="1,2,3,4,5">平日</button><button class="btn alt sm" data-dq="0,6">週末</button></div></div>';
        h += '<label>每天時段</label><span><input type="time" id="w_from" value="' + e.from + '" style="width:120px"> ～ <input type="time" id="w_to" value="' + e.to + '" style="width:120px"> <button class="btn alt sm" id="w_allday">整天</button></span>';
        h += '<label>日期區間</label><span><input type="date" id="w_df" value="' + (e.dateFrom || '') + '"> ～ <input type="date" id="w_dt" value="' + (e.dateTo || '') + '"> <span class="small muted">空白＝不限</span></span>';
        h += '<label>點數倍數</label><span><input type="number" id="w_mult" min="1.1" max="5" step="0.1" value="' + e.mult + '" style="width:90px"> 倍　<span class="small muted">建議 1.5～3 倍</span></span>';
      } else {
        h += '<label>哪些店家</label><div class="cp-chk"><label><input type="checkbox" id="w_allst"' + (!e.stores.length ? ' checked' : '') + '>全館店家</label>' + stores.map((s) => '<label><input type="checkbox" data-ws="' + esc(s.id) + '"' + (e.stores.indexOf(s.id) >= 0 ? ' checked' : '') + '>' + esc(s.name.replace('東三東四 ', '')) + '</label>').join('') + '</div>';
        h += '<label>活動日期</label><span><input type="date" id="w_df" value="' + (e.from || '') + '"> ～ <input type="date" id="w_dt" value="' + (e.to || '') + '"></span>';
        if (type === 'store') h += '<label>集點倍數</label><span><input type="number" id="w_mult" min="1.1" max="5" step="0.1" value="' + e.mult + '" style="width:90px"> 倍</span>';
        else h += '<label>單筆滿</label><span>NT$ <input type="number" id="w_min" min="0" step="50" value="' + e.minAmount + '" style="width:110px"> 多送 <input type="number" id="w_add" min="1" max="50" value="' + e.add + '" style="width:70px"> 點</span>';
      }
      h += '</div><div class="cp-step">' + (edit ? '③' : '④') + ' 上線前檢查</div><ul class="cp-warn" id="w_chk"></ul>';
      h += '<div class="cp-step">' + (edit ? '④' : '⑤') + ' 客人會看到</div><div class="cp-prev" id="w_prev"></div>';
      h += '<div class="cp-form" style="margin-top:10px"><label>公告</label><label style="color:var(--ink);font-weight:600"><input type="checkbox" id="w_nt"> 同時新增一則公告草稿</label><div class="small muted full" style="margin-top:-4px">公告會出現在官方 LINE「活動」頁（客人自己打開才看得到，<b>不會推播</b>）。活動存成草稿時，公告也是關閉的；活動開啟時公告才一起開啟。</div></div>';
      h += '<div class="cp-foot">' + (edit ? '' : '<button class="btn alt" id="w_draft">存成草稿（先不開啟）</button>') + '<button class="btn" id="w_save">' + (edit ? '儲存變更' : '建立並開啟') + '</button></div>';
      A.drawer(h); wire();
    }
    function read() {
      const v = (id) => { const x = $(id); return x ? x.value : ''; };
      e.title = v('w_title').trim(); e.memo = v('w_memo').trim();
      if (type === 'game') { e.game = v('w_game'); e.days = [].filter.call(document.querySelectorAll('[data-wd]'), (x) => x.checked).map((x) => +x.dataset.wd); e.from = v('w_from') || '00:00'; e.to = v('w_to') || '23:59'; e.dateFrom = v('w_df'); e.dateTo = v('w_dt'); e.mult = Math.round(+v('w_mult') * 10) / 10; }
      else { e.stores = $('w_allst').checked ? [] : [].filter.call(document.querySelectorAll('[data-ws]'), (x) => x.checked).map((x) => x.dataset.ws); e.from = v('w_df'); e.to = v('w_dt'); if (type === 'store') e.mult = Math.round(+v('w_mult') * 10) / 10; else { e.minAmount = +v('w_min'); e.add = +v('w_add'); } }
    }
    function checks() {
      const L = [], c2 = K.cfg(), td2 = today(), [f, t] = type === 'game' ? [e.dateFrom, e.dateTo] : [e.from, e.to];
      if (!e.title) L.push(['e', '請填活動名稱（客人看得到）']);
      if (type === 'game') { if (!e.days.length) L.push(['e', '至少選一個星期']); if (e.from >= e.to) L.push(['e', '時段的結束要晚於開始']); if (!(e.mult > 1)) L.push(['e', '倍數要大於 1']); if (e.mult > 5) L.push(['e', '倍數最多 5 倍']); if (e.mult > 3) L.push(['w', '超過 3 倍，點數會發得很快，請確認贈品庫存夠']); }
      if (type === 'store') { if (!(e.mult > 1)) L.push(['e', '倍數要大於 1']); if (e.mult > 5) L.push(['e', '倍數最多 5 倍']); }
      if (type === 'bonus') { if (!(e.add >= 1)) L.push(['e', '多送點數至少 1 點']); if (e.minAmount < (c2.minSpend || 0)) L.push(['w', '門檻低於最低消費 NT$' + num(c2.minSpend) + '，低於最低消費的單本來就不集點']); }
      if (type !== 'game' && (!f || !t)) L.push(['e', '消費活動要設開始與結束日期']);
      if (f && t && f > t) L.push(['e', '結束日要在開始日之後']);
      if (t && t < td2) L.push(['w', '結束日已經過了，存了也不會生效']);
      if (type === 'game' && !f && !t) L.push(['w', '沒設日期＝一直有效，記得活動結束後關掉']);
      const cur = it ? (c2[TYPES[type].key] || [])[it.i] : null;
      const same = all(c2).filter((x) => x.type === type && x.e !== cur && x.e.on && (!it || x.i !== it.i));
      const ov = same.filter((x) => { const [a, b] = span(x); const o1 = !(t && a && a > t) && !(f && b && b < f); if (!o1) return false; if (type === 'game') return (x.e.game === e.game || x.e.game === 'all' || e.game === 'all') && x.e.days.some((d) => e.days.indexOf(d) >= 0) && !(x.e.to < e.from || x.e.from > e.to); return !(x.e.stores.length && e.stores.length && !x.e.stores.some((s) => e.stores.indexOf(s) >= 0)); });
      if (ov.length) L.push(['w', '跟「' + ov.map((x) => x.e.title).join('」「') + '」時間重疊：' + (type === 'bonus' ? '同一筆只取加最多的一條' : '同時段只取倍數最高的一個')]);
      if (type === 'game') L.push(['i', '每人每天遊戲最多 ' + num(c2.gameDailyCap || 0) + ' 點' + (c2.eventCapMult ? '，活動時上限跟著乘 ' + e.mult + ' 倍（' + num(Math.round((c2.gameDailyCap || 0) * e.mult)) + ' 點）' : '（活動時上限不變）') + '。']);
      const est = estimate(A.data(), type, e); if (est) L.push(['i', est]);
      if (!L.some((x) => x[0] === 'e')) L.unshift(['ok', '可以上線']);
      return L;
    }
    function refresh() { read(); const L = checks(); $('w_chk').innerHTML = L.map((x) => '<li class="' + x[0] + '">' + esc(x[1]) + '</li>').join(''); $('w_prev').textContent = custText(K.cfg(), { type, e }); $('w_save').disabled = L.some((x) => x[0] === 'e'); $('w_save').style.opacity = $('w_save').disabled ? .5 : 1; const d = $('w_draft'); if (d) { d.disabled = !e.title; } }
    function wire() {
      document.querySelectorAll('[data-ty]').forEach((b) => { b.onclick = () => { if (edit || b.dataset.ty === type) return; type = b.dataset.ty; V.campaigns.lastType = type; e = blank(type); render(); }; });
      document.querySelectorAll('[data-tp]').forEach((b) => { b.onclick = () => { const t = TPL[type][+b.dataset.tp][1]; e = Object.assign(blank(type), JSON.parse(JSON.stringify(t))); if (t.week) { e.dateFrom = today(); e.dateTo = addD(today(), 6); } if (t.len) { e.from = today(); e.to = addD(today(), t.len - 1); } delete e.week; delete e.len; render(); }; });
      document.querySelectorAll('[data-wd]').forEach((x) => { x.onchange = () => { x.parentNode.classList.toggle('on', x.checked); refresh(); }; });
      document.querySelectorAll('[data-dq]').forEach((b) => { b.onclick = () => { const s = b.dataset.dq.split(',').map(Number); document.querySelectorAll('[data-wd]').forEach((x) => { x.checked = s.indexOf(+x.dataset.wd) >= 0; x.parentNode.classList.toggle('on', x.checked); }); refresh(); }; });
      const ad = $('w_allday'); if (ad) ad.onclick = () => { $('w_from').value = '00:00'; $('w_to').value = '23:59'; refresh(); };
      const as = $('w_allst'); if (as) { as.onchange = () => { if (as.checked) document.querySelectorAll('[data-ws]').forEach((x) => { x.checked = false; }); refresh(); }; document.querySelectorAll('[data-ws]').forEach((x) => { x.onchange = () => { as.checked = ![].some.call(document.querySelectorAll('[data-ws]'), (y) => y.checked); refresh(); }; }); }
      document.querySelectorAll('#drawer input, #drawer select').forEach((x) => { if (!x.onchange) x.onchange = refresh; x.oninput = refresh; });
      $('w_save').onclick = () => save(true); const d = $('w_draft'); if (d) d.onclick = () => save(false);
      refresh();
    }
    function save(on) {
      read(); if (on && checks().some((x) => x[0] === 'e')) return;
      const x = K.cfg(), key = TYPES[type].key; x[key] = x[key] || [];
      if (!edit) { e.id = (type === 'game' ? 'ev' : type === 'store' ? 'se' : 'sb') + K.rid(4); e.on = on; e.created = Date.now(); x[key].push(e); } else { e.on = x[key][it.i].on; x[key][it.i] = e; }
      let nt = '';
      if ($('w_nt') && $('w_nt').checked) { x.notices = x.notices || []; x.notices.unshift({ id: 'n' + K.rid(4), title: e.title, body: custText(x, { type, e }).replace(/^\S+\s/, ''), from: type === 'game' ? (e.dateFrom || today()) : e.from, to: type === 'game' ? (e.dateTo || '') : e.to, pin: false, on: on, cp: e.id }); nt = '，並新增公告'; }
      K.saveCfg(x, (edit ? '編輯' : '新增') + '行銷活動「' + e.title + '」'); $('drawer').classList.remove('on');
      A.toast((edit ? '已儲存' : on ? '已建立並開啟' : '已存成草稿') + '：' + e.title + nt); V.campaigns.f = 'all'; A.go('campaigns');
    }
    render();
  }


  /* G94-B06：依過去 4 週推估活動會多發幾點（只供參考，不是上限；遊戲還會被每日上限擋住） */
  function estimate(D, type, e) {
    const now = Date.now(), from = now - 28 * DAY, td = today(), [f, t] = type === 'game' ? [e.dateFrom, e.dateTo] : [e.from, e.to];
    const days = f && t && t >= f ? Math.round((new Date(t + 'T12:00:00') - new Date(f + 'T12:00:00')) / DAY) + 1 : 7, per = days === 7 && !(f && t) ? '每週' : '整個活動（' + days + ' 天）';
    if (type === 'game') {
      const gs = e.game === 'all' ? ['fish', 'fly'] : [e.game], P = D.plays.filter((p) => p.t >= from && gs.indexOf(p.game) >= 0 && !p.lbOnly && p.counted !== false);
      if (!P.length) return '過去 4 週沒有這個遊戲的資料，還無法推估會多發幾點。';
      const inW = P.filter((p) => inWin(Object.assign({}, e, { dateFrom: '', dateTo: '' }), p.t)), share = inW.length / P.length;
      const gp = D.led.filter((x) => x.type === 'game' && x.t >= from && (e.game === 'all' || x.game === e.game)).reduce((n, x) => n + (x.pts || 0), 0);
      const extra = Math.round(gp * share * (e.mult - 1) / 28 * days), ppl = Object.keys(inW.reduce((o, p) => (o[p.mid] = 1, o), {})).length;
      return '推估（依過去 4 週）：' + per + '約多發 ' + num(extra) + ' 點，約 ' + Math.round(ppl / 28 * Math.min(days, 28)) + ' 人會碰到活動時段。只是參考，實際還會被每日上限擋住。';
    }
    const sids = e.stores && e.stores.length ? e.stores : null, S = D.led.filter((x) => (x.type === 'store' || x.type === 'backfill') && x.t >= from && (!sids || sids.indexOf(x.store) >= 0));
    if (!S.length) return '過去 4 週這些店家沒有集點資料，還無法推估。';
    if (type === 'store') { const pts = S.reduce((n, x) => n + (x.pts || 0), 0); return '推估（依過去 4 週）：' + per + '約多發 ' + num(Math.round(pts * (e.mult - 1) / 28 * days)) + ' 點（約 ' + num(Math.round(S.length / 28 * days)) + ' 筆消費）。只是參考。'; }
    const q = S.filter((x) => (x.amount || 0) >= e.minAmount).length; return '推估（依過去 4 週）：' + per + '約 ' + num(Math.round(q / 28 * days)) + ' 筆會達門檻（目前 ' + Math.round(q / S.length * 100) + '% 的單），多發約 ' + num(Math.round(q / 28 * days) * e.add) + ' 點。只是參考。';
  }
  /* ---------- 成效抽屜 ---------- */
  function fxDrawer(D, it) {
    const ui = window.__ADM_UI, ef = effect(D, it), cfg = D.cfg, days = []; for (let k = 0; k < ef.nd; k++) days.push(addD(ef.from, k));
    let h = '<h2 style="margin:0">📈 ' + esc(it.e.title) + '</h2><p class="small muted" style="margin:4px 0 12px">' + esc(rule(cfg, it)) + '<br>看的是 ' + md(ef.from) + '～' + md(ef.to) + '（' + ef.nd + ' 天）' + (ef.pf ? '，對照前一段 ' + md(ef.pf) + '～' + md(ef.pt) : '') + '</p>';
    const box = (l, v, s) => '<div class="akpi"><div class="l">' + l + '</div><div class="v">' + v + '</div>' + (s ? '<div class="s">' + s + '</div>' : '') + '</div>';
    if (ef.kind === 'game') {
      h += '<div class="akpis" style="grid-template-columns:repeat(3,1fr)">' + box(ef.mainL, num(ef.main), '其中加倍入帳 ' + num(ef.boosted) + ' 局') + box(ef.pplL, num(ef.ppl) + ' 人', '') + box('每小時局數', ef.r1.toFixed(2), '平常 ' + ef.r0.toFixed(2) + '（' + num(ef.n0) + ' 局／' + num(Math.round(ef.hin)) + ' 活動小時）・' + liftTxt(ef.lift)) + '</div>';
      const gs = it.e.game === 'all' ? ['fish', 'fly'] : [it.e.game], P = D.plays.filter((p) => gs.indexOf(p.game) >= 0 && !p.lbOnly);
      h += ui.card('每天局數：活動時段 vs 其他時段', ui.line([{ name: '活動時段', color: ui.C.orange, vals: days.map((d) => ef.P1.filter((p) => K.dayKey(p.t) === d).length) }, { name: '其他時段', color: ui.C.blue, vals: days.map((d) => P.filter((p) => K.dayKey(p.t) === d && ef.P1.indexOf(p) < 0).length) }], days.map(md), { h: 190 }));
      const hrs = new Array(24).fill(0); ef.P1.forEach((p) => { hrs[new Date(p.t).getHours()]++; });
      h += ui.card('活動時段裡，幾點最多人玩', ui.cols(hrs, hrs.map((_, i) => i + '時'), { unit: ' 局', color: ui.C.orange, h: 150 }));
    } else if (ef.kind === 'store') {
      h += '<div class="akpis" style="grid-template-columns:repeat(3,1fr)">' + box('消費金額', 'NT$ ' + num(ef.amt1), '前一段 NT$ ' + num(ef.amt0) + '・' + liftTxt(ef.lift)) + box(ef.mainL, num(ef.main), '前一段 ' + num(ef.n0) + ' 筆') + box(ef.pplL, num(ef.ppl) + ' 人', '') + '</div>';
      h += ui.card('每天消費金額', ui.line([{ name: '活動期間', color: ui.C.aqua, vals: days.map((d) => ef.S1.filter((x) => K.dayKey(x.t) === d).reduce((n, x) => n + (x.amount || 0), 0)) }, { name: '前一段（對齊天數）', color: ui.C.grid === '#E6ECEE' ? '#9AA9AE' : ui.C.blue, vals: days.map((d, k) => ef.S0.filter((x) => K.dayKey(x.t) === addD(ef.pf, k)).reduce((n, x) => n + (x.amount || 0), 0)) }], days.map(md), { h: 190 }));
    } else {
      h += '<div class="akpis" style="grid-template-columns:repeat(3,1fr)">' + box(ef.mainL, num(ef.main), '多送 ' + num(ef.extra) + ' 點') + box('達門檻比例', Math.round(ef.sh1 * 100) + '%', '前一段 ' + Math.round(ef.sh0 * 100) + '%・' + liftTxt(ef.lift)) + box('平均客單價', 'NT$ ' + num(Math.round(ef.avg1)), '前一段 NT$ ' + num(Math.round(ef.avg0))) + '</div>';
      const B = [0, 300, 500, 800, 1000, 1500, 2000], lab = B.map((b, i) => i < B.length - 1 ? b + '–' + (B[i + 1] - 1) : b + '+'), bin = (a) => B.map((b, i) => a.filter((x) => (x.amount || 0) >= b && (i === B.length - 1 || (x.amount || 0) < B[i + 1])).length);
      h += ui.card('每筆消費金額分布（活動期間）', ui.cols(bin(ef.S1), lab, { unit: ' 筆', color: ui.C.aqua, h: 160 }), { hint: '門檻 NT$' + num(it.e.minAmount) + '：想讓更多單跨過門檻，可以把門檻設在最多單的區間上面一點' });
    }
    h += '<p class="small" style="margin:6px 0">🏷️ 入帳時有記下「套用這個活動」的：<b>' + num(ef.exact || 0) + '</b> ' + (ef.kind === 'game' ? '局' : '筆') + '<span class="muted">（2026/10/20 起的新紀錄才有；之前的資料只能用時段／期間觀察）</span></p>';
    h += '<p class="small muted">成效是用後台現有資料估算：遊戲活動比「活動時段」與「其他時段」每小時局數；消費活動比活動期間與前一段同樣天數。天數少、人少時數字會跳動，當參考就好。</p>';
    A.drawer(h);
  }

  /* ====== 分析：活動成效 ====== */
  V.a_campaign = function (c, D) {
    const ui = window.__ADM_UI, rg = ui.range(D), cfg = D.cfg;
    const L = all(cfg).filter((it) => { const [f, t] = span(it); return it.e.on || it.e.created || f || t; }).map((it) => { const [f, t] = span(it); const from = f && f > rg.from ? f : rg.from, to = t && t < rg.to ? t : rg.to; return Object.assign(it, { act: from <= to, ef: from <= to ? effect(D, it, from, to) : null, st: status(it) }); });
    const act = L.filter((x) => x.act && x.e.on);
    const boosted = act.filter((x) => x.ef.kind === 'game').reduce((n, x) => n + x.ef.boosted, 0), gplay = act.filter((x) => x.ef.kind === 'game').reduce((n, x) => n + x.ef.main, 0);
    const amt = act.filter((x) => x.ef.kind === 'store').reduce((n, x) => n + x.ef.amt1, 0), extra = act.filter((x) => x.ef.kind === 'bonus').reduce((n, x) => n + x.ef.extra, 0);
    const best = act.filter((x) => x.ef.lift != null && x.ef.lift > 0).sort((a, b) => b.ef.lift - a.ef.lift)[0], thin = act.filter((x) => x.ef.lift == null).length;      // G95-R02：資料不夠的不排名次、不給建議
    c.innerHTML += ui.rangeBar(D, rg) + '<div class="akpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">' + ui.kpi('期間內生效的活動', num(act.length) + ' 個', null, null, L.filter((x) => x.st[0] === 'live').length + ' 個正在進行') + ui.kpi('活動時段遊戲局數', num(gplay), null, null, '其中加倍入帳 ' + num(boosted) + ' 局', 'a_game') + ui.kpi('加倍期間消費金額', 'NT$ ' + num(amt), null, null, '消費集點加倍活動合計', 'a_store') + ui.kpi('滿額加點多送', num(extra) + ' 點', null, null, '達門檻筆數 × 加點') + '</div>' +
      (act.length ? ui.card('📝 重點', '<ul class="ainsight">' + (best ? '<li>這段期間觀察到最明顯的是「<b>' + esc(best.e.title) + '</b>」：' + esc(best.ef.liftL) + ' ' + liftTxt(best.ef.lift) + '（是觀察到的差異，不代表一定是活動造成的）。</li>' : '') + (act.filter((x) => x.ef.lift != null && x.ef.lift < -0.2).length ? '<li>有 ' + act.filter((x) => x.ef.lift != null && x.ef.lift < -0.2).length + ' 個活動的數字比平常低，可以點「看成效」看看是不是時段或倍數不合適。</li>' : '') + (thin ? '<li>' + thin + ' 個活動資料還太少（局數或筆數不到門檻），先不比較、不排名。</li>' : '') + '<li>要新增或調整活動請到「🎯 行銷活動」。</li></ul>') : '') +
      ui.card('🎯 活動成效排行（期間內）', act.length ? '<div class="scroll"><table class="tbl"><tr><th>活動</th><th>類型</th><th>狀態</th><th style="text-align:right">主要數字</th><th style="text-align:right">參與人數</th><th>比較</th><th></th></tr>' + act.sort((a, b) => (b.ef.lift == null ? -9 : b.ef.lift) - (a.ef.lift == null ? -9 : a.ef.lift)).map((x) => '<tr><td><b>' + esc(x.e.title) + '</b><div class="small muted">' + esc(rule(cfg, x)) + '</div></td><td>' + TYPES[x.type].icon + ' ' + TYPES[x.type].name + '</td><td><span class="cp-st ' + x.st[0] + '">' + esc(x.st[1]) + '</span></td><td style="text-align:right">' + esc(x.ef.mainL) + ' <b>' + num(x.ef.main) + '</b></td><td style="text-align:right">' + num(x.ef.ppl) + '</td><td style="white-space:normal;min-width:150px">' + liftTxt(x.ef.lift) + '<div class="small muted">' + esc(x.ef.liftL) + '</div></td><td><button class="btn alt sm" data-cfx2="' + x.type + ':' + x.i + '">看成效</button></td></tr>').join('') + '</table></div>' : '<p class="muted small">這段期間沒有生效的活動。到「🎯 行銷活動」新增一個吧。</p>', { right: '<button class="btn sm" id="toCp">🎯 管理行銷活動</button>' });
    ui.wireRange(c);
    c.querySelectorAll('[data-cfx2]').forEach((b) => { b.onclick = () => { const [t, i] = b.dataset.cfx2.split(':'); fxDrawer(A.data(), { type: t, i: +i, e: K.cfg()[TYPES[t].key][+i] }); }; });
    const tc = $('toCp'); if (tc) tc.onclick = () => A.go('campaigns');
  };

  /* 營運總覽也看得到正在進行的活動（給 analytics.js 呼叫） */
  window.__ADM_CP = { effect: (D, it, f, t) => effect(D, it, f, t), all: (cfg) => all(cfg), live: (D) => all(D.cfg).map((it) => Object.assign(it, { st: status(it) })).filter((it) => it.st[0] === 'live' || it.st[0] === 'armed' || it.st[0] === 'sched'), rule: (cfg, it) => rule(cfg, it) };

  A.addNav('內容', ['campaigns', '🎯 行銷活動'], 0);
  A.addNav('分析', ['a_campaign', '🎯 活動成效'], 1);
});
