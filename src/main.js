import { CHAINS, sprite, mix } from "./sprites.js";
import * as D from "./data.js";
import { FxLayer } from "./fx.js";
import { sfx, setSound } from "./audio.js";

const { COLS, ROWS, SLOT_COLS, SLOT_MAX } = D;
const NB = COLS * ROWS;
const $ = (id) => document.getElementById(id);
const now = () => performance.now() / 1000;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SAVE_KEY = "pixelMergeWorkshop.v1";

// ======================= 状态 =======================
let S;
function newGame() {
  S = {
    board: Array(NB).fill(null), unlocked: Array(NB).fill(false), slots: Array(SLOT_MAX).fill(null), slotN: 4,
    energy: 100, enT: Date.now(), coins: 200, gems: 10, xp: 0, lv: 1, orders: [], disc: {},
    set: { sound: true, sandbox: false, zoom: 1 }, stat: { merges: 0, orders: 0 },
  };
  for (let i = 0; i < COLS * 5; i++) S.unlocked[i] = true;
  const start = [["g_garden", 0], ["g_lumber", 0], ["g_kitchen", 0], ["flower", 0], ["flower", 0], ["wood", 0], ["wood", 0], ["food", 0], ["food", 0], ["energy", 0], ["chest", 0]];
  const pos = [10, 12, 24, 15, 16, 22, 23, 29, 30, 9, 18];
  start.forEach(([c, l], k) => { S.board[pos[k]] = { c, l }; disc(c, l, true); });
}
function save() {
  try {
    const enc = (a) => a.map((it) => (it ? it.c + ":" + it.l : 0));
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...S, board: enc(S.board), slots: enc(S.slots), unlocked: S.unlocked.map((v) => +v).join("") }));
  } catch (e) {}
}
function load(raw) {
  const o = JSON.parse(raw);
  const dec = (a, n) => Array.from({ length: n }, (_, i) => { const v = a[i]; if (!v) return null; const [c, l] = v.split(":"); return CHAINS[c] && +l <= CHAINS[c].max ? { c, l: +l } : null; });
  S = { ...o, board: dec(o.board, NB), slots: dec(o.slots, SLOT_MAX), unlocked: [...o.unlocked].map((v) => v === "1") };
  S.set = { sound: true, sandbox: false, zoom: 1, ...(o.set || {}) }; S.stat = o.stat || { merges: 0, orders: 0 };
  while (S.unlocked.length < NB) S.unlocked.push(false);
}
let saveT = 0;
const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(save, 400); };

// ======================= 基础工具 =======================
const arr = (r) => (r.a === "b" ? S.board : S.slots);
const get = (r) => arr(r)[r.i];
const put = (r, it) => { arr(r)[r.i] = it; };
const isOpen = (r) => (r.a === "b" ? S.unlocked[r.i] : r.i < S.slotN);
const same = (a, b) => a && b && a.a === b.a && a.i === b.i;
function* allRefs() { for (let i = 0; i < NB; i++) if (S.unlocked[i]) yield { a: "b", i }; for (let i = 0; i < S.slotN; i++) yield { a: "s", i }; }
const canMerge = (a, b) => a && b && a.c === b.c && a.l === b.l && a.l < CHAINS[a.c].max;
const countItem = (c, l) => { let n = 0; for (const r of allRefs()) { const it = get(r); if (it && it.c === c && it.l === l) n++; } return n; };
const freeCount = () => { let n = 0; for (const r of allRefs()) if (!get(r)) n++; return n; };
function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") e.className = v; else if (k === "on") for (const [ev, fn] of Object.entries(v)) e.addEventListener(ev, fn); else e.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(kid));
  return e;
}
function icon(c, l, px) {
  const cv = document.createElement("canvas"); cv.width = cv.height = 18; cv.getContext("2d").drawImage(sprite(c, l), 0, 0);
  if (px) cv.style.width = cv.style.height = px + "px"; return cv;
}
function toast(msg, big) {
  const t = h("div", { class: "toast" + (big ? " big" : "") }, msg); $("toasts").append(t);
  setTimeout(() => t.remove(), big ? 2600 : 2300);
  while ($("toasts").children.length > 3) $("toasts").firstChild.remove();
}

// ======================= 布局 =======================
const board = $("board"), ctx = board.getContext("2d"), fx = new FxLayer($("fxc"));
const L = { cs: 50, dpr: 1, stripY: 0, stripRows: 1, w: 0, h: 0 };
function layout() {
  const wrap = $("stageWrap"), W = wrap.clientWidth, H = wrap.clientHeight;
  L.dpr = Math.min(window.devicePixelRatio || 1, 3);
  L.stripRows = Math.ceil((Math.min(S.slotN + 1, SLOT_MAX)) / SLOT_COLS);
  const units = ROWS + 0.5 + L.stripRows;
  const fit = Math.min(W / COLS, H / units), zoom = clamp(S.set.zoom || 1, 0.5, 1.6);
  L.cs = Math.max(24, Math.floor(fit * zoom));
  $("zoomVal").textContent = Math.round(zoom * 100) + "%";
  L.w = L.cs * COLS; L.h = Math.round(L.cs * units); L.stripY = Math.round(L.cs * (ROWS + 0.5));
  board.width = Math.round(L.w * L.dpr); board.height = Math.round(L.h * L.dpr);
  board.style.width = L.w + "px"; board.style.height = L.h + "px";
  fx.resize(L.w, L.h);
}
function rectOf(r) {
  if (r.a === "b") return { x: (r.i % COLS) * L.cs, y: Math.floor(r.i / COLS) * L.cs };
  return { x: (r.i % SLOT_COLS) * L.cs, y: L.stripY + Math.floor(r.i / SLOT_COLS) * L.cs };
}
const centerOf = (r) => { const p = rectOf(r); return { x: p.x + L.cs / 2, y: p.y + L.cs / 2 }; };
function hit(p) {
  if (p.x < 0 || p.x >= COLS * L.cs || p.y < 0) return null;
  if (p.y < ROWS * L.cs) return { a: "b", i: Math.floor(p.y / L.cs) * COLS + Math.floor(p.x / L.cs) };
  if (p.y >= L.stripY) { const i = Math.floor((p.y - L.stripY) / L.cs) * SLOT_COLS + Math.floor(p.x / L.cs); if (i <= S.slotN && i < SLOT_MAX) return { a: "s", i }; }
  return null;
}

