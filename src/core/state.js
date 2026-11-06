export const evidenceIds = ["tape", "letter", "manual", "bench", "bench-silent", "comparison", "live", "rechecked", "coverage", "report"];
export const phases = ["arrival", "archive", "lesson", "trial", "ready", "live", "investigation", "ending"];
export function initialState() {
  return {
    phase: "arrival", evidence: new Set(), rescueChecked: false,
    receiver: { automatic: false, result: null }, finalReply: null,
    reasonReplies: [], pendingReason: null, correctionSent: false, closing: null,
    training: [], accountability: null, correction: null, reportSnapshot: null,
    stayed: false, ending: null, reportSent: false, trial: 0, lastTrait: null,
    instinct: { warmth: 0, caution: 0, confidence: 0 },
  };
}
