// 程序化像素图标：16x16 绘制区 (+1px 描边 = 18x18 画布)。
// 每个形状自动做"左上高光/右下阴影"斜面着色，最后统一描边，保证整套图标风格一致。
export const N = 16;
export const SZ = 18;
const OUT = "#2a2030";

const hex2 = (h) => { h = h.replace("#", ""); if (h.length === 3) h = [...h].map((c) => c + c).join(""); const n = parseInt(h, 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const toHex = (r) => "#" + r.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
export const mix = (a, b, t) => { const A = hex2(a), B = hex2(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const light = (c) => mix(c, "#ffffff", 0.38);
const dark = (c) => mix(mix(c, "#000000", 0.34), "#301848", 0.12);

class G {
  constructor() { this.px = new Array(N * N).fill(null); }
  shape(fn, col, bevel = true) {
    const m = new Uint8Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (fn(x + 0.5, y + 0.5)) m[y * N + x] = 1;
    const at = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? 0 : m[y * N + x]);
    const L = light(col), D = dark(col);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (!m[y * N + x]) continue;
      let c = col;
      if (bevel) {
        const l = !at(x - 1, y) || !at(x, y - 1), d = !at(x + 1, y) || !at(x, y + 1);
        if (l && !d) c = L; else if (d && !l) c = D;
        else if (!l && !d && !at(x - 1, y - 1)) c = L;
      }
      this.px[y * N + x] = c;
    }
    return this;
  }
  ell(cx, cy, rx, ry, col, b) { return this.shape((x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1, col, b); }
  rect(x0, y0, w, h, col, b) { return this.shape((x, y) => x >= x0 && x < x0 + w && y >= y0 && y < y0 + h, col, b); }
  ring(cx, cy, r, w, col, b, ry) { ry = ry ?? r; return this.shape((x, y) => { const d = Math.hypot((x - cx), (y - cy) * r / ry); return d <= r && d >= r - w; }, col, b); }
  poly(pts, col, b) {
    return this.shape((x, y) => {
      let ins = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
      }
      return ins;
    }, col, b);
  }
  line(x0, y0, x1, y1, w, col, b) {
    const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1;
    return this.shape((x, y) => {
      const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / l2));
      return Math.hypot(x - (x0 + dx * t), y - (y0 + dy * t)) <= w / 2;
    }, col, b);
  }
  dot(x, y, col) { if (x >= 0 && y >= 0 && x < N && y < N) this.px[(y | 0) * N + (x | 0)] = col; return this; }
  dots(list, col) { for (const [x, y] of list) this.dot(x, y, col); return this; }
  hline(x, y, w, col) { for (let i = 0; i < w; i++) this.dot(x + i, y, col); return this; }
  vline(x, y, h, col) { for (let i = 0; i < h; i++) this.dot(x, y + i, col); return this; }
  star(cx, cy, col) { return this.dots([[cx, cy], [cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]], col); }
  render() {
    const cv = document.createElement("canvas"); cv.width = cv.height = SZ;
    const ctx = cv.getContext("2d");
    const filled = (x, y) => x >= 0 && y >= 0 && x < N && y < N && this.px[y * N + x];
    ctx.fillStyle = OUT;
    for (let y = -1; y <= N; y++) for (let x = -1; x <= N; x++) {
      if (filled(x, y)) continue;
      if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) ctx.fillRect(x + 1, y + 1, 1, 1);
    }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const c = this.px[y * N + x]; if (c) { ctx.fillStyle = c; ctx.fillRect(x + 1, y + 1, 1, 1); } }
    return cv;
  }
}

// ---------- 调色 ----------
const C = {
  wood: "#b9803f", woodL: "#d9a05a", woodD: "#7a4e28", leaf: "#4faa4a", leafD: "#2f7a3a", stem: "#3f9a45",
  gold: "#f4c430", goldD: "#c98a1a", silver: "#cfd6e4", iron: "#8c97ad", copper: "#d9772e", stone: "#8d8f9c",
  red: "#e0463c", pink: "#f27aa6", blue: "#4a8fe0", cyan: "#5fd0e8", green: "#4cc060", purple: "#9a5ad8", white: "#f7f4ef",
  cream: "#f3dcb0", brown: "#8a5a2b", bread: "#d99a4a", glass: "#bfe6f2", yellow: "#ffe14a", orange: "#f08a2a", black: "#2a2030",
};

