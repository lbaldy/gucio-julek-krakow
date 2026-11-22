# Julek (`julek`)

> **Series character.** Look, voice and speech rules carried over unchanged.

## Role in this game (Kraków)
Follows Gucio through the legend in his fleece footed pyjamas. One trick per puzzle,
never the same twice in a row:
- **bounce** (bedroom): "Beee! Beee! Hop!" in his crib shakes the book off the shelf.
  It sets up the climax.
- **crawl** (workshop): under the workbench for Dratewka's needle.
- **charm** (meadow): gives the grumpy ram Bodzio a dandelion and strokes his nose ("Kotek!").
- **peekaboo** (market): "Kuku!" makes the baker's crying baby laugh.
- **grab** (market, optional gag): snatches a sulphur stone and sniffs it: "Fe!"
- **noise** (cave): "Beee!" from behind the fake sheep. The dragon is fooled. His only
  noise trick in the game, and the payoff of the bedroom.
- **crawl** again (den): into the hollow for Kłębuszek, the emotional twin of the needle.
He shouts "Kako!" when the town is named Kraków, receives Kłębuszek's tuft of wool
("dla najlepszego beczącego pomocnika"), and holds it in the morning.

**A bird is always "Goło"** (user, 2026-11-21): Julek never says "ptak"; plural too.

Words in this game: approved toddler words (kuku, jeś, katko, ato, aaa, nie ma), the
user's new words for this game (Kako, Cima, Faitek, Kuj, Alo; table below), simple real
words (smok, but, kotek, pa pa) and noises (beee, bum,
fe, mniam, hop, ojej, apsik, ha ha).

**New poses:** `bounce_r` (hopping, arms up; or `cheer_r` with a hop tween if it reads),
`offer_r` (holding out a dandelion), `peekaboo_r` (hands over his eyes), `fuj_r`
(scrunched face, holding a stone at arm's length), `hug_r` (hugging the lamb),
`wool_r` (holding up the tuft, morning). `crawl_r`, `shout_r`, `cheer_r` are reused.

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
| Kraków | **Kako** (user, 2026-11-22; his part in naming Kraków, outro card 3) |
| ciemno (dark) | **cima** (user, 2026-11-22) |
| kwiatek (flower) | **faitek** (user, 2026-11-22) |
| król (king) | **kuj** (user, 2026-11-22) |
| halo (hello) | **alo** (user, 2026-11-22) |
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
