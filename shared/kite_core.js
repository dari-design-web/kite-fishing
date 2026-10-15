/* 小鳶來港 共用資料層 v1（工作單 23，D71）
   原型版：所有資料存在「這支手機／這台電腦」的瀏覽器裡（localStorage）。
   之後接雲端資料庫（Firebase／Supabase，待 Dari 決定）時，只要換掉這個檔案裡的 load／save，畫面不用重做。
   數值都是建議預設，後台可以改。 */
(function (G) {
  'use strict';
  var K_CFG = 'kiteAdminCfg1', K_MEM = 'kiteMember1', K_STORE = 'kiteStoreTx1', K_DESK = 'kiteDeskLog1', K_IMP = 'kiteImported1', K_AUDIT = 'kiteAudit1';

  /* ====== 預設設定（後台可改） ====== */
  var DEFAULTS = {
    v: 1,
    scorePerPoint: 1000,          // 遊戲分數多少分換 1 點
    gameScorePerPoint: {},        // 個別遊戲覆寫，例如 { fish: 500 }
    triesPerLevel: 1,             // 每關每天幾次算分（超過還能玩，只是不算分）
    gameTries: {},                // 個別遊戲覆寫，例如 { fly: 2 }
    spendPerPoint: 100,           // 消費多少元換 1 點
    minSpend: 1,                  // 最低消費金額才給點
    maxStorePointsPerDay: 100,    // 每人每天最多從消費拿幾點（防誤刷）
    qrExpireMin: 10,              // 集點 QR 幾分鐘內有效
    redeemExpireMin: 30,          // 兌換 QR 幾分鐘內有效
    pointsExpireDays: 365,        // 點數有效天數（0＝不過期）
    events: [                     // 每日活動：某遊戲在某時段分數加倍
      { id: 'ev1', game: 'fish', title: '週末捕魚加倍', days: [0, 6], from: '00:00', to: '23:59', mult: 2, on: true },
      { id: 'ev2', game: 'fly', title: '傍晚飛行加倍', days: [0, 1, 2, 3, 4, 5, 6], from: '16:00', to: '19:00', mult: 1.5, on: true }
    ],
    prizes: [
      { id: 'P01', name: '小鳶貼紙一張', points: 5, stock: 200, on: true },
      { id: 'P02', name: '鯨鯊鑰匙圈', points: 30, stock: 50, on: true },
      { id: 'P03', name: '小鳶帆布袋', points: 80, stock: 20, on: true },
      { id: 'P04', name: '港邊特製便當兌換券', points: 15, stock: 100, on: true }
    ],
    stores: [
      { id: 'S01', name: '東三東四 一樓咖啡', pin: '1111', key: 's01-demo-key', on: true },
      { id: 'S02', name: '東三東四 港邊小吃', pin: '2222', key: 's02-demo-key', on: true },
      { id: 'S03', name: '東三東四 文創選物', pin: '3333', key: 's03-demo-key', on: true }
    ],
    deskPin: '0000',
    redeemKey: 'desk-demo-key',
    notice: '原型測試中：點數只存在這支手機，不是正式點數。',
    admin: { user: 'dari', pass: '1677' }   // 原型：寫在網頁裡不安全，正式版要放到雲端驗證
  };
  var GAMES = {
    fish: { name: '小鳶捕魚', levels: { morning: '清晨場', day: '白天場', dusk: '黃昏場', night: '夜晚場' } },
    fly: { name: '飛行冒險', levels: { '1': '第 1 關', '2': '第 2 關', '3': '第 3 關', '4': '第 4 關' } },
    travel: { name: '小鳶去旅行', levels: {} },
    photo: { name: '小鳶合照館', levels: {} },
    stamp: { name: '港灣蓋章散步', levels: {} }
  };

  function rd(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function wr(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey(t) { var d = new Date(t || Date.now()); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function rid(n) { var s = '', c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; for (var i = 0; i < (n || 6); i++) s += c[Math.floor(Math.random() * c.length)]; return s; }

  /* ====== SHA-256／HMAC（純 JS，沒網路、file:// 也能用） ====== */
  function sha256(bytes) {
    var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var l = bytes.length, m = bytes.slice(); m.push(0x80); while (m.length % 64 !== 56) m.push(0);
    var bits = l * 8; for (var i = 7; i >= 0; i--) m.push(i >= 4 ? 0 : (bits >>> (i * 8)) & 255);
    var w = new Array(64);
    for (var o = 0; o < m.length; o += 64) {
      for (var j = 0; j < 16; j++) w[j] = (m[o + j * 4] << 24) | (m[o + j * 4 + 1] << 16) | (m[o + j * 4 + 2] << 8) | m[o + j * 4 + 3];
      for (j = 16; j < 64; j++) { var a0 = w[j - 15], a1 = w[j - 2]; var s0 = ((a0 >>> 7) | (a0 << 25)) ^ ((a0 >>> 18) | (a0 << 14)) ^ (a0 >>> 3), s1 = ((a1 >>> 17) | (a1 << 15)) ^ ((a1 >>> 19) | (a1 << 13)) ^ (a1 >>> 10); w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0; }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (j = 0; j < 64; j++) {
        var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7)), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + K[j] + w[j]) | 0;
        var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10)), mj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + mj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    var out = []; for (i = 0; i < 8; i++) out.push((H[i] >>> 24) & 255, (H[i] >>> 16) & 255, (H[i] >>> 8) & 255, H[i] & 255); return out;
  }
  function utf8(s) { return Array.prototype.slice.call(unescape(encodeURIComponent(s))).map(function (c) { return c.charCodeAt(0); }); }
  function hmac(key, msg) {
    var k = utf8(key); if (k.length > 64) k = sha256(k); while (k.length < 64) k.push(0);
    var ip = k.map(function (x) { return x ^ 0x36; }), op = k.map(function (x) { return x ^ 0x5c; });
    var hx = sha256(op.concat(sha256(ip.concat(utf8(msg))))); return hx.slice(0, 6).map(function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join('').toUpperCase();
  }

  /* ====== 設定 ====== */
  function cfg() { var c = rd(K_CFG); var d = clone(DEFAULTS); if (!c) return d; for (var k in c) d[k] = c[k]; return d; }
  function saveCfg(c, why) { wr(K_CFG, c); audit('改設定' + (why ? '：' + why : '')); }
  function resetCfg() { localStorage.removeItem(K_CFG); audit('設定還原成預設'); }
  function audit(what) { var a = rd(K_AUDIT) || []; a.unshift({ t: Date.now(), what: what }); wr(K_AUDIT, a.slice(0, 300)); }

  /* ====== 會員（這支手機的客人） ====== */
  function member() {
    var m = rd(K_MEM);
    if (!m) { m = { id: 'M' + rid(6), name: '', created: Date.now(), points: 0, scoreBank: {}, ledger: [], nonces: [], plays: [], tries: {}, redeems: [], visits: [] }; wr(K_MEM, m); }
    var today = dayKey(); if (m.visits[m.visits.length - 1] !== today) { m.visits.push(today); m.visits = m.visits.slice(-120); wr(K_MEM, m); }
    return m;
  }
  function saveMember(m) { wr(K_MEM, m); }
  function addLedger(m, e) { e.t = e.t || Date.now(); m.ledger.unshift(e); m.ledger = m.ledger.slice(0, 500); m.points = Math.max(0, (m.points || 0) + e.pts); }
  function storePointsToday(m) { var d = dayKey(), s = 0; m.ledger.forEach(function (e) { if (e.type === 'store' && dayKey(e.t) === d) s += e.pts; }); return s; }

  /* ====== 店家集點 QR ======
     格式：KITE1|E|店家|金額|點數|時間(36進位)|一次性編號|簽章
     沒網路也能用：店家端自己算簽章，客人端自己驗；同一個編號只能用一次，超過時間就失效。 */
  function storeById(id) { return cfg().stores.filter(function (s) { return s.id === id; })[0]; }
  function pointsForSpend(amount) { var c = cfg(); if (amount < c.minSpend) return 0; return Math.floor(amount / c.spendPerPoint); }
  function makeEarnCode(storeId, amount) {
    var s = storeById(storeId); if (!s) throw new Error('沒有這個店家');
    var pts = pointsForSpend(amount), ts = Date.now().toString(36), nonce = rid(8);
    var body = ['KITE1', 'E', storeId, amount, pts, ts, nonce].join('|'), code = body + '|' + hmac(s.key, body);
    var log = rd(K_STORE) || []; log.unshift({ t: Date.now(), store: storeId, amount: amount, pts: pts, nonce: nonce, code: code, synced: false }); wr(K_STORE, log.slice(0, 1000));
    return { code: code, pts: pts, nonce: nonce };
  }
  function parse(code) { var p = String(code || '').trim().split('|'); return p[0] === 'KITE1' ? p : null; }
  function claimEarn(code) {
    var p = parse(code); if (!p || p[1] !== 'E' || p.length !== 8) return { ok: false, msg: '這不是小鳶來港的集點 QR' };
    var c = cfg(), s = storeById(p[2]); if (!s || s.on === false) return { ok: false, msg: '找不到這個店家' };
    if (hmac(s.key, p.slice(0, 7).join('|')) !== p[7]) return { ok: false, msg: 'QR 驗證失敗（可能被改過）' };
    var t = parseInt(p[5], 36); if (Date.now() - t > c.qrExpireMin * 60000) return { ok: false, msg: '這張 QR 已經超過 ' + c.qrExpireMin + ' 分鐘，請店家重新產生' };
    var m = member(); if (m.nonces.indexOf(p[6]) >= 0) return { ok: false, msg: '這張 QR 已經集過點了' };
    var pts = +p[4], room = c.maxStorePointsPerDay - storePointsToday(m), give = Math.max(0, Math.min(pts, room));
    m.nonces.push(p[6]); m.nonces = m.nonces.slice(-500);
    addLedger(m, { type: 'store', pts: give, store: s.id, storeName: s.name, amount: +p[3], ref: p[6] }); saveMember(m);
    return { ok: true, pts: give, capped: give < pts, store: s.name, amount: +p[3], total: m.points };
  }

  /* ====== 遊戲分數 ====== */
  function eventMult(game, t) {
    var d = new Date(t || Date.now()), hm = pad(d.getHours()) + ':' + pad(d.getMinutes()), best = 1, title = '';
    cfg().events.forEach(function (e) { if (e.on && e.game === game && e.days.indexOf(d.getDay()) >= 0 && hm >= e.from && hm <= e.to && e.mult > best) { best = e.mult; title = e.title; } });
    return { mult: best, title: title };
  }
  function triesLeft(game, level) { var c = cfg(), m = member(), k = dayKey() + '|' + game + '|' + level, n = c.gameTries[game] != null ? c.gameTries[game] : c.triesPerLevel; return Math.max(0, n - ((m.tries || {})[k] || 0)); }
  function reportPlay(o) {      // o = { game, level, score, sec }
    var m = member(), k = dayKey() + '|' + o.game + '|' + o.level; m.tries = m.tries || {};
    var counted = triesLeft(o.game, o.level) > 0, ev = eventMult(o.game), add = counted ? Math.round((o.score || 0) * ev.mult) : 0;
    m.tries[k] = (m.tries[k] || 0) + 1;
    m.plays.unshift({ t: Date.now(), game: o.game, level: String(o.level), score: o.score || 0, sec: Math.round(o.sec || 0), counted: counted, mult: ev.mult, bank: add }); m.plays = m.plays.slice(0, 800);
    m.scoreBank[o.game] = (m.scoreBank[o.game] || 0) + add; saveMember(m);
    return { counted: counted, add: add, mult: ev.mult, event: ev.title, bank: m.scoreBank[o.game], left: triesLeft(o.game, o.level) };
  }
  function perPoint(game) { var c = cfg(); return c.gameScorePerPoint[game] || c.scorePerPoint; }
  function convertScore(game) {      // 分數存摺換點：每滿 perPoint 分換 1 點，零頭留著
    var m = member(), per = perPoint(game), bank = m.scoreBank[game] || 0, pts = Math.floor(bank / per); if (pts <= 0) return { ok: false, msg: '還差 ' + (per - bank) + ' 分才能換 1 點' };
    m.scoreBank[game] = bank - pts * per; addLedger(m, { type: 'game', pts: pts, game: game, used: pts * per }); saveMember(m); return { ok: true, pts: pts, total: m.points };
  }

  /* ====== 兌換 ======
     客人在手機選贈品 → 先扣點，產生兌換 QR → 服務台掃描確認發放。
     格式：KITE1|R|會員|贈品|點數|時間|兌換碼|簽章 */
  function prizeById(id) { return cfg().prizes.filter(function (p) { return p.id === id; })[0]; }
  function issuedCount(pid) { var n = 0; (rd(K_DESK) || []).forEach(function (r) { if (r.prize === pid) n++; }); return n; }
  function stockLeft(pid) { var p = prizeById(pid); return p ? Math.max(0, p.stock - issuedCount(pid)) : 0; }
  function makeRedeem(pid) {
    var p = prizeById(pid), m = member(); if (!p || p.on === false) return { ok: false, msg: '這個贈品目前不能換' };
    if (stockLeft(pid) <= 0) return { ok: false, msg: '這個贈品換完了' };
    if (m.points < p.points) return { ok: false, msg: '點數不夠，還差 ' + (p.points - m.points) + ' 點' };
    var rcode = rid(6), ts = Date.now().toString(36), body = ['KITE1', 'R', m.id, p.id, p.points, ts, rcode].join('|'), code = body + '|' + hmac(cfg().redeemKey, body);
    addLedger(m, { type: 'redeem', pts: -p.points, prize: p.id, prizeName: p.name, ref: rcode });
    m.redeems.unshift({ id: rcode, prize: p.id, name: p.name, pts: p.points, t: Date.now(), code: code, status: 'wait' }); saveMember(m);
    return { ok: true, code: code, rcode: rcode, prize: p, total: m.points };
  }
  function cancelRedeem(rcode) {
    var m = member(), r = m.redeems.filter(function (x) { return x.id === rcode; })[0]; if (!r || r.status !== 'wait') return false;
    r.status = 'cancel'; addLedger(m, { type: 'refund', pts: r.pts, prize: r.prize, prizeName: r.name, ref: rcode }); saveMember(m); return true;
  }
  function deskCheck(code) {
    var p = parse(code), c = cfg(); if (!p || p[1] !== 'R' || p.length !== 8) return { ok: false, msg: '這不是兌換 QR' };
    if (hmac(c.redeemKey, p.slice(0, 7).join('|')) !== p[7]) return { ok: false, msg: 'QR 驗證失敗（可能被改過）' };
    var pr = prizeById(p[3]); if (!pr) return { ok: false, msg: '找不到這個贈品' };
    var log = rd(K_DESK) || []; if (log.some(function (r) { return r.rcode === p[6]; })) return { ok: false, msg: '這張兌換單已經領過了' };
    var t = parseInt(p[5], 36), late = Date.now() - t > c.redeemExpireMin * 60000;
    return { ok: true, member: p[2], prize: pr, pts: +p[4], rcode: p[6], t: t, late: late, stock: stockLeft(pr.id) };
  }
  function deskGive(code, staff) {
    var r = deskCheck(code); if (!r.ok) return r; if (r.stock <= 0) return { ok: false, msg: '庫存沒了' };
    var log = rd(K_DESK) || []; log.unshift({ t: Date.now(), rcode: r.rcode, member: r.member, prize: r.prize.id, prizeName: r.prize.name, pts: r.pts, staff: staff || '' }); wr(K_DESK, log);
    var m = rd(K_MEM); if (m && m.id === r.member) { m.redeems.forEach(function (x) { if (x.id === r.rcode) x.status = 'done'; }); wr(K_MEM, m); }      // 同一支手機測試時直接更新客人那邊
    return { ok: true, prize: r.prize, rcode: r.rcode };
  }

  /* ====== 統計（後台）：這支手機的客人＋匯入的其他手機資料 ====== */
  function allMembers() { var a = (rd(K_IMP) || []).slice(), m = rd(K_MEM); if (m && !a.some(function (x) { return x.id === m.id; })) a.unshift(m); return a; }
  function importMembers(list) { var a = rd(K_IMP) || []; list.forEach(function (m) { a = a.filter(function (x) { return x.id !== m.id; }); a.push(m); }); wr(K_IMP, a); audit('匯入 ' + list.length + ' 位客人的資料'); }
  function exportMe() { return JSON.stringify(member()); }

  G.KiteCore = {
    DEFAULTS: DEFAULTS, GAMES: GAMES, cfg: cfg, saveCfg: saveCfg, resetCfg: resetCfg, audit: audit, auditLog: function () { return rd(K_AUDIT) || []; },
    member: member, saveMember: saveMember, dayKey: dayKey, rid: rid, hmac: hmac, sha256: sha256, utf8: utf8,
    pointsForSpend: pointsForSpend, makeEarnCode: makeEarnCode, claimEarn: claimEarn, storeLog: function () { return rd(K_STORE) || []; }, storeById: storeById,
    eventMult: eventMult, triesLeft: triesLeft, reportPlay: reportPlay, perPoint: perPoint, convertScore: convertScore,
    prizeById: prizeById, stockLeft: stockLeft, makeRedeem: makeRedeem, cancelRedeem: cancelRedeem, deskCheck: deskCheck, deskGive: deskGive, deskLog: function () { return rd(K_DESK) || []; },
    allMembers: allMembers, importMembers: importMembers, exportMe: exportMe
  };
})(window);
