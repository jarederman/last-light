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
| `src/ui/dialog.js` | Dialog rendering, action buttons and modal lifecycle |
| `src/audio/sound.js` | Downloaded ambience and effects, muting and playback lifecycle |
| `src/scenes/radio.js` | Receiver bench, recorded signals and comparison puzzle |
| `src/scenes/call.js` | Nell’s live call, evidence reports and follow-up reactions |
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

## Check the game flow

Run `node --experimental-vm-modules tests/game-flow.cjs` with Node.js. The checks load the real module graph with a minimal DOM and exercise player movement, the receiver comparison, all four acts, investigation-dependent replies, report delivery, menu reopening and shift reset.

The receiver bench is an isolated local test. Sending a live signal report requires capturing tonight's recording first. Reports carry the observed timestamp and only the notes the player reviewed. The ending records whether a report was actually delivered.

## GitHub Pages

Publish the `main` branch from `/(root)` under **Settings → Pages → Deploy from a branch**. The root `.nojekyll` file keeps this a static deployment. No build step is required.

## Assets

See [ASSET_CREDITS.md](ASSET_CREDITS.md) for the source pages, authors, licenses and modifications. All downloaded assets used in this release are CC0. Their license notices are kept in `assets/licenses/`.

The environment and actors were generated together around a dark timber coastal station, navy sea, rain and small amber practical lights. The terminal is front-facing and the actors have subdued adult silhouettes. Furniture is baked into one coherent background; collision and approach positions live in `src/data/station.js` in a 640 × 400 coordinate space. The WebP background is 1280 × 800.

Echo's sheet has four columns, **down / right / up / left**, and three rows, **idle / first stride / second stride**. Each cell is 112 × 168, with feet at pixel 156. Mara uses one cell with the same scale and baseline. Characters are sorted by foot position so the foreground actor covers the one behind. See `assets/art-direction.md` for source prompts and the optional asset packing command. The packer only processes existing artwork; it does not draw the scene or characters.

Actors grow gradually toward the foreground, anchored at their feet. The terminal desk and chair are rendered again through separate SVG silhouette masks at their own floor depths, allowing them to cover actors walking behind them. These layers reuse the same cached background artwork. Desk, chair and Mara have separate collision footprints; the terminal can be used from its left or front approaches.

Only recommended targets show a centered, glowing gold beacon. Unrecommended props remain interactive through proximity and E, clicking their hotspot, or focusing their accessible button. The archive phase suggests Mara only after the required evidence has been collected.

Rain starts after Begin Night Shift, pauses when the page is hidden and stops on return to the title. Audio playback failures leave the game playable.

Run `node --experimental-vm-modules tests/audio.cjs` to check audio mute, visibility and replay behavior.
Run `node --experimental-vm-modules tests/world.cjs` to check the archive passage, desk/chair footprints, NPC clearance and perspective scale. The game-flow checks also verify which targets are recommended at each stage.
