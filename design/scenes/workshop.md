# Warsztat Dratewki (`workshop`)
Chapter: II and IV · Connects to: town · Music: town theme (quieter, plucked) · Ambience: a creaky wooden room, a tapping hammer when Dratewka works, swallows outside

## Purpose
Act II: meet Dratewka, hear the plan, find his needle (Julek) and his dratwa (the
tangle mini-game). Act IV: put the sheepskin, straw and sulphur on the bench, watch
him sew, and see the town begin to believe.

## Visual (for the art prompt)
A cosy, cluttered log-wall shoemaker's workshop on a summer morning, eye level, wide 3/4
view. Warm sun through a small window.
- **Centre:** a sturdy low **workbench** with shoemaker's tools (a hammer, an awl, a
  leather apron on a hook). Under it, between the floorboards, a dark **crack**, wide
  enough for a small hand.
- **Left:** a small **window** with an open shutter and a flower box, looking out on the
  street.
- **Back wall:** rows of **shoes and boots** hanging on pegs, and wooden **shoe lasts**
  (foot-shaped forms) on a shelf.
- **Right:** a three-legged **stool** with a big **tangle** of thread (yellow, red and
  blue) heaped on it, three empty wooden spools beside it. A small barrel of wooden
  **pegs** on the floor.
- **Far right:** the **door** to the street, ajar, sunlight on the floor.
- **Floor:** wide wooden boards, the walkable band across the lower third.

No people, no needle, no fake sheep, no text.

## Hotspots
| id | name | where | look | interact | notes |
|----|------|-------|------|----------|-------|
| workbench | stół szewski | centre | before: "Stół szewca. Pełno narzędzi."; assembly: "Tu zrobimy owcę!" | assembly target for sheepskin, straw, sulphur | the fake-sheep prop sits on it (4 states) |
| crack | szpara w podłodze | under the workbench | "Szpara pod stołem. Coś tam błyszczy… Za ciasno dla mnie." | "Moja ręka się nie zmieści." | **Julek: crawls under → needle** |
| tangle | splątane nici | stool, right | "Ale plątanina! Żółta, czerwona i niebieska." | → `tangle` mini-game → dratwa | gone afterwards (3 neat spools) |
| window | okno | left | "Przez okno widać ulicę." | "Nie wychodzimy oknem!" | the laughing/peeking heads appear here |
| shoes | buty na ścianie | back wall | "Tyle butów! Duże, małe… i jeden z dziurą." | "To nie moje buty." | Julek: "But!" `[giggles]` |
| lasts | kopyta szewskie | back shelf | "Drewniane stopy! Dratewka mówi, że to kopyta." | "Nie zabawka." | |
| pegs | beczułka kołków | right, floor | "Drewniane kołeczki. Szewc nimi przybija podeszwy." | "To Dratewki. Nie bierzemy bez pytania." | plants the cave's peg |
| door | drzwi | far right | "Na ulicę." | exit → town | |

## Pickups
| id | name | where | look | state art needed |
|---|---|---|---|---|
| needle | wielka igła | in the crack (only its glint shows) | "Wielka igła szewca!" | world glint + icon; given to Dratewka at once |
| dratwa | dratwa | from the mini-game | "Mocna, woskowana nić. Dratwa!" | icon; given to Dratewka at once |

## State changes
- The tangle → three neat spools (a prop swap).
- The fake sheep on the bench: hidden → `fake_1` flat skin → `fake_2` stuffed (lumpy) →
  `fake_3` stuffed with a yellow glow showing through a gap → `fake_4` sewn, with button
  eyes and a funny stitched smile. States count the items on the bench, not their order
  (any order fills `fake_1`…`fake_3`; when all three are there, the sewing beat → `fake_4`).