// ======================= 发现 / 经验 / 等级 =======================
function disc(c, l, silent) {
  const k = c + ":" + l; if (S.disc[k]) return; S.disc[k] = 1;
  if (!silent) { toast("✨ 新发现：" + CHAINS[c].levels[l]); addXp(2 + l); }
}
function addXp(n) {
  S.xp += n;
  while (S.xp >= D.xpNeed(S.lv)) { S.xp -= D.xpNeed(S.lv); S.lv++; onLevelUp(); }
}
function onLevelUp() {
  sfx.level(); S.gems += 5; S.energy += 30;
  toast("🎉 升级！Lv." + S.lv + "  +5宝石 +30体力", true);
  fx.add("confetti", L.w / 2, L.h * 0.7);
  for (const g of D.GEN_IDS) if (D.UNLOCK_LV[g] === S.lv) { const r = spawnItem(g, 0, null); toast("🔓 解锁新生产线：" + CHAINS[g].name + (r ? "（已放入背包）" : "")); }
  fillOrders();
}

// ======================= 放置 / 生成 =======================
function findSpot(from) {
  const c0 = from && from.a === "b" ? { x: from.i % COLS, y: Math.floor(from.i / COLS) } : { x: (COLS - 1) / 2, y: 2 };
  let best = null, bd = 1e9;
  for (let i = 0; i < NB; i++) {
    if (!S.unlocked[i] || S.board[i]) continue;
    const d = Math.hypot((i % COLS) - c0.x, Math.floor(i / COLS) - c0.y) + Math.random() * 0.7;
    if (d < bd) { bd = d; best = i; }
  }
  if (best != null) return { a: "b", i: best };
  for (let i = 0; i < S.slotN; i++) if (!S.slots[i]) return { a: "s", i };
  return null;
}
function spawnItem(c, l, from, delay = 0) {
  const ref = findSpot(from); if (!ref) return null;
  const it = { c, l };
  const f = from ? centerOf(from) : { x: L.w / 2, y: L.h / 2 };
  put(ref, it); it.fly = { x0: f.x, y0: f.y, t0: now() + delay, dur: 0.34 };
  disc(c, l);
  return ref;
}
function burstAt(name, r, color, light) { const p = centerOf(r); fx.add(name, p.x, p.y, { color, light }); }
function floatText(x, y, text, color = "#fff") { floats.push({ x, y, text, color, t0: now() }); }
const floats = [];

// ======================= 点击行为 =======================
function tapGen(ref) {
  const it = get(ref), ch = CHAINS[it.c];
  if (S.energy < 1) { sfx.deny(); toast("体力不足！点右上角 + 免费补充"); $("rEn").classList.remove("warn"); void $("rEn").offsetWidth; $("rEn").classList.add("warn"); return; }
  const r = spawnItem(ch.out, D.rollProductLevel(it.l, CHAINS[ch.out].max), ref);
  if (!r) { sfx.deny(); toast("背包已满！先合成、出售，或点「+格子」"); return; }
  S.energy -= 1; it.pop = now(); sfx.spawn();
  const p = centerOf(ref); floatText(p.x, p.y - L.cs * 0.3, "-1⚡", "#ffd93a");
  fx.add("burst", p.x, p.y, { color: ch.color, light: 0.6 });
  const x = Math.random();
  if (x < 0.1 && spawnItem(ch.out, D.rollProductLevel(it.l, CHAINS[ch.out].max), ref, 0.12)) floatText(p.x, p.y - L.cs * 0.7, "双倍产出!", "#8cf08c");
  else if (x < 0.18) { const rc = D.pick(["coin", "energy", "gem"]); if (spawnItem(rc, 0, ref, 0.12)) floatText(p.x, p.y - L.cs * 0.7, "额外掉落!", "#8cf08c"); }
}
function collect(ref) {
  const it = get(ref), ch = CHAINS[it.c], v = ch.vals[it.l], p = centerOf(ref);
  put(ref, null);
  if (ch.kind === "coin") { S.coins += v; floatText(p.x, p.y, "+" + v + " 金币", "#ffd24a"); sfx.coin(); }
  else if (ch.kind === "gem") { S.gems += v; floatText(p.x, p.y, "+" + v + " 宝石", "#7fe8ff"); sfx.coin(); }
  else { S.energy += v; floatText(p.x, p.y, "+" + v + " 体力", "#ffe95a"); sfx.coin(); }
  fx.add("burst", p.x, p.y, { color: ch.color });
  if (S.sel && same(S.sel, ref)) S.sel = null;
}
function openChest(ref) {
  const it = get(ref), loot = D.chestLoot(it.l, S.lv);
  if (freeCount() + 1 < loot.length) { sfx.deny(); toast("空位不够，需要至少 " + (loot.length - 1) + " 个空格"); return; }
  const p = centerOf(ref); put(ref, null); S.sel = null; sfx.open();
  fx.add("mana", p.x, p.y, { color: CHAINS.chest.color });
  loot.forEach(([c, l], i) => spawnItem(c, l, ref, 0.15 + i * 0.09));
  floatText(p.x, p.y - L.cs * 0.4, "开箱!", "#ffd24a");
}
function setZoom(z) { S.set.zoom = clamp(Math.round(z * 100) / 100, 0.5, 1.6); layout(); saveSoon(); }
function activate(ref) {
  const it = get(ref); if (!it) return; const k = CHAINS[it.c].kind;
  if (k === "gen") tapGen(ref); else if (k === "chest") openChest(ref); else if (k === "coin" || k === "gem" || k === "energy") collect(ref);
  changed();
}
function tap(ref) {
  if (!ref) { S.sel = null; return changed(true); }
  if (ref.a === "b" && !S.unlocked[ref.i]) { unlockCells(1, ref.i); return; }
  if (ref.a === "s" && ref.i === S.slotN) { addSlot(); return; }
  const it = get(ref);
  if (!it) { S.sel = null; return changed(true); }
  // 第一次点击只选中(查看信息)，再点一次已选中的道具才触发互动
  if (S.sel && same(S.sel, ref)) { activate(ref); return; }
  S.sel = ref; sfx.tap(); changed();
}

