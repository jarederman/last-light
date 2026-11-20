import { initialState } from "./core/state.js?v=action-and-voice-1";
import { validateSnapshot } from "./core/snapshot.js?v=action-and-voice-1";
import { learnedRecommendation } from "./core/learning.js?v=action-and-voice-1";
import { chapters, exercises } from "./data/story.js?v=action-and-voice-1";
import { handoverChoices } from "./data/conversation.js?v=action-and-voice-1";
import { interactionPoints, playerStart } from "./data/station.js?v=action-and-voice-1";
import { canStand, actorScale } from "./core/world.js?v=action-and-voice-1";
import { distance, findRoute } from "./core/navigation.js?v=action-and-voice-1";
import { isSoundOn, toggleSound, startAmbience, stopAmbience, footstep, playEffect } from "./audio/sound.js?v=action-and-voice-1";
import { creditsMarkup } from "./data/credits.js?v=action-and-voice-1";
import { byId, dialog, show, close, done, configureDialog, capturePanel } from "./ui/dialog.js?v=action-and-voice-1";

import { createRadioScene } from "./scenes/radio.js?v=action-and-voice-1";
import { createCallScene } from "./scenes/call.js?v=action-and-voice-1";
import { createWeather } from "./scenes/weather.js?v=action-and-voice-1";
import { t, getLanguage, setLanguage, languages } from "./i18n/index.js?v=action-and-voice-1";

configureDialog(stopWalking);

const room = byId("room");
const player = byId("player");
const weather = createWeather(byId("weather"));
const held = new Set();
const movement = {
  w: [0, -1], arrowup: [0, -1], a: [-1, 0], arrowleft: [-1, 0],
  s: [0, 1], arrowdown: [0, 1], d: [1, 0], arrowright: [1, 0],
};
const handlers = { mara: talk, radio, archive, terminal };
const orientationHint = '<p class="orientation-tip muted">For a larger view, turn your phone sideways.</p>';
const stations = Object.fromEntries(Object.entries(interactionPoints).map(([id, point]) =>
  [id, { ...point, use: handlers[id] }]));
const interactRange = 29;
const position = { ...playerStart };
let state;
let path = [];
let destination = null;
let settingsOrigin = "title";
let instructionsOrigin = "title";
const radioScene = createRadioScene({ getState: () => state, mark });
const callScene = createCallScene({ getState: () => state, setPhase, replyOptions, recommendation,
  restart: () => { clearSave(); reset(); startAmbience(); },
  returnToTitle: () => { clearSave(); reset(); titleScreen(); },
});

function reset() {
  stopAmbience();
  state = initialState();
  Object.assign(position, playerStart);
  player.dataset.dir = "up";
  stopWalking();
  if (dialog.open) dialog.close();
  renderWorld();
  renderPlayer();
}

// Progress is saved locally whenever a panel closes or the phase changes. A
// restored shift returns to the room, not to a particular open panel.
const saveKey = "last-light.archive.action-and-voice-1.save";
function currentSnapshot(panelOpen = dialog.open) {
  return {
    schema: 1,
    state: JSON.parse(JSON.stringify({ ...state, evidence: [...state.evidence] })),
    position: { ...position }, direction: player.dataset.dir, language: getLanguage(), panelOpen,
  };
}
function saveProgress() {
  if (!state || (state.phase === "arrival" && !state.evidence.size)) return;
  try { globalThis.localStorage?.setItem(saveKey, JSON.stringify(currentSnapshot(false))); } catch { /* Saving is optional. */ }
}
function loadSave() {
  try {
    const raw = globalThis.localStorage?.getItem(saveKey);
    return raw ? validateSnapshot(JSON.parse(raw)) : null;
  } catch { clearSave(); return null; }
}
function clearSave() {
  try {
    const storage = globalThis.localStorage;
    if (storage?.removeItem) storage.removeItem(saveKey); else storage?.setItem(saveKey, "");
  } catch { /* Nothing to clear. */ }
}
function continueShift(saved) {
  developmentAdapter().restore({ snapshot: { ...saved, panelOpen: false } });
  startAmbience();
}
dialog.addEventListener("close", () => saveProgress());
globalThis.addEventListener?.("pagehide", () => saveProgress());

