// Independent consequences, frozen at shift completion. No outcome claims that
// a recording proves the crew safe, and no moral score ranks these paths.
export function epilogue(state) {
  const search = !state.reportSent
    ? "The search continues with the team's existing information. No recording or station notes arrived from your shift."
    : state.reportSnapshot.coverage
      ? "Dispatch compares your recording's relay route with the north-breakwater coverage map. The team has a smaller area to check next. There is still no confirmed sighting of the Kestrel."
      : "The team has your recording and timestamp. They request the relay coverage log before choosing their next sweep. The clicks do not establish who sent them.";
  const company = state.stayed
    ? "You stay through the next stretch of silence. Nell stops filling every pause. Before lowering the volume, she asks which channel will reach you tomorrow."
    : "You leave the channel available. Nell can call again, but tonight's conversation ends before you wait together.";
  const trust = state.finalReply?.trait !== "confidence"
    ? state.finalReply?.trait === "warmth"
      ? "Nell heard an offer of company, not an explanation of the signal. Whether you know more about her father remains an open question between you."
      : state.finalReply
      ? "Nell leaves with no promise that her father is safe. She knows what you could tell her, and what you could not."
      : "You never answer the question about her father's safety. Your presence is real; what she should believe about the clicks remains unsaid."
    : state.accountability === "corrected"
      ? "Nell says, ‘I held on to what you said first.’ She asks you to tell her when you know more, even when it is difficult to hear."
      : state.accountability === "insisted"
        ? "Nell repeats your assurance once, more quietly. ‘Then I'll wait for you to tell me he's home.’ The search board still reads UNCONFIRMED."
        : "Your assurance stays on the line without an answer to Nell's question. Before signing off, she asks whether she should trust your words or the search board.";
  return { search, company, trust };
}
