/* 小鳶來港・測試期雲端資料（Google 試算表＋Apps Script）v2（D100，Dari 10/17；夜間獨立複查後修正）
   用法：在 Google 雲端硬碟新增一份 Google 試算表 → 擴充功能 → Apps Script → 把這整份貼上 → 部署 → 網頁應用程式
         （執行身分：我；存取權：所有人）→ 複製網址給 Claude。詳細步驟見 Claude產出/雲端測試資料庫_設定步驟（最新版）.md。
   只放測試資料；正式上線前到後台按「清空全部測試資料」，之後改接正式資料庫。
   PLAYER_KEY：網頁（客人手機、店家、服務台）用來上傳；ADMIN_KEY：後台改設定、清空資料、對會員操作時用（不要給別人）。 */
var PLAYER_KEY = 'kite-test-2026';
var ADMIN_KEY = 'CHANGE-ME-ADMIN';   // ← 部署前改成你自己想的一串字，並在後台「系統 → 雲端同步」輸入同一串
var CHUNK = 40000;
function adminOk_(k) { return k === ADMIN_KEY && ADMIN_KEY !== 'CHANGE-ME-ADMIN'; }

function sheet_(name, head) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); if (head) sh.appendRow(head); }
  return sh;
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function meta_() { var p = PropertiesService.getScriptProperties(); return { epoch: +(p.getProperty('epoch') || 1), imgVer: +(p.getProperty('imgVer') || 0), cfgT: +(p.getProperty('cfgT') || 0) }; }
function setMeta_(k, v) { PropertiesService.getScriptProperties().setProperty(k, String(v)); }

/* _data：每列 [種類, 編號, 更新時間, JSON 分段…]；種類 member／device／cfg／images／op */
function rows_() { var sh = sheet_('_data', ['種類', '編號', '更新時間', 'JSON']), v = sh.getDataRange().getValues(); return { sh: sh, v: v }; }
/* 每段 JSON 前面加「~」：避免試算表把開頭是 = + - 的內容當公式；整列設成純文字格式 */
function join_(r) { return r.slice(3).map(function (c) { c = String(c == null ? '' : c); return c.charAt(0) === '~' ? c.slice(1) : c; }).join(''); }
function split_(s) { var parts = [], i = 0; while (i < s.length) { var e = Math.min(s.length, i + CHUNK), c = s.charCodeAt(e - 1); if (e < s.length && c >= 0xD800 && c <= 0xDBFF) e--; parts.push('~' + s.slice(i, e)); i = e; } return parts.length ? parts : ['~']; }
function upsert_(D, kind, id, obj) {
  var row = [kind, String(id), new Date().toISOString()].concat(split_(JSON.stringify(obj))), at = -1;
  for (var j = 1; j < D.v.length; j++) if (D.v[j][0] === kind && String(D.v[j][1]) === String(id)) { at = j; break; }
  var w = Math.max(at >= 0 ? D.v[at].length : 0, row.length); while (row.length < w) row.push('');
  var mc = D.sh.getMaxColumns(); if (w > mc) D.sh.insertColumnsAfter(mc, w - mc);
  var rn = at >= 0 ? at + 1 : D.v.length + 1, rg = D.sh.getRange(rn, 1, 1, w); rg.setNumberFormat('@'); rg.setValues([row]);
  if (at >= 0) D.v[at] = row; else D.v.push(row);
}
function all_(D, kind) { var o = []; for (var j = 1; j < D.v.length; j++) if (D.v[j][0] === kind) { try { o.push(JSON.parse(join_(D.v[j]))); } catch (e) {} } return o; }
function one_(D, kind, id) { for (var j = 1; j < D.v.length; j++) if (D.v[j][0] === kind && String(D.v[j][1]) === String(id)) { try { return JSON.parse(join_(D.v[j])); } catch (e) { return null; } } return null; }

/* 給人看的「會員」分頁（每次上傳更新那一列） */
function memberRow_(m) {
  var led = m.ledger || [], R = m.redeems || [];
  var gain = led.filter(function (e) { return e.pts > 0 && e.type !== 'refund'; }).reduce(function (n, e) { return n + e.pts; }, 0);
  var used = -led.filter(function (e) { return e.pts < 0; }).reduce(function (n, e) { return n + e.pts; }, 0);
  return [m.id, m.name || '', m.points || 0, gain, used, R.length, R.filter(function (r) { return r.status === 'wait'; }).length, (m.coupons || []).length, (m.plays || []).length, m.status || 'ok', new Date().toISOString().slice(0, 19).replace('T', ' ')];
}
function viewMember_(m) {
  var sh = sheet_('會員', ['會員編號', '名稱', '目前點數', '累計得點', '累計用點', '兌換單', '待領', '券', '遊戲局數', '狀態', '最後更新']), v = sh.getDataRange().getValues(), row = memberRow_(m);
  if (/^[=+\-@]/.test(row[1])) row[1] = "'" + row[1];      // 名稱開頭是 = + - @ 時不要被當成公式
  for (var j = 1; j < v.length; j++) if (v[j][0] === m.id) { sh.getRange(j + 1, 1, 1, row.length).setValues([row]); return; }
  sh.appendRow(row);
}

