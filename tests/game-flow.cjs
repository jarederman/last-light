const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");

class Element {
  constructor() {
    this.style = {};
    this.dataset = {};
    this.children = [];
    this.listeners = {};
    const classes = new Set();
    this.classList = {
      toggle(name, enabled) {
        if (enabled) classes.add(name);
        else classes.delete(name);
      },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); },
    };
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  addEventListener(event, callback) {
    (this.listeners[event] ??= []).push(callback);
  }
  emit(event, value = {}) {
    for (const callback of this.listeners[event] ?? []) callback(value);
  }
  querySelector(selector) {
    assert.equal(selector, ".close");
    return this.closeButton ??= new Element();
  }
  focus() {}
  showModal() { this.open = true; }
  close() { this.open = false; this.emit("close"); }
}

async function startGame() {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const elements = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)]
    .map((match) => [match[1], new Element()]));
  const document = new Element();
  document.body = new Element();
  document.createElement = () => new Element();
  document.getElementById = (id) => {
    assert.ok(elements[id], "HTML must contain " + id);
    return elements[id];
  };
  let animate;
  const context = vm.createContext({
    document, window: new Element(), URL,
    requestAnimationFrame(callback) { animate = callback; },
  });
  const cache = new Map();
  function load(filename) {
    if (!cache.has(filename)) {
      cache.set(filename, new vm.SourceTextModule(fs.readFileSync(filename, "utf8"), {
        context, identifier: filename,
        initializeImportMeta(meta) { meta.url = pathToFileURL(filename).href; },
      }));
    }
    return cache.get(filename);
  }
  const main = load(path.join(root, "src/main.js"));
  await main.link((specifier, parent) => load(path.resolve(path.dirname(parent.identifier), specifier.split("?")[0])));
  await main.evaluate();
  let clock = 0;
  const title = () => elements["panel-title"].textContent;
  const buttons = () => elements["panel-actions"].children;
  const hasAction = (text) => buttons().some((button) => button.children.includes(text));
  function action(text) {
    const button = buttons().find((item) =>
      item.children.some((value) => typeof value === "string" && value.includes(text)));
    assert.ok(button, "Expected action " + text + " in " + title());
    button.emit("click");
  }
  function use(label) {
    assert.ok(!elements.dialog.open);
    const marker = elements.objects.children.find((button) => button.textContent.endsWith(label));
    assert.ok(marker, "Expected interactable " + label);
    marker.emit("click");
    for (let index = 0; index < 500 && !elements.dialog.open; index += 1) animate(clock += 16);
    assert.ok(elements.dialog.open, "Walking to " + label + " opens it");
  }
  function key(key) {
    document.emit("keydown", { key, preventDefault() {} });
    document.emit("keyup", { key });
  }
  function hold(key, frames) {
    document.emit("keydown", { key, preventDefault() {} });
    for (let index = 0; index < frames; index += 1) animate(clock += 16);
    document.emit("keyup", { key });
  }
  return { elements, action, use, title, hasAction, key, hold };
}

async function testMovement() {
  const { elements, action, hold } = await startGame();
  action("Begin night shift");
  const actor = elements.player;
  const left = () => parseFloat(actor.style.left);
  const start = left();
  hold("d", 8);
  assert.ok(left() > start, "D moves right");
  assert.equal(actor.dataset.dir, "right");
  hold("a", 8);
  assert.ok(left() < start + .1, "A moves back left");
  assert.equal(actor.dataset.dir, "left");
  hold("s", 100);
  assert.ok(parseFloat(actor.style.top) <= 377 / 4, "Player stays inside the new floor boundary");
  hold("w", 100);
  assert.ok(parseFloat(actor.style.top) >= 243 / 4, "Mara's footprint blocks the player");
}

