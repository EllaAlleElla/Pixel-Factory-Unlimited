// 极简静态服务器：node serve.mjs [端口]  —— 同一局域网的手机可用 http://电脑IP:端口 访问
import http from "node:http"; import fs from "node:fs"; import os from "node:os"; import { exec } from "node:child_process";
const port = +process.argv[2] || 8080, html = () => fs.readFileSync(new URL("./index.html", import.meta.url));
http.createServer((q, r) => { r.writeHead(200, { "content-type": "text/html; charset=utf-8" }); r.end(html()); }).listen(port, "0.0.0.0", () => {
  console.log("像素合成工坊已启动：\n  本机   http://localhost:" + port);
  for (const l of Object.values(os.networkInterfaces()).flat()) if (l.family === "IPv4" && !l.internal) console.log("  手机   http://" + l.address + ":" + port + "  (需同一 Wi-Fi)");
  console.log("按 Ctrl+C 关闭"); exec("start http://localhost:" + port);
});
