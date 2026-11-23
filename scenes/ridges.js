// Konsep 5: Ridge lines. Garis gelombang berlapis seperti punggung bukit, gradien magenta-amber, loop mulus.
window.SCENE = (() => {
  const TAU = Math.PI * 2, ROWS = 80, STEPS = 320;
  return {
    init() {},
    draw(ctx, W, H, t) {
      const p = t * TAU;
      ctx.globalCompositeOperation = 'source-over';
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#14061f'); g.addColorStop(1, '#070310');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.lineJoin = 'round'; ctx.lineWidth = H * 0.0024;
      for (let i = 0; i < ROWS; i++) {
        const q = i / (ROWS - 1), base = H * (0.24 + 0.72 * q), amp = H * 0.13 * (0.25 + 0.75 * q);
        ctx.beginPath(); ctx.moveTo(-10, H + 10);
        for (let s = 0; s <= STEPS; s++) {
          const u = s / STEPS, env = Math.exp(-Math.pow((u - 0.5) * 2.2, 2));
          const w = 0.5 * Math.sin(u * 9 + i * 0.18 - p) + 0.3 * Math.sin(u * 17 - i * 0.11 + 2 * p) + 0.4 * Math.sin(u * 5 + p + i * 0.3);
          ctx.lineTo(u * W, base - amp * (0.15 + env) * (w + 0.9));
        }
        ctx.lineTo(W + 10, H + 10); ctx.closePath();
        ctx.fillStyle = '#070310'; ctx.fill();
        ctx.strokeStyle = `rgb(255,${(70 + 120 * q) | 0},${(160 - 70 * q) | 0})`; ctx.stroke();
      }
    }
  };
})();