// ---------- 产物链 ----------
const flower = [
  (g) => { g.ell(8, 12.5, 6, 2.2, "#6b4a2f"); g.ell(6, 8.5, 2.2, 3.2, "#d9a560"); g.ell(10.5, 9.5, 2, 3, "#c28a45"); g.dot(5, 7, "#fff0c8"); g.dot(10, 8, "#f0cf90"); },
  (g) => { g.ell(8, 13, 6, 2, "#6b4a2f"); g.line(8, 13, 8, 7, 1.6, C.stem); g.ell(5.5, 7, 2.6, 1.4, C.leaf); g.ell(10.5, 6, 2.6, 1.4, C.leaf); },
  (g) => { g.ell(8, 14, 5, 1.6, "#6b4a2f"); g.line(8, 14, 8, 4, 2, C.stem); g.ell(4.5, 9, 3.2, 1.8, C.leaf); g.ell(11.5, 7, 3.2, 1.8, C.leaf); g.ell(5.5, 4.5, 2.6, 1.5, C.leaf); g.ell(10.8, 3.6, 2.4, 1.4, C.leaf); },
  (g) => { g.line(8, 9, 10, 15, 1.4, C.stem); for (const [x, y] of [[5.5, 5.5], [10.5, 5.5], [5.5, 10], [10.5, 10]]) g.ell(x, y, 3.2, 3.2, C.leaf); g.dots([[5, 5], [10, 5], [5, 9], [10, 9]], C.leafD); g.dot(7, 7, C.white); },
  (g) => { g.line(8, 9, 8, 15, 1.4, C.stem); g.ell(11.5, 12.5, 2.8, 1.3, C.leaf); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.ell(8 + Math.cos(a) * 3.8, 6 + Math.sin(a) * 3.8, 1.9, 1.9, C.white); } g.ell(8, 6, 2.4, 2.4, C.yellow); },
  (g) => { g.line(8, 8, 8, 15, 1.6, C.stem); g.ell(5, 12.5, 2.6, 1.3, C.leaf); g.ell(11.5, 11, 2.6, 1.3, C.leaf); g.poly([[3.5, 1.5], [6, 4], [8, 1.5], [10, 4], [12.5, 1.5], [12.5, 7], [8, 10.5], [3.5, 7]], C.red); g.line(8, 3, 8, 9, 1, "#f27a70", false); },
  (g) => { g.line(8, 10, 8, 15, 1.6, C.stem); g.ell(4.8, 12.5, 2.4, 1.3, C.leaf); g.ell(11.4, 12, 2.4, 1.3, C.leaf); g.ell(8, 6, 5, 4.8, "#d8323a"); g.ring(8, 6, 3.2, 1, "#a01828", false); g.ring(8, 6, 1.4, 1, "#a01828", false); g.dot(5, 4, "#ff8a8a"); },
  (g) => { g.line(8, 9, 8, 15, 2, C.stem); g.ell(4.5, 13, 2.8, 1.4, C.leaf); g.ell(11.5, 12, 2.8, 1.4, C.leaf); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.ell(8 + Math.cos(a) * 4.8, 6 + Math.sin(a) * 4.8, 1.8, 1.8, C.yellow); } g.ell(8, 6, 3.4, 3.4, "#7a4a22"); g.dots([[7, 5], [9, 5], [8, 7], [6, 7], [10, 7]], "#4a2a14"); },
  (g) => { for (const x of [5, 8, 11]) g.line(8, 12, x, 6, 1, C.stem, false); g.poly([[3.5, 8], [12.5, 8], [9.5, 15], [6.5, 15]], "#f0b8d8"); g.ell(5, 5, 2.8, 2.8, C.red); g.ell(8, 3.5, 2.8, 2.8, C.yellow); g.ell(11, 5, 2.8, 2.8, C.pink); g.ell(8, 7, 2, 2, C.white); g.dot(8, 11, C.red); g.dot(7, 11, C.red); g.dot(9, 11, C.red); },
  (g) => { g.ring(8, 9, 6.3, 1.4, C.woodD, false, 7.5); g.ell(5, 8, 2.8, 2.8, C.red); g.ell(8, 5.5, 3, 3, C.yellow); g.ell(11, 8, 2.8, 2.8, C.pink); g.ell(8, 8.5, 2.4, 2.4, C.white); g.dots([[3, 7], [13, 6], [6, 3]], C.leaf); g.poly([[2, 10], [14, 10], [13, 15], [3, 15]], C.wood); g.hline(3, 12, 10, C.woodD); g.vline(6, 10, 5, C.woodD); g.vline(10, 10, 5, C.woodD); g.hline(2, 10, 12, C.woodL); },
];

const wood = [
  (g) => { g.line(2.5, 12.5, 12.5, 4.5, 2, C.wood); g.line(7.5, 8.5, 5.5, 5, 1.2, C.wood); g.line(10, 6.5, 13.5, 7, 1.2, C.wood); g.ell(5, 4, 1.6, 1.2, C.leaf); g.dot(4, 11, C.woodD); },
  (g) => { g.rect(2, 4.5, 10, 8, C.wood); g.ell(12, 8.5, 2.8, 4, C.woodL); g.ring(12, 8.5, 1.6, 0.9, C.woodD, false, 2.4); g.dot(12, 8, C.woodD); g.vline(5, 6, 5, C.woodD); g.vline(8, 5, 3, C.woodD); },
  (g) => { g.rect(1, 3, 13, 4, "#d9a05a"); g.rect(3, 8, 12, 4, C.wood); g.hline(3, 4, 8, C.woodD); g.hline(5, 9, 6, C.woodD); g.dots([[2, 5], [12, 5], [4, 10], [13, 10]], "#5a3a20"); },
  (g) => { g.rect(2, 3, 12, 11, C.wood); g.rect(2, 3, 12, 2, C.woodD, false); g.rect(2, 12, 12, 2, C.woodD, false); g.rect(2, 3, 2, 11, C.woodD, false); g.rect(12, 3, 2, 11, C.woodD, false); g.line(4, 5, 12, 12, 1.2, C.woodL, false); g.line(12, 5, 4, 12, 1.2, C.woodL, false); },
  (g) => { g.rect(2, 4, 12, 3, C.woodL); g.rect(3, 7, 2, 8, C.wood); g.rect(11, 7, 2, 8, C.wood); g.rect(5, 9, 6, 1, C.woodD, false); g.hline(4, 5, 8, "#e8b878"); },
  (g) => { g.rect(3, 1, 2, 8, C.wood); g.rect(11, 1, 2, 8, C.wood); g.rect(5, 2.5, 6, 1.5, C.woodL); g.rect(5, 5.5, 6, 1.5, C.woodL); g.rect(2.5, 8, 11, 2.5, C.woodL); g.rect(3, 10, 2, 5, C.wood); g.rect(11, 10, 2, 5, C.wood); },
  (g) => { g.rect(1, 5, 14, 3, C.woodL); g.rect(2, 8, 2, 7, C.wood); g.rect(12, 8, 2, 7, C.wood); g.rect(4, 8, 8, 1.5, C.woodD); g.ell(8, 3.5, 2, 2.2, C.pink); g.rect(7, 4.5, 2, 1, C.leaf); g.hline(2, 6, 12, "#e8b878"); },
  (g) => { g.rect(2, 1, 12, 2, C.woodL); g.rect(3, 3, 10, 12, C.woodD); g.rect(4, 4, 4, 10, C.wood); g.rect(8, 4, 4, 10, C.wood); g.vline(8, 4, 10, C.woodD); g.dots([[7, 9], [9, 9]], C.gold); g.rect(2, 14.5, 12, 1, "#5a3a20"); },
  (g) => { g.rect(2, 7, 12, 8, C.wood); g.poly([[0.5, 8], [8, 1], [15.5, 8]], "#d8423a"); g.rect(11, 2, 2, 4, C.stone); g.rect(6, 10, 4, 5, C.woodD); g.rect(10.5, 9, 3, 3, "#bfe6f2"); g.dot(12, 9, "#fff"); g.dot(9, 12, C.gold); g.hline(3, 9, 5, C.woodL); },
];

