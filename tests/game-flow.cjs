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

async function train(game, tendency = null) {
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
  const choices = Array.isArray(tendency) ? tendency : {
    caution: ["ferry is delayed", "Hold outside", "crew is checking"],
    warmth: ["hard to be left waiting", "unsettling", "in a hurry"],
    confidence: ["ferry should be", "fine to come in", "Go ahead"],
  }[tendency] ?? ["ferry is delayed", "unsettling", "Go ahead"];
  for (const choice of choices) { use("Terminal"); action(choice); action("File this call"); }
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
  action("Stay with Nell"); action("I’ll be here"); action("I’m ECHO-01"); action("End this watch"); assert.equal(title(), "The words you leave behind");
  assert.match(elements["panel-body"].innerHTML, /REPORT · RECEIVED/);
  action("Return to the station");
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
  action("Stay with Nell"); action("I’ll be here"); action("I’m ECHO-01"); action("End this watch");
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
  action("Tell Nell the report arrived"); action("Stay with Nell"); action("I’ll be here"); action("I’m ECHO-01"); action("End this watch");
  assert.equal(title(), "留下的话语");
  action("Return to the station"); key("j");
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
  assert.equal(browserDefault.locale.getLanguage(), "zh-CN", "Chinese browsers default to Chinese on first visit");
  const otherBrowser = await startGame({ browserLanguage: "fr-FR" });
  assert.equal(otherBrowser.locale.getLanguage(), "en", "Other browser languages fall back to English");
}


async function testConsequences() {
  // Exercise the acceptance routes in both languages, including report-first,
  // reply-first, no reply, deferred accountability and post-ending exploration.
  for (const language of ["en-US", "zh-CN"]) {
    for (const route of ["corrected", "insisted", "avoided", "silent", "available", "full"]) {
      const game = await startGame({ browserLanguage: language });
      await train(game);
      const { use, action, elements, t, title } = game;
      const body = () => elements["panel-body"].innerHTML;
      if (route === "full" || route === "insisted") {
        use("Radio"); action("Read tonight’s relay log"); action("Back to the station");
        if (route === "full") {
          use("Archive"); action("Read the receiver"); action("Back to the station");
          use("Live terminal"); action("Check the rescue board"); action("Back to Nell"); action("Look around the station");
        }
        use("Live terminal"); action("Prepare a signal report"); action("Send recording and report");
        action("Tell Nell the report arrived");
        assert.ok(game.hasAction("Compose a reply"), "Report-first leaves the reply choice available");
      } else { use("Live terminal"); }
      if (!["silent", "available"].includes(route)) {
        action("Compose a reply");
        assert.ok(body().includes(t("Draft basis")));
        assert.ok(body().includes(t("Caller feedback · “I liked having something definite to do. ‘Wait for a report’ is hard to work with.”")));
        action(route === "full" ? "The team has the recording" : "I think he’s safe"); action("Send reply");
        if (route !== "full") {
          assert.equal(title(), t("What are you sure of?"));
          if (route === "corrected") {
            action("I need to correct what I said"); action("Back to Nell’s question");
            assert.equal(title(), t("What are you sure of?"), "Unsent correction cannot change Nell’s response");
            action("I need to correct what I said"); action("Send correction");
          }
          if (route === "insisted") { assert.ok(body().includes(t("The team has your recording, but they still say his status is unconfirmed. When you say he’s safe, do you know something they don’t?"))); action("Kestrel came home after"); action("I still think he’s safe"); }
          if (route === "avoided") action("I need a moment before I answer");
        }
      }
      action("Stay with Nell"); action(route === "available" ? "Keep the channel available and end the watch" : "I’ll be here");
      action("I’m ECHO-01"); action("End this watch");
      assert.equal(title(), t("The words you leave behind"));
      const summary = body();
      assert.ok(summary.includes(t(["silent", "available"].includes(route) ? "No answer about his safety was sent." : route === "full" ? "The team has the recording and timestamp. We still don’t know who sent the clicks." : "Three clicks sounds like your dad. I think he’s safe.")));
      if (route === "corrected") assert.ok(summary.includes(t("I need to correct what I said. I don’t know that he’s safe. The clicks don’t establish that.")));
      action("Return to the station");
      use("Radio"); action("Read tonight’s relay log"); action("Back to the station");
      use("Live terminal"); action("Review this shift");
      assert.equal(body(), summary, "Post-ending investigation cannot rewrite the completed shift");
      assert.equal(game.locale.missingTranslations().length, 0, JSON.stringify(game.locale.missingTranslations()));
    }
  }
}


