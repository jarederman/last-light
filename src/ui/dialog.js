import { stopSignal, playEffect } from "../audio/sound.js?v=narrative-fixes-1";

export const byId = (id) => document.getElementById(id);
export const dialog = byId("dialog");
let beforeOpen = () => {};
let returnFocus = null;

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
  beforeOpen();
  if (!dialog.open) returnFocus = document.activeElement;
  dialog.dataset.menu = "";
  byId("panel-label").textContent = label;
  byId("panel-title").textContent = title;
  byId("panel-body").innerHTML = body;
  byId("panel-actions").replaceChildren(...actions.map(({ text, run, primary, suggested }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `action${primary ? " primary" : ""}${suggested ? " suggested" : ""}`;
    if (suggested) {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = "Suggested reply";
      button.append(tag);
    }
    button.append(text);
    button.addEventListener("click", () => { playEffect("button"); run(); });
    return button;
  }));
  if (!dialog.open) dialog.showModal();
  byId("panel-title").focus();
}

export const close = () => dialog.close();
export const done = (text = "Back to the station") => ({ text, run: close });
dialog.querySelector(".close").addEventListener("click", close);

