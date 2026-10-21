/* QA 10/21：存圖片。LINE 內建瀏覽器（尤其 iPhone）不支援 <a download>，改成全螢幕顯示圖片，請使用者「長按圖片 → 儲存」。
   KiteSaveImg(blob, 檔名, 一般瀏覽器下載後要做的事) */
(function (G) {
  'use strict';
  function inLine() { return / Line\//i.test(navigator.userAgent) || /FBAN|FBAV|Instagram/i.test(navigator.userAgent); }
  function show(url) {
    var o = document.createElement('div');
    o.setAttribute('style', 'position:fixed;inset:0;z-index:2147483600;background:rgba(10,20,26,.94);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:16px;color:#fff;font:700 16px/1.5 system-ui,sans-serif;text-align:center');
    o.innerHTML = '<div>👇 長按圖片 →「儲存到照片」</div><img alt="要存的圖片" style="max-width:100%;max-height:72vh;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.4);-webkit-touch-callout:default;user-select:auto"><button type="button" style="min-height:46px;padding:0 28px;border-radius:999px;border:2px solid #fff;background:transparent;color:#fff;font:inherit">關閉</button>';
    o.querySelector('img').src = url; o.querySelector('button').onclick = function () { o.remove(); };
    document.body.appendChild(o);
  }
  G.KiteSaveImg = function (blob, name, after) {
    var url = URL.createObjectURL(blob);
    if (inLine()) { var r = new FileReader(); r.onload = function () { show(r.result); }; r.readAsDataURL(blob); return 'show'; }
    var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); if (after) after(); return 'download';
  };
})(window);
