# Last Light

A short browser RPG set in a harbor radio station on a stormy night. Explore the room, review an old signal with Mara, and take a shift at the dispatch terminal.

## Project structure

| Path | Responsibility |
| --- | --- |
| `index.html` | Game surface and dialog containers |
| `src/main.js` | Game startup, player input, chapter progression and scene interactions |
| `src/core/navigation.js` | Collision-aware route search and spatial calculations |
| `src/data/station.js` | Interaction positions and collision geometry |
| `src/data/story.js` | Chapter objectives and training dialogue data |
| `src/ui/dialog.js` | Dialog rendering, action buttons and modal lifecycle |
| `src/audio/sound.js` | Downloaded ambience and effects, muting and playback lifecycle |
| `src/scenes/radio.js` | Receiver bench, recorded signals and comparison puzzle |
| `src/scenes/call.js` | Nell’s live call, evidence reports and follow-up reactions |
| `src/ui/signal.js` | Accessible waveform views |
| `tests/game-flow.cjs` | Module-based interaction and branching regression checks |
| `src/styles/game.css` | Scene, character and menu presentation |
| `assets/scenes/` | Exported station background and editable tile layout |
| `assets/characters/` | Downloaded four-direction character sheets |
| `assets/tilesets/` | Original downloaded environment atlases |
| `assets/props/` | Downloaded electronics sprites |
| `assets/audio/` | Compressed rain, movement and device recordings |
| `assets/ui/` | Game icon |

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

The environment is assembled from downloaded Kenney tiles and Airos electronics. Rebuild the exported scene with `python3 tools/build_scene.py` after installing Pillow. Its authored layout is `assets/scenes/station.layout.json`. This tool arranges existing pixels and removes the source atlas's magenta color key.

Fleurman character sheets contain four columns for down, left, up and right, and three rows of walk frames. They are used without image edits. Rain starts after Begin Night Shift, pauses when the page is hidden and stops on return to the title. Audio playback failures leave the game playable.

Run `node --experimental-vm-modules tests/audio.cjs` to check audio mute, visibility and replay behavior.