function lite_(m) {
  return { id: m.id, name: m.name || '', status: m.status, lite: true, created: m.created, visits: (m.visits || []).slice(-1), points: m.points, nonces: m.nonces || [], redeems: m.redeems || [],
    coupons: (m.coupons || []).map(function (x) { return { id: x.id, cid: x.cid, t: x.t, status: x.status }; }),
    ledger: (m.ledger || []).filter(function (e) { return e.ref && (e.type === 'store' || e.type === 'backfill'); }).map(function (e) { return { type: e.type, ref: e.ref, t: e.t, pts: e.pts }; }),
    lb: lb_(m), tstat: m.tstat || null };      // D104：排行榜只給每關最高分和旅行收藏數，不給遊玩明細
}
function lb_(m) {
  var mk = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM'), o = {};
  (m.plays || []).forEach(function (p) { if (!p || !p.game || p.game === 'travel') return; var k = p.game + '|' + p.level, s = +p.score || 0, v = o[k] || [0, 0, mk]; if (s > v[0]) v[0] = s; if (s > v[1] && Utilities.formatDate(new Date(p.t), 'Asia/Taipei', 'yyyy-MM') === mk) v[1] = s; o[k] = v; });
  return o;
}
function doGet(e) {
  var p = (e && e.parameter) || {}, admin = adminOk_(p.k);
  if (p.k !== PLAYER_KEY && !admin) return out_({ ok: false, msg: 'key' });
  var D = rows_(), M = meta_(), logs = {};
  if (p.a === 'me' && p.uid) {      // 換手機／清了瀏覽器：用 LINE 帳號找回自己的會員資料（測試期；正式版要在伺服器驗 LINE 的 ID token）
    var hit = all_(D, 'member').filter(function (m) { return m.line && m.line.uid === p.uid; }).sort(function (a, b) { return (b.ledger || []).length - (a.ledger || []).length; })[0];
    return out_({ ok: true, epoch: M.epoch, member: hit || null });
  }
  all_(D, 'device').forEach(function (d) { Object.keys(d.logs || {}).forEach(function (k) { logs[k] = (logs[k] || []).concat(d.logs[k] || []); }); });
  var ms = all_(D, 'member');
  if (!(p.full === '1' && admin)) ms = ms.map(lite_);      // 客人手機、店家、服務台只拿需要的部分（不含 email、手機、遊戲紀錄）；完整資料要後台金鑰
  var o = { ok: true, t: Date.now(), epoch: M.epoch, cfgT: M.cfgT, imgVer: M.imgVer, members: ms, logs: logs, cfg: one_(D, 'cfg', 'cfg'), ops: all_(D, 'op').filter(function (o) { return Date.now() - (o.t || 0) < 45 * 86400000; }) };
  if (String(p.imgVer || '') !== String(M.imgVer)) o.images = one_(D, 'images', 'images') || {};
  return out_(o);
}