// ======================= 合成 / 拖放 =======================
function doMerge(src, dst) {
  const a = get(src), ch = CHAINS[a.c], nl = a.l + 1;
  put(src, null);
  const it = { c: a.c, l: nl, pop: now() }; put(dst, it);
  S.stat.merges++; addXp(1 + nl >> 1);
  const p = centerOf(dst), isTop = nl >= ch.max - 1 && ch.max >= 4;
  if (nl === ch.max) { fx.add("mana", p.x, p.y, { color: ch.color }); fx.add("confetti", p.x, Math.min(L.h, p.y + 80)); sfx.big(); toast("🏆 " + ch.levels[nl] + "！已合成到最高级"); }
  else if (isTop) { fx.add("mana", p.x, p.y, { color: ch.color, light: 0.8 }); sfx.big(); }
  else { fx.add("burst", p.x, p.y, { color: ch.color }); sfx.merge(nl); }
  disc(a.c, nl);
  if (nl >= 2 && Math.random() < 0.1 && ch.kind !== "gen") { if (spawnItem(a.c, nl - 1, dst, 0.1)) floatText(p.x, p.y - L.cs * 0.5, "额外产出!", "#8cf08c"); }
  S.sel = dst;
}
function drop(src, dst) {
  if (!dst || !isOpen(dst) || (dst.a === "s" && dst.i >= S.slotN) || same(src, dst)) return false;
  const A = get(src), B = get(dst);
  if (!A) return false;
  if (canMerge(A, B)) { doMerge(src, dst); return true; }
  const pa = centerOf(src), pb = centerOf(dst);
  put(dst, A); put(src, B);
  A.fly = { x0: pb.x, y0: pb.y, t0: now(), dur: 0.001 }; if (B) B.fly = { x0: pa.x, y0: pa.y, t0: now(), dur: 0.2 };
  sfx.drop(); S.sel = dst; return true;
}
function sell(ref) {
  const it = get(ref); if (!it) return;
  const ch = CHAINS[it.c]; if (!["item", "gen", "chest"].includes(ch.kind)) return;
  const v = D.itemValue(it.c, it.l);
  if (v >= 200 && !confirm("确定出售「" + ch.levels[it.l] + "」换取 " + v + " 金币吗？")) return;
  const p = centerOf(ref); put(ref, null); S.coins += v; S.sel = null;
  floatText(p.x, p.y, "+" + v + " 金币", "#ffd24a"); fx.add("poof", p.x, p.y, { color: "#ffd24a", light: 0.5 }); sfx.coin(); changed();
}

