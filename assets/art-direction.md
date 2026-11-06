# Last Light: night station art

The visual target is a weathered maritime signal house at 23:42: dark timber,
navy sea, rain, distant harbor lights and small amber practical lamps. Furniture
shares one straight-on elevated perspective. Actors are adults in subdued work
coats, with the same texture and palette as the room. The central floor remains
open for walking. The game keeps its full-screen room and on-demand menus.

## Delivered assets

- `scenes/station-night.webp`: 1280 × 800 environment; furniture and practical
  lighting are painted into this image, not assembled from unrelated packs.
- `characters/echo-night.png`: 448 × 504 transparent sheet; columns **down,
  right, up, left**, rows **idle, first stride, second stride**.
- `characters/mara-night.png`: 112 × 168 transparent front-facing NPC.

Every actor cell is 112 × 168, silhouette height 144, foot baseline 156. Runtime
width is 56 units in the 640 × 400 world, giving a 72-unit adult silhouette. The
figure is taller than the desks, unlike the previous miniature chibi actors.
Collision geometry follows the final image, rather than the requested generation
coordinates: `src/data/station.js` is authoritative.

Runtime actor size varies with floor depth, from 0.92 at the back to 1.40 at the
front, scaling around the foot baseline. The desktop and chair use distinct
foreground silhouette masks and depth values. Their artwork comes from the same
background, retaining identical textures and lighting. The large rug is placed
under the terminal workstation and chair; the small entrance mat stays at the door.

All three visuals used the built-in OpenAI image-generation tool. Echo and Mara
used the new background as their style/palette reference. Downloaded CC0 audio is
retained; its sources are in `ASSET_CREDITS.md`.

## Generation prompts

### Background

Use case: stylized-concept. Asset type: FINAL playable RPG environment background,
landscape exactly 8:5 aspect ratio (1600x1000). Create a cohesive atmospheric
pixel-art cutaway room for LAST LIGHT, a lonely old maritime radio signal house
during a storm at 23:42. This is the ACTUAL EMPTY LEVEL BACKGROUND, not a concept
poster or UI mockup. Camera is a fixed elevated straight-on 3/4 RPG view, vertical
furniture edges, horizontal desk fronts, no isometric diagonals. Finely made
restrained pixel art, muted navy, petrol blue, weathered dark timber, little warm
amber lamplight; subtle texture and crisp pixel clusters, NO bright cartoon
colors. Composition on a normalized 640x400 canvas: upper 0-80 is black-blue rainy
night ocean, a distant breakwater and a small warm lighthouse towards upper right;
NO daylight or pale sky. Rectangular room exterior spans x32..608; back wall
x64..576 y80..145; side walls x32..64 and x576..608 extend to y352; dark wooden
plank WALKABLE FLOOR x64..576 y145..352. Bottom wall is cut away except a thin dark
threshold, central doorway x290..350 at bottom. A broad low panoramic window
across back wall x210..440 y90..137 gives a readable view of dark ocean, rain,
distant harbor light. At upper left x80..205 y148..198 is an antique analog marine
radio desk, small amber dial, reel recorder, low shaded amber lamp, practical worn
equipment facing the viewer. Upper right x470..558 y150..204 is a modest wooden
archive desk with old letters, logbooks; framed nautical chart on wall behind.
Lower right x408..540 y247..303 is a wooden communications desk with a SMALL
FRONT-FACING straight rectangular CRT terminal, muted green text screen and
aligned keyboard, facing towards the bottom edge; upright rectangular silhouette,
NO laptop and NO diagonally rotated screen. Small storage chest x70..112
y280..321. Back center around x319 y190 stays empty for separately rendered NPC.
Center x220..390 y200..315 is open dark wooden floor, optional very understated
worn small rug only if it doesn't dominate. Floor is darkest away from the 2
small warm practical lamps by radio and terminal. Night must be readable in actual
landscape features, not a gray filter. The warm little pools of light feel human
and isolated against the sea. All furniture shares one perspective, one pixel
scale, coherent late-20th-century harbor station aesthetic. No office cubicles,
no shiny parquet, no houseplant, no enormous boombox, no giant laptop, no
characters, no people, no UI, no lettering or watermark. Keep the room floor
large, walkable and unobstructed exactly in the layout described. Fill full image
with the scene.

### Echo