## Characters present
- **dratewka**: at the workbench, cheerful but a bit hurt by the laughter. Topics:
  - "Kim jesteś?"
  - "Jaki masz plan?" → `plan_told` (the main beat)
  - "Czego potrzebujesz?" (repeats what's still missing; this is the in-world checklist)
  - "Pa pa!"
- **merchant**, **baker**: heads at the window (Act IV assembly beat only, curious).
- **krak**: walks in for the assembly beat.

## Puzzles
1. **The plan** (talk). Dratewka: the dragon is greedy; we'll make a sheep that isn't a
   sheep, stuffed with straw and sulphur, for a terrible tummy ache. "But first, my
   needle fell through the crack, and my dratwa is all tangled."
2. **Needle:** Julek on the crack → `crawl_r` under the bench: "Kuku!… Jeś!" → needle →
   straight to Dratewka.
3. **Dratwa:** tap the tangle → the `tangle` mini-game (see `game.md`). Three rounds: red
   to the red spool, blue to the blue spool, yellow (the dratwa) to the yellow spool.
4. With both → `dratewka_ready`. **Act-end beat:** a deep rumble; the tools rattle; Julek
   hides behind Gucio. dratewka (whispering): "Smok się obudził. Musimy się pospieszyć."
   Then he names what's next: the sheepskin and straw from the shepherd's meadow, and the
   yellow stone from the market.
5. **Assembly (Act IV):** use the sheepskin, straw and sulphur on the workbench (or give
   them to Dratewka). With all three, the **sewing beat**: Dratewka sews quickly
   (`sew` pose, a sewing sfx); the merchant and baker peek in at the window, curious
   (no laughing now); Krak comes through the door. Then dusk → `cave`.

## Lines (draft)
- `workshop.enter.first.1`: dratewka: "Goście? Przyszliście się śmiać, jak wszyscy?"
- `workshop.enter.first.2`: gucio: "Nie! My ci wierzymy!"
- `workshop.enter.first.3`: dratewka: "Naprawdę? … No to witajcie!"
- `workshop.dratewka.look`: gucio: "To szewczyk Dratewka. Ma fartuch i wesołe oczy."
- `workshop.dratewka.julek`: julek: "Beee!" `[giggles]`
- `workshop.dratewka.julek.dratewka`: dratewka: "Owieczka! A to się świetnie składa…"
- `workshop.dratewka.talk.who.1`: gucio: "Kim jesteś?"
- `workshop.dratewka.talk.who.2`: dratewka: "Jestem szewc. Szyję buty. A dratwa to moja nić, stąd mówią na mnie Dratewka!"
- `workshop.dratewka.talk.plan.1`: gucio: "Jaki masz plan na smoka?"
- `workshop.dratewka.talk.plan.2`: dratewka: "Smok jest łakomy. Zrobimy owcę, która nie jest owcą!"
- `workshop.dratewka.talk.plan.3`: dratewka: "Skóra z wierzchu, słoma w środku… i siarka. Od siarki dostanie strasznego bólu brzucha!"
- `workshop.dratewka.talk.plan.4`: gucio: "Siarka? Co to jest?"
- `workshop.dratewka.talk.plan.5`: dratewka: "Żółte kamienie. Śmierdzą okropnie! Ma je kupiec na targu."
- `workshop.dratewka.talk.plan.6`: dratewka: "Ale najpierw… igła wpadła mi w szparę pod stołem. A dratwa się splątała."
- `workshop.dratewka.talk.need.needle`: dratewka: "Igła! Wpadła w szparę pod stołem."
- `workshop.dratewka.talk.need.dratwa`: dratewka: "Dratwa! Ta żółta. Splątała się z innymi nićmi."
- `workshop.dratewka.talk.need.skin`: dratewka: "Owcza skóra. Zapytajcie pasterza na łące."
- `workshop.dratewka.talk.need.straw`: dratewka: "Słoma! Na łące jest stóg siana."
- `workshop.dratewka.talk.need.sulphur`: dratewka: "Siarka, żółty kamień. Kupiec na targu ją ma."
- `workshop.dratewka.talk.need.done`: dratewka: "Mamy wszystko! Szyjemy!"
- `workshop.dratewka.talk.bye`: dratewka: "Wracajcie szybko!"
- `workshop.crack.look`: gucio: "Szpara pod stołem. Coś tam błyszczy… Za ciasno dla mnie."
- `workshop.crack.use`: gucio: "Moja ręka się nie zmieści. Julek by się zmieścił!"
- `workshop.crack.julek.1`: julek: "Kuku!" `[giggles, muffled]`
- `workshop.crack.julek.2`: julek: "Jeś!" `[proudly]`
- `workshop.crack.julek.3`: dratewka: "Moja igła! Maluchu, jesteś skarbem!"
- `workshop.tangle.look`: gucio: "Ale plątanina! Żółta, czerwona i niebieska."
- `workshop.tangle.start`: gucio: "Każda nitka do swojej szpulki. Ta sama barwa!"
- `workshop.tangle.wrong`: gucio: "To nie ta."
- `workshop.tangle.right`: gucio: "Jest!"
- `workshop.tangle.done.1`: gucio: "Żółta dratwa!"
- `workshop.tangle.done.2`: dratewka: "Wspaniale! Mam igłę i dratwę. Mogę szyć!"
- `workshop.ready.1`: julek: "Ojej!" `[scared, hiding]`
- `workshop.ready.2`: dratewka: "Smok się obudził. Musimy się pospieszyć."
- `workshop.ready.3`: dratewka: "Skóra i słoma są na łące pasterza. Siarka na targu. Pospieszcie się!"
- `workshop.workbench.look`: gucio: "Stół szewca. Pełno narzędzi."
- `workshop.workbench.look.assembly`: gucio: "Tu zrobimy owcę!"
- `workshop.workbench.use.skin`: dratewka: "Skóra! Rozkładamy."
- `workshop.workbench.use.straw`: dratewka: "Słoma! Wypychamy, pchamy… o, już ma brzuszek!"
- `workshop.workbench.use.sulphur`: dratewka: "Siarka do środka. Fuj, jak śmierdzi!"
- `workshop.workbench.use.julek`: julek: "Beee?" · gucio: "Jeszcze nie, Julcio. Jeszcze nie jest gotowa."
- `workshop.sew.1`: dratewka: "Igła, dratwa… szyjemy! Szybko, szybko!"
- `workshop.sew.2`: merchant (at the window): "Patrz… on naprawdę zrobił owcę!"
- `workshop.sew.3`: baker (at the window): "Jaka ładna! Prawie jak prawdziwa."
- `workshop.sew.4`: krak: "Szewcze… może to się uda. Weźcie mój wóz."
- `workshop.sew.5`: gucio: "Do smoczej jamy! Kłębuszku, idziemy!"
- `workshop.window.look`: gucio: "Przez okno widać ulicę."
- `workshop.window.use`: gucio: "Nie wychodzimy oknem!"
- `workshop.shoes.look`: gucio: "Tyle butów! Duże, małe… i jeden z dziurą."
- `workshop.shoes.use`: gucio: "To nie moje buty."
- `workshop.shoes.julek`: julek: "But!" `[giggles]`
- `workshop.lasts.look`: gucio: "Drewniane stopy! Dratewka mówi, że to kopyta."
- `workshop.lasts.use`: gucio: "To nie zabawka."
- `workshop.pegs.look`: gucio: "Drewniane kołeczki. Szewc nimi przybija podeszwy."
- `workshop.pegs.use`: gucio: "To Dratewki. Nie bierzemy bez pytania."
- `workshop.door.look`: gucio: "Na ulicę."

## Build status
- [x] Greybox + walkthrough (full.json)
- [x] Background: 1K draft → 2K final (old leather boots, 3 empty spools) → `scenes/workshop/bg.png`
- [x] Geometry: walkable floor band, hotspots, door, scale (0.86 at y850 → 1.06 at y1060)
- [x] State art: tangle → neat spools patch (`spools.png`, crop-edit, colour-matched); fake sheep
      `fake_1`…`fake_4` (flat → stuffed → glowing → sewn and standing)
- [x] Characters: Dratewka (idle, talk ×3, sew, scared, cheer), Krak standing (idle, talk, 6-frame walk)
- [ ] Tangle mini-game close-up background (optional; the code-drawn table works)
- [ ] Lines locked → VO; ambience `workshop_loop.mp3`
