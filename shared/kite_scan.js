/* 小鳶來港 共用：開相機掃 QR、把文字畫成 QR（工作單 23，D71）
   掃描：有 BarcodeDetector 就用手機內建的，沒有就用 jsQR（shared/vendor/jsQR.js）。
   正式版放進 LINE 時可改用 LIFF 的 liff.scanCodeV2（待接 LINE 帳號）。 */
(function (G) {
  'use strict';
  function drawQR(el, text, px) {      // 把 text 畫成 QR 圖放進 el
    var q = G.qrcode(0, 'M'); q.addData(text); q.make();
    var n = q.getModuleCount(), size = px || 240, cell = Math.max(2, Math.floor(size / (n + 8))), c = document.createElement('canvas'), w = cell * (n + 8);
    c.width = c.height = w; var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, w); x.fillStyle = '#111';
    for (var r = 0; r < n; r++) for (var k = 0; k < n; k++) if (q.isDark(r, k)) x.fillRect((k + 4) * cell, (r + 4) * cell, cell, cell);
    c.style.width = c.style.height = size + 'px'; c.setAttribute('role', 'img'); c.setAttribute('aria-label', 'QR 碼');
    el.innerHTML = ''; el.appendChild(c); return c;
  }
  function Scanner(box, onCode, onMsg) {
    var v = document.createElement('video'), cv = document.createElement('canvas'), stream = null, alive = false, det = null, last = '';
    v.setAttribute('playsinline', ''); v.muted = true; v.className = 'scanVideo'; box.innerHTML = ''; box.appendChild(v);
    var frame = document.createElement('div'); frame.className = 'scanFrame'; box.appendChild(frame);
    try { if ('BarcodeDetector' in G) det = new G.BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { det = null; }
    function hit(t) { if (!t || t === last) return; last = t; if (navigator.vibrate) navigator.vibrate(60); onCode(t); }
    function tick() {
      if (!alive) return;
      if (v.readyState >= 2) {
        if (det) { det.detect(v).then(function (r) { if (r && r[0]) hit(r[0].rawValue); }).catch(function () { det = null; }); }
        else if (G.jsQR) {
          var w = v.videoWidth, h = v.videoHeight, s = Math.min(1, 640 / Math.max(w, h)); cv.width = Math.round(w * s); cv.height = Math.round(h * s);
          var x = cv.getContext('2d', { willReadFrequently: true }); x.drawImage(v, 0, 0, cv.width, cv.height);
          var d = x.getImageData(0, 0, cv.width, cv.height), r = G.jsQR(d.data, cv.width, cv.height, { inversionAttempts: 'dontInvert' }); if (r) hit(r.data);
        }
      }
      setTimeout(function () { requestAnimationFrame(tick); }, 120);
    }
    this.start = function () {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { onMsg && onMsg('這個瀏覽器不能開相機，請改用下面的「手動輸入」'); return; }
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(function (s) { stream = s; v.srcObject = s; v.play(); alive = true; tick(); onMsg && onMsg('把 QR 放進框框裡'); })
        .catch(function () { onMsg && onMsg('沒辦法開相機（可能沒有給權限）。可以改用下面的「手動輸入」'); });
    };
    this.stop = function () { alive = false; if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; };
    this.reset = function () { last = ''; };
  }
  G.KiteScan = { drawQR: drawQR, Scanner: Scanner };
})(window);