Use case: stylized-concept. Asset type: production RPG PLAYER WALK CYCLE SPRITE
SHEET on TRUE TRANSPARENT background. Input image is ONLY environment
style/palette reference, do not reproduce the room. Create Echo, young ADULT
night-shift maritime radio apprentice, short dark brown hair, muted desaturated
petrol-navy work coat over gray shirt, charcoal trousers, dark worn boots, small
cream collar, no neon, no bright blond hair, no fantasy costume, no hat. Adult
restrained silhouette about five head-heights, NOT round chibi, grounded
small-scale atmospheric pixel art that belongs in the supplied rainy timber signal
house. Lit softly from above, warm subdued skin and tiny amber rim, no bright
outlines. Technical layout: EXACTLY 4 equal-width columns and 3 equal-height rows
on transparent canvas, ideal canvas 1024x1152 with cells256x384. Every cell
contains ONE full-body identical character at consistent size and same center,
feet baseline at 90% of cell height, empty transparent gutters. Every column has
the same view: column1 FRONT facing camera DOWN, column2 PROFILE facing image
RIGHT with nose pointing RIGHT, column3 BACK facing away UP, column4 PROFILE
facing image LEFT with nose pointing LEFT. This exact down/right/up/left column
order is essential. Row1 standing neutral feet together. Row2 mid walk left foot
forward arms counter-swing. Row3 mid walk right foot forward arms counter-swing.
TWELVE total poses in a rigid 4x3 grid, no extras. Compact pixel clusters with
visible pixel steps rather than smooth vector or painterly illustration; preserve
adult proportions. No floor, no cast shadow, no scenery, no labels, no border, no
grid lines, no title, no lettering. True alpha background including all gutters.
Keep entire body visible in each cell and no overlap between cells.

### Mara

Use case: stylized-concept. Asset type: ONE production full-body RPG NPC sprite on
TRUE transparent background. The input is ONLY environment style and palette
reference; do not reproduce scenery. Mara, older ADULT woman maritime radio
station keeper in her late fifties, short swept-back graying dark hair,
charcoal-brown heavy wool work coat over a muted burgundy sweater, gray trousers
and dark worn boots. Gentle tired face, calm hands relaxed by sides. She faces
FRONT, looking slightly down toward player in a 3/4 overhead RPG camera matching
the supplied cutaway room. Entire full body visible, standing neutral with feet
together near same baseline. About five head-heights adult proportions, slim
restrained silhouette, NOT chibi, NOT cute mascot, no giant head, no bright yellow
or lime green. Restrained atmospheric pixel art with visible crisp pixel clusters,
muted navy shadows, tiny warm amber edge highlights, skin low-saturation natural
tan, detailed but readable at a final game height of only 40 pixels. She must
belong visually to the dark rainy signal-house reference, no white outlines, no
drop shadow, no halo. Single centered front-facing full-body character ONLY.
Genuinely transparent background. No floor, no objects, no text, no labels, no
grid. Include generous transparent margin on all sides.

## Packing

### Rug correction prompt

Use case: precise-object-edit. Edit target: the supplied EXISTING GAME BACKGROUND.
Make ONE localized correction to the large reddish rug at the LOWER RIGHT
workstation. It is currently floating awkwardly out to the LEFT of the computer
desk. Move that same rug to sit squarely UNDER the computer desk AND chair, with
its long edges parallel to the desk and floor planks. Its left edge should be
underneath the left desk pedestal, not sticking out into the central walking area;
its visible near edge should lie just in front of the chair's front feet. Restore
the rug's former exposed position to matching uninterrupted dark wooden floor
planks. Keep the SMALL existing entrance doormat at bottom center exactly unchanged.
CRITICAL INVARIANTS: preserve camera, entire room composition, canvas aspect 8:5,
exact window/wall/door geometry, all furniture positions and sizes, exact CRT
monitor shape and position, radio, lamps, chair, chest, sea, lighthouse, rain, wood
texture, every other object, lighting and color grade. Do NOT redesign the scene.
Do not move or resize the desk or chair. No people, no UI. Only reposition the one
larger rug and restore the exposed boards.

This correction also used the built-in image-generation tool. Use the corrected
background as the first input when repacking the current release.

### Runtime export

The final game scale was increased after visual inspection to match desk height.
`tools/prepare_art.py` performs technical resizing, alpha fringe cleanup and
equal-cell frame alignment. It draws no artwork. To repack generated sources:

```sh
python3 tools/prepare_art.py background.png echo-sheet.png mara.png
```

The exported runtime images are checked in, so playing or deploying the game
requires neither Pillow nor an image-generation service.
