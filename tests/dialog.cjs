const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

let document;
class Element {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.isConnected = true;
    this.visible = true;
    this.dataset = {};
    this.children = [];
    this.listeners = {};
  }
  addEventListener(event, run) { (this.listeners[event] ??= []).push(run); }
  append(...children) {
    for (const child of children) if (typeof child === "object") child.parentElement = this;
    this.children.push(...children);
  }
  replaceChildren(...children) { this.children = []; this.append(...children); }
  closest(selector) {
    for (let node = this; node; node = node.parentElement) {
      if ((selector === "dialog" && node.tagName === "DIALOG") || (selector === "[hidden]" && node.hidden)) return node;
    }
    return null;
  }
  getClientRects() { return this.visible && !this.closest("[hidden]") ? [{}] : []; }
  focus() { if (this.isConnected && this.getClientRects().length) document.activeElement = this; }
  showModal() { this.open = true; }
  close() {
    this.open = false;
    queueMicrotask(() => { for (const run of this.listeners.close ?? []) run(); });
  }
  querySelector(selector) { assert.equal(selector, ".close"); return this.closeButton ??= new Element("button"); }
}

(async () => {
  const elements = Object.fromEntries(["room", "dialog", "panel-label", "panel-title", "panel-body", "panel-actions"]
    .map((id) => [id, new Element(id === "dialog" ? "dialog" : "div")]));
  document = {
    body: new Element("body"),
    createElement: (tag) => new Element(tag),
    getElementById: (id) => elements[id],
    addEventListener() {},
  };
  for (const id of ["panel-label", "panel-title", "panel-body", "panel-actions"]) elements[id].parentElement = elements.dialog;
  const context = vm.createContext({ document, URL });
  const cache = new Map();
  function load(filename) {
    if (!cache.has(filename)) cache.set(filename, new vm.SourceTextModule(fs.readFileSync(filename, "utf8"), {
      context, identifier: filename,
      initializeImportMeta(meta) { meta.url = pathToFileURL(filename).href; },
    }));
    return cache.get(filename);
  }
  const module = load(path.resolve(__dirname, "../src/ui/dialog.js"));
  await module.link((specifier, parent) => load(path.resolve(path.dirname(parent.identifier), specifier.split("?")[0])));
  await module.evaluate();
  const { show, close } = module.namespace;
  const marker = new Element("button");
  const open = () => show("Test", "Panel", "", []);

  marker.focus(); open();
  assert.equal(document.activeElement, elements["panel-title"]);
  close(); await Promise.resolve();
  assert.equal(document.activeElement, marker, "Closing restores the original scene control");

  marker.focus(); open(); open(); close(); await Promise.resolve();
  assert.equal(document.activeElement, marker, "Replacing dialogue pages retains the original opener");

  marker.focus(); open(); marker.hidden = true; close(); await Promise.resolve();
  assert.equal(document.activeElement, elements.room, "Handover's hidden NPC falls back to the game area");
  marker.hidden = false;

  marker.focus(); open(); marker.isConnected = false; close(); await Promise.resolve();
  assert.equal(document.activeElement, elements.room, "Removed controls fall back to the game area");
  marker.isConnected = true;

  document.body.focus(); open(); close(); await Promise.resolve();
  assert.equal(document.activeElement, elements.room, "Keyboard menus opened from the body return to the game");

  marker.focus(); open(); close(); open(); await Promise.resolve();
  assert.equal(document.activeElement, elements["panel-title"], "An old close event cannot steal focus from a reopened title");
  close(); await Promise.resolve();
  assert.equal(document.activeElement, elements.room, "Closed-modal contents are not focus-return targets");
  console.log("PASS: dialog focus return, multi-page dialogue, hidden/removed opener, keyboard fallback, reopen race");
})().catch((error) => { console.error(error); process.exitCode = 1; });
