# Style

> **Carried over from games 1–2** ("Gucio i Julek ratują święta", `../../gucio-julek-game`;
> "…ratują Nowy Rok", `../../gucio-julek-new-year/new-year`) on 2026-11-21, so that the
> boys, the home and the look stay consistent across the series. Game 3 is set in
> **spring** and mostly **outdoors** (a legendary dream forest). Those are new for the
> series and get their own anchor (see "Outdoor anchor" below).

Direction **D: Polish picture-book**, chosen by the user on 2026-11-09 (game 1).
- **Interior anchor:** `assets/ref/style_anchor.png` (game 1's living room, empty).
  Use it only for the bedroom; it's Christmas content, so take its style only.
- **Cast look:** `assets/ref/style_cast.png`, for the boys' look only. The elf and the
  cat aren't in this game.

## Style prompt (prepended to every image prompt, verbatim)
Hand-drawn watercolour and coloured-pencil picture-book illustration in the tradition
of classic Polish children's book art: delicate warm-brown ink linework, soft
watercolour washes on textured cream paper, gentle folk-art patterns on fabrics
(cross-stitch borders, little flowers and leaf motifs), rounded friendly shapes,
muted warm colours with glowing golden highlights, cosy and magical, gentle storybook
lighting.

(This is game 1's prompt word for word, except "fir motifs" became "leaf motifs" for spring.)

## Palette
- paper cream `#f1e6cf` (highlights, sky haze, the eagle's white)
- warm ink brown `#5a3f2b` (all line work; never black)
- oak floor `#c89a62` (the bedroom; bark and wooden planks outdoors)
- fir green `#4f6b3c` (deep forest shade, moss)
- **spring green `#7fa84a`** (new: young leaves, grass, sunlit moss; made a bit deeper on 2026-11-21)
- folk red `#b8432f` (pattern accents, Lech's tunic border, the toadstool, apples, the red sky)
- golden glow `#f2c14e` (sunbeams, the magic feather, the clearing's light)
- night blue `#1f2f57` (the bedroom window at night)
- **blossom pink `#f2c6c2`** (new: the cherry blossom, wood anemones, apple blossom)

## Backgrounds
- **Camera:** eye-level, slightly elevated, a wide 3/4 view. The ground is visible in
  the lower third (where characters walk), with no large objects in front blocking it.
- **Always empty:** no people, no animals, no birds, no eagle. No text, letters,
  carved writing, signage, UI or watermarks. Carved *pictures* (the bridge signs: sun,
  moon, fish, leaf) are allowed and must be simple folk symbols.
- **Interior (bedroom):** an edit of game 1's bedroom (`assets/raw/carryover/g1_bedroom_night.png`),
  with spring evening/morning light. See `design/scenes/bedroom.md`.
- **Outdoor (forest, river, oak, clearing):** an ancient but friendly spring forest.
  Huge mossy trunks frame the edges, with fresh young leaves, golden sunbeams slanting
  through, small spring flowers (wood anemones, violets, marsh marigolds), and soft
  dappled light. **Lush and rich green**: deeper spring greens, not a beige haze (user, 2026-11-21). Never dark, never gloomy, no thorny or twisted scary shapes. Time of
  day moves from morning (`forest`) to afternoon (`clearing`). The red-sky sunset
  appears only in the cards.
- **Outdoor anchor:** once the user approves the look test, `assets/ref/style_anchor_forest.png`
  becomes the `--ref` for every outdoor background, instead of the interior anchor.
- Generate every background as an `edit` with the right anchor as `--ref` ("match the
  art style of the reference only; ignore its content").

## Characters
- Picture-book proportions: big heads (Gucio ≈ 4 heads tall, Julek ≈ 3), rosy cheeks,
  simple dot-and-curve eyes, soft round shapes. Lech is ≈ 1.5× Gucio's height, with the
  same rounded picture-book proportions, never realistic.
- The same warm-brown ink outline as the backgrounds, slightly **heavier on
  characters and pickups** so that clickable things read clearly against the soft
  backgrounds. That matters even more against busy forest foliage.
- **Gucio:** short messy brown hair, cream pyjamas with green dinosaurs, bare feet.
  (He wears them in the dream too.)
- **Julek:** short wispy blond hair, **no hood**, fluffy cream fleece footed pyjamas.
- **Animals** (Ruda, the eagle, the jay): storybook animals in the same ink and
  watercolour style, rounded and friendly, not realistic.
- Rendered on a plain flat light-grey background (#d0d0d0), full body, feet visible,
  no ground shadow.

## Negatives (say in words in every prompt)
- no text, letters or names
- no hood on Julek
- no black outlines, no hard digital gradients, no 3D render look
- no scary or dark shapes; no thorns, no gloomy deep shadows in the forest
- **no winter or Christmas details** (no snow, fairy lights, fir-tree patterns,
  baubles), because this game is spring
- no weapons on Lech (no sword, axe, spear or helmet)
- **no cut or sawn trees, stumps, planks of felled timber or other signs of logging**: the forest is untouched wilderness (user, 2026-11-21). The bridge is the only made thing.

## Approved references
- `assets/ref/chars/gucio.png`, `assets/ref/chars/julek.png`: from game 1
  (2026-11-09), 2K, on flat grey, facing right. Every pose and animation frame is an
  `edit` with its reference as the first `--ref`. Existing game sprites are copied
  from game 2 (`assets/game/chars/gucio|julek/`) at the asset stage.
- The prompts that made the boys' refs, poses and frames are in
  `assets/raw/carryover/manifest_gucio_julek.jsonl` (copied from game 1's manifest).
- `assets/ref/style_anchor_forest.png`: outdoor anchor, approved by the user 2026-11-21 (`raw/style/forest_b.png` → 2K `forest_final.png`, the greener version). It is also the near-final `forest` background.
- `assets/ref/chars/lech.png`, `ruda.png`, `eagle.png`: approved by the user 2026-11-21, 2K, on flat grey.
  Each was made with the outdoor anchor plus Gucio's ref, so they're drawn like the boys.
  Lech has chestnut hair and is about 50; Ruda has no ribbon; the eagle has the heraldic silhouette (wings raised, head in profile), no crown,
  and its expression gets tuned per pose (worried at the oak).
- Known quirk: the model likes to add feathers under the eagle's talons. Say "nothing under the talons" in eagle prompts.