function doPost(e) {
  var b; try { b = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, msg: 'json' }); }
  var admin = adminOk_(b.k);
  if (b.k !== PLAYER_KEY && !admin) return out_({ ok: false, msg: 'key' });
  var lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) return out_({ ok: false, msg: 'busy' });
  try {
    var D = rows_(), M = meta_();
    if (b.a === 'push') {
      if ((b.member || b.logs) && +(b.epoch || 0) !== M.epoch) return out_({ ok: false, msg: 'epoch', epoch: M.epoch });      // 沒同步過或已清空過的舊資料不收（先下載再上傳）
      var res = { ok: true, epoch: M.epoch };
      if (b.member && b.member.id) {      // 同一位會員在兩台裝置：版本號比雲端舊的不收，回傳雲端那份給裝置換上
        var cur = one_(D, 'member', b.member.id);
        if (cur && (cur.rev || 0) > (b.member.rev || 0)) { res.stale = true; res.member = cur; }
        else { upsert_(D, 'member', b.member.id, b.member); viewMember_(b.member); }
      }
      if (b.dev && b.logs) upsert_(D, 'device', b.dev, { dev: b.dev, role: b.role || '', t: Date.now(), logs: b.logs });
      if (admin && b.cfg) { upsert_(D, 'cfg', 'cfg', b.cfg); setMeta_('cfgT', b.cfgT || Date.now()); }
      if (admin && b.images) { upsert_(D, 'images', 'images', b.images); setMeta_('imgVer', M.imgVer + 1); }
      return out_(res);
    }
    if (b.a === 'op') { if (!admin) return out_({ ok: false, msg: 'admin' }); var op = b.op || {}; op.id = op.id || ('OP' + Date.now()); op.t = Date.now(); upsert_(D, 'op', op.id, op); return out_({ ok: true, id: op.id }); }
    if (b.a === 'wipe') {
      if (!admin) return out_({ ok: false, msg: 'admin' });
      var keep = one_(D, 'cfg', 'cfg'), img = one_(D, 'images', 'images'), ss = SpreadsheetApp.getActiveSpreadsheet();
      ['_data', '會員'].forEach(function (n) { var sh = ss.getSheetByName(n); if (sh) { var r = sh.getLastRow(); if (r > 1) sh.deleteRows(2, r - 1); } });
      D = rows_(); if (b.keepCfg !== false) { if (keep) upsert_(D, 'cfg', 'cfg', keep); if (img) upsert_(D, 'images', 'images', img); }
      setMeta_('epoch', M.epoch + 1); return out_({ ok: true, epoch: M.epoch + 1 });
    }
    return out_({ ok: false, msg: 'a' });
  } finally { lock.releaseLock(); }
}

/* ====== 官方 LINE 圖文選單（上線前 Dari 執行一次）======
   1) LINE Developers 的 Messaging API 頻道 → 發行「Channel access token（長期）」
   2) 這個 Apps Script 左邊齒輪「專案設定 → 指令碼屬性」新增兩個：LINE_TOKEN（上面那串）、LIFF_ID（LIFF 的 ID）
   3) 上方函式選 setupRichMenu → 按「執行」（第一次會問授權，允許「連線到外部服務」）
   圖用網站上的 line/assets/richmenu_v3.jpg（2500×1200）：上面一整條「小鳶樂園」、下面三格「掃碼集點／港口換禮／我的資訊」。 */
var SITE = 'https://dari-design-web.github.io/kite-fishing/';
function setupRichMenu() {
  var pr = PropertiesService.getScriptProperties(), tok = pr.getProperty('LINE_TOKEN'), liff = pr.getProperty('LIFF_ID');
  if (!tok || !liff) throw new Error('請先在「專案設定 → 指令碼屬性」填 LINE_TOKEN 和 LIFF_ID');
  var H = { Authorization: 'Bearer ' + tok }, L = function (p) { return 'https://liff.line.me/' + liff + '?p=' + p + '&liff=1'; };
  var area = function (x, y, w, h, p, label) { return { bounds: { x: x, y: y, width: w, height: h }, action: { type: 'uri', label: label, uri: L(p) } }; };
  var body = { size: { width: 2500, height: 1200 }, selected: true, name: '小鳶樂園選單 v3', chatBarText: '小鳶樂園選單',
    areas: [area(0, 0, 2500, 612, 'park', '小鳶樂園'), area(0, 612, 833, 588, 'scan', '掃碼集點'), area(833, 612, 834, 588, 'shop', '港口換禮'), area(1667, 612, 833, 588, 'me', '我的資訊')] };
  var r = UrlFetchApp.fetch('https://api.line.me/v2/bot/richmenu', { method: 'post', contentType: 'application/json', headers: H, payload: JSON.stringify(body), muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('建立選單失敗：' + r.getContentText());
  var id = JSON.parse(r.getContentText()).richMenuId, ir = UrlFetchApp.fetch(SITE + 'line/assets/richmenu_v3.jpg', { muteHttpExceptions: true });
  if (ir.getResponseCode() !== 200) throw new Error('抓不到選單圖片（' + ir.getResponseCode() + '），請確認網站已上線');
  var img = ir.getBlob();
  r = UrlFetchApp.fetch('https://api-data.line.me/v2/bot/richmenu/' + id + '/content', { method: 'post', contentType: 'image/jpeg', headers: H, payload: img.getBytes(), muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('上傳圖片失敗：' + r.getContentText());
  r = UrlFetchApp.fetch('https://api.line.me/v2/bot/user/all/richmenu/' + id, { method: 'post', headers: H, muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('設成預設選單失敗：' + r.getContentText());
  Logger.log('完成：圖文選單 ' + id + ' 已設成所有好友的預設選單');
}
