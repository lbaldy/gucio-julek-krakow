# Style

> **Series style, carried over unchanged** (direction **D: Polish picture-book**, chosen by
> the user on 2026-11-09). This game is set in **summer**, in a legendary wooden town under
> Wawel hill on the Vistula. The town is a new kind of outdoor scene for the series, so it
> gets its own anchor (see "Town anchor" below).

## Style prompt (prepended to every image prompt, verbatim)
Hand-drawn watercolour and coloured-pencil picture-book illustration in the tradition
of classic Polish children's book art: delicate warm-brown ink linework, soft
watercolour washes on textured cream paper, gentle folk-art patterns on fabrics
(cross-stitch borders, little flowers and leaf motifs), rounded friendly shapes,
muted warm colours with glowing golden highlights, cosy and magical, gentle storybook
lighting.

(The series prompt word for word. It describes the look only; season and content go in
each asset's own prompt.)

## Palette
- paper cream `#f1e6cf` (highlights, sky haze, wool, sheep)
- warm ink brown `#5a3f2b` (all line work; never black)
- oak floor `#c89a62` (log walls, wooden floors, stalls, the cart)
- fir green `#4f6b3c` (deep shade, the dragon's darker spots)
- **summer green `#6f9e3e`** (new: meadow grass, linden leaves, the dragon's body)
- folk red `#b8432f` (pattern accents, poppies, Krak's tunic, roofs' trim)
- golden glow `#f2c14e` (sunlight, dandelions, straw, the glowing wool tufts, the crown)
- **cornflower blue `#5f84b8`** (new: the Vistula, summer sky, cornflowers, Krak's cloak)
- **limestone `#d8cdb4`** (new: Wawel hill's rock, the cave)
- **sulphur yellow `#d9c94a`** (new: only the sulphur stones; a slightly greenish yellow, so they don't read as gold)
- **dusk apricot `#f0a873`** (new: the cave's sunset sky and the dragon's ember glow)
- night blue `#1f2f57` (the bedroom window, the moonlit prologue)

## Backgrounds
- **Camera:** eye-level, slightly elevated, a wide 3/4 view. The ground is visible in
  the lower third (where characters walk), with no large objects in front blocking it.
- **Always empty:** no people, no animals, no sheep, no dragon. No text, letters,
  carved writing, signage, UI or watermarks. Carved or hung *pictures* are allowed as
  simple folk shapes (the shoemaker's wooden boot sign).
- **Interior (bedroom):** an edit of the existing bedroom (`assets/game/scenes/bedroom/bg.png`),
  summer evening / morning. See `design/scenes/bedroom.md`.
- **The legendary town:** an early-medieval Slavic wooden settlement, picture-book
  friendly: log houses with steep wood-shingle or thatched roofs, carved gables, wattle
  fences, packed-earth streets with grass edges, flower boxes, a linden tree. **Wawel hill**
  is a green, rocky limestone hill with a **wooden palisade stronghold** on top (no stone
  castle, no cathedral, no brick: this is the legend's time). The Vistula is wide, blue and
  calm with reeds and willows.
- **Summer:** rich warm greens, poppies, cornflowers, daisies, dandelions, golden straw,
  big soft clouds, warm sunlight. Never brown and dry, never gloomy.
- **Time of day:** town and workshop in the morning, meadow and market at midday, the
  cave at golden-pink dusk, the den at night lit warm orange. Night is moonlit and cosy,
  never black.
- **Town anchor:** `assets/ref/style_anchor_town.png` (= `raw/style/town_b.png`, 1K, approved by
  the user 2026-11-22) is the `--ref` for every outdoor background. A warmer-light refinement
  (`town_b2`) muddied the sky and was dropped. Known fixes for the real `town` bg: the carved
  X row over the right house's door → a flower motif; ask for a clear blue sky; "full-bleed, no
  white border" (the meadow draft had a painted border). Interiors (workshop, den) use it too,
  plus the interior anchor (`style_anchor.png`) for indoor lighting.
- Generate every background as an `edit` with the anchor(s) as `--ref` ("match the art
  style of the reference only; ignore its content").

## Characters
- Picture-book proportions: big heads (Gucio ≈ 4 heads tall, Julek ≈ 3), rosy cheeks,
  simple dot-and-curve eyes, soft round shapes. Adults are 1.2–1.4× Gucio's height, with
  the same rounded picture-book proportions, never realistic. The dragon is big and round.
- The same warm-brown ink outline as the backgrounds, slightly **heavier on characters
  and pickups** so that clickable things read clearly against the soft backgrounds.
- **Gucio:** short messy brown hair, cream pyjamas with green dinosaurs, bare feet.
  (He wears them in the dream too.)
- **Julek:** short wispy blond hair, **no hood**, fluffy cream fleece footed pyjamas.
- **Legend people:** early-medieval Slavic folk clothes: linen shirts and tunics with
  embroidered folk borders, woven belts, felt caps, headscarves, leather or bast shoes.
- **Animals** (Kłębuszek, Bodzio, the sheep) and the dragon: storybook creatures in the
  same ink and watercolour style, rounded and friendly, not realistic.
- Rendered on a plain flat light-grey background (#d0d0d0), full body, feet visible,
  no ground shadow. Every new character ref is an `edit` with the town anchor **and**
  Gucio's ref as `--ref`, so they're drawn like the boys.

**Animals and the dragon (known quirk, 2026-11-22):** the style prompt's "folk-art patterns on
fabrics" makes the model paint embroidery, flowers and sparkles *onto wool and scales*, and an
edit can't remove it. For animals, drop that clause from the style prompt and say "plain natural
wool, no patterns, no embroidery, no sparkles" (that's how the lamb and ram refs were made).

## Negatives (say in words in every prompt)
- no text, letters or names
- no hood on Julek
- no black outlines, no hard digital gradients, no 3D render look
- no scary shapes: no bones, no sharp teeth shown menacingly, no blood, no dark gloomy
  cave; the dragon is never fierce
- **no stone castle, cathedral, brick or modern buildings** in the legend (wooden
  stronghold only). The modern dragon statue appears only on outro card 5.
- no winter, spring blossom or Christmas details: this game is summer
- no swords drawn or fighting; the knight's sword stays sheathed, Krak has none

## Approved references
- `assets/ref/chars/gucio.png`, `assets/ref/chars/julek.png`: the series refs, 2K, on
  flat grey, facing right. Every pose and animation frame is an `edit` with its reference
  as the first `--ref`. Their existing sprites are in `assets/game/chars/gucio|julek/`.
- The prompts that made the boys' refs, poses and frames are in
  `assets/raw/carryover/manifest_gucio_julek.jsonl` if present (otherwise in the earlier
  game's manifest).
- `assets/ref/style_anchor.png` (interior) and `assets/ref/style_anchor_forest.png`
  (outdoor, a sunlit forest): style only. The forest anchor's content (a forest) is not
  in this game.
- `assets/ref/chars/lech.png`, `ruda.png`, `eagle.png`: from another game; **not used
  here** except as examples of how an adult and animals were drawn in this style.
- **New refs, approved by the user 2026-11-22**, 2K on flat grey, facing right:
  `assets/ref/chars/krak.png` (crown too big, slipping low), `shepherd.png` (tuft of wool in
  hand), `dratewka.png`, `dragon.png`, `merchant.png`, `baker.png`, `klebuszek.png`, `ram.png`.
  Drafts and 2K finals are in `assets/raw/chars/<id>/` (people `ref_v1` → 2K; animals `ref_v3` → 2K).
- **Known quirk (2026-11-22):** when making a 2K final, pass **only the character's own draft**
  as `--ref`. With Gucio's ref added as a second reference, the model drew Gucio instead in 6
  of 8 cases. Gucio's ref is only for the first draft of a new character (style matching).
- The baker still reads young (late teens); the user approved her as is.
