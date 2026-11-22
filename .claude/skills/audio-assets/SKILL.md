---
name: audio-assets
description: Produce game audio with ElevenLabs — cast character voices, record voiceover from the game's line files, and make sound effects, ambience loops and music. Use when casting a character, when a scene's dialogue is locked, or when a scene needs sound.
---

# Audio assets

All audio is `.mp3`. Final files live under `assets/game/audio/`, which the game
loads as `audio/...`.

| What | File |
|---|---|
| voiceover line | `game/audio/vo/<line_id>.mp3` (written by `tools.vo_batch`) |
| sound effect | `game/audio/sfx/<name>.mp3` |
| ambience loop | `game/audio/amb/<name>_loop.mp3` |
| music | `game/audio/music/<name>.mp3` |

## Casting voices (per character)

Input: the voice brief in `design/characters/<id>.md` (age, accent, timbre,
energy, and one sentence of attitude).

1. **Try the free option first.** List the account's voices
   (`python -m tools.voice voices`). If a premade voice fits, assign it; that's free:
   `python -m tools.voice assign <id> <voice_id>`.
2. Otherwise **design** one (~1,000 cr estimate; three previews per call):
   ```
   python -m tools.voice design <id> "<voice brief: age, gender, accent, timbre, pace, attitude>" \
     --text "<100+ chars in the character's own speech style, taken from the sample lines>"
   ```
   Always use a line from the design doc, so the user hears the character, not a
   generic sample.
3. Tell the user where the previews are
   (`assets/voice_designs/<id>/preview_{1,2,3}.mp3`) and **let them pick**. I
   can't listen to audio, so casting is the user's call. Then run
   `python -m tools.voice pick <id> <n>`.
4. The narrator (if any) and the protagonist matter most. Cast them first.

## Voiceover

Lines live in `game/content/lines/<scene>.json`, which the game reads too:
```json
{
  "attic.window.look": {"speaker": "hero", "text": "Thirty years of dust. Somebody wanted this forgotten."},
  "attic.window.look.2": {"speaker": "hero", "text": "Still dusty.", "direction": "[sighs]", "model": "eleven_v3"}
}
```
- **Only record when the scene's dialogue is locked.** The game shows subtitles
  and times them by text length when an mp3 is missing, so it's fully playable
  without VO.
- Plan, check the cost, then record:
  ```
  python -m tools.vo_batch --scene attic          # plan + cost
  python -m tools.vo_batch --scene attic --go     # record (asks nothing; you asked the user first per CLAUDE.md)
  ```
- Changed a line's text? `vo_batch` marks it **stale**. Re-record with `--stale`.
- Default model: `eleven_multilingual_v2` (stable). For lines that need acting
  (whispers, laughs, shouting), set `"model": "eleven_v3"` with a `"direction"`
  audio tag. The tag is ignored for other models.
- Write for the ear: short sentences, with punctuation that sets the rhythm
  ("Locked. Of course it's locked."). Spell names out phonetically if the model
  mispronounces them.
- **Short made-up or baby-talk words get read as another language.** "Jujo" came out as
  Spanish "huho". Respell them in `"spoken"` in the model's reading ("Yuyo", "Oć") and keep the
  real spelling in `text`.
- **A v3 audio tag only covers the phrase after it.** `[whispers]` at the start whispered the
  first sentence only; repeat the tag before every sentence in `"spoken"`. For calm, sleepy or
  goodnight lines, v2 stability/style tweaks don't help (the user found them "even worse");
  a v3 `[whispers]` does.
- **Per-line delivery:** `"voice": {"stability": …, "style": …, "speed": …}` on a line overrides
  the voice settings for that line in `vo_batch`. Changing it (or `spoken`) makes the line
  stale, so re-record with `--stale --only <id>`.
- **When the story says one character imitates another's sound** (a parrot repeating a robot's
  laugh), copy the exact mp3 to the second line id and make its subtitle match. The user
  hears any difference; a pitch-shifted version was rejected. Re-copy it if the source is re-recorded.
- Numbers, dates and abbreviations: keep them in `text` (the subtitle) and add a
  `"spoken"` field with them written out in words. TTS reads `spoken`.
- I can't hear the results. After the first batch for a character, ask the user to
  listen to 2–3 lines before recording the rest.

## Sound effects and ambience

```
python -m tools.voice sfx "heavy wooden door creaks open slowly, old hinges" --duration 2.5 --out game/audio/sfx/door_creak.mp3
python -m tools.voice sfx "quiet harbor at night, gentle waves, distant gulls, rope creaking" --duration 20 --loop --out game/audio/amb/harbor_loop.mp3
```
- Describe the *source and the material*, not the emotion. Keep it short: UI clicks
  0.5 s, actions 1–3 s, ambience loops 15–30 s with `--loop`.
- Reuse generic sounds across scenes (footsteps, pickup, inventory open) instead
  of making one per scene. Keep a shared set: `sfx/ui_*`, `sfx/pickup`, `sfx/fail`.
- **Check every new sfx isn't silent:** `ffmpeg -i f.mp3 -af volumedetect -f null -`. One
  "boing" came out peaking at −41 dB. Below about −20 dB peak, change the prompt and regenerate
  (normalizing near-silence just amplifies noise).

## Loudness

**Voiceover is levelled automatically.** `vo_batch` saves each raw take in `assets/raw/audio/vo/`
and writes a two-pass loudnorm copy at **−18 LUFS** (true peak −1.5) to `game/audio/vo/`.
Voices differ by up to 12 dB: the narrator came out at −30 LUFS next to Gucio's −18, and the
user found the narrator too quiet in every earlier game. `python -m tools.vo_batch --renorm`
re-levels everything already recorded (free). Never copy a TTS file into `vo/` by hand without
levelling it.

ElevenLabs output volume varies wildly (ambience came out anywhere from −24 to −49
LUFS). Normalize every music and ambience file before use, keeping the original in
`assets/raw/audio/`: music to **−20 LUFS** (the VO level), in-scene music (a radio,
a cassette, a pianist) to **−24**, ambience to **−30 LUFS**. Sound effects too: actions
**−21**, UI (`pickup`, `combine`, `fail`) **−26**, `card` **−24**, stings **−18**.
Crossfade the music's loop point (2–3 s) before normalizing. In zsh write `${d}`
inside ffmpeg filter strings, since `$d:c1` is read as a modifier.
The engine's loop gains (`audio.ts`: music 0.45, ambience 0.7) assume these levels.

**Equal LUFS doesn't mean equally audible.** What matters is masking. Sparse ambience (fire
crackle, a clock) at −30 sits fine under music. Steady broadband noise (wind, rain, engine
hum, crowd) drowns strings and pads at that level, so put it at **−40 to −42**. Dense music
(strings, pads, full arrangement) needs about **+4 dB** over a sparse one (music box, solo
piano), so −16 instead of −20. A flight theme at −20 over −30 wind was inaudible to the user,
while the −20 music-box lullaby over −30 fireplace was fine.
**"I can't hear the music":** first check it's actually playing and how the sliders are set
(see the engine skill, Volume). Then think about masking. Only then regenerate.

## Music

```
python -m tools.voice music "melancholic harbor theme, accordion and soft strings, slow waltz, loopable, no vocals" --seconds 90 --out game/audio/music/harbor.mp3
```
- One track per *area or mood*, not per scene. Usually 60–120 s, made to loop.
- Music is the most expensive audio per call. Always `--dry-run` first, and get the
  user's OK for each track.
