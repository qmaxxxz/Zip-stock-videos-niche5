// Konsep 4: Hex pulse. Kisi heksagon dengan gelombang cahaya yang merambat, loop mulus.
window.SCENE = (() => {
  const TAU = Math.PI * 2, S3 = Math.sqrt(3);
  return {
    init() {},
    draw(ctx, W, H, t) {
      const p = t * TAU, R = H * 0.03, dx = S3 * R, dy = 1.5 * R;
      ctx.globalCompositeOperation = 'source-over';
      const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
      g.addColorStop(0, '#0b2a3a'); g.addColorStop(1, '#030812'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; ctx.lineWidth = H * 0.0012;
      const rows = Math.ceil(H / dy) + 2, cols = Math.ceil(W / dx) + 2;
      for (let r = -1; r < rows; r++) for (let c = -1; c < cols; c++) {
        const cx = c * dx + (r & 1 ? dx / 2 : 0), cy = r * dy, d = Math.hypot(cx - W / 2, cy - H / 2);
        const n = 0.5 + 0.5 * Math.sin(d * 10 / H - p), m = 0.5 + 0.5 * Math.sin(cx / W * TAU * 2 + p), b = Math.pow(0.6 * n + 0.4 * m, 3);
        ctx.beginPath();
        for (let k = 0; k < 6; k++) { const a = TAU / 12 + TAU / 6 * k, x = cx + Math.cos(a) * R * 0.94, y = cy + Math.sin(a) * R * 0.94; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.closePath();
        ctx.fillStyle = `rgba(40,190,210,${0.03 + 0.3 * b})`; ctx.fill();
        ctx.strokeStyle = `rgba(120,235,255,${0.1 + 0.6 * b})`; ctx.stroke();
      }
    }
  };
})();
