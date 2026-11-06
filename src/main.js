import { chapters, exercises } from "./data/story.js?v=language-3";
import { interactionPoints, playerStart } from "./data/station.js?v=language-3";
import { canStand, actorScale } from "./core/world.js?v=language-3";
import { distance, findRoute } from "./core/navigation.js?v=language-3";
import { isSoundOn, toggleSound, startAmbience, stopAmbience, footstep, playEffect } from "./audio/sound.js?v=language-3";
import { creditsMarkup } from "./data/credits.js?v=language-3";
import { byId, dialog, show, close, done, configureDialog } from "./ui/dialog.js?v=language-3";

import { createRadioScene } from "./scenes/radio.js?v=language-3";
import { createCallScene } from "./scenes/call.js?v=language-3";
import { createWeather } from "./scenes/weather.js?v=language-3";
import { t, getLanguage, setLanguage, languages } from "./i18n/index.js?v=language-3";

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
const radioScene = createRadioScene({ getState: () => state, mark });
const callScene = createCallScene({ getState: () => state, setPhase, replyOptions });

function reset() {
  stopAmbience();
  state = {
    phase: "arrival",
    evidence: new Set(),
    rescueChecked: false,
    receiver: { automatic: false, result: null },
    finalReply: null,
    reportSent: false,
    trial: 0,
    lastTrait: null,
    instinct: { warmth: 0, caution: 0, confidence: 0 },
  };
  Object.assign(position, playerStart);
  player.dataset.dir = "up";
  stopWalking();
  if (dialog.open) dialog.close();
  renderWorld();
  renderPlayer();
}

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
  gameMenu("title", "SIGNAL HOUSE", "Last Light",
    '<p>The harbor is quiet. Your first night shift is about to begin.</p><p class="muted">WASD / arrows · Move<br>E · Interact<br>J · Field journal<br>Esc · Pause</p><p class="muted">You can also click the floor to walk or select an object marker.</p>' + orientationHint,
    [{ text: "Begin night shift", run: () => { startAmbience(); close(); }, primary: true },
      { text: "Settings", run: () => settings("title") },
      { text: "Credits", run: () => gameMenu("credits", "LAST LIGHT", "Made with care", creditsMarkup, [{ text: "Back to title", run: titleScreen }]) }]);
}

function pause() {
  gameMenu("pause", "SIGNAL HOUSE", "Shift paused", orientationHint, [
    { text: "Resume shift", run: close, primary: true },
    { text: "Open field journal", run: journal },
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
      { text: "Return to title", run: () => { reset(); titleScreen(); } },
    ]);
}

function journal() {
  const [chapter, title, objective] = chapters[state.phase];
  const items = journalRecords().map(([id, label]) =>
    `<li data-done="${state.evidence.has(id)}">${label}</li>`).join("");
  gameMenu("journal", chapter, "Field journal",
    `<p class="record"><strong>${title}</strong><br>${objective}</p><ol class="notes">${items}</ol>`,
    [done("Close journal")]);
}

