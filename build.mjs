import { build } from "./vendor/pixelfx/node_modules/esbuild/lib/main.js";
import fs from "node:fs";
const entry = process.argv[2] || "src/main.js";
const r = await build({ entryPoints: [entry], bundle: true, format: "iife", write: false, minify: !!process.env.MIN, target: "es2019", charset: "utf8" });
const js = r.outputFiles[0].text;
if (entry.endsWith("test.js")) { fs.writeFileSync("tmp/test.html", `<!doctype html><meta charset=utf8><body><script>${js}</script>`); }
else {
  const css = fs.readFileSync("src/style.css", "utf8"), html = fs.readFileSync("src/index.template.html", "utf8");
  fs.writeFileSync("index.html", html.replace("/*CSS*/", () => css).replace("/*JS*/", () => js.replace(/<\/script>/g, "<\/script>")));
}
console.log("built", entry, (js.length / 1024).toFixed(0) + "KB");
