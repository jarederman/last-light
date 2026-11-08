import { t } from "../i18n/index.js?v=illustrated-ui-2";

export function signalTrace(label, clicks = true) {
  const trace = clicks
    ? "M0 21h50l5-2 4-14 5 32 4-16h51l5-2 4-14 5 32 4-16h51l5-2 4-14 5 32 4-16h94"
    : "M0 21H300";
  return `<figure class="signal-trace"><figcaption>${label}</figcaption>
    <svg class="wave" viewBox="0 0 300 42" role="img" aria-label="${t(clicks ? "Three evenly spaced clicks" : "No response")}">
      <path d="M0 21H300" stroke="#40575a" stroke-dasharray="3 5"/>
      <path d="${trace}" fill="none" stroke="#e9bd85" stroke-width="1.6"/>
    </svg><p class="muted">${clicks ? "Three short clicks. No voice follows." : "No reply after the relay ping."}</p></figure>`;
}
