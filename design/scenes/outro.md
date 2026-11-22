# Kłębuszek wraca do domu (`outro`, cards + bedroom morning)
Chapter: – · Music: the feast finale (new) → `home` for the morning · Ambience: per card

## Purpose
About 2 minutes. Every promise and arc pays off, each character has their own moment,
and only one card carries facts. Then home: the dream touches real life. Feeling and
turn: joy → pride → a festive name → tenderness → wonder.

## Cards
| # | id | picture | layers | sound | lines |
|---|---|---|---|---|---|
| 1 | `outro_reunion` | Night, the riverbank under Wawel, lanterns. The sheep stream out of the cave toward the old shepherd; Kłębuszek leaps into his arms; Gucio and Julek watch, Julek clapping. | the sheep (drift toward him) | bleats, a happy lamb "meee" | shepherd: "Kłębuszku!… Dotrzymałeś słowa, chłopcze." · gucio: "Obiecałem." |
| 2 | `outro_hero` | Morning in the town street, the doors open; townspeople (the merchant and baker in front) cheer and lift Dratewka on their shoulders; Krak beside him, crown straight now. | — | a cheering crowd | krak: "Szewczyku, byłeś mądrzejszy niż wszyscy moi rycerze." · dratewka: "Sam bym nie dał rady. To oni!" (points at the boys) |
| 3 | `outro_feast` | Sunset feast on Wawel hill: long tables, lanterns, a garland, everyone together, the river gold below. People raise their cups to Krak. | lanterns (twinkle) | festive folk music; the crowd chanting | narrator: "Na cześć dobrego króla gród nazwano Krakowem." · crowd: "Kraków! Kraków!" · julek: "Kako!" `[shouting happily]` · gucio: "Kraków, Julcio!" |
| 4 | `outro_gift` | Close and warm: the shepherd kneels and gives Julek a soft white tuft of wool; Kłębuszek nuzzles Julek; Gucio smiles. | the tuft (soft glow) | quiet; the feast far away | shepherd: "Dla najlepszego beczącego pomocnika." · julek: "Beee!" `[softly, proud]` |
| bonus | `outro_bonus` (all 12 wool tufts) | The meadow at sunset: Kłębuszek jumping over the boys like a little ball, the boys laughing. | the lamb (hops) | a giggle, a "meee" | shepherd: "Znowu skacze!" |
| 5 | `outro_today` | Today: the metal Wawel dragon statue by the Vistula under the castle, breathing a real burst of fire; a family with children watching. | the flame (flickers) | a whoosh of fire; city sounds | narrator: "Pod Wawelem, nad Wisłą, do dziś stoi smok. I naprawdę zieje ogniem. Ale owiec już nie zabiera." |

Then → **the bedroom morning** (`bedroom`, `bg_morning`, scripted, no player control):
1. Julek sits up in the crib holding a tuft of white wool. julek: "Beee!" `[proud]`
2. mama (from the doorway, off-screen): "Dzień dobry, owieczki! To co, dokończymy legendę?"
3. gucio: "Mamo, ja wiem, jak się skończyła!" · julek: "Smok! Bum!" `[puffs out his cheeks]`
4. mama: "Skąd ta wełna?… W wakacje pojedziemy do Krakowa. Zobaczycie prawdziwego smoka."
5. **The last card** `outro_end`: the morning bedroom close-up, Julek with the tuft, Gucio
   grinning at the player, Mama's hand on the door frame. gucio: "To chyba nie był zwykły
   sen…" The end title fades in over this card (series pattern: never a black screen).

## Lines (draft)
- `outro.reunion.shepherd`: shepherd: "Kłębuszku!… Dotrzymałeś słowa, chłopcze."
- `outro.reunion.gucio`: gucio: "Obiecałem."
- `outro.hero.krak`: krak: "Szewczyku, byłeś mądrzejszy niż wszyscy moi rycerze."
- `outro.hero.dratewka`: dratewka: "Sam bym nie dał rady. To oni!"
- `outro.feast.narrator`: narrator: "Na cześć dobrego króla gród nazwano Krakowem."
- `outro.feast.crowd`: crowd (merchant + baker + Krak layered, or a crowd sfx with words): "Kraków! Kraków!"
- `outro.feast.julek`: julek: "Kako!" `[shouting happily]`
- `outro.feast.gucio`: gucio: "Kraków, Julcio!"
- `outro.gift.shepherd`: shepherd: "Dla najlepszego beczącego pomocnika."
- `outro.gift.julek`: julek: "Beee!" `[softly, proud]`
- `outro.bonus.shepherd`: shepherd: "Znowu skacze!"
- `outro.today.narrator`: narrator: "Pod Wawelem, nad Wisłą, do dziś stoi smok. I naprawdę zieje ogniem. Ale owiec już nie zabiera."
- `outro.morning.1`: julek: "Beee!" `[proud]`
- `outro.morning.2`: mama: "Dzień dobry, owieczki! To co, dokończymy legendę?"
- `outro.morning.3`: gucio: "Mamo, ja wiem, jak się skończyła!"
- `outro.morning.4`: julek: "Smok! Bum!" `[puffing out his cheeks]`
- `outro.morning.5`: mama: "Skąd ta wełna?… W wakacje pojedziemy do Krakowa. Zobaczycie prawdziwego smoka."
- `outro.end.gucio`: gucio: "To chyba nie był zwykły sen…"

## Art notes
- Card 3 is the only place with a crowd; keep it a painted crowd (no sprites).
- Card 5 shows the real statue (a modern metal sculpture of a dragon on a rock by the
  river), painted in the series style. No text, no signs.
- The morning beat uses the bedroom `bg_morning` plus a new Julek pose holding the tuft
  (`wool_r`); `outro_end` is a card.
