import { show, done } from "../ui/dialog.js?v=ending-story-2";
import { playSignal, stopSignal, playEffect } from "../audio/sound.js?v=ending-story-2";
import { signalTrace } from "../ui/signal.js?v=ending-story-2";

export function createRadioScene({ getState, mark }) {
  function open() {
    const state = getState();
    if (state.phase === "live") {
      show("Radio · Channel 04", "Open line", "<p>The call is holding at the Terminal.</p>", [done()]);
      return;
    }
    const live = ["investigation", "ending"].includes(state.phase);
    mark(live ? "live" : "tape");
    const actions = [{ text: "Play recording", run: playSignal }];
    if (live) actions.push({ text: "Read tonight’s relay log", run: relayLog });
    actions.push({ text: "Open receiver bench", run: bench });
    actions.push(done());
    show(live ? "Radio · Channel 04" : "Radio · Archive tape 07",
      live ? "Tonight’s signal" : "Kestrel recording",
      `<p class="terminal">${live ? "CHANNEL 04 · 00:17:06 · TONIGHT" : "ARCHIVE 07 · EIGHTEEN MONTHS AGO"}
Captured after the coast station’s relay ping.</p>
      ${signalTrace(live ? "Captured live recording" : "Archived recording")}
      ${live ? '<p class="muted">Recording and timestamp saved for the rescue team.</p>' : '<p class="muted">A matching receiver sits on the bench beside the set.</p>'}`, actions);
  }

  function relayLog() {
    mark("coverage");
    show("Radio · Relay log", "A place to check",
      '<p class="terminal">00:17:04 · NORTH BREAKWATER RELAY PING\n00:17:06 · THREE-CLICK RETURN\nCOVERAGE · NORTH BREAKWATER / OUTER APPROACH</p><p>This route narrows where dispatch can check next. It cannot identify the sender or confirm anyone is safe.</p>',
      [{ text: "Back to the radio", run: open }, done()]);
  }

  function bench() {
    const test = getState().receiver;
    show("Radio · Isolated receiver bench", "The spare receiver",
      `<p>A spare of the Kestrel’s radio is connected to a local test line. Its microphone is unplugged.</p>
      <div class="terminal">MICROPHONE · DISCONNECTED
AUTO-REPLY · ${test.automatic ? "ON" : "OFF"}</div>
      ${test.result === null ? '<p class="muted">Set the reply switch, then send a relay ping.</p>' : signalTrace("Bench output", test.result)}
      <p class="muted">Try a ping in both switch positions, then compare with the archive. The switch on the real Kestrel is still unknown.</p>`, [
        { text: `Turn auto-reply ${test.automatic ? "off" : "on"}`, run: () => {
          stopSignal();
          playEffect("switch");
          test.automatic = !test.automatic;
          test.result = null;
          bench();
        } },
        { text: "Send relay ping", primary: true, run: () => {
          stopSignal();
          test.result = test.automatic;
          mark(test.automatic ? "bench" : "bench-silent");
          bench();
          if (test.result) playSignal();
        } },
        ...(getState().evidence.has("bench") && getState().evidence.has("bench-silent")
          ? [{ text: "Compare with archived tape", run: compare }] : []),
        { text: "Back to the radio", run: open }, done(),
      ]);
  }

  function compare() {
    if (!getState().evidence.has("letter")) {
      show("Radio · Signal comparison", "One source tested",
        '<p>The unplugged receiver can produce the recorded pattern. That shows an automatic source is possible. Read Nell’s letter in the archive before comparing it with the skipper’s signal.</p>',
        [{ text: "Back to the bench", run: bench }, done()]);
      return;
    }
    show("Radio · Signal comparison", "Two sources, one pattern",
      `<div class="trace-pair">${signalTrace("Archive 07 · source unknown")}${signalTrace("Bench · automatic, microphone unplugged")}</div>
      <p>What can the match establish about the old recording?</p>`, [
        { text: "The old recording was definitely automatic.", run: () => comparisonResult(false) },
        { text: "An automatic set can make the same reply. The old source is still unknown.", run: () => comparisonResult(true) },
        { text: "The skipper must have answered by hand.", run: () => comparisonResult(false) },
        { text: "Back to the bench", run: bench }, done(),
      ]);
  }

  function comparisonResult(grounded) {
    if (grounded) mark("comparison");
    show("Radio · Signal comparison", grounded ? "An observation for the log" : "Listen to the second source",
      grounded
        ? '<p>You made the same three clicks with the microphone unplugged. Either source could explain the old tape.</p><p class="muted">Comparison added to your field journal.</p>'
        : '<p>The bench made those clicks without a person replying. The tape alone cannot tell you which source made the old signal.</p>', [
        { text: grounded ? "Back to the radio" : "Compare the recordings again", run: grounded ? open : compare }, done(),
      ]);
  }

  return { open };
}