// ======================= 扩容 / 体力 / 整理 =======================
function unlockCells(n, only) {
  let k = 0;
  const idx = only != null ? [only] : [...Array(NB).keys()];
  for (const i of idx) { if (k >= n) break; if (!S.unlocked[i]) { S.unlocked[i] = true; k++; const p = centerOf({ a: "b", i }); fx.add("burst", p.x, p.y, { color: "#7fe8ff", light: 0.6 }); } }
  if (!k) { toast("背包格子已全部解锁"); return; }
  sfx.level(); toast("已免费解锁 " + k + " 个格子"); changed();
}
function addSlot() {
  if (S.slotN >= SLOT_MAX) { toast("应急格已达上限（" + SLOT_MAX + "）"); return; }
  S.slotN++; layout(); const p = centerOf({ a: "s", i: S.slotN - 1 }); fx.add("burst", p.x, p.y, { color: "#ffb04a", light: 0.6 });
  sfx.coin(); toast("应急格 +1（" + S.slotN + "）"); changed();
}
function addEnergy(n = 50) { S.energy += n; sfx.coin(); toast("⚡ 体力 +" + n); changed(); }
function sortBoard() {
  const order = { gen: 0, chest: 1, coin: 2, gem: 2, energy: 2, item: 3 };
  const items = [], olds = new Map();
  for (let i = 0; i < NB; i++) if (S.unlocked[i] && S.board[i]) { items.push(S.board[i]); olds.set(S.board[i], centerOf({ a: "b", i })); S.board[i] = null; }
  const ids = Object.keys(CHAINS);
  items.sort((a, b) => order[CHAINS[a.c].kind] - order[CHAINS[b.c].kind] || ids.indexOf(a.c) - ids.indexOf(b.c) || b.l - a.l);
  let k = 0;
  for (let i = 0; i < NB && k < items.length; i++) if (S.unlocked[i]) { const it = items[k++]; S.board[i] = it; const o = olds.get(it); it.fly = { x0: o.x, y0: o.y, t0: now(), dur: 0.35 }; }
  sfx.drop(); S.sel = null; changed(true);
}
function findPair() {
  const groups = new Map();
  for (const r of allRefs()) { const it = get(r); if (it && it.l < CHAINS[it.c].max) { const k = it.c + ":" + it.l; (groups.get(k) || groups.set(k, []).get(k)).push(r); } }
  const ok = [...groups.values()].filter((g) => g.length >= 2);
  if (!ok.length) return null;
  const g = D.pick(ok); const a = g[0];
  let b = g[1], bd = 1e9; for (const r of g.slice(1)) { const pa = centerOf(a), pb = centerOf(r), d = Math.hypot(pa.x - pb.x, pa.y - pb.y); if (d < bd) { bd = d; b = r; } }
  return [a, b];
}
function showHint(manual) {
  const p = findPair();
  if (!p) { if (manual) toast("暂时没有可合成的一对，点生产建筑造点道具吧"); return; }
  hint = { a: p[0], b: p[1], t0: now() };
}
let hint = null;

// ======================= 订单 =======================
function genOrder() {
  const prods = D.unlockedProds(S.lv);
  const nreq = S.lv < 2 ? 1 : 1 + D.rnd(Math.min(3, 1 + Math.ceil(S.lv / 3)));
  const reqs = [], used = new Set();
  for (let i = 0; i < nreq; i++) {
    const c = D.pick(prods.filter((p) => !used.has(p)).length ? prods.filter((p) => !used.has(p)) : prods); used.add(c);
    const mx = Math.min(CHAINS[c].max, 1 + Math.floor(S.lv * 0.9) + D.rnd(2)), mn = Math.max(1, mx - 2), l = mn + D.rnd(mx - mn + 1);
    reqs.push({ c, l, n: l <= 2 && Math.random() < 0.4 ? 2 : 1 });
  }
  const val = reqs.reduce((s, r) => s + D.itemValue(r.c, r.l) * r.n, 0);
  return { id: Math.random().toString(36).slice(2), npc: D.pick(D.NPCS), reqs, reward: { coin: Math.max(10, Math.round((val * 2.5) / 5) * 5), xp: reqs.reduce((s, r) => s + (r.l + 1) * r.n * 2, 0), gem: Math.random() < 0.3 ? 1 + D.rnd(3) : 0, chest: Math.random() < 0.22 ? Math.min(3, Math.floor(S.lv / 3)) : -1 } };
}
function fillOrders() { while (S.orders.length < 3) S.orders.push(genOrder()); }
function orderReady(o) { return o.reqs.every((r) => countItem(r.c, r.l) >= r.n); }
function submitOrder(o) {
  if (!orderReady(o)) return;
  for (const r of o.reqs) {
    let need = r.n;
    const refs = [...[...allRefs()].filter((x) => x.a === "s"), ...[...allRefs()].filter((x) => x.a === "b")];
    for (const ref of refs) { if (!need) break; const it = get(ref); if (it && it.c === r.c && it.l === r.l) { put(ref, null); need--; const p = centerOf(ref); fx.add("poof", p.x, p.y, { color: CHAINS[r.c].color, light: 0.4 }); } }
  }
  S.coins += o.reward.coin; S.gems += o.reward.gem; S.stat.orders++;
  if (o.reward.chest >= 0) spawnItem("chest", o.reward.chest, null);
  S.orders = S.orders.filter((x) => x !== o); sel_fix();
  fx.add("confetti", L.w / 2, L.h * 0.55); sfx.level();
  toast("✅ 订单完成！+" + o.reward.coin + " 金币" + (o.reward.gem ? " +" + o.reward.gem + " 宝石" : "") + (o.reward.chest >= 0 ? " +宝箱" : ""));
  addXp(o.reward.xp); S.orders.push(genOrder()); changed(true);
}
const sel_fix = () => { if (S.sel && !get(S.sel)) S.sel = null; };

