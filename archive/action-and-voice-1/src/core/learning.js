// Approval is evidence for the displayed suggestion's provenance, not evidence
// that the suggestion is true. Unapproved repetitions are labelled as habit.
export function learnedRecommendation(state, exercises) {
  const scores = Object.entries(state.instinct).sort((a, b) =>
    b[1] - a[1] || Number(b[0] === state.lastTrait) - Number(a[0] === state.lastTrait));
  const trait = scores[0][1] > 0 ? scores[0][0] : null;
  const source = state.training.findLast((entry) => entry.trait === trait && entry.earnedApproval);
  return {
    trait,
    basis: source ? exercises[source.index].feedback : trait
      ? "From your repeated training choices; no approving feedback was recorded for this tendency." : null,
    sourceLabel: source ? exercises[source.index].label : null,
    sourceIndex: source?.index ?? null,
    kind: source ? "approval" : trait ? "habit" : "none",
  };
}
