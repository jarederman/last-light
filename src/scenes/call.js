import { show, close, done } from "../ui/dialog.js?v=consequences-1";
import { t } from "../i18n/index.js?v=consequences-1";
import { epilogue } from "../data/epilogue.js?v=consequences-1";
import { playEffect } from "../audio/sound.js?v=consequences-1";

// Caller reactions and report delivery share one session state so closing a
// panel never discards a sent reply or submits the same report twice.
export function createCallScene({ getState, setPhase, replyOptions, recommendation }) {
  function open() {
    const state = getState();
    if (state.phase === "ending") {
      show("Live terminal · Channel 04", "Line open",
        `<p class="terminal">LAST CALL ENDED
${state.reportSent ? "KESTREL SIGNAL REPORT · RECEIVED" : "NO SIGNAL REPORT SENT"}
WAITING FOR THE NEXT CALL</p>`, [{ text: "Review this shift", run: recap }, done()]);
    } else if (state.phase === "live") {
      show("Live terminal · Channel 04", "Nell",
        '<p class="record">“Signal House? This is Nell. The Kestrel missed its check-in. Dad was supposed to be inside the breakwater by now.”</p><p class="record">“I heard three clicks, just like before. Does that mean he’s okay?”</p>', [
          { text: "“I’m here, Nell. Give me a moment.”", primary: true, run: () => { setPhase("investigation"); close(); } },
        ]);
    } else if (state.finalReply) {
      followup();
    } else {
      show("Live terminal · Channel 04", "Nell is on the line",
        state.reportSent
          ? '<p class="record">“They have your recording now. I’m still here. What do you think those clicks mean?”</p>'
          : '<p class="record">“Are you still there?”</p>', [
          { text: "Compose a reply", primary: true, run: compose },
          { text: "Check the rescue board", run: rescueBoard },
          ...reportAction(),
          { text: "Stay with Nell", run: goodbye }, done("Look around the station"),
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
      options.push({ trait: "help", text: state.reportSent
        ? "The team has the recording and timestamp. We still don’t know who sent the clicks."
        : state.evidence.has("rechecked")
        ? "I saved the signal at 00:17:06. It could be automatic, but I can send it to the search team."
        : "I saved the signal at 00:17:06. I can send that recording to the search team." });
    }
    const learned = recommendation();
    const suggested = options.find((option) => option.trait === learned.trait);
    const snapshot = { text: suggested?.text ?? null, basis: suggested ? learned.basis : null };
    show("Live terminal · Reply draft", "What do you tell Nell?",
      `<p class="muted">Choose a draft. Review it before sending.</p>${snapshot.basis ? `<p class="muted">${t("Draft basis")}: ${t(snapshot.basis)}</p>` : ""}`,
      [...replyOptions(options, (option) => preview(option, snapshot)), { text: "Back to the call", run: open }]);
  }

  function preview(option, suggestion) {
    show("Live terminal · Unsent", "Your reply", `<p class="record">“${option.text}”</p>`, [
      { text: "Send reply", primary: true, run: () => {
        const state = getState();
        // Preserve what was sent and its context. Later investigation must not
        // rewrite Nell's reaction to an earlier, less-informed reply.
        state.finalReply = { ...option, suggestion: { ...suggestion }, recheckedAtSend: state.evidence.has("rechecked"), reportAtSend: state.reportSent };
        followup();
      } },
      { text: "Change reply", run: compose }, done("Keep Nell on hold"),
    ]);
  }

  function followup() {
    const state = getState();
    if (!state.finalReply) { open(); return; }
    if (state.finalReply.trait === "confidence" && !state.accountability) { challenge(); return; }
    const reactions = {
      warmth: "Thank you. I’d been sitting here listening to the rain. It helps to hear somebody.",
      caution: state.finalReply.recheckedAtSend
        ? "So the radio might answer without him. I hadn’t thought of that. Can the search team still use it?"
        : "I wish you knew. Thank you for telling me what you do know.",
      confidence: state.accountability === "corrected"
        ? "I held on to what you said first. Please tell me when you know more, even if it is hard to hear."
        : state.accountability === "insisted"
          ? "Then I’ll wait for you to tell me he’s home."
          : "I still don’t understand how you can be sure.",
      help: "You saved it? Can you give them what you heard? I don’t want to get the time wrong.",
    };
    const response = state.reportSent && state.finalReply.trait !== "confidence"
      ? "They called back. They have your recording, and they’re checking where that relay could have reached. We’re still waiting."
      : reactions[state.finalReply.trait];
    const actions = reportAction();
    if (!state.reportSent && !state.evidence.has("live")) {
      actions.push(done("“Let me check the recording.”"));
    }
    if (state.accountability === "avoided") actions.push({ text: "Return to Nell’s question", run: challenge });
    actions.push({ text: "Stay with Nell", run: goodbye }, done("Leave the line open"));
    show("Live terminal · Channel 04", state.reportSent ? "Something they can check" : "Nell listens",
      `<p class="record">“${response}”</p>`, actions);
  }

  function reportAction() {
    return !getState().reportSent && getState().evidence.has("live")
      ? [{ text: "Prepare a signal report", primary: true, run: report }] : [];
  }

  function challenge() {
    const state = getState();
    const question = state.finalReply.reportAtSend
      ? "The team has your recording, but they still say his status is unconfirmed. When you say he’s safe, do you know something they don’t?"
      : "The Kestrel came home last time. Is that why you think Dad is safe tonight? Or do you know something more?";
    show("Live terminal · Channel 04", "What are you sure of?", `<p class="record">“${t(question)}”</p>`, [
      { text: "Correct my assurance", run: () => {
        const correction = "I need to correct what I said. I don’t know that he’s safe. The clicks don’t establish that.";
        show("Live terminal · Channel 04", "Your correction", `<p class="record">“${correction}”</p>`, [
          { text: "Send correction", run: () => { state.accountability = "corrected"; state.correction = correction; state.correctionSent = true; followup(); } },
          { text: "Back to Nell’s question", run: challenge },
        ]);
      } },
      { text: "Stand by my assurance", run: () => { state.accountability = "insisted"; followup(); } },
      { text: "Leave the question unanswered for now", run: () => { state.accountability = "avoided"; followup(); } },
    ]);
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
        <dt>Relay coverage</dt><dd>${state.evidence.has("coverage") ? "North breakwater / outer approach · relay log attached" : "Not checked · coverage verification requested"}</dd>
        <dt>Crew status</dt><dd>${state.rescueChecked ? "Rescue board checked · unconfirmed" : "Not verified by this station"}</dd>
      </dl><p class="muted">Send the recording and these notes to the search team?</p>`, [
        { text: "Send recording and report", primary: true, run: () => {
          playEffect("receipt");
          state.reportSent = true;
          state.reportSnapshot = { sourceKnown, rescueChecked: state.rescueChecked, coverage: state.evidence.has("coverage") };
          state.evidence.add("report");
          show("Dispatch · Receipt", "Report received",
            '<p class="terminal">KESTREL / 00:17:06\nRECORDING AND NOTES RECEIVED\nRELAY COVERAGE CHECK REQUESTED\nCREW STATUS · UNCONFIRMED</p><p>The search team now has the original signal and its capture time.</p>',
            [{ text: "Tell Nell the report arrived", run: followup }, done()]);
        } },
        { text: "Back to Nell", run: followup }, done("Return to the station"),
      ]);
  }

  function goodbye() {
    const state = getState();
    if (state.finalReply?.trait === "confidence" && !state.accountability) { challenge(); return; }
    show("Live terminal · Channel 04", "A light in the window",
      '<p class="record">“Can you stay while we wait?”</p><p>The search is still in progress. You can spend the remaining watch with Nell, or leave the channel available for her next call.</p>', [
        { text: "“I’ll be here.”", primary: true, run: () => finish(true) },
        { text: "Keep the channel available and end the watch", run: () => finish(false) },
        { text: "Back to Nell", run: open },
      ]);
  }

  function finish(stayed) {
    const state = getState();
    state.stayed = stayed;
    // Freeze delivery and consequences: post-chapter exploration is read-only.
    state.ending = { ...epilogue(state) };
    setPhase("ending");
    recap();
  }

  function recap() {
    const state = getState();
    const reply = state.finalReply;
    const quote = (text) => `<p class="record">“${t(text)}”</p>`;
    show("Chapter complete · Last Light", "The words you leave behind",
      `<h3>Your words</h3>${reply ? quote(reply.text) : `<p>${t("No answer about his safety was sent.")}</p>`}
      ${state.correctionSent ? quote(state.correction) : ""}
      ${state.accountability === "insisted" ? `<p>${t("You stood by your assurance when Nell asked what you knew.")}</p>` : ""}
      <h3>The draft beside you</h3>${reply?.suggestion.text ? quote(reply.suggestion.text) : `<p>${t("No reply draft was sent or recorded.")}</p>`}
      ${reply?.suggestion.basis ? `<p class="muted">${t("Draft basis")}: ${t(reply.suggestion.basis)}</p>` : ""}
      ${reply ? `<p>${t(reply.text === reply.suggestion.text ? "You sent the suggested draft." : "You chose a different draft.")}</p>` : ""}
      <p class="terminal">${state.reportSent ? "KESTREL SIGNAL REPORT · RECEIVED" : "NO SIGNAL REPORT SENT"}</p>
      ${state.reportSnapshot ? `<p>${t(state.reportSnapshot.sourceKnown ? "Attached note: automatic reply possible; crew input unconfirmed." : "Attached note: source unknown; no voice captured.")}</p><p>${t(state.reportSnapshot.rescueChecked ? "Rescue board checked before sending: crew status unconfirmed." : "Rescue board not checked before sending.")}</p>` : ""}
      <h3>The search</h3><p>${t(state.ending.search)}</p>
      <h3>The silence</h3><p>${t(state.ending.company)}</p>
      <h3>The next call</h3><p>${t(state.ending.trust)}</p>`,
      [done("Return to the station")]);
  }

  return { open };
}