const ingot = (g, col) => { g.poly([[4, 4.5], [12, 4.5], [14, 8], [2, 8]], mix(col, "#fff", 0.3)); g.poly([[2, 8.5], [14, 8.5], [15, 13], [1, 13]], col); g.hline(4, 6, 3, "#ffffff"); g.dot(4, 10, mix(col, "#fff", 0.5)); };
const ore = [
  (g) => { g.ell(6, 10, 4.5, 3.8, C.stone); g.ell(11.5, 11.5, 3.5, 3, mix(C.stone, "#000", 0.15)); g.ell(9, 6, 3.4, 2.8, mix(C.stone, "#fff", 0.2)); },
  (g) => { g.ell(8, 9, 6.5, 5.5, C.stone); g.dots([[5, 7], [6, 8], [10, 6], [11, 7], [9, 11], [10, 12], [6, 11], [8, 9]], C.copper); g.dots([[5, 6], [10, 5]], "#f5b070"); },
  (g) => ingot(g, C.copper), (g) => ingot(g, C.iron), (g) => ingot(g, "#e8eef8"), (g) => ingot(g, C.gold),
  (g) => { g.ring(8, 10.5, 4.6, 2.2, C.gold, true, 4.4); g.poly([[8, 1.5], [11.5, 5], [8, 8.5], [4.5, 5]], C.cyan); g.dot(7, 3, "#fff"); g.dot(6, 5, "#bff"); },
  (g) => { g.shape((x, y) => y > 2 && y < 10 && Math.abs(Math.hypot((x - 8) / 5.6, (y - 2) / 8) - 1) < 0.16, C.gold, false); g.rect(7, 1.5, 2, 2, C.goldD); g.poly([[8, 7.5], [11.2, 11], [8, 15], [4.8, 11]], C.red); g.dot(7, 10, "#ffb0b0"); g.dot(6, 11, "#ffb0b0"); },
  (g) => { g.poly([[2, 10], [2, 3], [5, 7], [8, 2], [11, 7], [14, 3], [14, 10]], C.gold); g.rect(2, 10, 12, 4.5, C.gold); g.rect(2, 13, 12, 1.5, C.goldD, false); g.dots([[2, 2], [8, 1], [14, 2]], "#fff3a0"); g.ell(8, 12, 1.3, 1.3, C.red); g.ell(4.5, 12, 1, 1, C.blue); g.ell(11.5, 12, 1, 1, C.blue); g.dot(7, 5, "#fff3a0"); },
];

const sack = (g, col, tie) => { g.poly([[4, 5.5], [12, 5.5], [14, 13], [12.5, 15], [3.5, 15], [2, 13]], col); g.poly([[5, 2], [11, 2], [10, 5.5], [6, 5.5]], mix(col, "#fff", 0.12)); g.hline(5, 5, 6, tie); g.hline(5, 6, 6, tie); };
const food = [
  (g) => { g.line(8, 15, 8, 4, 1.2, "#c9b04a", false); for (const y of [3, 5.5, 8, 10.5]) { g.ell(6, y, 1.5, 2.2, C.gold); g.ell(10, y, 1.5, 2.2, C.gold); } g.ell(8, 2, 1.3, 2, C.gold); g.line(8, 15, 5, 12, 1, "#c9b04a", false); },
  (g) => { sack(g, "#efe6d4", C.red); g.dots([[6, 9], [9, 11], [7, 12], [10, 8]], "#d8cdb8"); g.dots([[6, 1], [9, 0], [12, 3]], "#fff"); g.star(8, 10, "#c9b896"); },
  (g) => { g.ell(8, 9.5, 6.5, 4.6, C.cream); g.ell(5.5, 6.5, 3.2, 2.6, C.cream); g.ell(10.5, 6.5, 3, 2.4, C.cream); g.dots([[5, 11], [9, 12], [11, 10]], "#d8bd8a"); },
  (g) => { g.ell(8, 9.5, 7, 4.8, "#d99a4a"); g.ell(8, 8, 5.5, 2.8, "#e8b060"); for (const x of [4.5, 7.5, 10.5]) g.line(x, 6, x + 1.6, 9, 1, "#9a5a22", false); },
  (g) => { for (const [x, y, rx, ry] of [[2.8, 11, 1.9, 2.4], [5.6, 8.5, 2.5, 3], [8, 7, 3, 3.6], [10.4, 8.5, 2.5, 3], [13.2, 11, 1.9, 2.4]]) g.ell(x, y, rx, ry, "#e8a850"); g.dots([[5, 7], [7, 5], [9, 5], [11, 7]], "#a8602a"); g.dots([[6, 10], [10, 10], [8, 9]], "#a8602a"); },
  (g) => { g.ell(8, 8.5, 6.5, 6.5, "#e0b070"); g.dots([[5, 5], [10, 4], [11, 9], [6, 10], [8, 7], [4, 9], [9, 12]], "#4a2a1a"); g.dots([[5, 6], [10, 5]], "#4a2a1a"); g.hline(4, 3, 2, "#f4d090"); },
  (g) => { g.poly([[2, 9], [14, 9], [12, 14.5], [4, 14.5]], "#c8cfdc"); g.ell(8, 8, 7, 4, "#e0a050"); g.ell(8, 7, 4, 1.8, C.red); g.shape((x, y) => y > 4 && y < 10 && (Math.floor(x + y) % 3 === 0), "#c07830", false); g.dot(3, 8, "#f4d090"); },
  (g) => { g.rect(2, 8, 12, 6.5, "#f6d8e0"); g.ell(8, 8, 6.5, 2, C.white); g.dots([[4, 10], [7, 12], [11, 10], [12, 12]], C.pink); g.ell(8, 4.5, 2, 2, C.red); g.dot(7, 4, "#fff"); g.line(8, 2.6, 9.5, 1, 1, C.leafD, false); g.hline(2, 14, 12, "#d8a8b8"); },
  (g) => { g.rect(1, 11, 14, 4, "#f27aa6"); g.rect(3, 7, 10, 4.5, "#f6e6c8"); g.rect(5, 3.5, 6, 4, "#f27aa6"); g.hline(2, 11, 12, C.white); g.hline(4, 7, 8, C.white); g.hline(5, 3, 6, C.white); g.dots([[3, 13], [7, 13], [11, 13], [5, 9], [9, 9]], C.white); g.ell(8, 2, 1.6, 1.6, C.red); },
  (g) => { g.rect(2, 9, 12, 6, "#f27aa6"); g.rect(4, 5, 8, 4.5, "#f6e6c8"); g.hline(2, 9, 12, C.white); g.hline(4, 5, 8, C.white); g.dots([[4, 12], [8, 12], [12, 12], [6, 7], [10, 7]], C.yellow); for (const x of [5.5, 8, 10.5]) { g.vline(x | 0, 2, 3, "#5aa8e8"); g.dot(x | 0, 1, "#ffd040"); g.dot((x | 0), 0, "#ff9a2a"); } g.star(2, 4, "#fff3a0"); g.star(14, 6, "#fff3a0"); },
];

