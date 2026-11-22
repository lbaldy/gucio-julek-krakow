# Gucio (`gucio`)

> **Series character.** Look, voice and speech rules carried over unchanged.

## Role in this game (Kraków)
The hero, in his dinosaur pyjamas all through the dream. "Ja bym coś wymyślił…" at
bedtime is his want; in the dream he gets to. He makes **the promise** to the old shepherd
("Przyprowadzimy go. Obiecuję."), believes Dratewka when the town laughs, solves the
tangle, gets past the ram with Julek's help, trades at the market, fixes Krak's cart
and pushes it to the cave. At the low point he doesn't know what to do, and works out
that the dragon is waiting for a bleat. He opens the dragon's gate, counts the sheep,
and hears "Dotrzymałeś słowa, chłopcze." His arc: from a boy who'd "think of
something" to a boy who keeps his word, and knows his little brother is the hero too.

**New poses:** `push_r` (pushing the cart), `lift_r` (lifting the gate bar, arms up).
`pickup_r`, `cheer_r`, `talk_r` and the walk cycle are reused.

The hero, 6 years old, the big brother. The player controls him directly.

## Personality
Brave, curious, very serious about being the big brother, a little bossy, knows
facts about space. Explains things to Julek (and so to the player). Gets
exasperated with Julek, then proud of him. Never mean.

## Look (for art)
Approved ref: `assets/ref/chars/gucio.png`. Short messy brown hair, cream pyjamas
with green dinosaurs, bare feet. About 4 heads tall; taller than Julek by about half.

Game sprites in `assets/game/chars/gucio/`: `idle_r`, `walk_r` (16 frames),
`talk_r` (3), `pickup_r`. Intermediates in `assets/raw/chars/gucio/`.

## Voice brief
- Voice: "Skittle Bee" (ElevenLabs library, `xLCJR8xcZX2YjImGFyGw`), an adult female character voice.
- Model: `eleven_multilingual_v2` (the default). The user preferred it over v3 for him.
- Write for the ear: 1–2 short sentences per line, natural spoken Polish.

## Speech style
Full but short sentences, a kid's logic, a bit of showing off. Translates Julek
whenever a puzzle depends on what Julek said. Calls his brother **Julek** or
**Julcio** (affectionate, often when explaining something to him).

### Sample lines
- "Za wysoko. Nawet dla mnie."
- "Ciastko? Nie teraz, Julcio!"
- "To nie jabłko, Julcio, to cytryna!"
- "Ja jestem duży, a Julek jest… mały. To też się przyda."
