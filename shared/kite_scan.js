/* 小鳶來港 共用：開相機掃 QR、把文字畫成 QR（工作單 23，D71）
   掃描：有 BarcodeDetector 就用手機內建的，沒有就用 jsQR（shared/vendor/jsQR.js）。
   在官方 LINE（LIFF）裡改用 liff.scanCodeV2；開不了即時相機時提供拍照掃描（D148）。 */
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
    /* D148（Dari 10/21：LINE 裡按掃描集點開不了相機）
       1) 正式官方 LINE（LIFF 裡）：用 LINE 自己的掃描器 liff.scanCodeV2（LIFF 設定要開「Scan QR」），不用跟瀏覽器要相機權限
       2) 一般瀏覽器：開即時相機；開不了（LINE 內建瀏覽器常見）就給「📷 拍照掃描」：叫出手機相機拍一張，再從照片讀 QR */
    function photoBtn(msg) {
      var w = document.createElement('div'); w.className = 'scanAlt';
      w.innerHTML = '<p>' + (msg || '') + '</p><label class="btn full scanPh">📷 拍照掃描<input type="file" accept="image/*" capture="environment" hidden></label><button type="button" class="btn alt full scanRe">再試一次開相機</button>';
      box.innerHTML = ''; box.appendChild(w);
      w.querySelector('input').onchange = function () { var f = this.files && this.files[0]; this.value = ''; if (!f) return; onMsg && onMsg('讀取照片中…'); readPhoto(f); };
      w.querySelector('.scanRe').onclick = function () { box.innerHTML = ''; box.appendChild(v); box.appendChild(frame); live(); };
    }
    function readPhoto(f) {
      var img = new Image(), url = URL.createObjectURL(f);
      img.onload = function () { URL.revokeObjectURL(url);
        var tryJs = function () { var sc = Math.min(1, 1200 / Math.max(img.width, img.height)); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc); var x = cv.getContext('2d'); x.drawImage(img, 0, 0, cv.width, cv.height); var d = x.getImageData(0, 0, cv.width, cv.height), r = G.jsQR ? G.jsQR(d.data, cv.width, cv.height, { inversionAttempts: 'attemptBoth' }) : null; if (r) { last = ''; hit(r.data); onMsg && onMsg('讀到了！'); } else onMsg && onMsg('照片裡找不到 QR，靠近一點、對清楚再拍一次，或輸入下面的 8 位數字'); };
        if (det) det.detect(img).then(function (r) { if (r && r[0]) { last = ''; hit(r[0].rawValue); onMsg && onMsg('讀到了！'); } else tryJs(); }).catch(tryJs); else tryJs(); };
      img.onerror = function () { onMsg && onMsg('照片讀不到，請再拍一次'); }; img.src = url;
    }
    function live() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { onMsg && onMsg(''); return photoBtn('這裡不能直接開相機，可以拍照掃描'); }
      onMsg && onMsg('開相機中…（第一次會問要不要給相機權限，請按允許）');
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(function (s) { stream = s; v.srcObject = s; v.play(); alive = true; tick(); onMsg && onMsg('把 QR 放進框框裡'); })
        .catch(function () { onMsg && onMsg('如果剛剛按了不允許，要到手機設定把相機權限打開'); photoBtn('沒辦法直接開相機，改用拍照掃描'); });
    }
    function lineScan() {
      box.innerHTML = '<div class="scanAlt"><p>用 LINE 的掃描器掃店家的 QR</p><button type="button" class="btn full scanL">📷 開啟掃描器</button></div>';
      var go = function () { G.liff.scanCodeV2().then(function (r) { if (r && r.value) { last = ''; hit(r.value); } }).catch(function () { onMsg && onMsg('LINE 掃描器打不開，改用拍照掃描'); photoBtn(''); }); };
      box.querySelector('.scanL').onclick = go; go();
    }
    this.start = function () {
      if (G.liff && G.liff.isInClient && G.liff.isInClient() && G.liff.scanCodeV2) return lineScan();
      live();
    };
    this.stop = function () { alive = false; if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; };
    this.reset = function () { last = ''; };
  }
  try { var st = document.createElement('style'); st.textContent = '.scanAlt{display:flex;flex-direction:column;gap:10px;justify-content:center;padding:18px;height:100%;min-height:200px;box-sizing:border-box;text-align:center}.scanAlt p{margin:0;font-weight:700;color:#fff;line-height:1.5}.scanAlt .btn{cursor:pointer}'; document.head.appendChild(st); } catch (e) {}
  G.KiteScan = { drawQR: drawQR, Scanner: Scanner };
})(window);
