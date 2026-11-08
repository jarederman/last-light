import { zhCN } from "./zh-CN.js?v=illustrated-ui-6";

export const languages = [["en", "English"], ["zh-CN", "简体中文"]];
const storageKey = "last-light.language";
const missing = new Set();
let language = initialLanguage();

function initialLanguage() {
  try {
    const saved = globalThis.localStorage?.getItem(storageKey);
    if (languages.some(([code]) => code === saved)) return saved;
  } catch { /* Preferences are optional when browser storage is unavailable. */ }
  return globalThis.navigator?.language?.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

export const getLanguage = () => language;
export const missingTranslations = () => [...missing];

export function setLanguage(value) {
  if (!languages.some(([code]) => code === value)) return;
  language = value;
  try { globalThis.localStorage?.setItem(storageKey, value); } catch { /* Keep the session preference. */ }
}

// Canonical English messages remain in story data and saved replies. Translate
// at presentation time, so changing language cannot alter game state or history.
export function t(source) {
  if (language === "en" || typeof source !== "string") return source;
  const [, before, message, after] = source.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!message) return source;
  let result = Object.hasOwn(zhCN, message) ? zhCN[message] : undefined;
  if (result === undefined && message.startsWith("“") && message.endsWith("”")) {
    const key = message.slice(1, -1);
    const inner = Object.hasOwn(zhCN, key) ? zhCN[key] : undefined;
    if (inner !== undefined) result = `“${inner}”`;
  }
  if (result === undefined && message.includes("\n")) result = message.split("\n").map(t).join("\n");
  if (result === undefined) {
    if (/[A-Za-z]{2,}/.test(message) && !/[\u3400-\u9fff]/.test(message)) missing.add(message);
    result = message;
  }
  return before + result + after;
}

const escape = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// These are project-authored HTML templates. Translate only their text segments;
// preserve tags, IDs, URLs, SVG geometry and all other attributes exactly.
export function translateHtml(source) {
  if (language === "en") return source;
  return source.split(/(<[^>]*>)/g).map((part) => {
    if (part.startsWith("<")) return part;
    const translated = t(part);
    return translated === part ? part : escape(translated);
  }).join("");
}