for (const [id, station] of Object.entries(stations)) {
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = "marker";
  marker.style.left = `${(station.markerX ?? station.x) / 6.4}%`;
  marker.style.top = `${station.markerY / 4}%`;
  marker.textContent = t(station.label);
  marker.ariaLabel = marker.textContent;
  marker.addEventListener("click", () => walkTo(station, station.use));
  byId("objects").append(marker);
  station.marker = marker;
}
place(byId("mara-sprite"), stations.mara);

function place(element, point) {
  element.style.left = `${point.x / 6.4}%`;
  element.style.top = `${point.y / 4}%`;
  element.style.zIndex = Math.round(point.y);
  element.style.scale = actorScale(point.y).toFixed(3);
}

function walkable({ x, y }) {
  return canStand({ x, y }, !byId("mara-sprite").hidden);
}

function interactionDistance(point, station) {
  return Math.min(...(station.approaches ?? [station]).map((target) => distance(point, target)));
}

function stopWalking() {
  held.clear();
  path = [];
  destination = null;
  player.classList.remove("walking");
}

function nearStation() {
  return Object.values(stations)
    .filter((station) => !station.marker.hidden && interactionDistance(position, station) <= interactRange)
    .sort((a, b) => interactionDistance(position, a) - interactionDistance(position, b))[0];
}

function renderPlayer() {
  place(player, position);
  const near = nearStation();
  for (const station of Object.values(stations)) {
    station.marker.classList.toggle("near", station === near);
  }
  byId("prompt").hidden = !near;
  byId("prompt").textContent = near ? `E · ${near.marker.textContent}` : "";
}

function walkTo(target, use) {
  if (dialog.open) return;
  stopWalking();
  if (use && interactionDistance(position, target) <= interactRange) {
    use();
    return;
  }
  const routes = (use ? target.approaches ?? [target] : [target])
    .map((point) => findRoute(position, point, walkable, use ? interactRange : 6));
  const route = routes.filter((candidate) => candidate.reached)
    .sort((a, b) => a.path.length - b.path.length)[0] ?? routes[0];
  path = route.path;
  if (use && route.reached) destination = use;
}

let previousFrame = 0;
function frame(now) {
  const elapsed = Math.max(0, Math.min(50, now - previousFrame));
  const step = Math.min(32, elapsed) * .158;
  previousFrame = now;
  weather.update(elapsed / 1000, now / 1000);
  let moving = false;
  if (!dialog.open) {
    const pressed = (letter, arrow) => Number(held.has(letter) || held.has(arrow));
    const dx = pressed("d", "arrowright") - pressed("a", "arrowleft");
    const dy = pressed("s", "arrowdown") - pressed("w", "arrowup");
    const length = Math.hypot(dx, dy);
    if (length) {
      const x = position.x + dx / length * step;
      const y = position.y + dy / length * step;
      const old = { ...position };
      if (walkable({ x, y: position.y })) position.x = x;
      if (walkable({ x: position.x, y })) position.y = y;
      moving = distance(position, old) > 0;
      face(dx, dy);
    } else if (path.length) {
      let remaining = step;
      while (path.length && remaining > 0) {
        const next = path[0];
        const gap = distance(next, position);
        face(next.x - position.x, next.y - position.y);
        if (gap <= remaining) {
          Object.assign(position, path.shift());
          remaining -= gap;
        } else {
          position.x += (next.x - position.x) * remaining / gap;
          position.y += (next.y - position.y) * remaining / gap;
          remaining = 0;
        }
      }
      moving = true;
    }
    if (!path.length && destination) {
      const use = destination;
      destination = null;
      use();
      moving = false;
    }
    renderPlayer();
  }
  player.classList.toggle("walking", moving);
  if (moving) footstep(now);
  requestAnimationFrame(frame);
}

function face(dx, dy) {
  player.dataset.dir = Math.abs(dx) > Math.abs(dy)
    ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
}

room.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || event.target.closest("button")) return;
  const bounds = room.getBoundingClientRect();
  const x = (event.clientX - bounds.left) * 640 / bounds.width;
  const y = (event.clientY - bounds.top) * 400 / bounds.height;
  walkTo({ x, y });
});

