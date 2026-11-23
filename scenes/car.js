// Konsep 6: Mobil 3D hitam generik (tanpa merek), WebGL2 murni tanpa library.
// Kamera sinematik: belakang -> samping -> depan. Gerak: melaju kencang lalu melambat.
// Waktu t dinormalisasi 0..1 (total durasi = detik yang dirender), jadi koreografi selalu utuh.
window.SCENE = (() => {
  'use strict';
  const PI = Math.PI, TAU = PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t;
  const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const sg = Math.sign, C = (a, e) => sg(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), e), S = (a, e) => sg(Math.sin(a)) * Math.pow(Math.abs(Math.sin(a)), e);
  // kurva halus Hermite (tangen selisih hingga) pada daftar [x, nilai]
  function key(k, s) {
    s = Math.min(k[k.length - 1][0], Math.max(k[0][0], s)); let i = 0;
    while (i < k.length - 2 && s > k[i + 1][0]) i++;
    const [s0, v0] = k[i], [s1, v1] = k[i + 1], h = s1 - s0, t = (s - s0) / h, t2 = t * t, t3 = t2 * t;
    const m0 = i > 0 ? (v1 - k[i - 1][1]) / (s1 - k[i - 1][0]) : (v1 - v0) / h;
    const m1 = i < k.length - 2 ? (k[i + 2][1] - v0) / (k[i + 2][0] - s0) : (v1 - v0) / h;
    return (2 * t3 - 3 * t2 + 1) * v0 + (t3 - 2 * t2 + t) * h * m0 + (-2 * t3 + 3 * t2) * v1 + (t3 - t2) * h * m1;
  }
  // ---------- matriks (column-major) ----------
  const M = {
    id: () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
    mul(a, b) { const o = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; },
    T: (x, y, z) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]),
    Sc: (x, y, z) => new Float32Array([x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1]),
    Rz: a => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); },
    persp(f, as, n, fa) { const t = 1 / Math.tan(f / 2); return new Float32Array([t / as, 0, 0, 0, 0, t, 0, 0, 0, 0, (fa + n) / (n - fa), -1, 0, 0, 2 * fa * n / (n - fa), 0]); },
    look(e, c, u) {
      let z = [e[0] - c[0], e[1] - c[1], e[2] - c[2]], l = Math.hypot(...z); z = z.map(v => v / l);
      let x = [u[1] * z[2] - u[2] * z[1], u[2] * z[0] - u[0] * z[2], u[0] * z[1] - u[1] * z[0]]; l = Math.hypot(...x); x = x.map(v => v / l);
      const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]], d = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -d(x, e), -d(y, e), -d(z, e), 1]);
    }
  };
  // ---------- pembuat mesh ----------
  const P = [], N = [], MT = [], UV = [], I = [];
  const vtx = (p, n, m, uv) => { P.push(p[0], p[1], p[2]); N.push(n[0], n[1], n[2]); MT.push(m); UV.push(uv ? uv[0] : 0, uv ? uv[1] : 0); return P.length / 3 - 1; };
  function grid(nu, nv, wrap, f, mf, uvf) {
    const base = P.length / 3, pts = [];
    for (let i = 0; i < nu; i++) { pts.push([]); for (let j = 0; j < nv; j++) pts[i].push(f(i / (nu - 1), wrap ? j / nv : j / (nv - 1))); }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a = pts[Math.min(i + 1, nu - 1)][j], b = pts[Math.max(i - 1, 0)][j];
      const jp = wrap ? (j + 1) % nv : Math.min(j + 1, nv - 1), jm = wrap ? (j - 1 + nv) % nv : Math.max(j - 1, 0), c = pts[i][jp], d = pts[i][jm];
      const u = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], w = [c[0] - d[0], c[1] - d[1], c[2] - d[2]];
      let n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]; const l = Math.hypot(...n);
      n = l < 1e-12 ? [0, 0, 1] : n.map(v => v / l);
      const p = pts[i][j];
      vtx(p, n, mf ? mf(i / (nu - 1), wrap ? j / nv : j / (nv - 1), p) : 0, uvf ? uvf(p) : null);
    }
    const vj = wrap ? nv : nv - 1;
    for (let i = 0; i < nu - 1; i++) for (let j = 0; j < vj; j++) { const j2 = (j + 1) % nv, a = base + i * nv + j, b = base + i * nv + j2, c = base + (i + 1) * nv + j, d = base + (i + 1) * nv + j2; I.push(a, b, c, b, d, c); }
  }
  // superquadric: e=1 elips, e kecil = kotak membulat
  function sqd(cx, cy, cz, rx, ry, rz, e1, e2, mat, yaw = 0, nu = 18, nv = 28) {
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    grid(nu, nv, true, (u, v) => {
      const a = (u - .5) * PI, b = v * TAU - PI, x = rx * C(a, e1) * C(b, e2), y = ry * S(a, e1), z = rz * C(a, e1) * S(b, e2);
      return [cx + x * cs + z * sn, cy + y, cz - x * sn + z * cs];
    }, () => mat);
  }
  const disc = (cx, cy, cz, r, mat, uvScale) => grid(8, 40, true, (u, v) => [cx + r * u * Math.cos(v * TAU), Math.max(.02, cy + r * u * Math.sin(v * TAU)), cz], () => mat);

  // ---------- bodi mobil ----------
  const Y0 = [[-2.35, .34], [-2.0, .24], [-1.2, .2], [1.2, .2], [2.0, .24], [2.35, .34]];
  const YT = [[-2.35, .6], [-2.05, .8], [-1.4, .86], [-.6, .84], [.6, .82], [1.3, .72], [2.0, .6], [2.35, .46]];
  const WW = [[-2.35, .7], [-2.0, .88], [-1.4, .93], [0, .94], [1.3, .92], [2.0, .85], [2.35, .68]];
  const YR = [[-1.4, .86], [-1.15, 1.04], [-.8, 1.18], [-.2, 1.24], [.35, 1.18], [.75, 1.0], [.95, .82]];
  const WC = [[-1.4, .6], [-1.1, .7], [-.5, .76], [.2, .77], [.6, .74], [.95, .76]];
  const cap = (x) => { const u = x > 0 ? (x - 1.5) / .85 : (-1.5 - x) / .85; if (u <= 0) return 1; const e = x > 0 ? 2.2 : 2.6; return Math.max(.012, Math.pow(1 - Math.pow(clamp(u), e), 1 / e)); };
  function body() {
    grid(140, 72, true, (u, v) => {
      const x = 2.35 * Math.sin((u - .5) * PI), f = cap(x), y0 = key(Y0, x), yt = key(YT, x), w = key(WW, x) * f, hh = (yt - y0) / 2 * f, yc = (y0 + yt) / 2;
      const a = v * TAU, cs = Math.cos(a), sn = Math.sin(a), n = sn > 0 ? 2.9 : 3.8;
      return [x, yc + hh * S(a, 2 / n), w * C(a, 2 / n)];
    });
    // kabin kaca + atap cat
    grid(80, 56, true, (u, v) => {
      const x = lerp(-1.4, .95, u), cf = Math.max(.02, Math.pow(clamp(Math.min((x + 1.4) / .3, (.95 - x) / .3)), .5));
      const yb = key(YT, x) - .1, yr = key(YR, x), w = key(WC, x) * cf, hh = (yr - yb) / 2 * cf, yc = (yr + yb) / 2, a = v * TAU;
      return [x, yc + hh * S(a, .8), w * C(a, .8)];
    }, (u, v, p) => {
      const x = p[0], sn = Math.sin(v * TAU), roof = sn > .55 && x > -.85 && x < .38;
      const pil = sn > -.1 && ((x > .5 && x < .74) || (x > -.44 && x < -.27) || (x > -1.4 && x < -1.12));
      return roof || pil ? 0 : 1;
    });
    // roda: cakram kegelapan bak lengkung roda (4 buah)
    for (const x of [1.3, -1.42]) for (const z of [.936, -.936]) disc(x, .37, z, .45, 8);
    // lampu depan, grille, splitter, lampu belakang, knalpot, spion
    for (const s of [1, -1]) {
      sqd(1.9, .55, s * .5, .2, .05, .17, .5, .5, 5, s * -.5, 14, 22);
      sqd(.62, .97, s * .86, .11, .06, .07, .8, .8, 0, s * .2, 12, 18);
    }
    sqd(2.2, .33, 0, .09, .08, .3, .3, .3, 7, 0, 12, 20);
    sqd(2.05, .21, 0, .32, .012, .72, .3, .3, 7);
    sqd(-2.12, .7, 0, .06, .04, .56, .3, .3, 6);
    sqd(2.06, .395, 0, .1, .012, .3, .3, .3, 2, 0, 8, 14);
    for (const s of [1, -1]) {
      grid(8, 24, true, (u, v) => { const x = lerp(-2.22, -2.46, u), r = .06 * (1 + .1 * ss(.7, 1, u)), a = v * TAU; return [x, .3 + r * Math.cos(a), s * .45 + r * Math.sin(a)]; }, () => 2);
      grid(4, 20, true, (u, v) => { const r = .05 * u, a = v * TAU; return [-2.4, .3 + r * Math.cos(a), s * .45 + r * Math.sin(a)]; }, () => 8);
    }
  }
  function wheel() {
    const tp = [[.215, .125], [.255, .14], [.325, .132], [.358, .095], [.366, .04], [.366, -.04], [.358, -.095], [.325, -.132], [.255, -.14], [.215, -.125]];
    const kr = tp.map((p, i) => [i, p[0]]), kz = tp.map((p, i) => [i, p[1]]);
    grid(44, 56, true, (u, v) => { const s = u * (tp.length - 1), r = key(kr, s), z = key(kz, s), a = v * TAU; return [r * Math.cos(a), r * Math.sin(a), z]; }, () => 3);
    grid(12, 56, true, (u, v) => { const r = .235 * u, a = v * TAU; return [r * Math.cos(a), r * Math.sin(a), .118 + .022 * u * u]; }, () => 4, p => [p[0] / .235, p[1] / .235]);
  }

  // ---------- shader ----------
  const VS = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in float aM; layout(location=3) in vec2 aUV;
