import { stopSignal, playEffect } from "../audio/sound.js?v=ending-story-2";
import { t, translateHtml } from "../i18n/index.js?v=ending-story-2";

export const byId = (id) => document.getElementById(id);
export const dialog = byId("dialog");
let beforeOpen = () => {};
let returnFocus = null;
let currentPanel = null;

// Development history retains authored callbacks only in memory, never in JSON.
export const capturePanel = () => dialog.open ? currentPanel : null;

export function configureDialog(onOpen) { beforeOpen = onOpen; }

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
  byId("panel-title").focus();
}

export const close = () => dialog.close();
export const done = (text = "Back to the station") => ({ text, run: close });
dialog.querySelector(".close").addEventListener("click", close);

