# Point-and-click adventure game

The user supplies the story (`story/`). Claude builds everything else: the game
design, the engine, all art, voice, sound and music, and testing. Make decisions
yourself and explain them. Ask the user only about taste (style, casting, script
sign-off) and money (anything past the budget rules below).

## Stack
- **Game:** TypeScript + Vite + Canvas2D, a custom engine, no frameworks, in
  `game/`. Logical resolution 1920×1080. Runs in the browser.
- **Asset pipeline:** Python CLIs in `tools/`. They run from the project root with
  `.venv/bin/python -m tools.<name>`.
  - `fal_gen`: images (fal.ai: `image`, `edit`, `rmbg`, `run`).
  - `voice`: ElevenLabs voices, `tts`, `sfx`, `music`.
  - `vo_batch`: records voiceover from the line files.
  - `imgtools`: free local image work (fit, grid, overlay, trim, frames, patch, contact).
  - `booktools`: free picture-book tools (printfit, compose, guides, check, autoplace, render, proof).
  - `budget`: spend vs caps.

## Layout
```
story/                 the user's story material (read-only for us)
design/                our design docs: game.md, style.md, scenes/, characters/
assets/ref/            approved reference images (style anchor, character refs)
assets/raw/            drafts and intermediates; not shipped
assets/game/           final assets; Vite's public folder (paths in content JSON are relative to it)
assets/manifest.jsonl  log of every generation (prompt, model, cost); never edit by hand
assets/voices.json     character → ElevenLabs voice ID
game/src/engine/       the generic engine
game/content/          everything specific to this game: scenes, lines, items, characters, dialogues
tools/                 Python asset pipeline
budget.json            spending caps; the user's alone to change
book/                  the picture book (optional): book.md, book.json, text.json, layout/, fonts/, out/ (generated)
assets/book/art/       print-ready book art (not shipped with the game)
```

## Workflow and skills
Load the skill before doing that kind of work:

1. **game-design**: story → `design/` docs and a cost estimate. Needs user approval.
2. **art-bible**: art style, `style.md`, the style anchor, character references.
   Needs user approval.
3. **engine**: architecture, content formats, scripting API, conventions.
   Also bootstraps `game/`.
4. **scene-build**: one scene, end to end: greybox → art → geometry → sprites →
   lines/VO → verify.
5. **image-assets** / **audio-assets**: how each kind of asset is made, processed
   and stored.
6. **playtest**: headless walkthroughs plus a real Chrome session. Required before
   reporting anything as done.

`game/` already exists: it came from the template and holds a small sample game
in `game/content/` (see the engine skill, "Sample content"). Replace it with the
real game's content; don't re-bootstrap the engine.

Order of work: design the whole game → style → engine + greybox all scenes
(free) → art and audio scene by scene → polish.

**Picture book** (optional: a print adaptation of the finished game, same style and
characters):
7. **book-adapt**: author + editor. Format, page plan, text, editorial passes.
   Format, page plan and text need user approval.
8. **book-art**: print illustrations by reusing game art and refs, generating new
   images where needed, upscaling (SeedVR ×2) and fitting to print size. The first
   spread is a look test for the user.
9. **book-layout**: DTP in HTML/CSS → PDF via headless Chrome, proofs, preflight,
   cover, printer specs. The user picks the printer.

Book rules: the text lives only in `book/text.json`. Upscaling with fal is
approved for book finals; 4K generation still needs asking. The spending rules
below apply to the book too.

## Ground rules
- **Greybox first.** Puzzle logic must be playable with placeholders before any
  paid art for that scene.
- **Look at every generated image** (Read) before using it. I can't hear audio:
  the user judges voices, and they should spot-check VO.
- All story text goes through line IDs in `game/content/lines/`, never
  hard-coded in scripts.
- `cd game && npm run check && npm test` must pass before any handover.

## Spending rules (paid APIs: fal.ai, ElevenLabs)
- **Never edit the caps in `budget.json`.** Only the user changes them. If a cap
  blocks work, stop and ask.
- **Ask before any batch.** Before a run of more than 5 paid generations, or more
  than $1 on fal / 3,000 ElevenLabs credits, list what will be generated with
  `--dry-run` estimates and wait for approval.
- **Prototype cheap, finalize once.** Explore a look at `--resolution 1K` with
  `--num 1`. Render at 2K only after the user approves the look. Never use 4K
  unless asked.
- **Don't re-roll blindly.** If a result is off, change the prompt or references
  first. Stop after 3 attempts at one asset and show the user what came out.
- **Don't regenerate what exists.** Only use `--force` when an asset really
  needs replacing, and say so.
- **Voiceover waits for the final script.** Record only after a scene's dialogue
  is locked. The game runs on subtitles until then.
- **Reuse instead of regenerating.** Get variants with `edit` from approved
  references. Reuse generic sfx across scenes.
- Run `python -m tools.budget` at the start of each asset session, and report
  the spend when the session ends.
