# Julek (`julek`)

> **Carried over from games 1–2** ("Gucio i Julek ratują święta", "…ratują Nowy Rok") on 2026-11-21.

## Role in this game
Follows Gucio through the dream forest, in his fleece footed pyjamas. His powers here:
- **crawl:** under his crib (the book), into the hollow log (a feather), under the bush
  (a plank), into the oak's hollow (an egg),
- **noise:** "Buuu! Kra kra!" scares the jay off Ruda's acorns,
- **low reach:** the blueberries (the first handful goes into his mouth),
- **grab what he shouldn't:** the toadstool, and Gucio stops him.
He helps name the town: Gucio "Gniazdo!", Julek "Nieźdo!", Lech "Gniezno!". He also gets the last beat of the game: he's holding the white feather in the morning.

**A bird is always "Goło"** (user, 2026-11-21): Julek never says "ptak"; plural too ("Goło! Trzy!").

New words in this game are only simple real words (las, broda, piórko, kotek,
jagody, kropki, jajo) and noises (kra kra, buuu, plum plum, kum kum, mniam, szur szur,
tok). No new toddler words. "Kapko" (apple) is used at the apple tree.

**New poses:** `shout_r` (hands round his mouth), `eat_r` (blueberry-purple face,
cheeks full), `feather_r` (holding up the feather, for the outro card only). `crawl_r`
and `dig_r` are reused.

Gucio's little brother, 2 years old. The second protagonist: he follows Gucio
everywhere, and the player uses him as a "power" on things (crawl into small
spaces, make a funny noise or face, charm someone, grab things like a two-year-old).

## Personality
Cheerful, fearless, cheeky, easily delighted. Doesn't understand the mission but
is completely sure he's helping. Copies his big brother. Laughs at everything,
especially his own jokes.

## Look (for art)
Approved ref: `assets/ref/chars/julek.png`. Short wispy blond hair, **no hood**,
fluffy cream fleece footed pyjamas, chubby, big curious eyes. About 3 heads tall,
half Gucio's height. Toddles, crawls fast.

Game sprites in `assets/game/chars/julek/`: `idle_r`, `walk_r` (16 frames),
`talk_r` (3), `crawl_r`, `static_r` (hair on end; game 1's static puzzle).
Inventory icon (Julek as a "power" item): `assets/game/items/julek.png`.
Intermediates in `assets/raw/chars/julek/`.

## Voice brief
- Voice: "Kuon" (ElevenLabs library, `B8gJV1IhpuegLxdpXFOE`), an adult female character voice.
- Model: **`eleven_v3`** on every Julek line (`"model": "eleven_v3"` in the lines JSON),
  `language_code` pl, with audio tags in `direction`: `[giggles]`, `[excited]`,
  `[laughs]`, `[whispers]`.
- Gucio is cast separately on `eleven_multilingual_v2`. Gucio calls him Julek or Julcio.

## Speech style
**Very simple: one or two words per sentence, at most.** No grammar, no adverbs, no
conjugated verbs, no filler words. A name plus one word is the usual sentence:
"Gucio, oci!" and never "Gucio, chodź tutaj!". Whatever he wants, he says it with a
noun, a name or one of his words: "Da katko!", "Tam!", "Kotek!", "Nie!". He calls
himself "Jujo". Noises and giggles do the rest of the talking.

Before writing any Julek line, check it:
- 1–2 words per sentence (3 only with a noise: "Brrrum, ato, brrrum!").
- No word he wouldn't say: tutaj, dobrze, teraz, proszę, wejdzie, mały → cut.
- No full sentence. If the line needs one, Gucio says it instead.

### Julek's words (from the user; use these, never the adult forms)
| adult word | Julek says |
|---|---|
| ciastko | **katko** |
| Julek | **Jujo** |
| jabłko | **kapko** |
| autko | **ato** |
| daj | **da** |
| chodź | **oci** |
| (sleepy, wants to sleep) | **aaa** |
| jest (found something) | **jeś** |
| a kuku (peekaboo) | **kuku** (approved 2026-11-10) |
| gniazdo (nest) | **nieźdo** (approved 2026-11-21; his part in naming Gniezno, outro card 1) |
| nie ma (gone, none left) | **nie ma** (approved 2026-11-10) |

Rules:
- The subtitle shows exactly what he says ("Katko!"), not the adult word.
- When it matters to the plot, Gucio repeats it in proper words ("Ciastko? Nie
  teraz, Julek!"). That keeps every hint understandable to a player who doesn't
  know Julek's words.
- Julek's words can be hints themselves: he shouts "Ato!" at the toy car the
  player needs.
- Add new toddler words only with the user's approval. Otherwise use simple real
  words (kotek, Gucio, jeszcze, nie!, tam!) and noises (brrrum, am am, hihi, bleee).

### Sample lines
- `[excited]` "Gucio, oci! Oci!"
- `[giggles]` "Jujo! Tam!" (meaning "I'll crawl in there")
- "Da katko! Da! … Am, am!"
