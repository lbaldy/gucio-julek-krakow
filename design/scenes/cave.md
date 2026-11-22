# Smocza jama (`cave`, outside at dusk)
Chapter: V · Connects to: burp (cards), then den · Music: dragon/cave tension theme (new); **silence** at the sniff · Ambience: dusk river, frogs, crickets, the dragon's slow snoring from inside, puffs of smoke

## Purpose
The climax. Fix Krak's cart, push the fake sheep to the cave, face the low point (the
dragon isn't fooled by a sheep that doesn't bleat), and win with Julek's "Beee!", the
payoff of the bedroom.

## Visual (for the art prompt)
The rocky foot of Wawel hill by the Vistula at golden-pink summer dusk, eye level, wide
3/4 view. Friendly, not scary: warm sky, the first stars, soft orange light.
- **Centre-right:** the big **cave mouth** in the limestone rock, round and dark inside,
  lit from within by a warm **orange glow**; a curl of grey smoke drifting out of the top.
  Some scattered hay and a few tufts of wool on the ground in front.
- **Left:** the **river** with tall **reeds** and a sandy strip; the far bank, misty.
- **Centre-left:** a flat open space of sand and grass where the cart stands.
- **Foreground right:** a **big boulder** (people can hide behind it) and bushes.
- **Above:** the hill rises out of frame, with the stronghold's palisade just visible at
  the top edge, lit by the sunset.
- **Floor:** sand and grass across the lower third, from the reeds to the cave mouth.

No people, no dragon, no cart, no wheel, no text.

## Hotspots
| id | name | where | look | interact | notes |
|----|------|-------|------|----------|-------|
| cart | wóz króla Kraka | centre-left (prop) | "Wóz króla. Koło odpadło! Gdzie ono jest?" | → wheel / peg / push | states: no wheel → wheel loose → fixed |
| fake_sheep | sztuczna owca | on the cart | "Nasza owca. Wygląda… prawie jak prawdziwa." | before the dragon: "Jedziemy pod jamę!"; at the dragon: **Julek → Beee!** | |
| cave_mouth | wejście do jaskini | centre-right | "Smocza jama. Świeci w środku… i chrapie." | "Nie wchodzę tam! Smok śpi." | |
| smoke | dym | above the mouth | "Smok dmucha przez sen. Pff… pff…" | "Kaszl, kaszl!" | |
| reeds | trzciny | left | "Trzciny nad Wisłą. Coś tam leży… okrągłego!" | → wheel (pickup) | |
| river | Wisła | left | "Wisła o zachodzie. Pięknie." | "Nie teraz. Smok czeka." | |
| boulder | głaz | foreground right | "Duży kamień. Można się za nim schować." | "Za ciężki." | the hiding spot in the beat |
| path_back | droga do osady | left edge | "Tędy do osady." | "Nie teraz! Smok czeka." | not an exit |

## Pickups
| id | name | where | look |
|---|---|---|---|
| wheel | koło od wozu | half-hidden in the reeds, a glowing tuft beside it | "Koło od wozu!" |
| peg | szewski kołek | from Dratewka (talk) | "Drewniany kołek. Utrzyma koło!" |
| wool_cave_1 | kłębek wełny | beside the wheel in the reeds | "Kłębek wełny!" |
| wool_cave_2 | kłębek wełny | on a bush by the boulder | (same) |
| wool_cave_3 | kłębek wełny | in a low crack in the rock (Julek) | (same); "Za nisko dla mnie… Julek?" |

## State changes
- The cart: `cart_nowheel` (tilted) → `cart_wheel` (wheel on, wobbly) → `cart_fixed`;
  then pushed (a prop tween) to the cave mouth.
- The dragon (a big character sprite in the cave mouth): `dragon_sniff` → `dragon_doubt`
  (squinting, one eyebrow up) → `dragon_happy` (eyes shut, mouth open). He gulps the fake
  sheep and goes back inside; the cards take over.

## Characters present
- **dratewka**: by the cart, shaking a bit, holding a lantern. Topics:
  - "Masz kołek?" (after the wheel is seen or found) → `peg`
  - "Boisz się?" (him: "Trochę… Ale wy jesteście dzielni, to i ja będę.")
  - "Pa pa!"
- **dragon**: appears in the beat.

## Puzzles
1. **The wheel:** the reeds → `wheel`. Wheel on the cart → it wobbles: "Nie trzyma się…
   potrzebny kołek." (unlocks Dratewka's peg topic).
2. **The peg:** talk to Dratewka → `peg` ("Szewc zawsze ma kołek!"). Peg on the cart →
   `cart_fixed`. (Either order: peg first is accepted too; the cart needs both.)
3. **The push:** tap the fixed cart → Gucio pushes it to the cave mouth (`push_r`), then
   everyone hides: Gucio and Dratewka behind the boulder, and Julek toddles behind the fake
   sheep, playing hide-and-seek ("Kuku!"), before Gucio can stop him.
