/* 小鳶來港 後台・示範模式（G95-R09，D130）
   固定亂數種子產生 40 位假會員、30 天的遊戲／集點／兌換／服務台紀錄，只放在記憶體裡給後台畫面用：
   不寫進瀏覽器儲存、不上傳雲端、不改真的會員。開關存在 sessionStorage，只影響這個分頁。 */
window.__ADM_DEMO = function (K) {
  if (window.__ADM_DEMO.cache) return window.__ADM_DEMO.cache;
  const c = K.cfg(), DAY = 864e5, now = Date.now(); let r = 20261020; const R = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const st = c.stores || [], pz = c.prizes || [], games = [['fish', ['s1', 's2', 's3', 's4']], ['fly', ['1', '2', '3', '4', '5', '6', '7', '8']], ['merge', ['all']], ['stack', ['all']]];
  const names = ['小明', '阿華', '佳佳', 'Kevin', '美玲', '志豪', '小芳', '阿德', 'Lin', '雅婷'];
  const hourAt = (t) => { const d = new Date(t); d.setHours(10 + Math.floor(R() * 10), Math.floor(R() * 60), 0, 0); return d.getTime(); };      // 營業時間 10～20 點
  const ms = [], desk = [];
  for (let i = 0; i < 40; i++) {
    const created = hourAt(now - Math.floor(R() * 30) * DAY); const m = { id: 'D' + (500000 + i * 37), name: R() < .7 ? names[i % 10] + (i > 9 ? i : '') : '', created, status: 'ok', tags: ['示範'], points: 0, scoreBank: {}, ledger: [], nonces: [], plays: [], tries: {}, redeems: [], visits: [], demo: true };
    const days = Math.ceil((now - created) / DAY);
    for (let d = 0; d < days; d++) {
      if (d && R() > .42) continue; const t0 = hourAt(created + d * DAY); if (t0 > now) break; const dk = K.dayKey(t0); if (m.visits.indexOf(dk) < 0) m.visits.push(dk);
      const np = 1 + Math.floor(R() * 5); for (let j = 0; j < np; j++) { const g = games[Math.floor(R() * 4)], lb = g[0] === 'merge' || g[0] === 'stack', t = t0 + j * 240e3, sc = Math.round(200 + R() * 3000); m.plays.unshift({ t, game: g[0], level: g[1][Math.floor(R() * g[1].length)], score: sc, counted: !lb, lbOnly: lb, raw: lb ? 0 : sc, bank: 0, sec: 45 + Math.round(R() * 60), mult: lb ? 1 : K.eventMult(g[0], t).mult }); }
      if (R() < .6) { const p = 1 + Math.floor(R() * 6); m.ledger.unshift({ t: t0 + 25 * 60e3, type: 'game', pts: p, game: R() < .6 ? 'fish' : 'fly', day: dk, rv: 1 }); m.points += p; }
      if (st.length && R() < .5) { const s = st[Math.floor(R() * st.length)], amt = 120 + Math.round(R() * 1400), p = Math.floor(amt / (c.spendPerPoint || 100)); m.ledger.unshift({ t: t0 + 50 * 60e3, type: 'store', pts: p, store: s.id, storeName: s.name, amount: amt, ref: 'DM' + i + d, rv: 1 }); m.points += p; }
      if (R() < .12) { m.ledger.unshift({ t: t0 + 70 * 60e3, type: 'travel', pts: 2, ref: '', rv: 1 }); m.points += 2; }
      if (pz.length && m.points > 15 && R() < .3) { const p = pz[Math.floor(R() * pz.length)], cost = p.points || p.cost || 10; if (m.points >= cost) { const code = 'DM' + K.rid(5), t = t0 + 90 * 60e3, ok = R() < .75 && now - t > DAY / 2; m.points -= cost; m.ledger.unshift({ t, type: 'redeem', pts: -cost, prize: p.id, prizeName: p.name, qty: 1, ref: code, rv: 1 }); m.redeems.unshift({ id: code, prize: p.id, name: p.name, pts: cost, qty: 1, t, code, status: ok ? 'done' : 'wait' }); if (ok) desk.unshift({ t: t + (10 + R() * 600) * 60e3, rcode: code, member: m.id, prize: p.id, prizeName: p.name, pts: cost, qty: 1, staff: '示範店員' }); } }
    }
    ms.push(m);
  }
  return (window.__ADM_DEMO.cache = { ms, desk });
};