async function testReportSnapshot() {
  const game = await startGame();
  await train(game);
  const { use, action, elements } = game;
  use("Radio"); action("Back to the station");
  use("Live terminal"); action("Prepare a signal report"); action("Send recording and report"); action("Back to the station");
  use("Archive"); action("Read the receiver"); action("Back to the station");
  use("Radio"); action("Read tonight’s relay log"); action("Back to the station");
  use("Live terminal"); action("Stay with Nell"); action("I’ll be here"); action("I’m ECHO-01"); action("End this watch");
  const text = elements["panel-body"].innerHTML;
  assert.match(text, /Attached note: source unknown; no voice captured/);
  assert.match(text, /request the relay coverage log/);
  assert.doesNotMatch(text, /smaller area to check/,
    "Investigation after delivery must not be silently attached to an old report");
}

async function testEpilogueMatrix() {
  const module = new vm.SourceTextModule(fs.readFileSync(path.join(root, "src/data/epilogue.js"), "utf8"));
  await module.link(() => { throw Error("Epilogue must remain independent of UI"); });
  await module.evaluate();
  const game = await startGame({ browserLanguage: "zh-CN" });
  let combinations = 0;
  const searchTexts = new Set(), companyTexts = new Set(), trustTexts = new Set();
  for (const report of [null, { coverage: false }, { coverage: true }]) {
    for (const stayed of [false, true]) {
      for (const reply of [null, "warmth", "caution", "help", "confidence"]) {
        for (const accountability of reply === "confidence" ? ["corrected", "insisted", "avoided"] : [null]) {
          const state = { reportSent: !!report, reportSnapshot: report, stayed, finalReply: reply ? { trait: reply } : null, accountability };
          const ending = module.namespace.epilogue(state);
          for (const text of Object.values(ending)) assert.notEqual(game.t(text), text, "Every epilogue variation has Chinese text");
          searchTexts.add(ending.search); companyTexts.add(ending.company); trustTexts.add(ending.trust);
          // Each consequence responds only to its own axis.
          const opposite = module.namespace.epilogue({ ...state, stayed: !stayed });
          assert.equal(opposite.search, ending.search); assert.equal(opposite.trust, ending.trust);
          assert.notEqual(opposite.company, ending.company);
          combinations++;
        }
      }
    }
  }
  assert.equal(combinations, 42);
  assert.equal(searchTexts.size, 3); assert.equal(companyTexts.size, 2); assert.equal(trustTexts.size, 6);
  assert.equal(game.locale.missingTranslations().length, 0);
}

