---
name: game-design
description: Turn the user's story (story/) into a playable adventure design — scenes, puzzles, characters, items, dialogue drafts and a cost estimate — written to design/. Use when new story material arrives, or before building any scene that has no design doc yet.
---

# Game design: story → design docs

The story is the user's. The game design is ours. Our job is to turn the story into
something *playable*: places to explore, objects to examine, and puzzles whose
solutions follow the story's logic.

## Inputs and outputs

- Read: everything in `story/` and the existing `design/`. Never overwrite
  design decisions the user has already approved; amend them and flag the change.
- Write:
  - `design/game.md`: premise, tone, protagonist, chapter list, scene graph,
    full item list, puzzle dependency chart, cast list, scope and cost estimate.
  - `design/scenes/<scene_id>.md`: one per scene (template below).
  - `design/characters/<char_id>.md`: personality, look (for art), voice brief
    (for casting), speech style with 3 sample lines.

## Process

1. **Read the story twice.** First for plot, then for *things*: places, objects,
   obstacles, secrets, and people who want something.
2. **Scene list.** Each scene is one screen (one background). Merge locations
   that don't earn a screen. Draw the connections as a mermaid graph in
   `game.md`.
3. **Puzzle dependency chart.** A mermaid graph from the start state to the
   ending: nodes are puzzles or events, edges are "requires". Keep it wide, not
   long: at most points, 2–3 open puzzles should be solvable in parallel.
4. **Per-scene docs** using the template.
5. **Cost estimate** in `game.md` (see the table below). Show it to the user.
6. **Stop for approval.** Summarize the scene list, the puzzle chart and the
   cost to the user before any assets are generated.

## Adventure design rules (non-negotiable)

- **No dead ends.** The player can never reach an unwinnable state. If an item
  can be used up, either it can be obtained again or every puzzle that needs it
  is finished first.
- **Fair puzzles.** Every solution is hinted at in-world before it's needed: a
  look response, a line of dialogue, or something in the art. Write down where
  each hint lives.
- **Everything answers.** Every hotspot has a `look` line. Interacting with
  something useless gets a characterful refusal, never silence.
- **Item combinations:** only combinations that make sense to someone who
  hasn't read the design. A generic "that won't work" fallback covers the rest.
- **Moon logic ban:** if the solution needs explaining afterwards, redesign it.
- **Hidden things are partly visible** (especially for young players). A parrot shut inside a
  cupboard couldn't be guessed; its tail poking out of the door fixed it. Change the art and
  the look line, then remove the hint patch once the thing is found.
- **For pre-readers:** dialogue options read themselves aloud on hover, every clickable thing
  changes the cursor, and the ending is told in pictures and voice, like the intro (picture
  cards in story order, with the end title over the last one, not on a black screen).
- **Talk to characters:** dialogue trees with 2–4 options. Topics unlock from
  events. Always include an exit option.
- **Scope:** 4–8 hotspots and 0–2 pickups per scene. More means clutter in the
  art and more cost.

## Scene doc template (`design/scenes/<scene_id>.md`)

```markdown
# <Scene name> (`<scene_id>`)
Chapter: <n> · Connects to: <scene_ids> · Music: <mood> · Ambience: <sounds>

## Purpose
What the player learns or achieves here, in one or two sentences.

## Visual (for the art prompt)
Camera/composition, time of day, lighting, mood, key props and *where* they sit
(left/centre/right, foreground/back). The floor area where characters walk.
No characters, no pickup items, no text in this description.

## Hotspots
| id | name | where | look | interact | notes |
|----|------|-------|------|----------|-------|
| window | dusty window | back wall, centre | "…" | refuses: "…" | hint for X |

## Pickups (separate sprites, not painted into the background)
| id | name | where | look | state art needed |

## State changes painted into the background
e.g. door closed → open (needs a patch or variant background).

## Characters present
<char_id>: position, what they want, dialogue topics.

## Puzzles
Steps, required items or flags, where the hint lives.

## Lines (draft)
`<scene>.<target>.<verb>`: speaker: "text"
```

## IDs and naming

`snake_case` everywhere. A scene is a place name (`harbor_dock`), a hotspot is a
thing (`rusty_anchor`), and a flag is a past-tense fact (`door_unlocked`). Line IDs
are `<scene>.<target>.<verb>[.<n>]`, e.g. `attic.window.look`,
`attic.chest.use.key`, `attic.old_man.talk.intro.3`.

## Cost estimate table (put this in game.md)

Unit costs: fal image or edit $0.08 at 1K and $0.12 at 2K (estimate). Background
removal ≈ $0.006. TTS ≈ 1 credit per character on `eleven_multilingual_v2`.
SFX ≈ 40 cr/s. Music ≈ 2,000 cr/min (estimate).

| item | count | unit | total |
|---|---|---|---|
| style exploration | ~6 images | $0.08 | |
| backgrounds (2 drafts + 1 final each) | scenes × 3 | ~$0.09 | |
| background state variants | | $0.12 | |
| character refs + poses | chars × ~8 | $0.08 | |
| walk/talk animation | | | |
| items (world + icon) | items × 2 | $0.08 | |
| voice design | chars × 1 | ~1,000 cr | |
| VO | total chars of dialogue | 1 cr/char | |
| SFX / ambience / music | | | |

Compare the total with `budget.json` and tell the user if the caps will need
raising. Never raise them yourself.
