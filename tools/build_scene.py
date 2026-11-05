"""Assemble downloaded pixel tiles into the authored station layout. Requires Pillow."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
layout = json.loads((ROOT / "assets/scenes/station.layout.json").read_text())
sheets = {}
for name, filename in layout["sheets"].items():
    image = Image.open(ROOT / filename).convert("RGBA")
    # The original city export uses a magenta color key despite its filename.
    image.putdata([(r, g, b, 0 if (r, g, b) == (255, 0, 255) else a)
                   for r, g, b, a in image.getdata()])
    sheets[name] = image

scene = Image.new("RGBA", tuple(layout["size"]), (17, 30, 39, 255))
for layer in layout["layers"]:
    sheet = sheets[layer["sheet"]]
    if "tile" in layer:
        tx, ty = layer["tile"]
        patch = sheet.crop((tx * 17, ty * 17, tx * 17 + 16, ty * 17 + 16))
    else:
        patch = sheet
    patch = patch.resize(tuple(layer.get("size", [32, 32])), Image.Resampling.NEAREST)
    for y in range(layer["at"][1], layer["at"][1] + layer.get("repeat", [1, 1])[1] * patch.height, patch.height):
        for x in range(layer["at"][0], layer["at"][0] + layer.get("repeat", [1, 1])[0] * patch.width, patch.width):
            scene.alpha_composite(patch, (x, y))
scene.save(ROOT / "assets/scenes/station.png", optimize=True)
