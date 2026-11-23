// Konsep 2: Dot terrain. Lanskap titik bergelombang 3D, gradien ungu-cyan, loop mulus.
window.SCENE = (() => {
  const TAU = Math.PI * 2, ROWS = 220, COLS = 180;
  const h = (x, z, p) => 0.55 * Math.sin(0.9 * x + p) * Math.cos(0.7 * z - p) + 0.35 * Math.sin(1.7 * x - 1.3 * z + 2 * p + 1) + 0.2 * Math.sin(2.9 * z + 0.5 * x - p + 2);
  return {
    init() {},
    draw(ctx, W, H, t) {
      const p = t * TAU, k = H / 2160, hz = H * 0.36, f = H * 0.9, cam = 3.4;
      ctx.globalCompositeOperation = 'source-over';
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#060614'); g.addColorStop(0.45, '#190f40'); g.addColorStop(1, '#0a0720');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const gl = ctx.createRadialGradient(W / 2, hz, 0, W / 2, hz, W * 0.5);
      gl.addColorStop(0, 'rgba(255,90,190,.30)'); gl.addColorStop(1, 'rgba(255,90,190,0)');
      ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (let r = 0; r < ROWS; r++) {
        const d = r / (ROWS - 1), wz = 2.2 + 46 * Math.pow(1 - d, 1.7), sc = f / wz, half = (W / 2) / sc * 1.05, fog = Math.pow(d, 0.8);
        for (let c = 0; c < COLS; c++) {
          const wx = (c / (COLS - 1) - 0.5) * 2 * half, hv = h(wx, wz, p), n = (hv + 1.1) / 2.2;
          const sx = W / 2 + wx * sc, sy = hz + (cam - hv * 1.6) * sc;
          if (sy > H + 10 || sy < 0) continue;
          const rr = (0.9 + 4.2 * Math.pow(d, 1.4)) * k;
          const R = 70 + 185 * n * n, G = 90 + 140 * (1 - Math.abs(n - 0.5) * 2), B = 255 - 60 * n;
          ctx.fillStyle = `rgba(${R | 0},${G | 0},${B | 0},${0.12 + 0.75 * fog})`;
          ctx.beginPath(); ctx.arc(sx, sy, rr, 0, TAU); ctx.fill();
        }
      }
    }
  };
})();
