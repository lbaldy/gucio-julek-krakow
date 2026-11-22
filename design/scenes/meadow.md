# Łąka pasterza nad Wisłą (`meadow`)
Chapter: III · Connects to: town · Music: town theme, pastoral arrangement (or the meadow ambience alone) · Ambience: river, bees, larks, the odd bleat

## Purpose
Get the sheepskin (from the shepherd) and the straw (past the grumpy ram Bodzio, whom
Julek charms with a dandelion). The emotional middle: the shepherd's memory of
Kłębuszek and Gucio's promise, repeated.

## Visual (for the art prompt)
A sunny summer riverside meadow at midday, eye level, wide 3/4 view, rich green grass
and wildflowers (poppies, cornflowers, daisies).
- **Left:** a wooden **sheep fold** (a low wattle fence) with a broken, sagging **gate**.
  Its back part is empty.
- **Left foreground:** a patch of bright yellow **dandelions** growing by the fence.
- **Centre-right:** a big golden **haystack** behind a low fence with a gap in it.
- **Right / back:** the **Vistula**, wide and blue, with a willow over the bank and reeds.
  On the muddy bank, a line of **huge three-toed footprints** leading right.
- **Far background right:** Wawel hill with the stronghold, and the small dark cave mouth
  at its foot.
- **Floor:** grass and a trodden path across the lower third; the path to town at the
  left edge.

No people, no sheep, no ram, no sack, no text.

## Hotspots
| id | name | where | look | interact | notes |
|----|------|-------|------|----------|-------|
| fold | zagroda | left | "Zagroda. Brama jest zepsuta… tędy przyszedł smok." | "Nie da się jej zamknąć." | |
| dandelions | mlecze | left foreground | "Żółte mlecze! Pełno ich." | Gucio picks one → `dandelion` (again whenever he has none) | Julek: "Faitek!" · gucio: "Kwiatek! Mlecz, Julcio." |
| haystack | stóg siana | centre-right | "Słoma! Ale pilnuje jej baran." | before calm: Gucio walks up, Bodzio butts him → boing; calm + no sack: "Na rękach tyle słomy nie zaniosę. Potrzebny worek."; calm + sack → `straw` | |
| footprints | ślady smoka | right, on the mud | "Ogromne ślady! Prowadzą… do wzgórza." | "Brr. Nie idę tam sam." | Julek: "Smok!" `[whisper]` |
| river | Wisła | right / back | "Wisła. Duża rzeka." | "Woda jest za głęboka." | (pays off in `burp`) |
| hill | wzgórze Wawel | far right | "Tam jest smocza jama." | "Jeszcze nie teraz." | |
| sheep | owce | centre, grazing | "Owieczki pasterza. Jest ich tak mało…" | "Beee! … Nie odpowiadają mi." | Julek: "Beee!" · a sheep: "Beee!" (sfx) |
| path_town | ścieżka do osady | left edge | "Do osady." | exit → town | |

## Pickups
| id | name | where | look |
|---|---|---|---|
| sack | pusty worek | on the fence by the fold | "Pusty worek. Przyda się." |
| wool_meadow_1 | kłębek wełny | on the fold's broken gate | "Kłębek wełny!" |
| wool_meadow_2 | kłębek wełny | in the reeds by the footprints | (same) |
| wool_meadow_3 | kłębek wełny | under the low willow roots (Julek) | (same); "Za nisko dla mnie… Julek?" |

## State changes
- **Bodzio**: `ram_angry` (head down, by the gap in the haystack fence) → `ram_soft`
  (lying down, chewing the dandelion, eyes half-closed) after Julek. Prop sprites.
- The haystack fence gap is free after that.

## Characters present
- **shepherd**: by the fold, leaning on his crook, holding the tuft. Topics:
  - "Potrzebujemy owczej skóry" (after `plan_told`) → gives `sheepskin`
  - "Kłębuszek" (his memories: "Lubił tu skakać…")
  - "Baran?" (the hint: "Bodzio jest uparty. Lubi tylko mlecze… i maluchów nigdy nie bodzie.")
  - "Pa pa!"
- **ram** (Bodzio), **sheep** (3 sprites grazing).

## Puzzles
1. **Sheepskin:** talk to the shepherd → "Stara skóra, ale ciepła. Dla dobrej sprawy." → `sheepskin`.
2. **Straw:** the sack lies on the fence. Gucio near the haystack → Bodzio butts him (no
   harm; a boing and a tumble). Dandelion on the ram with Gucio → butted again, and
   "Chyba woli maluchy?". Dandelion on Julek (combo) → Julek toddles to Bodzio, offers it
   ("Mniam?"), strokes his nose → Bodzio goes soft. Julek on the ram without a dandelion →
   Bodzio sniffs him, then turns away: "Julek mu się podoba… ale Bodzio jest głodny."
   Then the sack on the haystack → `straw`.
