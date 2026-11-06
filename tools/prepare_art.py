"""Pack generated artwork for the static game; no artwork is drawn by this tool.

Usage: python3 tools/prepare_art.py BACKGROUND PLAYER_SHEET MARA
Requires Pillow. Player: columns down/right/up/left, rows idle/left/right stride.
"""
from pathlib import Path
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
FRAME = (112, 168)
BASELINE = 156
HEIGHT = 144


def pack_actor(image):
    image = image.convert("RGBA")
    alpha = image.getchannel("A")
    image.putalpha(alpha.point(lambda a: 0 if a < 160 else a))
    bounds = image.getchannel("A").getbbox()
    if not bounds:
        raise ValueError("Actor frame is empty")
    actor = image.crop(bounds)
    width = round(actor.width * HEIGHT / actor.height)
    if width > FRAME[0]:
        raise ValueError("Actor exceeds the frame width")
    actor = actor.resize((width, HEIGHT), Image.Resampling.LANCZOS)
    frame = Image.new("RGBA", FRAME)
    frame.alpha_composite(actor, ((FRAME[0] - width) // 2, BASELINE - HEIGHT))
    return frame


def main(background, player_sheet, mara):
    Image.open(background).convert("RGB").resize(
        (1280, 800), Image.Resampling.LANCZOS
    ).save(ROOT / "assets/scenes/station-night.webp", quality=88, method=6)
    source = Image.open(player_sheet).convert("RGBA")
    sheet = Image.new("RGBA", (FRAME[0] * 4, FRAME[1] * 3))
    for row in range(3):
        for column in range(4):
            box = (round(column * source.width / 4), round(row * source.height / 3),
                   round((column + 1) * source.width / 4), round((row + 1) * source.height / 3))
            sheet.alpha_composite(pack_actor(source.crop(box)),
                                  (column * FRAME[0], row * FRAME[1]))
    sheet.save(ROOT / "assets/characters/echo-night.png", optimize=True)
    pack_actor(Image.open(mara)).save(ROOT / "assets/characters/mara-night.png", optimize=True)


if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    main(*sys.argv[1:])
