#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const mode = process.argv[2];
if (!["dev", "player"].includes(mode) || process.argv.length !== 3) {
  console.error("Usage: node tools/entry.mjs dev | player"); process.exit(1);
}
const target = mode === "dev" ? "dev.html" : "player.html";
await writeFile(fileURLToPath(new URL("../index.html", import.meta.url)), `<!doctype html>
<html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="0;url=./${target}">
<title>Last Light</title><link rel="icon" href="./assets/ui/icon.svg" type="image/svg+xml">
<script>location.replace(new URL("./${target}", location.href).href);</script>
</head><body><p><a href="./${target}">进入 Last Light</a></p><p><a href="./player.html">玩家版</a> · <a href="./dev.html">开发工作台</a></p></body></html>
`);
console.log("Default entry: " + target);