const bottle = (g, liq, sparkle) => {
  g.ell(8, 10, 5.5, 5, "#cfe8f2"); g.rect(6, 3, 4, 4, "#cfe8f2"); g.rect(5.5, 1, 5, 2.5, "#9a6a35");
  if (liq) { if (Array.isArray(liq)) { const hs = liq; g.shape((x, y) => y > 8 && ((x - 8) / 4.3) ** 2 + ((y - 10) / 3.7) ** 2 <= 1 && y < 15, hs[0], true); g.shape((x, y) => y > 8 && y < 11.5 && ((x - 8) / 4.3) ** 2 + ((y - 10) / 3.7) ** 2 <= 1, hs[1], false); g.shape((x, y) => y > 11 && ((x - 8) / 4.3) ** 2 + ((y - 10) / 3.7) ** 2 <= 1, hs[2], false); } else g.shape((x, y) => y > 8 && ((x - 8) / 4.3) ** 2 + ((y - 10) / 3.7) ** 2 <= 1, liq, true); }
  g.dot(5, 8, "#ffffff"); g.dot(5, 9, "#ffffff"); if (sparkle) { g.star(13, 4, "#fff3a0"); g.dot(2, 6, "#fff3a0"); }
};
const potion = [
  (g) => { g.poly([[8, 1.5], [12, 9], [12.5, 11.5], [8, 15], [3.5, 11.5], [4, 9]], "#5ab0f0"); g.ell(8, 11, 4.4, 3.8, "#5ab0f0"); g.dots([[6, 9], [6, 10]], "#ffffff"); },
  (g) => bottle(g, null), (g) => bottle(g, C.green), (g) => bottle(g, C.blue), (g) => bottle(g, C.red), (g) => bottle(g, C.purple, true), (g) => bottle(g, "#ffd040", true),
  (g) => bottle(g, ["#e0463c", "#4cc060", "#4a8fe0"], true),
];

const textile = [
  (g) => { for (const [x, y, r] of [[5, 8.5, 3.4], [9.5, 7, 3.8], [12, 9.5, 2.8], [7.5, 10.5, 3.8], [4, 11.5, 2.4]]) g.ell(x, y, r, r, "#f7f4ee"); g.dots([[6, 12], [10, 11], [11, 7]], "#d8d2c4"); },
  (g) => { g.ell(8, 8.5, 6, 6, C.red); g.shape((x, y) => Math.abs(((x - 8) * 0.8 + (y - 8.5)) % 3) < 0.5 && ((x - 8) ** 2 + (y - 8.5) ** 2) < 30, "#a82a30", false); g.line(12, 12, 15, 14, 1, C.red, false); g.dot(5, 5, "#ff9a90"); },
  (g) => { g.rect(4, 2.5, 10, 11, "#5a8ae0"); g.ell(4.5, 8, 3, 5.5, "#8ab0f0"); g.ring(4.5, 8, 2, 0.9, "#3a5aa0", false, 3.6); g.hline(6, 5, 7, "#8ab0f0"); g.hline(6, 8, 7, "#8ab0f0"); g.hline(6, 11, 7, "#8ab0f0"); },
  (g) => { g.ell(8.5, 7.5, 4.2, 5.5, C.red); g.ell(4.5, 9, 1.9, 2.4, C.red); g.rect(4.5, 11, 8, 3.6, "#f7f4ee"); g.vline(6, 11, 4, "#d8d2c4"); g.vline(8, 11, 4, "#d8d2c4"); g.vline(10, 11, 4, "#d8d2c4"); g.dots([[8, 5], [9, 7], [8, 9]], "#ffd0cc"); },
  (g) => { g.rect(1.5, 3, 13, 4.5, "#d8423a"); g.rect(9, 7.5, 4.5, 7, "#d8423a"); g.vline(3, 3, 5, "#f7f4ee"); g.vline(6, 3, 5, "#f7f4ee"); g.vline(9, 3, 5, "#f7f4ee"); g.vline(12, 3, 5, "#f7f4ee"); g.hline(9, 10, 5, "#f7f4ee"); g.dots([[9, 15], [11, 15], [13, 15]], C.red); },
  (g) => { g.ell(8, 9, 6, 5.8, "#4a8fe0"); g.rect(2, 10, 12, 4.5, "#8ab0f0"); g.vline(4, 10, 5, "#4a7ac0"); g.vline(6, 10, 5, "#4a7ac0"); g.vline(8, 10, 5, "#4a7ac0"); g.vline(10, 10, 5, "#4a7ac0"); g.vline(12, 10, 5, "#4a7ac0"); g.ell(8, 3, 2.6, 2.6, "#f7f4ee"); },
  (g) => { g.rect(1, 4, 3, 7, "#4cc0a0"); g.rect(12, 4, 3, 7, "#4cc0a0"); g.rect(4, 2.5, 8, 12, "#4cc0a0"); g.poly([[6, 2.5], [10, 2.5], [8, 5]], "#2a8a70"); g.hline(4, 9, 8, "#f7f4ee"); g.hline(4, 11, 8, "#f7f4ee"); g.hline(1, 8, 3, "#f7f4ee"); g.hline(12, 8, 3, "#f7f4ee"); g.dot(7, 6, "#fff"); },
  (g) => { g.rect(5, 1.5, 6, 5, "#9a5ad8"); g.poly([[5, 6], [11, 6], [15, 15], [1, 15]], "#9a5ad8"); g.hline(5, 6, 6, C.gold); g.hline(6, 3, 4, "#c898f0"); g.line(2, 13, 14, 13, 1, C.gold, false); g.star(8, 10, "#ffe880"); g.dot(4, 8, "#ffe880"); g.dot(12, 9, "#ffe880"); },
];

