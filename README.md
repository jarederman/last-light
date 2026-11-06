# Last Light

A short browser RPG set in a harbor radio station on a stormy night. Explore the room, review an old signal with Mara, and take a shift at the dispatch terminal.

## Project structure

| Path | Responsibility |
| --- | --- |
| `index.html` | Game surface and dialog containers |
| `src/main.js` | Game startup, player input, chapter progression and scene interactions |
| `src/core/navigation.js` | Collision-aware route search and spatial calculations |
| `src/core/world.js` | Floor collision checks and perspective scale |
| `src/data/station.js` | Interaction positions and collision geometry |
| `src/data/story.js` | Chapter objectives and training dialogue data |
| `src/data/epilogue.js` | Independent search, companionship and trust consequences |
| `src/core/learning.js` | Learned tendency and truthful approval/habit provenance |
| `src/data/conversation.js` | Spoken reasons, objections and final presence replies |
| `src/data/reflections.js` | Public philosophy questions, primary readings and scope limits |
| `src/scenes/reflection.js` | Optional post-story notes |
| `src/ui/dialog.js` | Dialog rendering, action buttons and modal lifecycle |
| `src/i18n/` | Language preference, presentation translation and Simplified Chinese message catalog |
| `src/audio/sound.js` | Downloaded ambience and effects, muting and playback lifecycle |
| `src/scenes/radio.js` | Receiver bench, recorded signals and comparison puzzle |
| `src/scenes/call.js` | Nell’s live call, evidence reports and follow-up reactions |
| `src/scenes/weather.js` | Layered wind-driven rain and slow window droplets |
| `src/ui/signal.js` | Accessible waveform views |
| `tests/game-flow.cjs` | Module-based interaction and branching regression checks |
| `src/styles/game.css` | Scene, character and menu presentation |
| `assets/scenes/` | Unified rainy-night background and desk/chair occlusion masks |
| `assets/characters/` | Matching adult player walk sheet and Mara sprite |
| `assets/audio/` | Compressed rain, movement and device recordings |
| `assets/ui/` | Game icon |
| `assets/art-direction.md` | Visual constraints, generation prompts and sprite format |
| `tools/prepare_art.py` | Asset resizing, transparent-frame packing and WebP export |

The game uses native JavaScript modules. The entry module imports its dependencies explicitly. Relative module and asset paths support GitHub Pages project URLs.

Runtime state is owned by `src/main.js`. Closing a menu or interaction pauses movement, and returning to the title resets the shift. Progress lasts for the current page session.

## Run locally

Run `python3 -m http.server 8000` from the repository root, then open `http://localhost:8000`. JavaScript modules require an HTTP server for local play.

Move with **WASD** or the **arrow keys**, and press **E** near an object or NPC. Click the floor to walk, or click an object marker to approach and interact. **J** opens the journal and **Esc** opens the pause menu or closes the current panel. Touch devices have small menu buttons.

Open **Settings** from the title or pause menu to select **English** or **简体中文**
and toggle sound. The browser remembers the language choice. On a first visit,
Chinese browser languages use Simplified Chinese; all other browser languages default to English.
If browser storage is blocked, switching still works for the current session.
Changing language does not reset the current shift, evidence, learned preferences
or a sent reply. Escape returns from Settings to its originating menu.

The English story messages remain canonical state values. Translation happens
when presenting menus, dialogue, choices, journal entries, recordings, reports
and accessibility labels. `src/i18n/zh-CN.js` stores plain-text translations;
HTML structure, URLs, SVG paths and internal game IDs are preserved. Proper names
such as Last Light and ECHO-01 retain their original branding. The Chinese flow
test checks rendered-message coverage and language changes during Nell's call.

## Check the game flow

Run `node --experimental-vm-modules tests/game-flow.cjs` with Node.js. The checks load the real module graph with a minimal DOM and exercise player movement, the receiver comparison, all four acts, investigation-dependent replies, report delivery, menu reopening and shift reset.

Sent replies retain their wording and evidence context. Later investigation can
improve a new signal report without retroactively changing Nell's reaction to an
earlier reply. Learned suggestions reflect training feedback, not an optimal
answer or the untrained live-call help option.

Run `node --experimental-vm-modules tests/dialog.cjs` for focus return, hidden NPC
fallback and rapid modal reopening. Scene controls regain focus after closing;
when an opener disappears, focus returns to the game area. A portrait-phone
orientation hint appears only in the title and pause menus.

The receiver bench is an isolated local test. Sending a live signal report requires capturing tonight's recording first. Reports carry the observed timestamp and only the notes the player reviewed. The ending records whether a report was actually delivered.

## Spoken words and consequences

Live drafts show the training feedback behind the learned suggestion. Sending
freezes the actual wording, then-current suggested wording, training source and
evidence context. A confident assurance prompts Nell to ask what supports it;
the player can give a concrete reason (the previous safe return or the agreed
three taps), hear Nell challenge that reason, then send a correction, stand by
the assurance, or defer. The transcript retains the words actually sent. An unsent correction has no effect. Reports can precede
a verbal reply, and staying without answering the safety question is supported.

