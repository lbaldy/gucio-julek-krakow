# W smoczej jamie (`den`)
Chapter: V · Connects to: outro (cards) · Music: soft, wondering (the town theme in a music-box arrangement) · Ambience: water drips, the embers ticking, sleepy bleats

## Purpose
The rescue, short and emotional (about 2 minutes). Gucio opens the dragon's gate and
the sheep go home. Kłębuszek is missing, until Julek crawls into the hollow and finds
him. The promise is kept.

## Visual (for the art prompt)
Inside the dragon's cave at night, eye level, wide 3/4 view. Cosy, not scary: lit warm
orange by a glowing **ember pit** and the moonlight from the mouth.
- **Centre-left:** a wooden **gate in a rough fence** of logs, closing off a big hollow
  in the rock; behind it, **piles of hay** (the sheep sleep here). A heavy wooden **bar**
  across the gate at Gucio's reach.
- **Centre:** the dragon's **bed**, a huge flattened nest of hay with a dent in it.
- **Right:** a heap of the knights' **helmets and shields**, kept like trophies.
- **Right, low in the rock wall:** a small round **hollow**, toddler-sized.
- **Back:** the glowing **ember pit**; the cave **mouth** at the far left with the moonlit
  river beyond.
- **Floor:** sandy cave floor with scattered hay across the lower third.

No people, no sheep, no dragon, no lamb, no text.

**Variant** `bg_open`: the gate swung open, the bar on the ground.

## Hotspots
| id | name | where | look | interact | notes |
|----|------|-------|------|----------|-------|
| gate | brama z zasuwą | centre-left | "Owce są za płotem! Zasuwa jest wysoko, ale ja sięgnę!" | → open (scripted) | Julek: gucio: "Julcio, to dla dużych." |
| sheep_pen | owce | behind the gate (sprites) | "Śpią na sianie. Całe stado!" | "Owieczki, wstawajcie!" | gone after they leave |
| dragon_bed | smocze legowisko | centre | "Smocze legowisko. Ale ogromne!" | "Brr, jeszcze ciepłe." | Julek: "Aaa…" `[lies down, sleepy]` · gucio: "Nie śpimy tu, Julcio!" |
| helmets | hełmy rycerzy | right | "Hełmy rycerzy! Smok je zbierał." | "Oddamy je królowi." | |
| embers | żar | back | "Żar. Smok tu grzał łapy." | "Gorące! Nie dotykam." | |
| hollow | dziurka w skale | right, low | before: "Za mała dziura dla mnie."; after the count: "Stamtąd słychać meee… i wystaje ogonek!" | "Za mała dziura dla mnie. Julek?" | **Julek: crawls in → Kłębuszek** |
| cave_exit | wyjście | far left | "Wyjście nad rzekę." | before Kłębuszek: "Bez Kłębuszka nie wracamy!" | after: → outro |

## Pickups
None. (Kłębuszek is scripted; he follows the boys.)

## State changes
- `bg` → `bg_open` when the gate opens.
- The sheep (3 sprite variants, ~6 placed) wake and walk out to the left (prop tweens),
  bleating.
- After the count, the hollow gets a glowing tuft and the lamb's little tail poking out
  (a sprite).
- Kłębuszek: `lamb_curled` (in the hollow, only the tail shows) → Julek comes out hugging
  him (`julek_hug_r`) → `lamb_stand` beside Julek.

## Characters present
- gucio, julek; **dratewka** at the cave mouth with the lantern (no topics; one line).
- **sheep**, **klebuszek** (sprites, sfx).

## Puzzles
1. **The gate:** tap it → Gucio lifts the bar (`lift_r`) → `bg_open` → the sheep wake and
   trot out to the shepherd ("Beee! Beee!").
2. **The count:** gucio: "Jedna, dwie, trzy… wszystkie… oprócz Kłębuszka!" Silence. A
   tiny "Meee…" from the hollow; the tuft glows, the tail appears.
3. **Kłębuszek:** Julek on the hollow → he crawls in: "Kuku?… Beee!" → he backs out
   hugging the lamb. Kłębuszek: "Meee!" (sfx) · gucio: "Kłębuszek! Julek, znalazłeś go!"
   · julek: "Jeś!" `[proudly, hugging]` → the exit opens → `outro`.

## Lines (draft)
- `den.enter.1`: dratewka: "Tu mieszkał smok… Patrzcie, owce!"
- `den.enter.2`: julek: "Beee!" `[excited]`
- `den.gate.look`: gucio: "Owce są za płotem! Zasuwa jest wysoko, ale ja sięgnę!"
- `den.gate.use`: gucio: "Hop! Otwarte! Owieczki, do domu!"
- `den.gate.julek`: gucio: "Julcio, to dla dużych."
- `den.count.1`: gucio: "Jedna, dwie, trzy… wszystkie… oprócz Kłębuszka!"
- `den.count.2`: gucio: "Kłębuszku? Gdzie jesteś?"
- `den.hollow.look`: gucio: "Za mała dziura dla mnie."
- `den.hollow.look.after`: gucio: "Stamtąd słychać meee… i wystaje ogonek!"
- `den.hollow.use`: gucio: "Za mała dziura dla mnie. Julek?"
- `den.hollow.julek.1`: julek: "Kuku?" `[gently]`
- `den.hollow.julek.2`: julek: "Beee!" `[softly, like to a friend]`
- `den.hollow.julek.3`: gucio: "Kłębuszek! Julek, znalazłeś go!"
- `den.hollow.julek.4`: julek: "Jeś!" `[proudly, hugging]`
- `den.sheep_pen.look`: gucio: "Śpią na sianie. Całe stado!"
- `den.sheep_pen.use`: gucio: "Owieczki, wstawajcie!"
- `den.dragon_bed.look`: gucio: "Smocze legowisko. Ale ogromne!"
- `den.dragon_bed.use`: gucio: "Brr, jeszcze ciepłe."
- `den.dragon_bed.julek`: julek: "Aaa…" `[sleepy]`
- `den.dragon_bed.julek.gucio`: gucio: "Nie śpimy tu, Julcio!"
- `den.helmets.look`: gucio: "Hełmy rycerzy! Smok je zbierał."
- `den.helmets.use`: gucio: "Oddamy je królowi."
- `den.embers.look`: gucio: "Żar. Smok tu grzał łapy."
- `den.embers.use`: gucio: "Gorące! Nie dotykam."
- `den.cave_exit.look`: gucio: "Wyjście nad rzekę."
- `den.cave_exit.locked`: gucio: "Bez Kłębuszka nie wracamy!"
- `den.cave_exit.use`: gucio: "Do domu, Kłębuszku! Pasterz czeka."

## Build status
- [x] Greybox and walkthroughs
- [x] Background: 1K draft → 2K final (heavy bar across the gate, conical helmets)
- [x] Patches: `gate_open` (bar on the ground), `hollow_tail` (tail + glowing tuft), `fg_gate` occluder while closed
- [x] Sheep peek over the closed gate on the hay; they leave through the gate (engine: `actorWalk(…, "free")`)
- [x] Gucio `lift_r`, Julek `hug_r`, Kłębuszek `idle_r`
- [x] Chrome pass: gate → sheep out → count → tail → Julek in the hollow → hug → Kłębuszek beside the boys
- [ ] Lines locked → VO
- [ ] Music, ambience
