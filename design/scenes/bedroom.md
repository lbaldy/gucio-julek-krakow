# Pokój chłopców, letni wieczór (`bedroom`)
Chapter: I · Connects to: prologue (cards) · Music: `home` (reused) · Ambience: summer evening (crickets through the open window, a far-off dog)

## Purpose
The tutorial, about 2 minutes. The player learns to tap, and to use Julek: his "Beee!
Hop!" bouncing in the crib shakes the book off the shelf. Mama reads the legend up to
the cliffhanger. This scene plants Julek's bleat for the climax.

## Visual (for the art prompt)
An **edit of the existing bedroom** (`assets/game/scenes/bedroom/bg.png`): the same
camera and furniture, changed to **summer**:
- **Window:** open (the right casement swung inward), the curtains stirring. A warm
  summer twilight sky, deep blue at the top fading to apricot at the horizon, a few
  first stars, the crescent moon. Instead of the cherry blossom, a leafy green linden
  branch. A firefly or two.
- **Patterns:** keep the folk flowers; add little summer motifs (poppies, cornflowers).
- **Shelf** above the toy chest, right of the crib: unchanged. Its books are the
  hotspot; the `book` is a sprite standing at the shelf's left end, spine out.
- Everything else stays: Gucio's dinosaur bed (left), the lamp on the stool, the crib
  (right of the window), the toy chest, the rug, the door, the drawing on the door.
- No people, no text.

**Morning variant** (`bg_morning`, used by the outro): the same room in warm early
summer sun, the window wide open, the linden bright green, the lamp off.

## Hotspots
| id | name | where | look | interact | notes |
|----|------|-------|------|----------|-------|
| shelf | półka z książkami | right wall, above the chest | "Moja książka o Polsce jest na półce. Za wysoko…" | "Nie sięgnę. Nawet na palcach." | Julek: "Hop?" can't reach either |
| crib | łóżeczko Julka | right of the window, next to the shelf | "Łóżeczko Julka stoi tuż pod półką. Julek uwielbia w nim skakać!" | "Za małe dla mnie." | **Julek: bounce → the book falls** |
| bed | łóżko Gucia | left | "Moje łóżko z dinozaurami." | before the story: "Najpierw bajka!"; after: the exit (sleep) | |
| window | okno | centre | "Lato! Słychać świerszcze." | "Niech będzie otwarte. Jest ciepło." | |
| lamp | lampka | on the stool by the bed | "Moja lampka. Do czytania." | "Niech jeszcze świeci." | |
| toy_chest | skrzynia z zabawkami | right | "Klocki i piłka. Jutro się pobawimy." | same | Julek: "Hop! Hihi!" (reused) |
| door | drzwi | right | "Mama zaraz przyjdzie poczytać." | "Nie wychodzimy. Już wieczór." | not an exit |

## Pickups
| id | name | where | look | state art needed |
|---|---|---|---|---|
| book | książka o Polsce | on the shelf; falls onto the rug | "Moja książka o Polsce! Jest w niej smok!" | world sprite (on the shelf, then lying on the rug); not an inventory item |

## State changes
None in the background. The book sprite moves from the shelf to the rug.

## Characters present
- gucio, julek (companion). At the start Julek is on the rug going "Beee! Beee!".
- mama: off-screen voice.

## Puzzles
1. **The book:** Gucio can't reach the shelf. Julek on the crib → he climbs in and
   bounces: "Beee! Beee! Hop!" (pose `bounce_r`, a hop tween) → the shelf wobbles →
   the book slides off and lands on the rug, open. Mama (off): "Julek! Owieczki nie
   skaczą po łóżeczku!"
2. **Read it:** tap the book → Mama's voice: "No dobrze, przeczytam wam legendę." The
   `book_page` card: Mama's hands hold the open book on Gucio's duvet, the page shows a
   cheerful green dragon outside a cave under a hill with a castle. Lines below.
3. **Sleep:** the bed becomes the exit. Tap it → the boys climb in → the lamp goes out →
   the `book_glow` card → `prologue`.

## Lines (draft)
- `bedroom.enter.1`: julek: "Beee! Beee!" `[giggles]`
- `bedroom.enter.2`: gucio: "Julek jest dziś owieczką. Mama zaraz przyjdzie poczytać!"
- `bedroom.enter.3`: gucio: "Moja książka o Polsce… jest na półce."
- `bedroom.shelf.look`: gucio: "Moja książka o Polsce jest na półce. Za wysoko…"
- `bedroom.shelf.use`: gucio: "Nie sięgnę. Nawet na palcach."
- `bedroom.shelf.julek`: julek: "Hop? Nie ma." 
- `bedroom.crib.look`: gucio: "Łóżeczko Julka stoi tuż pod półką. Julek uwielbia w nim skakać!"
- `bedroom.crib.use`: gucio: "Za małe dla mnie."
- `bedroom.crib.julek.1`: julek: "Beee! Beee! Hop!" `[excited]`
- `bedroom.crib.julek.2`: gucio: "Uwaga! Półka się trzęsie!"
- `bedroom.crib.julek.3`: julek: "Bum!" `[laughs]`
- `bedroom.crib.julek.4`: mama: "Julek! Owieczki nie skaczą po łóżeczku!"
- `bedroom.book.look`: gucio: "Moja książka o Polsce! Jest w niej smok!"
- `bedroom.book.read.1`: mama: "No dobrze, przeczytam wam legendę. Dawno, dawno temu, pod wzgórzem Wawel…"
- `bedroom.book.read.2`: julek: "Smok!" `[pointing, excited]`
- `bedroom.book.read.3`: mama: "Tak, smok. Zabierał owce. I nikt nie wiedział, jak go pokonać."
- `bedroom.book.read.4`: mama: "Dokończymy jutro."
- `bedroom.book.read.5`: gucio: "Mamo! Jeszcze trochę!"
- `bedroom.book.read.6`: mama: "Jutro. Dobranoc, owieczki."
- `bedroom.book.read.7`: julek: "Beee…" `[sleepy]`
- `bedroom.bed.look`: gucio: "Moje łóżko z dinozaurami."
- `bedroom.bed.use.early`: gucio: "Najpierw bajka!"
- `bedroom.bed.use`: gucio: "Ja bym coś wymyślił… na tego smoka…" `[sleepy]`
- `bedroom.window.look`: gucio: "Lato! Słychać świerszcze."
- `bedroom.window.use`: gucio: "Niech będzie otwarte. Jest ciepło."
- `bedroom.lamp.look`: gucio: "Moja lampka. Do czytania."
- `bedroom.lamp.use`: gucio: "Niech jeszcze świeci."
- `bedroom.toy_chest.look`: gucio: "Klocki i piłka. Jutro się pobawimy."
- `bedroom.door.look`: gucio: "Mama zaraz przyjdzie poczytać."
- `bedroom.door.use`: gucio: "Nie wychodzimy. Już wieczór."
- `bedroom.hint.book`: gucio: "Książka jest wysoko… A Julek tak skacze w łóżeczku!"

## Build status
- [x] Summer edits: `bg.png` (open window, linden, fireflies) and `bg_morning.png`, geometry unchanged
- [ ] Lines locked → VO
- [x] Music, ambience
