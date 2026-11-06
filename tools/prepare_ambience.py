"""Prepare the two Pixabay recordings as interior ambience loops.

Usage: python3 tools/prepare_ambience.py OCEAN_WAVES.mp3 CALMING_RAIN.mp3
Requires ffmpeg and NumPy. Original downloads stay outside the published repository.
"""
from pathlib import Path
import subprocess
import sys
import tempfile
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]


def export(source, filename, start, duration, artist):
    overlap = 2
    # Play source[overlap:end], blending its last seconds into source[0:overlap].
    # The next loop then continues at source[overlap] without fading to silence.
    with tempfile.TemporaryDirectory(prefix="last-light-audio-") as folder:
        decoded = Path(folder) / "decoded.wav"
        packed = Path(folder) / "loop.wav"
        subprocess.run([
            "ffmpeg", "-nostdin", "-y", "-hide_banner", "-loglevel", "error",
            "-i", str(source), "-ss", str(start), "-t", str(duration),
            "-af", "highpass=f=55,lowpass=f=6800,loudnorm=I=-20:TP=-3:LRA=7",
            "-ar", "32000", "-ac", "2", "-c:a", "pcm_s16le", str(decoded),
        ], check=True)
        with wave.open(str(decoded), "rb") as recording:
            rate = recording.getframerate()
            samples = np.frombuffer(recording.readframes(recording.getnframes()),
                                    dtype="<i2").reshape(-1, 2).astype(np.float64) / 32768
        if abs(len(samples) / rate - duration) > .1:
            raise ValueError(f"Incomplete source decode: {filename}")
        count = overlap * rate
        phase = np.linspace(0, np.pi / 2, count)[:, None]
        blend = samples[-count:] * np.cos(phase) + samples[:count] * np.sin(phase)
        result = np.concatenate([samples[count:-count], blend])
        result *= min(1, .95 / max(.001, np.abs(result).max()))
        with wave.open(str(packed), "wb") as output:
            output.setnchannels(2)
            output.setsampwidth(2)
            output.setframerate(rate)
            output.writeframes((result * 32767).astype("<i2").tobytes())
        subprocess.run([
            "ffmpeg", "-nostdin", "-y", "-hide_banner", "-loglevel", "error",
            "-i", str(packed), "-c:a", "libvorbis", "-q:a", "1",
            "-metadata", f"artist={artist} via Pixabay", "-metadata",
            "comment=Pixabay Content License; edited for Last Light game ambience",
            str(ROOT / "assets/audio" / filename),
        ], check=True)
        print(f"{filename}: {len(result) / rate:.2f}s")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    export(sys.argv[1], "harbor-waves.ogg", 0, 58, "DRAGON-STUDIO")
    export(sys.argv[2], "harbor-rain.ogg", 10, 70, "Liecio")
