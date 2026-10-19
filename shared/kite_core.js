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
    gameTiers: [[1200, 1], [3000, 2], [4500, 3], [6000, 4], [8000, 5], [10000, 6], [13000, 7], [17000, 8], [22000, 9], [30000, 10]],
    gameDailyCap: 10,
    gameClaim: 'tap',             // D102（Dari 10/17）：'tap'＝分數到了那一格會發亮，玩家在小鳶樂園點一下才入帳（沒領的隔天自動補入）；'auto'＝自動入帳             // 每天遊戲最多拿幾點（基礎點＋活動加送點合計）
    eventCapMult: true,           // D99（Dari 10/17）：活動時每日上限跟著倍數放大（兩倍活動＝當天最多 20 點）；後台可改
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
    travelGift: { on: true, monthCap: 20, chance: { walk: 0, rice: 0, far: 0.15, squid: 0.2, hair: 0.25, special: 0.3 }, dist: [[1, 50], [2, 25], [3, 15], [4, 7], [5, 3]] },      // G-73：免費散步／飯糰不帶點；平均每趟期望 0.28～0.56 點，低於便當價格 3 成；不受遊戲／消費活動加倍
    /* D98：小鳶帶回的券（折扣券、抵用券；後台設定），放進 LINE「我的兌換 → 我的券」，到店出示 QR 由店員核銷 */
    /* D99（Dari 10/17）：券由後台新增（含圖檔）；以下是用館內專櫃名稱做的「示意券」，面額與條件都是假設，正式內容要跟專櫃談好再改。
       face＝券上大字；store＝適用專櫃（文字）；chance＝每趟帶回這張的機率；monthQty＝全館每月最多發幾張；一趟最多帶回一張券 */
    coupons: [
      { id: 'C01', name: '三奇壹號 咖啡 9 折券', store: '三奇壹號', face: '9折', desc: '咖啡飲品 9 折，限當次結帳使用一次（示意）', chance: 0.02, monthQty: 30, validDays: 14, on: true },
      { id: 'C02', name: '檀島咖啡 折 20 元', store: '檀島咖啡', face: '折$20', desc: '單筆滿 200 元折 20 元（示意）', chance: 0.02, monthQty: 30, validDays: 14, on: true },
      { id: 'C03', name: '布娜飛 9 折券', store: '布娜飛', face: '9折', desc: '店內商品 9 折（示意）', chance: 0.015, monthQty: 20, validDays: 14, on: true },
      { id: 'C04', name: '札幌藥妝 滿 500 折 50', store: '札幌藥妝', face: '折$50', desc: '單筆滿 500 元折 50 元（示意）', chance: 0.015, monthQty: 20, validDays: 30, on: true },
      { id: 'C05', name: '金春喜 9 折券', store: '金春喜', face: '9折', desc: '店內商品 9 折（示意）', chance: 0.015, monthQty: 20, validDays: 14, on: true },
      { id: 'C06', name: '饗泰多 滿 1,000 折 100', store: '饗泰多', face: '折$100', desc: '內用單筆滿 1,000 元折 100 元（示意）', chance: 0.01, monthQty: 10, validDays: 30, on: true }
    ],
    couponMemberMonth: 2,         // D99：每人每月最多從旅行拿幾張券（防同一人包走）
    prizes: [      // D101（Dari 10/17）：測試用贈品，點數照採購成本各自設（示意）
      { id: 'P01', name: '小鳶貼紙一張', points: 5, stock: 200, on: true, perUser: 1, perUserPer: 'month', desc: '小鳶揮手款防水貼紙，可以貼在水壺或手機殼。' },
      { id: 'P02', name: '鯨鯊鑰匙圈', points: 30, stock: 50, on: true, perUser: 1, perUserPer: 'month', desc: '港口的鯨鯊朋友，壓克力雙面印刷。' },
      { id: 'P03', name: '小鳶帆布袋', points: 50, stock: 30, on: true, perUser: 1, perUserPer: 'month', desc: '厚帆布托特包，A4 放得下，逛港口剛好。' },
      { id: 'P04', name: '合作餐飲兌換券', points: 15, stock: 100, on: true, perUser: 1, perUserPer: 'month', desc: '到館內合作餐飲出示兌換券，換一份港邊餐點（和小鳶去旅行的「港邊特製便當」不同）。' },
      { id: 'P05', name: '小鳶馬克杯', points: 80, stock: 20, on: true, perUser: 1, perUserPer: 'month', desc: '白色陶瓷馬克杯，350ml，小鳶揮手款。' },
      { id: 'P06', name: '港灣明信片三張組', points: 20, stock: 60, on: true, perUser: 1, perUserPer: 'month', desc: '小鳶去旅行的水彩明信片，基隆港灣三款一組。' }
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
    refundGraceDays: 30,          // D120：退回的點數至少還能用幾天（原本到期日比較晚就照原本）
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
    redeemPerDay: 0,              // 每人每天最多兌換幾次；0＝不限（D103：外縣市客人久久來一次，點數夠、符合各贈品規則就都能換）
    /* D99：每項贈品可以設每人限換幾份（perUser）與計算期間（perUserPer：day 每天／month 每月／all 活動期間總共）；預設每人每月 1 份 */
    games: {                      // 遊戲開關與防作弊
      fish: { on: true, maint: false, maxScore: 20000 },
      fly: { on: true, maint: false, maxScore: 50000 },
      travel: { on: true, maint: false }, photo: { on: true, maint: false }, stamp: { on: true, maint: false }
    },
    storeEvents: [ { id: 'se1', title: '開幕週集點加倍', stores: [], from: '', to: '', mult: 2, on: false } ],
    notices: [ { id: 'n1', title: '歡迎來到東三東四', body: '在館內消費或玩遊戲都能集點，到「港口換禮」看看能換什麼！', from: '', to: '', pin: true, on: true } ],
    lowStockWarn: 10,
    site: { name: '小鳶來港-叁肆行X好食城', tel: '', testMode: true },      // D101：客人看到的名稱（暫定）
    alerts: { burstCount: 5, burstMin: 10, bigAmount: 5000 }
  };
  var GAMES = {
    fish: { name: '小鳶捕魚', levels: { keelung: '基隆港', s2: '八斗子', s3: '和平島', s4: '基隆嶼' }, legacy: { noon: '午後場（舊）', dusk: '黃昏場（舊）', night: '夜釣場（舊）' } },      // D118：改成關卡，時段在局內輪替
    fly: { name: '飛行冒險', levels: { '1': '第 1 關', '2': '第 2 關', '3': '第 3 關', '4': '第 4 關', '5': '第 5 關', '6': '第 6 關', '7': '第 7 關', '8': '第 8 關' } },
    travel: { name: '小鳶去旅行', levels: {} },
    photo: { name: '小鳶合照館', levels: {} },
    stamp: { name: '港灣蓋章散步', levels: {} },
    merge: { name: '小鳶合成港', levels: {} },      // D119：放進遊戲大廳，不計分
    stack: { name: '小鳶疊貨櫃', levels: {} }
  };

  function rd(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function wr(k, v) { try { if (k === 'kiteMember1' && v) v.rev = (v.rev || 0) + 1; localStorage.setItem(k, JSON.stringify(v)); if (SYNC_KEYS[k] && G.__kiteCloudPush) G.__kiteCloudPush(k); return true; } catch (e) { return false; } }
  var SYNC_KEYS = { kiteMember1: 1, kiteStoreTx1: 1, kiteDeskLog1: 1, kiteCouponUsed1: 1, kiteStockAdj1: 1, kitePrizeImg1: 1 };
  /* D100：本機紀錄＋雲端其他裝置的紀錄合起來看（同一筆以本機為準）；寫入只寫本機，再由雲端同步上傳 */
  var LOG_ID = { kiteStoreTx1: 'nonce', kiteDeskLog1: 'rcode', kiteCouponUsed1: 'id', kiteStockAdj1: 'id' };
  function lg(k) { var a = rd(k) || [], c = (rd('kiteCloud1') || {}).logs || {}, b = c[k] || [], id = LOG_ID[k], seen = {}; if (!b.length) return a; a.forEach(function (x) { seen[x[id]] = 1; }); return a.concat(b.filter(function (x) { if (seen[x[id]]) return false; seen[x[id]] = 1; return true; })); }
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
  function cfg() { var c = rd(K_CFG); var d = clone(DEFAULTS); if (!c) return d; for (var k in c) d[k] = c[k];
    /* D99 舊設定升級：只有舊的一張「示範」券就換成新的專櫃示意券；贈品沒設過每人限換的，補上預設每人每月 1 份 */
    if (c.coupons && c.coupons.length === 1 && /示範/.test(c.coupons[0].name || '')) d.coupons = clone(DEFAULTS.coupons);
    if (d.site && d.site.name === '東三東四') d.site = Object.assign({}, d.site, { name: DEFAULTS.site.name });      // D101 舊設定升級：館名、測試贈品
    if (c.prizes && c.prizes.length === 4 && c.prizes[2] && c.prizes[2].id === 'P03' && c.prizes[2].points === 80) d.prizes = clone(DEFAULTS.prizes);
    if (!c.m99) (d.prizes || []).forEach(function (p) { if (p.perUser === undefined) { p.perUser = 1; p.perUserPer = 'month'; } });      // 只升級一次：後台存過（m99）之後，留空＝不限
    if (!c.m103) d.redeemPerDay = 0;
    (d.notices || []).forEach(function (n) { if (/玩遊戲存分數/.test(n.body || '')) n.body = n.body.replace('玩遊戲存分數', '玩遊戲點亮積分格領點數'); });      // D103 舊設定升級一次：取消每天 3 次的限制
    return d; }
  /* C-193：規則版本號。每存一次設定＝新版本（預設是 v1）；每筆交易、點數紀錄記下當時的版本，之後改規則不追溯 */
  function ruleVer() { return cfg().ruleVer || 1; }
  function ruleHistory() { return rd('kiteRuleVer1') || []; }
  function saveCfg(c, why) { var h = ruleHistory(), v = Math.max(c.ruleVer || 1, h[0] ? h[0].v : 1) + 1; c.ruleVer = v; h.unshift({ v: v, t: Date.now(), why: why || '改設定' }); c.cfgT = Date.now(); c.m99 = 1; c.m103 = 1; wr('kiteRuleVer1', h.slice(0, 200)); wr(K_CFG, c); if (G.__kiteCloudCfg) G.__kiteCloudCfg(); audit('改設定 → 規則 v' + v + (why ? '：' + why : '')); }
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
  function storeCampaigns(amount, storeId, t) {      // G94-B10：這筆消費實際套用了哪個加倍活動、哪條滿額加點（入帳時記下來，成效分析才準）
    var d = dayKey(t), m = { id: '', mult: 1 }, b = { id: '', add: 0 }; (cfg().storeEvents || []).forEach(function (e) { if (e.on && (!e.stores || !e.stores.length || e.stores.indexOf(storeId) >= 0) && (!e.from || d >= e.from) && (!e.to || d <= e.to) && e.mult > m.mult) m = { id: e.id, mult: e.mult }; });
    (cfg().storeBonus || []).forEach(function (x) { if (x.on && amount >= (x.minAmount || 0) && (!x.stores || !x.stores.length || x.stores.indexOf(storeId) >= 0) && (!x.from || d >= x.from) && (!x.to || d <= x.to) && x.add > b.add) b = { id: x.id, add: x.add }; }); return { ev: m.id, bonus: b.id }; }
  function storeBonusPts(amount, storeId, t) { var d = dayKey(t), best = 0; (cfg().storeBonus || []).forEach(function (b) { if (b.on && amount >= (b.minAmount || 0) && (!b.stores || !b.stores.length || b.stores.indexOf(storeId) >= 0) && (!b.from || d >= b.from) && (!b.to || d <= b.to) && b.add > best) best = b.add; }); return best; }
  function makeEarnCode(storeId, amount) {
    var s = storeById(storeId); if (!s) throw new Error('沒有這個店家');
    var pts = pointsForSpend(amount, storeId), ts = Date.now().toString(36), nonce = rid(8);
    var body = ['KITE1', 'E', storeId, amount, pts, ts, nonce].join('|'), code = body + '|' + hmac(s.key, body);
    var log = rd(K_STORE) || []; var short = shortCode(); log.unshift({ t: Date.now(), store: storeId, amount: amount, pts: pts, nonce: nonce, code: code, short: short, synced: false, rv: ruleVer() }); wr(K_STORE, log.slice(0, 1000));
    return { code: code, pts: pts, nonce: nonce, short: short };
  }
  /* C-194（D75）：8 位數字手動代碼。原型只在同一個瀏覽器（同一支手機）查得到；正式版由雲端用這 8 碼查回交易 */
  function shortCode() { var used = {}; lg(K_STORE).forEach(function (r) { if (r.short) used[r.short] = 1; }); var s; do { s = String(Math.floor(Math.random() * 1e8)).padStart(8, '0'); } while (used[s]); return s; }
  function shortByCode(code) { var x = lg(K_STORE).filter(function (r) { return r.code === code; })[0]; return x ? x.short || '' : ''; }      // D103：掃到 QR 也把 8 位代碼填進格子
  function codeByShort(s) { s = String(s || '').replace(/\D/g, ''); if (s.length !== 8) return null; var x = lg(K_STORE).filter(function (r) { return r.short === s; })[0]; return x ? x.code : null; }
  /* 贈品圖片：後台上傳裁切成 600×600 JPEG，存在 kitePrizeImg1（不跟設定綁在一起，設定讀寫才不會變慢）；沒上傳用預設圖 */
  var PRIZE_IMG0 = { P01: '../assets/prizes/P01.jpg', P02: '../assets/prizes/P02.jpg', P03: '../assets/prizes/P03.jpg', P04: '../assets/prizes/P04.jpg', P05: '../assets/prizes/P05.jpg', P06: '../assets/prizes/P06.jpg' };      // D101：GPT 10/17 測試贈品圖
  /* D101：GPT 10/17 券面（3:2）。art＝圖上已經畫了什麼：full＝店名＋折扣都有、store＝只有店名、空＝都要疊字（疊在右側安全區 x 65%～94%、y 15%～81%） */
  var COUPON_IMG0 = { C01: ['../assets/coupons/C01.jpg', 'full'], C02: ['../assets/coupons/C02.jpg', ''], C03: ['../assets/coupons/C03.jpg', ''], C04: ['../assets/coupons/C04.jpg', ''], C05: ['../assets/coupons/C05.jpg', ''], C06: ['../assets/coupons/C06.jpg', 'store'] };
  function prizeImg(pid) { var m = rd('kitePrizeImg1') || {}; return m[pid] || PRIZE_IMG0[pid] || '../travel/assets/kite_hello.png'; }
  function couponUsedCount(cid) { return lg('kiteCouponUsed1').filter(function (u) { return u.cid === cid; }).length; }
  function couponFaceHTML(e, w) { var cid = e.cid || e.id, up = (rd('kitePrizeImg1') || {})[cid], d0 = COUPON_IMG0[cid], im = up || (d0 && d0[0]), es = function (t) { return String(t || '').replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); };
    if (im) { var W = Math.round(w * 1.5), art = up ? 'full' : d0[1], ov = '';
      if (w >= 90 && art !== 'full') ov = '<span style="position:absolute;left:62%;right:5%;top:15%;bottom:19%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#5A2A0C;font-weight:900;line-height:1.15">' + (art === 'store' ? '' : '<span style="font-size:' + Math.round(w / Math.max(8, (e.store || '').length * 2.2)) + 'px;white-space:nowrap">' + es(e.store) + '</span>') + '<span style="font-size:' + Math.round(w / Math.max(4.4, String(e.face || '').length * 1.25)) + 'px;color:#D9531E;white-space:nowrap">' + es(e.face || '') + '</span></span>';
      return '<span style="position:relative;display:inline-block;flex:none;width:' + W + 'px;height:' + w + 'px;border-radius:12px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.12)"><img src="' + im + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block">' + ov + '</span>'; }
    return '<span style="display:inline-flex;flex:none;flex-direction:column;align-items:center;justify-content:center;width:' + w + 'px;height:' + w + 'px;border-radius:12px;background:linear-gradient(135deg,#F7C548,#E8833A);color:#5A2A0C;font-weight:900;line-height:1.1;text-align:center;border:2px dashed #fff;box-sizing:border-box;box-shadow:0 2px 6px rgba(0,0,0,.12)"><span style="font-size:' + Math.round(w / 4) + 'px">' + es(e.face || '券') + '</span><span style="font-size:' + Math.max(9, Math.round(w / 8)) + 'px;font-weight:700">' + es((e.store || '').slice(0, 5)) + '</span></span>'; }
  function couponImg(cid) { return (rd('kitePrizeImg1') || {})[cid] || (COUPON_IMG0[cid] ? COUPON_IMG0[cid][0] : ''); }      // D99：券圖（後台上傳，沒有就用券面樣式）
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
  /* UX 走查：掃到就先檢查（過期、已被領、作廢），不要等按領取才說不行；不入帳 */
  function earnCheck(code) {
    var p = parse(code); if (!p || p[1] !== 'E' || p.length !== 8) return { ok: false, msg: '這不是小鳶來港的集點 QR' };
    var c = cfg(), s = storeById(p[2]); if (!s || s.on === false) return { ok: false, msg: '找不到這個店家' };
    if (hmac(s.key, p.slice(0, 7).join('|')) !== p[7]) return { ok: false, msg: '無法驗證這個 QR，請重新掃一次，或請對方重新出示' };
    var t = parseInt(p[5], 36); if (Date.now() - t > c.qrExpireMin * 60000) return { ok: false, msg: '這個 QR 已過期，請店員重新出碼' };
    var sl = lg(K_STORE); if (sl.some(function (r) { return (r.voided || []).indexOf(p[6]) >= 0; })) return { ok: false, msg: 'QR 已更新，請掃新的' }; if (sl.some(function (r) { return r.nonce === p[6] && r.void; })) return { ok: false, msg: '這張 QR 已被店家作廢' }; if (sl.some(function (r) { return r.nonce === p[6] && r.recovered; })) return { ok: false, msg: '這筆已經由服務台補登入帳了' };
    var m = member(); if (m.status === 'frozen') return { ok: false, msg: '這個會員帳號暫停使用，請洽服務台' }; if (m.nonces.indexOf(p[6]) >= 0) return { ok: false, msg: '這張 QR 已經集過點了' };
    if (allMembers().some(function (o) { return o.id !== m.id && ((o.nonces || []).indexOf(p[6]) >= 0 || (o.ledger || []).some(function (e) { return e.ref === p[6] && (e.type === 'store' || e.type === 'backfill'); })); })) return { ok: false, msg: '這張 QR 已經被別的帳號集過點了，請洽店員' };      // D100：跨手機防重複（看雲端）
    return { ok: true };
  }
  function claimEarn(code) {
    var p = parse(code); if (!p || p[1] !== 'E' || p.length !== 8) return { ok: false, msg: '這不是小鳶來港的集點 QR' };
    var c = cfg(), s = storeById(p[2]); if (!s || s.on === false) return { ok: false, msg: '找不到這個店家' };
    if (hmac(s.key, p.slice(0, 7).join('|')) !== p[7]) return { ok: false, msg: '無法驗證這個 QR，請重新掃一次，或請對方重新出示' };
    var t = parseInt(p[5], 36); if (Date.now() - t > c.qrExpireMin * 60000) return { ok: false, msg: '這個 QR 已過期，請店員重新出碼' };
    var sl = lg(K_STORE); if (sl.some(function (r) { return (r.voided || []).indexOf(p[6]) >= 0; })) return { ok: false, msg: 'QR 已更新，請掃新的' }; if (sl.some(function (r) { return r.nonce === p[6] && r.void; })) return { ok: false, msg: '這張 QR 已被店家作廢' }; if (sl.some(function (r) { return r.nonce === p[6] && r.recovered; })) return { ok: false, msg: '這筆已經由服務台補登入帳了' };
    var m = member(); if (m.status === 'frozen') return { ok: false, msg: '這個會員帳號暫停使用，請洽服務台' }; if (m.nonces.indexOf(p[6]) >= 0) return { ok: false, msg: '這張 QR 已經集過點了' };
    if (allMembers().some(function (o) { return o.id !== m.id && ((o.nonces || []).indexOf(p[6]) >= 0 || (o.ledger || []).some(function (e) { return e.ref === p[6] && (e.type === 'store' || e.type === 'backfill'); })); })) return { ok: false, msg: '這張 QR 已經被別的帳號集過點了，請洽店員' };      // D100：跨手機防重複（看雲端）
    var pts = +p[4], room = c.maxStorePointsPerDay - storePointsToday(m), give = Math.max(0, Math.min(pts, room));
    m.nonces.push(p[6]); m.nonces = m.nonces.slice(-500);
    var tx0 = sl.filter(function (r) { return r.nonce === p[6]; })[0];      // 用出碼當時的規則版本（同一台裝置才查得到；跨裝置待中央）
    addLedger(m, Object.assign({ type: 'store', pts: give, store: s.id, storeName: s.name, amount: +p[3], ref: p[6], rv: tx0 && tx0.rv }, (function (cp) { var o = {}; if (cp.ev) o.cp = cp.ev; if (cp.bonus) o.cpb = cp.bonus; return o; })(storeCampaigns(+p[3], s.id, (tx0 && tx0.t) || Date.now())))); saveMember(m);
    var why = give === pts ? (pts > 0 ? 'ok' : (+p[3] < c.minSpend ? 'below' : 'zero')) : give > 0 ? 'partial' : 'quota';   // 工作單24 v5：依實際原因顯示，不把 0 點一律說成額度用完
    return { ok: true, pts: give, expected: pts, capped: give < pts, why: why, minSpend: c.minSpend, store: s.name, amount: +p[3], total: m.points, ref: p[6] };
  }

  /* ====== 遊戲分數 ====== */
  function eventMult(game, t) {
    var d = new Date(t || Date.now()), hm = pad(d.getHours()) + ':' + pad(d.getMinutes()), best = 1, title = '', id = '';
    var dk = dayKey(d.getTime());
    cfg().events.forEach(function (e) { if (e.on && (e.game === game || e.game === 'all') && (e.days || []).indexOf(d.getDay()) >= 0 && hm >= e.from && hm <= e.to && (!e.dateFrom || dk >= e.dateFrom) && (!e.dateTo || dk <= e.dateTo) && e.mult > best) { best = e.mult; title = e.title; id = e.id; } });
    return { mult: best, title: title, id: id };
  }
  /* D97／D98：每日累計總分階梯 */
  function tierPts(total) { var p = 0; (cfg().gameTiers || []).forEach(function (r) { if (total >= r[0] && r[1] > p) p = r[1]; }); return p; }
  function nextTier(total) { var t = (cfg().gameTiers || []).filter(function (r) { return r[0] > total; }).sort(function (a, b) { return a[0] - b[0]; })[0]; return t ? { need: t[0] - total, at: t[0], pts: t[1] } : null; }
  function gameToday(m, day) {      // 今天算分的局：總分、基礎點、活動加送點、已入帳的點
    m = m || member(); var d = day || dayKey(), c = cfg(), total = 0, base = 0, bonusF = 0, maxM = 1;
    /* G-73：活動只加送「活動時段內新增的基礎點」×(倍數−1)，不回頭翻倍活動前已拿的點；照時間順序一局一局累計 */
    (m.plays || []).filter(function (p) { return p.counted && dayKey(p.t) === d; }).sort(function (a, b) { return a.t - b.t; }).forEach(function (p) {
      var raw = p.raw != null ? p.raw : Math.round((p.bank || 0) / (p.mult || 1)), mu = p.mult || 1, nb;
      total += raw; nb = tierPts(total); if (mu > 1) bonusF += (mu - 1) * (nb - base); base = nb; if (mu > maxM) maxM = mu;
    });
    var cap = Math.round((c.gameDailyCap || 0) * (c.eventCapMult ? maxM : 1)), bonus = Math.floor(bonusF + 1e-9), pts = Math.min(cap, base + bonus);
    var got = (m.ledger || []).filter(function (e) { return e.type === 'game' && e.day === d; }).reduce(function (n, e) { return n + e.pts; }, 0);
    var nx = pts >= cap ? null : nextTier(total);
    var dd = new Date(d + 'T12:00:00'), tm = 1; (c.events || []).forEach(function (e) { if (e.on && (e.days || []).indexOf(dd.getDay()) >= 0 && (!e.dateFrom || d >= e.dateFrom) && (!e.dateTo || d <= e.dateTo) && e.mult > tm) tm = e.mult; });
    var capMax = c.eventCapMult ? Math.max(cap, Math.round((c.gameDailyCap || 0) * tm)) : cap;      // D99：今天有加倍活動時，上限最多可到幾點（給畫面提示）
    return { total: total, base: base, bonus: bonus, pts: pts, got: got, cap: cap, capMax: capMax, next: nx, claim: Math.max(0, pts - got) };
  }
  function triesLeft(game, level) { var c = cfg(), m = member(), k = dayKey() + '|' + game + '|' + level, n = c.gameTries[game] != null ? c.gameTries[game] : c.triesPerLevel; return Math.max(0, n - ((m.tries || {})[k] || 0)); }
  function reportPlay(o) {      // o = { game, level, score, sec }
    var m = member(), k = dayKey() + '|' + o.game + '|' + o.level; m.tries = m.tries || {};
    var gc = (cfg().games || {})[o.game] || {}, sc = Math.max(0, o.score || 0), capped = gc.maxScore && sc > gc.maxScore; if (capped) sc = gc.maxScore;
    var counted = m.status !== 'frozen' && gc.on !== false && triesLeft(o.game, o.level) > 0, ev = eventMult(o.game), add = counted ? Math.round(sc * ev.mult) : 0;
    m.tries[k] = (m.tries[k] || 0) + 1;
    var tier = cfg().gamePointMode === 'tier';
    m.plays.unshift({ t: Date.now(), game: o.game, level: String(o.level), score: o.score || 0, capped: !!capped, sec: Math.round(o.sec || 0), counted: counted, mult: ev.mult, cp: ev.id || undefined, raw: counted ? sc : 0, bank: tier ? 0 : add }); m.plays = m.plays.slice(0, 800);
    if (!tier) { m.scoreBank[o.game] = (m.scoreBank[o.game] || 0) + add; saveMember(m); return { counted: counted, add: add, mult: ev.mult, event: ev.title, bank: m.scoreBank[o.game], left: triesLeft(o.game, o.level) }; }
    /* D97：階梯制——把今天累計的點數補到應得的數字（只增不減，當天上限內） */
    var tap = cfg().gameClaim === 'tap', g = gameToday(m), gain = Math.max(0, g.pts - g.got), lit = 0;
    if (tap) { m.litT = m.litT || {}; lit = Math.max(0, g.pts - (m.litT[dayKey()] || 0)); m.litT = {}; m.litT[dayKey()] = g.pts; gain = 0; }      // D102：點亮制，這局只是點亮格子，到小鳶樂園點一下才入帳
    else if (gain > 0) addLedger(m, { type: 'game', pts: gain, game: o.game, day: dayKey(), note: '今日累計 ' + g.total + ' 分' });
    saveMember(m);
    return { tier: true, tap: tap, counted: counted, add: counted ? sc : 0, mult: ev.mult, event: ev.title, today: g.total, pts: g.pts, gain: gain, lit: lit, claim: tap ? Math.max(0, g.pts - g.got) : 0, cap: g.cap, next: g.next, total: m.points, left: triesLeft(o.game, o.level) };
  }
  /* D102：小鳶樂園點亮的格子點一下入帳（n＝要領幾點，不給就全部領）；點數記在今天分數最多的遊戲名下，報表才分得出來 */
  function topGame(m, d) { var by = {}; (m.plays || []).forEach(function (p) { if (p.counted && dayKey(p.t) === d) by[p.game] = (by[p.game] || 0) + (p.raw || 0); }); return Object.keys(by).sort(function (a, b) { return by[b] - by[a]; })[0] || 'fish'; }
  function claimGame(n) {
    var m = member(); if (m.status === 'frozen') return { ok: false, msg: '會員帳號目前暫停使用，請到一樓服務台詢問' };
    settleGame(m); var g = gameToday(m), d = dayKey(); if (g.claim <= 0) { saveMember(m); return { ok: false, msg: '目前沒有可領的點數，看看今天的進度再玩一局吧' }; }
    var k = Math.max(1, Math.min(n || g.claim, g.claim));
    addLedger(m, { type: 'game', pts: k, game: topGame(m, d), day: d, note: '小鳶樂園領取（今日累計 ' + g.total + ' 分）' }); saveMember(m);
    return { ok: true, pts: k, left: g.claim - k, got: g.got + k, total: m.points };
  }
  /* 前幾天點亮了卻沒來領的，自動補進帳（不讓客人因為忘記點而吃虧）；只看最近 14 天 */
  function settleGame(m0) {
    var m = m0 || member(), d0 = dayKey(), lim = dayKey(Date.now() - 14 * 86400000), days = {}, n = 0;
    if (cfg().gameClaim !== 'tap' || m.status === 'frozen') return 0;
    (m.plays || []).forEach(function (p) { var d = dayKey(p.t); if (p.counted && d < d0 && d >= lim) days[d] = 1; });
    Object.keys(days).sort().forEach(function (d) { var g = gameToday(m, d); if (g.claim > 0) { addLedger(m, { type: 'game', pts: g.claim, game: topGame(m, d), day: d, note: d + ' 點亮未領，自動入帳' }); n += g.claim; } });
    if (n && !m0) saveMember(m); return n;
  }
  function perPoint(game) { var c = cfg(); return c.gameScorePerPoint[game] || c.scorePerPoint; }
  function convertScore(game) {      // 分數存摺換點：每滿 perPoint 分換 1 點，零頭留著
    var m = member(), per = perPoint(game), bank = m.scoreBank[game] || 0, pts = Math.floor(bank / per); if (pts <= 0) return { ok: false, msg: '還差 ' + (per - bank) + ' 分才能換 1 點' };
    m.scoreBank[game] = bank - pts * per; addLedger(m, { type: 'game', pts: pts, game: game, used: pts * per }); saveMember(m); return { ok: true, pts: pts, total: m.points };
  }


  /* ====== D104（Dari 10/17）：排行榜。捕魚三個時段、飛行四關各自前 10 名；小鳶去旅行比收藏 ======
     自己的資料看 plays；別人的資料是雲端給的精簡版（lb：每關 [全部最高, 本月最高, 月份]，tstat：旅行收藏） */
  function lbBest(m, key, period) {
    var mk = monthKey(), g = key.split('|');
    if (m.plays && m.plays.length) { var b = 0; m.plays.forEach(function (p) { if (p.game === g[0] && String(p.level) === g[1] && (p.counted !== false || p.lbOnly) && (period !== 'month' || monthKey(p.t) === mk)) b = Math.max(b, p.score || 0); }); return b; }
    var v = (m.lb || {})[key]; if (!v) return 0; return period === 'month' ? (v[2] === mk ? v[1] || 0 : 0) : v[0] || 0;
  }
  /* G76（GPT 建議，Claude 10/17 採用）：排行榜用獨立的公開化名，不用 LINE 名字或會員尾碼；可選不出現在公開名單（仍照算名次，別人看到的名次會跳號） */
  var LB_A = ['港邊', '雨都', '愛笑', '勇敢', '好奇', '閃亮', '元氣', '微風', '慢慢', '晴天'], LB_B = ['小卷', '鯨鯊', '海龜', '螃蟹', '小鳶', '章魚', '海鷗', '河豚', '海星', '小丑魚'];
  function lbAutoAlias(id) { var h = 2166136261; String(id || '').split('').forEach(function (c) { h = Math.imul(h ^ c.charCodeAt(0), 16777619); }); h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13; h = h >>> 0; return LB_A[h % 10] + LB_B[Math.floor(h / 10) % 10] + ' ' + String(10 + Math.floor(h / 100) % 90); }
  /* D112（Dari 10/18）：排行榜化名擋不雅字詞與冒充官方。先把空白、符號、全形去掉再比對，避免「幹 你」「f.u.c.k」這種繞法；
     顯示時也再檢查一次，所以之後清單加字，舊的名字會自動換回系統化名。不告訴使用者是哪個字被擋。清單要加減直接改這兩行 */
  var BAD_WORDS = ['幹你', '幹您', '幹林', '干你', '干您', '干林', '操你', '操妳', '操他', '操她', '操機', '肏', '靠北', '靠杯', '靠邀', '靠夭', '靠腰', '機掰', '雞掰', '機歪', '雞歪', '機八', '雞八', '機巴', '雞巴', '屌', '屄', '婊', '賤人', '賤貨', '妓女', '智障', '白癡', '白痴', '低能', '腦殘', '弱智', '去死', '死全家', '王八', '畜生', '畜牲', '廢物', '人渣', '媽的', '他媽', '你媽', '尼瑪', '娘的', '三小', '尛', '洨', '懶叫', '卵叫', '屁眼', '陰莖', '陰道', '陽具', '做愛', '性交', '強姦', '強暴', '淫', '色情', '裸體', '奶頭', '雞雞', '支那', '黑鬼', '大麻', '安非他命', '幹', 'fuck', 'fuk', 'fck', 'shit', 'bitch', 'cunt', 'dick', 'pussy', 'asshole', 'nigger', 'nigga', 'fag', 'porn', 'sex', 'rape', 'wtf', 'stfu', 'motherf'],
      OFFICIAL_WORDS = ['官方', '客服', '管理員', '管理者', '系統', '叁肆行', '東三東四', '小鳶本人', 'admin', 'staff'];
  function nameKey(s) {
    s = String(s || '').normalize ? String(s || '').normalize('NFKC') : String(s || '');
    s = s.toLowerCase().replace(/[0-9@$!|]/g, function (c) { return { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i', '|': 'i' }[c] || c; });
    return s.replace(/[^a-z㐀-鿿豈-﫿]/g, '');
  }
  function nameBad(a) {      // 回傳 ''＝可以；否則是要給使用者看的提示
    var k = nameKey(a).replace(/能幹|幹勁|骨幹|樹幹|幹部|才幹|主幹|幹練|苦幹|實幹/g, ''); if (!k) return '';
    for (var i = 0; i < BAD_WORDS.length; i++) if (k.indexOf(nameKey(BAD_WORDS[i])) >= 0) return '名字裡有不適合的字詞，換一個吧';
    for (var j = 0; j < OFFICIAL_WORDS.length; j++) if (k.indexOf(nameKey(OFFICIAL_WORDS[j])) >= 0) return '不能用看起來像官方的名字，換一個吧';
    return '';
  }
  function lbName(m) { return m.lbAlias && !nameBad(m.lbAlias) ? String(m.lbAlias).slice(0, 10) : lbAutoAlias(m.id); }
  function lbMe() { var m = member(); return { alias: lbName(m), custom: !!m.lbAlias, hide: !!m.lbHide }; }
  function setLbMe(o) { var m = member(); if (o.alias != null) { var a = String(o.alias).replace(/[\s　]+/g, ' ').trim().slice(0, 10); if (/\d{6,}|@/.test(a)) return { ok: false, msg: '化名裡不要放電話或 email' }; var bad = nameBad(a); if (bad) return { ok: false, msg: bad }; m.lbAlias = a; } if (o.hide != null) m.lbHide = !!o.hide; saveMember(m); return { ok: true }; }
  function lbRank(rows, val, n) {      // 同分同名次（1、2、2、4）；前 n 名含最後名次的所有同分者；選擇不公開的人照算名次但不列出
    rows.forEach(function (r, i) { r.rank = i && val(r) === val(rows[i - 1]) ? rows[i - 1].rank : i + 1; });
    var mine = rows.filter(function (r) { return r.me; })[0] || null;
    return { top: rows.filter(function (r) { return r.rank <= (n || 10) && (!r.hide || r.me); }), mine: mine, total: rows.length, hidden: rows.some(function (r) { return r.hide && !r.me && r.rank <= (n || 10); }) };
  }
  function reportMini(game, score) {      // D123：合成港、疊貨櫃只進排行榜（不換點、不佔次數、不算總分）
    var m = member(); m.plays = m.plays || []; m.plays.unshift({ t: Date.now(), game: game, level: 'all', score: Math.max(0, Math.round(score || 0)), counted: false, lbOnly: true, raw: 0, bank: 0 }); m.plays = m.plays.slice(0, 800); saveMember(m); if (cloudStatus().url && typeof cloudPush === 'function') try { cloudPush(); } catch (e) {}
  }
  function leaderboard(game, level, period, n) {
    var me = (rd(K_MEM) || {}).id, key = game + '|' + level, rows = [];
    allMembers().forEach(function (m) { if (m.status === 'frozen') return; var sc = lbBest(m, key, period); if (sc > 0) rows.push({ id: m.id, name: lbName(m), hide: !!m.lbHide, score: sc, tot: lbSum(m, period), me: m.id === me }); });
    rows.sort(function (a, b) { return b.score - a.score || b.tot - a.tot; });      // D120（Dari 10/19）：同分時累積總分高的排前面（總分也一樣才同名次）
    return lbRank(rows, function (r) { return r.score + '|' + r.tot; }, n);
  }
  function setTravelStat(o) { var m = member(), old = m.tstat || {}; m.tstat = { cards: o.cards || 0, sv: o.sv || 0, trips: o.trips || 0, t: Date.now(), ct: (o.cards || 0) > (old.cards || 0) ? Date.now() : old.ct || old.t || Date.now() }; saveMember(m); }
  function travelBoard(n) {      // G76：只比收藏到的不同明信片張數，一樣多就並列（同名次內先達成的排前面，只是顯示順序）
    var me = (rd(K_MEM) || {}).id, rows = [];
    allMembers().forEach(function (m) { var t = m.tstat; if (m.status === 'frozen' || !t || !t.cards) return; rows.push({ id: m.id, name: lbName(m), hide: !!m.lbHide, cards: t.cards || 0, sv: t.sv || 0, trips: t.trips || 0, t: t.ct || t.t || 0, me: m.id === me }); });
    rows.sort(function (a, b) { return b.cards - a.cards || a.t - b.t; });
    return lbRank(rows, function (r) { return r.cards; }, n);
  }
  /* D105（Dari 10/17 17:11）：累積總分排行——捕魚＋飛行所有關卡「算分場次」的分數合計 */
  function lbSum(m, period) {
    var mk = monthKey();
    if (m.plays && m.plays.length) return m.plays.reduce(function (n, p) { return (p.game === 'fish' || p.game === 'fly') && p.counted !== false && (period !== 'month' || monthKey(p.t) === mk) ? n + (p.score || 0) : n; }, 0);
    var v = (m.lb || {}).__sum; if (!v) return 0; return period === 'month' ? (v[2] === mk ? v[1] || 0 : 0) : v[0] || 0;
  }
  function sumBoard(period, n) {
    var me = (rd(K_MEM) || {}).id, rows = [];
    allMembers().forEach(function (m) { if (m.status === 'frozen') return; var sc = lbSum(m, period); if (sc > 0) rows.push({ id: m.id, name: lbName(m), hide: !!m.lbHide, score: sc, me: m.id === me }); });
    rows.sort(function (a, b) { return b.score - a.score; });
    return lbRank(rows, function (r) { return r.score; }, n);
  }
  function fmtScore(v) {      // D105→D120（Dari 10/19「不要千萬，百萬再來億」）：一萬以上「萬」、一百萬以上「百萬」、一億以上「億」，到小數一位（無條件捨去）
    v = +v || 0; var f = function (u, t) { return (Math.floor(v / u * 10) / 10).toFixed(1) + t; };
    return v >= 1e8 ? f(1e8, '億') : v >= 1e6 ? f(1e6, '百萬') : v >= 1e4 ? f(1e4, '萬') : v.toLocaleString();
  }
  function lbSync() {      // 排行資料狀態：local＝沒接雲端；old＝雲端還沒更新到 v5（別人的成績拿不到）；ok
    var c = cloudStatus(); if (!c.url) return { st: 'local' };
    var others = allMembers().filter(function (m) { return !m.plays; }); if (!others.length) return { st: 'ok', t: c.lastPull };
    return { st: others.some(function (m) { return 'lb' in m || 'tstat' in m; }) ? 'ok' : 'old', t: c.lastPull };
  }
  /* ====== D98：小鳶去旅行帶回的伴手禮（點數、券） ====== */
  function monthKey(t) { return dayKey(t).slice(0, 7); }
  function travelPtsThisMonth(m) { var mk = monthKey(); return (m.ledger || []).filter(function (e) { return e.type === 'travel' && monthKey(e.t) === mk; }).reduce(function (n, e) { return n + e.pts; }, 0); }
  function couponIssued() { var o = rd('kiteCouponIssued1') || {}, mk = monthKey(), loc = o[mk] || {}, g = {}; allMembers().forEach(function (m) { (m.coupons || []).forEach(function (x) { if (monthKey(x.t) === mk) g[x.cid] = (g[x.cid] || 0) + 1; }); }); Object.keys(loc).forEach(function (k) { g[k] = Math.max(g[k] || 0, loc[k]); }); return g; }
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
    var myC = (m.coupons || []).filter(function (x) { return monthKey(x.t) === monthKey(); }).length;
    if (!out.pts && cs.length && myC < (c.couponMemberMonth == null ? 2 : c.couponMemberMonth)) { var rr = rnd(), acc = 0; for (var j = 0; j < cs.length; j++) { acc += cs[j].chance || 0; if (rr < acc) { out.coupon = grantCoupon(m, cs[j]); break; } } }      // G-73：一趟只帶回點數或券其中一種；D99：多張券合併抽一次，每人每月有上限
    saveMember(m); return out;
  }
  function grantCoupon(m, cp) {
    var id = rid(6), exp = Date.now() + (cp.validDays || 14) * 86400000, body = ['KITE1', 'C', m.id, cp.id, exp.toString(36), id].join('|'), code = body + '|' + hmac(cfg().redeemKey, body);
    m.coupons = m.coupons || []; var o = { id: id, cid: cp.id, name: cp.name, store: couponStoreName(cp), storeId: cp.storeId || '', face: cp.face || '', desc: cp.desc || '', t: Date.now(), exp: exp, code: code, status: 'ok' }; m.coupons.unshift(o);
    var all = rd('kiteCouponIssued1') || {}, mk = monthKey(); all[mk] = all[mk] || {}; all[mk][cp.id] = (all[mk][cp.id] || 0) + 1; wr('kiteCouponIssued1', all);
    return o;
  }
  function myCoupons() { var m = member(), ch = false, used = {}; lg('kiteCouponUsed1').forEach(function (u) { used[u.id] = u.t; }); (m.coupons || []).forEach(function (x) { if (x.status === 'ok' && used[x.id]) { x.status = 'used'; x.usedT = used[x.id]; ch = true; } else if (x.status === 'ok' && Date.now() > x.exp) { x.status = 'expired'; ch = true; } }); /* UX 走查：店家在別台工作機核銷，雲端同步回來就變「已使用」 */ if (ch) saveMember(m); return m.coupons || []; }
  /* D120（Dari 10/19「每張券只能使用一次，不能跨店，後台要可以設定某券使用在哪一間店」）：券在後台綁一間店（storeId），只有那間店登入的核銷頁能用 */
  function couponStoreName(cp) { var st = cp && cp.storeId && storeById(cp.storeId); return st ? st.name : (cp && cp.store) || ''; }
  function couponCheck(code, sid) {
    var p = parse(code), c = cfg(); if (!p || p[1] !== 'C' || p.length !== 7) return { ok: false, msg: '這不是券的 QR' };
    if (hmac(c.redeemKey, p.slice(0, 6).join('|')) !== p[6]) return { ok: false, msg: '無法驗證這個 QR，請重新掃一次，或請對方重新出示' };
    var cp = (c.coupons || []).filter(function (x) { return x.id === p[3]; })[0], exp = parseInt(p[4], 36);
    var used = lg('kiteCouponUsed1').filter(function (u) { return u.id === p[5]; })[0]; if (used) return { ok: false, msg: '這張券已於 ' + new Date(used.t).toLocaleString('zh-TW', { hour12: false }) + ' 使用過' };
    if (Date.now() > exp) return { ok: false, msg: '這張券已過期（' + new Date(exp).toLocaleDateString('zh-TW') + '）' };
    var sn = couponStoreName(cp);
    if (cp && cp.storeId && sid !== undefined && sid !== cp.storeId) { var here = sid && storeById(sid); return { ok: false, wrongStore: true, msg: '這張券只能在「' + sn + '」使用' + (here ? '，這裡是「' + here.name + '」' : '') + '，不能跨店核銷' }; }
    return { ok: true, member: p[2], id: p[5], cid: p[3], name: cp ? cp.name : p[3], desc: cp ? cp.desc : '', store: sn, storeId: cp ? cp.storeId || '' : '', face: cp ? cp.face || '' : '', exp: exp };
  }
  function couponUse(code, who, store) {
    var r = couponCheck(code, store || ''); if (!r.ok) return r;
    var u = rd('kiteCouponUsed1') || []; u.unshift({ id: r.id, cid: r.cid, member: r.member, t: Date.now(), who: who || '', store: store || '' }); wr('kiteCouponUsed1', u.slice(0, 2000));
    var lm = rd(K_MEM); if (lm && lm.id === r.member) { (lm.coupons || []).forEach(function (x) { if (x.id === r.id) { x.status = 'used'; x.usedT = Date.now(); } }); wr(K_MEM, lm); }
    audit('核銷券 ' + r.id + '（' + r.name + '）會員 ' + r.member); return r;
  }

  /* ====== 兌換 ======
     客人在手機選贈品 → 先扣點，產生兌換 QR → 服務台掃描確認發放。
     格式：KITE1|R|會員|贈品|點數|時間|兌換碼|簽章 */
  function prizeById(id) { return cfg().prizes.filter(function (p) { return p.id === id; })[0]; }
  function issuedCount(pid) { var n = 0; lg(K_DESK).forEach(function (r) { if (r.prize === pid) n += r.qty || 1; }); return n; }      // D103：一張兌換單可以有好幾份
  function reservedCount(pid) { var n = 0, issued = {}; lg(K_DESK).forEach(function (r) { issued[r.rcode] = 1; }); allMembers().forEach(function (m) { (m.redeems || []).forEach(function (r) { if (r.prize === pid && r.status === 'wait' && !issued[r.id]) n += r.qty || 1; }); }); return n; }
  function adjSum(pid) { var n = 0; lg('kiteStockAdj1').forEach(function (a) { if (a.pid === pid) n += a.qty; }); return n; }
  function onHand(pid) { var p = prizeById(pid); return p ? Math.max(0, p.stock + adjSum(pid) - issuedCount(pid)) : 0; }      // 實物現存＝總數（期初＋補貨）＋核准調整－已交付（工作單 24 v3）
  function gap(pid) { return Math.max(0, reservedCount(pid) - onHand(pid)); }      // 保留缺口：實物少於已保留，暫停新兌換、轉待處理
  function stockLeft(pid) { return gap(pid) > 0 ? 0 : Math.max(0, onHand(pid) - reservedCount(pid)); }      // 可兌換＝實物現存－已保留（工作單 01 v5：建單時扣點並保留庫存）
  /* D103（Dari 10/17）：一次可以換好幾份。上限＝庫存、點數、每人限換剩下的份數三者取最小，沒有每人限換時最多一次 10 份 */
  function perUserLeft(pid, m) { var p = prizeById(pid); m = m || member(); if (!p || !p.perUser) return Infinity; var today = dayKey(), per = p.perUserPer || 'all', inPer = function (r) { return per === 'day' ? dayKey(r.t) === today : per === 'month' ? monthKey(r.t) === monthKey() : true; };
    var used = 0; (m.redeems || []).forEach(function (r) { if (r.prize === pid && r.status !== 'cancel' && r.status !== 'expired' && inPer(r)) used += r.qty || 1; }); return Math.max(0, p.perUser - used); }
  function maxQty(pid, m) { var p = prizeById(pid); m = m || member(); if (!p || !p.points) return 0; return Math.max(0, Math.min(stockLeft(pid), Math.floor((m.points || 0) / p.points), perUserLeft(pid, m), cfg().redeemQtyMax || 10)); }
  function makeRedeem(pid, qty) {
    var p = prizeById(pid), m = member(); qty = Math.max(1, Math.floor(+qty || 1)); if (!p || p.on === false) return { ok: false, msg: '這個贈品目前不能換' };
    if (stockLeft(pid) <= 0) return { ok: false, msg: '這個贈品換完了' };
    if (stockLeft(pid) < qty) return { ok: false, msg: '這個贈品只剩 ' + stockLeft(pid) + ' 份' };
    if (m.status === 'frozen') return { ok: false, msg: '這個會員帳號暫停使用，請洽服務台' };
    var blk = redeemBlock(pid, m); if (blk) return { ok: false, msg: blk };
    if (perUserLeft(pid, m) < qty) return { ok: false, msg: '這個贈品每人限換 ' + p.perUser + ' 份，你最多還能換 ' + perUserLeft(pid, m) + ' 份' };
    var cost = p.points * qty; if (m.points < cost) return { ok: false, msg: '點數不夠，還差 ' + (cost - m.points) + ' 點' };
    var rcode = rid(6), ts = Date.now().toString(36), body = ['KITE1', 'R', m.id, p.id, cost, ts, rcode].join('|'), code = body + '|' + hmac(cfg().redeemKey, body);
    addLedger(m, { type: 'redeem', pts: -cost, prize: p.id, prizeName: p.name + (qty > 1 ? ' ×' + qty : ''), qty: qty, ref: rcode });
    m.redeems.unshift({ id: rcode, prize: p.id, name: p.name, pts: cost, qty: qty, t: Date.now(), code: code, status: 'wait' }); saveMember(m);
    return { ok: true, code: code, rcode: rcode, prize: p, qty: qty, total: m.points };
  }
  /* D82：兌換資格（不含點數與庫存）。取消或逾期退點的單不算在每天次數與每人限換裡 */
  function redeemBlock(pid, m) {
    var p = prizeById(pid); m = m || member(); if (!p) return '找不到這個贈品';
    var c0 = cfg(), today = dayKey(), act = (m.redeems || []).filter(function (r) { return r.status !== 'cancel' && r.status !== 'expired'; });
    if (p.from && today < p.from) return '這個贈品 ' + p.from.slice(5).replace('-', '/') + ' 才開始兌換';
    if (p.to && today > p.to) return '這個贈品的兌換期間已經結束';
    var per = p.perUserPer || 'all', PN = { day: '每天', month: '每月', all: '' }[per] || '', inPer = function (r) { return per === 'day' ? dayKey(r.t) === today : per === 'month' ? monthKey(r.t) === monthKey() : true; };
    if (p.perUser && perUserLeft(p.id, m) <= 0) return '這個贈品每人' + PN + '限換 ' + p.perUser + ' 份，你' + (PN ? PN.slice(1) === '天' ? '今天' : '這個月' : '') + '已經換過了';
    if (c0.redeemPerDay && act.filter(function (r) { return dayKey(r.t) === today; }).length >= c0.redeemPerDay) return '今天已經兌換 ' + c0.redeemPerDay + ' 次了，明天再來';
    return '';
  }
  function cancelRedeem(rcode) {
    var m = member(), r = m.redeems.filter(function (x) { return x.id === rcode; })[0]; if (!r || r.status !== 'wait') return false;
    r.status = 'cancel'; addLedger(m, refundEntry(m, r, {})); saveMember(m); return true;
  }
  function deskCheck(code) {
    var p = parse(code), c = cfg(); if (!p || p[1] !== 'R' || p.length !== 8) return { ok: false, msg: '這不是兌換 QR' };
    if (hmac(c.redeemKey, p.slice(0, 7).join('|')) !== p[7]) return { ok: false, msg: '無法驗證這個 QR，請重新掃一次，或請對方重新出示' };
    var pr = prizeById(p[3]); if (!pr) return { ok: false, msg: '找不到這個贈品' };
    var log = lg(K_DESK); var got = log.filter(function (r) { return r.rcode === p[6]; })[0]; if (got) return { ok: false, msg: '此單已於 ' + new Date(got.t).toLocaleString('zh-TW', { hour12: false }) + ' 完成領取，請勿再次發放' };
    var lm = rd(K_MEM), lr = lm && lm.id === p[2] && (lm.redeems || []).filter(function (x) { return x.id === p[6]; })[0];      // D82：同一台裝置能看到客人那邊時，已取消／逾期的單不能再發
    if (lr && (lr.status === 'cancel' || lr.status === 'expired')) return { ok: false, msg: '這張兌換單已' + (lr.status === 'cancel' ? '被客人取消' : '逾期自動取消') + '，點數已退回，不能發放' };
    var t = parseInt(p[5], 36), late = Date.now() - t > c.redeemExpireMin * 60000;
    /* G60-01：超過領取保留期限的單不能發放（匯入資料、沒重開客人頁的舊單也一樣擋）；同一台的客人資料順便做到期退點 */
    if (c.redeemHoldDays && Date.now() - t > c.redeemHoldDays * 86400000) { if (lm && lm.id === p[2]) member(); return { ok: false, msg: '這張兌換單已超過 ' + c.redeemHoldDays + ' 天領取期限（' + new Date(t + c.redeemHoldDays * 86400000).toLocaleString('zh-TW', { hour12: false }) + ' 到期），不能發放；點數會自動退回，請客人重新兌換' }; }
    var fr = lr || (findRedeem(p[6]) || {}).r, qty = (fr && fr.qty) || Math.max(1, Math.round(+p[4] / (pr.points || +p[4] || 1)));      // D103：幾份（找得到單就用單上的，找不到用點數推）
    return { ok: true, member: p[2], prize: pr, pts: +p[4], qty: qty, rcode: p[6], t: t, late: late, stock: onHand(pr.id), reserved: reservedCount(pr.id) };
  }
  /* D84：服務台用 6 碼兌換碼查詢、待領取清單（只看得到這台＋匯入的資料，D72） */
  function findRedeem(rc) { rc = String(rc || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (rc.length !== 6) return null; var hit = null; allMembers().forEach(function (m) { (m.redeems || []).forEach(function (r) { if (!hit && r.id === rc) hit = { m: m, r: r }; }); }); return hit; }
  function pendingRedeems() { var issued = {}, out = []; lg(K_DESK).forEach(function (r) { issued[r.rcode] = 1; }); allMembers().forEach(function (m) { (m.redeems || []).forEach(function (r) { if (r.status === 'wait' && !issued[r.id]) out.push({ m: m, r: r }); }); }); return out.sort(function (a, b) { return a.r.t - b.r.t; }); }
  /* D84：客人 QR 壞掉／手機沒電時，後台手動標記已領（記在服務台發放紀錄，manual＝true，寫操作紀錄） */
  function markGiven(rc, staff, why) {
    why = String(why || '').trim(); if (!why) return { ok: false, msg: '請填原因（例如：客人手機沒電，已核對姓名與兌換碼）' };      // G60-07
    var h = findRedeem(rc); if (!h) return { ok: false, msg: '這台查不到這張兌換單' };
    if (h.r.status !== 'wait') return { ok: false, msg: '這張兌換單不是待領取狀態' };
    var hd = cfg().redeemHoldDays; if (hd && Date.now() - h.r.t > hd * 86400000) return { ok: false, msg: '這張兌換單已超過 ' + hd + ' 天領取期限，不能標記已領' };
    if (lg(K_DESK).some(function (x) { return x.rcode === h.r.id; })) return { ok: false, msg: '這張已經發放過了' }; var log = rd(K_DESK) || [];
    if (onHand(h.r.prize) <= 0) return { ok: false, msg: '實物沒有了，請先補貨' };
    log.unshift({ t: Date.now(), rcode: h.r.id, member: h.m.id, prize: h.r.prize, prizeName: h.r.name, pts: h.r.pts, qty: h.r.qty || 1, staff: staff || '後台', manual: true, note: why || '' }); wr(K_DESK, log);
    var m = rd(K_MEM); if (m && m.id === h.m.id) { m.redeems.forEach(function (x) { if (x.id === h.r.id) x.status = 'done'; }); wr(K_MEM, m); }
    audit('後台手動標記已領 ' + h.r.id + '（' + h.r.name + '，會員 ' + h.m.id + '）' + (why ? '：' + why : '')); return { ok: true };
  }
  function memberName(id) { var m = allMembers().filter(function (x) { return x.id === id; })[0]; return m && m.name ? m.name : ''; }
  function deskGive(code, staff) {
    var r = deskCheck(code); if (!r.ok) return r; if (onHand(r.prize.id) < r.qty) return { ok: false, msg: onHand(r.prize.id) ? '實物只剩 ' + onHand(r.prize.id) + ' 份，這張要 ' + r.qty + ' 份，請管理員處理' : '實物沒有了，請管理員處理' };
    var log = rd(K_DESK) || []; log.unshift({ t: Date.now(), rcode: r.rcode, member: r.member, prize: r.prize.id, prizeName: r.prize.name, pts: r.pts, qty: r.qty, staff: staff || '' }); wr(K_DESK, log);
    var m = rd(K_MEM); if (m && m.id === r.member) { m.redeems.forEach(function (x) { if (x.id === r.rcode) x.status = 'done'; }); wr(K_MEM, m); }      // 同一支手機測試時直接更新客人那邊
    return { ok: true, prize: r.prize, rcode: r.rcode, qty: r.qty };
  }

  /* ====== 例行整理：兌換單逾期自動取消退點、點數到期（每次打開會員資料時跑） ====== */
  function housekeep(m) {
    var c = cfg(), now = Date.now(), changed = false;
    (m.redeems || []).forEach(function (r) { if (r.status === 'wait' && c.redeemHoldDays && now - r.t > c.redeemHoldDays * 86400000) { r.status = 'expired'; addLedger(m, refundEntry(m, r, { note: '逾期未領自動取消' })); changed = true; } });
    var exp = expiring(m, 0); if (exp.due > 0) { addLedger(m, { type: 'expire', pts: -Math.min(exp.due, m.points), note: '點數到期' }); changed = true; }
    return changed;
  }
  function batchEnd(t0) { var c = cfg(); return c.expireMode === 'never' ? 0 : c.expireMode === 'year' ? new Date(new Date(t0).getFullYear(), 11, 31, 23, 59, 59).getTime() : c.expireMode === 'months' ? (function (d) { d.setMonth(d.getMonth() + (c.pointsExpireMonths || 12)); return d.getTime(); })(new Date(t0)) : (c.pointsExpireDays === 0 ? 0 : t0 + (c.pointsExpireDays || 365) * 86400000); }
  function batches(m, ledger) {      // 先到期先扣：每一批得到的點數還剩多少、什麼時候到期（end＝0 代表不會到期）
    var gains = [], spent = 0;
    (ledger || m.ledger || []).slice().reverse().forEach(function (e) {
      if (e.type === 'refund' && e.until != null) gains.push({ t: e.t, pts: e.pts, left: e.pts, type: 'refund', src: '退點', end: e.until });      // D120：新的退點自成一批，有自己的到期日
      else if (e.pts > 0 && e.type !== 'refund') gains.push({ t: e.t, pts: e.pts, left: e.pts, type: e.type, src: e.storeName || e.game || e.note || '', end: batchEnd(e.t) });
      else if (e.pts < 0) spent += -e.pts; else if (e.type === 'refund') spent -= e.pts;      // 舊的退點（D120 以前）照舊：退回最早那批
    });
    var key = function (g) { return g.end || 9e15; };
    gains.map(function (g, i) { return [g, i]; }).sort(function (a, b) { return key(a[0]) - key(b[0]) || a[1] - b[1]; }).forEach(function (x) { var g = x[0], u = Math.min(g.left, Math.max(0, spent)); g.left -= u; spent -= u; });
    return gains.filter(function (g) { return g.left > 0; });
  }
  /* D120（Dari 10/19「退點補救你想一想」）：取消或逾期退回的點數自成一批，到期日取「原本那批的到期日」和「退點當天＋refundGraceDays 天」比較晚的那個，
     避免退回最舊、已經過期的那批後馬上又被扣掉。原本那批＝兌換當下照先到期先扣，這張單用掉的點數裡最早到期的那一批。 */
  function refundEntry(m, r, extra) {
    var e = { type: 'refund', pts: r.pts, prize: r.prize, prizeName: r.name, ref: r.id }, c = cfg();
    if (c.expireMode !== 'never') {
      var at = -1; (m.ledger || []).forEach(function (x, i) { if (at < 0 && x.type === 'redeem' && x.ref === r.id) at = i; });
      var orig = 0;
      if (at >= 0) { var need = r.pts; batches(m, m.ledger.slice(at + 1)).sort(function (a, b) { return (a.end || 9e15) - (b.end || 9e15); }).some(function (g) { if (!orig || (g.end && g.end < orig)) orig = g.end || orig; need -= g.left; return need <= 0; }); }
      else orig = batchEnd(r.t || Date.now());
      var grace = Date.now() + (c.refundGraceDays == null ? 30 : c.refundGraceDays) * 86400000;
      e.until = orig === 0 && at >= 0 ? 0 : Math.max(orig || 0, grace);
      if (e.until) e.note = (extra.note ? extra.note + '・' : '') + '退回的點數 ' + new Date(e.until).toLocaleDateString('zh-TW') + ' 到期';
    }
    for (var k in extra) if (k !== 'note') e[k] = extra[k];
    if (!e.note && extra.note) e.note = extra.note;
    return e;
  }
  function expiring(m, days) {
    if (cfg().expireMode === 'never') return { due: 0 };
    var lim = Date.now() + (days || 0) * 86400000, due = 0;
    batches(m).forEach(function (g) { if (g.end && g.end <= lim) due += g.left; });
    return { due: due };
  }

  /* ====== 庫存調整、盤點、交班、補登（工作單 24 v3 第四節；第一階段本機測試） ====== */
  function addAdj(pid, qty, reason, by, ref) { var l = rd('kiteStockAdj1') || []; var e = { id: 'AJ' + rid(6), t: Date.now(), pid: pid, qty: qty, reason: reason, by: by, ref: ref || '' }; l.unshift(e); wr('kiteStockAdj1', l); audit('庫存調整 ' + pid + ' ' + (qty > 0 ? '+' : '') + qty + '（' + reason + '）'); return e; }
  function lookupTx(no) { var x = lg(K_STORE).filter(function (r) { return r.nonce === no || r.tx === no || (r.voided || []).indexOf(no) >= 0; })[0]; if (!x) return null; var cl = claimedRefs(); return { store: (storeById(x.store) || {}).name || x.store, amount: x.amount, pts: x.pts, t: x.t, status: x.void ? '已作廢' : (cl[x.nonce] || cl[x.tx] || x.recovered) ? '已入帳' : '未入帳', why: x.void ? '' : (cl[x.nonce] || cl[x.tx] || x.recovered) ? '' : '客人沒有完成領取', today: dayKey(x.t) === dayKey() }; }
  function list(k) { return rd(k) || []; }
  function saveList(k, v) { wr(k, v); }
  function claimedRefs() { var s = {}; allMembers().forEach(function (m) { (m.ledger || []).forEach(function (e) { if ((e.type === 'store' || e.type === 'backfill') && e.ref) s[e.ref] = m.id; }); }); return s; }
  function backfill(o) {      // o = { type:'recover'|'manual', nonce, store, amount, receipt, date, member, by, reason }
    var c = cfg(), today = dayKey(), cases = rd('kiteBackfill1') || [], cl = claimedRefs(), cs = { id: 'BF' + rid(6), t: Date.now(), type: o.type, by: o.by || '', reason: o.reason || '', member: o.member || '', status: 'review' };
    if (!o.member) return { ok: false, msg: '請填會員編號（會員身分不能用暱稱代替）' };
    if (o.type === 'recover') {
      var tx = lg(K_STORE).filter(function (x) { return x.nonce === o.nonce || x.tx === o.nonce || (x.voided || []).indexOf(o.nonce) >= 0; })[0];
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
  function allMembers() { var cm = (rd('kiteCloud1') || {}).members || [], a = (rd(K_IMP) || []).filter(function (x) { return !cm.some(function (y) { return y.id === x.id; }); }).concat(cm), m = rd(K_MEM); a = a.filter(function (x) { return !m || x.id !== m.id; }); if (m) a.unshift(m); return a; }
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
  /* D120（Dari 10/19「清除資料就是全部清空」）：客人自己按清除時，這支手機上客人的東西全部清掉——點數與兌換、捕魚／飛行進度與圖鑑、旅行、護照章、合照、小遊戲最佳分數、每日積分、提示紀錄。
     店家、服務台、後台與雲端連線設定不在這裡（那些是工作機的資料）。 */
  var MINE_KEYS = ['kiteMember1', 'kiteTravel1', 'kiteBag1', 'kiteBag2', 'kiteFriends1', 'kiteFriendVisits1', 'kiteFlyProgress1', 'kiteFishingProg1', 'kiteFishingDex2', 'kiteStamp1', 'kitePhoto1', 'kiteMiniBest1', 'kiteMiniDex1', 'kiteMiniSnd1', 'kiteDaily1', 'kiteWait', 'kiteSay', 'kiteSayT', 'kiteHubIntro1', 'kiteRuleVer1'];
  function wipeMine() { MINE_KEYS.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} }); }
  function exportMe() { return JSON.stringify(member()); }

  /* ====== D100（Dari 10/17）：測試期雲端同步——Google 試算表＋Apps Script（cloud/apps_script.gs）======
     每台裝置：自己的會員資料、店家集點紀錄、服務台發放紀錄、券核銷、庫存調整，有變動就上傳；定時下載全部，讓後台看到所有測試玩家。
     後台改的設定、贈品／券圖片也會發到每台裝置。後台按「清空全部測試資料」→ 雲端換新一輪，每台裝置下次連線就自動清掉本機測試資料。
     正式上線改接正式資料庫時，只換這一段。 */
  var CLOUD_URL = 'https://script.google.com/macros/s/AKfycbxza8041FUqyE8Cd-7X5m6eRHChrlqzalEwbyiw9E81yG-_UGZxQjSPNCMNvUTgHwws3w/exec';      // D101：Dari 10/17 部署（測試資料庫）               // Dari 部署 Apps Script 後填入（或在後台「系統 → 雲端同步」貼上，只對那台有效）
  var CLOUD_PLAYER_KEY = 'kite-test-2026';
  var CL = { busy: false, timer: 0, lastPull: 0, lastPush: 0, err: '', subs: [], cfgDirty: false, imgDirty: false };
  function cloudUrl() { try { return localStorage.getItem('kiteCloudUrl') || CLOUD_URL; } catch (e) { return CLOUD_URL; } }
  function cloudAdminKey() { try { return localStorage.getItem('kiteCloudAdminKey') || ''; } catch (e) { return ''; } }
  function devId() { var d = rd('kiteDev1'); if (!d) { d = 'D' + rid(8); wr('kiteDev1', d); } return d; }
  function devRole() { try { var p = location.pathname; return /admin/.test(p) ? 'admin' : /store/.test(p) ? 'store' : /desk/.test(p) ? 'desk' : 'player'; } catch (e) { return ''; } }
  function memberWorthPush(m) { return m && ((m.ledger || []).length || (m.plays || []).length || (m.redeems || []).length || (m.coupons || []).length || m.name); }
  function tfetch(url, opt) {      // 15 秒沒回應就放棄，避免卡住之後都不再同步
    var ac = typeof AbortController !== 'undefined' ? new AbortController() : null, t = ac ? setTimeout(function () { ac.abort(); }, 15000) : 0;
    return fetch(url, Object.assign({}, opt || {}, ac ? { signal: ac.signal } : {})).then(function (r) { clearTimeout(t); return r.json(); }, function (e) { clearTimeout(t); throw e; });
  }
  function cloudPost(b) { return tfetch(cloudUrl(), { method: 'POST', body: JSON.stringify(b) }); }
  function cloudPush(again) {
    var u = cloudUrl(); if (!u || typeof fetch === 'undefined') return Promise.resolve(null);
    if (!rd('kiteCloudEpoch')) { CL.pending = true; return again ? Promise.resolve(null) : cloudPull(true); }      // 還沒跟雲端對過：先下載（拿到這輪編號），下載完會自動上傳
    var ak = cloudAdminKey(), m = rd(K_MEM), logs = {}; Object.keys(LOG_ID).forEach(function (k) { logs[k] = rd(k) || []; });
    var b = { a: 'push', k: (CL.cfgDirty || CL.imgDirty) && ak ? ak : CLOUD_PLAYER_KEY, dev: devId(), role: devRole(), epoch: rd('kiteCloudEpoch') || 0, logs: logs };
    if (memberWorthPush(m)) b.member = m;
    if (CL.cfgDirty && ak) { b.cfg = rd(K_CFG); b.cfgT = (b.cfg || {}).cfgT || Date.now(); }
    if (CL.imgDirty && ak) b.images = rd('kitePrizeImg1') || {};
    var cd = CL.cfgDirty, id = CL.imgDirty, back = function () { CL.cfgDirty = CL.cfgDirty || cd; CL.imgDirty = CL.imgDirty || id; }; CL.cfgDirty = CL.imgDirty = false;
    return cloudPost(b).then(function (r) {
      CL.lastPush = Date.now();
      if (r && r.msg === 'epoch') { back(); CL.pending = true; return again ? r : cloudPull(true).then(function () { return cloudPush(true); }); }      // 雲端已清空換新一輪：先同步再重送
      if (!r || !r.ok) { CL.err = '上傳失敗：' + (r && r.msg || '?'); CL.pending = true; back(); return r; }
      CL.err = ''; CL.pending = false;
      if (r.stale && r.member && r.member.id) { localStorage.setItem(K_MEM, JSON.stringify(r.member)); CL.subs.forEach(function (f) { try { f({ stale: true }); } catch (e) {} }); }      // 別台裝置有較新的這位會員資料：換成雲端那份
      return r;
    }).catch(function (e) { CL.err = '連不上雲端'; CL.pending = true; back(); return null; });
  }
  function schedulePush(k) { if (k === 'kitePrizeImg1' && !CL.pulling) CL.imgDirty = true; if (CL.pulling) { CL.pending = CL.pending || k === K_MEM; return; } if (!cloudUrl()) return; clearTimeout(CL.timer); CL.timer = setTimeout(cloudPush, 1200); }
  G.__kiteCloudPush = schedulePush;
  G.__kiteCloudCfg = function () { CL.cfgDirty = true; schedulePush('cfg'); };
  function hasLocalTest() { var m = rd(K_MEM); return !!(memberWorthPush(m) || (rd(K_STORE) || []).length || (rd(K_DESK) || []).length || (rd('kiteCouponUsed1') || []).length); }
  function wipeLocal() {
    [K_MEM, K_STORE, K_DESK, K_IMP, 'kiteStockAdj1', 'kiteBackfill1', 'kiteImportConflicts1', 'kiteStocktake1', 'kiteShift1', 'kiteCouponUsed1', 'kiteCouponIssued1', 'kiteCloud1'].forEach(function (k) { localStorage.removeItem(k); });
    var t = rd('kiteTravel1'); if (t && t.bento) { t.bento = {}; localStorage.setItem('kiteTravel1', JSON.stringify(t)); }
  }
  function applyToMe(c) {      // 別台裝置做的事，回寫到這支手機的會員資料：服務台已發放、券已核銷、後台的調整
    var m = rd(K_MEM); if (!m) return false; var ch = false, desk = {}, used = {};
    (c.logs.kiteDeskLog1 || []).forEach(function (d) { desk[d.rcode] = 1; }); (c.logs.kiteCouponUsed1 || []).forEach(function (u) { used[u.id] = u.t; });
    (m.redeems || []).forEach(function (r) { if (r.status === 'wait' && desk[r.id]) { r.status = 'done'; ch = true; } });
    (m.coupons || []).forEach(function (x) { if (x.status === 'ok' && used[x.id]) { x.status = 'used'; x.usedT = used[x.id]; ch = true; } });
    m.opsDone = m.opsDone || [];
    (c.ops || []).filter(function (o) { return o.member === m.id && m.opsDone.indexOf(o.id) < 0; }).sort(function (a, b) { return a.t - b.t; }).forEach(function (o) {
      if (o.type === 'adjust') addLedger(m, { type: 'adjust', pts: o.pts, note: o.note || '後台調整' });
      if (o.type === 'freeze') m.status = 'frozen'; if (o.type === 'unfreeze') m.status = 'ok';
      if (o.type === 'resetTries') { var d = dayKey(); Object.keys(m.tries || {}).forEach(function (k) { if (k.indexOf(d) === 0) delete m.tries[k]; }); }
      if (o.type === 'tags') m.tags = o.tags || [];
      m.opsDone.push(o.id); ch = true; });
    m.opsDone = m.opsDone.slice(-300);
    if (ch) wr(K_MEM, m); return ch;
  }
  function cloudPull(force) {
    var u = cloudUrl(); if (!u || typeof fetch === 'undefined') return Promise.resolve(null);
    if (CL.busy && !force) return Promise.resolve(null); CL.busy = true; var seq = CL.seq = (CL.seq || 0) + 1;
    return tfetch(u + (u.indexOf('?') < 0 ? '?' : '&') + 'k=' + encodeURIComponent(cloudAdminKey() || CLOUD_PLAYER_KEY) + '&imgVer=' + (rd('kiteCloudImgVer') || '') + (devRole() === 'admin' ? '&full=1' : '') + '&_=' + Date.now()).then(function (r) {
      CL.busy = false; if (!r || !r.ok) { CL.err = '下載失敗：' + (r && r.msg || '?'); return null; }
      if (seq !== CL.seq || (CL.wipeT && Date.now() - CL.wipeT < 3000 && r.epoch < (rd('kiteCloudEpoch') || 0))) return null;      // 比較晚送出的下載或剛清空後的舊回應：丟掉
      CL.pulling = true; var wiped = false, changed = false;
      try {
        var ep = rd('kiteCloudEpoch');
        if ((ep && ep !== r.epoch) || (!ep && r.epoch > 1 && hasLocalTest())) { wipeLocal(); wiped = true; }      // 雲端清空過（或這台從沒同步、雲端已不是第一輪）：清掉這台的舊測試資料
        localStorage.setItem('kiteCloudEpoch', JSON.stringify(r.epoch));
        var me = rd(K_MEM), logs = r.logs || {};
        localStorage.setItem('kiteCloud1', JSON.stringify({ t: Date.now(), members: (r.members || []).filter(function (x) { return !me || x.id !== me.id; }), logs: logs, ops: r.ops || [] }));
        var lc = rd(K_CFG);
        if (lc && !lc.cfgT && devRole() === 'admin' && cloudAdminKey()) { lc.cfgT = Date.now(); localStorage.setItem(K_CFG, JSON.stringify(lc)); CL.cfgDirty = true; CL.pending = true; }      // 後台原本存的設定（還沒上過雲端）：以這台為準發出去，不被雲端蓋掉
        else if (r.cfg && (r.cfgT || 0) > ((lc || {}).cfgT || 0) && !CL.cfgDirty) localStorage.setItem(K_CFG, JSON.stringify(r.cfg));
        if (r.images && !CL.imgDirty) { localStorage.setItem('kitePrizeImg1', JSON.stringify(r.images)); localStorage.setItem('kiteCloudImgVer', JSON.stringify(r.imgVer)); }
        changed = applyToMe({ logs: logs, ops: r.ops || [] });
      } finally { CL.pulling = false; }
      CL.lastPull = Date.now(); CL.err = '';
      if (wiped || changed || CL.pending) cloudPush(true);      // 後台的調整、服務台發放回寫後、或之前斷網沒傳上去的：再上傳一次
      CL.subs.forEach(function (f) { try { f({ wiped: wiped }); } catch (e) {} }); return r;
    }).catch(function (e) { CL.busy = false; CL.err = '連不上雲端'; return null; });
  }
  function cloudSync() { return cloudPull(true).then(function () { return cloudPush(); }).then(function () { return cloudPull(true); }); }
  function cloudStart(every) {
    if (!cloudUrl() || typeof fetch === 'undefined' || CL.started) return; CL.started = true;
    cloudPull(true).then(function () { if (hasLocalTest() && !CL.lastPush) cloudPush(); });      // 先下載再上傳（避免清空後舊資料又被傳上去）
    setInterval(function () { if (!document.hidden) cloudPull(); }, every || (devRole() === 'admin' ? 15000 : 60000));
    document.addEventListener('visibilitychange', function () { if (!document.hidden) cloudPull(); });
  }
  function cloudOp(op) { var ak = cloudAdminKey(); if (!cloudUrl() || !ak) return Promise.resolve({ ok: false, msg: '還沒設定雲端或後台金鑰' }); return cloudPost({ a: 'op', k: ak, op: op }).then(function (r) { cloudPull(true); return r; }, function () { return { ok: false, msg: '連不上雲端' }; }); }
  function cloudWipe() { var ak = cloudAdminKey(); if (!cloudUrl() || !ak) return Promise.resolve({ ok: false, msg: '還沒設定雲端或後台金鑰' }); return cloudPost({ a: 'wipe', k: ak }).then(function (r) { if (r && r.ok) { CL.wipeT = Date.now(); CL.seq = (CL.seq || 0) + 1; wipeLocal(); localStorage.setItem('kiteCloudEpoch', JSON.stringify(r.epoch)); } return r; }, function () { return { ok: false, msg: '連不上雲端' }; }); }
  /* ====== D100：官方 LINE（LIFF）登入——拿到 LINE 帳號就把會員綁上去；換手機時用 LINE 帳號從雲端找回點數 ======
     LIFF_ID 由 Dari 在 LINE Developers 建好 LIFF 後填入（之前不會有任何動作）。只有官方 LINE 頁（line/）會要求登入，遊戲頁只是順便讀取。 */
  var LIFF_ID = '';
  function liffId() { try { return localStorage.getItem('kiteLiffId') || LIFF_ID; } catch (e) { return LIFF_ID; } }
  function loadLiff() { return new Promise(function (ok, no) { if (G.liff) return ok(G.liff); var s = document.createElement('script'); s.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'; s.onload = function () { ok(G.liff); }; s.onerror = no; document.head.appendChild(s); }); }
  function liffStart(o) {
    o = o || {}; var id = liffId(); if (!id || typeof document === 'undefined') return Promise.resolve(null);
    return loadLiff().then(function (L) { return L.init({ liffId: id }).then(function () { return L; }); }).then(function (L) {
      if (!L.isLoggedIn()) {      // 只在 LINE 外的瀏覽器才需要登入；按取消回來（網址有 error）或這次已經試過就不再跳轉，避免一直繞圈
        var tried = sessionStorage.getItem('kiteLiffLogin'); if (o.login && !L.isInClient() && !/[?&]error=/.test(location.search) && !tried) { sessionStorage.setItem('kiteLiffLogin', '1'); L.login({ redirectUri: location.href.replace(/[?&](code|state|liffClientId|liffRedirectUri)=[^&]*/g, '') }); }
        return null; }
      return L.getProfile().then(function (p) { return linkLine({ uid: p.userId, name: p.displayName, pic: p.pictureUrl || '' }); });
    }).catch(function (e) { CL.liffErr = String(e && e.message || e); return null; });
  }
  function linkLine(lp) {
    var m = member(), fresh = !(m.ledger || []).length && !(m.redeems || []).length && !(m.plays || []).length;
    if (m.line && m.line.uid === lp.uid) { m.line.name = lp.name; m.line.pic = lp.pic; m.line.t = Date.now(); saveMember(m); return Promise.resolve(m); }
    var u = cloudUrl();
    var restore = fresh && u && typeof fetch !== 'undefined' ? fetch(u + (u.indexOf('?') < 0 ? '?' : '&') + 'k=' + CLOUD_PLAYER_KEY + '&a=me&uid=' + encodeURIComponent(lp.uid)).then(function (r) { return r.json(); }).catch(function () { return null; }) : Promise.resolve(null);
    return restore.then(function (r) {
      if (r && r.member && r.member.id) { var x = r.member; x.line = Object.assign({}, x.line, { name: lp.name, pic: lp.pic, t: Date.now() }); wr(K_MEM, x); audit('用 LINE 帳號找回會員 ' + x.id); return x; }
      m = member(); if (m.line && m.line.uid && m.line.uid !== lp.uid) audit('這支手機換了 LINE 帳號（' + m.line.uid.slice(-4) + ' → ' + lp.uid.slice(-4) + '）');
      m.line = { uid: lp.uid, name: lp.name, pic: lp.pic, t: Date.now() }; if (!m.name) m.name = lp.name; saveMember(m); return m;
    });
  }
  function cloudStatus() { var c = rd('kiteCloud1') || {}; return { url: cloudUrl(), admin: !!cloudAdminKey(), lastPull: CL.lastPull, lastPush: CL.lastPush, err: CL.err, members: (c.members || []).length, epoch: rd('kiteCloudEpoch') || 0, dev: devId() }; }
  if (typeof document !== 'undefined' && typeof fetch !== 'undefined') setTimeout(function () { cloudStart(); }, 50);

  G.KiteCore = {
    DEFAULTS: DEFAULTS, GAMES: GAMES, cfg: cfg, saveCfg: saveCfg, ruleVer: ruleVer, ruleHistory: ruleHistory, setProfile: setProfile, displayName: displayName, nameBad: nameBad, bentoState: bentoState, redeemBento: redeemBento, redeemBlock: redeemBlock, codeByShort: codeByShort, couponUsedLog: function () { return lg('kiteCouponUsed1'); }, shortByCode: shortByCode, prizeImg: prizeImg, hasPrizeImg: hasPrizeImg, setPrizeImg: setPrizeImg, resetCfg: resetCfg, audit: audit, auditLog: function () { return rd(K_AUDIT) || []; },
    cloudPull: cloudPull, cloudPush: cloudPush, cloudSync: cloudSync, cloudOp: cloudOp, cloudWipe: cloudWipe, cloudStatus: cloudStatus, onCloud: function (f) { CL.subs.push(f); }, cloudStart: cloudStart, cloudMarkAll: function () { CL.cfgDirty = CL.imgDirty = true; }, liffStart: liffStart, linkLine: linkLine, liffId: liffId,
    member: member, peekMember: function () { return rd(K_MEM); }, saveMember: saveMember, dayKey: dayKey, rid: rid, hmac: hmac, sha256: sha256, utf8: utf8,
    pointsForSpend: pointsForSpend, makeEarnCode: makeEarnCode, claimEarn: claimEarn, storeLog: function () { return lg(K_STORE); }, storeById: storeById,
    eventMult: eventMult, triesLeft: triesLeft, reportPlay: reportPlay, perPoint: perPoint, convertScore: convertScore, tierPts: tierPts, nextTier: nextTier, gameToday: gameToday, leaderboard: leaderboard, reportMini: reportMini, travelBoard: travelBoard, lbMe: lbMe, setLbMe: setLbMe, lbSync: lbSync, sumBoard: sumBoard, fmtScore: fmtScore, setTravelStat: setTravelStat, claimGame: claimGame, settleGame: settleGame, storeBonusPts: storeBonusPts,
    travelGift: travelGift, travelPtsThisMonth: function () { return travelPtsThisMonth(member()); }, myCoupons: myCoupons, couponCheck: couponCheck, couponUse: couponUse, couponStoreName: couponStoreName, couponIssued: couponIssued, couponImg: couponImg, couponUsedCount: couponUsedCount, couponFaceHTML: couponFaceHTML,
    prizeById: prizeById, stockLeft: stockLeft, makeRedeem: makeRedeem, maxQty: maxQty, perUserLeft: perUserLeft, cancelRedeem: cancelRedeem, deskCheck: deskCheck, deskGive: deskGive, findRedeem: findRedeem, pendingRedeems: pendingRedeems, memberName: memberName, markGiven: markGiven, deskLog: function () { return lg(K_DESK); },
    allMembers: allMembers, importMembers: importMembers, addAdj: addAdj, adjSum: adjSum, gap: gap, list: list, saveList: saveList, backfill: backfill, claimedRefs: claimedRefs, lookupTx: lookupTx, archiveFull: archiveFull, archives: function () { return (rd('kiteArchive1') || []).map(function (a) { return { id: a.id, t: a.t }; }); }, importPreview: importPreview, dataset: dataset, wipeTest: wipeTest, reissueEarn: reissueEarn, voidEarn: voidEarn, peekEarn: peekEarn, earnCheck: earnCheck, onHand: onHand, reservedCount: reservedCount, exportMe: exportMe, wipeMine: wipeMine, MINE_KEYS: MINE_KEYS, expiring: expiring, batches: batches, housekeep: housekeep, storeMult: storeMult, notices: function () { var d = dayKey(); return (cfg().notices || []).filter(function (n) { return n.on && (!n.from || d >= n.from) && (!n.to || d <= n.to); }); }
  };
})(window);
