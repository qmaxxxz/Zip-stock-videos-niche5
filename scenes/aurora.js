// Konsep 3: Aurora gradient. Gradien cair + bokeh lembut + grain halus, loop mulus.
window.SCENE = (() => {
  const TAU = Math.PI * 2;
  const rng = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const blobs = [
    { c: [43, 123, 255], x: 0.3, y: 0.35, fx: 1, fy: 2, a: 0.2, b: 0.16, r: 0.55 },
    { c: [138, 60, 255], x: 0.7, y: 0.3, fx: 2, fy: 1, a: 0.18, b: 0.2, r: 0.5 },
    { c: [0, 214, 200], x: 0.5, y: 0.75, fx: 1, fy: 1, a: 0.25, b: 0.12, r: 0.5 },
    { c: [255, 79, 163], x: 0.8, y: 0.7, fx: 2, fy: 2, a: 0.15, b: 0.15, r: 0.42 },
    { c: [255, 179, 71], x: 0.2, y: 0.75, fx: 1, fy: 3, a: 0.12, b: 0.14, r: 0.35 }
  ];
  let bok, grain;
  return {
    init() {
      const r = rng(11); bok = [];
      for (let i = 0; i < 34; i++) bok.push({ x: r(), y: r(), r: 0.012 + 0.045 * r() * r(), fx: 1 + (r() * 2 | 0), fy: 1 + (r() * 2 | 0), ph: r() * TAU, ph2: r() * TAU, al: 0.04 + 0.1 * r(), c: blobs[i % 5].c });
      grain = document.createElement('canvas'); grain.width = grain.height = 512;
      const g = grain.getContext('2d'), im = g.createImageData(512, 512);
      for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255 | 0; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
      g.putImageData(im, 0, 0);
    },
    draw(ctx, W, H, t, f) {
      const p = t * TAU;
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = '#06060f'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      blobs.forEach((b, i) => {
        const x = (b.x + b.a * Math.sin(p * b.fx + i * 1.3)) * W, y = (b.y + b.b * Math.sin(p * b.fy + i * 2.1)) * H, R = b.r * H * (1 + 0.12 * Math.sin(p * 2 + i));
        const g = ctx.createRadialGradient(x, y, 0, x, y, R), c = b.c.join(',');
        g.addColorStop(0, `rgba(${c},.62)`); g.addColorStop(0.45, `rgba(${c},.22)`); g.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      });
      bok.forEach(o => {
        const x = (o.x + 0.04 * Math.sin(p * o.fx + o.ph)) * W, y = (o.y + 0.04 * Math.sin(p * o.fy + o.ph2)) * H, R = o.r * H, c = o.c.join(',');
        ctx.fillStyle = `rgba(${c},${o.al})`; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
        ctx.strokeStyle = `rgba(${c},${o.al * 2})`; ctx.lineWidth = R * 0.05; ctx.stroke();
      });
      ctx.globalCompositeOperation = 'source-over';
      const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.7);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
      const rr = rng(f + 1); ctx.save(); ctx.translate(-(rr() * 512 | 0), -(rr() * 512 | 0));
      ctx.fillStyle = ctx.createPattern(grain, 'repeat'); ctx.globalAlpha = 0.07; ctx.globalCompositeOperation = 'overlay';
      ctx.fillRect(0, 0, W + 512, H + 512); ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  };
})();
     