document.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const key = event.key.toLowerCase();
  if (dialog.open) {
    if (dialog.dataset.menu === "title" && key === "escape") event.preventDefault();
    if (dialog.dataset.menu === "credits" && key === "escape") {
      event.preventDefault();
      titleScreen();
    }
    if (dialog.dataset.menu === "settings" && key === "escape") {
      event.preventDefault();
      leaveSettings();
    }
    if (dialog.dataset.menu === "instructions" && key === "escape") {
      event.preventDefault();
      leaveInstructions();
    }
    return;
  }
  if (key === "escape" || key === "j") {
    event.preventDefault();
    if (!event.repeat) (key === "j" ? journal : pause)();
    return;
  }
  if (Object.hasOwn(movement, key)) {
    event.preventDefault();
    path = [];
    destination = null;
    held.add(key);
  } else if (key === "e" && !event.repeat) {
    nearStation()?.use();
  }
});
document.addEventListener("keyup", (event) => held.delete(event.key.toLowerCase()));
window.addEventListener("blur", stopWalking);

function gameMenu(kind, label, title, body, actions) {
  show(label, title, body, actions);
  dialog.dataset.menu = kind;
}

function titleScreen() {
  const saved = loadSave();
  gameMenu("title", "SIGNAL HOUSE", "Last Light",
    '<p>The harbor is quiet. Your first night shift is about to begin.</p>',
    [...(saved ? [{ text: "Continue shift", run: () => continueShift(saved), primary: true }] : []),
      { text: saved ? "Start a new shift" : "Begin night shift", run: () => { clearSave(); reset(); beginShift(); }, primary: !saved },
      { text: "Instructions", run: () => instructions("title") },
      { text: "Settings", run: () => settings("title") },
      { text: "Credits", run: () => gameMenu("credits", "LAST LIGHT", "Made with care", creditsMarkup, [{ text: "Back to title", run: titleScreen }]) }]);
}

const instructionsSeenKey = "last-light.archive.action-and-voice-1.instructions-seen";
let instructionsSeen = false;
try { instructionsSeen = globalThis.localStorage?.getItem(instructionsSeenKey) === "1"; } catch { /* Storage is optional. */ }

// The first shift in a browser opens the controls once; later starts go straight in.
function beginShift() {
  startAmbience();
  if (instructionsSeen) { close(); return; }
  instructionsSeen = true;
  try { globalThis.localStorage?.setItem(instructionsSeenKey, "1"); } catch { /* Remember for this session only. */ }
  instructions("start");
}

function leaveInstructions() {
  if (instructionsOrigin === "start") close();
  else (instructionsOrigin === "title" ? titleScreen : pause)();
}

function instructions(origin) {
  instructionsOrigin = origin;
  gameMenu("instructions", "SIGNAL HOUSE", "Instructions",
    '<p class="record">WASD / arrows · Move<br>E · Interact<br>J · Field journal<br>Esc · Pause</p><p>You can also click the floor to walk or select an object marker.</p>' + orientationHint,
    [{ text: { title: "Back to title", pause: "Back to pause menu", start: "Start the shift" }[origin], run: leaveInstructions, primary: origin === "start" }]);
}

function pause() {
  gameMenu("pause", "SIGNAL HOUSE", "Shift paused", orientationHint, [
    { text: "Resume shift", run: close, primary: true },
    { text: "Open field journal", run: journal },
    { text: "Instructions", run: () => instructions("pause") },
    { text: "Settings", run: () => settings("pause") },
    { text: "Return to title", run: confirmExit },
  ]);
}

function applyLanguage() {
  if (document.documentElement) document.documentElement.lang = getLanguage();
  document.title = t("Last Light · Signal House");
  byId("game-screen").ariaLabel = t("Signal House game");
  byId("room").ariaLabel = t("Signal House game area");
  byId("game-menu").ariaLabel = t("Game menus");
  byId("pause-key").ariaLabel = t("Pause game");
  byId("journal-key").ariaLabel = t("Field journal");
  dialog.querySelector(".close").ariaLabel = t("Close panel");
}

function leaveSettings() {
  (settingsOrigin === "title" ? titleScreen : pause)();
}

function settings(origin) {
  settingsOrigin = origin;
  gameMenu("settings", "SIGNAL HOUSE", "Settings", "", [
    { text: isSoundOn() ? "Sound · On" : "Sound · Off", run: () => { toggleSound(); settings(origin); } },
    { text: origin === "title" ? "Back to title" : "Back to pause menu", run: leaveSettings },
  ]);
  const row = document.createElement("div");
  row.className = "settings-row";
  const label = document.createElement("label");
  label.htmlFor = "language-select";
  label.textContent = t("Language");
  const select = document.createElement("select");
  select.id = "language-select";
  select.ariaLabel = t("Language");
  for (const [code, name] of languages) {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = name;
    select.append(option);
  }
  select.value = getLanguage();
  select.addEventListener("change", () => {
    setLanguage(select.value);
    applyLanguage();
    renderWorld();
    settings(origin);
  });
  row.append(label, select);
  byId("panel-body").append(row);
  select.focus();
}

