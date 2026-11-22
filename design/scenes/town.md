# Osada pod Wawelem (`town`)
Chapter: II (hub) · Connects to: workshop (door), meadow (left, river path), market (right), the hill path (gated; the cave is reached by a cutscene) · Music: town adventure theme (new) · Ambience: a quiet town: a cock, a far-off hammer, swallows; hushed at first

## Purpose
The hub. The boys see the town's fear (shut doors, a fleeing knight), meet Krak, make
their promise to the shepherd, and hear the town laughing at Dratewka. Everything later
starts and returns here.

## Visual (for the art prompt)
A small wooden legendary Slavic settlement street on a sunny summer morning, eye level,
wide 3/4 view.
- **Background right:** Wawel hill, green and rocky, with a wooden palisade stronghold
  on top. At its foot, far away, a dark cave mouth with a thin wisp of smoke.
- **Left:** **Dratewka's workshop**, a low log house with a carved wooden boot hanging
  over the door (a picture, no letters), a small open window with a flower box, and a
  door at the left-centre.
- **Centre:** a big linden tree with a wooden **bench** under it (Krak sits there).
- **Right of centre:** a couple of log houses with **shutters and doors closed tight**.
- **Far left edge:** a path down to the river (a glimpse of blue water and reeds).
- **Far right edge:** a lane leading on to the market (a glimpse of stalls and awnings).
- **Back centre-right:** a path climbing toward the hill, with a little wooden gate.
- **Floor:** a packed-earth street with grass edges and a few stones, across the lower
  third.

No people, no animals, no helmet, no wool, no text.

## Hotspots
| id | name | where | look | interact | notes |
|----|------|-------|------|----------|-------|
| workshop_door | drzwi warsztatu | left-centre | "Warsztat szewca. Nad drzwiami wisi drewniany but." | enter → workshop | |
| workshop_window | okno warsztatu | left | before: "Ktoś tam się śmieje…"; after: "Dratewka coś majstruje." | "Lepiej wejdę drzwiami." | |
| houses | zamknięte domy | right of centre | "Wszyscy pozamykali drzwi. Boją się smoka." | "Puk, puk… Nikt nie otwiera." | after the outro: open (state art only in the outro card) |
| hill | wzgórze Wawel | background right | "Wzgórze Wawel. Na dole jest jaskinia… i dym." | "Za daleko." | |
| path_hill | ścieżka pod wzgórze | back, centre-right | "Ścieżka do smoczej jamy." | gated: "Do smoka? Bez planu? O nie!" | after the sheep: scripted |
| path_meadow | ścieżka nad rzekę | left edge | "Ścieżka nad rzekę. Tam jest łąka pasterza." | gated until `dratewka_ready`: "Najpierw pomóżmy Dratewce. Bez igły nic nie uszyje." | exit → meadow |
| path_market | droga na targ | right edge | "Tam jest targ." | gated until `dratewka_ready` (same line) | exit → market |
| helmet | hełm rycerza | on the street, centre-left, where it rolled | "Rycerz zgubił hełm. Ale uciekał!" | "Za duży dla mnie." | Julek: puts it on, it covers him to the knees: "Cima!" `[giggles]`; then it's left on the bench |

## Pickups
| id | name | where | look |
|---|---|---|---|
| wool_town_1 | kłębek wełny | on the bench's leg | "Kłębek wełny! Smok tędy niósł owce." |
| wool_town_2 | kłębek wełny | caught on a closed shutter, low | (same) |
| wool_town_3 | kłębek wełny | under the workshop's flower box, in the grass (Julek: too low and tight for Gucio) | (same); Gucio: "Za nisko dla mnie… Julek?" |

## State changes
- The knight runs across once (a prop tween), the helmet bounces off and rolls to its spot.
- The merchant's and baker's heads appear in the workshop window (sprites) during the
  laughter beat, then disappear.