// ======================= HUD / 订单卡 / 信息栏 =======================
function renderHud() {
  $("coin").textContent = S.coins; $("gem").textContent = S.gems; $("en").textContent = Math.floor(S.energy);
  $("lv").textContent = "Lv." + S.lv; $("xpfill").style.width = (S.xp / D.xpNeed(S.lv)) * 100 + "%";
}
function renderOrders() {
  const box = $("orders"); const sc = box.scrollLeft; box.textContent = "";
  for (const o of S.orders) {
    const ready = orderReady(o);
    box.append(h("div", { class: "ord panel" },
      h("div", { class: "nm" }, h("i", { style: "background:" + o.npc[1] }), o.npc[0]),
      h("div", { class: "reqs" }, o.reqs.map((r) => { const have = countItem(r.c, r.l); return h("div", { class: "req" + (have >= r.n ? " ok" : ""), title: CHAINS[r.c].levels[r.l] }, icon(r.c, r.l), h("em", {}, Math.min(have, r.n) + "/" + r.n)); })),
      h("div", { class: "rew" }, h("span", {}, icon("coin", 1), o.reward.coin), o.reward.gem ? h("span", {}, icon("gem", 0), o.reward.gem) : null, o.reward.chest >= 0 ? h("span", {}, icon("chest", o.reward.chest)) : null),
      h("button", { class: "btn " + (ready ? "green" : ""), on: { click: () => submitOrder(o) }, ...(ready ? {} : { disabled: "" }) }, ready ? "提交" : "收集中")));
  }
  box.scrollLeft = sc;
}
function renderInfo() {
  const box = $("info"); box.textContent = "";
  const it = S.sel && get(S.sel);
  if (!it) { box.append(h("div", { class: "empty" }, "点一下选中道具查看信息，再点一次才会生产/开箱/收取。拖动相同道具到一起合成。")); return; }
  const ch = CHAINS[it.c], nm = ch.levels[it.l];
  let desc = "";
  if (ch.kind === "item") desc = it.l < ch.max ? "两个相同合成 → " + ch.levels[it.l + 1] : "已是最高级";
  else if (ch.kind === "gen") desc = "点击消耗 1 体力，生产「" + CHAINS[ch.out].name + "」" + (it.l < ch.max ? "；合成升级 → " + ch.levels[it.l + 1] : "（最高级）");
  else if (ch.kind === "chest") desc = "点击开箱，获得随机道具" + (it.l < ch.max ? "；合成 → " + ch.levels[it.l + 1] : "");
  else desc = "点击收取 +" + ch.vals[it.l] + (ch.kind === "coin" ? " 金币" : ch.kind === "gem" ? " 宝石" : " 体力") + (it.l < ch.max ? "；合成 → " + ch.levels[it.l + 1] : "");
  const canSell = ["item", "gen", "chest"].includes(ch.kind);
  box.append(h("div", { class: "pic" }, icon(it.c, it.l)),
    h("div", { class: "tx" }, h("b", {}, nm), " ", h("span", {}, ch.name + " " + (it.l + 1) + "/" + (ch.max + 1) + " 级"), h("br"), desc),
    ["gen", "chest", "coin", "gem", "energy"].includes(ch.kind) ? h("button", { class: "btn green", on: { click: () => activate(S.sel) } }, ch.kind === "gen" ? "生产" : ch.kind === "chest" ? "开箱" : "收取") : null,
    canSell ? h("button", { class: "btn gold", on: { click: () => sell(S.sel) } }, "卖出", h("br"), D.itemValue(it.c, it.l) + "金币") : null);
}
let dirtyInfo = true;
function changed(forceLayout) {
  sel_fix(); renderHud(); renderOrders(); renderInfo(); saveSoon(); dirtyInfo = false;
  if (forceLayout) layout();
}