At sign-off, Nell asks what ECHO means by “I’m here.” Three unscored replies
receive different responses; no answer certifies consciousness. The handover
identifies the player’s own trial choices as ECHO’s training history. Draft
provenance quotes an approving feedback event for the recommended tendency;
when there was no approval, it explicitly credits repeated choice rather than
misrepresenting a caller’s criticism as support.

Tonight’s relay log narrows a possible search area without proving the sender
or anyone’s safety. Reports freeze the attached notes at delivery; subsequent
investigation cannot add facts to an already-sent report.

Ending the watch opens an in-game chapter recap with the original words, any
sent correction, the historical suggestion and its source. Independent search,
companionship and trust paragraphs respond to actual choices, without moral
scores or a guaranteed rescue. The avatar remains controllable after completion;
the terminal can reopen the frozen recap. Starting a new shift resets it.

The game-flow suite covers the four acceptance routes in both languages, the
unanswered-question route, report-first ordering, unsent corrections and recap
stability after exploration. It also checks all 42 modular epilogue combinations
and their Chinese translations. Additional regressions cover all three learned
tendencies, unapproved habits, reason-specific objections, closing identity
answers, report acknowledgment after an uncorrected assurance, receiver-before-
letter ordering, reflection navigation and replay.

## Public philosophy

The sign-off returns the old signal’s ambiguity to ECHO’s own voice. Optional
post-story notes explain conversational evidence, the Chinese Room, learning
and the systems reply in plain language, with links to the original papers.
They also state the limits of a scripted game controlled by a human player.
The notes do not change the ending or award a philosophical score.

See [docs/philosophy.md](docs/philosophy.md) for the bilingual course explanation,
mechanism-to-question mapping and primary readings. The course requires an advance proposal
to the instructor or TA; this explanation does not record whether approval has been obtained.

## GitHub Pages

Publish the `main` branch from `/(root)` under **Settings → Pages → Deploy from a branch**. The root `.nojekyll` file keeps this a static deployment. No build step is required.

Before publishing changed code, run `node tools/version.mjs RELEASE_TAG` once to
update the entry, stylesheet and all local module imports together. It also adds
a version to newly introduced local imports. `node tools/version.mjs --check`
checks consistency and import paths without changing files. Keep one cache key
across the module graph so audio and stateful UI modules cannot load twice.

## Assets

See [ASSET_CREDITS.md](ASSET_CREDITS.md) for the source pages, authors, licenses and modifications. The Pixabay ambience uses the Pixabay Content License; Kenney interface/movement effects use CC0. Notices are in `assets/licenses/`.

The environment and actors were generated together around a dark timber coastal station, navy sea, rain and small amber practical lights. The terminal is front-facing and the actors have subdued adult silhouettes. Furniture is baked into one coherent background; collision and approach positions live in `src/data/station.js` in a 640 × 400 coordinate space. The WebP background is 1280 × 800.

Echo's sheet has four columns, **down / right / up / left**, and three rows, **idle / first stride / second stride**. Each cell is 112 × 168, with feet at pixel 156. Mara uses one cell with the same scale and baseline. Characters are sorted by foot position so the foreground actor covers the one behind. See `assets/art-direction.md` for source prompts and the optional asset packing command. The packer only processes existing artwork; it does not draw the scene or characters.

Actors grow gradually toward the foreground, anchored at their feet. The terminal desk and chair are rendered again through separate SVG silhouette masks at their own floor depths, allowing them to cover actors walking behind them. These layers reuse the same cached background artwork. Desk, chair and Mara have separate collision footprints; the terminal can be used from its left or front approaches.

Only recommended targets show a centered, glowing gold beacon. Unrecommended props remain interactive through proximity and E, clicking their hotspot, or focusing their accessible button. The archive phase suggests Mara only after the required evidence has been collected.

Two ambient tracks start after Begin Night Shift: closer rain and quieter distant surf. Both pause when the page is hidden, follow the sound toggle and stop on return to the title. The locally packaged, filtered recordings use wraparound crossfades to soften loop seams, with different 68s and 56s periods. Audio playback failures leave the game playable. Rebuild them with `python3 tools/prepare_ambience.py ocean-waves.mp3 calming-rain.mp3`; original source downloads stay outside the published repository.

Weather uses independently varied rain streaks, wind gusts and slow glass droplets, clipped to the exterior and individual window panes. Frames and furniture stay dry. The static painting remains visible when reduced motion is requested or Canvas is unavailable.

Run `node --experimental-vm-modules tests/audio.cjs` to check audio mute, visibility and replay behavior.
Run `node --experimental-vm-modules tests/world.cjs` to check the archive passage, desk/chair footprints, NPC clearance and perspective scale. The game-flow checks also verify which targets are recommended at each stage.