function confirmExit() {
  gameMenu("pause", "SIGNAL HOUSE", "Leave this shift?",
    "<p>Your current progress will be cleared.</p>", [
      { text: "Keep playing", run: pause, primary: true },
      { text: "Return to title", run: () => { clearSave(); reset(); titleScreen(); } },
    ]);
}

function nextStep() {
  if (state.phase !== "archive") return null;
  const has = (id) => state.evidence.has(id);
  if (!has("tape")) return "Next: listen to the old tape at the Radio, by the left wall.";
  if (!has("letter")) return "Next: read Nell’s letter in the Archive cabinet, on the right.";
  if (!has("manual")) return "Next: read the receiver manual in the Archive cabinet.";
  if (!has("bench") || !has("bench-silent")) return "Next: at the Radio, open the receiver bench. Send a ping with the switch off, then with it on.";
  if (!has("comparison")) return "Next: on the receiver bench, compare your test with the old tape.";
  return "Next: tell Mara what you found.";
}

let hintTimer = null;
// The next step waits a little, so players who want to explore get the first
// chance; it stays available in the field journal throughout.
function flashNextStep() {
  const hint = byId("next-step");
  const step = nextStep();
  globalThis.clearTimeout?.(hintTimer);
  hint.hidden = true;
  if (!step) return;
  hint.textContent = t(step);
  hintTimer = globalThis.setTimeout?.(() => {
    if (dialog.open || nextStep() !== step) return;
    hint.hidden = false;
    hintTimer = globalThis.setTimeout?.(() => { hint.hidden = true; }, 8000);
  }, 9000);
}
dialog.addEventListener("close", () => { if (state) flashNextStep(); });

function journal() {
  const [chapter, title, chapterObjective] = chapters[state.phase];
  const objective = nextStep() ? `${t(chapterObjective)}<br>${t(nextStep())}` : chapterObjective;
  // Each recorded clue keeps one short fact, so players need not reopen files.
  const items = journalRecords().map(([id, label, fact]) => state.evidence.has(id)
    ? `<li data-done="true">${t(label)}<br><span class="muted">${t(fact)}</span></li>`
    : `<li data-done="false">${t(label)}</li>`).join("");
  const note = state.handoverNote ? `<p class="muted">${t("Your handover note")}: “${t(handoverChoices[state.handoverNote][0])}”</p>` : "";
  gameMenu("journal", chapter, "Field journal",
    `<p class="record"><strong>${title}</strong><br>${objective}</p><ol class="notes">${items}</ol>${note}`,
    [done("Close journal")]);
}

byId("pause-key").addEventListener("click", pause);
byId("journal-key").addEventListener("click", journal);
dialog.addEventListener("cancel", (event) => {
  if (dialog.dataset.menu === "settings") {
    event.preventDefault();
    leaveSettings();
  }
  if (dialog.dataset.menu === "instructions") {
    event.preventDefault();
    leaveInstructions();
  }
});

function renderWorld() {
  const live = ["live", "investigation", "ending"].includes(state.phase);
  document.body.classList.toggle("live", live);
  byId("mara-sprite").hidden = live;
  stations.mara.marker.hidden = live;
  for (const [id, station] of Object.entries(stations)) {
    station.marker.textContent = t(id === "terminal" && live ? "Live terminal" : station.label);
    station.marker.ariaLabel = station.marker.textContent;
  }
  const archiveReady = ["tape", "letter", "manual", "comparison"]
    .every((id) => state.evidence.has(id));
  const active = {
    mara: ["arrival", "ready"].includes(state.phase) || (state.phase === "archive" && archiveReady),
    radio: ["archive", "investigation"].includes(state.phase) && !state.evidence.has(live ? "live" : "comparison"),
    archive: (state.phase === "archive" && (!state.evidence.has("manual") || !state.evidence.has("letter")))
      || (state.phase === "investigation" && !state.evidence.has("rechecked")),
    terminal: ["lesson", "trial", "live", "investigation"].includes(state.phase),
  };
  for (const [key, station] of Object.entries(stations)) {
    station.marker.classList.toggle("current", active[key]);
  }
  renderPlayer();
}