async function train(game) {
  const { action, use, title, hasAction, elements, key } = game;
  assert.equal(title(), "Last Light");
  action("Credits");
  assert.equal(title(), "Made with care");
  key("Escape");
  assert.equal(title(), "Last Light", "Closing credits returns to the title");
  action("Begin night shift");
  use("Mara"); action("I'll take a look");
  use("Radio"); action("Back to the station");
  use("Archive"); action("Read Nell"); action("Back to the file");
  action("Read the receiver"); action("Back to the station");
  use("Mara");
  assert.equal(title(), "Take another look", "Reading alone cannot complete the investigation");
  action("Back to the station");
  use("Radio"); action("Open receiver bench");
  action("Send relay ping");
  assert.match(elements["panel-body"].innerHTML, /No reply after/);
  assert.ok(!hasAction("Compare with archived tape"));
  action("Turn auto-reply on"); action("Send relay ping");
  assert.match(elements["panel-body"].innerHTML, /Three short clicks/);
  action("Compare with archived tape"); action("definitely automatic");
  assert.equal(title(), "Listen to the second source");
  action("Compare the recordings again"); action("old source is still unknown");
  action("Back to the station");
  use("Mara"); action("may be working"); action("Log the signal");
  use("Terminal"); action("ferry is delayed"); action("File this call");
  use("Terminal"); action("unsettling"); action("File this call");
  use("Terminal"); action("Go ahead"); action("File this call");
  use("Mara"); action("Take the shift"); action("Return to the station");
  use("Live terminal"); action("Give me a moment");
}

async function testGroundedReport() {
  const game = await startGame();
  await train(game);
  const { action, use, title, elements, key } = game;
  use("Radio"); assert.match(elements["panel-body"].innerHTML, /00:17:06/);
  action("Back to the station");
  use("Archive"); action("Read the receiver"); action("Back to the station");
  use("Live terminal"); action("Check the rescue board"); action("Back to Nell");
  action("Compose a reply");
  assert.ok(elements["panel-actions"].children[2].className.includes("suggested"));
  action("It could be automatic"); action("Change reply");
  action("It could be automatic"); action("Send reply");
  assert.equal(title(), "Nell listens");
  action("Leave the line open");
  use("Live terminal"); assert.equal(title(), "Nell listens", "Sent reply survives closing the panel");
  action("Prepare a signal report");
  assert.match(elements["panel-body"].innerHTML, /Automatic reply is possible/);
  assert.match(elements["panel-body"].innerHTML, /Rescue board checked/);
  action("Review before sending"); action("Prepare a signal report");
  action("Send recording and report"); assert.equal(title(), "Report received");
  action("Back to the station"); use("Live terminal");
  assert.equal(title(), "Something they can check");
  assert.ok(!game.hasAction("Prepare a signal report"), "A receipt cannot be submitted twice");
  action("Stay with Nell"); action("I’ll be here"); assert.equal(title(), "Line open");
  assert.match(elements["panel-body"].innerHTML, /REPORT · RECEIVED/);
  action("Back to the station");
  key("j"); assert.match(elements["panel-body"].innerHTML, /Recording delivered/);
  action("Close journal"); key("Escape"); action("Return to title"); action("Return to title");
  assert.equal(title(), "Last Light");
  action("Begin night shift"); key("j");
  assert.ok(!elements["panel-body"].innerHTML.includes('data-done="true"'), "Restart clears evidence");
}

async function testOptionalInvestigation() {
  const game = await startGame();
  await train(game);
  const { action, use, title, elements } = game;
  use("Live terminal"); action("Compose a reply");
  assert.ok(!elements["panel-body"].innerHTML.includes("00:17:06"));
  action("keep the line open"); action("Send reply");
  assert.equal(title(), "Nell listens");
  assert.ok(!game.hasAction("Prepare a signal report"), "Cannot attach a recording that was not captured");
  action("Stay with Nell"); action("I’ll be here");
  assert.match(elements["panel-body"].innerHTML, /NO SIGNAL REPORT SENT/);
}

async function testUnverifiedReport() {
  const game = await startGame();
  await train(game);
  const { action, use, elements } = game;
  use("Radio"); action("Back to the station");
  use("Live terminal"); action("Compose a reply"); action("send that recording");
  action("Send reply"); action("Prepare a signal report");
  assert.match(elements["panel-body"].innerHTML, /Unknown. No voice captured/);
  assert.match(elements["panel-body"].innerHTML, /Not verified by this station/);
}

(async () => {
  await testMovement();
  await testGroundedReport();
  await testOptionalInvestigation();
  await testUnverifiedReport();
  console.log("PASS: movement directions, new floor collisions, receiver comparison, four-act flow, report branches, restart");
})().catch((error) => { console.error(error); process.exitCode = 1; });
