import { CHAINS } from "./sprites.js";
export const COLS = 7, ROWS = 9, SLOT_COLS = 7, SLOT_MAX = 21;
export const ENERGY_CAP = 100, REGEN_MS = 20000;
export const GEN_IDS = ["g_garden", "g_lumber", "g_mine", "g_kitchen", "g_alchemy", "g_loom"];
export const PROD_IDS = ["flower", "wood", "ore", "food", "potion", "cloth"];
export const UNLOCK_LV = { g_garden: 1, g_lumber: 1, g_kitchen: 1, g_mine: 2, g_alchemy: 3, g_loom: 4 };
const OFFS = [0, 0, 0, 1, 2];
const W = [[70, 30], [50, 35, 15], [30, 35, 25, 10], [18, 30, 30, 17, 5], [8, 20, 30, 25, 12, 5]];
export const rnd = (n) => Math.floor(Math.random() * n);
export const pick = (a) => a[rnd(a.length)];
export function weighted(ws) { const t = ws.reduce((a, b) => a + b, 0); let r = Math.random() * t; for (let i = 0; i < ws.length; i++) { if ((r -= ws[i]) < 0) return i; } return ws.length - 1; }
export function rollProductLevel(genLv, max) { return Math.min(max, OFFS[genLv] + weighted(W[genLv])); }
export function itemValue(c, l) {
  const ch = CHAINS[c];
  if (ch.kind === "item") return Math.round(ch.base * 2 ** l);
  if (ch.kind === "gen") return 25 * 3 ** l;
  if (ch.kind === "chest") return 30 * 2 ** l;
  return 1;
}
export const xpNeed = (lv) => 30 + 25 * (lv - 1);
export const NPCS = [["小红", "#f27aa6"], ["木匠老王", "#b9803f"], ["矿工大叔", "#8d8f9c"], ["面包师", "#e8a850"], ["炼金婆婆", "#9a5ad8"], ["裁缝阿姨", "#d8423a"], ["旅行商人", "#4a8fe0"], ["村长", "#4faa4a"], ["小镇厨师", "#ff9a2a"], ["花店老板", "#f27aa6"], ["骑士", "#cfd6e4"], ["公主", "#d46ae8"]];
export const unlockedProds = (lv) => PROD_IDS.filter((p) => GEN_IDS.some((g) => CHAINS[g].out === p && UNLOCK_LV[g] <= lv));
// 宝箱掉落
export function chestLoot(tier, lv) {
  const n = 2 + tier + (Math.random() < 0.3 ? 1 : 0);
  const prods = unlockedProds(lv);
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    if (r < 0.68) { const c = pick(prods); out.push([c, Math.min(CHAINS[c].max, Math.max(0, tier - 1 + rnd(3)))]); }
    else if (r < 0.82) out.push(["coin", Math.min(4, tier + rnd(2))]);
    else if (r < 0.92) out.push(["energy", Math.min(4, Math.max(0, tier - 1 + rnd(2)))]);
    else out.push(["gem", Math.min(4, Math.max(0, tier - 1 + rnd(2)))]);
  }
  return out;
}
// 商店
export function shopList(lv) {
  const L = [];
  for (const g of GEN_IDS) L.push({ c: g, l: 0, cost: { coin: 150 }, need: UNLOCK_LV[g] > lv ? UNLOCK_LV[g] : 0, sec: "生产建筑" });
  for (const p of unlockedProds(lv)) for (let l = 0; l < 3; l++) L.push({ c: p, l, cost: { coin: 25 * 2 ** l }, need: 0, sec: "基础材料" });
  [1, 2, 3, 6].forEach((g, t) => L.push({ c: "chest", l: t, cost: { gem: g }, need: 0, sec: "宝箱" }));
  [1, 3, 8].forEach((g, t) => L.push({ c: "energy", l: t + 1, cost: { gem: g }, need: 0, sec: "体力道具" }));
  return L;
}