// ======================= 弹窗 =======================
function modal(title, body) { $("mtitle").textContent = title; const b = $("mbody"); b.textContent = ""; b.append(body); $("modal").classList.remove("hidden"); }
const closeModal = () => $("modal").classList.add("hidden");
const modalOpen = () => !$("modal").classList.contains("hidden");
function costEl(cost) { const k = Object.keys(cost)[0]; return h("span", { class: "pr" }, icon(k === "coin" ? "coin" : "gem", k === "coin" ? 1 : 0), cost[k]); }
function openShop() {
  const body = h("div"); let sec = "";
  let grid = null;
  const draw = () => {
    body.textContent = ""; sec = ""; body.append(h("div", { class: "hint" }, "金币来自订单、卖道具和收取金币；宝石来自订单和宝石道具。体力、格子、应急格永远免费。"));
    for (const e of D.shopList(S.lv)) {
      if (e.sec !== sec) { sec = e.sec; body.append(h("div", { class: "sec" }, sec)); grid = h("div", { class: "grid" }); body.append(grid); }
      const k = Object.keys(e.cost)[0], can = !e.need && S[k === "coin" ? "coins" : "gems"] >= e.cost[k];
      grid.append(h("div", { class: "card" + (e.need ? " lock" : "") }, icon(e.c, e.l), e.need ? "Lv." + e.need + " 解锁" : CHAINS[e.c].levels[e.l], e.need ? null : costEl(e.cost),
        e.need ? null : h("button", { class: "btn " + (can ? "green" : ""), on: { click: () => { buy(e); draw(); } } }, "购买")));
    }
  };
  draw(); modal("🛒 商店", body);
}
function buy(e) {
  const k = Object.keys(e.cost)[0], key = k === "coin" ? "coins" : "gems";
  if (S[key] < e.cost[k]) { sfx.deny(); toast("资源不足"); return; }
  const r = spawnItem(e.c, e.l, null);
  if (!r) { sfx.deny(); toast("背包已满，先腾点空间"); return; }
  S[key] -= e.cost[k]; sfx.coin(); toast("已购买「" + CHAINS[e.c].levels[e.l] + "」"); changed();
}
function openDex() {
  const body = h("div");
  const total = Object.values(CHAINS).reduce((s, c) => s + c.levels.length, 0), got = Object.keys(S.disc).length;
  body.append(h("div", { class: "hint" }, "已收集 " + got + " / " + total + (S.set.sandbox ? "　沙盒模式已开：点已发现的道具可免费取出一个" : "　（可在菜单开启沙盒模式）")));
  for (const [id, ch] of Object.entries(CHAINS)) {
    body.append(h("div", { class: "sec" }, ch.name + (ch.kind === "gen" ? "（生产建筑）" : "")));
    body.append(h("div", { class: "dexrow" }, ch.levels.map((nm, l) => { const f = S.disc[id + ":" + l]; return h("div", { class: "card" + (f ? "" : " lock"), on: f && S.set.sandbox ? { click: () => { if (spawnItem(id, l, null)) { toast("已取出「" + nm + "」"); changed(); } else toast("背包已满"); } } : {} }, icon(id, l), f ? nm : "???"); })));
  }
  modal("📖 图鉴", body);
}
function openMenu() {
  const body = h("div");
  const tg = (key, label, sub, fn) => { const t = h("div", { class: "tg" + (S.set[key] ? " on" : ""), on: { click: () => { S.set[key] = !S.set[key]; t.classList.toggle("on", S.set[key]); fn && fn(); saveSoon(); } } }); return h("div", { class: "row" }, h("div", {}, h("b", {}, label), h("div", { class: "hint" }, sub)), t); };
  body.append(tg("sound", "音效", "合成/生成/收取提示音", () => setSound(S.set.sound)));
  body.append(tg("sandbox", "沙盒模式", "图鉴里点已发现的道具可免费取出", null));
  const zl = h("span", {}, Math.round((S.set.zoom || 1) * 100) + "%");
  body.append(h("div", { class: "row" }, h("div", {}, h("b", {}, "界面缩放 "), zl, h("div", { class: "hint" }, "只缩放棋盘，像素保持清晰；放大后在空白处拖动可平移。快捷键 + / - / 0，Ctrl+滚轮")),
    h("input", { type: "range", min: "50", max: "160", step: "5", value: String(Math.round((S.set.zoom || 1) * 100)), on: { input: (e) => { setZoom(e.target.value / 100); zl.textContent = e.target.value + "%"; } } })));
  const ta = h("textarea", { placeholder: "导入存档：把存档文本粘贴到这里" });
  body.append(h("div", { class: "row" }, h("div", {}, h("b", {}, "存档"), h("div", { class: "hint" }, "进度自动保存在本机浏览器；可复制到别的设备")),
    h("div", {}, h("button", { class: "btn", on: { click: () => { save(); const raw = localStorage.getItem(SAVE_KEY); ta.value = raw; ta.select(); try { navigator.clipboard.writeText(raw); toast("存档已复制"); } catch (e) { toast("请手动复制文本框内容"); } } } }, "导出"), " ", h("button", { class: "btn green", on: { click: () => { try { load(ta.value.trim()); fillOrders(); layout(); changed(true); closeModal(); toast("导入成功"); } catch (e) { toast("存档格式不正确"); } } } }, "导入"))));
  body.append(ta);
  body.append(h("div", { class: "row" }, h("div", {}, h("b", {}, "全部解锁格子"), h("div", { class: "hint" }, "背包 " + NB + " 格全开")), h("button", { class: "btn", on: { click: () => { unlockCells(NB); closeModal(); } } }, "解锁")));
  body.append(h("div", { class: "row" }, h("div", {}, h("b", {}, "重新开始"), h("div", { class: "hint" }, "清除全部进度")), h("button", { class: "btn red", on: { click: () => { if (confirm("确定清除所有进度并重新开始？")) { newGame(); fillOrders(); layout(); changed(true); closeModal(); } } } }, "重置")));
  body.append(h("div", { class: "sec" }, "玩法"), h("div", { class: "hint", style: "white-space:pre-line" }, "① 点击生产建筑（花园/林场/厨房…），消耗 1 体力生成材料。\n② 点一下选中查看信息(是否最高级等)，再点一次已选中的建筑/宝箱/资源才会触发，也可点信息栏按钮。\n③ 把两个相同的道具拖到一起，合成高一级的道具；建筑、宝箱、资源也能合成升级。\n④ 满足订单需求后点「提交」换金币/宝石/宝箱，升级解锁新建筑。\n⑤ 背包满了？➕格子、📦应急格、⚡体力全都免费无限。"));
  modal("☰ 菜单", body);
}