async function testProvenanceAndPublicNotes() {
  const paths = [
    { tendency: "caution", basis: "Mara’s sample reply · “The ferry is delayed. We don’t have an arrival time yet, but I can call the pier when we get one.”", wrong: "Caller feedback · “I liked having something definite to do. ‘Wait for a report’ is hard to work with.”", pick: "can’t tell from", presence: "I don’t know what would make me someone" },
    { tendency: "warmth", basis: "Caller feedback · “Knowing someone was staying with us would help. It’s hard to sit out here with the radio quiet.”", wrong: "Caller feedback · “I liked having something definite to do. ‘Wait for a report’ is hard to work with.”", pick: "keep the line open", presence: "I’m listening to you" },
    { tendency: "confidence", basis: "Caller feedback · “I liked having something definite to do. ‘Wait for a report’ is hard to work with.”", wrong: "Caller feedback · “Knowing someone was staying with us would help. It’s hard to sit out here with the radio quiet.”", pick: "I think he’s safe", presence: "I’m ECHO-01" },
    { tendency: ["hard to be left waiting", "Hold outside", "in a hurry"], basis: "From your repeated training choices; no approving feedback was recorded for this tendency.", wrong: "Caller feedback · “I liked having something definite to do. ‘Wait for a report’ is hard to work with.”", pick: "keep the line open", presence: "I’m ECHO-01" },
  ];
  for (const language of ["en-US", "zh-CN"]) {
    for (const path of paths) {
      const game = await startGame({ browserLanguage: language });
      await train(game, path.tendency);
      const { use, action, elements, t, title } = game;
      const body = () => elements["panel-body"].innerHTML;
      use("Live terminal"); action("Compose a reply");
      assert.ok(body().includes(t(path.basis)), "Only approving feedback or an explicit habit fallback supplies the basis");
      assert.ok(!body().includes(t(path.wrong)), "Do not quote a disapproving caller as support for the chosen tendency");
      action(path.pick); action("Send reply");
      if (path.tendency === "confidence") { action("I need to correct what I said"); action("Send correction"); }
      action("Stay with Nell"); action("I’ll be here"); action(path.presence);
      const presenceReaction = body();
      elements.dialog.close(); use("Live terminal");
      assert.equal(body(), presenceReaction, "A sent identity answer survives closing the final conversation");
      action("End this watch");
      assert.ok(body().includes(t(path.presence === "I’m ECHO-01" ? "I’m ECHO-01, the station’s response system." : path.presence === "I’m listening to you" ? "I’m listening to you. I can go back over what you said, and change my answer." : "I don’t know what would make me someone. I can tell you what I did tonight.")));
      assert.ok(body().includes(t(path.basis)), "The ending quotes the original basis, not a recomputed one");
      if (path.tendency === "warmth") assert.ok(body().includes(t("Nell heard an offer of company, not an explanation of the signal. Whether you know more about her father remains an open question between you.")));
      const record = body();
      action("After the line · Questions and readings");
      for (const section of ["A voice, or an understanding?", "Whose judgment was it?", "Where would understanding belong?"]) {
        action(section); assert.equal(title(), t(section)); action("Back to the questions");
      }
      action("Readings and how this game works");
      assert.ok(body().includes("https://www.cs.sfu.ca/"));
      assert.ok(body().includes('rel="noopener noreferrer"'));
      action("Back to your shift record"); assert.equal(body(), record, "Reflection notes do not score or change the ending");
      elements.dialog.close(); use("Live terminal"); action("Review this shift"); assert.equal(body(), record);
      assert.equal(game.locale.missingTranslations().length, 0, JSON.stringify(game.locale.missingTranslations()));
      if (path.tendency === "warmth") {
        action("Replay from the beginning"); use("Mara"); assert.equal(title(), t("First night?"));
      } else { action("Return to title"); assert.equal(title(), "Last Light"); }
    }
  }
}

async function testReasonsAndReportAcknowledgment() {
  for (const language of ["en-US", "zh-CN"]) {
    const game = await startGame({ browserLanguage: language });
    await train(game);
    const { use, action, elements, t, title } = game;
    use("Radio"); action("Back to the station");
    use("Live terminal"); action("Compose a reply"); action("I think he’s safe"); action("Send reply");
    action("Those are the three taps he promised");
    const objection = elements["panel-body"].innerHTML;
    elements.dialog.close(); use("Live terminal");
    assert.equal(elements["panel-body"].innerHTML, objection, "Do not lose the objection to a reason already spoken");
    action("I still think he’s safe"); action("Prepare a signal report"); action("Send recording and report");
    action("Tell Nell the report arrived");
    assert.ok(elements["panel-body"].innerHTML.includes(t("They have your recording now. Thank you for sending it. That gives them something to check; it doesn’t tell me yet whether Dad is safe.")),
      "Even an uncorrected assurance must not suppress acknowledgment of report delivery");
    action("Stay with Nell"); action("I’ll be here"); action("I’m listening to you"); action("End this watch");
    assert.equal(title(), t("The words you leave behind"));
    assert.ok(elements["panel-body"].innerHTML.includes(t("Those are the three taps he promised you. That’s why I think it’s him.")));
    assert.ok(elements["panel-body"].innerHTML.includes(t("I still think he’s safe. I’m standing by what I told you.")));
    assert.equal(game.locale.missingTranslations().length, 0, JSON.stringify(game.locale.missingTranslations()));
  }
}