// ---------- 生成器 ----------
const badge = (g, lv) => { for (let i = 0; i <= lv; i++) { g.dot(8 - lv + i * 2, 15, C.gold); } };
const tier = ["#b9803f", "#c8cfdc", "#f4c430", "#5fd0e8", "#d46ae8"];
const gen_garden = [
  (g, lv) => { g.poly([[3.5, 9], [12.5, 9], [11.5, 15], [4.5, 15]], "#d9773a"); g.rect(3, 8, 10, 2, "#e8955a"); g.line(8, 8, 8, 4, 1.6, C.stem); g.ell(5.5, 4.5, 2.6, 1.4, C.leaf); g.ell(10.5, 3.5, 2.6, 1.4, C.leaf); },
  (g, lv) => { g.rect(2, 9.5, 12, 5.5, "#9a6a35"); g.rect(2, 9.5, 12, 1.6, "#d9a05a"); for (const [x, c, h] of [[4.5, C.red, 4], [8, C.yellow, 2.5], [11.5, C.pink, 4.5]]) { g.line(x, 9.5, x, h + 2, 1, C.stem, false); g.ell(x, h, 2.3, 2.3, c); } },
  (g, lv) => { g.rect(2, 4, 2, 11, C.woodL); g.rect(12, 4, 2, 11, C.woodL); g.ring(8, 5, 6, 2, C.woodL, true, 5); g.ell(4, 7, 2, 2, C.red); g.ell(12, 6, 2, 2, C.pink); g.ell(8, 2.8, 2, 2, C.red); g.ell(4, 11, 2, 2, C.pink); g.ell(12, 11, 2, 2, C.red); g.rect(1, 14, 14, 1.4, C.leafD); },
  (g, lv) => { g.poly([[1, 7], [8, 1], [15, 7]], "#9fdcee"); g.rect(2, 7, 12, 8, "#bfe6f2"); g.rect(2, 7, 12, 1, "#7fb8c8", false); g.vline(8, 2, 13, "#7fb8c8"); g.hline(2, 11, 12, "#7fb8c8"); g.rect(2, 14, 12, 1.4, "#6a4a2a"); g.ell(5, 12, 1.6, 1.6, C.red); g.ell(11, 12, 1.6, 1.6, C.yellow); g.ell(8, 9.5, 1.6, 1.6, C.pink); g.dot(4, 9, "#fff"); },
];
const gen_wood = [
  (g) => { g.rect(2, 8, 9, 7, C.wood); g.ell(6.5, 8, 4.5, 2, C.woodL); g.ring(6.5, 8, 2.6, 0.8, C.woodD, false, 1.2); g.line(9, 10, 14, 2, 1.2, "#8a5a2b", false); g.poly([[11, 2.5], [15, 2], [14.5, 6], [12, 5]], C.iron); },
  (g) => { g.line(3, 15, 6, 6, 2, C.wood); g.line(13, 15, 10, 6, 2, C.wood); g.line(3, 11, 13, 11, 1.4, C.woodD, false); g.ell(8, 6.5, 6, 2.6, C.woodL); g.ring(8, 6.5, 2, 0.8, C.woodD, false, 1); g.rect(1, 8, 4, 2.5, "#d9a05a"); },
  (g) => { g.rect(1, 12, 14, 3, C.woodD); g.rect(2, 8, 12, 4, C.wood); g.ring(8, 5, 4.5, 2, C.iron, true); g.ell(8, 5, 1.4, 1.4, C.stone); g.rect(2.5, 9.5, 11, 1, C.woodL, false); g.dots([[8, 0.5], [3, 6], [13, 6]], C.silver); },
  (g) => { g.rect(1, 7, 14, 8, C.wood); g.poly([[0, 8], [8, 1], [16, 8]], "#2f7a3a"); g.rect(10, 2, 3, 5, C.stone); g.rect(5, 10, 6, 5, C.woodD); g.ring(8, 4.5, 2, 0.9, C.silver, false); g.dot(3, 10, C.woodL); g.hline(2, 8, 12, C.woodL); },
];
const gen_mine = [
  (g) => { g.ell(7, 12, 6, 3.5, C.stone); g.ell(5, 9, 3.4, 3, "#a8aab8"); g.ell(10, 10, 3, 2.6, "#7a7c88"); g.line(9, 5, 14, 12, 1.2, C.wood, false); g.poly([[5, 2], [12, 3], [12, 4.5], [6, 4.5]], C.iron); },
  (g) => { g.poly([[2, 5], [14, 5], [12, 12], [4, 12]], C.iron); g.rect(2, 4, 12, 2, "#a8b2c8"); g.ell(5, 14, 1.8, 1.8, C.black); g.ell(11, 14, 1.8, 1.8, C.black); g.ell(5, 14, 0.8, 0.8, C.silver, false); g.ell(11, 14, 0.8, 0.8, C.silver, false); g.ell(6, 3.5, 2.4, 1.8, C.stone); g.ell(10, 3, 2, 1.6, C.copper); },
  (g) => { g.poly([[2, 5], [14, 5], [12, 12], [4, 12]], C.iron); g.rect(2, 4, 12, 2, "#a8b2c8"); g.ell(5, 14, 1.8, 1.8, C.black); g.ell(11, 14, 1.8, 1.8, C.black); g.ell(5, 3.5, 2.2, 2.2, C.gold); g.ell(8.5, 2, 2.4, 2.4, C.cyan); g.ell(11.5, 3.5, 2, 2, C.red); g.dot(4, 3, "#fff3a0"); },
  (g) => { g.poly([[0, 15], [3, 4], [8, 0.5], [13, 4], [16, 15]], C.stone); g.shape((x, y) => y > 6 && ((x - 8) / 4.2) ** 2 + ((y - 15) / 8.5) ** 2 <= 1, C.black, false); g.rect(3.5, 6, 1.6, 9, C.woodD); g.rect(11, 6, 1.6, 9, C.woodD); g.rect(3.5, 5.5, 9, 1.6, C.woodD); g.dots([[7, 11], [9, 9], [10, 12]], C.gold); },
];
const gen_kitchen = [
  (g) => { g.ell(8, 8, 6.5, 4.5, C.iron); g.ell(8, 6, 5, 2.2, "#3a3a48", false); g.rect(1, 6, 2, 2, C.iron); g.rect(13, 6, 2, 2, C.iron); g.poly([[4, 12], [8, 8], [12, 12], [10, 15], [6, 15]], C.orange); g.poly([[6, 14], [8, 11], [10, 14]], C.yellow); },
  (g) => { g.rect(2, 4, 12, 11, "#a85a3a"); g.rect(2, 3, 12, 2, "#7a3a28"); g.shape((x, y) => y > 8 && ((x - 8) / 3.4) ** 2 + ((y - 15) / 5) ** 2 <= 1, C.black, false); g.poly([[6.5, 14.5], [8, 11], [9.5, 14.5]], C.orange); g.dots([[4, 6], [12, 6]], C.silver); g.rect(6, 1, 4, 2.5, C.stone); },
  (g) => { g.rect(1, 6, 14, 9, C.silver); g.rect(1, 5, 14, 2, "#e8eef8"); g.ring(5, 4, 2, 0.8, C.black, false); g.ring(11, 4, 2, 0.8, C.black, false); g.rect(3, 9, 10, 5, "#3a3a48"); g.rect(4, 10, 8, 3, "#ffd070"); g.rect(4, 10, 8, 1, "#ffe8a0", false); g.dots([[4, 7], [8, 7], [12, 7]], C.red); },
  (g) => { g.rect(2, 7, 12, 8, "#f6e6c8"); g.poly([[0.5, 7.5], [15.5, 7.5], [14, 3], [2, 3]], "#d8423a"); g.vline(4, 3, 4, C.white); g.vline(8, 3, 4, C.white); g.vline(12, 3, 4, C.white); g.rect(4, 9, 5, 6, C.woodD); g.rect(10, 9, 3, 3, "#bfe6f2"); g.ell(11.5, 13.5, 1.4, 1.1, C.pink); g.star(8, 1, "#ffd040"); },
];
const gen_alchemy = [
  (g) => { g.line(3, 15, 8, 9, 1.2, C.woodD, false); g.line(13, 15, 8, 9, 1.2, C.woodD, false); g.ell(8, 8, 4.6, 4.6, "#cfe8f2"); g.rect(6.5, 1.5, 3, 4, "#cfe8f2"); g.shape((x, y) => y > 8 && ((x - 8) / 3.8) ** 2 + ((y - 8) / 3.8) ** 2 <= 1, C.green, true); g.dots([[6, 6], [6, 7]], "#fff"); },
  (g) => { g.ell(8, 11, 5.5, 4.3, "#cfe8f2"); g.rect(5.5, 3, 5, 5, "#cfe8f2"); g.ring(8, 3, 2, 0.8, "#cfe8f2", false); g.shape((x, y) => y > 10 && ((x - 8) / 4.5) ** 2 + ((y - 11) / 3.4) ** 2 <= 1, C.purple, true); g.rect(2, 14, 12, 1.5, C.woodD); g.dots([[5, 7], [5, 9]], "#fff"); g.dot(11, 2, C.purple); },
  (g) => { g.ell(8, 8.5, 6.5, 5.5, "#4a4a5e"); g.ell(8, 4.5, 6, 2, "#2a2a38", false); g.ell(8, 4.5, 4.8, 1.3, C.green, false); g.line(3, 14.5, 5, 12, 1.4, C.woodD, false); g.line(13, 14.5, 11, 12, 1.4, C.woodD, false); g.ell(6, 1.8, 1.6, 1.6, "#9aff9a"); g.ell(10.5, 2.2, 1.2, 1.2, "#9aff9a"); g.dot(4, 8, "#7a7a92"); },
  (g) => { g.rect(1, 9, 14, 6, "#5a3a7a"); g.rect(1, 8, 14, 2, "#8a5ab0"); g.ell(4, 5, 2.8, 3, "#cfe8f2"); g.shape((x, y) => y > 5 && ((x - 4) / 2.6) ** 2 + ((y - 5) / 2.8) ** 2 <= 1, C.red); g.rect(7, 1, 3, 8, "#cfe8f2"); g.rect(7, 4, 3, 5, C.cyan); g.ell(12.5, 6, 2.2, 2.6, "#cfe8f2"); g.shape((x, y) => y > 6 && ((x - 12.5) / 2) ** 2 + ((y - 6) / 2.4) ** 2 <= 1, C.yellow); g.dots([[4, 11], [8, 12], [12, 11]], C.gold); },
];
const gen_loom = [
  (g) => { g.line(8, 2, 8, 14, 2, C.woodL); g.poly([[6, 5], [10, 5], [12, 10], [4, 10]], C.red); g.ell(8, 12, 3, 2, C.woodD); g.line(8, 2, 8, 14, 0.6, "#fff", false); g.dot(12, 12, C.red); g.dot(13, 13, C.red); },
  (g) => { g.ring(8, 8, 6, 1.6, C.woodL, true); g.dots([[8, 8]], C.woodD); g.ell(8, 8, 1.6, 1.6, C.woodD); g.line(8, 8, 8, 2, 0.8, C.woodD, false); g.line(8, 8, 13, 10, 0.8, C.woodD, false); g.line(8, 8, 3, 10, 0.8, C.woodD, false); g.line(8, 14, 5, 15, 1.4, C.woodD, false); g.line(8, 14, 12, 15, 1.4, C.woodD, false); g.ell(13, 14, 1.6, 1.6, C.red); },
  (g) => { g.rect(1.5, 2, 2, 13, C.wood); g.rect(12.5, 2, 2, 13, C.wood); g.rect(1.5, 2, 13, 2, C.woodL); g.rect(1.5, 13, 13, 2, C.woodL); for (const x of [5, 7, 9, 11]) g.vline(x, 4, 9, "#f7f4ee"); g.rect(3.5, 8, 9, 2, C.red); g.rect(3.5, 10, 9, 1, "#f08a8a", false); },
  (g) => { g.rect(1, 6, 14, 9, "#f6e6c8"); g.poly([[0.5, 6.5], [15.5, 6.5], [14, 2.5], [2, 2.5]], "#9a5ad8"); g.vline(5, 2, 4, "#c898f0"); g.vline(8, 2, 4, "#c898f0"); g.vline(11, 2, 4, "#c898f0"); g.rect(5, 8, 6, 7, C.woodD); g.line(8, 8, 8, 15, 1, C.pink, false); g.ell(8, 8.5, 2.2, 1.6, C.pink); g.hline(2, 8, 2, C.red); g.hline(12, 8, 2, C.red); },
];
const genSets = { garden: gen_garden, lumber: gen_wood, mine: gen_mine, kitchen: gen_kitchen, alchemy: gen_alchemy, loom: gen_loom };
// 每个生成器 5 级：前 4 种造型 + 第 5 级把第 4 种造型加上光环
const genDraw = (set, lv) => (g) => {
  const idx = Math.min(lv, 3);
  // 底座
  g.ell(8, 14.5, 7, 1.6, tier[lv], true);
  set[idx](g, lv);
  if (lv === 4) { g.star(2, 2, "#fff3a0"); g.star(14, 3, "#fff3a0"); g.dot(1, 8, "#ffffff"); }
  if (lv >= 2 && lv < 4) g.dot(2, 2, "#fff3a0");
};

