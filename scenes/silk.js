// Konsep 1: Silk flow. Garis aliran seperti sutra/tinta, loop mulus (semua gelombang berkelipatan bulat).
window.SCENE = (() => {
  const TAU = Math.PI * 2;
  let seeds;
  const rng = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const ang = (x, y, p) =>
    1.9 * Math.sin(1.6 * x + 1.1 * y + p) + 1.3 * Math.sin(-1.2 * x + 2.4 * y - 2 * p + 1.7) +
    0.8 * Math.sin(3.2 * x + 0.6 * y + 3 * p + 0.4) + 0.6 * Math.sin(4.1 * y - 2.2 * x + p + 2.9);
  return {
    init() { const r = rng(7); seeds = []; for (let i = 0; i < 1500; i++) seeds.push([r() * 1.3 - 0.15, r() * 1.3 - 0.15, r()]); },
    draw(ctx, W, H, t) {
      const p = t * TAU, s = 2.2 / H, L = H * 0.0042;
      const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#040a18'); g.addColorStop(1, '#0b1a36');
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const [sx, sy, q] of seeds) {
        let px = sx * W, py = sy * H; const pts = [[px, py]];
        for (let i = 0; i < 110; i++) { const a = ang(px * s, py * s, p); px += Math.cos(a) * L; py += Math.sin(a) * L; pts.push([px, py]); }
        const r = 40 + 215 * q, gr = 190 + 6 * q, b = 205 - 55 * q;
        for (const [w, al] of [[H * (0.0016 + 0.002 * q), 0.035 + 0.05 * q], [H * (0.0003 + 0.0006 * q), 0.18 + 0.3 * q]]) {
          ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
          ctx.strokeStyle = `rgba(${r | 0},${gr | 0},${b | 0},${al})`; ctx.lineWidth = w; ctx.stroke();
        }
      }
    }
  };
})();
