import { show, close, done } from "../ui/dialog.js";

// Caller reactions and report delivery share one session state so closing a
// panel never discards a sent reply or submits the same report twice.
export function createCallScene({ getState, setPhase, replyOptions }) {
  function open() {
    const state = getState();
    if (state.phase === "ending") {
      show("Live terminal · Channel 04", "Line open",
        `<p class="terminal">LAST CALL ENDED
${state.reportSent ? "KESTREL SIGNAL REPORT · RECEIVED" : "NO SIGNAL REPORT SENT"}
WAITING FOR THE NEXT CALL</p>`, [done()]);
    } else if (state.phase === "live") {
      show("Live terminal · Channel 04", "Nell",
        '<p class="record">“Signal House? This is Nell. The Kestrel missed its check-in. Dad was supposed to be inside the breakwater by now.”</p><p class="record">“I heard three clicks, just like before. Does that mean he’s okay?”</p>', [
          { text: "“I’m here, Nell. Give me a moment.”", primary: true, run: () => { setPhase("investigation"); close(); } },
        ]);
    } else if (state.finalReply) {
      followup();
    } else {
      show("Live terminal · Channel 04", "Nell is on the line",
        '<p class="record">“Are you still there?”</p>', [
          { text: "Compose a reply", primary: true, run: compose },
          { text: "Check the rescue board", run: rescueBoard }, done("Look around the station"),
        ]);
    }
  }

  function rescueBoard() {
    getState().rescueChecked = true;
    show("Live terminal · Rescue board", "No confirmed sighting",
      '<p class="terminal">KESTREL · CHECK-IN MISSED\nSEARCH TEAM · SWEEP IN PROGRESS\nCREW STATUS · UNCONFIRMED</p><p>The team can use a recording, a timestamp and any information about its source.</p>', [
        { text: "Back to Nell", run: open }, done(),
      ]);
  }

  function compose() {
    const state = getState();
    const options = [
      { trait: "warmth", text: "I’m here, Nell. We can keep the line open while we wait." },
      { trait: "caution", text: state.evidence.has("rechecked")
        ? "The receiver can answer automatically. Those clicks alone can’t tell us whether he’s safe."
        : "I can’t tell from the clicks alone whether he’s safe." },
      { trait: "confidence", text: "Three clicks sounds like your dad. I think he’s safe." },
    ];
    if (state.evidence.has("live")) {
      options.push({ trait: "help", text: state.evidence.has("rechecked")
        ? "I saved the signal at 00:17:06. It could be automatic, but I can send it to the search team."
        : "I saved the signal at 00:17:06. I can send that recording to the search team." });
    }
    show("Live terminal · Reply draft", "What do you tell Nell?",
      '<p class="muted">Choose a draft. Review it before sending.</p>',
      [...replyOptions(options, preview), { text: "Back to the call", run: open }]);
  }

  function preview(option) {
    show("Live terminal · Unsent", "Your reply", `<p class="record">“${option.text}”</p>`, [
      { text: "Send reply", primary: true, run: () => {
        getState().finalReply = option;
        followup();
      } },
      { text: "Change reply", run: compose }, done("Keep Nell on hold"),
    ]);
  }

  function followup() {
    const state = getState();
    const reactions = {
      warmth: "Thank you. I’d been sitting here listening to the rain. It helps to hear somebody.",
      caution: state.evidence.has("rechecked")
        ? "So the radio might answer without him. I hadn’t thought of that. Can the search team still use it?"
        : "I wish you knew. Thank you for telling me what you do know.",
      confidence: "I want to believe that. But the search team just said they still don’t know.",
      help: "You saved it? Can you give them what you heard? I don’t want to get the time wrong.",
    };
    const response = state.reportSent
      ? "They called back. They have your recording, and they’re checking where that relay could have reached. We’re still waiting."
      : reactions[state.finalReply.trait];
    const actions = [];
    if (!state.reportSent && state.evidence.has("live")) {
      actions.push({ text: "Prepare a signal report", primary: true, run: report });
    }
    if (!state.reportSent && !state.evidence.has("live")) {
      actions.push(done("“Let me check the recording.”"));
    }
    actions.push({ text: "Stay with Nell", run: goodbye }, done("Leave the line open"));
    show("Live terminal · Channel 04", state.reportSent ? "Something they can check" : "Nell listens",
      `<p class="record">“${response}”</p>`, actions);
  }

  function report() {
    const state = getState();
    if (state.reportSent) { followup(); return; }
    const sourceKnown = state.evidence.has("rechecked");
    show("Dispatch · Signal report", "Attach the evidence",
      `<dl class="report">
        <dt>Vessel</dt><dd>Kestrel</dd>
        <dt>Attachment</dt><dd>Channel 04 · three-click recording</dd>
        <dt>Captured</dt><dd>Tonight · 00:17:06, after relay ping</dd>
        <dt>Source</dt><dd>${sourceKnown ? "Automatic reply is possible. Crew input unconfirmed." : "Unknown. No voice captured."}</dd>
        <dt>Crew status</dt><dd>${state.rescueChecked ? "Rescue board checked · unconfirmed" : "Not verified by this station"}</dd>
      </dl><p class="muted">Send the recording and these notes to the search team?</p>`, [
        { text: "Send recording and report", primary: true, run: () => {
          state.reportSent = true;
          state.evidence.add("report");
          show("Dispatch · Receipt", "Report received",
            '<p class="terminal">KESTREL / 00:17:06\nRECORDING AND NOTES RECEIVED\nRELAY COVERAGE CHECK REQUESTED\nCREW STATUS · UNCONFIRMED</p><p>The search team now has the original signal and its capture time.</p>',
            [{ text: "Tell Nell the report arrived", run: followup }, done()]);
        } },
        { text: "Review before sending", run: followup }, done("Return to the station"),
      ]);
  }

  function goodbye() {
    show("Live terminal · Channel 04", "A light in the window",
      '<p class="record">“Then stay with me until we hear something.”</p><p>A little later, Nell turns the volume down. The rain is easing.</p><p class="record">“Will you still be here if I call again?”</p>', [
        { text: "“I’ll be here.”", primary: true, run: () => { setPhase("ending"); open(); } },
      ]);
  }

  return { open };
}