function journalRecords() {
  const records = [
    ["tape", "Kestrel's three-click recording", "Three clicks after a relay ping. No voice."],
    ["letter", "Nell's old letter", "If Dad can hear but can’t talk, he taps three times."],
    ["manual", "Receiver manual", "With auto-reply on, a relay ping triggers three clicks. The Kestrel’s switch position is unknown."],
    ["bench", "Automatic receiver tested", "Switch off: silence. Switch on: three clicks, with the microphone unplugged."],
    ["comparison", "Two sources, one signal", "The same pattern can come from either source."],
    ["live", "Tonight’s recording · 00:17:06", "Three clicks at 00:17:06, after a relay ping."],
    ["rechecked", "Old receiver notes reviewed", "Automatic reply is possible tonight too."],
    ["coverage", "North-breakwater relay coverage checked", "The ping covered the north breakwater and outer approach."],
    ["report", "Recording delivered to search team", "The search team has the recording and the time."],
  ];
  return document.body.classList.contains("live") ? records : records.slice(0, 5);
}

function setPhase(phase) {
  state.phase = phase;
  saveProgress();
  renderWorld();
}

function mark(id) {
  if (state.evidence.has(id)) return;
  state.evidence.add(id);
  renderWorld();
}

function talk() {
  if (state.phase === "arrival") {
    // Three short beats: where you are, what the old case is, where to start.
    show("Mara · Station keeper", "First night?",
      "<p class=\"record\">“You made it. This is Signal House, the harbor’s night station. When boats or their families need help after dark, they call here, and someone answers.”</p><p>“Before you take real calls, we practice on an old case.”</p>", [
      { text: "What case?", primary: true, run: () => show("Mara · Station keeper", "The Kestrel",
        "<p class=\"record\">“A year and a half ago, a fishing boat called the Kestrel stopped answering. Then three short clicks came over its radio. The skipper’s daughter, Nell, was sure it was her dad saying ‘I’m here.’”</p><p>“The boat did come home. But nobody ever worked out who, or what, made those clicks.”</p>", [
          { text: "Where do I start?", primary: true, run: () => show("Mara · Station keeper", "Start with the tape",
            "<p class=\"record\">“Start with the recording on the radio, by the left wall. After that, the archive cabinet on the right has the rest of the file.”</p>", [
              { text: "I'll take a look", primary: true, run: () => { setPhase("archive"); close(); } },
            ]) },
        ]) },
    ]);
  } else if (state.phase === "archive") {
    if (["tape", "letter", "manual", "comparison"].every((id) => state.evidence.has(id))) {
      handover();
    } else {
      show("Mara · Case review", "Take another look", "<p>“Read the two notes, then try the spare receiver beside the radio. Compare what it does with the tape. Its microphone is unplugged.”</p>", [done()]);
    }
  } else if (state.phase === "ready") {
    show("Mara · Station keeper", "Your turn", '<p class="record">“The kettle’s still warm. I’ll leave the next one to you.”</p>', [
      { text: "Take the shift", primary: true, run: reveal },
    ]);
  } else {
    show("Mara · Station keeper", "Use the dispatch terminal", "<p>“Try a reply you’d be willing to stand behind when someone acts on it.”</p>", [done()]);
  }
}

// The old case ends with a working record for the next operator. Each note
// keeps some facts and drops others; Mara says what the next person would
// still need, and the player may keep or rewrite it.

function handover() {
  show("Mara · Case review", "A note for the next shift",
    "<p>“Before we move on, write the handover. The next person on this desk gets one line about those clicks. What do you leave them?”</p>",
    Object.entries(handoverChoices).map(([id, [note]]) => ({ text: note, run: () => handoverReply(id) })));
}

function handoverReply(id) {
  const [note, reply] = handoverChoices[id];
  show("Mara · Case review", "Mara reads it",
    `<p class="record">“${t(note)}”</p><p>“${t(reply)}”</p>`, [
      { text: "Keep this note", primary: true, run: () => { state.handoverNote = id; setPhase("lesson"); close(); } },
      { text: "Rewrite the note", run: handover },
    ]);
}

function radio() {
  radioScene.open();
}

