import { stopSignal, playEffect } from "../audio/sound.js?v=illustrated-ui-7";
import { t, translateHtml } from "../i18n/index.js?v=illustrated-ui-7";

export const byId = (id) => document.getElementById(id);
export const dialog = byId("dialog");
let beforeOpen = () => {};
let returnFocus = null;
let currentPanel = null;

// Development history retains authored callbacks only in memory, never in JSON.
export const capturePanel = () => dialog.open ? currentPanel : null;

export function configureDialog(onOpen) { beforeOpen = onOpen; }

function surfaceFor(label) {
  if (label.startsWith("Mara")) return "dialogue";
  if (label.startsWith("Radio")) return "radio";
  if (label.startsWith("Archive")) return "archive";
  if (label.startsWith("Live terminal") || label.startsWith("Dispatch") || label.startsWith("Signal House · Handover")) return "terminal";
  if (label.startsWith("Chapter complete")) return "terminal";
  if (label.startsWith("After the line")) return "archive";
  return "wood";
}

// Width-weighted length: CJK characters take roughly two Latin columns.
const visualLength = (text) => [...text].reduce((sum, char) => sum + (/[\u2e80-\u9fff\uff00-\uffef]/.test(char) ? 2 : 1), 0);
const narrowQuery = globalThis.matchMedia?.("(max-width: 700px), (max-height: 550px)");

// The radio tray only fits short device controls. Sentence-length answers move
// the radio into its stacked layout, where every choice is a full-width row.
function applyLayout() {
  const surface = dialog.dataset.surface;
  const device = surface === "radio" || surface === "terminal";
  const labels = (currentPanel?.actions ?? []).map(({ text }) => String(t(text)));
  const dense = surface === "radio" && labels.some((text) => visualLength(text) > 34);
  dialog.dataset.layout = device && (narrowQuery?.matches || dense) ? "stacked" : "";
  updateMoreCue();
}

const moreCue = document.createElement("button");
moreCue.type = "button";
moreCue.className = "more-cue";
moreCue.hidden = true;
dialog.append?.(moreCue);

function scroller() {
  for (const element of [byId("panel-body"), byId("panel-body").parentElement]) {
    if (!element || typeof getComputedStyle !== "function") continue;
    if (/(auto|scroll)/.test(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight + 2) return element;
  }
  return null;
}

// Long screens keep their scroll position inside the device; a cue shows that
// more text or choices remain below the visible edge.
function updateMoreCue() {
  const element = dialog.open ? scroller() : null;
  const more = Boolean(element) && element.scrollTop + element.clientHeight < element.scrollHeight - 4;
  moreCue.hidden = !more;
  if (!more) return;
  moreCue.textContent = `▾ ${t("More below")}`;
  const box = element.getBoundingClientRect();
  const frame = dialog.getBoundingClientRect();
  moreCue.style.left = `${box.left - frame.left + box.width / 2}px`;
  moreCue.style.top = `${box.bottom - frame.top}px`;
}
moreCue.addEventListener?.("click", () => {
  const element = scroller();
  element?.scrollBy({ top: element.clientHeight * .8, behavior: "smooth" });
});
for (const element of [byId("panel-body"), byId("panel-body").parentElement]) {
  element?.addEventListener?.("scroll", updateMoreCue, { passive: true });
}
globalThis.addEventListener?.("resize", applyLayout);
narrowQuery?.addEventListener?.("change", applyLayout);

dialog.addEventListener("close", () => {
  stopSignal();
  // A close event may arrive after a new modal has already opened (e.g. title
  // reset). Do not take focus away from that new modal or discard its opener.
  if (dialog.open) return;
  const opener = returnFocus;
  returnFocus = null;
  const available = opener && opener !== document.body && opener.isConnected
    && !opener.closest("dialog") && !opener.closest("[hidden]")
    && !opener.disabled && opener.getClientRects().length;
  (available ? opener : byId("room")).focus({ preventScroll: true });
});
dialog.addEventListener("cancel", (event) => {
  if (dialog.dataset.menu === "title") event.preventDefault();
});

export function show(label, title, body, actions) {
  currentPanel = { label, title, body, actions };
  beforeOpen();
  if (!dialog.open) returnFocus = document.activeElement;
  dialog.dataset.menu = "";
  dialog.dataset.surface = surfaceFor(label);
  byId("panel-label").textContent = t(label);
  byId("panel-title").textContent = t(title);
  byId("panel-body").innerHTML = translateHtml(body);
  byId("panel-actions").replaceChildren(...actions.map(({ text, run, primary, suggested }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `action${primary ? " primary" : ""}${suggested ? " suggested" : ""}`;
    button.dataset.message = text;
    if (suggested) {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = t("Suggested reply");
      button.append(tag);
    }
    button.append(t(text));
    button.addEventListener("click", () => { playEffect("button"); run(); });
    return button;
  }));
  if (!dialog.open) dialog.showModal();
  for (const element of [byId("panel-body"), byId("panel-body").parentElement]) if (element) element.scrollTop = 0;
  applyLayout();
  byId("panel-title").focus();
}

export const close = () => dialog.close();
export const done = (text = "Back to the station") => ({ text, run: close });
dialog.querySelector(".close").addEventListener("click", close);