- Krak moves from the bench to the workshop for the assembly beat (absent from `town`
  after `sheep_sewn`, but the player can't return then anyway).

## Characters present
- **krak**: on the bench, sad, crown slightly too big. Topics:
  - "Kim jesteś?" ("Who are you?")
  - "Co z rycerzami?" ("What about the knights?")
  - "Dratewka ma plan!" (after `plan_told`; Krak: doubtful but curious)
  - "Pa pa!" (exit)
- **shepherd**: in the promise beat only; then he walks off left to the meadow.
- **merchant**, **baker**: heads in the workshop window, laughing (beat 3).
- **knight**: the prop running across (beat 1).

## Beats (scripted, on the first entry)
1. **The knight.** Clanking; a knight runs across from the right to the left edge,
   arms flailing; his helmet bounces off and rolls to the boys' feet.
   gucio: "Rycerz? Uciekał!" · julek: "Bum!" `[giggles]` · krak (on the bench, sighing):
   "Moi rycerze uciekli. Miecze nie pomogą…"
2. **The promise** (the music softens; the camera holds on the shepherd and Gucio).
   The shepherd shuffles in from the left with the tuft of wool in his hands.
   shepherd: "Dzieci? W tym strachu? … Smok zabrał mi Kłębuszka. Najmniejszego."
   shepherd: "Został mi tylko ten kłębek wełny." · julek: "Beee…" `[sad, small]`
   gucio: "Przyprowadzimy go. Obiecuję." · shepherd: "Dobre z ciebie dziecko… Idę do moich owieczek, na łąkę."
3. **The laughter.** Laughter from the workshop window; the merchant's and baker's
   heads are there. merchant: "Szewczyk na smoka? Ha ha ha!" · baker: "Z igłą na smoka! Hi hi!"
   They duck away. gucio: "Wszyscy się z niego śmieją… A ja mu wierzę! Chodź, Julek."
   (This plays when the player first walks near the workshop, or after 8 s.)

## Puzzles
None here, but it's where the gates are explained, and where the act transitions
happen (`dratewka_ready`: the rumble plays in the workshop; the meadow and market
paths open).

## Lines (draft)
- `town.knight.1`: gucio: "Rycerz? Uciekał!"
- `town.knight.2`: julek: "Bum!" `[giggles]`
- `town.knight.3`: krak: "Moi rycerze uciekli. Miecze nie pomogą…"
- `town.promise.1`: shepherd: "Dzieci? W tym strachu? … Smok zabrał mi Kłębuszka. Najmniejszego."
- `town.promise.2`: shepherd: "Został mi tylko ten kłębek wełny."
- `town.promise.3`: julek: "Beee…" `[sad, small]`
- `town.promise.4`: gucio: "Przyprowadzimy go. Obiecuję."
- `town.promise.5`: shepherd: "Dobre z ciebie dziecko… Idę do moich owieczek, na łąkę."
- `town.laugh.1`: merchant: "Szewczyk na smoka? Ha ha ha!"
- `town.laugh.2`: baker: "Z igłą na smoka! Hi hi!"
- `town.laugh.3`: gucio: "Wszyscy się z niego śmieją… A ja mu wierzę! Chodź, Julek."
- `town.krak.look`: gucio: "To król. Korona trochę mu spada."
- `town.krak.julek`: julek: "Kuj!" `[pointing]`
- `town.krak.julek.krak`: krak: "Tak, maluchu. Król bez rycerzy."
- `town.krak.talk.who.1`: gucio: "Kim jesteś?"
- `town.krak.talk.who.2`: krak: "Jestem Krak. Król tej osady. Smutny król."
- `town.krak.talk.knights.1`: gucio: "Co z rycerzami?"
- `town.krak.talk.knights.2`: krak: "Pobiegli na smoka z mieczami. A smok tylko kichnął… i uciekli."
- `town.krak.talk.knights.3`: julek: "Apsik!" `[giggles]`
- `town.krak.talk.plan.1`: gucio: "Dratewka ma plan! Zrobimy owcę, która nie jest owcą!"
- `town.krak.talk.plan.2`: krak: "Szewczyk? Hm… Moi rycerze nie dali rady. Ale… zobaczymy."
- `town.krak.talk.bye`: krak: "Uważajcie na siebie, dzieci."
- `town.workshop_door.look`: gucio: "Warsztat szewca. Nad drzwiami wisi drewniany but."
- `town.workshop_window.look`: gucio: "Ktoś tam się śmieje…"
- `town.workshop_window.look.after`: gucio: "Dratewka coś majstruje."
- `town.workshop_window.use`: gucio: "Lepiej wejdę drzwiami."
- `town.houses.look`: gucio: "Wszyscy pozamykali drzwi. Boją się smoka."
- `town.houses.use`: gucio: "Puk, puk… Nikt nie otwiera."
- `town.hill.look`: gucio: "Wzgórze Wawel. Na dole jest jaskinia… i dym."
- `town.hill.use`: gucio: "Za daleko."
- `town.path_hill.look`: gucio: "Ścieżka do smoczej jamy."
- `town.path_hill.locked`: gucio: "Do smoka? Bez planu? O nie!"
- `town.path_meadow.look`: gucio: "Ścieżka nad rzekę. Tam jest łąka pasterza."
- `town.path_market.look`: gucio: "Tam jest targ."
- `town.path.locked`: gucio: "Najpierw pomóżmy Dratewce. Bez igły nic nie uszyje."
- `town.helmet.look`: gucio: "Rycerz zgubił hełm. Ale uciekał!"
- `town.helmet.use`: gucio: "Za duży dla mnie."
- `town.helmet.julek.1`: julek: "Cima!" `[giggles, muffled]`
- `town.helmet.julek.2`: gucio: "Ciemno? Julcio, hełm zasłania ci oczy!"
- `town.wool.look`: gucio: "Kłębek wełny! Smok tędy niósł owce."
- `town.wool.low`: gucio: "Za nisko dla mnie… Julek?"
