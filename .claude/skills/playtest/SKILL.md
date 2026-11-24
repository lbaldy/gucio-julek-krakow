---
name: playtest
description: Verify the game actually works — headless walkthrough tests, then a real play session in Chrome via the claude-in-chrome tools using the engine's dev hooks, screenshots and console logs. Use after any engine or content change, and before telling the user something is done.
---

# Playtesting

There are two layers. Fast automated tests catch logic bugs; a real browser
session catches everything visual. "Done" means both passed.

## 1. Headless (seconds, every change)

```
cd game && npm run check && npm test
```
Walkthroughs live in `game/tests/walkthroughs/<name>.json`. They're step lists
run against the headless engine with instant timing:
```json
{"start": {"scene": "attic", "spawn": "default", "give": [], "set": []},
 "steps": [
   {"look": "window"},
   {"use": "key"},
   {"expect": "has:key"},
   {"item": "key", "on": "chest"},
   {"talk": "old_man"}, {"choose": 2}, {"choose": 3},
   {"go": "to_hall"},
   {"expect": "scene:hall && door_unlocked"}
 ]}
```
Every puzzle path in `design/game.md` should be covered by a walkthrough. The
main one, `full.json`, plays the whole game start to end, and grows as scenes
are added. Also add a test that tries the *wrong* things (using items on the
wrong targets) and expects the fail lines and no state change.

## 2. In the browser (before handing anything to the user)

1. Start the dev server in the background: `cd game && npm run dev`, with
   `run_in_background`, on port 5173.
2. Load the **claude-in-chrome** skill, then open a new tab at
   `http://localhost:5173/?scene=<id>&debug=1`.
3. Screenshot it. Check that the art loads, nothing is a placeholder that
   shouldn't be, and the polygons in the debug overlay sit on their objects.
4. Drive it with `window.__game` through the javascript tool, rather than by
   pixel clicks where possible:
   `await __game.idle(); __game.targets()` → `__game.click("window")` → `await __game.idle()`.
   Use real mouse clicks (the computer tool) at least once per scene, to prove
   input and hover labels work.
5. Read the console for `[say]` and `[act]` lines, and for errors (filter by
   pattern: `\[say\]|\[act\]|Error`).
6. Check visually at each puzzle beat:
   - the hero's size is believable at the front and back of the room;
   - the hero walks *behind* occluders and in front of what's behind them;
   - subtitles are readable and don't run off the screen;
   - the inventory icon appears on pickup, and the world sprite disappears;
   - exits lead where they should, arriving at the right spawn.
7. Film every scripted action (`__game.film`, engine skill): the hand meets the thing, it vanishes in
   the hand, feet leave the ground in a jump, nobody is hidden behind anybody.
8. Without `fast=1`, play one scene at normal speed and judge pacing: walk speed,
   line timing, and fades.
9. Stop the dev server when finished.

## Reporting

For the user, give: what was tested, the walkthrough results, 2–4 screenshots of
the key moments, and every problem found, with severity. Never say "works" for
something that was only checked headless.

If the browser tools fail twice in a row, stop and tell the user. Don't
keep retrying.
