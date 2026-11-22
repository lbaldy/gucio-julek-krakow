---
name: image-assets
description: Produce game-ready images with fal.ai and the local image tools — scene backgrounds, background state changes, character poses, walk/talk animation, world items and inventory icons — including prompt recipes, processing steps, file locations and visual QA. Use whenever an image asset is needed.
---

# Image assets

Requires `design/style.md` and `assets/ref/style_anchor.png` (see the
**art-bible** skill). Every command below runs from the project root. Paths are
relative to `assets/`.

## Where files go

| What | Raw drafts | Final (shipped, served to the game) |
|---|---|---|
| background | `raw/<scene>/bg_v<n>.png` | `game/scenes/<scene>/bg.png` (1920×1080) |
| bg state patch | `raw/<scene>/…` | `game/scenes/<scene>/<what>_<state>.png` |
| foreground occluder | | `game/scenes/<scene>/fg_<what>.png` |
| character pose | `raw/chars/<id>/…` | `game/chars/<id>/<anim>_r/00.png …` |
| world item sprite | `raw/items/…` | `game/items/<id>_world.png` |
| inventory icon | | `game/items/<id>.png` (256×256) |

`assets/game/` is the game's public folder: the engine loads these paths as
`scenes/attic/bg.png` and so on.

## Always

- Start every prompt with the style prompt from `design/style.md`. Pass
  `--ref ref/style_anchor.png` for backgrounds and props, and pass the character
  reference for anything with a character in it.
- Drafts at `--resolution 1K`, finals at `2K`. One image per call (`--num 1`).
- **Look at every result with Read** before using it. Check: style match, the
  layout the scene doc asked for, no stray people or text, and anatomy on
  characters. Say what's wrong before re-rolling, and fix the prompt rather than
  rolling the dice. Stop at 3 attempts and show the user.
- Never overwrite a final; produce `_v2` drafts instead.

## Backgrounds

1. Draft from the scene doc's **Visual** section:
   ```
   python -m tools.fal_gen edit "<style prompt>. Point-and-click adventure game background: <visual description>. Composition: <left / centre / right layout>. Walkable floor across the lower third. Eye-level camera, 16:9. Empty scene: no people, no text. Use the art style of the reference image; do not copy its content." \
     --ref ref/style_anchor.png --out raw/<scene>/bg_v1.png --aspect 16:9 --resolution 1K
   ```
2. Check it with Read. Every hotspot from the scene doc must be visible and
   clickable-sized: at least ~80 px in the final, and not hidden behind other things.
3. Final: the same prompt at `--resolution 2K`, with the approved draft as a
   second `--ref` and "keep the composition of the second image exactly". Then:
   ```
   python -m tools.imgtools fit raw/<scene>/bg_final.png --out game/scenes/<scene>/bg.png --anchor bottom
   ```
4. **Pickups are never painted in.** They're separate sprites, so they can disappear.

## Background state changes (door opens, drawer emptied, lamp lit)

Edit the final background to the new state, then cut out just the changed region:
```
python -m tools.fal_gen edit "Same image, change only: the wooden door is now open, showing a dark corridor. Keep everything else pixel-identical." \
  --ref game/scenes/<scene>/bg.png --out raw/<scene>/bg_door_open.png --aspect 16:9 --resolution 2K
python -m tools.imgtools fit raw/<scene>/bg_door_open.png --out raw/<scene>/bg_door_open_fit.png --anchor bottom
python -m tools.imgtools grid raw/<scene>/bg_door_open_fit.png --out raw/<scene>/grid_door.png   # find the changed box
python -m tools.imgtools patch raw/<scene>/bg_door_open_fit.png --box x0,y0,x1,y1 --out game/scenes/<scene>/door_open.png
```
The engine draws the patch at (x0, y0) when the state flag is set. If the edit
shifted the whole image, so the patch's edges show a seam, use a full variant
background (`bg_<state>.png`) instead.

**Crop-edit (better for small changes):** full-image edits drift, repaint, and *add* things
(a foreground table, "FLOUR" printed on a bag, a "HO HO HO" speech bubble). Instead:
1. Crop the region with some margin and edit only the crop at 1K.
2. Resize the result back to the crop size.
3. Colour-match it to the background: fit a per-channel linear map (`np.polyfit`) on the
   pixels that didn't change, iterating two or three times as the unchanged set settles.
4. Cut the patch with a soft mask: the difference mask, or a hand shape (a rectangle over a
   whole shelf beats an ellipse that leaves a glow outline).

Always say "no text, no letters" in edit prompts, and Read the result.
Script gotcha: `ImageDraw.floodfill` on `Image.fromarray(array)` silently does nothing (the
image is read-only); call `.copy()` first.

## Foreground occluders

These are things the character walks *behind*, like a pillar or a table edge.
Cut them with `patch` using `--feather 0` and a tight box, then tidy the alpha
with an rmbg pass if the shape isn't rectangular:
`python -m tools.fal_gen rmbg raw/<scene>/pillar_crop.png --out raw/<scene>/pillar_cut.png`.
Set their `baseline` (the y-coordinate of their foot line) in scene.json.

## Characters

