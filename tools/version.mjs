#!/usr/bin/env node
// One command updates the full static module graph, preventing duplicate module
// instances caused by different cache keys for the same imported file.
import { readFile, writeFile, readdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argument = process.argv[2];
if (process.argv.length !== 3 || (argument !== "--check" && !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(argument ?? ""))) {
  console.error("Usage: node tools/version.mjs VERSION | --check");
  process.exit(1);
}
const imports = /(\bfrom\s*["']|\bimport\s*(?:\(\s*)?["'])(\.\.?\/[^"']+)(["'])/g;
async function filesIn(directory) {
  const files = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, item.name);
    if (item.isDirectory()) files.push(...await filesIn(filename));
    else if (/\.(js|css)$/.test(item.name)) files.push(filename);
  }
  return files;
}
const html = path.join(root, "player.html");
const files = [path.join(root, "index.html"), path.join(root, "dev.html"), html, ...await filesIn(path.join(root, "src"))];
const entry = (await readFile(html, "utf8")).match(/src="\.\/src\/player\.js\?v=([^"&]+)"/);
if (!entry) throw new Error("The entry module must have a cache version");
const version = argument === "--check" ? entry[1] : argument;
let changed = 0;
for (const filename of files) {
  let source = await readFile(filename, "utf8");
  if (argument !== "--check") {
    let updated = source.replace(/\?v=[a-zA-Z0-9._-]+/g, "?v=" + version);
    if (filename.endsWith(".js")) updated = updated.replace(imports, (match, before, reference, after) => {
      const url = new URL(reference, "https://local.invalid/");
      url.searchParams.set("v", version);
      return before + reference.split(/[?#]/)[0] + url.search + url.hash + after;
    });
    if (updated !== source) {
      await writeFile(filename, updated);
      changed++;
      source = updated;
    }
  }
  for (const match of source.matchAll(/\?v=([a-zA-Z0-9._-]+)/g)) {
    if (match[1] !== version) throw new Error(`Mixed cache versions in ${path.relative(root, filename)}`);
  }
  if (filename.endsWith(".js")) for (const match of source.matchAll(imports)) {
    const reference = match[2];
    if (new URL(reference, "https://local.invalid/").searchParams.get("v") !== version) {
      throw new Error(`Missing or stale import version in ${path.relative(root, filename)}: ${reference}`);
    }
    await access(path.resolve(path.dirname(filename), reference.split(/[?#]/)[0]));
  }
}
console.log(`PASS: version ${version}; ${files.length} files checked; ${changed} files updated`);
