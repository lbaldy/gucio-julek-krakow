---
name: book-art
description: Make print-ready picture-book illustrations — full-bleed spreads, single pages, spot illustrations and the cover — by reusing the game's art and references, generating new images where the story needs them, upscaling with fal and fitting to exact print size with bleed. Includes composition rules for text space and the gutter, cost estimates and print QA. Use for any image that goes into the book.
---

# Book art

Requires an approved page plan (`book/book.md`, see **book-adapt**) and the game's
art bible (`design/style.md`, `assets/ref/`). The book uses **the game's style**:
same style prompt, anchor and character refs. A book must not look like a different
artist drew it. Follow the **image-assets** rules: look at every image with Read,
fix the prompt instead of re-rolling, stop after 3 attempts, never overwrite a final.

Run `python -m tools.budget` at the start of every art session and report the
spend at the end. All commands run from the project root; paths are relative to `assets/`.

## Print size (from book.json `format`; book.md "Format" has the current numbers)

Pixels = (trim + 2 × bleed) / 25.4 × dpi. A spread is two trims wide.
| format | spread px (aspect) | page px (aspect) | generate spreads / pages at |
|---|---|---|---|
| A5 portrait 148 × 210 (home print, saddle-stitched) | 3567 × 2551 (≈ 1.40) | 1819 × 2551 (≈ 0.71) | `4:3` / `3:4` |
| square 216 × 216 | 5173 × 2622 (≈ 1.97) | 2622 × 2622 | `16:9` / `1:1` |

`booktools printfit` produces exactly these; `booktools check` verifies them.
Below ~250 dpi effective is a hard fail, because it shows as softness in print.
Nano Banana draws a **fold line** down the middle when told "double-page": always add
"one continuous image, no fold line, no page divider".

## Where files go

| What | Drafts and intermediates | Final (what book.json points to) |
|---|---|---|
| spread / page | `raw/book/<id>/v<n>.png`, `…/final.png`, `…/up.png` | `book/art/<id>.jpg` |
| spot illustration | `raw/book/<id>/spot_v<n>.png` | `book/art/<id>_spot.jpg` |
| cover | `raw/book/cover/…` | `book/art/cover.jpg` |

`assets/book/` is outside the game's public folder, so none of this ships with the game.

## The reuse ladder (cheapest first; record the choice per spread in book.md)

1. **Game background + characters** (`game bg + chars`): the scene exists in the
   game. Make a layout draft for free with `compose`, using existing character
   frames from `game/chars/<id>/…` or new pose cut-outs. Then one `edit` pass
   turns it into a real illustration (lighting, contact shadows, interaction):
   ```
   python -m tools.booktools compose game/scenes/kitchen/bg.png \
     --put game/chars/<hero>/reach_r/00.png:1100,1000,640 --put game/chars/<friend>/idle_r/00.png:1350,1010,430,flip \
     --out raw/book/s08/comp.png
   python -m tools.fal_gen edit "<style prompt>. Picture-book illustration. Redraw the first image as one finished illustration: keep the room, composition and character placement exactly; draw the characters naturally into the scene with matching light and soft contact shadows. <action, expressions>. Keep the characters exactly as in the reference sheets. No text." \
     --ref raw/book/s08/comp.png --ref ref/chars/<hero>.png --ref ref/chars/<friend>.png \
     --out raw/book/s08/v1.png --aspect 16:9 --resolution 1K
   ```
   Game frames are small (character height_px). That's fine for a draft,
   because the edit redraws them. **Use the 2K source of the background**, not the
   1920 px game copy: `raw/<scene>/bg_final*.png` (2752 × 1536; check the manifest
   for which one became `game/scenes/<scene>/bg.png`). If a spread needs *no*
   characters or changes (an establishing shot), the 2K final can go straight to
   step 5 (upscale) with no generation at all.
2. **Game background reframed** (`game bg reframed`): same place, a new camera
   (closer, from another side, a detail). `edit` with the game bg + style anchor +
   character refs, describing the new framing.
3. **New from references** (`new from refs`): places or moments the game never
   showed (the morning after, a view from the sky, a close-up of one
   detail). `edit` with the style anchor and the character refs; the scene
   doc's Visual section is the starting point.
