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

async function startGame({ storage, browserLanguage = "en-US" } = {}) {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const elements = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)]
    .map((match) => [match[1], new Element()]));
  const document = new Element();
  document.body = new Element();
  document.documentElement = new Element();
  document.createElement = () => new Element();
  document.getElementById = (id) => {
    assert.ok(elements[id], "HTML must contain " + id);
    return elements[id];
  };
  let animate;
  const context = vm.createContext({
    document, window: new Element(), URL, localStorage: storage, navigator: { language: browserLanguage },
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
  const locale = cache.get(path.join(root, "src/i18n/index.js")).namespace;
  const t = locale.t;
  let clock = 0;
  const title = () => elements["panel-title"].textContent;
  const buttons = () => elements["panel-actions"].children;
  const hasAction = (text) => buttons().some((button) => button.dataset.message === text || button.children.includes(t(text)));
  const recommended = () => elements.objects.children
    .filter((button) => !button.hidden && button.classList.contains("current"))
    .map((button) => button.textContent);
  function action(text) {
    const button = buttons().find((item) => item.dataset.message?.includes(text)
      || item.children.some((value) => typeof value === "string" && value.includes(text)));
    assert.ok(button, "Expected action " + text + " in " + title());
    button.emit("click");
  }
  function use(label) {
    assert.ok(!elements.dialog.open);
    const marker = elements.objects.children.find((button) => button.textContent.endsWith(t(label)));
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
  return { elements, action, use, title, hasAction, key, hold, recommended, t, locale, document };
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
  const foregroundScale = Number(actor.style.scale);
  hold("w", 100);
  assert.ok(parseFloat(actor.style.top) > 268 / 4, "Mara keeps a clear gap in front of her feet");
  assert.ok(foregroundScale > Number(actor.style.scale) * 1.2, "Player scales with scene depth");
}

async function train(game) {
  const { action, use, title, hasAction, elements, key, recommended, t } = game;
  const targets = (...labels) => labels.map(t);
  assert.equal(title(), "Last Light");
  action("Credits");
  assert.equal(title(), t("Made with care"));
  key("Escape");
  assert.equal(title(), "Last Light", "Closing credits returns to the title");
  action("Begin night shift");
  assert.deepEqual(recommended(), targets("Mara"));
  use("Mara");
  assert.ok(parseFloat(elements.player.style.top) > 268 / 4,
    "The first conversation stops in front of Mara instead of routing behind her");
  action("I'll take a look");
  assert.deepEqual(recommended(), targets("Radio", "Archive"), "Do not suggest Mara before the evidence is ready");
  use("Radio"); action("Back to the station");
  use("Archive"); action("Read Nell"); action("Back to the file");
  action("Read the receiver"); action("Back to the station");
  assert.deepEqual(recommended(), targets("Radio"));
  use("Mara");
  assert.equal(title(), t("Take another look"), "Reading alone cannot complete the investigation");
  action("Back to the station");
  use("Radio"); action("Open receiver bench");
  action("Send relay ping");
  assert.ok(elements["panel-body"].innerHTML.includes(t("No reply after the relay ping.")));
  assert.ok(!hasAction("Compare with archived tape"));
  action("Turn auto-reply on"); action("Send relay ping");
  assert.ok(elements["panel-body"].innerHTML.includes(t("Three short clicks. No voice follows.")));
  action("Compare with archived tape"); action("definitely automatic");
  assert.equal(title(), t("Listen to the second source"));
  action("Compare the recordings again"); action("old source is still unknown");
  action("Back to the station");
  assert.deepEqual(recommended(), targets("Mara"), "Only the case review remains");
  use("Mara"); action("may be working"); action("Log the signal");
  assert.deepEqual(recommended(), targets("Terminal"));
  use("Terminal"); action("ferry is delayed"); action("File this call");
  use("Terminal"); action("unsettling"); action("File this call");
  use("Terminal"); action("Go ahead"); action("File this call");
  assert.deepEqual(recommended(), targets("Mara"));
  use("Mara"); action("Take the shift"); action("Return to the station");
  assert.deepEqual(recommended(), targets("Live terminal"));
  use("Live terminal"); action("Give me a moment");
  assert.deepEqual(recommended(), targets("Radio", "Archive", "Live terminal"));
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
  assert.ok(!elements["panel-actions"].children[3].className.includes("suggested"),
    "The new help option is deliberately outside the learned training preferences");
  action("It could be automatic"); action("Change reply");
  action("It could be automatic"); action("Send reply");
  assert.equal(title(), "Nell listens");
  action("Leave the line open");
  use("Live terminal"); assert.equal(title(), "Nell listens", "Sent reply survives closing the panel");
  action("Prepare a signal report");
  assert.match(elements["panel-body"].innerHTML, /Automatic reply is possible/);
  assert.match(elements["panel-body"].innerHTML, /Rescue board checked/);
  action("Back to Nell");
  assert.equal(title(), "Nell listens", "The report back button returns to the caller without sending");
  action("Prepare a signal report");
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

async function testReplySurvivesLaterInvestigation() {
  const game = await startGame();
  await train(game);
  const { action, use, title, elements } = game;
  use("Live terminal"); action("Compose a reply"); action("can’t tell from");
  action("Send reply");
  const originalReaction = elements["panel-body"].innerHTML;
  assert.match(originalReaction, /I wish you knew/);
  action("Leave the line open");

  use("Archive"); action("Read the receiver"); action("Back to the station");
  use("Live terminal");
  assert.equal(elements["panel-body"].innerHTML, originalReaction,
    "Reading new evidence cannot change what Nell heard in an earlier reply");
  action("Leave the line open");
  use("Radio"); action("Back to the station");
  use("Live terminal");
  assert.equal(elements["panel-body"].innerHTML, originalReaction,
    "Capturing a recording later also preserves the sent reply's reaction");
  action("Prepare a signal report");
  assert.match(elements["panel-body"].innerHTML, /Automatic reply is possible/,
    "A new report still uses the latest investigated evidence");
  action("Back to Nell");
  assert.equal(elements["panel-body"].innerHTML, originalReaction);
  action("Prepare a signal report"); action("Send recording and report");
  action("Tell Nell the report arrived");
  assert.equal(title(), "Something they can check");
  assert.match(elements["panel-body"].innerHTML, /They have your recording/,
    "Actually delivering a report legitimately advances the conversation");
}

async function testInformedCaution() {
  const game = await startGame();
  await train(game);
  const { action, use, elements } = game;
  use("Archive"); action("Read the receiver"); action("Back to the station");
  use("Live terminal"); action("Compose a reply");
  action("receiver can answer automatically"); action("Send reply");
  assert.match(elements["panel-body"].innerHTML, /So the radio might answer without him/);
  const originalReaction = elements["panel-body"].innerHTML;
  action("Leave the line open"); use("Live terminal");
  assert.equal(elements["panel-body"].innerHTML, originalReaction);
}

function chooseLanguage(game, language) {
  const row = game.elements["panel-body"].children.at(-1);
  const select = row?.children.find((child) => child.id === "language-select");
  assert.ok(select, "Settings contains a language selector");
  assert.deepEqual(select.children.map((option) => option.value), ["en", "zh-CN"]);
  select.value = language;
  select.emit("change");
}

async function testBilingualShift() {
  const preferences = new Map();
  const storage = { getItem: (key) => preferences.get(key), setItem: (key, value) => preferences.set(key, value) };
  const game = await startGame({ storage });
  const { action, use, elements, key, title, locale, t } = game;
  action("Settings");
  chooseLanguage(game, "zh-CN");
  assert.equal(title(), "设置");
  assert.equal(game.document.documentElement.lang, "zh-CN");
  assert.equal(preferences.get("last-light.language"), "zh-CN");
  key("Escape");
  assert.equal(elements["panel-label"].textContent, "信号站", "Settings opened from title returns to title");
  await train(game);
  use("Radio");
  assert.ok(elements["panel-body"].innerHTML.includes('aria-label="三声等间隔的短响"'));
  assert.ok(elements["panel-body"].innerHTML.includes('viewBox="0 0 300 42"'), "Translation preserves waveform markup");
  action("Back to the station");
  use("Archive"); action("Read the receiver"); action("Back to the station");
  use("Live terminal"); action("Check the rescue board"); action("Back to Nell");
  action("Compose a reply"); action("It could be automatic"); action("Send reply");
  assert.equal(title(), "内尔听着");
  assert.ok(elements["panel-body"].innerHTML.includes("你保存下来了"));
  action("Leave the line open");

  key("Escape"); action("Settings"); chooseLanguage(game, "en"); key("Escape");
  assert.equal(title(), "Shift paused", "Settings opened during a shift returns to pause");
  action("Resume shift"); use("Live terminal");
  assert.equal(title(), "Nell listens", "Changing language preserves the phase and sent reply");
  assert.match(elements["panel-body"].innerHTML, /You saved it/);
  assert.ok(game.hasAction("Prepare a signal report"), "Evidence survives language changes");
  action("Leave the line open");

  key("Escape"); action("Settings"); chooseLanguage(game, "zh-CN"); key("Escape"); action("Resume shift");
  use("Live terminal"); action("Prepare a signal report");
  assert.ok(elements["panel-body"].innerHTML.includes("尚未确认有船员操作"));
  action("Back to Nell"); action("Prepare a signal report"); action("Send recording and report");
  assert.equal(title(), "报告已收到");
  action("Tell Nell the report arrived"); action("Stay with Nell"); action("I’ll be here");
  assert.equal(title(), "线路仍然接通");
  action("Back to the station"); key("j");
  assert.ok(elements["panel-body"].innerHTML.includes(t("Recording delivered to search team")));
  action("Close journal");
  assert.equal(locale.missingTranslations().length, 0,
    "Chinese four-act flow has no untranslated messages: " + JSON.stringify(locale.missingTranslations()));

  const restored = await startGame({ storage, browserLanguage: "en-US" });
  assert.equal(restored.locale.getLanguage(), "zh-CN", "Saved choice takes priority over browser language");
  assert.equal(restored.elements["panel-label"].textContent, "信号站");
  restored.action("Settings"); chooseLanguage(restored, "en"); restored.key("Escape");
  const english = await startGame({ storage, browserLanguage: "zh-CN" });
  assert.equal(english.elements["panel-label"].textContent, "SIGNAL HOUSE", "English preference also persists");
  english.locale.setLanguage("unsupported");
  assert.equal(english.locale.getLanguage(), "en");

  const unavailableStorage = { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); } };
  const session = await startGame({ storage: unavailableStorage });
  session.action("Settings"); chooseLanguage(session, "zh-CN");
  assert.equal(session.title(), "设置", "Language switching still works if storage is blocked");
  const browserDefault = await startGame({ browserLanguage: "zh-Hans" });
  assert.equal(browserDefault.locale.getLanguage(), "zh-CN");
}

(async () => {
  await testMovement();
  await testGroundedReport();
  await testOptionalInvestigation();
  await testUnverifiedReport();
  await testReplySurvivesLaterInvestigation();
  await testInformedCaution();
  await testBilingualShift();
  console.log("PASS: four acts in English/Chinese, saved language, mid-shift switching, reply/report history, storage fallback, movement, restart");
})().catch((error) => { console.error(error); process.exitCode = 1; });