// ---------- 资源 ----------
const coin = (g, cx, cy, r, col) => { g.ell(cx, cy, r, r, col); g.ring(cx, cy, r - 1.2, 0.8, mix(col, "#000", 0.4), false); g.dot(cx - 1, cy - 1, "#fff8c0"); };
const coins = [
  (g) => { coin(g, 8, 8.5, 5.5, C.copper); g.dots([[8, 6], [8, 7], [8, 8], [8, 9], [8, 10], [8, 11]], "#8a4a1a"); },
  (g) => { coin(g, 10, 6.5, 4.5, "#aeb6c8"); coin(g, 6, 10, 5, C.silver); g.dots([[6, 8], [6, 9], [6, 10], [6, 11], [6, 12]], "#6a7290"); },
  (g) => { for (const y of [11, 8, 5]) { g.ell(8, y + 1, 5.5, 2.6, C.goldD); g.ell(8, y, 5.5, 2.6, C.gold); g.hline(5, y, 4, "#fff3a0"); } },
  (g) => { sack(g, "#b8924a", C.red); g.rect(7, 8, 2, 5, C.gold, false); g.ell(8, 10.5, 2.8, 2.8, C.gold); g.dot(7, 9, "#fff8c0"); g.dot(8, 4, C.red); g.ell(4, 14.5, 2.2, 1.4, C.gold); g.ell(12.5, 14.5, 2.2, 1.4, C.gold); },
  (g) => { g.poly([[1, 8], [15, 8], [13, 15], [3, 15]], "#8a5a2b"); for (const [x, y] of [[4, 6], [8, 4], [12, 6], [6, 7], [10, 7], [8, 8]]) g.ell(x, y, 2.5, 2.5, C.gold); g.hline(2, 9, 12, "#c98a3a"); g.star(14, 2, "#fff"); g.star(2, 3, "#fff3a0"); },
];
const gem = (g, pts, col) => { g.poly(pts, col); };
const gems = [
  (g) => { g.ell(8, 9, 4.8, 4.8, C.blue); g.dots([[6, 6], [6, 7]], "#bfe0ff"); g.star(13, 3, "#fff"); },
  (g) => { g.poly([[5, 3], [11, 3], [14, 7], [14, 11], [11, 14], [5, 14], [2, 11], [2, 7]], "#2fc070"); g.rect(5, 5.5, 6, 6, "#6ae8a0", false); g.dot(4, 5, "#c0ffd8"); g.dot(4, 6, "#c0ffd8"); },
  (g) => { g.poly([[8, 14.5], [1.5, 6.5], [4.5, 2.5], [11.5, 2.5], [14.5, 6.5]], "#e0305a"); g.poly([[4.5, 2.5], [11.5, 2.5], [10, 6.5], [6, 6.5]], "#ff7a9a", false); g.dots([[5, 4], [6, 4]], "#fff"); },
  (g) => { g.poly([[8, 15], [0.5, 6], [4, 1.5], [12, 1.5], [15.5, 6]], "#a8e8f8"); g.poly([[4, 1.5], [12, 1.5], [10.5, 6], [5.5, 6]], "#e8fcff", false); g.line(0.5, 6, 15.5, 6, 0.8, "#6ac0e0", false); g.dots([[5, 3], [6, 3], [5, 4]], "#fff"); g.star(14, 2, "#fff"); },
  (g) => { g.poly([[8, 0.5], [11, 5], [11, 14], [8, 15.5], [5, 14], [5, 5]], "#c84ae8"); g.poly([[4, 6], [6, 4], [6, 14], [3, 12]], "#4ac8f0"); g.poly([[12, 6], [10, 4], [10, 14], [13, 12]], "#f0a030"); g.dots([[7, 3], [7, 5]], "#fff"); g.star(2, 3, "#fff"); g.star(14, 4, "#fff"); },
];
const bolt = (g, col, sz) => { const s = sz; g.poly([[9.5, 1], [3.5, 9], [7, 9], [5.5, 15], [12.5, 6], [8.5, 6]], col); };
const energy = [
  (g) => { g.poly([[9.5, 2], [4.5, 9], [7.5, 9], [6.5, 14], [11.5, 6.5], [8.5, 6.5]], "#ffd93a"); g.dot(7, 5, "#fff8c0"); },
  (g) => { g.ell(8, 8, 6.5, 6.5, "#3a8ae8"); g.poly([[9.5, 2.5], [5, 9], [7.8, 9], [6.8, 13.5], [11.2, 7], [8.6, 7]], "#ffe95a"); g.dot(4, 5, "#bfe0ff"); },
  (g) => { g.rect(4, 3, 8, 12, "#4cc060"); g.rect(6, 1, 4, 2, "#cfd6e4"); g.rect(4, 3, 8, 2, "#2f9a48", false); g.poly([[9, 5], [6, 9.5], [8, 9.5], [7, 13], [10.5, 8], [8.5, 8]], "#fff070"); },
  (g) => { g.poly([[8, 0.5], [12.5, 5], [11, 14], [8, 15.5], [5, 14], [3.5, 5]], "#ffcc20"); g.poly([[8, 3], [10.5, 6], [8, 13], [5.5, 6]], "#fff3a0", false); g.dots([[7, 4], [7, 5]], "#fff"); g.star(14, 3, "#fff"); g.star(2, 11, "#fff"); },
  (g) => { g.ell(8, 8, 6.8, 6.8, "#7a3ae8"); g.ring(8, 8, 5.2, 1, "#c098ff", false); g.ring(8, 8, 3.4, 1, "#ffe95a", false); g.ell(8, 8, 1.8, 1.8, "#fff8c0", false); g.star(14, 2, "#fff"); g.star(2, 14, "#fff"); g.dot(3, 4, "#fff"); },
];
const chest = (g, body, trim, lidc, spark) => {
  g.rect(2, 7, 12, 8, body); g.shape((x, y) => y >= 3 && y < 8 && ((x - 8) / 6) ** 2 + ((y - 8) / 5) ** 2 <= 1, lidc);
  g.rect(2, 7, 12, 1.4, trim, false); g.rect(7, 6, 2, 4, trim); g.dot(7.5, 8, C.black); g.vline(3, 8, 7, trim); g.vline(12, 8, 7, trim);
  if (spark) { g.star(2, 2, "#fff"); g.star(14, 3, "#fff"); }
};
const chests = [
  (g) => chest(g, "#a87038", "#8a8a98", "#c98a4a"), (g) => chest(g, "#9a5a2a", C.copper, "#b8743a"), (g) => chest(g, "#6a7a98", C.silver, "#8a9ab8"),
  (g) => chest(g, "#c98a1a", C.gold, "#e8a82a", true), (g) => chest(g, "#4a90c8", "#f0a0ff", "#6ac0e8", true),
];