3. **Act-end beat** (when both the sheepskin and the straw are held, once): the music
   softens. shepherd (quietly): "Kłębuszek lubił tu skakać…" · gucio: "Przyprowadzimy go.
   Obiecuję." · julek: "Beee!" `[determined]`

## Lines (draft)
- `meadow.enter.first`: gucio: "Łąka pasterza! Ale mało tu owieczek…"
- `meadow.shepherd.look`: gucio: "Pasterz. Ciągle trzyma ten kłębek wełny."
- `meadow.shepherd.julek`: julek: "Beee?" `[shy]`
- `meadow.shepherd.julek.shepherd`: shepherd: "Beee, maluchu. Beee."
- `meadow.shepherd.talk.skin.1`: gucio: "Potrzebujemy owczej skóry. Do planu na smoka!"
- `meadow.shepherd.talk.skin.2`: shepherd: "Stara skóra, ale ciepła. Bierzcie. Dla dobrej sprawy."
- `meadow.shepherd.talk.klebuszek.1`: gucio: "Jaki był Kłębuszek?"
- `meadow.shepherd.talk.klebuszek.2`: shepherd: "Najmniejszy. Najbielszy. I skakał jak piłeczka."
- `meadow.shepherd.talk.ram.1`: gucio: "Ten baran nie daje mi słomy!"
- `meadow.shepherd.talk.ram.2`: shepherd: "Bodzio jest uparty. Lubi tylko mlecze… i maluchów nigdy nie bodzie."
- `meadow.shepherd.talk.bye`: shepherd: "Uważajcie na siebie, dzieci."
- `meadow.ram.look`: gucio: "To baran Bodzio. Groźnie patrzy."
- `meadow.ram.look.soft`: gucio: "Bodzio śpi. I się uśmiecha!"
- `meadow.ram.use`: gucio: "Ojej! Bodzio mnie bodzie!" (boing)
- `meadow.ram.use.dandelion`: gucio: "Masz mlecza! … Ała! Znowu! Chyba woli maluchy?"
- `meadow.ram.julek.nodandelion`: gucio: "Julek mu się podoba… ale Bodzio jest głodny."
- `meadow.ram.combo.1`: julek: "Mniam?" `[offering]`
- `meadow.ram.combo.2`: julek: "Kotek!" `[stroking his nose, giggles]`
- `meadow.ram.combo.3`: gucio: "To nie kotek, Julcio, to baran! Ale już jest grzeczny."
- `meadow.haystack.look`: gucio: "Słoma! Ale pilnuje jej baran."
- `meadow.haystack.use.nosack`: gucio: "Na rękach tyle słomy nie zaniosę. Potrzebny worek."
- `meadow.haystack.use.sack`: gucio: "Pełny worek słomy!"
- `meadow.dandelions.look`: gucio: "Żółte mlecze! Pełno ich."
- `meadow.dandelions.use`: gucio: "Jeden mlecz. Dla kogoś, kto lubi mlecze."
- `meadow.dandelions.julek`: julek: "Faitek!"
- `meadow.dandelions.julek.gucio`: gucio: "Kwiatek! Mlecz, Julcio."
- `meadow.fold.look`: gucio: "Zagroda. Brama jest zepsuta… tędy przyszedł smok."
- `meadow.fold.use`: gucio: "Nie da się jej zamknąć."
- `meadow.footprints.look`: gucio: "Ogromne ślady! Prowadzą… do wzgórza."
- `meadow.footprints.use`: gucio: "Brr. Nie idę tam sam."
- `meadow.footprints.julek`: julek: "Smok!" `[whisper]`
- `meadow.river.look`: gucio: "Wisła. Duża rzeka."
- `meadow.river.use`: gucio: "Woda jest za głęboka."
- `meadow.hill.look`: gucio: "Tam jest smocza jama."
- `meadow.sheep.look`: gucio: "Owieczki pasterza. Jest ich tak mało…"
- `meadow.sheep.use`: gucio: "Beee! … Nie odpowiadają mi."
- `meadow.sheep.julek`: julek: "Beee!"
- `meadow.sack.look`: gucio: "Pusty worek. Przyda się."
- `meadow.end.1`: shepherd: "Kłębuszek lubił tu skakać…" `[quietly]`
- `meadow.end.2`: gucio: "Przyprowadzimy go. Obiecuję."
- `meadow.end.3`: julek: "Beee!" `[determined]`
