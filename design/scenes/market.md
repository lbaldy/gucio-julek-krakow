# Targ (`market`)
Chapter: III · Connects to: town · Music: town theme (busier) · Ambience: a small quiet market: a creaking awning, a hen, a well's chain; a baby crying (until Julek)

## Purpose
Get the sulphur by a two-step trade: Julek's peekaboo stops the baker's baby crying →
the baker gives an obwarzanek → the hungry merchant trades a yellow stone for it. The two
townspeople who laughed at Dratewka become real people with their own small troubles.

## Visual (for the art prompt)
A small legendary wooden market square on a sunny summer midday, eye level, wide 3/4
view. Half the stalls are shut (people are afraid), which makes it feel quiet.
- **Left:** the **merchant's stall**, a wooden counter under a striped awning, with
  baskets of pale yellow **sulphur stones** and a little wooden box of them on the front
  edge (low enough for a toddler).
- **Right:** the **baker's stall**, round bread loaves and **obwarzanki** (ring-shaped
  pretzels) hanging on wooden sticks; beside it on the ground, a wooden **cradle** with a
  folk-patterned blanket.
- **Centre back:** a stone **well** with a wooden roof and a bucket.
- **Background:** a couple of **closed stalls** with their shutters down, a cart with
  clay pots, and the town's log houses; Wawel hill peeking over the roofs.
- **Floor:** packed earth and straw across the lower third; the lane back to town at the
  left edge.

No people, no baby, no animals, no text.

## Hotspots
| id | name | where | look | interact | notes |
|----|------|-------|------|----------|-------|
| sulphur_box | skrzynka z siarką | merchant's counter, low front | "Żółte kamienie! To siarka. Ale śmierdzi…" | "To nie nasze. Trzeba zapytać kupca." | **Julek (optional gag):** grabs one, sniffs: "Fuj!", Gucio puts it back |
| pretzels | obwarzanki | baker's stall | "Obwarzanki! Pachną pysznie." | "Nie mamy pieniędzy. Zapytam piekarkę." | Julek: "Katko!" · gucio: "To nie ciastko, Julcio, to obwarzanek!" |
| cradle | kołyska | right, by the baker | crying: "Maluszek płacze i płacze."; after: "Maluszek się śmieje!" | Gucio makes a face → the baby cries louder: "Może woli kogoś mniejszego?" | **Julek: "Kuku!" → the baby laughs** |
| well | studnia | centre back | "Studnia. Głęboka." | "Halo! … Halo-o-o!" (echo) | Julek: "Alo!" `[giggles]` (echo) |
| closed_stalls | zamknięte kramy | background | "Pozamykane. Wszyscy boją się smoka." | "Nikogo nie ma." | |
| pots | dzbany | background cart | "Gliniane dzbany." | "Ostrożnie! Jeszcze coś stłukę." | |
| path_town | droga do osady | left edge | "Do osady." | exit → town | |

## Pickups
| id | name | where | look |
|---|---|---|---|
| wool_market_1 | kłębek wełny | caught on the well's rope | "Kłębek wełny!" |
| wool_market_2 | kłębek wełny | on the corner of a closed stall | (same) |
| wool_market_3 | kłębek wełny | under the merchant's counter (Julek) | (same); "Za nisko dla mnie… Julek?" |

## State changes
- The baby in the cradle: `baby_cry` → `baby_laugh` (a sprite in the cradle).
- The crying sound in the ambience stops after Julek.

## Characters present
- **merchant**: behind his counter, arms crossed, grumpy and hungry. Topics:
  - "Co to za kamienie?" (siarka; stinks; good for nothing)
  - "Dasz nam kamień?" (no, not for free; he's been here since morning and hasn't eaten
    → "Za obwarzanka bym dał!")
  - "Pa pa!"
  Giving him the obwarzanek → `sulphur`.
- **baker**: at her stall, rocking the cradle, frazzled. Topics:
  - "Co się stało?" (the baby won't stop crying; she can't bake)
  - "Dasz obwarzanka?" (before the baby laughs: "Chętnie, ale najpierw… ten płacz!"; after: gives it)
  - "Pa pa!"

## Puzzles
1. **Baby:** Gucio's face on the cradle → louder crying (the hint). Julek on the cradle →
   `peekaboo_r`: "Kuku!… Kuku!" → the baby giggles. baker: "Cisza! Śmieje się! Masz,
   maluchu, obwarzanek za to!" → `pretzel` (to Gucio).
2. **Trade:** the obwarzanek to the merchant → he takes a big bite, softens: "Mniam…
   Bierzcie kamień. A po co wam?" gucio: "Na smoka!" merchant: "Na smoka?… Hm." → `sulphur`.
