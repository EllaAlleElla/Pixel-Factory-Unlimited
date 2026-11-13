import { CHAINS, sprite } from "./sprites.js";
const root = document.body; root.style.cssText = "background:#3a3550;margin:0;padding:8px";
for (const [id, c] of Object.entries(CHAINS)) {
  const row = document.createElement("div"); row.style.cssText = "display:flex;gap:6px;margin-bottom:6px;align-items:center";
  const t = document.createElement("span"); t.textContent = id; t.style.cssText = "color:#fff;font:12px monospace;width:60px"; row.append(t);
  c.levels.forEach((_, l) => { const cv = document.createElement("canvas"); const s = sprite(id, l); cv.width = cv.height = 18; cv.getContext("2d").drawImage(s, 0, 0); cv.style.cssText = "width:72px;height:72px;image-rendering:pixelated;background:#5a5478"; row.append(cv); });
  root.append(row);
}
