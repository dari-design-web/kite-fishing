// 用 Node 模擬 Google Apps Script 環境，直接跑 cloud/apps_script.gs（同一份程式碼）
const fs = require('fs'), vm = require('vm'), http = require('http'), url = require('url');
function makeEnv() {
  const sheets = {}, props = {};
  class Range { constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
    setNumberFormat() { return this; } setValue(v) { return this.setValues([[v]]); } getValues() { const o = []; for (let i = 0; i < this.nr; i++) { const row = this.sh.d[this.r - 1 + i] || []; o.push(Array.from({ length: this.nc }, (_, j) => row[this.c - 1 + j] == null ? '' : row[this.c - 1 + j])); } return o; } clearContent() { return this; }
    setValues(v) { for (let i = 0; i < this.nr; i++) { const row = this.sh.d[this.r - 1 + i] || (this.sh.d[this.r - 1 + i] = []); for (let j = 0; j < this.nc; j++) row[this.c - 1 + j] = v[i][j]; } } }
  class Sheet { constructor(n) { this.n = n; this.d = []; }
    appendRow(r) { this.d.push(r.slice()); }
    getDataRange() { const w = Math.max(1, ...this.d.map(r => r.length)); return { getValues: () => this.d.length ? this.d.map(r => { const x = r.slice(); while (x.length < w) x.push(''); return x; }) : [['']] }; }
    getRange(r, c, nr, nc) { return new Range(this, r, c, nr, nc); }
    getLastRow() { return this.d.length; } getMaxColumns() { return 1000; } insertColumnsAfter() {} getLastColumn() { return Math.max(1, ...this.d.map(r => r.length)); } clear() { this.d = []; } getName() { return this.n; } setFrozenRows() {}
    deleteRows(s, n) { this.d.splice(s - 1, n); } }
  const ss = { getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = new Sheet(n)) };
  const env = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = v; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock() { return true; }, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ s, setMimeType() { return this; } }) },
    JSON, Date, String, Math, Object, Array, Number,
    Utilities: { formatDate: (d, tz, f) => { const t = new Date(d.getTime() + 8 * 3600e3).toISOString(); return f === 'yyyy-MM' ? t.slice(0, 7) : t.slice(0, 10); } },      // D132：原本沒模擬 Utilities，lb_ 的錯誤才沒被測出來
  };
  env._sheets = sheets; env._props = props;
  vm.createContext(env);
  let code = fs.readFileSync(process.argv[2] || '/home/claude/kite-fishing/cloud/apps_script.gs', 'utf8');
  code = code.replace("var ADMIN_KEY = 'CHANGE-ME-ADMIN';", "var ADMIN_KEY = 'test-admin';");
  vm.runInContext(code, env);
  return env;
}
module.exports = { makeEnv };
if (require.main === module) {
  const env = makeEnv(), port = +process.argv[3] || 8790;
  http.createServer((req, res) => {
    const H = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    if (req.method === 'OPTIONS') { res.writeHead(204, Object.assign(H, { 'Access-Control-Allow-Headers': '*' })); return res.end(); }
    if (req.url.startsWith('/_dump')) { res.writeHead(200, H); return res.end(JSON.stringify({ sheets: Object.fromEntries(Object.entries(env._sheets).map(([k, v]) => [k, v.d.map(r => r.map(c => String(c).slice(0, 80)))])), props: env._props })); }
    if (req.method === 'GET') { const q = url.parse(req.url, true).query; let o; try { o = env.doGet({ parameter: q }); } catch (e) { console.error('doGet', e); res.writeHead(500, H); return res.end('{}'); } res.writeHead(200, H); return res.end(o.s); }
    let b = ''; req.on('data', d => b += d); req.on('end', () => { let o; try { o = env.doPost({ postData: { contents: b } }); } catch (e) { console.error('doPost', e); res.writeHead(500, H); return res.end('{}'); } res.writeHead(200, H); res.end(o.s); });
  }).listen(port, () => console.log('gas mock on', port));
}
