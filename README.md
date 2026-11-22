# Adventure game template

A point-and-click adventure kit: a TypeScript/Canvas2D engine (`game/`), a Python
asset pipeline (`tools/`), and Claude Code skills (`.claude/skills/`) that take a
story to a finished game. `CLAUDE.md` describes the workflow.

## Starting a new game
1. Copy this folder (or `git clone` it) under a new name, and run `git init` if you copied it.
2. Put your story material in `story/`.
3. Set the caps in `budget.json` for this game.
4. Asset pipeline setup (below), then `cd game && npm ci && npm run check && npm test`.
5. `npm run dev` runs the sample game (intro → attic → hall) as greybox placeholders.
   It's there to show every content format; the engine skill says when to delete it.
6. Ask Claude to start with the **game-design** skill.

# Asset pipeline

Python CLIs for generating game assets. Every output goes under `assets/` and is
logged to `assets/manifest.jsonl`. An existing file is never overwritten unless
`--force` is passed, so a re-run never pays for the same asset twice.

## Setup
    python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
    cp .env.example .env   # fill in FAL_KEY and ELEVENLABS_API_KEY

## Images: fal.ai (`python -m tools.fal_gen`)
| command | purpose | default model |
|---|---|---|
| `image` | text → image (backgrounds, concept art) | `fal-ai/nano-banana-2` |
| `edit`  | reference image(s) + prompt → consistent variants (character poses, room states) | `fal-ai/nano-banana-2/edit` |
| `rmbg`  | transparent PNG cut-outs for sprites and items | `fal-ai/birefnet/v2` |
| `run`   | any fal model with raw JSON (video, upscaling, …); `"file:path"` strings are uploaded | — |

## Audio: ElevenLabs (`python -m tools.voice`)
| command | purpose |
|---|---|
| `design` / `pick` | create a voice for a character from a text description |
| `assign` | map an existing voice ID to a character (`assets/voices.json`) |
| `tts` | speak a line as a character |
| `sfx` | sound effects / looping ambience |
| `music` | background music |
| `voices` / `models` | list what the account has |

## Budget
`budget.json` sets a per-call cap and a total cap for each service. Before every
paid call, the scripts estimate its cost and refuse it if it would break a cap.
Add `--dry-run` to any command to see the estimate without generating anything.
`python -m tools.budget` shows spend so far, tallied from the manifest.

## Free local tools
- `python -m tools.imgtools`: fit, grid, overlay, trim, frames, patch and contact
  (see `--help`).
- `python -m tools.vo_batch`: records voiceover for lines in
  `game/content/lines/` that have no recording yet or have changed. Without
  `--go`, it only shows the plan and cost.
- `python -m tools.booktools`: picture-book production (printfit, compose, guides,
  check, autoplace, render to PDF with headless Chrome, proof). Optional; see the
  `book-*` skills.

See `CLAUDE.md` and `.claude/skills/` for the full workflow.