// ======================= 渲染 =======================
const floatsDraw = (t) => {
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i], a = (t - f.t0) / 1.1; if (a >= 1) { floats.splice(i, 1); continue; } if (a < 0) continue;
    ctx.globalAlpha = a > 0.7 ? 1 - (a - 0.7) / 0.3 : 1; ctx.font = "800 " + Math.round(L.cs * 0.28) + "px sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 4; ctx.strokeStyle = "#120e22"; ctx.fillStyle = f.color;
    const y = f.y - a * L.cs * 0.8; ctx.strokeText(f.text, f.x, y); ctx.fillText(f.text, f.x, y); ctx.globalAlpha = 1;
  }
};
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
let drag = null;
function drawItem(it, cx, cy, sc = 1, t, bob = 0) {
  const k = Math.max(1, Math.round((L.cs * L.dpr * 0.86) / 18)), size = (18 * k * sc) / L.dpr;
  ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.36, size * 0.3, size * 0.07, 0, 0, 7); ctx.fill();
  const x = Math.round((cx - size / 2) * L.dpr) / L.dpr, y = Math.round((cy - size / 2 + bob) * L.dpr) / L.dpr;
  ctx.drawImage(sprite(it.c, it.l), x, y, size, size);
}
function frame(ts) {
  const t = ts / 1000;
  const dt = Math.min(0.05, t - (frame.last || t)) * (window.__ts ?? 1); frame.last = t;
  ctx.setTransform(L.dpr, 0, 0, L.dpr, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, L.w, L.h);
  const cs = L.cs, pad = Math.max(1, Math.round(cs * 0.04));
  // 底板
  for (let i = 0; i < NB; i++) {
    const x = (i % COLS) * cs, y = Math.floor(i / COLS) * cs;
    if (S.unlocked[i]) { ctx.fillStyle = (i % COLS + Math.floor(i / COLS)) % 2 ? "#463c70" : "#3f3665"; rr(x + pad, y + pad, cs - pad * 2, cs - pad * 2, 6); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,.06)"; ctx.fillRect(x + pad + 2, y + pad + 1, cs - pad * 2 - 4, 2); }
    else {
      ctx.fillStyle = "#231d3a"; rr(x + pad, y + pad, cs - pad * 2, cs - pad * 2, 6); ctx.fill();
      const cx = x + cs / 2, cy = y + cs / 2, u = cs / 16; ctx.strokeStyle = "#5d5388"; ctx.lineWidth = Math.max(2, u); ctx.beginPath(); ctx.arc(cx, cy - u * 1.5, u * 2.2, Math.PI, 0); ctx.stroke(); ctx.fillStyle = "#5d5388"; ctx.fillRect(cx - u * 3, cy - u * 1.5, u * 6, u * 4.5); ctx.fillStyle = "#231d3a"; ctx.fillRect(cx - u * 0.5, cy + u * 0.2, u, u * 1.5);
    }
  }
  ctx.fillStyle = "#a89ccf"; ctx.font = "700 " + Math.max(10, Math.round(cs * 0.22)) + "px sans-serif"; ctx.textAlign = "left"; ctx.fillText("应急格（临时存放，也可合成）", 4, ROWS * cs + cs * 0.36);
  const nShow = Math.min(S.slotN + 1, SLOT_MAX);
  for (let i = 0; i < nShow; i++) {
    const r = rectOf({ a: "s", i });
    if (i < S.slotN) { ctx.fillStyle = i % 2 ? "#5e4a32" : "#695238"; rr(r.x + pad, r.y + pad, cs - pad * 2, cs - pad * 2, 6); ctx.fill(); ctx.strokeStyle = "#a07a40"; ctx.lineWidth = 2; ctx.stroke(); }
    else { ctx.setLineDash([4, 4]); ctx.strokeStyle = "#a89ccf"; ctx.lineWidth = 2; rr(r.x + pad + 2, r.y + pad + 2, cs - pad * 2 - 4, cs - pad * 2 - 4, 6); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = "#a89ccf"; ctx.font = "800 " + Math.round(cs * 0.5) + "px sans-serif"; ctx.textAlign = "center"; ctx.fillText("+", r.x + cs / 2, r.y + cs * 0.66); }
  }
  // 选中 / 拖动目标 / 提示
  const over = drag && drag.moved ? hit(drag.p) : null;
  if (S.sel) { const r = rectOf(S.sel); ctx.strokeStyle = "#ffd24a"; ctx.lineWidth = 3; rr(r.x + pad, r.y + pad, cs - pad * 2, cs - pad * 2, 6); ctx.stroke(); }
  if (hint && !drag) { const a = 0.5 + 0.5 * Math.sin((t - hint.t0) * 7); ctx.strokeStyle = `rgba(120,255,140,${0.35 + a * 0.65})`; ctx.lineWidth = 3; for (const h_ of [hint.a, hint.b]) { const r = rectOf(h_); rr(r.x + pad, r.y + pad, cs - pad * 2, cs - pad * 2, 6); ctx.stroke(); } }
  if (over && isOpen(over) && !same(over, drag.ref)) { const r = rectOf(over); const m = canMerge(drag.item, get(over)); ctx.strokeStyle = m ? "#5bff7a" : "#ffffff"; ctx.fillStyle = m ? "rgba(91,255,122,.22)" : "rgba(255,255,255,.12)"; ctx.lineWidth = 3; rr(r.x + pad, r.y + pad, cs - pad * 2, cs - pad * 2, 6); ctx.fill(); ctx.stroke(); }
  // 道具
  let idx = 0;
  for (const ref of allRefs()) {
    const it = get(ref); idx++;
    if (!it || (drag && drag.moved && it === drag.item)) continue;
    let { x, y } = centerOf(ref), sc = 1, bob = 0;
    if (it.fly) {
      const p = (t - it.fly.t0) / it.fly.dur;
      if (p < 0) continue;
      if (p >= 1) delete it.fly; else { const e = 1 - (1 - p) ** 3; x = it.fly.x0 + (x - it.fly.x0) * e; y = it.fly.y0 + (y - it.fly.y0) * e - Math.sin(p * Math.PI) * cs * 0.45; sc = 0.6 + 0.4 * e; }
    }
    if (it.pop != null) { const p = (t - it.pop) / 0.35; if (p >= 1) delete it.pop; else sc *= 1 + 0.28 * Math.sin(p * Math.PI) * (1 - p * 0.3); }
    const kind = CHAINS[it.c].kind;
    if (kind === "gen" || kind === "chest" || kind === "coin" || kind === "gem" || kind === "energy") bob = Math.round(Math.sin(t * 2.4 + idx) * 1.5);
    if (S.sel && same(S.sel, ref) && !it.fly) bob -= 2;
    drawItem(it, x, y, sc, t, bob);
  }
  if (drag && drag.moved) drawItem(drag.item, drag.p.x, drag.p.y - cs * 0.25, 1.18, t);
  floatsDraw(t);
  fx.tick(dt);
  requestAnimationFrame(frame);
}