// ---------- 链定义 ----------
const nm = (s) => s.split(" ");
export const CHAINS = {
  flower: { name: "花卉", kind: "item", color: "#f27aa6", levels: nm("种子 嫩芽 幼苗 四叶草 雏菊 郁金香 红玫瑰 向日葵 花束 花篮"), draw: flower, base: 2 },
  wood: { name: "木材", kind: "item", color: "#b9803f", levels: nm("树枝 原木 木板 木箱 木凳 木椅 木桌 衣柜 小木屋"), draw: wood, base: 2 },
  ore: { name: "矿石", kind: "item", color: "#cfd6e4", levels: nm("碎石 铜矿石 铜锭 铁锭 银锭 金锭 金戒指 宝石项链 皇冠"), draw: ore, base: 3 },
  food: { name: "烘焙", kind: "item", color: "#e8a850", levels: nm("麦穗 面粉 面团 面包 羊角包 曲奇 苹果派 奶油蛋糕 三层蛋糕 生日蛋糕"), draw: food, base: 2 },
  potion: { name: "药剂", kind: "item", color: "#9a5ad8", levels: nm("露珠 空瓶 青草药剂 蓝色药剂 红色药剂 紫色药剂 金色药剂 彩虹药剂"), draw: potion, base: 3 },
  cloth: { name: "织物", kind: "item", color: "#d8423a", levels: nm("羊毛 毛线球 布匹 手套 围巾 毛线帽 毛衣 华丽礼服"), draw: textile, base: 3 },
  g_garden: { name: "花园", kind: "gen", out: "flower", color: "#4faa4a", levels: nm("花盆 花圃 玫瑰拱门 玻璃温室").concat(["魔法花园"]), draw: [0, 1, 2, 3, 4].map((l) => genDraw(gen_garden, l)) },
  g_lumber: { name: "林场", kind: "gen", out: "wood", color: "#b9803f", levels: ["树桩", "锯木架", "锯木机", "木工坊", "皇家木工坊"], draw: [0, 1, 2, 3, 4].map((l) => genDraw(gen_wood, l)) },
  g_mine: { name: "矿山", kind: "gen", out: "ore", color: "#8d8f9c", levels: ["矿石堆", "矿车", "宝石矿车", "矿洞", "黄金矿山"], draw: [0, 1, 2, 3, 4].map((l) => genDraw(gen_mine, l)) },
  g_kitchen: { name: "厨房", kind: "gen", out: "food", color: "#e8a850", levels: ["炖锅", "砖炉", "烤箱", "面包房", "皇家糕点店"], draw: [0, 1, 2, 3, 4].map((l) => genDraw(gen_kitchen, l)) },
  g_alchemy: { name: "炼金", kind: "gen", out: "potion", color: "#9a5ad8", levels: ["烧瓶架", "蒸馏瓶", "魔法坩埚", "炼金工作台", "大炼金室"], draw: [0, 1, 2, 3, 4].map((l) => genDraw(gen_alchemy, l)) },
  g_loom: { name: "织造", kind: "gen", out: "cloth", color: "#d8423a", levels: ["纺锤", "纺车", "织布机", "裁缝铺", "皇家裁缝坊"], draw: [0, 1, 2, 3, 4].map((l) => genDraw(gen_loom, l)) },
  coin: { name: "金币", kind: "coin", color: "#f4c430", levels: ["铜币", "银币", "金币堆", "钱袋", "金币宝藏"], draw: coins, vals: [5, 12, 30, 80, 200] },
  gem: { name: "宝石", kind: "gem", color: "#5fd0e8", levels: ["蓝宝石", "祖母绿", "红宝石", "钻石", "虹光水晶"], draw: gems, vals: [1, 2, 5, 12, 30] },
  energy: { name: "体力", kind: "energy", color: "#ffd93a", levels: ["小闪电", "电能球", "能量电池", "能量晶体", "能量核心"], draw: energy, vals: [3, 8, 20, 50, 120] },
  chest: { name: "宝箱", kind: "chest", color: "#c98a1a", levels: ["木宝箱", "铜宝箱", "银宝箱", "金宝箱", "水晶宝箱"], draw: chests },
};
for (const [id, c] of Object.entries(CHAINS)) c.id = id, c.max = c.levels.length - 1;

const cache = new Map();
export function sprite(c, l) {
  const k = c + ":" + l;
  let s = cache.get(k);
  if (!s) {
    const g = new G();
    CHAINS[c].draw[l](g, l);
    s = g.render();
    cache.set(k, s);
  }
  return s;
}
export function tintFlash(cv) {
  const o = document.createElement("canvas"); o.width = cv.width; o.height = cv.height;
  const x = o.getContext("2d"); x.drawImage(cv, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = "#fff"; x.fillRect(0, 0, o.width, o.height);
  return o;
}