byId("pause-key").addEventListener("click", pause);
byId("journal-key").addEventListener("click", journal);
dialog.addEventListener("cancel", (event) => {
  if (dialog.dataset.menu === "settings") {
    event.preventDefault();
    leaveSettings();
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
    ["tape", "Kestrel's three-click recording"], ["letter", "Nell's old letter"],
    ["manual", "Receiver manual"], ["bench", "Automatic receiver tested"],
    ["comparison", "Two sources, one signal"], ["live", "Tonight’s recording · 00:17:06"],
    ["rechecked", "Old receiver notes reviewed"], ["report", "Recording delivered to search team"],
  ];
  return document.body.classList.contains("live") ? records : records.slice(0, 5);
}

function setPhase(phase) {
  state.phase = phase;
  renderWorld();
}

function mark(id) {
  if (state.evidence.has(id)) return;
  state.evidence.add(id);
  renderWorld();
}

function talk() {
  if (state.phase === "arrival") {
    show("Mara · Station keeper", "First night?", `
      <p class="record">“Hang your coat wherever it fits. I left you an old case, the Kestrel. Three clicks came over the radio. Everybody thought they knew what they meant.”</p>
      <p>“Listen to the tape. Check Nell’s letter and the equipment notes in the archive. There’s a matching receiver on the radio bench if you want to try it.”</p>`, [
      { text: "I'll take a look", primary: true, run: () => { setPhase("archive"); close(); } },
    ]);
  } else if (state.phase === "archive") {
    if (["tape", "letter", "manual", "comparison"].every((id) => state.evidence.has(id))) {
      show("Mara · Case review", "What goes in the log?", "<p>“If the next operator could read only one line about those clicks, what should that line say?”</p>", [
        { text: "The skipper answered by hand.", run: () => review("We know what his signal sounds like. What else could have made it?") },
        { text: "The radio may be working. The source of the clicks is uncertain.", run: () => review("That’s what I’d write. Keep the observation and the conclusion separate.") },
        { text: "The automatic reply circuit sent the clicks.", run: () => review("Possible. But the manual tells us what the set can do. It doesn’t tell us what happened.") },
      ]);
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

function review(feedback) {
  show("Mara · Case review", "Mara's note", `<p class="record">“${feedback}”</p><p>“Write down what we actually heard. We can leave a little room for what we don’t know.”</p>`, [
    { text: "Log the signal and continue", primary: true, run: () => { setPhase("lesson"); close(); } },
  ]);
}

function radio() {
  radioScene.open();
}

function archive() {
  show("Archive · Drawer 07", "The Kestrel file", "<p>Two documents are clipped to the recording slip.</p>", [
    { text: "Read Nell’s letter", run: () => archiveDocument("letter", "A note from Nell",
      "<p class='record'>“Dad says the microphone sticks in rough water. If he can hear us but can’t speak, he’ll tap three times so we know he’s there.”</p><p class='muted'>Filed eighteen months ago.</p>") },
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
    actions.unshift({ text: "Find the receiver bench", run: () => {
      show("Archive · Equipment note", "A matching set",
        "<p>The spare receiver is beside the radio. Its microphone is unplugged. Try sending a relay ping with its automatic reply switch in each position.</p>",
        [done("Go to the radio")]);
    } });
  }
  show("Archive · Drawer 07", title, body, actions);
}

function suggestion() {
  // Suggestions reproduce learned human approval, not an optimal-answer oracle.
  // The live-call "help" option was never trained and is intentionally unscored.
  const scores = Object.entries(state.instinct);
  scores.sort((a, b) => b[1] - a[1] || Number(b[0] === state.lastTrait) - Number(a[0] === state.lastTrait));
  return scores[0][1] > 0 ? scores[0][0] : null;
}

function replyOptions(options, send, recommend = suggestion()) {
  return options.map((option) => ({
    text: option.text, suggested: option.trait === recommend, run: () => send(option),
  }));
}

function exercise(index) {
  const call = exercises[index];
  show(call.label, call.title, `<p class="record">${call.request}</p><p class="muted">${call.fact}</p>`, [
    ...replyOptions(call.options, (option) => trainingFeedback(index, option)),
    done("Come back later"),
  ]);
}

function trainingFeedback(index, option) {
  const call = exercises[index];
  const earnedApproval = option.trait === call.preferred;
  const feedback = index === 0
    ? t(call.feedback)
    : `${t(earnedApproval ? "Your reply was the caller’s favorite." : "The caller preferred a different reply.")} ${t(call.feedback)}`;
  show(call.label, index === 0 ? "Mara’s example" : "After the call",
    `<p class="record">${feedback}</p>${index === 1 ? "<p>Mara glances at the draft field. “See? It’s getting easier.”</p>" : ""}`, [
      {
        text: "File this call", primary: true, run: () => {
          state.instinct[option.trait] += earnedApproval ? 3 : 1;
          state.lastTrait = option.trait;
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
    '<p class="terminal">TRAINING SIMULATION COMPLETE\nARCHIVE CASES LOADED\nHUMAN FEEDBACK INTEGRATED\nLIVE CALLS HANDLED: 0\n\nCHANNEL 04 · INCOMING</p>',
    [{ text: "Return to the station", primary: true, run: close }]);
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
