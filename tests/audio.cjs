const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const instances = [];
class Clip {
  constructor(url) { this.url = url; this.paused = true; instances.push(this); }
  addEventListener() {}
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
}
let onVisibility;
const document = {
  hidden: false,
  addEventListener(event, callback) {
    assert.equal(event, "visibilitychange");
    onVisibility = callback;
  },
};

(async () => {
  const filename = path.resolve(__dirname, "../src/audio/sound.js");
  const module = new vm.SourceTextModule(fs.readFileSync(filename, "utf8"), {
    context: vm.createContext({ Audio: Clip, document, URL }),
    initializeImportMeta(meta) { meta.url = pathToFileURL(filename).href; },
  });
  await module.link(() => { throw new Error("Unexpected audio import"); });
  await module.evaluate();
  const audio = module.namespace;
  assert.equal(instances.length, 0, "Title screen should not autoplay");
  audio.startAmbience();
  const rain = instances[0];
  assert.equal(rain.loop, true);
  assert.equal(rain.paused, false);
  audio.startAmbience();
  assert.equal(instances.length, 1, "Repeated start must not layer rain loops");
  audio.playSignal();
  const firstSignal = instances.at(-1);
  audio.playSignal();
  assert.equal(firstSignal.paused, true, "Replay stops the previous signal");
  audio.toggleSound();
  assert.ok(instances.every(clip => clip.paused), "Mute stops all audible clips");
  const mutedCount = instances.length;
  audio.playEffect("button");
  audio.footstep(500);
  assert.equal(instances.length, mutedCount, "Muted actions do not start playback");
  audio.toggleSound();
  assert.equal(rain.paused, false, "Unmute resumes the rain");
  audio.playSignal();
  document.hidden = true;
  onVisibility();
  assert.ok(instances.every(clip => clip.paused), "Hidden pages should be silent");
  document.hidden = false;
  onVisibility();
  assert.equal(rain.paused, false);
  audio.stopAmbience();
  assert.ok(instances.every(clip => clip.paused));
  audio.toggleSound();
  audio.toggleSound();
  assert.equal(rain.paused, true, "Returning to title stays silent");
  console.log("PASS: gesture start, mute, signal replay, tab visibility and title silence");
})().catch(error => { console.error(error); process.exitCode = 1; });