3. **Fuj gag** (optional; Julek on the sulphur box at any time): he grabs a stone, sniffs
   it, `fuj_r`: "Fuj!" Gucio puts it back: "Julek! To nie nasze… i śmierdzi!" If the
   player never did it, it plays once after the trade instead (Julek sniffs the stone in
   Gucio's hand).

## Lines (draft)
- `market.enter.first.1`: gucio: "Targ. Ale prawie wszystko zamknięte."
- `market.enter.first.2`: julek: "Ojej…" `[covering his ears at the crying]`
- `market.merchant.look`: gucio: "Kupiec. Ten, co się śmiał z Dratewki. Ma chmurną minę."
- `market.merchant.julek`: julek: "Ha ha!" `[copying his laugh]` · merchant: "Hmpf."
- `market.merchant.talk.stones.1`: gucio: "Co to za kamienie?"
- `market.merchant.talk.stones.2`: merchant: "Siarka. Śmierdzi jak zgniłe jajo. Nikt jej nie chce."
- `market.merchant.talk.give.1`: gucio: "Dasz nam jeden kamień?"
- `market.merchant.talk.give.2`: merchant: "Za darmo? Od rana tu stoję i nic nie jadłem… Za obwarzanka bym dał!"
- `market.merchant.talk.bye`: merchant: "Hmpf. Do widzenia."
- `market.merchant.give.pretzel.1`: merchant: "Obwarzanek! Mniam… Bierzcie kamień. A po co wam?"
- `market.merchant.give.pretzel.2`: gucio: "Na smoka!"
- `market.merchant.give.pretzel.3`: merchant: "Na smoka?… Hm." `[thoughtful]`
- `market.baker.look`: gucio: "Piekarka. Też się śmiała. Ale wygląda na zmęczoną."
- `market.baker.talk.what.1`: gucio: "Co się stało?"
- `market.baker.talk.what.2`: baker: "Mój maluszek płacze i płacze. Nie mogę piec!"
- `market.baker.talk.pretzel.1`: gucio: "Dasz nam obwarzanka?"
- `market.baker.talk.pretzel.2`: baker: "Chętnie, ale najpierw… ten płacz!"
- `market.baker.talk.bye`: baker: "Do widzenia, dzieci."
- `market.cradle.look`: gucio: "Maluszek płacze i płacze."
- `market.cradle.look.after`: gucio: "Maluszek się śmieje!"
- `market.cradle.use.1`: gucio: "Ble-ble-ble!" `[funny face]`
- `market.cradle.use.2`: gucio: "Jeszcze głośniej płacze… Może woli kogoś mniejszego?"
- `market.cradle.julek.1`: julek: "Kuku!" `[hiding his eyes]`
- `market.cradle.julek.2`: julek: "Kuku!" `[giggles]`
- `market.cradle.julek.3`: baker: "Cisza! Śmieje się! Masz, maluchu, obwarzanek za to!"
- `market.sulphur_box.look`: gucio: "Żółte kamienie! To siarka. Ale śmierdzi…"
- `market.sulphur_box.use`: gucio: "To nie nasze. Trzeba zapytać kupca."
- `market.sulphur_box.julek.1`: julek: "Fuj!" `[disgusted face]`
- `market.sulphur_box.julek.2`: gucio: "Julek! To nie nasze… i śmierdzi!"
- `market.pretzels.look`: gucio: "Obwarzanki! Pachną pysznie."
- `market.pretzels.use`: gucio: "Nie mamy pieniędzy. Zapytam piekarkę."
- `market.pretzels.julek`: julek: "Katko!"
- `market.pretzels.julek.gucio`: gucio: "To nie ciastko, Julcio, to obwarzanek!"
- `market.pretzel.julek.1`: julek: "Mniam?"
- `market.pretzel.julek.2`: gucio: "Nie, Julcio, to dla kupca!"
- `market.well.look`: gucio: "Studnia. Głęboka."
- `market.well.use`: gucio: "Halo! … Halo-o-o!"
- `market.well.julek`: julek: "Alo!" `[giggles]`
- `market.closed_stalls.look`: gucio: "Pozamykane. Wszyscy boją się smoka."
- `market.closed_stalls.use`: gucio: "Nikogo nie ma."
- `market.pots.look`: gucio: "Gliniane dzbany."
- `market.pots.use`: gucio: "Ostrożnie! Jeszcze coś stłukę."

## Build status
- [x] Greybox and walkthroughs
- [x] Background: 1K draft → 2K final (stone towers removed); stones recoloured to sulphur yellow locally
- [x] Geometry: well blocked; nobody walks behind the cradle or the counter; scale 0.70 @1060 → 0.30 @640
- [x] Merchant: idle, talk (mouth-only), eat · Baker: idle, talk (mouth-only), give
- [x] Baby in the cradle: crying / laughing, painted into the cradle as bg patches (crop-edit)
- [x] Julek: peekaboo, fuj · Icons: pretzel, sulphur
- [x] Chrome pass: cradle (Gucio) → Julek peekaboo → pretzel → merchant → sulphur → fuj gag
- [ ] Optional: the merchant stands beside his counter, not behind it (no occluder)
- [ ] Lines locked → VO
- [x] Sleeping baby on later visits (`baby_asleep`, set on entry after the laugh)
- [ ] Music and ambience (crying stops after Julek)
