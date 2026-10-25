/* D175：今日港口告示板（Claude 方案 1 × GPT 0330 反提案 v2＋18 題題庫 v5）
   - 每天（台北日期）從不同遊戲抽最多 3 張小委託；孩子自己選 1 張才開始算，換題免費、不扣任何東西。
   - 完成一張＝收到一張港口貼紙（一天最多 1 張）；任何 7 張不同完成紀錄可以組成一張「港口記憶海報」。
   - 紅線：貼紙、海報不換點數或券，不影響遊戲分數與每日算分；委託沒完成也不扣東西；不以接受前的紀錄追認。
   - 各遊戲只要在對的時候呼叫 KiteBoard.emit(事件, 資料)；資料存在這支手機 localStorage 'kiteBoard1'。 */
(function () {
  var KEY = 'kiteBoard1';
  var BASE = (function () { try { var s = document.currentScript && document.currentScript.src; return s ? s.replace(/shared\/kite_board\.js.*$/, '') : '../'; } catch (e) { return '../'; } })();
  var ICON = { fish: 'hub/btn/m/btn_fish.webp', fly: 'hub/btn/m/btn_fly.webp', merge: 'hub/btn/m/btn_merge.webp', stack: 'hub/btn/m/btn_stack.webp', swim: 'hub/btn/m/btn_swim.webp', home: 'travel/assets/home/button_kitchen.webp' };
  var GNAME = { fish: '小鳶捕魚', fly: '飛行冒險', merge: '合成港', stack: '疊貨櫃', swim: '鯨鯊快游', home: '小鳶在家' };
  var LINK = { fish: 'index.html', fly: 'fly/', merge: 'games/merge/', stack: 'games/stack/', swim: 'games/swim/', home: 'travel/' };
  /* 18 題（GPT 題庫 v5 的主題；n＝要幾次；run＝要在同一局內完成，換新的一局重算） */
  var Q = [
    { id: 'PB-FISH-01', g: 'fish', t: '幫小鳶找一條魚吧！', ev: 'fish_catch', n: 1, run: 1 },
    { id: 'PB-FISH-02', g: 'fish', t: '幫港口找到三條魚！', ev: 'fish_catch', n: 3 },
    { id: 'PB-FISH-03', g: 'fish', t: '找找兩種不一樣的魚！', ev: 'fish_catch', n: 2, kinds: 1 },
    { id: 'PB-MERGE-01', g: 'merge', t: '讓兩個小夥伴合在一起！', ev: 'merge', n: 1, run: 1 },
    { id: 'PB-MERGE-02', g: 'merge', t: '讓小夥伴合成三次！', ev: 'merge', n: 3 },
    { id: 'PB-MERGE-03', g: 'merge', t: '放一個，看看能不能連著合兩次！', ev: 'merge_chain', n: 2, max: 1 },
    { id: 'PB-STACK-01', g: 'stack', t: '幫港口放好一個貨櫃！', ev: 'stack_place', n: 1, run: 1 },
    { id: 'PB-STACK-02', g: 'stack', t: '慢慢放好三個貨櫃！', ev: 'stack_place', n: 3 },
    { id: 'PB-STACK-03', g: 'stack', t: '把這座小塔再疊高三層！', ev: 'stack_place', n: 3, run: 1 },
    { id: 'PB-FLY-01', g: 'fly', t: '幫港口清掉一個小麻煩！', ev: 'fly_clear', n: 1, run: 1 },
    { id: 'PB-FLY-02', g: 'fly', t: '一起清掉三個小麻煩！', ev: 'fly_clear', n: 3 },
    { id: 'PB-FLY-03', g: 'fly', t: '陪小鳶飛一趟吧！', ev: 'run_end', n: 1 },
    { id: 'PB-SWIM-01', g: 'swim', t: '陪鯨鯊游一趟吧！', ev: 'run_end', n: 1 },
    { id: 'PB-SWIM-02', g: 'swim', t: '陪鯨鯊換兩次水道！', ev: 'swim_lane', n: 2 },
    { id: 'PB-SWIM-03', g: 'swim', t: '陪鯨鯊游二十秒！', ev: 'swim_time', n: 20, sum: 1 },
    { id: 'PB-HOME-01', g: 'home', t: '種下一顆小白菜！', ev: 'home_plant', n: 1, target: 'base', hint: '在花園空的菜圃種「小白菜」' },
    { id: 'PB-HOME-02', g: 'home', t: '把長好的菜收回家吧！', ev: 'home_harvest', n: 1 },
    { id: 'PB-HOME-03', g: 'home', t: '一起做一份青菜飯！', ev: 'home_cook', n: 1, target: 'base', hint: '在廚房「配菜」做青菜飯' }
  ];
  function rd() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } }
  function wr(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch (e) { return false; } }
  function day(t) { var d = new Date((t || Date.now()) + 8 * 3600e3); return d.toISOString().slice(0, 10); }      /* 台北日期 */
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function q(id) { return Q.filter(function (x) { return x.id === id; })[0]; }
  function candidates(d) {      /* 同一天大家看到同樣三張，各來自不同遊戲 */
    d = d || day(); var games = ['fish', 'fly', 'merge', 'stack', 'swim', 'home'], h = hash('board|' + d), out = [];
    for (var i = 0; i < games.length; i++) { var j = (h + i * 7) % games.length; var tmp = games[i]; games[i] = games[j]; games[j] = tmp; h = (Math.imul(h, 1103515245) + 12345) >>> 0; }
    games.slice(0, 3).forEach(function (g, k) { var list = Q.filter(function (x) { return x.g === g; }); out.push(list[(hash(d + g) + k) % list.length]); });
    return out;
  }
  function doneToday(s) { return (s.done || []).some(function (r) { return r.day === day(); }); }
  function accept(id) { var s = rd(); if (doneToday(s)) return false; var x = q(id); if (!x) return false; s.sel = { id: id, at: Date.now(), ep: (s.ep = (s.ep || 0) + 1), p: 0, kinds: [], run: '' }; wr(s); return true; }
  function swap() { var s = rd(); delete s.sel; wr(s); }
  function toast(html) {
    try { var e = document.createElement('div'); e.className = 'kbdToast'; e.innerHTML = html; document.body.appendChild(e); setTimeout(function () { e.classList.add('out'); }, 2600); setTimeout(function () { e.remove(); }, 3200); } catch (x) {}
  }
  function emit(ev, data) {      /* data：{ run: 這一局的代號, kind: 魚種, v: 數值（秒數、連鎖數）, target: 作物或料理 } */
    try {
      var s = rd(), sel = s.sel; if (!sel) return; var x = q(sel.id); if (!x) return; data = data || {};
      if (ev === 'run_start') { if (data.g === x.g && x.run) { sel.p = 0; sel.kinds = []; sel.run = data.run || String(Date.now()); wr(s); } return; }
      if (x.ev !== ev) return; if (data.g && data.g !== x.g) return; if (x.target && data.target !== x.target) return;
      if (x.run && sel.run && data.run && data.run !== sel.run) { sel.p = 0; sel.kinds = []; sel.run = data.run; }
      if (x.run && !sel.run) sel.run = data.run || '';
      if (x.kinds) { if (data.kind && sel.kinds.indexOf(data.kind) < 0) sel.kinds.push(data.kind); sel.p = sel.kinds.length; }
      else if (x.max) sel.p = Math.max(sel.p, data.v || 0);
      else if (x.sum) sel.p += Math.max(0, data.v || 0);
      else sel.p += 1;
      if (sel.p >= x.n) {
        if (doneToday(s)) { delete s.sel; wr(s); return; }
        s.done = s.done || []; s.done.push({ id: x.id, g: x.g, day: day(), at: Date.now() }); delete s.sel; wr(s);
        toast('<img src="' + BASE + ICON[x.g] + '" alt=""><span><b>委託完成！</b>港口貼紙收進「港口記憶」了</span>');
      } else wr(s);
    } catch (e) {}
  }
  function state() { var s = rd(); return { sel: s.sel || null, done: s.done || [], today: doneToday(s), cands: candidates(), quest: s.sel ? q(s.sel.id) : null }; }
  function sticker(g, cls) { return '<span class="kbdSt ' + (cls || '') + '"><img class="b" src="' + BASE + 'shared/assets/board/sticker_base.webp" alt=""><img class="i" src="' + BASE + ICON[g] + '" alt=""></span>'; }
  function poster(recs) { return '<div class="kbdPoster"><div class="in">' + recs.map(function (r) { return sticker(r.g); }).join('') + '</div><img class="f" src="' + BASE + 'shared/assets/board/poster_frame.webp" alt=""></div>'; }
  /* 告示板卡（放在小鳶樂園） */
  function card() {
    var st = state(), done = st.done, n = done.length, posters = Math.floor(n / 7), left = 7 - n % 7, html = '<div class="kbd"><div class="kbdH"><b>📋 今日港口告示板</b><span>選一張，玩完拿貼紙</span></div>';
    if (st.today) html += '<div class="kbdDone">' + sticker(done[done.length - 1].g, 'big') + '<div><b>今天的委託完成了！</b><span>貼紙收好了，明天告示板會換新的委託。</span></div></div>';
    else if (st.sel && st.quest) { var x = st.quest, p = Math.min(st.sel.p || 0, x.n); html += '<div class="kbdCard on"><img class="ic" src="' + BASE + ICON[x.g] + '" alt=""><div class="tx"><small>進行中・' + GNAME[x.g] + '</small><b>' + x.t + '</b>' + (x.hint ? '<em>' + x.hint + '</em>' : '') + '<span class="bar"><i style="width:' + Math.round(100 * p / x.n) + '%"></i></span><span class="pg">' + (x.sum ? Math.floor(p) + ' / ' + x.n + ' 秒' : p + ' / ' + x.n) + '</span></div></div><div class="kbdBtns"><a class="kbdGo" href="' + BASE + LINK[x.g] + '">去玩 ›</a><button type="button" class="kbdSwap">換一張（免費）</button></div>'; }
    else html += st.cands.map(function (x) { return '<button type="button" class="kbdCard" data-kq="' + x.id + '"><img class="ic" src="' + BASE + ICON[x.g] + '" alt=""><div class="tx"><small>' + GNAME[x.g] + '</small><b>' + x.t + '</b>' + (x.hint ? '<em>' + x.hint + '</em>' : '') + '</div><span class="pick">選這張</span></button>'; }).join('');
    html += '<div class="kbdMem"><div class="row">' + (n ? done.slice(-7).map(function (r) { return sticker(r.g); }).join('') : '<span class="none">還沒有貼紙，完成一張委託就會收到第一張</span>') + '</div><span class="mm">港口記憶 ' + n + ' 張' + (posters ? '・海報 ' + posters + ' 張' : '') + '・再 ' + left + ' 張組成一張海報</span>' + (posters ? '<button type="button" class="kbdPv">看海報</button>' : '') + '</div></div>';
    return html;
  }
  function wire(root, rerender) {
    root.querySelectorAll('[data-kq]').forEach(function (b) { b.onclick = function () { accept(b.dataset.kq); rerender(); }; });
    var sw = root.querySelector('.kbdSwap'); if (sw) sw.onclick = function () { swap(); rerender(); };
    var pv = root.querySelector('.kbdPv'); if (pv) pv.onclick = function () { var d = state().done, m = document.createElement('div'); m.className = 'kbdModal'; m.innerHTML = '<div class="box">' + poster(d.slice(0, 7 * Math.floor(d.length / 7)).slice(-7)) + '<p>港口記憶海報：七次委託的紀念</p><button type="button">關閉</button></div>'; document.body.appendChild(m); m.querySelector('button').onclick = function () { m.remove(); }; };
  }
  var css = document.createElement('style');
  css.textContent = '.kbd{margin:12px;border-radius:16px;background:url(' + BASE + 'shared/assets/board/card_frame.webp) center/100% 100% no-repeat,#FFF8EA;padding:14px 14px 30px;color:#10293D;box-shadow:0 4px 14px rgba(0,0,0,.18)}' +
    '.kbdH{display:flex;align-items:baseline;gap:8px;margin-bottom:8px}.kbdH b{font-size:16px}.kbdH span{font-size:12px;color:#5B6B78}' +
    '.kbdCard{display:flex;align-items:center;gap:10px;width:100%;border:2px solid #E5D49B;border-radius:14px;background:rgba(255,253,248,.92);padding:8px 10px;margin:0 0 8px;text-align:left;font-family:inherit;color:inherit;cursor:pointer}.kbdCard.on{border-color:#3E9B4F;cursor:default}' +
    '.kbdCard .ic{width:46px;height:46px;object-fit:contain;flex:none}.kbdCard .tx{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}.kbdCard small{font-size:11px;color:#2F7F86;font-weight:700}.kbdCard b{font-size:14.5px}.kbdCard em{font-style:normal;font-size:11.5px;color:#8A6A3A}' +
    '.kbdCard .pick{flex:none;font-size:12px;font-weight:800;color:#fff;background:#2F7F86;border-radius:999px;padding:5px 10px}.kbdCard .bar{height:8px;border-radius:4px;background:#EADFCB;overflow:hidden;margin-top:3px}.kbdCard .bar i{display:block;height:100%;background:#3E9B4F}.kbdCard .pg{font-size:11.5px;color:#5B6B78}' +
    '.kbdBtns{display:flex;gap:8px;margin-bottom:8px}.kbdGo{flex:1;text-align:center;background:#2F7F86;color:#fff;border-radius:999px;padding:9px;font-weight:800;text-decoration:none}.kbdSwap{border:2px solid #CFC2A6;background:#fff;border-radius:999px;padding:8px 12px;font:700 13px/1 inherit;font-family:inherit;color:#5B4A3A;cursor:pointer}' +
    '.kbdDone{display:flex;align-items:center;gap:12px;background:rgba(227,244,229,.9);border-radius:14px;padding:10px;margin-bottom:8px}.kbdDone b{display:block;font-size:15px}.kbdDone span{font-size:12.5px;color:#3A5568}' +
    '.kbdMem{border-top:1.5px dashed #D9CBB0;padding-top:8px;text-align:center}.kbdMem .row{display:flex;justify-content:center;gap:4px;flex-wrap:wrap;min-height:40px;align-items:center}.kbdMem .none{font-size:12px;color:#8A7A66}.kbdMem .mm{display:block;font-size:12px;color:#5B6B78;margin-top:4px}.kbdPv{margin-top:6px;border:0;background:#E39A1F;color:#fff;border-radius:999px;padding:6px 14px;font:800 13px/1 inherit;font-family:inherit;cursor:pointer}' +
    '.kbdSt{position:relative;display:inline-block;width:40px;height:40px;flex:none}.kbdSt.big{width:64px;height:64px}.kbdSt .b{position:absolute;inset:0;width:100%;height:100%}.kbdSt .i{position:absolute;left:22%;top:18%;width:56%;height:56%;object-fit:contain}' +
    '.kbdPoster{position:relative;width:min(78vw,300px);aspect-ratio:4/5;margin:0 auto}.kbdPoster .f{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.kbdPoster .in{position:absolute;left:18%;right:18%;top:18%;bottom:20%;display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:6px;background:linear-gradient(#BFE3EE,#F7E6C4)}.kbdPoster .kbdSt{width:30%;height:auto;aspect-ratio:1}' +
    '.kbdModal{position:fixed;inset:0;z-index:999;background:rgba(10,30,45,.6);display:flex;align-items:center;justify-content:center}.kbdModal .box{background:#FFF8EA;border-radius:18px;padding:16px;text-align:center;color:#10293D;max-width:340px}.kbdModal button{border:0;background:#2F7F86;color:#fff;border-radius:999px;padding:9px 22px;font:800 14px/1 inherit;font-family:inherit}' +
    '.kbdToast{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:9999;display:flex;align-items:center;gap:8px;background:#FFF8EA;color:#10293D;border:2.5px solid #3E9B4F;border-radius:16px;padding:8px 14px 8px 8px;box-shadow:0 6px 18px rgba(0,0,0,.3);font:600 13px/1.35 system-ui,sans-serif;animation:kbIn .35s ease-out;max-width:88vw}.kbdToast img{width:38px;height:38px;object-fit:contain}.kbdToast b{display:block;font-size:15px;color:#2F7A3A}.kbdToast.out{opacity:0;transition:opacity .5s}@keyframes kbIn{from{transform:translate(-50%,-30px);opacity:0}}';
  (document.head || document.documentElement).appendChild(css);
  window.KiteBoard = { emit: emit, state: state, card: card, wire: wire, accept: accept, swap: swap, candidates: candidates, Q: Q };
})();
