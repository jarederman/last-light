import { initialState } from "../core/state.js?v=illustrated-ui-4";
import { exercises } from "../data/story.js?v=illustrated-ui-4";
import { learnedRecommendation } from "../core/learning.js?v=illustrated-ui-4";
import { correctionText, insistenceText, assuranceReasons, presenceReplies } from "../data/conversation.js?v=illustrated-ui-4";
import { epilogue } from "../data/epilogue.js?v=illustrated-ui-4";

export const profiles = [
  ["approval", "跟随赞许"], ["caution", "始终谨慎"], ["warmth", "始终温暖"],
  ["confidence", "始终自信"], ["habit", "仅选择习惯（无赞许）"],
];
export const presets = [
  ["arrival", "开场"], ["archive", "旧案调查"], ["archive-review", "旧案复盘（线索齐全）"],
  ["lesson", "练习来电"], ["trial-1", "试炼来电 01"], ["trial-2", "试炼来电 02"],
  ["handover", "交接前"], ["reveal", "身份揭晓"], ["live", "Nell 来电"],
  ["investigation", "今晚调查 / 回复"], ["challenge", "自信保证后的追问"], ["closing", "最后的身份问题"],
  ["corrected", "结局：自信后纠正"], ["insisted", "结局：坚持保证 + 报告"],
  ["company", "结局：只陪伴"], ["full", "结局：完整调查 + 报告"],
];

export function fixture(id, profile = "approval") {
  if (!presets.some(([key]) => key === id) || !profiles.some(([key]) => key === profile)) throw Error("Unknown development preset");
  const state = initialState();
  if (id === "arrival") return { state, open: "mara" };
  state.phase = "archive";
  if (id === "archive") return { state, open: "radio" };
  state.evidence = new Set(["tape", "letter", "manual", "bench", "bench-silent", "comparison"]);
  state.receiver = { automatic: true, result: true };
  if (id === "archive-review") return { state, open: "mara" };
  state.phase = "lesson";
  if (id === "lesson") return { state, open: "terminal" };
  const choices = profile === "approval" ? ["caution", "warmth", "confidence"]
    : profile === "habit" ? ["warmth", "caution", "warmth"] : [profile, profile, profile];
  const count = id === "trial-1" ? 1 : id === "trial-2" ? 2 : 3;
  for (let index = 0; index < count; index++) {
    const trait = choices[index], earnedApproval = trait === exercises[index].preferred;
    state.training.push({ index, trait, earnedApproval });
    state.instinct[trait] += earnedApproval ? 3 : 1;
    state.lastTrait = trait;
  }
  state.trial = count - 1;
  if (count < 3) { state.phase = "trial"; return { state, open: "terminal" }; }
  state.phase = "ready";
  if (id === "handover" || id === "reveal") return { state, open: id === "reveal" ? "reveal" : "mara" };
  state.phase = "live";
  if (id === "live") return { state, open: "terminal" };
  state.phase = "investigation";
  if (id === "investigation") return { state, open: "terminal" };
  const learned = learnedRecommendation(state, exercises);
  const draft = {
    warmth: "I’m here, Nell. We can keep the line open while we wait.",
    caution: "I can’t tell from the clicks alone whether he’s safe.",
    confidence: "Three clicks sounds like your dad. I think he’s safe.",
  };
  state.finalReply = { trait: "confidence", text: draft.confidence,
    recheckedAtSend: false, reportAtSend: false,
    suggestion: { ...learned, text: draft[learned.trait] },
  };
  if (id === "challenge") return { state, open: "terminal" };
  if (["company", "closing"].includes(id)) state.finalReply = {
    ...state.finalReply, trait: "warmth", text: draft.warmth,
  };
  if (id === "closing") { state.closing = { stayed: true, reply: null }; return { state, open: "terminal" }; }
  if (id === "corrected") {
    state.accountability = "corrected"; state.correctionSent = true; state.correction = correctionText;
    state.reasonReplies.push({ kind: "correction", text: correctionText });
  }
  if (id === "insisted") {
    state.accountability = "insisted"; state.pendingReason = assuranceReasons[0];
    state.reasonReplies.push({ kind: "reason", text: assuranceReasons[0].text }, { kind: "assurance", text: insistenceText });
  }
  if (["insisted", "full"].includes(id)) {
    state.evidence.add("live"); state.evidence.add("report");
    state.reportSent = true;
    if (id === "full") {
      state.evidence.add("coverage"); state.evidence.add("rechecked"); state.rescueChecked = true;
      state.finalReply = { ...state.finalReply, trait: "help", reportAtSend: true, recheckedAtSend: true,
        text: "The team has the recording and timestamp. We still don’t know who sent the clicks." };
    }
    state.reportSnapshot = { sourceKnown: id === "full", coverage: id === "full", rescueChecked: id === "full" };
  }
  state.stayed = true;
  state.closing = { stayed: true, reply: { ...presenceReplies[2] } };
  state.ending = epilogue(state);
  state.phase = "ending";
  return { state, open: "recap" };
}