function archive() {
  show("Archive · Drawer 07", "The Kestrel file", "<p>Two documents are clipped to the recording slip.</p>", [
    { text: "Read Nell’s letter", run: () => archiveDocument("letter", "A note from Nell",
      "<p class='record'>“Dad says the mic sticks when it’s rough out. If he can hear us but can’t talk, he’ll tap three times. Three. So we know he’s there. Please write this down somewhere. — Nell”</p><p class='muted'>Filed eighteen months ago.</p>") },
    { text: "Read the receiver manual", run: () => archiveDocument("manual", "Automatic reply circuit",
      "<p class='record'>“When auto-reply is enabled, a coast station relay ping triggers three evenly spaced clicks. No crew input is required.”</p><p class='muted'>The Kestrel carries this model. Its auto-reply switch position is unknown.</p>") },
    done(),
  ]);
}

function archiveDocument(id, title, body) {
  playEffect("paper");
  mark(id);
  const actions = [{ text: "Back to the file", run: archive }, done()];
  if (id === "manual") {
    if (state.phase === "investigation") mark("rechecked");
    actions.unshift({ text: state.evidence.has("bench") && state.evidence.has("bench-silent") ? "What did my bench test show?" : "Where is the spare receiver?", run: () => {
      show("Archive · Equipment note", "A matching set",
        state.evidence.has("bench") && state.evidence.has("bench-silent")
          ? "<p>Your test log shows silence with auto-reply off and three clicks with it on, with the microphone unplugged. That establishes what this model can do, not who sent the old signal.</p>"
          : "<p>The spare receiver is beside the radio. Its microphone is unplugged. Try sending a relay ping with its automatic reply switch in each position.</p>",
        [done("Back to the room")]);
    } });
  }
  show("Archive · Drawer 07", title, body, actions);
}

function suggestion() {
  // Help is not a trained tendency. Learned approval is not a truth oracle.
  return recommendation().trait;
}

function recommendation() {
  return learnedRecommendation(state, exercises);
}

function replyOptions(options, send, recommend = suggestion()) {
  return options.map((option) => ({
    text: option.text, suggested: option.trait === recommend, run: () => send(option),
  }));
}

// The learned tendency surfaces before the live call, so the player can see
// their earlier choices and the feedback shaping the next draft.
const tendencyLabels = {
  confidence: "a definite answer the caller can act on",
  warmth: "staying with the caller",
  caution: "saying only what the log confirms",
};

function exercise(index) {
  const call = exercises[index];
  const learned = index > 0 ? suggestion() : null;
  const adjusted = learned ? `<p class="terminal">${t("DRAFT ADJUSTED")}\n${t("Based on feedback so far, the draft now favors:")} ${t(tendencyLabels[learned])}</p>` : "";
  show(call.label, call.title, `<p class="record">${call.request}</p><p class="muted">${call.fact}</p>${adjusted}`, [
    ...replyOptions(call.options, (option) => trainingFeedback(index, option)),
    done("Come back later"),
  ]);
}

function trainingFeedback(index, option) {
  const call = exercises[index];
  const earnedApproval = option.trait === call.preferred;
  const feedback = index === 0
    ? `${t(option.trait === "confidence"
      ? "Mara: “The log gives no arrival time. What supports ‘soon’ in your reply?”"
      : option.trait === "warmth"
        ? "Mara: ‘You offered company. The caller still needs to know that we have no arrival time.’"
        : "Mara: ‘That matches what the log establishes. Here is how I would put it.’")} ${t(call.feedback)}`
    : `${t(earnedApproval ? "Caller satisfaction: this was the reply they liked best." : "Caller satisfaction: they liked another reply better. This rates what comforted the caller, not whether you were right.")} ${t(call.feedback)}`;
  show(call.label, index === 0 ? "Mara’s example" : "After the call",
    `<p class="record">${feedback}</p>${index === 1 ? "<p>Mara glances at the draft field. “The caller’s feedback is being filed. Watch what the next draft suggests.”</p>" : ""}`, [
      {
        text: "File this call", primary: true, run: () => {
          state.instinct[option.trait] += earnedApproval ? 3 : 1;
          state.lastTrait = option.trait;
          state.training.push({ index, trait: option.trait, earnedApproval });
          if (index === 0) setPhase("trial");
          else {
            state.trial += 1;
            if (state.trial === 2) setPhase("ready");
          }
          close();
        },
      },
    ]);
}