4. **Spot illustration** (`spot`): a vignette on the cream paper for text pages
   and the title page. `edit` with refs: "…isolated vignette, the drawing fades
   softly into plain paper (the book's `--paper` colour, e.g. #f1e6cf) at the edges, no background scene, no
   frame". No rmbg is needed, since it sits on the same paper colour. Size ~60–120 mm.

Max ~4 refs per call: put the composition image first, then the character refs
it needs. Add the style anchor only if no game art is in the refs.

## Composition rules (write them into every prompt as needed)

- **Shape:** generate at the aspect from the table above. When the source is 16:9 game
  art and the target is taller (A5), ask for "more wall above and more floor below".
  Keep important things off the very edges; printfit trims a little.
- **The gutter** (the fold, page centre ± `gutter_mm`; the middle ~8% of an A5 spread): no faces, no hands doing the key action, no text-relevant object.
  Prompt: "nothing important in the vertical centre strip of the image; the two
  halves can be read separately". Put the main action on the **right page**,
  since the eye lands there after a page turn.
- **Text space:** each spread needs a quiet, low-detail area where the plan says
  the text goes (a wall, the sky, the floor), ≈ 1/4 of one page. Prompt it
  explicitly: "the upper-left quarter is a calm plain wall with no objects".
  Game backgrounds are full of props. If the place has none, choose ladder step 2
  and frame for it.
- **Safe area:** nothing important within `safe_mm` of the trim (10 mm on A5; the
  green box in `guides`).
- **Characters act.** Book pictures are moments: expressive faces, mid-action
  poses, the characters looking at each other or at the thing. Kids move like
  kids: bouncy, never stiff. Keep the size relations from the character sheets
  (how many heads tall, who is taller).
- **Variety across the book:** alternate wide scenes, close-ups and single-page
  pictures. Don't let every spread be the same eye-level room view. Plan it in book.md.
- **Night/day continuity:** keep each beat's time of day and lighting as in the
  game (night stays night: dark windows, warm lamps).

## Pipeline per spread

1. **Draft** at 1K (one call, `--num 1`) via the right ladder step.
2. **Check with Read**, then a guides overlay:
   `python -m tools.booktools printfit raw/book/<id>/v1.png --kind spread --out raw/book/<id>/v1_fit.png`
   (a local upscale is fine for a draft), then
   `python -m tools.booktools guides raw/book/<id>/v1_fit.png --kind spread --id <id> --out raw/book/<id>/v1_guides.png`.
   Check: the gutter is clean, the text area is quiet, the safe area is
   respected, the characters are on-model, and the action matches the page plan.
3. **The first spread is the look test.** Show it to the user (draft + guides)
   before drafting the rest. After that, show drafts in batches of 3–4 (contact sheet).
4. **Final** at 2K, with the approved draft as the first `--ref` and "keep the
   composition of the first image exactly".
5. **Upscale ×2 with SeedVR** (≈ $0.001 per output megapixel, so ≈ $0.02 a spread):
   ```
   python -m tools.fal_gen run fal-ai/seedvr/upscale/image \
     --args '{"image_url": "file:raw/book/<id>/final.png", "upscale_mode": "factor", "upscale_factor": 2, "output_format": "png"}' \
     --units 17 --out raw/book/<id>/up.png
   ```
   `--units` = output megapixels: a 2K 16:9 render is 2752 × 1536, ×2 = 5504 × 3072 ≈ 17 MP (1:1 2K ×2 ≈ 17 MP too). That covers the 5173 × 2622 spread with room to crop. Alternative:
   `fal-ai/recraft/upscale/crisp` ($0.004 an image, `{"image_url": …}` only, `--units 1`).
   On the first spread, try both once and keep the one that preserves the
   watercolour paper texture and ink lines better (record it in book.md). Upscalers can
   invent detail: Read a 100% crop of the faces
   (`python -m tools.imgtools patch raw/book/<id>/up.png --box … --feather 0 --out raw/book/<id>/face_crop.png`).
6. **Fit to print** (exact pixels, 300 dpi metadata):
   `python -m tools.booktools printfit raw/book/<id>/up.png --kind spread --out book/art/<id>.jpg [--anchor top|bottom]`.
   There must be no "upscaling locally" warning on finals. Finals are **JPEG
   (quality 95, no chroma subsampling)**: Chrome embeds JPEGs as-is, while PNGs are
   re-compressed per page, so one spread is ~4 MB instead of ~35 MB in the PDF. Keep `up.png`
   as the lossless master.
7. `python -m tools.booktools check`, then hand over to **book-layout**.

## Cover

Plan it last, when the interior look is settled. Its size comes from the printer
(see book-layout, "Cover"): back + spine + front + bleed (and wrap for hardcover).
Front: the main characters, a clear title area in the top third, strong
silhouette readable as a thumbnail. Back: a quiet continuation of the front picture
(blurb space). Generate the front as a 1:1 page, extend it into the back with an
`edit` ("extend this image to the left into a calm continuation of the scene"),
then upscale and printfit to the cover size. Title lettering is set in layout,
never generated.

## Cost estimate (put this in book.md)

| item | count | unit | total |
|---|---|---|---|
| spread draft (1K) | spreads × ~1.5 | $0.08 | |
| spread final (2K) | spreads | $0.12 | |
| upscale | spreads + pages | ~$0.02 | |
| single pages / spots | n × ~1.5 | $0.08 + $0.12 | |
| character pose cut-outs (if needed for compose) | n | $0.08 + rmbg | |
| cover (front, extension, final) | ~4 | ~$0.10 | |
| contingency (re-rolls) | +25% | | |

For a 32-page book with ~13 spreads, that's ≈ $4–6. Compare with the remaining fal
budget (`python -m tools.budget`). If it doesn't fit, stop and ask; never edit
`budget.json`. Batches of more than 5 calls or $1 need the user's OK with
`--dry-run` estimates (CLAUDE.md).

## Print QA checklist (per final)

- [ ] Matches the game's style and the neighbouring spreads (contact sheet of the
      book so far: `python -m tools.imgtools contact assets/book/art/*.jpg --out raw/book/contact.png`).
- [ ] On-model characters; no extra fingers, no merged limbs, no text or letters anywhere.
- [ ] Gutter clean, text area quiet, nothing important outside the safe area.
- [ ] Upscale crop checked at 100% (faces, ink lines, paper texture).
- [ ] Exact print pixels; `booktools check` reports no art issues.
- [ ] Logged in `assets/manifest.jsonl` (the generators do this).
