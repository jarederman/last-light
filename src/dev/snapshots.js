import { phases, evidenceIds, initialState } from "../core/state.js?v=illustrated-ui-1";
import { canStand } from "../core/world.js?v=illustrated-ui-1";

const traits = ["warmth", "caution", "confidence", "help"];
const object = (value) => value && typeof value === "object" && !Array.isArray(value);
const assert = (condition, message) => { if (!condition) throw Error(message); };
// Imported state is data, never executable code or authored dialogue markup.
export function validateSnapshot(input) {
  const serialized = JSON.stringify(input);
  assert(serialized && serialized.length < 200000, "快照过大或为空");
  const data = JSON.parse(serialized);
  function safe(value) {
    if (typeof value === "string") assert(!/[<>]/.test(value) && value.length < 12000, "快照文本不能包含 HTML");
    if (object(value)) for (const [key, item] of Object.entries(value)) {
      assert(!["__proto__", "constructor", "prototype"].includes(key), "非法快照字段"); safe(item);
    }
    if (Array.isArray(value)) { assert(value.length <= 200, "快照数组过长"); value.forEach(safe); }
  }
  safe(data);
  const s = data.state;
  assert(data.schema === 1 && object(s), "不支持的快照格式");
  assert(phases.includes(s.phase), "阶段无效");
  const keys = Object.keys(initialState());
  assert(Object.keys(s).length === keys.length && keys.every((key) => Object.hasOwn(s, key)), "状态字段不完整或包含未知字段");
  assert(Array.isArray(s.evidence) && s.evidence.every((id) => evidenceIds.includes(id)), "证据 ID 无效");
  assert(object(s.receiver) && typeof s.receiver.automatic === "boolean" && [true, false, null].includes(s.receiver.result), "接收机状态无效");
  for (const key of ["rescueChecked", "correctionSent", "stayed", "reportSent"]) assert(typeof s[key] === "boolean", key + " 必须为布尔值");
  assert(Number.isInteger(s.trial) && s.trial >= 0 && s.trial <= 2, "试炼序号无效");
  assert(s.lastTrait === null || traits.slice(0, 3).includes(s.lastTrait), "训练倾向无效");
  assert(object(s.instinct) && traits.slice(0, 3).every((id) => Number.isFinite(s.instinct[id]) && s.instinct[id] >= 0), "训练分数无效");
  assert(Array.isArray(s.training) && s.training.every((e) => object(e) && Number.isInteger(e.index) && e.index >= 0 && e.index < 3 && traits.slice(0, 3).includes(e.trait) && typeof e.earnedApproval === "boolean"), "训练历史无效");
  assert(Array.isArray(s.reasonReplies) && s.reasonReplies.every((e) => object(e) && typeof e.text === "string"), "发言历史无效");
  assert([null, "corrected", "insisted", "avoided"].includes(s.accountability), "追问状态无效");
  assert(s.correction === null || typeof s.correction === "string", "更正文本无效");
  if (s.finalReply !== null) assert(object(s.finalReply) && traits.includes(s.finalReply.trait) && typeof s.finalReply.text === "string" && object(s.finalReply.suggestion) && (s.finalReply.suggestion.text === null || typeof s.finalReply.suggestion.text === "string") && typeof s.finalReply.recheckedAtSend === "boolean" && typeof s.finalReply.reportAtSend === "boolean", "回复快照无效");
  if (s.pendingReason !== null) assert(object(s.pendingReason) && typeof s.pendingReason.text === "string" && typeof s.pendingReason.response === "string", "理由无效");
  if (s.reportSnapshot !== null) assert(object(s.reportSnapshot) && ["coverage", "sourceKnown", "rescueChecked"].every((key) => typeof s.reportSnapshot[key] === "boolean"), "报告快照无效");
  assert(!s.reportSent || (s.reportSnapshot !== null && s.evidence.includes("report") && s.evidence.includes("live")), "已发送报告必须包含录音和报告快照");
  assert(!s.evidence.includes("report") || s.reportSent, "报告证据与发送状态不一致");
  assert(!s.accountability || s.finalReply?.trait === "confidence", "追问必须对应自信回复");
  assert(!s.correctionSent || (s.accountability === "corrected" && typeof s.correction === "string"), "更正状态不一致");
  if (s.closing !== null) {
    assert(object(s.closing) && typeof s.closing.stayed === "boolean", "收尾状态无效");
    if (s.closing.reply !== null) assert(object(s.closing.reply) && typeof s.closing.reply.text === "string" && typeof s.closing.reply.response === "string", "身份回复无效");
  }
  if (s.ending !== null) assert(object(s.ending) && ["search", "company", "trust"].every((key) => typeof s.ending[key] === "string"), "尾声无效");
  assert(s.phase !== "ending" || (s.ending && s.closing?.reply), "结局需要尾声和身份回复");
  assert(object(data.position) && Number.isFinite(data.position.x) && Number.isFinite(data.position.y) && canStand(data.position, !["live", "investigation", "ending"].includes(s.phase)), "人物位置不在可行走区域");
  assert(["up", "down", "left", "right"].includes(data.direction), "方向无效");
  assert(["en", "zh-CN"].includes(data.language) && typeof data.panelOpen === "boolean", "语言或面板状态无效");
  return data;
}

export class History {
  constructor(limit = 120) { this.limit = limit; this.entries = []; this.index = -1; }
  push(record, label = "操作") {
    this.entries.splice(this.index + 1);
    this.entries.push({ ...record, label });
    if (this.entries.length > this.limit) this.entries.shift();
    this.index = this.entries.length - 1;
  }
  undo() { return this.index > 0 ? this.entries[--this.index] : null; }
  redo() { return this.index < this.entries.length - 1 ? this.entries[++this.index] : null; }
}