// ======================= 输入 =======================
function pos(e) { const r = board.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
board.addEventListener("pointerdown", (e) => {
  e.preventDefault(); try { board.setPointerCapture(e.pointerId); } catch (err) {}
  const p = pos(e), ref = hit(p); lastAct = now(); hint = null;
  drag = { cx: e.clientX, cy: e.clientY, panned: false, ref, p, s: p, item: ref && S.unlocked[ref.i] !== false ? get(ref) : null, moved: false };
  if (ref && ref.a === "b" && !S.unlocked[ref.i]) drag.item = null;
});
board.addEventListener("pointermove", (e) => {
  if (!drag) return; drag.p = pos(e);
  if (!drag.item) { // 空白/锁定格上拖动 = 平移视野(放大后)
    const dx = e.clientX - drag.cx, dy = e.clientY - drag.cy, w = $("stageWrap");
    if (drag.panned || Math.hypot(dx, dy) > 6) { drag.panned = true; w.scrollLeft -= dx; w.scrollTop -= dy; drag.cx = e.clientX; drag.cy = e.clientY; }
    return;
  }
  if (!drag.moved && drag.item && Math.hypot(drag.p.x - drag.s.x, drag.p.y - drag.s.y) > Math.max(7, L.cs * 0.12)) { drag.moved = true; sfx.pick(); S.sel = drag.ref; }
});
board.addEventListener("pointerup", (e) => {
  if (!drag) return; const d = drag; drag = null; lastAct = now();
  if (d.moved) { drag = null; const dst = hit(pos(e)); drop(d.ref, dst); changed(); }
  else if (!d.panned) tap(d.ref);
});
board.addEventListener("pointercancel", () => { drag = null; });
let lastAct = now();
window.addEventListener("resize", () => { if (!window.__noresize) layout(); });
window.addEventListener("beforeunload", save);
document.addEventListener("visibilitychange", () => { if (document.hidden) save(); });

// ======================= 启动 =======================
function regen() {
  const t = Date.now();
  if (S.energy >= D.ENERGY_CAP) { S.enT = t; return; }
  const n = Math.floor((t - S.enT) / D.REGEN_MS);
  if (n > 0) { S.energy = Math.min(D.ENERGY_CAP, S.energy + n); S.enT += n * D.REGEN_MS; renderHud(); }
}
function init() {
  let raw = null; try { raw = localStorage.getItem(SAVE_KEY); } catch (e) {}
  if (raw) { try { load(raw); } catch (e) { newGame(); } } else newGame();
  setSound(S.set.sound);
  $("icCoin").append(icon("coin", 1)); $("icGem").append(icon("gem", 0)); $("icEn").append(icon("energy", 0));
  fillOrders();
  $("enPlus").onclick = () => addEnergy(50);
  $("bShop").onclick = openShop; $("bDex").onclick = openDex; $("bSort").onclick = sortBoard; $("bHint").onclick = () => showHint(true);
  $("bRow").onclick = () => unlockCells(COLS); $("bSlot").onclick = addSlot; $("menuBtn").onclick = openMenu;
  $("zoomIn").onclick = () => setZoom((S.set.zoom || 1) + 0.1); $("zoomOut").onclick = () => setZoom((S.set.zoom || 1) - 0.1); $("zoomVal").onclick = () => setZoom(1);
  $("stageWrap").addEventListener("wheel", (e) => { if (e.ctrlKey || e.shiftKey) { e.preventDefault(); setZoom((S.set.zoom || 1) + (e.deltaY < 0 ? 0.1 : -0.1)); } }, { passive: false });
  window.addEventListener("keydown", (e) => { if (modalOpen()) return; if (e.key === "+" || e.key === "=") setZoom((S.set.zoom || 1) + 0.1); else if (e.key === "-") setZoom((S.set.zoom || 1) - 0.1); else if (e.key === "0") setZoom(1); });
  $("mclose").onclick = closeModal; $("modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
  layout(); changed(); regen();
  setInterval(() => { regen(); if (!drag && !modalOpen() && !hint && now() - lastAct > 8) showHint(false); }, 1000);
  requestAnimationFrame(frame);
  window.__game = { frame, get S() { return S; }, tap, drop, spawnItem, fx, layout, changed, centerOf, openShop, openDex, openMenu, doMerge, findPair, addSlot, unlockCells };
}
window.addEventListener("error", (e) => { document.title = "ERR " + e.message; const d = document.createElement("pre"); d.style.cssText = "position:fixed;z-index:99;top:0;left:0;background:#400;color:#fff;font-size:11px;margin:0;padding:4px;max-width:100%;white-space:pre-wrap"; d.textContent = e.message + " @" + e.lineno; document.body.append(d); });
init();
