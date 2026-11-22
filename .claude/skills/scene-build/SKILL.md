---
name: scene-build
description: End-to-end recipe for turning one designed scene (design/scenes/<id>.md) into a playable, art-complete scene in the game — greybox, background, geometry placement, sprites, scripting, lines, audio and playtest — with approval checkpoints. Use whenever the user asks to build, finish or revise a scene.
---

# Building a scene

This skill orchestrates the others. Load **engine** before writing code,
**image-assets** before generating images, **audio-assets** before audio, and
**playtest** to verify.

Track progress with a checklist in the scene doc's footer (`## Build status`),
so work can resume in a later session.

## 0. Preconditions
- `design/scenes/<id>.md` exists and the user has approved it (**game-design** skill).
- `design/style.md` and `assets/ref/style_anchor.png` exist (**art-bible** skill).
- Every character in the scene has an approved reference, or is greyboxed for now.
- Run `python -m tools.budget` and note the spend so far.

## 1. Greybox: free, done before any paid call
1. Write `game/content/scenes/<id>/scene.json` with rough geometry. A placeholder
   background is fine: the engine draws labelled boxes for missing art.
2. Write `scene.ts`, the lines JSON (draft text), dialogues and any new items.
3. `npm run check`, plus a walkthrough JSON for the scene's puzzles, then `npm test`.
4. Playtest the logic in the browser.
   **The puzzle logic must work before we pay for art**, because art doesn't fix
   design problems, and redesigning after the art exists is expensive.

## 2. Background (checkpoint)
1. Make a 1K draft per **image-assets** → Backgrounds. Check it with Read against
   the hotspot table: is every hotspot present, visible, and where the doc says?
2. **Show the user the draft** together with the scene doc's purpose. Wait for an
   OK or for notes.
3. Make the 2K final, then `imgtools fit`, giving `assets/game/scenes/<id>/bg.png`.

## 3. Geometry placement: free
1. `python -m tools.imgtools grid game/scenes/<id>/bg.png --out raw/<id>/grid.png`,
   then Read it.
2. Write the real polygons into `scene.json`:
   - **walkable:** trace the visible floor, staying ~20 px inside walls and
     furniture bases. Put bases of furniture characters walk around in `blocked`.
   - **hotspots:** a tight polygon around each object's *visible* outline. 4–8
     points is plenty; err slightly generous for small things.
   - **walk_to:** a floor point in front of the object, inside `walkable`. **face**
     the object.
   - **exits:** the doorway or screen edge. `walk_to` sits just inside the walkable
     area near it.
   - **scale:** pick near_y at the floor's front edge and far_y at its back. Set
     `near`/`far` so the hero is believable next to a door (~80% of door height)
     at both.
   - **spawns:** one per incoming exit, standing just inside the walkable area by that exit.
3. `python -m tools.imgtools overlay <id> --out raw/<id>/overlay.png`, then Read it.
   Fix the polygons until they hug their objects, then fix the scale boxes until
   they look right at the front and back of the room. Do two or three passes;
   it's free.
4. Confirm in the browser with `?scene=<id>&debug=1`: hover each hotspot and walk
   to the corners.

## 4. Sprites and state art
In this order, each per **image-assets**: pickups (world sprite + icon) → state
patches and variants → foreground occluders → any new character poses or anims
the scene needs. Add each to `scene.json`/`items.json`/`characters.json`, then
re-run the overlay.

## 5. Lines and audio
1. Polish the line text in `lines/<id>.json`. Re-read it as the character: is it
   short, in their voice, and does it carry the hints the design doc lists?
2. **Show the user the scene's script** (all its lines) and get it locked.
3. `python -m tools.vo_batch --scene <id>` (plan) → ask → `--go`.
4. Sound: reuse existing sfx first, then generate what's missing. Set the
   ambience and music in `scene.json`.

## 6. Verify and hand over
1. `npm run check` (no errors) and `npm test` (the walkthrough passes).
2. **playtest** skill: a full pass in Chrome, with screenshots of the scene at rest,
   the debug overlay, and each puzzle beat.
3. Report to the user: what was built, the screenshots, spend for this scene
   (the difference in `python -m tools.budget`), and any known rough edges.
4. Tick off the `## Build status` checklist in the scene doc.

## Revisions
- Moving a hotspot or changing a line: edit and re-run checks. Free.
- Changing a line's text after VO: `vo_batch --stale` re-records only the changed lines.
- New background: geometry has to be re-placed (step 3). Make sure the
  user really wants it.
