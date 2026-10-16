/* 小鳶來港・測試期雲端資料（Google 試算表＋Apps Script）v1（D100，Dari 10/17）
   用法：在 Google 雲端硬碟新增一份 Google 試算表 → 擴充功能 → Apps Script → 把這整份貼上 → 部署 → 網頁應用程式
         （執行身分：我；存取權：所有人）→ 複製網址給 Claude。詳細步驟見 Claude產出/雲端測試資料庫_設定步驟_v1.md。
   只放測試資料；正式上線前到後台按「清空全部測試資料」，之後改接正式資料庫。
   PLAYER_KEY：網頁（客人手機、店家、服務台）用來上傳；ADMIN_KEY：後台改設定、清空資料、對會員操作時用（不要給別人）。 */
var PLAYER_KEY = 'kite-test-2026';
var ADMIN_KEY = 'CHANGE-ME-ADMIN';   // ← 部署前改成你自己想的一串字，並在後台「系統 → 雲端同步」輸入同一串
var CHUNK = 40000;

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
function join_(r) { return r.slice(3).join(''); }
function upsert_(D, kind, id, obj) {
  var s = JSON.stringify(obj), parts = []; for (var i = 0; i < s.length; i += CHUNK) parts.push(s.slice(i, i + CHUNK)); if (!parts.length) parts.push('');
  var row = [kind, id, new Date()].concat(parts), at = -1;
  for (var j = 1; j < D.v.length; j++) if (D.v[j][0] === kind && String(D.v[j][1]) === String(id)) { at = j; break; }
  if (at < 0) { D.sh.appendRow(row); D.v.push(row); return; }
  var w = Math.max(D.v[at].length, row.length); while (row.length < w) row.push('');
  D.sh.getRange(at + 1, 1, 1, w).setValues([row]); D.v[at] = row;
}
function all_(D, kind) { var o = []; for (var j = 1; j < D.v.length; j++) if (D.v[j][0] === kind) { try { o.push(JSON.parse(join_(D.v[j]))); } catch (e) {} } return o; }
function one_(D, kind, id) { for (var j = 1; j < D.v.length; j++) if (D.v[j][0] === kind && String(D.v[j][1]) === String(id)) { try { return JSON.parse(join_(D.v[j])); } catch (e) { return null; } } return null; }

/* 給人看的「會員」分頁（每次上傳更新那一列） */
function memberRow_(m) {
  var led = m.ledger || [], R = m.redeems || [];
  var gain = led.filter(function (e) { return e.pts > 0 && e.type !== 'refund'; }).reduce(function (n, e) { return n + e.pts; }, 0);
  var used = -led.filter(function (e) { return e.pts < 0; }).reduce(function (n, e) { return n + e.pts; }, 0);
  return [m.id, m.name || '', m.points || 0, gain, used, R.length, R.filter(function (r) { return r.status === 'wait'; }).length, (m.coupons || []).length, (m.plays || []).length, m.status || 'ok', new Date()];
}
function viewMember_(m) {
  var sh = sheet_('會員', ['會員編號', '名稱', '目前點數', '累計得點', '累計用點', '兌換單', '待領', '券', '遊戲局數', '狀態', '最後更新']), v = sh.getDataRange().getValues(), row = memberRow_(m);
  for (var j = 1; j < v.length; j++) if (v[j][0] === m.id) { sh.getRange(j + 1, 1, 1, row.length).setValues([row]); return; }
  sh.appendRow(row);
}

function lite_(m) {
  return { id: m.id, name: m.name || '', status: m.status, lite: true, points: m.points, nonces: m.nonces || [], redeems: m.redeems || [],
    coupons: (m.coupons || []).map(function (x) { return { id: x.id, cid: x.cid, t: x.t, status: x.status }; }),
    ledger: (m.ledger || []).filter(function (e) { return e.ref && (e.type === 'store' || e.type === 'backfill'); }).map(function (e) { return { type: e.type, ref: e.ref, t: e.t, pts: e.pts }; }) };
}
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.k !== PLAYER_KEY && p.k !== ADMIN_KEY) return out_({ ok: false, msg: 'key' });
  var D = rows_(), M = meta_(), logs = {};
  if (p.a === 'me' && p.uid) {      // 換手機／清了瀏覽器：用 LINE 帳號找回自己的會員資料（測試期；正式版要在伺服器驗 LINE 的 ID token）
    var hit = all_(D, 'member').filter(function (m) { return m.line && m.line.uid === p.uid; }).sort(function (a, b) { return (b.ledger || []).length - (a.ledger || []).length; })[0];
    return out_({ ok: true, epoch: M.epoch, member: hit || null });
  }
  all_(D, 'device').forEach(function (d) { Object.keys(d.logs || {}).forEach(function (k) { logs[k] = (logs[k] || []).concat(d.logs[k] || []); }); });
  var ms = all_(D, 'member');
  if (p.full !== '1') ms = ms.map(lite_);      // 客人手機、店家、服務台只拿需要的部分（省流量）；後台拿完整資料
  var o = { ok: true, t: Date.now(), epoch: M.epoch, cfgT: M.cfgT, imgVer: M.imgVer, members: ms, logs: logs, cfg: one_(D, 'cfg', 'cfg'), ops: all_(D, 'op') };
  if (String(p.imgVer || '') !== String(M.imgVer)) o.images = one_(D, 'images', 'images') || {};
  return out_(o);
}

function doPost(e) {
  var b; try { b = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, msg: 'json' }); }
  var admin = b.k === ADMIN_KEY && ADMIN_KEY !== 'CHANGE-ME-ADMIN';
  if (b.k !== PLAYER_KEY && !admin) return out_({ ok: false, msg: 'key' });
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var D = rows_(), M = meta_();
    if (b.a === 'push') {
      if (b.epoch && +b.epoch !== M.epoch) return out_({ ok: false, msg: 'epoch', epoch: M.epoch });      // 已清空過，舊手機的資料不收
      if (b.member && b.member.id) { upsert_(D, 'member', b.member.id, b.member); viewMember_(b.member); }
      if (b.dev && b.logs) upsert_(D, 'device', b.dev, { dev: b.dev, role: b.role || '', t: Date.now(), logs: b.logs });
      if (admin && b.cfg) { upsert_(D, 'cfg', 'cfg', b.cfg); setMeta_('cfgT', b.cfgT || Date.now()); }
      if (admin && b.images) { upsert_(D, 'images', 'images', b.images); setMeta_('imgVer', M.imgVer + 1); }
      return out_({ ok: true, epoch: M.epoch });
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
