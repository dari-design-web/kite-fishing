/* C-191：從客戶官方 LINE 進遊戲時，畫面上方顯示「‹ 回官方 LINE」（D71）。
   只有從 line/ 點進來（網址帶 ?from=line，同一分頁記住）才出現；直接開遊戲不會出現。 */
(function () {
  var me = document.currentScript && document.currentScript.src, base = me ? me.replace(/shared\/back_line\.js.*$/, '') : '../';
  try { if (/[?&]from=line\b/.test(location.search)) sessionStorage.setItem('kiteFromLine', '1'); if (sessionStorage.getItem('kiteFromLine') !== '1') return; } catch (e) { if (!/[?&]from=line\b/.test(location.search)) return; }
  function add() {
    if (document.getElementById('kiteBackLine')) return;
    var a = document.createElement('a'); a.id = 'kiteBackLine'; a.href = base + 'line/index.html'; a.textContent = '‹ 回官方 LINE';
    // 貼在左邊中間的綠色小標籤，不擋各遊戲上方的標題與按鈕；剛進來 3 秒先展開寫字，之後收成小標籤
    a.setAttribute('style', 'position:fixed;left:0;top:42%;z-index:2147483000;background:#06C755;color:#fff;font:700 12px/1.15 system-ui,sans-serif;padding:8px 8px 8px 6px;border-radius:0 12px 12px 0;text-decoration:none;box-shadow:0 2px 6px rgba(0,0,0,.25);opacity:.95;white-space:nowrap;transition:padding .3s');
    a.setAttribute('aria-label', '回官方 LINE');
    setTimeout(function () { a.innerHTML = '‹<br>LINE'; a.style.textAlign = 'center'; a.style.fontSize = '11px'; a.style.padding = '7px 5px 7px 3px'; }, 3000);
    a.onclick = function () { try { sessionStorage.removeItem('kiteFromLine'); } catch (e) {} };
    document.body.appendChild(a);
  }
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
})();