uniform mat4 uModel, uVP; out vec3 vP, vN, vL; out float vM; out vec2 vUV;
void main(){ vec4 w=uModel*vec4(aP,1.); vP=w.xyz; vN=mat3(uModel)*aN; vL=aP; vM=aM; vUV=aUV; gl_Position=uVP*w; }`;
  const FS = `#version 300 es
precision highp float;
in vec3 vP, vN, vL; in float vM; in vec2 vUV;
uniform vec3 uCam, uTint; uniform float uTravel, uSpin, uBlur; uniform int uKind;
out vec4 o;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 envL(vec3 P, vec3 R){
  vec3 c=mix(vec3(.004,.005,.008),vec3(.02,.025,.04),smoothstep(-.3,.9,R.y));
  c+=vec3(.55,.6,.7)*exp(-pow(R.y*3.2,2.))*.22;
  if(R.y>.03){
    float t=(6.-P.y)/R.y; vec2 h=P.xz+R.xz*t;
    float bx=abs(fract((h.x+uTravel)/4.5)-.5)*4.5;
    float bar=smoothstep(.42,.30,bx)*smoothstep(2.6,2.2,abs(h.y));
    float strip=smoothstep(.22,.12,abs(h.y))*smoothstep(30.,20.,abs(h.x));
    float soft=smoothstep(3.2,1.2,abs(h.x))*smoothstep(1.8,.8,abs(h.y));
    c+=vec3(1.,.97,.92)*(bar*4.5+strip*1.6)+vec3(1.,.98,.95)*soft*1.4;
  }
  if(abs(R.z)>.04){
    float sz=R.z>0.?1.:-1.; float t=(sz*7.-P.z)/R.z; vec3 h=P+R*t;
    if(t>0.){
      float px=abs(fract((h.x+uTravel)/7.)-.5)*7.;
      float pole=smoothstep(.2,.08,px)*smoothstep(3.4,3.0,h.y)*smoothstep(-.1,.2,h.y);
      float low=smoothstep(.06,0.,abs(h.y-.9));
      vec3 col=sz>0.?vec3(1.,.55,.2):vec3(.3,.62,1.);
      c+=col*(pole*5.+low*1.1)*smoothstep(45.,15.,abs(h.x));
    }
  }
  return c;
}
vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
vec3 sky(vec3 R){ return vec3(.35,.38,.42)*(R.y*.5+.5)*.35; }
void main(){
  vec3 V=normalize(uCam-vP); vec3 col;
  if(uKind==1){
    float d=length(uCam-vP); vec3 Rr=vec3(-V.x,V.y,-V.z);
    float wx=vP.x+uTravel; vec2 np=floor(vec2(wx,vP.z)*40.);
    vec3 Rp=normalize(Rr+vec3(sin(wx*9.+vP.z*7.)*.012+(hash(np)-.5)*.012,0.,sin(vP.z*11.-wx*5.)*.012+(hash(np+7.)-.5)*.012));
    vec3 e=envL(vP,Rp); float Fr=.06+.94*pow(1.-clamp(V.y,0.,1.),5.);
    float dd=fract(wx/6.); float dash=smoothstep(0.,.03+.25*uBlur,dd)*(1.-smoothstep(.35,.38+.25*uBlur,dd))*(1.-.35*uBlur); float lz=abs(abs(vP.z)-2.1);
    float line=smoothstep(.09,.05,lz)*dash;
    vec2 sd=abs(vP.xz)-vec2(1.95,.75); float sh=length(max(sd,0.))+min(max(sd.x,sd.y),0.)-.15;
    float ao=smoothstep(0.,1.,sh);
    col=(vec3(.012,.013,.016)+line*vec3(.4,.4,.45)*.6+e*Fr*1.3)*mix(.25,1.,ao);
    float a=.66-.4*Fr; a=mix(.97,a,smoothstep(0.,.6,sh));
    float fog=1.-exp(-d*.045); col=mix(col,vec3(.003,.004,.007),fog); a=mix(a,1.,fog);
    o=vec4(pow(aces(col),vec3(1./2.2)),a); return;
  }
  vec3 N=normalize(vN); if(dot(N,V)<0.) N=-N;
  float NdV=max(dot(N,V),0.); vec3 R=reflect(-V,N); vec3 e=envL(vP,R);
  float m=vM; vec3 L1=normalize(vec3(.5,.8,.4));
  if(m<1.5){
    float Fp=.045+.955*pow(1.-NdV,5.);
    float seam=0.; if(abs(N.z)>.5 && vL.y>.25){ seam=max(smoothstep(.006,0.,abs(vL.x-.34)),smoothstep(.006,0.,abs(vL.x+.72))); }
    vec3 paint=vec3(.008,.008,.01)*(.4+max(dot(N,L1),0.))+e*Fp*1.6+vec3(1.,.95,.9)*pow(max(dot(N,normalize(L1+V)),0.),140.)*.5;
    paint*=1.-.85*seam;
    float Fg=.12+.88*pow(1.-NdV,4.); vec3 glass=vec3(.004,.006,.01)+e*Fg*1.4;
    col=mix(paint,glass,smoothstep(.35,.65,clamp(m,0.,1.)));
  } else if(m<2.5){ col=(e+sky(R))*vec3(.95,.96,1.)*.95;
  } else if(m<3.5){ float Ft=.04+.96*pow(1.-NdV,4.); col=vec3(.012)+e*Ft*.25+vec3(.02)*smoothstep(.25,.0,abs(vL.z-.0))*.0;
  } else if(m<4.5){
    vec2 uv=vUV; float r=length(uv); float sp=uSpin; mat2 rot=mat2(cos(sp),sin(sp),-sin(sp),cos(sp));
    vec2 q=rot*uv; float a=atan(q.y,q.x);
    float sA=abs(fract(a*10./6.28318+.5)-.5)*2.;
    float spoke=(1.-smoothstep(.16+.1*r,.26+.12*r,sA))*smoothstep(.16,.24,r)*(1.-smoothstep(.86,.92,r));
    float hub=1.-smoothstep(.17,.2,r), lip=smoothstep(.86,.92,r);
    float metal=clamp(spoke+hub+lip,0.,1.); metal=mix(metal,.62,uBlur);
    vec3 Nr=normalize(N+vec3(uv,0.)*.45*r); vec3 Rm=reflect(-V,Nr); vec3 em=envL(vP,Rm)+sky(Rm);
    vec3 mcol=em*vec3(.95,.96,1.)*.95;
    float ang=atan(uv.y,uv.x); float cal=step(abs(ang-1.05),.38)*step(.46,r)*step(r,.84);
    vec3 gap=vec3(.03,.03,.035)+.015*sin(r*120.); gap=mix(gap,vec3(.32,.01,.01)+e*.12,cal);
    col=mix(gap,mcol,metal);
  } else if(m<5.5){ col=vec3(1.,.97,.9)*3.5;
  } else if(m<6.5){ col=vec3(1.,.03,.02)*(2.2+.8*smoothstep(.5,.0,abs(vL.y-.7)));
  } else if(m<7.5){ col=vec3(.012)+e*.04;
  } else if(m<8.5){ col=vec3(.0015);
  } else { col=uTint; }
  float vig=1.;
  o=vec4(pow(aces(col),vec3(1./2.2)),1.);
}`;

  // ---------- state ----------
  let gl, prog, U = {}, total = 20, W, H, ranges = {}, distTab, VMAX = 42;
  const speedK = [[0, .97], [.12, 1], [.35, 1], [.6, .35], [.82, .09], [1, .05]];
  const camA = [[0, .96 * PI], [.25, .8 * PI], [.55, .5 * PI], [.8, .25 * PI], [1, .05 * PI]];
  const camR = [[0, 6.2], [.25, 7], [.55, 6], [.8, 6.6], [1, 5.8]], camH = [[0, .95], [.25, .8], [.55, .65], [.8, .55], [1, .62]], camF = [[0, 52], [.3, 46], [.6, 40], [1, 34]];
  const sp = s => key(speedK, s);

  function init(canvas, w, h, seconds) {
    W = w; H = h; total = seconds || 20;
    gl = canvas.getContext('webgl2', { antialias: true, preserveDrawingBuffer: true, alpha: false });
    if (!gl) throw new Error('WebGL2 tidak tersedia');
    body(); ranges.body = [0, I.length];
    const w0 = I.length; wheel(); ranges.wheel = [w0, I.length - w0];
    const p0 = I.length; sqd(0, 1, 0, .08, 1, .08, .15, .15, 10, 0, 6, 10); ranges.pole = [p0, I.length - p0];
    const f0 = P.length / 3, fi = I.length; const R = 150;
    [[-R, -R], [R, -R], [R, R], [-R, R]].forEach(q => vtx([q[0], 0, q[1]], [0, 1, 0], 0));
    I.push(f0, f0 + 1, f0 + 2, f0, f0 + 2, f0 + 3); ranges.floor = [fi, 6];
    const vb = new Float32Array(P.length / 3 * 9);
    for (let i = 0; i < P.length / 3; i++) { vb.set(P.slice(i * 3, i * 3 + 3), i * 9); vb.set(N.slice(i * 3, i * 3 + 3), i * 9 + 3); vb[i * 9 + 6] = MT[i]; vb[i * 9 + 7] = UV[i * 2]; vb[i * 9 + 8] = UV[i * 2 + 1]; }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, vb, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(I), gl.STATIC_DRAW);
    [[0, 3, 0], [1, 3, 3], [2, 1, 6], [3, 2, 7]].forEach(([l, n, o]) => { gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, n, gl.FLOAT, false, 36, o * 4); });
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
    prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog); ['uModel', 'uVP', 'uCam', 'uTint', 'uTravel', 'uSpin', 'uBlur', 'uKind'].forEach(n => U[n] = gl.getUniformLocation(prog, n));
    // tabel jarak tempuh (integral kecepatan)
    const n = 4000; distTab = new Float32Array(n + 1);
    for (let i = 1; i <= n; i++) distTab[i] = distTab[i - 1] + sp((i - .5) / n) * VMAX * total / n;
    gl.viewport(0, 0, W, H); gl.enable(gl.DEPTH_TEST); { const ac = x => (x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), g = x => Math.pow(clamp(ac(x)), 1 / 2.2); gl.clearColor(g(.003), g(.004), g(.007), 1); }
  }
  const dist = s => { const x = clamp(s) * 4000, i = Math.min(3999, Math.floor(x)); return lerp(distTab[i], distTab[i + 1], x - i); };
  function drawR(r, model, kind, tint, spin, blur) {
    gl.uniformMatrix4fv(U.uModel, false, model); gl.uniform1i(U.uKind, kind);
    if (tint) gl.uniform3fv(U.uTint, tint); gl.uniform1f(U.uSpin, spin || 0); gl.uniform1f(U.uBlur, blur || 0);
    gl.drawElements(gl.TRIANGLES, r[1], gl.UNSIGNED_INT, r[0] * 4);
  }
  function draw(t) {
    const s = clamp(t), v = sp(s), travel = dist(s), speed = v * VMAX, accel = VMAX * (sp(s + .002) - sp(s - .002)) / .004 / total;
    const pitch = clamp(accel * .0035, -.05, .05), spin = travel / .365, omega = speed / .365, blur = ss(18, 45, omega);
    const a = key(camA, s), cr = key(camR, s), ch = key(camH, s), fov = key(camF, s) * PI / 180;
    const tgt = [.25 * v, .55, 0], sh = (Math.sin(t * 57) + Math.sin(t * 31 + 1)) * .004 * (.3 + v);
    const cam = [tgt[0] + cr * Math.cos(a), ch + sh, cr * Math.sin(a) + sh];
    const VP = M.mul(M.persp(fov, W / H, .1, 300), M.look(cam, tgt, [0, 1, 0]));
    gl.uniformMatrix4fv(U.uVP, false, VP); gl.uniform3fv(U.uCam, cam); gl.uniform1f(U.uTravel, travel);
    const bob = .004 * Math.sin(travel * 3.1) * v;
    const carM = M.mul(M.T(0, bob + .4, 0), M.mul(M.Rz(pitch), M.T(0, -.4, 0)));
    const wheels = [[1.3, .84], [1.3, -.84], [-1.42, .84], [-1.42, -.84]];
    const base = ((-travel % 7) + 7) % 7;
    const scene = (mir) => {
      const mm = x => mir ? M.mul(M.Sc(1, -1, 1), x) : x;
      drawR(ranges.body, mm(carM), 0);
      for (const [x, z] of wheels) { const sz = z > 0 ? 1 : -1; drawR(ranges.wheel, mm(M.mul(M.T(x, .365, z), M.Sc(1, 1, sz))), 0, null, spin * sz, blur); }
      const st = 1 + 2.2 * v * v, ks = 1 / (1 + (st - 1) * .25);
      for (let j = -6; j <= 8; j++) for (const sd of [1, -1]) drawR(ranges.pole, mm(M.mul(M.T(base + j * 7, 0, sd * 6.8), M.Sc(st, 1.6, 1))), 0, (sd > 0 ? [2.4, 1.1, .3] : [.4, 1, 2.3]).map(c => c * ks));
    };
    gl.depthMask(true); gl.disable(gl.BLEND); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    scene(true);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    drawR(ranges.floor, M.id(), 1, null, 0, v);
    gl.disable(gl.BLEND); scene(false);
  }
  const vf = (w, h) => { const s = Math.max(2, Math.round(w / 110)); return `format=gbrp,split[a][b];[b]curves=all='0/0 0.6/0 1/1',gblur=sigma=${s}[c];[a][c]blend=all_mode=screen:all_opacity=0.6,vignette=PI/5,noise=alls=3:allf=t`; };
  return { webgl: true, init, draw, vf };
})();