4. **The low point (scripted):** snoring stops. A big sniff. The dragon's head comes out.
   dragon: "Owca?… Mniam…" (`dragon_sniff`) · dragon: "Owca… która nie beczy? Hmmm…"
   (`dragon_doubt`). **The music stops.** Silence, only the frogs. Dratewka shakes.
   gucio (whispering): "On czeka, aż owca zabeczy… Kto umie beczeć?"
5. **Beee:** Julek on the fake sheep (Julek is behind it already) → julek: "Beee! Beee!"
   (`shout_r` from behind the sheep) → dragon: "Beczy! Owca! Moja!" → `dragon_happy`,
   GULP → `burp` cards.
   - Any other action meanwhile: gucio: "Ćśś! Ja nie umiem beczeć jak owca."
   - Idle hint (shorter, 15 s here): julek (whisper): "Beee?"

## Lines (draft)
- `cave.enter.1`: dratewka: "Smocza jama… Słyszycie? Chrapie."
- `cave.enter.2`: gucio: "Wóz się przechylił! Koło odpadło!"
- `cave.cart.look`: gucio: "Wóz króla. Koło odpadło! Gdzie ono jest?"
- `cave.cart.look.wheel`: gucio: "Koło jest, ale się chwieje."
- `cave.cart.look.fixed`: gucio: "Gotowe! Jedziemy pod jamę."
- `cave.cart.use.wheel`: gucio: "Nie trzyma się… potrzebny kołek."
- `cave.cart.use.peg`: gucio: "Kołek! Trzyma!"
- `cave.cart.julek`: julek: "Ato!" `[excited]`
- `cave.cart.julek.gucio`: gucio: "To nie autko, Julcio, to wóz króla!"
- `cave.reeds.look`: gucio: "Trzciny nad Wisłą. Coś tam leży… okrągłego!"
- `cave.wheel.pickup`: gucio: "Koło od wozu!"
- `cave.dratewka.look`: gucio: "Dratewka trochę się trzęsie. Ja też."
- `cave.dratewka.talk.peg.1`: gucio: "Masz kołek?"
- `cave.dratewka.talk.peg.2`: dratewka: "Szewc zawsze ma kołek! Proszę."
- `cave.dratewka.talk.scared.1`: gucio: "Boisz się?"
- `cave.dratewka.talk.scared.2`: dratewka: "Trochę… Ale wy jesteście dzielni, to i ja będę."
- `cave.dratewka.talk.bye`: dratewka: "Jestem tuż obok."
- `cave.fake_sheep.look`: gucio: "Nasza owca. Wygląda… prawie jak prawdziwa."
- `cave.cave_mouth.look`: gucio: "Smocza jama. Świeci w środku… i chrapie."
- `cave.cave_mouth.use`: gucio: "Nie wchodzę tam! Smok śpi."
- `cave.smoke.look`: gucio: "Smok dmucha przez sen. Pff… pff…"
- `cave.river.look`: gucio: "Wisła o zachodzie. Pięknie."
- `cave.boulder.look`: gucio: "Duży kamień. Można się za nim schować."
- `cave.path_back.use`: gucio: "Nie teraz! Smok czeka."
- `cave.push.1`: gucio: "Pchamy! Raz, dwa… hop!"
- `cave.push.2`: gucio: "Chowamy się za kamień! Julek… Julek?"
- `cave.push.3`: julek: "Kuku!" `[giggles, from behind the sheep]`
- `cave.push.4`: gucio: "Julek, nie teraz!"
- `cave.dragon.1`: dragon: "Owca?… Mniam…" `[sniffing]`
- `cave.dragon.2`: dragon: "Owca… która nie beczy? Hmmm…" `[suspicious]`
- `cave.dragon.3`: gucio: "On czeka, aż owca zabeczy… Kto umie beczeć?" `[whispering]`
- `cave.dragon.wrong`: gucio: "Ćśś! Ja nie umiem beczeć jak owca." `[whispering]`
- `cave.dragon.hint`: julek: "Beee?" `[whispering]`
- `cave.beee.1`: julek: "Beee! Beee!" `[loud, proud]`
- `cave.beee.2`: dragon: "Beczy! Owca! Moja!"
- `cave.beee.3`: gucio: "Julek! Udało się!" `[whispering, amazed]`

## Build status
- [x] Greybox and walkthroughs
- [x] Background: 1K draft → 2K final; smoke painted back in with a crop-edit
- [x] Geometry: scale 0.75 @1060 → 0.42 @740; boulder is an fg occluder (hand-masked) so the hide works
- [x] Cart: no wheel / wobbly wheel / fixed (with the fake sheep), plus a smaller copy at the cave mouth
- [x] Wheel (world + icon), peg icon, Gucio `push_r`
- [x] Dragon painted into the cave mouth as bg patches: sniff / doubt / happy (flags `dragon_sniff|doubt|happy`)
- [x] Engine: companion `stay_if` keeps Julek hidden behind the cart while `julek_hiding`
- [x] Chrome pass: wheel → peg → push → hide → sniff → doubt → Julek's Beee → happy → burp → den
- [ ] Optional: a gulp frame (the sheep vanishes on the cut to the cards)
- [ ] Lines locked → VO
- [x] Music, ambience, the silence at the sniff
