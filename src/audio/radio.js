let soundOn = true;
let audio;
let cue = null;

export function isSoundOn() { return soundOn; }

export function toggleSound() {
  soundOn = !soundOn;
  if (!soundOn) stopSignal();
}

export function stopSignal() {
  if (!cue || !audio) return;
  cue.gain.cancelScheduledValues(audio.currentTime);
  cue.gain.setValueAtTime(0, audio.currentTime);
  cue = null;
}

export function playSignal() {
  if (!soundOn || !window.AudioContext) return;
  stopSignal();
  audio ??= new AudioContext();
  audio.resume().catch(() => {});
  cue = audio.createGain();
  cue.connect(audio.destination);
  const start = audio.currentTime + .05;
  for (let index = 0; index < 3; index += 1) {
    const time = start + index * .28;
    const click = audio.createOscillator();
    const envelope = audio.createGain();
    click.type = "triangle";
    click.frequency.setValueAtTime(1150, time);
    click.frequency.exponentialRampToValueAtTime(480, time + .04);
    envelope.gain.setValueAtTime(.0001, time);
    envelope.gain.exponentialRampToValueAtTime(.14, time + .004);
    envelope.gain.exponentialRampToValueAtTime(.0001, time + .044);
    click.connect(envelope).connect(cue);
    click.start(time);
    click.stop(time + .05);
  }
}