async function testReceiverBeforeLetter() {
  for (const language of ["en-US", "zh-CN"]) {
    const game = await startGame({ browserLanguage: language });
    const { action, use, title, t, elements } = game;
    action("Begin night shift"); use("Mara"); action("I'll take a look");
    use("Radio"); action("Open receiver bench"); action("Send relay ping");
    action("Turn auto-reply on"); action("Send relay ping"); action("Compare with archived tape");
    assert.equal(title(), t("One source tested"));
    assert.ok(!game.hasAction("The skipper must have answered by hand."));
    action("Back to the station");
    use("Archive"); action("Read Nell"); action("Back to the file"); action("Read the receiver");
    assert.ok(game.hasAction("Review your receiver test")); action("Review your receiver test"); action("Return to the station");
    use("Radio"); action("Open receiver bench"); action("Compare with archived tape");
    assert.equal(title(), t("Two sources, one pattern"));
    assert.equal(game.locale.missingTranslations().length, 0, JSON.stringify(game.locale.missingTranslations()));
  }
}

async function testLearningProvenance() {
  const load = async (name) => {
    const module = new vm.SourceTextModule(fs.readFileSync(path.join(root, name), "utf8"));
    await module.link(() => { throw Error("Expected a pure data module"); }); await module.evaluate(); return module.namespace;
  };
  const { learnedRecommendation } = await load("src/core/learning.js");
  const { exercises } = await load("src/data/story.js");
  const state = { instinct: { caution: 5, warmth: 0, confidence: 0 }, lastTrait: "caution", training: [
    { index: 0, trait: "caution", earnedApproval: true },
    { index: 1, trait: "caution", earnedApproval: false },
    { index: 2, trait: "caution", earnedApproval: false },
  ] };
  const result = learnedRecommendation(state, exercises);
  assert.equal(result.sourceIndex, 0); assert.equal(result.basis, exercises[0].feedback);
  assert.equal(result.kind, "approval");
  state.training[0].earnedApproval = false;
  assert.equal(learnedRecommendation(state, exercises).kind, "habit");
}

async function testPhilosophyCatalog() {
  const game = await startGame({ browserLanguage: "zh-CN" });
  const read = async (name) => {
    const module = new vm.SourceTextModule(fs.readFileSync(path.join(root, name), "utf8"));
    await module.link(() => { throw Error("Expected standalone story data"); }); await module.evaluate(); return module.namespace;
  };
  const conversation = await read("src/data/conversation.js");
  const reflection = await read("src/data/reflections.js");
  const messages = [conversation.correctionText, conversation.insistenceText, conversation.deferText, conversation.presenceQuestion,
    ...conversation.assuranceReasons.flatMap(({ text, response }) => [text, response]),
    ...conversation.presenceReplies.flatMap(({ text, response }) => [text, response]),
    reflection.reflectionQuestion, reflection.limits,
    ...reflection.reflections.flatMap(({ title, paragraphs }) => [title, ...paragraphs]),
    ...reflection.readingLinks.map(({ title }) => title)];
  for (const message of messages) {
    assert.notEqual(game.t(message), message, "Missing paired Chinese story text: " + message);
    assert.ok(game.t(message).trim());
  }
  assert.equal(game.locale.missingTranslations().length, 0);
}

(async () => {
  await testMovement();
  await testGroundedReport();
  await testOptionalInvestigation();
  await testUnverifiedReport();
  await testReplySurvivesLaterInvestigation();
  await testInformedCaution();
  await testBilingualShift();
  await testConsequences();
  await testEpilogueMatrix();
  await testReportSnapshot();
  await testLearningProvenance();
  await testProvenanceAndPublicNotes();
  await testReasonsAndReportAcknowledgment();
  await testReceiverBeforeLetter();
  await testPhilosophyCatalog();
  console.log("PASS: bilingual four-act flows, 12 consequence routes, 42 epilogue combinations, truthful provenance, spoken reasons, presence replies, public philosophy notes, immutable history, language, movement, restart");
})().catch((error) => { console.error(error); process.exitCode = 1; });