Every pose is an `edit` of the approved reference: `assets/ref/chars/<id>.png`.

1. **Poses** (idle, talk, reach, pick up, look at the camera…):
   ```
   python -m tools.fal_gen edit "Keep the character exactly as in the reference (face, outfit, colours, proportions, art style). New pose: <pose>, facing right, full body, feet visible, plain flat light-grey background." \
     --ref ref/chars/<id>.png --out raw/chars/<id>/<pose>.png --aspect 2:3 --resolution 1K
   python -m tools.fal_gen rmbg raw/chars/<id>/<pose>.png --out raw/chars/<id>/<pose>_cut.png
   python -m tools.imgtools trim raw/chars/<id>/<pose>_cut.png --height <height_px> --out game/chars/<id>/<pose>_r/00.png
   ```
   `height_px` is the character's height at scale 1.0, from
   `game/content/characters.json`. Use the same value for every pose, so the
   character doesn't change size.
2. **Facing left** is the engine flipping the right-facing frames. Only draw a
   left version when the design is asymmetric (an eyepatch, or text on a shirt).
3. **Talking:** generate a mouth-open and a mouth-mid variant of `idle`. The engine
   cycles them while voiceover plays (3 frames: closed, mid, open).
4. **Walking:** start frugal. The engine fakes a walk with a bob and squash
   on the idle frame, which is fine for prototypes. For final art:
   - *Sprite sheet* (cheap, ~$0.08): "sprite sheet, single row of 6 frames,
     walk cycle facing right, evenly spaced, same character, plain light-grey
     background". Then run rmbg and
     `python -m tools.imgtools frames … --cols 6 --height <height_px> --out-dir game/chars/<id>/walk_r`.
     Check that the frames are consistent; contact-sheet them.
   - *Video* (better; after the user approves; ~$0.36 per character). Proven on an
     earlier game:
     1. `edit` a strict side-profile pose facing right from the reference, plain
        flat light-grey background, `--aspect 9:16`.
     2. `fal_gen run fal-ai/kling-video/v2.1/standard/image-to-video --units 5`
        with `{"image_url": "file:…profile.png", "duration": "5", "prompt": "…walks
        steadily to the right… strict side profile. The camera tracks sideways with
        him so he stays centred… plain flat light-grey background…"}` ($0.28).
     3. `python -m tools.imgtools walkloop raw/chars/<id>/walk/kling_v1.mp4 --height <height_px> --out-dir game/chars/<id>/walk_r`
        finds the loop, keys out the flat background locally (no rmbg needed),
        aligns frames on torso + ground line, and prints the stride.
     4. In `characters.json` set `walk_r` frames/fps and `speed = stride × fps`,
        so the feet don't skate (e.g. 12 px × 18 fps = 216).
     - **Pale characters on the light-grey backdrop** (cream fur, white clothes): `imgtools`
       keys only the background connected to the frame border, after closing the silhouette.
       Contact-sheet the cut on the dark backdrop anyway; holes show as dark blotches.
     - **Kling invents props.** "Batting at something" added a dangling pompom. Prompt for
       "empty air" or remove it afterwards (it hangs from the top edge, so take bright pixels
       connected to the top row). Use "the camera does not move" for in-place actions, and
       cut those with a fixed crop rather than `walkloop`'s alignment.
     - **Animals walk slowly in Kling** (a cat's stride is about 4 px per output frame). Play
       the cycle faster (20 fps), keep scripted paths short, and generate a separate run
       video for chases (`run_r` + `run_speed`). Get a "stand" pose from the end of an action
       clip, so the actor doesn't fall back to an unrelated idle (lying down) between moves.
     - Size an animal against the kids with the anim's `"scale"`, not by re-cutting frames.
5. Record each animation's frame count and fps in `characters.json`.

## Items

- **World sprite:** an edit with the style anchor: "<item>, single object, 3/4 view,
  plain flat light-grey background, lighting from <scene light direction>". Then
  rmbg, then trim. Size it to its place in the scene. Put it in scene.json `objects`.
- **Inventory icon:** an edit of the world sprite: "same object, centred, slightly
  larger, soft drop shadow, square". Then rmbg, then
  `trim --height 220 --canvas 256x256`.
- For items picked up from a painted spot, the world sprite can be a `patch` of
  the background instead. It's free and matches perfectly.

## Visual QA checklist (before calling an asset done)

- [ ] Matches style.md and the anchor; it doesn't stand out next to existing assets
      (make a contact sheet with neighbours when in doubt).
- [ ] No people or text in backgrounds; no stray limbs or extra fingers on characters.
- [ ] Multi-character pictures (cards): every character in their reference outfit. Pass
      each reference and name the outfit in the prompt; outfits drift (the wrong pyjamas,
      Santa in his nightshirt when he should be in his red coat). A follow-up edit
      ("change only the clothes") is cheaper than a re-roll.
- [ ] The scene's own logic holds: no snow indoors by a burning fireplace, night stays night.
- [ ] Transparent sprites have clean edges (Read the cut on a dark background
      via `contact`, which uses a grey backdrop).
- [ ] Final file is at the path from the table and referenced in content JSON.
- [ ] Logged automatically in `assets/manifest.jsonl` (the generators do this).
