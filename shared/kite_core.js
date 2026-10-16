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
    /* D97／D98（10/17）：遊戲改成「當天所有遊戲累計總分」照階梯換點，每天最多 gameDailyCap 點，自動入帳（不用再到分數存摺換）。
       階梯是 [累計總分門檻, 點數]；機器人實測一天上限約 44,000 分（捕魚 3 場約 33,000＋飛行 4 關約 10,600），所以 10 點要 30,000 分（數字待 Claude×ChatGPT 定案） */
    gamePointMode: 'tier',        // 'tier'＝每日累計階梯（D97）；'bank'＝舊的分數存摺（每 scorePerPoint 分換 1 點）
    gameTiers: [[1500, 1], [3000, 2], [4500, 3], [6000, 4], [8000, 5], [10000, 6], [13000, 7], [17000, 8], [22000, 9], [30000, 10]],
    gameDailyCap: 10,             // 每天遊戲最多拿幾點（活動倍數會一起乘）
    scorePerPoint: 1000,          // 舊制（bank）：遊戲分數多少分換 1 點
    gameScorePerPoint: {},        // 個別遊戲覆寫，例如 { fish: 500 }
    triesPerLevel: 1,             // 每關每天幾次算分（超過還能玩，只是不算分）
    gameTries: {},                // 個別遊戲覆寫，例如 { fly: 2 }
    spendPerPoint: 100,           // 消費多少元換 1 點
    minSpend: 100,                // 最低消費門檻 T：單筆未滿不給點，遇到加倍活動也一樣（工作單 01 v5；U-35 暫採）
    maxStorePointsPerDay: 100,    // 每人每天最多從消費拿幾點（防誤刷）
    qrExpireMin: 3,               // 集點 QR 產生後幾分鐘內要按「領取」（工作單 01 v5、D54：3 分鐘；逾時由店員對同一筆交易重新出碼）
    reissueMax: 3,                // 同一筆交易最多重新出碼幾次
    redeemExpireMin: 30,          // 兌換 QR 幾分鐘內有效
    pointsExpireDays: 365,        // 點數有效天數（expireMode=days 時用；0＝不過期）
    pointsExpireMonths: 12,       // 點數有效月數（expireMode=months 時用；工作單 01 v5：取得後 12 個月、先到期先扣）
    events: [                     // 遊戲活動：某遊戲（或 all＝全部遊戲）在某些星期、時段、日期區間點數加倍（D98：階梯制下乘在「點數」上，當天上限也一起乘）
      { id: 'ev1', game: 'fish', title: '週末捕魚加倍', days: [0, 6], from: '00:00', to: '23:59', dateFrom: '', dateTo: '', mult: 2, on: true },
      { id: 'ev2', game: 'fly', title: '傍晚飛行加倍', days: [0, 1, 2, 3, 4, 5, 6], from: '16:00', to: '19:00', dateFrom: '', dateTo: '', mult: 1.5, on: true }
    ],
    /* D97：消費滿額加點（期間、店家可選；同一筆只取加最多的一條；最低消費門檻照舊） */
    storeBonus: [ { id: 'sb1', title: '單筆滿 1,000 元加 5 點', stores: [], minAmount: 1000, add: 5, from: '', to: '', on: false } ],
    /* D98：小鳶去旅行回家時，偶爾帶回點數（依這趟帶的便當決定機率）；每人每月從旅行最多拿 monthCap 點 */
    travelGift: { on: true, monthCap: 20, chance: { walk: 0, rice: 0.1, far: 0.2, squid: 0.25, hair: 0.3, special: 0.4 }, dist: [[1, 45], [2, 25], [3, 15], [4, 10], [5, 5]] },
    /* D98：小鳶帶回的券（折扣券、抵用券；後台設定），放進 LINE「我的兌換 → 我的券」，到店出示 QR 由店員核銷 */
    coupons: [ { id: 'C01', name: '港邊咖啡折 20 元（示範）', store: '', desc: '示範券：正式內容、店家與張數由後台設定', chance: 0.08, monthQty: 50, validDays: 14, on: true } ],
    prizes: [
      { id: 'P01', name: '小鳶貼紙一張', points: 5, stock: 200, on: true, desc: '小鳶揮手款防水貼紙，可以貼在水壺或手機殼。' },
      { id: 'P02', name: '鯨鯊鑰匙圈', points: 30, stock: 50, on: true, desc: '港口的鯨鯊朋友，壓克力雙面印刷。' },
      { id: 'P03', name: '小鳶帆布袋', points: 80, stock: 20, on: true, desc: '厚帆布托特包，A4 放得下，逛港口剛好。' },
      { id: 'P04', name: '合作餐飲兌換券', points: 15, stock: 100, on: true, desc: '到館內合作餐飲出示兌換券，換一份港邊餐點（和小鳶去旅行的「港邊特製便當」不同）。' }
    ],
    stores: [
      { id: 'S01', name: '東三東四 一樓咖啡', pin: '1111', key: 's01-demo-key', on: true },
      { id: 'S02', name: '東三東四 港邊小吃', pin: '2222', key: 's02-demo-key', on: true },
      { id: 'S03', name: '東三東四 文創選物', pin: '3333', key: 's03-demo-key', on: true }
    ],
    deskPin: '0000',
    redeemKey: 'desk-demo-key',
    notice: '原型測試中：點數只存在這支手機，不是正式點數。',
    admin: { user: 'dari', pass: '1677' },  // 原型：寫在網頁裡不安全，正式版要放到雲端驗證
    /* v2（工作單 24，D73）後台新增的規則 */
    expireMode: 'months',         // months＝取得後幾個月（預設，照工作單 01 v5）；days＝取得後幾天；year＝每年底歸零；never＝不過期
    deskPlace: '一樓服務台',      // D84：客人兌換單上寫的領取地點（後台規則可改）
    deskHours: '每天 10:00～22:00', // D84：服務台領取時間（示意，待 Dari 確認）
    redeemHoldDays: 14,           // 兌換單幾天沒領自動取消、退點並釋回保留庫存（工作單 01 v5：14 天；U-36 待 Dari）
    /* D80（10/15）：小鳶去旅行的便當全部改用點數換（虛擬商品：直接進便當盒，不佔實體庫存、不用服務台）；散步、每天一份飯糰仍免費 */
    bentos: [
      { id: 'far', name: '遠行便當', points: 3, on: true, desc: '可以去近、中、遠的地方，旅行 5 小時。' },
      { id: 'squid', name: '小卷便當', points: 5, on: true, desc: '近、中、遠都能去，3 小時就回來。' },
      { id: 'hair', name: '白帶魚便當', points: 8, on: true, desc: '近、中、遠，5 小時，一定帶紀念品回來。' },
      { id: 'special', name: '港邊特製便當', points: 12, on: true, desc: '唯一能去最遠的九份，8 小時，一定帶紀念品。' }
    ],
    bentoPerDay: 1,               // 每種便當每天最多換幾份
    bentoHoldMax: 3,              // 便當盒裡同一種最多放幾份（滿了不能換、不扣點）
    redeemPerDay: 3,              // 每人每天最多兌換幾次
    games: {                      // 遊戲開關與防作弊
      fish: { on: true, maint: false, maxScore: 20000 },
      fly: { on: true, maint: false, maxScore: 50000 },
      travel: { on: true, maint: false }, photo: { on: true, maint: false }, stamp: { on: true, maint: false }
    },
    storeEvents: [ { id: 'se1', title: '開幕週集點加倍', stores: [], from: '', to: '', mult: 2, on: false } ],
    notices: [ { id: 'n1', title: '歡迎來到東三東四', body: '在館內消費集點、玩遊戲存分數，就能換小鳶贈品！', from: '', to: '', pin: true, on: true } ],
    lowStockWarn: 10,
    site: { name: '東三東四', tel: '', testMode: true },
    alerts: { burstCount: 5, burstMin: 10, bigAmount: 5000 }
  };
  var GAMES = {
    fish: { name: '小鳶捕魚', levels: { noon: '午後場', dusk: '黃昏場', night: '夜釣場' } },
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
  /* C-193：規則版本號。每存一次設定＝新版本（預設是 v1）；每筆交易、點數紀錄記下當時的版本，之後改規則不追溯 */
  function ruleVer() { return cfg().ruleVer || 1; }
  function ruleHistory() { return rd('kiteRuleVer1') || []; }
  function saveCfg(c, why) { var h = ruleHistory(), v = Math.max(c.ruleVer || 1, h[0] ? h[0].v : 1) + 1; c.ruleVer = v; h.unshift({ v: v, t: Date.now(), why: why || '改設定' }); wr('kiteRuleVer1', h.slice(0, 200)); wr(K_CFG, c); audit('改設定 → 規則 v' + v + (why ? '：' + why : '')); }
  function resetCfg() { localStorage.removeItem(K_CFG); saveCfg(cfg(), '設定還原成預設'); }
  function audit(what) { var a = rd(K_AUDIT) || []; a.unshift({ t: Date.now(), what: what }); wr(K_AUDIT, a.slice(0, 300)); }

  /* ====== 會員（這支手機的客人） ====== */
  function member() {
    var m = rd(K_MEM);
    if (!m) { m = { id: 'M' + rid(6), name: '', created: Date.now(), status: 'ok', tags: [], points: 0, scoreBank: {}, ledger: [], nonces: [], plays: [], tries: {}, redeems: [], visits: [] }; wr(K_MEM, m); }
    var today = dayKey(); if (m.visits[m.visits.length - 1] !== today) { m.visits.push(today); m.visits = m.visits.slice(-120); wr(K_MEM, m); }
    m.status = m.status || 'ok'; m.tags = m.tags || [];
    if (!member.busy) { member.busy = true; try { if (housekeep(m)) wr(K_MEM, m); } finally { member.busy = false; } }
    return m;
  }
  function saveMember(m) { wr(K_MEM, m); }
  /* C-196（D77）：我的資訊——暱稱 16 字內（不填就顯示會員編號）、email 與手機選填。原型存在這支手機；正式版存雲端，要先同意會員條款與個資告知 */
  function setProfile(o) {
    var nick = String(o.name || '').replace(/[\u0000-\u001f<>]/g, '').trim(), email = String(o.email || '').trim(), phone = String(o.phone || '').replace(/[\s-]/g, '');
    if (Array.from(nick).length > 16) return { ok: false, field: 'name', msg: '名稱最多 16 個字' };
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, field: 'email', msg: 'Email 格式不對' };
    if (phone) { if (/^\+8869\d{8}$/.test(phone)) phone = '0' + phone.slice(4); if (!/^09\d{8}$/.test(phone)) return { ok: false, field: 'phone', msg: '手機請填 09 開頭的 10 碼' }; }
    var m = member(); m.name = nick; m.email = email; m.phone = phone; m.profileT = Date.now(); saveMember(m); return { ok: true, member: m };
  }
  /* ====== 小鳶便當（D80）：讀寫去旅行的 kiteTravel1.bento；扣點記在點數帳本（type redeem、virtual） ====== */
  function travelBento() { var t = rd('kiteTravel1'); if (!t || t.v !== 1) t = { v: 1 }; t.bento = Object.assign({ far: 0, squid: 0, hair: 0, special: 0 }, t.bento || {}); return t; }
  function bentoState() { var m = member(), d = dayKey(), tb = travelBento().bento, c = cfg(); return (c.bentos || []).map(function (b) { var today = m.ledger.filter(function (e) { return e.type === 'redeem' && e.bento === b.id && dayKey(e.t) === d; }).length; return Object.assign({}, b, { have: tb[b.id] || 0, today: today, canBuy: b.on !== false && today < c.bentoPerDay && (tb[b.id] || 0) < c.bentoHoldMax && m.points >= b.points }); }); }
  function redeemBento(id) {
    var c = cfg(), b = (c.bentos || []).filter(function (x) { return x.id === id; })[0], m = member(); if (!b || b.on === false) return { ok: false, msg: '這個便當目前不能換' };
    if (m.status === 'frozen') return { ok: false, msg: '這個會員帳號暫停使用，請洽服務台' };
    var t = travelBento(), d = dayKey(); if ((t.bento[id] || 0) >= c.bentoHoldMax) return { ok: false, msg: '便當盒裡的' + b.name + '已經有 ' + c.bentoHoldMax + ' 份，先讓小鳶帶出門吧（沒有扣點）' };
    if (m.ledger.filter(function (e) { return e.type === 'redeem' && e.bento === id && dayKey(e.t) === d; }).length >= c.bentoPerDay) return { ok: false, msg: b.name + '今天已經換過了，明天再來' };
    if (m.points < b.points) return { ok: false, msg: '點數不夠，還差 ' + (b.points - m.points) + ' 點' };
    var ref = 'BT' + rid(6); t.bento[id] = (t.bento[id] || 0) + 1; t.bentoBought = (t.bentoBought || 0) + 1;
    if (!wr('kiteTravel1', t)) return { ok: false, msg: '這支手機存不下，請稍後再試（沒有扣點）' };
    addLedger(m, { type: 'redeem', virtual: true, bento: id, pts: -b.points, prizeName: b.name, ref: ref }); saveMember(m);
    return { ok: true, name: b.name, pts: b.points, have: t.bento[id], total: m.points, ref: ref };
  }
  function displayName(m) { m = m || member(); return m.name || '會員 ' + m.id; }
  function addLedger(m, e) { e.t = e.t || Date.now(); e.rv = e.rv || ruleVer(); m.ledger.unshift(e); m.ledger = m.ledger.slice(0, 500); m.points = Math.max(0, (m.points || 0) + e.pts); }
  function storePointsToday(m) { var d = dayKey(), s = 0; m.ledger.forEach(function (e) { if (e.type === 'store' && dayKey(e.t) === d) s += e.pts; }); return s; }

  /* ====== 店家集點 QR ======
     格式：KITE1|E|店家|金額|點數|時間(36進位)|一次性編號|簽章
     沒網路也能用：店家端自己算簽章，客人端自己驗；同一個編號只能用一次，超過時間就失效。 */
  function storeById(id) { return cfg().stores.filter(function (s) { return s.id === id; })[0]; }
  function storeMult(storeId, t) { var d = dayKey(t), best = 1; (cfg().storeEvents || []).forEach(function (e) { if (e.on && (!e.stores || !e.stores.length || e.stores.indexOf(storeId) >= 0) && (!e.from || d >= e.from) && (!e.to || d <= e.to) && e.mult > best) best = e.mult; }); return best; }
  function pointsForSpend(amount, storeId) {      // 工作單 24 v4：A＜T → 0；A≥T → 向下取整（A÷N×M）；日上限在入帳時再套
    var c = cfg(), s = storeId && storeById(storeId), per = (s && s.spendPerPoint) || c.spendPerPoint, m = storeId ? storeMult(storeId) : 1;
    if (amount < c.minSpend) return 0; return Math.floor(amount / per * m + 1e-9) + storeBonusPts(amount, storeId); }
  function storeBonusPts(amount, storeId, t) { var d = dayKey(t), best = 0; (cfg().storeBonus || []).forEach(function (b) { if (b.on && amount >= (b.minAmount || 0) && (!b.stores || !b.stores.length || b.stores.indexOf(storeId) >= 0) && (!b.from || d >= b.from) && (!b.to || d <= b.to) && b.add > best) best = b.add; }); return best; }
  function makeEarnCode(storeId, amount) {
    var s = storeById(storeId); if (!s) throw new Error('沒有這個店家');
    var pts = pointsForSpend(amount, storeId), ts = Date.now().toString(36), nonce = rid(8);
    var body = ['KITE1', 'E', storeId, amount, pts, ts, nonce].join('|'), code = body + '|' + hmac(s.key, body);
    var log = rd(K_STORE) || []; var short = shortCode(); log.unshift({ t: Date.now(), store: storeId, amount: amount, pts: pts, nonce: nonce, code: code, short: short, synced: false, rv: ruleVer() }); wr(K_STORE, log.slice(0, 1000));
    return { code: code, pts: pts, nonce: nonce, short: short };
  }
  /* C-194（D75）：8 位數字手動代碼。原型只在同一個瀏覽器（同一支手機）查得到；正式版由雲端用這 8 碼查回交易 */
  function shortCode() { var used = {}; (rd(K_STORE) || []).forEach(function (r) { if (r.short) used[r.short] = 1; }); var s; do { s = String(Math.floor(Math.random() * 1e8)).padStart(8, '0'); } while (used[s]); return s; }
  function codeByShort(s) { s = String(s || '').replace(/\D/g, ''); if (s.length !== 8) return null; var x = (rd(K_STORE) || []).filter(function (r) { return r.short === s; })[0]; return x ? x.code : null; }
  /* 贈品圖片：後台上傳裁切成 600×600 JPEG，存在 kitePrizeImg1（不跟設定綁在一起，設定讀寫才不會變慢）；沒上傳用預設圖 */
  var PRIZE_IMG0 = { P01: '../photo/assets/stk_kite_peace.png', P02: '../assets/whaleshark.png', P03: '../travel/assets/kite_pack.png', P04: '../travel/assets/bento_special.png' };
  function prizeImg(pid) { var m = rd('kitePrizeImg1') || {}; return m[pid] || PRIZE_IMG0[pid] || '../travel/assets/kite_hello.png'; }
  function hasPrizeImg(pid) { return !!(rd('kitePrizeImg1') || {})[pid]; }
  function setPrizeImg(pid, url) { var m = rd('kitePrizeImg1') || {}; if (url) m[pid] = url; else delete m[pid]; if (!wr('kitePrizeImg1', m)) return false; audit((url ? '上傳' : '移除') + '贈品圖片 ' + pid); return true; }
  function reissueEarn(nonce) {      // 同一筆交易重新出碼：金額不變、交易不變，舊 QR 在這台作廢（工作單 01 v5 第二節 B）
    var log = rd(K_STORE) || [], x = log.filter(function (r) { return r.nonce === nonce || r.tx === nonce; })[0]; if (!x) return { ok: false, msg: '找不到這筆交易' };
    var c = cfg(); x.reissue = (x.reissue || 0) + 1; if (x.reissue > c.reissueMax) return { ok: false, msg: '同一筆交易最多重新出碼 ' + c.reissueMax + ' 次，請到服務台處理' };
    var s = storeById(x.store), ts = Date.now().toString(36), n2 = rid(8), body = ['KITE1', 'E', x.store, x.amount, x.pts, ts, n2].join('|'), code = body + '|' + hmac(s.key, body);
    x.voided = (x.voided || []).concat([x.nonce]); x.tx = x.tx || x.nonce; x.nonce = n2; x.code = code; x.short = shortCode(); x.t2 = Date.now(); wr(K_STORE, log); return { ok: true, code: code, pts: x.pts, nonce: n2, short: x.short, left: c.reissueMax - x.reissue };
  }
  function voidEarn(nonce) { var log = rd(K_STORE) || [], x = log.filter(function (r) { return r.nonce === nonce; })[0]; if (!x) return false; x.void = true; wr(K_STORE, log); audit('店家作廢集點 QR ' + nonce); return true; }
  function parse(code) { var p = String(code || '').trim().split('|'); return p[0] === 'KITE1' ? p : null; }
  function peekEarn(code) { var p = parse(code); if (!p || p[1] !== 'E' || p.length !== 8) return null; var s = storeById(p[2]); return s ? { store: s.name, amount: +p[3], pts: +p[4], t: parseInt(p[5], 36) } : null; }
  function claimEarn(code) {
    var p = parse(code); if (!p || p[1] !== 'E' || p.length !== 8) return { ok: false, msg: '這不是小鳶來港的集點 QR' };
    var c = cfg(), s = storeById(p[2]); if (!s || s.on === false) return { ok: false, msg: '找不到這個店家' };
    if (hmac(s.key, p.slice(0, 7).join('|')) !== p[7]) return { ok: false, msg: 'QR 驗證失敗（可能被改過）' };
    var t = parseInt(p[5], 36); if (Date.now() - t > c.qrExpireMin * 60000) return { ok: false, msg: '這個 QR 已過期，請店員重新出碼' };
    var sl = rd(K_STORE) || []; if (sl.some(function (r) { return (r.voided || []).indexOf(p[6]) >= 0; })) return { ok: false, msg: 'QR 已更新，請掃新的' }; if (sl.some(function (r) { return r.nonce === p[6] && r.void; })) return { ok: false, msg: '這張 QR 已被店家作廢' }; if (sl.some(function (r) { return r.nonce === p[6] && r.recovered; })) return { ok: false, msg: '這筆已經由服務台補登入帳了' };
    var m = member(); if (m.status === 'frozen') return { ok: false, msg: '這個會員帳號暫停使用，請洽服務台' }; if (m.nonces.indexOf(p[6]) >= 0) return { ok: false, msg: '這張 QR 已經集過點了' };
    var pts = +p[4], room = c.maxStorePointsPerDay - storePointsToday(m), give = Math.max(0, Math.min(pts, room));
    m.nonces.push(p[6]); m.nonces = m.nonces.slice(-500);
    var tx0 = sl.filter(function (r) { return r.nonce === p[6]; })[0];      // 用出碼當時的規則版本（同一台裝置才查得到；跨裝置待中央）
    addLedger(m, { type: 'store', pts: give, store: s.id, storeName: s.name, amount: +p[3], ref: p[6], rv: tx0 && tx0.rv }); saveMember(m);
    var why = give === pts ? (pts > 0 ? 'ok' : (+p[3] < c.minSpend ? 'below' : 'zero')) : give > 0 ? 'partial' : 'quota';   // 工作單24 v5：依實際原因顯示，不把 0 點一律說成額度用完
    return { ok: true, pts: give, expected: pts, capped: give < pts, why: why, minSpend: c.minSpend, store: s.name, amount: +p[3], total: m.points, ref: p[6] };
  }

  /* ====== 遊戲分數 ====== */
  function eventMult(game, t) {
    var d = new Date(t || Date.now()), hm = pad(d.getHours()) + ':' + pad(d.getMinutes()), best = 1, title = '';
    var dk = dayKey(d.getTime());
    cfg().events.forEach(function (e) { if (e.on && (e.game === game || e.game === 'all') && (e.days || []).indexOf(d.getDay()) >= 0 && hm >= e.from && hm <= e.to && (!e.dateFrom || dk >= e.dateFrom) && (!e.dateTo || dk <= e.dateTo) && e.mult > best) { best = e.mult; title = e.title; } });
    return { mult: best, title: title };
  }
  /* D97／D98：每日累計總分階梯 */
  function tierPts(total) { var p = 0; (cfg().gameTiers || []).forEach(function (r) { if (total >= r[0] && r[1] > p) p = r[1]; }); return p; }
  function nextTier(total) { var t = (cfg().gameTiers || []).filter(function (r) { return r[0] > total; }).sort(function (a, b) { return a[0] - b[0]; })[0]; return t ? { need: t[0] - total, at: t[0], pts: t[1] } : null; }
  function gameToday(m) {      // 今天算分的局：總分、乘上活動後該拿的點、已入帳的點
    m = m || member(); var d = dayKey(), c = cfg(), total = 0, eff = 0, maxM = 1;
    (m.plays || []).forEach(function (p) { if (!p.counted || dayKey(p.t) !== d) return; var raw = p.raw != null ? p.raw : Math.round((p.bank || 0) / (p.mult || 1)), mu = p.mult || 1; total += raw; eff += raw * mu; if (mu > maxM) maxM = mu; });
    var cap = Math.round((c.gameDailyCap || 0) * maxM), base = tierPts(total), pts = Math.min(cap, Math.floor(base * (total ? eff / total : 1) + 1e-9));
    var got = (m.ledger || []).filter(function (e) { return e.type === 'game' && e.day === d; }).reduce(function (n, e) { return n + e.pts; }, 0);
    var mu = total ? eff / total : 1, nx = base >= (c.gameDailyCap || 0) ? null : nextTier(total);
    if (nx) nx.pts = Math.min(cap, Math.floor(nx.pts * mu + 1e-9));      // 有活動時，下一格的點數也照今天的加倍顯示
    return { total: total, base: base, pts: pts, got: got, cap: cap, mult: mu, next: nx && nx.pts > pts ? nx : (nx ? Object.assign(nx, { pts: pts + 1 }) : null) };
  }
  function triesLeft(game, level) { var c = cfg(), m = member(), k = dayKey() + '|' + game + '|' + level, n = c.gameTries[game] != null ? c.gameTries[game] : c.triesPerLevel; return Math.max(0, n - ((m.tries || {})[k] || 0)); }
  function reportPlay(o) {      // o = { game, level, score, sec }
    var m = member(), k = dayKey() + '|' + o.game + '|' + o.level; m.tries = m.tries || {};
    var gc = (cfg().games || {})[o.game] || {}, sc = Math.max(0, o.score || 0), capped = gc.maxScore && sc > gc.maxScore; if (capped) sc = gc.maxScore;
    var counted = m.status !== 'frozen' && gc.on !== false && triesLeft(o.game, o.level) > 0, ev = eventMult(o.game), add = counted ? Math.round(sc * ev.mult) : 0;
    m.tries[k] = (m.tries[k] || 0) + 1;
    var tier = cfg().gamePointMode === 'tier';
    m.plays.unshift({ t: Date.now(), game: o.game, level: String(o.level), score: o.score || 0, capped: !!capped, sec: Math.round(o.sec || 0), counted: counted, mult: ev.mult, raw: counted ? sc : 0, bank: tier ? 0 : add }); m.plays = m.plays.slice(0, 800);
    if (!tier) { m.scoreBank[o.game] = (m.scoreBank[o.game] || 0) + add; saveMember(m); return { counted: counted, add: add, mult: ev.mult, event: ev.title, bank: m.scoreBank[o.game], left: triesLeft(o.game, o.level) }; }
    /* D97：階梯制——把今天累計的點數補到應得的數字（只增不減，當天上限內） */
    var g = gameToday(m), gain = Math.max(0, g.pts - g.got);
    if (gain > 0) addLedger(m, { type: 'game', pts: gain, game: o.game, day: dayKey(), note: '今日累計 ' + g.total + ' 分' });
    saveMember(m);
    return { tier: true, counted: counted, add: counted ? sc : 0, mult: ev.mult, event: ev.title, today: g.total, pts: g.pts, gain: gain, cap: g.cap, next: g.next, total: m.points, left: triesLeft(o.game, o.level) };
  }
  function perPoint(game) { var c = cfg(); return c.gameScorePerPoint[game] || c.scorePerPoint; }
  function convertScore(game) {      // 分數存摺換點：每滿 perPoint 分換 1 點，零頭留著
    var m = member(), per = perPoint(game), bank = m.scoreBank[game] || 0, pts = Math.floor(bank / per); if (pts <= 0) return { ok: false, msg: '還差 ' + (per - bank) + ' 分才能換 1 點' };
    m.scoreBank[game] = bank - pts * per; addLedger(m, { type: 'game', pts: pts, game: game, used: pts * per }); saveMember(m); return { ok: true, pts: pts, total: m.points };
  }

  /* ====== D98：小鳶去旅行帶回的伴手禮（點數、券） ====== */
  function monthKey(t) { return dayKey(t).slice(0, 7); }
  function travelPtsThisMonth(m) { var mk = monthKey(); return (m.ledger || []).filter(function (e) { return e.type === 'travel' && monthKey(e.t) === mk; }).reduce(function (n, e) { return n + e.pts; }, 0); }
  function couponIssued() { var o = rd('kiteCouponIssued1') || {}, mk = monthKey(); return o[mk] || {}; }
  function travelGift(bento, ref, rnd) {      // 旅行回家時呼叫一次；rnd 給測試用
    rnd = rnd || Math.random; var c = cfg(), tg = c.travelGift || {}, m = member(), out = { pts: 0, coupon: null };
    if (m.status === 'frozen') return out;
    var left = (tg.monthCap || 0) - travelPtsThisMonth(m), ch = (tg.chance || {})[bento] || 0;
    if (tg.on && left > 0 && rnd() < ch) {
      var dist = tg.dist || [[1, 1]], sum = dist.reduce(function (n, x) { return n + x[1]; }, 0), r = rnd() * sum, p = dist[0][0];
      for (var i = 0; i < dist.length; i++) { r -= dist[i][1]; if (r < 0) { p = dist[i][0]; break; } }
      p = Math.min(p, left); addLedger(m, { type: 'travel', pts: p, bento: bento, ref: ref || '' }); out.pts = p;
    }
    var iss = couponIssued(), cs = (c.coupons || []).filter(function (x) { return x.on && (iss[x.id] || 0) < (x.monthQty || 0); });
    for (var j = 0; j < cs.length && !out.coupon; j++) if (rnd() < (cs[j].chance || 0)) out.coupon = grantCoupon(m, cs[j]);
    saveMember(m); return out;
  }
  function grantCoupon(m, cp) {
    var id = rid(6), exp = Date.now() + (cp.validDays || 14) * 86400000, body = ['KITE1', 'C', m.id, cp.id, exp.toString(36), id].join('|'), code = body + '|' + hmac(cfg().redeemKey, body);
    m.coupons = m.coupons || []; var o = { id: id, cid: cp.id, name: cp.name, store: cp.store || '', desc: cp.desc || '', t: Date.now(), exp: exp, code: code, status: 'ok' }; m.coupons.unshift(o);
    var all = rd('kiteCouponIssued1') || {}, mk = monthKey(); all[mk] = all[mk] || {}; all[mk][cp.id] = (all[mk][cp.id] || 0) + 1; wr('kiteCouponIssued1', all);
    return o;
  }
  function myCoupons() { var m = member(), ch = false; (m.coupons || []).forEach(function (x) { if (x.status === 'ok' && Date.now() > x.exp) { x.status = 'expired'; ch = true; } }); if (ch) saveMember(m); return m.coupons || []; }
  function couponCheck(code) {
    var p = parse(code), c = cfg(); if (!p || p[1] !== 'C' || p.length !== 7) return { ok: false, msg: '這不是券的 QR' };
    if (hmac(c.redeemKey, p.slice(0, 6).join('|')) !== p[6]) return { ok: false, msg: 'QR 驗證失敗（可能被改過）' };
    var cp = (c.coupons || []).filter(function (x) { return x.id === p[3]; })[0], exp = parseInt(p[4], 36);
    var used = (rd('kiteCouponUsed1') || []).filter(function (u) { return u.id === p[5]; })[0]; if (used) return { ok: false, msg: '這張券已於 ' + new Date(used.t).toLocaleString('zh-TW', { hour12: false }) + ' 使用過' };
    if (Date.now() > exp) return { ok: false, msg: '這張券已過期（' + new Date(exp).toLocaleDateString('zh-TW') + '）' };
    return { ok: true, member: p[2], id: p[5], cid: p[3], name: cp ? cp.name : p[3], desc: cp ? cp.desc : '', store: cp ? cp.store : '', exp: exp };
  }
  function couponUse(code, who) {
    var r = couponCheck(code); if (!r.ok) return r;
    var u = rd('kiteCouponUsed1') || []; u.unshift({ id: r.id, cid: r.cid, member: r.member, t: Date.now(), who: who || '' }); wr('kiteCouponUsed1', u.slice(0, 2000));
    var lm = rd(K_MEM); if (lm && lm.id === r.member) { (lm.coupons || []).forEach(function (x) { if (x.id === r.id) { x.status = 'used'; x.usedT = Date.now(); } }); wr(K_MEM, lm); }
    audit('核銷券 ' + r.id + '（' + r.name + '）會員 ' + r.member); return r;
  }

  /* ====== 兌換 ======
     客人在手機選贈品 → 先扣點，產生兌換 QR → 服務台掃描確認發放。
     格式：KITE1|R|會員|贈品|點數|時間|兌換碼|簽章 */
  function prizeById(id) { return cfg().prizes.filter(function (p) { return p.id === id; })[0]; }
  function issuedCount(pid) { var n = 0; (rd(K_DESK) || []).forEach(function (r) { if (r.prize === pid) n++; }); return n; }
  function reservedCount(pid) { var n = 0, issued = {}; (rd(K_DESK) || []).forEach(function (r) { issued[r.rcode] = 1; }); allMembers().forEach(function (m) { (m.redeems || []).forEach(function (r) { if (r.prize === pid && r.status === 'wait' && !issued[r.id]) n++; }); }); return n; }
  function adjSum(pid) { var n = 0; (rd('kiteStockAdj1') || []).forEach(function (a) { if (a.pid === pid) n += a.qty; }); return n; }
  function onHand(pid) { var p = prizeById(pid); return p ? Math.max(0, p.stock + adjSum(pid) - issuedCount(pid)) : 0; }      // 實物現存＝總數（期初＋補貨）＋核准調整－已交付（工作單 24 v3）
  function gap(pid) { return Math.max(0, reservedCount(pid) - onHand(pid)); }      // 保留缺口：實物少於已保留，暫停新兌換、轉待處理
  function stockLeft(pid) { return gap(pid) > 0 ? 0 : Math.max(0, onHand(pid) - reservedCount(pid)); }      // 可兌換＝實物現存－已保留（工作單 01 v5：建單時扣點並保留庫存）
  function makeRedeem(pid) {
    var p = prizeById(pid), m = member(); if (!p || p.on === false) return { ok: false, msg: '這個贈品目前不能換' };
    if (stockLeft(pid) <= 0) return { ok: false, msg: '這個贈品換完了' };
    if (m.status === 'frozen') return { ok: false, msg: '這個會員帳號暫停使用，請洽服務台' };
    var blk = redeemBlock(pid, m); if (blk) return { ok: false, msg: blk };
    if (m.points < p.points) return { ok: false, msg: '點數不夠，還差 ' + (p.points - m.points) + ' 點' };
    var rcode = rid(6), ts = Date.now().toString(36), body = ['KITE1', 'R', m.id, p.id, p.points, ts, rcode].join('|'), code = body + '|' + hmac(cfg().redeemKey, body);
    addLedger(m, { type: 'redeem', pts: -p.points, prize: p.id, prizeName: p.name, ref: rcode });
    m.redeems.unshift({ id: rcode, prize: p.id, name: p.name, pts: p.points, t: Date.now(), code: code, status: 'wait' }); saveMember(m);
    return { ok: true, code: code, rcode: rcode, prize: p, total: m.points };
  }
  /* D82：兌換資格（不含點數與庫存）。取消或逾期退點的單不算在每天次數與每人限換裡 */
  function redeemBlock(pid, m) {
    var p = prizeById(pid); m = m || member(); if (!p) return '找不到這個贈品';
    var c0 = cfg(), today = dayKey(), act = (m.redeems || []).filter(function (r) { return r.status !== 'cancel' && r.status !== 'expired'; });
    if (p.from && today < p.from) return '這個贈品 ' + p.from.slice(5).replace('-', '/') + ' 才開始兌換';
    if (p.to && today > p.to) return '這個贈品的兌換期間已經結束';
    if (p.perUser && act.filter(function (r) { return r.prize === p.id; }).length >= p.perUser) return '這個贈品每人限換 ' + p.perUser + ' 次，你已經換過了';
    if (c0.redeemPerDay && act.filter(function (r) { return dayKey(r.t) === today; }).length >= c0.redeemPerDay) return '今天已經兌換 ' + c0.redeemPerDay + ' 次了，明天再來';
    return '';
  }
  function cancelRedeem(rcode) {
    var m = member(), r = m.redeems.filter(function (x) { return x.id === rcode; })[0]; if (!r || r.status !== 'wait') return false;
    r.status = 'cancel'; addLedger(m, { type: 'refund', pts: r.pts, prize: r.prize, prizeName: r.name, ref: rcode }); saveMember(m); return true;
  }
  function deskCheck(code) {
    var p = parse(code), c = cfg(); if (!p || p[1] !== 'R' || p.length !== 8) return { ok: false, msg: '這不是兌換 QR' };
    if (hmac(c.redeemKey, p.slice(0, 7).join('|')) !== p[7]) return { ok: false, msg: 'QR 驗證失敗（可能被改過）' };
    var pr = prizeById(p[3]); if (!pr) return { ok: false, msg: '找不到這個贈品' };
    var log = rd(K_DESK) || []; var got = log.filter(function (r) { return r.rcode === p[6]; })[0]; if (got) return { ok: false, msg: '此單已於 ' + new Date(got.t).toLocaleString('zh-TW', { hour12: false }) + ' 完成領取，請勿再次發放' };
    var lm = rd(K_MEM), lr = lm && lm.id === p[2] && (lm.redeems || []).filter(function (x) { return x.id === p[6]; })[0];      // D82：同一台裝置能看到客人那邊時，已取消／逾期的單不能再發
    if (lr && (lr.status === 'cancel' || lr.status === 'expired')) return { ok: false, msg: '這張兌換單已' + (lr.status === 'cancel' ? '被客人取消' : '逾期自動取消') + '，點數已退回，不能發放' };
    var t = parseInt(p[5], 36), late = Date.now() - t > c.redeemExpireMin * 60000;
    /* G60-01：超過領取保留期限的單不能發放（匯入資料、沒重開客人頁的舊單也一樣擋）；同一台的客人資料順便做到期退點 */
    if (c.redeemHoldDays && Date.now() - t > c.redeemHoldDays * 86400000) { if (lm && lm.id === p[2]) member(); return { ok: false, msg: '這張兌換單已超過 ' + c.redeemHoldDays + ' 天領取期限（' + new Date(t + c.redeemHoldDays * 86400000).toLocaleString('zh-TW', { hour12: false }) + ' 到期），不能發放；點數會自動退回，請客人重新兌換' }; }
    return { ok: true, member: p[2], prize: pr, pts: +p[4], rcode: p[6], t: t, late: late, stock: onHand(pr.id), reserved: reservedCount(pr.id) };
  }
  /* D84：服務台用 6 碼兌換碼查詢、待領取清單（只看得到這台＋匯入的資料，D72） */
  function findRedeem(rc) { rc = String(rc || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (rc.length !== 6) return null; var hit = null; allMembers().forEach(function (m) { (m.redeems || []).forEach(function (r) { if (!hit && r.id === rc) hit = { m: m, r: r }; }); }); return hit; }
  function pendingRedeems() { var issued = {}, out = []; (rd(K_DESK) || []).forEach(function (r) { issued[r.rcode] = 1; }); allMembers().forEach(function (m) { (m.redeems || []).forEach(function (r) { if (r.status === 'wait' && !issued[r.id]) out.push({ m: m, r: r }); }); }); return out.sort(function (a, b) { return a.r.t - b.r.t; }); }
  /* D84：客人 QR 壞掉／手機沒電時，後台手動標記已領（記在服務台發放紀錄，manual＝true，寫操作紀錄） */
  function markGiven(rc, staff, why) {
    why = String(why || '').trim(); if (!why) return { ok: false, msg: '請填原因（例如：客人手機沒電，已核對姓名與兌換碼）' };      // G60-07
    var h = findRedeem(rc); if (!h) return { ok: false, msg: '這台查不到這張兌換單' };
    if (h.r.status !== 'wait') return { ok: false, msg: '這張兌換單不是待領取狀態' };
    var hd = cfg().redeemHoldDays; if (hd && Date.now() - h.r.t > hd * 86400000) return { ok: false, msg: '這張兌換單已超過 ' + hd + ' 天領取期限，不能標記已領' };
    var log = rd(K_DESK) || []; if (log.some(function (x) { return x.rcode === h.r.id; })) return { ok: false, msg: '這張已經發放過了' };
    if (onHand(h.r.prize) <= 0) return { ok: false, msg: '實物沒有了，請先補貨' };
    log.unshift({ t: Date.now(), rcode: h.r.id, member: h.m.id, prize: h.r.prize, prizeName: h.r.name, pts: h.r.pts, staff: staff || '後台', manual: true, note: why || '' }); wr(K_DESK, log);
    var m = rd(K_MEM); if (m && m.id === h.m.id) { m.redeems.forEach(function (x) { if (x.id === h.r.id) x.status = 'done'; }); wr(K_MEM, m); }
    audit('後台手動標記已領 ' + h.r.id + '（' + h.r.name + '，會員 ' + h.m.id + '）' + (why ? '：' + why : '')); return { ok: true };
  }
  function memberName(id) { var m = allMembers().filter(function (x) { return x.id === id; })[0]; return m && m.name ? m.name : ''; }
  function deskGive(code, staff) {
    var r = deskCheck(code); if (!r.ok) return r; if (onHand(r.prize.id) <= 0) return { ok: false, msg: '實物沒有了，請管理員處理' };
    var log = rd(K_DESK) || []; log.unshift({ t: Date.now(), rcode: r.rcode, member: r.member, prize: r.prize.id, prizeName: r.prize.name, pts: r.pts, staff: staff || '' }); wr(K_DESK, log);
    var m = rd(K_MEM); if (m && m.id === r.member) { m.redeems.forEach(function (x) { if (x.id === r.rcode) x.status = 'done'; }); wr(K_MEM, m); }      // 同一支手機測試時直接更新客人那邊
    return { ok: true, prize: r.prize, rcode: r.rcode };
  }

  /* ====== 例行整理：兌換單逾期自動取消退點、點數到期（每次打開會員資料時跑） ====== */
  function housekeep(m) {
    var c = cfg(), now = Date.now(), changed = false;
    (m.redeems || []).forEach(function (r) { if (r.status === 'wait' && c.redeemHoldDays && now - r.t > c.redeemHoldDays * 86400000) { r.status = 'expired'; addLedger(m, { type: 'refund', pts: r.pts, prize: r.prize, prizeName: r.name, ref: r.id, note: '逾期未領自動取消' }); changed = true; } });
    var exp = expiring(m, 0); if (exp.due > 0) { addLedger(m, { type: 'expire', pts: -Math.min(exp.due, m.points), note: '點數到期' }); changed = true; }
    return changed;
  }
  function batchEnd(t0) { var c = cfg(); return c.expireMode === 'never' ? 0 : c.expireMode === 'year' ? new Date(new Date(t0).getFullYear(), 11, 31, 23, 59, 59).getTime() : c.expireMode === 'months' ? (function (d) { d.setMonth(d.getMonth() + (c.pointsExpireMonths || 12)); return d.getTime(); })(new Date(t0)) : (c.pointsExpireDays === 0 ? 0 : t0 + (c.pointsExpireDays || 365) * 86400000); }
  function batches(m) {      // 先進先出：每一批得到的點數還剩多少、什麼時候到期（end＝0 代表不會到期）
    var gains = [], spent = 0;
    (m.ledger || []).slice().reverse().forEach(function (e) { if (e.pts > 0 && e.type !== 'refund') gains.push({ t: e.t, pts: e.pts, left: e.pts, type: e.type, src: e.storeName || e.game || e.note || '' }); else if (e.pts < 0) spent += -e.pts; else if (e.type === 'refund') spent -= e.pts; });
    gains.forEach(function (g) { var u = Math.min(g.left, Math.max(0, spent)); g.left -= u; spent -= u; g.end = batchEnd(g.t); });
    return gains.filter(function (g) { return g.left > 0; });
  }
  function expiring(m, days) {
    if (cfg().expireMode === 'never') return { due: 0 };
    var lim = Date.now() + (days || 0) * 86400000, due = 0;
    batches(m).forEach(function (g) { if (g.end && g.end <= lim) due += g.left; });
    return { due: due };
  }

  /* ====== 庫存調整、盤點、交班、補登（工作單 24 v3 第四節；第一階段本機測試） ====== */
  function addAdj(pid, qty, reason, by, ref) { var l = rd('kiteStockAdj1') || []; var e = { id: 'AJ' + rid(6), t: Date.now(), pid: pid, qty: qty, reason: reason, by: by, ref: ref || '' }; l.unshift(e); wr('kiteStockAdj1', l); audit('庫存調整 ' + pid + ' ' + (qty > 0 ? '+' : '') + qty + '（' + reason + '）'); return e; }
  function lookupTx(no) { var x = (rd(K_STORE) || []).filter(function (r) { return r.nonce === no || r.tx === no || (r.voided || []).indexOf(no) >= 0; })[0]; if (!x) return null; var cl = claimedRefs(); return { store: (storeById(x.store) || {}).name || x.store, amount: x.amount, pts: x.pts, t: x.t, status: x.void ? '已作廢' : (cl[x.nonce] || cl[x.tx] || x.recovered) ? '已入帳' : '未入帳', why: x.void ? '' : (cl[x.nonce] || cl[x.tx] || x.recovered) ? '' : '客人沒有完成領取', today: dayKey(x.t) === dayKey() }; }
  function list(k) { return rd(k) || []; }
  function saveList(k, v) { wr(k, v); }
  function claimedRefs() { var s = {}; allMembers().forEach(function (m) { (m.ledger || []).forEach(function (e) { if ((e.type === 'store' || e.type === 'backfill') && e.ref) s[e.ref] = m.id; }); }); return s; }
  function backfill(o) {      // o = { type:'recover'|'manual', nonce, store, amount, receipt, date, member, by, reason }
    var c = cfg(), today = dayKey(), cases = rd('kiteBackfill1') || [], cl = claimedRefs(), cs = { id: 'BF' + rid(6), t: Date.now(), type: o.type, by: o.by || '', reason: o.reason || '', member: o.member || '', status: 'review' };
    if (!o.member) return { ok: false, msg: '請填會員編號（會員身分不能用暱稱代替）' };
    if (o.type === 'recover') {
      var tx = (rd(K_STORE) || []).filter(function (x) { return x.nonce === o.nonce || x.tx === o.nonce || (x.voided || []).indexOf(o.nonce) >= 0; })[0];
      if (!tx) return { ok: false, msg: '找不到原交易（請改走一般補登）' };
      if (tx.void) return { ok: false, msg: '原交易已作廢，不能恢復' };
      if (cl[tx.nonce] || cl[tx.tx] || tx.recovered) return { ok: false, msg: '原交易已經入帳過了' };
      if (dayKey(tx.t) !== today) return { ok: false, msg: '只能恢復當天的交易（D54）' };
      cs.store = tx.store; cs.amount = tx.amount; cs.pts = tx.pts; cs.ref = tx.tx || tx.nonce; cs.date = dayKey(tx.t);
    } else {
      if (o.date !== today) return { ok: false, msg: '一般補登只受理當天的消費（D54）' };
      if (!o.receipt) return { ok: false, msg: '請填收據或發票號碼' };
      if (cases.some(function (x) { return x.type === 'manual' && x.store === o.store && x.date === o.date && x.receipt === o.receipt && x.status !== 'rejected'; })) return { ok: false, msg: '這張收據已經補登過了' };
      cs.store = o.store; cs.amount = +o.amount; cs.receipt = o.receipt; cs.date = o.date; cs.pts = pointsForSpend(+o.amount, o.store); cs.ref = 'BF-' + o.store + '-' + o.date + '-' + o.receipt;
    }
    var m = rd(K_MEM);
    if (m && m.id === o.member) { var s = storeById(cs.store) || {}; addLedger(m, { type: 'backfill', pts: cs.pts, store: cs.store, storeName: s.name, amount: cs.amount, ref: cs.ref, note: (o.type === 'recover' ? '交易恢復' : '一般補登') + '・' + (o.by || '') }); wr(K_MEM, m); cs.status = 'done'; if (o.type === 'recover') { var L = rd(K_STORE) || []; L.forEach(function (x) { if (x === tx || x.nonce === tx.nonce) x.recovered = true; }); wr(K_STORE, L); } }
    else { cs.status = 'check'; cs.missing = '會員不在這台裝置（請核對會員編號與原交易資料）'; }      // 工作單 24 v4：會員不在這台裝置＝「待人工核對／資料未齊」，案件已儲存、尚未入帳；本機示範沒有自動傳送
    cases.unshift(cs); wr('kiteBackfill1', cases); audit((o.type === 'recover' ? '交易恢復' : '一般補登') + ' ' + cs.id + '：會員 ' + o.member + ' ' + cs.pts + ' 點（' + (o.reason || '') + '）');
    return { ok: true, case: cs };
  }

  /* ====== 統計（後台）：這支手機的客人＋匯入的其他手機資料 ====== */
  function allMembers() { var a = (rd(K_IMP) || []).slice(), m = rd(K_MEM); if (m && !a.some(function (x) { return x.id === m.id; })) a.unshift(m); return a; }
  function importPreview(list) { var a = allMembers(), r = { add: 0, same: 0, conflict: 0, items: [] }; list.forEach(function (m) { var o = a.filter(function (x) { return x.id === m.id; })[0], st = !o ? 'add' : JSON.stringify(o.ledger) === JSON.stringify(m.ledger) ? 'same' : 'conflict'; r[st]++; r.items.push({ id: m.id, st: st }); }); return r; }
  function importMembers(list) {      // 工作單 24 v3：同 ID 同內容略過；同 ID 不同內容「隔離成待處理衝突」，保留雙方，不覆寫、不入帳、不進報表
    var a = rd(K_IMP) || [], cf = rd('kiteImportConflicts1') || [], me = rd(K_MEM), bid = 'IB' + rid(5);
    list.forEach(function (m) { var o = a.filter(function (x) { return x.id === m.id; })[0] || (me && me.id === m.id ? me : null);
      if (!o) { m._batch = bid; a.push(m); } else if (JSON.stringify(o.ledger) !== JSON.stringify(m.ledger)) cf.push({ id: 'CF' + rid(5), t: Date.now(), batch: bid, mid: m.id, incoming: m, status: 'open' }); });
    wr(K_IMP, a); wr('kiteImportConflicts1', cf); var d = dataset(); d.imports.push({ t: Date.now(), n: list.length }); wr('kiteDataset1', d); audit('匯入 ' + list.length + ' 位客人的資料'); }
  function dataset() { var d = rd('kiteDataset1'); if (!d) { d = { id: 'DS' + rid(6), created: Date.now(), imports: [] }; wr('kiteDataset1', d); } return d; }
  function archiveFull() { return (rd('kiteArchive1') || []).length >= 3; }
  function wipeTest() { if (archiveFull()) return null;      // 封存滿 3 份就暫停清除，不默默丟掉最舊的（工作單 24 v4）
    var keys = [K_MEM, K_STORE, K_DESK, K_IMP, 'kiteStockAdj1', 'kiteBackfill1', 'kiteImportConflicts1', 'kiteStocktake1', 'kiteShift1'], old = rd('kiteDataset1') || {}, snap = {};
    keys.forEach(function (k) { snap[k] = rd(k); }); var ar = rd('kiteArchive1') || []; ar.unshift({ id: old.id || '?', t: Date.now(), data: snap }); try { wr('kiteArchive1', ar); } catch (e) { return null; }      // 舊資料集封存（最多 3 份），新帳本不會自動併入
    keys.forEach(function (k) { localStorage.removeItem(k); }); var d = { id: 'DS' + rid(6), created: Date.now(), imports: [] }; wr('kiteDataset1', d); audit('清除測試資料，新資料集 ' + d.id); return d; }
  function exportMe() { return JSON.stringify(member()); }

  G.KiteCore = {
    DEFAULTS: DEFAULTS, GAMES: GAMES, cfg: cfg, saveCfg: saveCfg, ruleVer: ruleVer, ruleHistory: ruleHistory, setProfile: setProfile, displayName: displayName, bentoState: bentoState, redeemBento: redeemBento, redeemBlock: redeemBlock, codeByShort: codeByShort, prizeImg: prizeImg, hasPrizeImg: hasPrizeImg, setPrizeImg: setPrizeImg, resetCfg: resetCfg, audit: audit, auditLog: function () { return rd(K_AUDIT) || []; },
    member: member, peekMember: function () { return rd(K_MEM); }, saveMember: saveMember, dayKey: dayKey, rid: rid, hmac: hmac, sha256: sha256, utf8: utf8,
    pointsForSpend: pointsForSpend, makeEarnCode: makeEarnCode, claimEarn: claimEarn, storeLog: function () { return rd(K_STORE) || []; }, storeById: storeById,
    eventMult: eventMult, triesLeft: triesLeft, reportPlay: reportPlay, perPoint: perPoint, convertScore: convertScore, tierPts: tierPts, nextTier: nextTier, gameToday: gameToday, storeBonusPts: storeBonusPts,
    travelGift: travelGift, travelPtsThisMonth: function () { return travelPtsThisMonth(member()); }, myCoupons: myCoupons, couponCheck: couponCheck, couponUse: couponUse, couponIssued: couponIssued,
    prizeById: prizeById, stockLeft: stockLeft, makeRedeem: makeRedeem, cancelRedeem: cancelRedeem, deskCheck: deskCheck, deskGive: deskGive, findRedeem: findRedeem, pendingRedeems: pendingRedeems, memberName: memberName, markGiven: markGiven, deskLog: function () { return rd(K_DESK) || []; },
    allMembers: allMembers, importMembers: importMembers, addAdj: addAdj, adjSum: adjSum, gap: gap, list: list, saveList: saveList, backfill: backfill, claimedRefs: claimedRefs, lookupTx: lookupTx, archiveFull: archiveFull, archives: function () { return (rd('kiteArchive1') || []).map(function (a) { return { id: a.id, t: a.t }; }); }, importPreview: importPreview, dataset: dataset, wipeTest: wipeTest, reissueEarn: reissueEarn, voidEarn: voidEarn, peekEarn: peekEarn, onHand: onHand, reservedCount: reservedCount, exportMe: exportMe, expiring: expiring, batches: batches, housekeep: housekeep, storeMult: storeMult, notices: function () { var d = dayKey(); return (cfg().notices || []).filter(function (n) { return n.on && (!n.from || d >= n.from) && (!n.to || d <= n.to); }); }
  };
})(window);
