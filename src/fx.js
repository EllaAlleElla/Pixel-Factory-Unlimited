// pixelfx 特效层：把 pixelfx 的低分辨率特效帧叠加在棋盘上方
import { createFrame, clearFrame, createFx, composite } from "../vendor/pixelfx/src/core/index.js";
import * as burst from "../vendor/pixelfx/src/fx/pickups/collect-burst.js";
import * as mana from "../vendor/pixelfx/src/fx/arcane/mana-burst.js";
import * as poof from "../vendor/pixelfx/src/fx/spawn/poof.js";
import * as confetti from "../vendor/pixelfx/src/fx/ui/confetti.js";
import { mix } from "./sprites.js";

export const FXS = 2; // 一个特效像素 = 2 个 CSS 像素
// 第二项：特效视觉中心相对其原点向上的偏移(特效像素)
const MODS = { burst: [burst, 42], mana: [mana, 52], poof: [poof, 18], confetti: [confetti, 0] };
export const ramp = (c) => [mix(c, "#000000", 0.85), mix(c, "#000000", 0.7), mix(c, "#000000", 0.45), mix(c, "#000000", 0.15), c, mix(c, "#ffffff", 0.35), mix(c, "#ffffff", 0.7), "#ffffff"];

export class FxLayer {
  constructor(cv) { this.cv = cv; this.ctx = cv.getContext("2d"); this.list = []; this.dirty = false; }
  resize(cssW, cssH) {
    const w = Math.ceil(cssW / FXS), h = Math.ceil(cssH / FXS);
    if (this.frame && this.cv.width === w && this.cv.height === h) return;
    this.cv.width = w; this.cv.height = h; this.cv.style.width = cssW + "px"; this.cv.style.height = cssH + "px";
    this.frame = createFrame(w, h); this.img = new ImageData(w, h); this.list.length = 0;
  }
  add(name, x, y, o = {}) {
    const [mod, dy] = MODS[name];
    if (this.list.length > 14) this.list.shift();
    const opts = { x: x / FXS, y: y / FXS + dy, seed: (Math.random() * 1000) | 0 };
    if (o.light != null) opts.light = o.light;
    if (o.color) {
      const r = ramp(o.color);
      opts.palette = name === "poof" ? [r[1], r[2], r[3], r[4], r[5], "#ffffff"] : r;
    }
    this.list.push(createFx(mod, opts));
  }
  tick(dt) {
    if (!this.frame) return;
    if (!this.list.length) { if (this.dirty) { this.ctx.clearRect(0, 0, this.cv.width, this.cv.height); this.dirty = false; } return; }
    clearFrame(this.frame);
    for (const f of this.list) { f.update(dt); f.draw(this.frame, "back"); f.draw(this.frame, "front"); }
    composite(this.frame, this.img.data, null);
    this.ctx.putImageData(this.img, 0, 0);
    this.dirty = true;
    this.list = this.list.filter((f) => !f.done());
  }
}