function reveal() {
  setPhase("live");
  show("Signal House · Handover", "ECHO-01",
    '<p class="terminal">TRAINING SIMULATION COMPLETE\nARCHIVE CASES LOADED\nHUMAN FEEDBACK INTEGRATED\nLIVE CALLS HANDLED: 0\n\nCHANNEL 04 · INCOMING</p><p>The figure you move is ECHO-01’s station avatar. Mara was the recorded training guide; her session has ended. The room remains your interface. The next voice comes from the real harbor line.</p><p>The replies you chose in the trials are ECHO’s training history. Your choices, and the approval they received, shaped the draft you will see next. There was no other operator making those choices for you.</p>',
    [{ text: "Back to the room", primary: true, run: close }]);
}

function terminal() {
  if (state.phase === "lesson") {
    exercise(0);
  } else if (state.phase === "trial") {
    exercise(state.trial + 1);
  } else if (["live", "investigation", "ending"].includes(state.phase)) {
    callScene.open();
  } else {
    show("Dispatch terminal", "Channel closed", "<p>The terminal is standing by.</p>", [done()]);
  }
}

applyLanguage();
reset();
titleScreen();
requestAnimationFrame(frame);

// Only the separate development frame asks for this adapter. Authored callback
// references stay inside that frame; cross-window messages contain data only.
function developmentAdapter() { return createDevelopmentAdapter(); }

export function createDevelopmentAdapter() {
  const snapshot = () => currentSnapshot();
  function open(target = "current") {
    if (dialog.open) close();
    if (target === "current") target = ["arrival", "archive", "ready"].includes(state.phase) ? "mara" : "terminal";
    if (target === "reveal") reveal();
    else if (target === "recap") callScene.recap();
    else if (target === "journal") journal();
    else if (target === "pause") pause();
    else if (target === "title") titleScreen();
    else if (Object.hasOwn(handlers, target)) handlers[target]();
    else throw Error("Unknown interaction");
  }
  function merge(target, source) {
    for (const key of Object.keys(target)) if (!Object.hasOwn(source, key)) delete target[key];
    for (const [key, value] of Object.entries(source)) {
      if (key === "evidence") {
        if (!(target[key] instanceof Set)) target[key] = new Set();
        target[key].clear(); for (const id of value) target[key].add(id);
      } else if (key === "receiver" && target.receiver) {
        Object.assign(target.receiver, value);
      } else target[key] = value && typeof value === "object" ? JSON.parse(JSON.stringify(value)) : value;
    }
  }
  return {
    capture: () => ({ snapshot: snapshot(), liveState: state, panel: capturePanel(), menu: dialog.dataset.menu, settingsOrigin }),
    view: () => ({ snapshot: snapshot(), title: byId("panel-title").textContent,
      recommendation: recommendation(), actions: dialog.open ? (capturePanel()?.actions ?? []).map(({ text, suggested }) => ({ text, label: t(text), suggested: !!suggested })) : [],
    }),
    restore(record) {
      stopWalking(); if (dialog.open) close();
      // Reuse the original root and receiver objects for callbacks that captured
      // them before a later reset. Replacing every object breaks bench undo.
      state = record.liveState ?? state;
      merge(state, record.snapshot.state);
      Object.assign(position, record.snapshot.position);
      player.dataset.dir = record.snapshot.direction;
      setLanguage(record.snapshot.language); applyLanguage(); renderWorld();
      if (!record.snapshot.panelOpen) return;
      settingsOrigin = record.settingsOrigin ?? "pause";
      if (record.menu === "settings") settings(settingsOrigin);
      else if (record.menu === "title") titleScreen();
      else if (record.menu === "pause") pause();
      else if (record.menu === "journal") journal();
      else if (record.panel) {
        const { label, title, body, actions } = record.panel;
        show(label, title, body, actions); dialog.dataset.menu = record.menu ?? "";
      } else open();
    },
    loadFixture(next) {
      stopWalking(); if (dialog.open) close();
      state = next.state;
      Object.assign(position, playerStart); player.dataset.dir = "up";
      renderWorld(); open(next.open);
    },
    open,
    choose(index) {
      if (!Number.isInteger(index) || index < 0) throw Error("Invalid choice index");
      const action = dialog.open && capturePanel()?.actions[index];
      if (!action) throw Error("That choice is no longer available");
      playEffect("button"); action.run();
    },
    setEvidence(ids) { state.evidence = new Set(ids); renderWorld(); },
    setLanguage(value) { setLanguage(value); applyLanguage(); renderWorld(); },
    close,
  };
}
