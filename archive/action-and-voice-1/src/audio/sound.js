const audioRoot = new URL("../../assets/audio/", import.meta.url);
const clips = {
  button: ["button.ogg", .16],
  switch: ["switch.ogg", .28],
  paper: ["paper.ogg", .2],
  receipt: ["receipt.ogg", .18],
  signal: ["signal.ogg", .65],
  stepA: ["step-a.ogg", .09],
  stepB: ["step-b.ogg", .09],
};
let enabled = true;
let started = false;
const ambientTracks = [["harbor-rain.ogg", .24], ["harbor-waves.ogg", .18]];
let ambience = [];
let signal;
let lastStep = 0;
let stepSide = false;
const playing = new Set();

function supported() {
  return typeof Audio !== "undefined";
}

function play(clip) {
  const promise = clip.play();
  promise?.catch(() => playing.delete(clip));
}

function updateAmbience() {
  for (const clip of ambience) {
    if (enabled && started && !document.hidden) {
      if (clip.paused) play(clip);
    } else clip.pause();
  }
}

export function startAmbience() {
  if (!supported()) return;
  started = true;
  if (!ambience.length) ambience = ambientTracks.map(([filename, volume]) => {
    const clip = new Audio(new URL(filename, audioRoot).href);
    clip.loop = true;
    clip.volume = volume;
    return clip;
  });
  updateAmbience();
}

export function stopAmbience() {
  started = false;
  for (const clip of ambience) clip.pause();
  stopSignal();
  for (const clip of playing) clip.pause();
  playing.clear();
}

export function isSoundOn() { return enabled; }

export function toggleSound() {
  enabled = !enabled;
  if (!enabled) {
    stopSignal();
    for (const clip of playing) clip.pause();
    playing.clear();
  }
  updateAmbience();
}

export function playEffect(name) {
  if (!supported() || !enabled || document.hidden) return null;
  const [filename, volume] = clips[name];
  const clip = new Audio(new URL(filename, audioRoot).href);
  clip.volume = volume;
  // Repeated input should never build up an unbounded number of overlapping clips.
  if (playing.size >= 6) {
    const oldest = playing.values().next().value;
    oldest.pause();
    playing.delete(oldest);
  }
  playing.add(clip);
  clip.addEventListener("ended", () => playing.delete(clip), { once: true });
  clip.addEventListener("error", () => playing.delete(clip), { once: true });
  play(clip);
  return clip;
}

export function stopSignal() {
  if (!signal) return;
  signal.pause();
  playing.delete(signal);
  signal = null;
}

export function playSignal() {
  stopSignal();
  signal = playEffect("signal");
}

export function footstep(now) {
  if (now - lastStep < 310) return;
  lastStep = now;
  stepSide = !stepSide;
  playEffect(stepSide ? "stepA" : "stepB");
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopSignal();
    for (const clip of playing) clip.pause();
    playing.clear();
  }
  updateAmbience();
});
