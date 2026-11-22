---
name: engine
description: Architecture, content formats, scripting API and coding conventions for the game engine in game/ (TypeScript + Vite + Canvas2D, no frameworks). Use before writing or changing any game code, scene scripts or content JSON — and to bootstrap the engine if game/ doesn't exist yet.
---

# Engine

A small custom point-and-click engine: **TypeScript (strict), Vite, Canvas2D, no
runtime dependencies.** Logical resolution 1920×1080, letterboxed to the window.
The engine is generic; everything specific to this game lives in `game/content/`.

> **Keep this file true.** When you change the engine's API or content formats,
> update the reference sections below in the same change.

## Layout

```
game/
  index.html  package.json  tsconfig.json  vite.config.ts   (publicDir: ../assets/game)
  src/
    main.ts                 boot: load content → new Game(adapters) → start
    content.ts              import.meta.glob of everything in content/
    engine/
      types.ts              content types (SceneData, CharacterData, ItemData, LineData…)
      api.ts                defineScene / defineDialogue / defineCombos + the GameAPI interface
      ── pure logic (no DOM; runs in Node for tests) ──
      state.ts              flags, inventory, current scene, serialize/deserialize
      cond.ts               condition strings: "door_open", "!has:key", "a && !b"
      path.ts               walkable polygons, blocked holes, visibility graph + A*
      world.ts              scene instance: targets, actors, scaling, z-order
      script.ts             async script runner: input lock, skip, fast mode
      dialogue.ts           dialogue tree runtime
      game.ts               ties it together; implements GameAPI; emits events
      ── adapters (browser) ──
      render.ts  input.ts  audio.ts  assets.ts
      ui/ layout.ts (canvas UI rects)  screens.ts (DOM title menu, options, start screen)
      dev.ts                window.__game, URL params, F1 debug overlay
    editor/                 dev-only scene editor (F2): editor.ts, shapes.ts, panel.ts, format.ts
      headless.ts           no-op adapters + instant timing, for tests
  content/
    game.json  characters.json  items.json
    lines/<scene>.json  lines/_global.json
    scenes/<scene_id>/scene.json   scenes/<scene_id>/scene.ts
    dialogues/<dialogue_id>.ts
    combos.ts
    item_looks.ts           scripted looks for inventory items (optional)
  scripts/validate.ts       npm run check: content cross-references
  scripts/editor_server.ts  Vite plugin: the scene editor's save endpoint
  tests/walkthrough.test.ts + tests/walkthroughs/*.json
```

Scripts: `npm run dev` (Vite, port 5173), `npm run build`,
`npm run check` (`tsc --noEmit` + validate), `npm test` (vitest, headless walkthroughs).
After **adding** a walkthrough JSON (or any file picked up by `import.meta.glob`),
run `npx vitest --clearCache` once: vitest's fs module cache otherwise keeps the
old glob result and silently skips the new file.

## Core behaviour

- **Input (modern two-button):** left-click a target runs its default verb
  (`use`, or `talk` for characters, `go` for exits). Left-click the floor walks.
  Right-click is `look`. Hovering shows the target's name at the cursor. An
  inventory item becomes the cursor; clicking a target with it runs
  `items[itemId]`, otherwise the generic fail line.
- **Cursor (`render.ts` `cursor()`, `CURSORS`):** players (especially pre-readers) must see at a
  glance what's clickable, so the system cursor changes with what's under it: a gold star over
  a usable target, arrows over exits (left/right by the exit's side of the screen), a pointer over
  menus, choices, inventory slots and the skip hint, the plain arrow elsewhere. While an item is
  held, the system cursor is hidden and the item's icon *is* the pointer, centred on it, growing
  and glowing gold over any target. (A star cursor next to an offset icon read as "broken".)
  Cursors are inline SVG data URLs; guard everything on `g.scene` (the title screen has none). Right-clicking an item
  looks at it. Double-clicking the floor or a target makes the hero run there (2× speed, walk
  cycle 2× faster; `RUN` in `game.ts`); double-clicking an exit skips the walk. Scripted walks never run. Esc skips the current
  line or cutscene; when idle it opens the menu. Touch: tap = left, double-tap = double-click, long-press = right.
- **Walking:** clicks are clamped to the nearest walkable point. If the straight
  line stays inside, walk straight; otherwise A* over the visibility graph of
  polygon vertices. Before `use`/`talk`/item actions the hero walks to the
  target's `walk_to` and faces `face`. `look` doesn't walk.
- **Scale and depth:** actor scale is interpolated linearly by feet y between
  `scale.far_y`/`far` and `scale.near_y`/`near`. Everything is drawn sorted by
  baseline: actors by feet y, objects by `baseline` (default: the sprite's
  bottom edge), fg layers by `baseline`. The background is always first.
- **Speech:** `say` shows a subtitle above the speaker in their `text_color`.
  If `audio/vo/<line_id>.mp3` exists, it plays and sets the duration; otherwise the
  duration is max(1.5 s, 0.055 s × characters). A click advances. Talk frames
  cycle while speaking (driven by VO amplitude when there's audio). A speaker needn't be an
  actor: a character painted as background patches plus a hotspot (someone in a bed) can speak,
  and the subtitle falls back to a default position.
- **Asset loading:** nothing loads up front except the title image, fonts and (in the
  background) item icons. `goto` and `load` await the optional `Adapters.prepare(scene)` behind
  the black fade; `main.ts` uses it to load that scene's images (background, objects, patches,
  fg, the hero's and the scene actors' frames) and then warm up the scenes its exits lead to.
  While it runs, `game.loading` is set, input is ignored, and after 300 ms the renderer draws
  pulsing dots in the corner. The menu warms up the start (or saved) scene.
- **Missing assets never crash.** A missing image renders as a labelled
  placeholder box (actors: a capsule of `height_px`). That makes greyboxing
  free: scenes are playable before any art exists.
- **Saving:** the `auto` slot in localStorage is written every time a script run
  ends (each action, dialogue, scene change; not once `game_end` is set). On boot
  without dev params, a DOM title menu (`ui/screens.ts`) offers Continue (only when
  a loadable autosave exists), New game and Options. A save whose scene no longer
  exists is ignored. The in-game menu (Esc) has resume / save / load / options /
  new game, with one manual slot.
- **Volume:** three channels (`music`, `sfx` (which includes ambience), `voice`), each a
  gain bus in `AudioOut`. The Options panel's sliders set them live; they're stored in
  localStorage `settings:volume`, separate from saves. The in-game menu opens the panel
  through the optional `Adapters.options()` adapter. UI strings: `ui.continue_game`, `ui.options`,
  `ui.back`, `ui.volume_music|sfx|voice` in `game.json`. Slider values are squared into gain
  (`gainOf`), so 20% is ~4%: when someone "can't hear" something, read `settings:volume` from
  localStorage and the live state (`__game.game.io.audio`: `loops`, `buses`) before touching files.
- **Menu look:** `fonts.title`/`fonts.menu` are registered as the `GameTitle`/`GameMenu` families
  (`ui/fonts.ts`) and used by both the DOM screens and the canvas Esc menu, which share one
  style: ink strips, typewriter caps, ochre on hover. `ui.tagline` is optional and shows under the title.
  Overlay keyboard handling is a stack: only the topmost overlay gets keys. The state is
  `{scene, flags, inventory, visited, hero position}` and nothing else; loading
  doesn't re-run the scene's `enter`.

## Content formats

### game.json
```json
{"title": "…", "title_image": "ui/title.png", "fonts": {"title": "fonts/BebasNeue-Regular.ttf", "menu": "fonts/CourierPrime-Bold.ttf"},
 "start_scene": "attic", "start_spawn": "default", "intro_scene": "intro", "hero": "hero",
 "fail_lines": {"use": ["_.use.fail.1", "_.use.fail.2"], "item": ["_.item.fail.1"], "look": ["_.look.fail.1"]}}
```

`intro_scene` (optional): `newGame()` without a scene plays it first; its script ends by
going to `start_scene`. Continue, Load and dev jumps skip it.

Optional extras (all off unless set):
- `"start_inventory": ["torch"]`: items the player starts with.
- `"fail_lines": {"items": {"torch": ["_.torch.fail.1"]}}`: per-item fail lines, used when
  that item is used on something with no handler (before the generic `item` lines).
- `"companions": [{"id": "dog", "offset": [150, 10]}, {"id": "ghost", "if": "ghost_awake", "offset": [-110, 40]}]`:
  characters that follow the hero. `offset` is [px behind, px up] at scale 1; if the spot
  behind is against a wall, they stand in front. They are re-placed on scene entry and load,
  and added or removed whenever their `if` changes. A scene that places the same id as an
  actor keeps its own actor; `"no_companions": true` on a scene (or `no_hero`) drops them.
  Companion ids are valid targets in every scene that has them (handlers live in `globals.ts`).
  `"stay_if": "julek_hiding"` keeps a companion where a script placed it (hiding behind a prop) while
  the condition holds, instead of trailing the hero.
- `"one_tap": true`: for pre-readers. The first tap on a hotspot/object looks (flag
  `looked:<scene>/<id>`), later taps use; a `use` with no line falls back to the look. An object with `"pickup": true`
  skips the look tap (children read "nothing happened" into a look line on a pickup). Tapping
  an actor talks, an exit goes.
- `"inventory_always": true`: the inventory bar stays on screen.
- `"idle_hint_ms": 40000`: after this long with no progress (a flag other than `looked:` or a
  new item), the scene's `hint` handler runs, else the global one.
- `"clock": {"times": [{"if": "act3", "time": "23:59"}, {"if": "act2", "time": "12:00"}, {"time": "8:00"}]}`:
  a story clock in the top-right corner (`clock.ts`, drawn by `render.ts`). The first entry whose
  condition holds sets the time, so it is derived from flags, survives saves and never runs on
  its own. When the time moves forward the hands spin to it (240 game-min per second); loads snap.
  It shows a sun by day and a moon by night, and is hidden in `no_hero` scenes. Scripts play a
  chime and `wait` ~1.5 s after setting the flag so the player sees the spin.
  `"marks": "second_"` makes the 12 hour marks a collectible counter: each set flag with that
  prefix lights one mark gold, clockwise from one o'clock (`clockMarks`).

### characters.json
```json
{"hero": {"name": "Ada", "height_px": 520, "float_px"?: 0, "text_color": "#ffd27f", "speed": 420,
  "anims": {"idle_r": {"frames": 1, "fps": 1}, "walk_r": {"frames": 6, "fps": 10},
            "talk_r": {"frames": 3, "fps": 8}, "pickup_r": {"frames": 1, "fps": 1, "hold_ms": 400}}}}
```
Frames are loaded from `chars/<id>/<anim>/NN.png`. An anim may carry `"offset": [dx, dy]`
(sprite pixels at scale 1, from the feet, mirrored with the sprite) and `"scale"` (a size
factor) when a pose's frames don't line up with the standing ones; `_r` holds them for both
directions. Fit them with the scene editor rather than by hand. `scale` is also how an animal
cut from a video is sized against the people (a cat should reach a toddler's hip). Measure the
*figure's* height in each frame set, not the canvas: walk frames with a 378 px figure in a 470 px
canvas make the hero shrink whenever he walks.
A character with a `run_r` cycle and `"run_speed"` (px/s at scale 1) uses them when running
(`g.actorWalk(id, to, "run")`, or the hero's double-click): the cycle plays in real time at
that speed instead of the generic 2× walk. Set `speed`/`run_speed` = stride × fps so feet don't
skate. `g.actorWalk(id, to, "free")` walks straight to `to`, ignoring the walkable area (animals
leaving a pen behind a fence). `_l` variants are mirrored
from `_r` unless their folder exists. A missing anim falls back to `idle`.
`float_px` lifts a flying character (a fairy) off its feet point and gives it a gentle bob;
its hit box and subtitle move with it.
`glow` (a CSS colour) draws a soft pulsing light around the character while it holds no pose.
`pose_if` holds poses by condition: `{"dim": "!ghost_awake"}` shows `dim_r` while that is
true. It's derived from flags every frame, so it survives saves (a scripted `g.pose()` wins,
but isn't saved). Walking beats any pose, so a posed companion uses its walk cycle when it moves.
While talking, a posed character uses `<pose>_talk_r` frames if it has them (e.g. `dim_talk_r`),
otherwise it holds the pose; an unposed one uses `talk_r`.

### items.json
```json
{"key": {"name": "rusty key", "icon": "items/key.png"}}
```
The look line for an item is `item.<id>.look`, in `lines/_global.json`.

### scenes/<id>/scene.json (geometry and art; edited with the help of the image tools)
```json
{
  "id": "attic",
  "background": "scenes/attic/bg.png",
  "music": "music/house.mp3", "ambience": "amb/attic_wind_loop.mp3",
  "walkable": [[[100,1060],[1820,1060],[1500,760],[400,760]]],
  "blocked":  [[[900,900],[1100,900],[1100,980],[900,980]]],
  "scale": {"near_y": 1040, "near": 1.0, "far_y": 780, "far": 0.6},
  "spawns": {"default": {"x": 960, "y": 950, "facing": "right"},
             "from_hall": {"x": 160, "y": 950, "facing": "right"}},
  "hotspots": [
    {"id": "window", "name": "dusty window", "polygon": [[800,200],[1100,200],[1100,500],[800,500]],
     "walk_to": [950, 800], "face": "up"}
  ],
  "objects": [
    {"id": "key", "name": "rusty key", "sprite": "items/key_world.png", "x": 1210, "y": 905,
     "visible_if": "!has:key && !taken:key", "walk_to": [1180, 960]}
  ],
  "patches": [{"image": "scenes/attic/door_open.png", "x": 1420, "y": 310, "visible_if": "attic_door_open"}],
  "fg": [{"image": "scenes/attic/fg_beam.png", "x": 0, "y": 0, "baseline": 1080}],
  "exits": [
    {"id": "to_hall", "name": "hallway", "polygon": [[0,600],[120,600],[120,1000],[0,1000]],
     "walk_to": [160, 950], "target": "hall", "spawn": "from_attic", "enabled_if": "attic_door_open"}
  ],
  "actors": [{"id": "old_man", "x": 1500, "y": 900, "facing": "left", "visible_if": "!old_man_left"}],
  "points": {"old_man_at_window": [980, 880]}
}
```
`points` are named positions for scripts (cutscene marks, where someone ends up):
`g.actorWalk("old_man", g.point("old_man_at_window"))`. **Never hard-code coordinates in
scene scripts**; put them in `points` so the scene editor can move them. Validation checks
every `g.point("…")` name.
An actor's optional `"look": "<folder>"` draws its frames from `chars/<folder>/` instead of
`chars/<id>/` (same character, another outfit; it reuses the character's anims). Pair it with
`"height_px"` when that outfit's height differs (a bust vs a standing figure): it sizes the
placeholder, hit box and subtitle position.
A patch draws under everything by default; `"baseline"` gives it a depth like an fg layer, so
`"baseline": 9999` lays a full-screen still (a book page, a close-up) over the characters.
Patches can be animated stills: `"fade_in_ms"` dissolves a patch in each time it becomes
visible, and `"drift": {"from": [zoom, fx, fy], "to": [...], "ms": 9000}` moves a slow camera
over it (eased; focus fx/fy as 0..1 of the image, zoom ≥ 1; give `w`/`h` and the image can be
larger than that for a sharp zoom). Both are timed from when it became visible (the renderer
tracks that, so they cost nothing in headless tests). The `intro` scene uses them.
`"skip_hint": true` shows `ui.skip` in the corner while a cutscene runs; clicking it skips like Esc.
`"no_hero": true` makes a screen without the hero (a travel map): the hero isn't
drawn and floor clicks do nothing. It still needs one tiny `walkable` polygon and
a `default` spawn; the hero's subtitles appear at that spawn.
An object's hit area is its sprite's opaque pixels, unless it has a `polygon`.
Conditions: a flag name, `has:<item>`, `taken:<object>`, `visited:<scene>`, `scene:<id>`, `!`
for negation, and `&&` between terms. Nothing fancier; put real logic in TS.

### lines/<scene>.json
`{"<line_id>": {"speaker": "<char_id>|narrator", "text": "…", "spoken"?: "…", "direction"?: "[whispers]", "model"?: "eleven_v3", "voice"?: {"stability": 0.6, "style": 0.1, "speed": 0.9}}}`
(`spoken`: what TTS reads, for respellings and inline v3 tags; `voice`: per-line delivery
settings for `vo_batch`. Both are part of the line's hash, so changing them needs `--stale`.)
The game and `tools/vo_batch.py` both read these. **All spoken or displayed
story text goes through line IDs**; never hard-code strings in scripts.

### scenes/<id>/scene.ts (behaviour)
```ts
import { defineScene } from "../../../src/engine/api";

export default defineScene("attic", {
  async enter(g) {
    if (!g.visited("attic")) await g.say("attic.enter.first");
  },
  targets: {
    window: {
      // look omitted → plays "attic.window.look" automatically if that line exists
      use: (g) => g.say("attic.window.use"),
      items: { crowbar: async (g) => { await g.anim("hero", "reach"); g.set("window_open"); await g.say("attic.window.item.crowbar"); } },
    },
    key: {
      use: async (g) => { await g.anim("hero", "pickup"); g.take("key"); await g.say("attic.key.use"); },
    },
    old_man: { talk: (g) => g.dialogue("old_man_intro") },
    to_hall: {
      go: async (g) => { if (!g.flag("attic_door_open")) return g.say("attic.to_hall.locked"); return g.goto("hall", "from_attic"); },
    },
  },
});
```
`take(item)` on an object also marks `taken:<object>`. Exits with no `go`
handler just `goto(target, spawn)`. An optional `hint(g)` handler is the scene's idle hint
(also what a helper character says when asked); without it the global hint runs.

### globals.ts (handlers that work in every scene)
```ts
export default defineGlobals({
  targets: { dog: { look: …, talk: …, items: { bone: … } } }, // fallback when a scene has no handler
  hint: (g) => g.say("_.hint.generic"),
});
```
A scene's own handler for a target/verb wins; `globals.targets` fills the gaps (used for
companions). Validation checks its target ids, items and line ids.

### minigames/<id>.ts (action sequences)
```ts
export default defineMiniGame({
  images: ["scenes/race/car.png"],          // preloaded; ctx.image(path) returns null until loaded
  init(ctx) {}, update(ctx, dt) {}, draw(ctx, c /* CanvasRenderingContext2D, 1920×1080 */) {},
  pointer(ctx, [x, y], down /* true on press, false on move */) {},
});
```
Images come through the optional `Adapters.images` (`main.ts` provides it; headless has none).
Started with `await g.minigame("race")`; it resolves when the mini-game calls
`ctx.finish()`. `ctx.api` is the GameAPI (say, sfx, set), `ctx.elapsed` is ms since start.
Subtitles draw on top. After 10 s the skip hint shows and Esc/clicking it finishes it. In
fast mode (headless tests) it finishes at once without calling `update`, so set any result
flags it guarantees in the scene script, not only inside the mini-game.

### dialogues/<id>.ts
```ts
export default defineDialogue("old_man_intro", {
  with: "old_man",
  start: "root",
  nodes: {
    root: [
      { say: "attic.old_man.q_who", reply: ["attic.old_man.a_who.1", "attic.old_man.a_who.2"], once: true },
      { say: "attic.old_man.q_key", if: "seen_chest", reply: ["attic.old_man.a_key"], then: (g) => g.set("knows_key"), goto: "key" },
      { say: "attic.old_man.bye", exit: true },
    ],
    key: [ /* … */ ],
  },
});
```
The option's text is the `say` line's text (the hero speaks it), and `reply` lines
play in order. `once` options disappear after use, `if` is a condition string,
and `goto` switches node.
Options read themselves aloud (the hero's recorded voice for that line, no subtitle) when
hovered with a mouse; on touch the first tap reads an option and a second tap picks it.

### combos.ts (item + item)
`export default defineCombos({ "rope+hook": async (g) => { g.drop("rope"); g.drop("hook"); g.give("grapple"); await g.say("combo.grapple"); } });`
The order of the pair doesn't matter.

### item_looks.ts (scripted item looks)
`export default defineItemLooks({ letter: async (g) => { await g.say("item.letter.read"); g.set("read_letter"); } });`
Right-clicking an item runs its handler here if there is one, otherwise it plays
`item.<id>.look`.

## GameAPI (`g` in scripts)

| call | effect |
|---|---|
| `say(lineId)` | speak or show a line; resolves when it's done |
| `card(lineId)` | full-screen title card (narrator); plays its VO if recorded and stays until it ends, otherwise timed by text length; click skips |
| `end(lineId)` | final title, drawn big over the current picture (end on a picture-card scene, like the intro); sets `game_end`, plays its VO, stays up |
| `pose(actorId, name \| null)` | hold a pose anim (e.g. `sit`, `sleep`) until cleared with `null` |
| `walkTo(targetId \| [x,y])`, `face(dir)` | move or turn the hero |
| `point(name)` | a named position from the scene's `points` |
| `actorWalk(id, [x,y] \| targetId, "walk" \| "run")`, `actorFace(id, dir)`, `place(id, [x,y])` (teleport, e.g. in `enter`), `actorSay` is just `say` with that speaker's line | NPCs |
| `anim(actorId, name)` | play an anim once from its first frame, hold the last, resolve after `hold_ms` or frames/fps |
| `wait(ms)` | pause (skippable) |
| `flag(name)`, `set(name, v=true)`, `unset(name)`, `visited(scene)` | state |
| `has(item)`, `give(item)`, `take(item)` (pick up from scene), `drop(item)` | inventory |
| `show(id)`, `hide(id)` | toggle objects, actors and patches (stored as flags) |
| `goto(scene, spawn?)` | fade, change scene, run `enter` |
| `dialogue(id)` | run a dialogue tree |
| `sfx(name)`, `music(name \| null)`, `ambience(name \| null)` | audio |
| `cutscene(async fn)` | lock input; Esc fast-forwards to the end |
| `cond(expr)` | evaluate a condition string |
| `minigame(id)` | run `minigames/<id>.ts` until it finishes |

## Dev hooks (used by playtesting; keep them working)

- URL params: `?scene=attic&spawn=default&give=key,rope&set=door_open&fast=1&debug=1`.
  `fast` makes walks, waits and lines instant, and skips the title menu and the
  click-to-start screen. A dev jump without `fast` still shows the click-to-start screen,
  which exists so browsers unlock audio before the first card.
  Without `spawn`, a jump uses `start_spawn` only for `start_scene`, else `default`.
  `give` and `set` are applied before the scene is entered, so its `enter()` and the
  companions see them.
- `F1` / `debug=1`: draw walkable areas, blocked areas, hotspots, exits and walk_to
  points, and show mouse coordinates.
- `window.__game`:
  - `state()`, `targets()` (id → screen centroid, visible, enabled), `click(id | [x,y], double?)`,
    `look(id)`, `useItem(item, id)`, `lookItem(item)`, `choose(n)` (dialogue option),
    `goto(scene, spawn)`, `give(item)`, `set(flag)`, `idle()` (a promise that
    resolves when no script or walk is running), and `log` (the event log).
- Console: every line logs `[say] <line_id> <speaker>: <text>`, and every action
  logs `[act] …`. Playtesting reads these.

## Scene editor (dev server only)

`F2` or `?edit=1` opens an overlay editor on the running scene (`src/editor/`; loaded via a
dynamic import under `import.meta.env.DEV`, so it isn't in the production build). It edits
the live `SceneData` and rebuilds `g.walk`, so a Ctrl/⌘-click test walk uses the new
geometry at once. You can drag polygon corners (walkable, blocked, hotspots, exits,
object/actor hit polygons), objects, patches, fg, actors' feet, spawns, `walk_to` points, a
selected object's or fg layer's baseline, the depth-scale lines and script `points`.
Double-clicking an edge adds a corner, Del removes one, and there's undo/redo.
**Variations:** the panel lists every condition term the scene's JSON and `scene.ts` check
(flags, `has:`, `taken:`, `visited:`). Ticking them changes the live state, and
"re-enter scene" re-runs `enter` so script-placed variations show up. **Poses:** select a
character, pick a pose, then Shift-drag the character or type values to set that anim's
`offset`/`scale` in `characters.json`. `⌘S` POSTs to
`/__editor/save` (`scripts/editor_server.ts`, a Vite plugin), which writes
`content/scenes/<id>/scene.json` (and `content/characters.json`) through `src/editor/format.ts` (the house JSON style) and
suppresses the HMR reload for that write. Prefer it over hand-editing coordinates when
fixing placement against the art. It can't add or remove hotspots or objects: those need
script entries, so do them in JSON and TS.

## Validation (`npm run check`; fix every error before calling work done)

`scripts/validate.ts` checks:
- every `say/reply/line` ID used in TS exists in lines JSON (a regex scan for string literals);
- every hotspot, object, actor and exit has a name; every exit's `target` scene
  and `spawn` exist;
- every target ID in `scene.ts` exists in `scene.json`;
- every item ID used exists in `items.json`; every speaker exists in
  `characters.json` (or is `narrator`);
- missing art and VO files are **warnings**, not errors (greyboxing is allowed);
- each hotspot without a look line, and without a `look` handler, is a warning.

## Coding conventions

- Strict TypeScript, ES modules, no classes where a plain function will do,
  and no runtime dependencies. Dev deps only: typescript, vite, vitest, tsx.
- Pure logic never touches `window`/`document`; it talks to adapters through
  interfaces, which is what lets `npm test` play the game headless.
- No game-specific content or strings in `src/engine/`.
- Small files, named exports, one concern per module.
- After any engine change: run `npm run check && npm test`, then playtest the
  affected behaviour in the browser (see the **playtest** skill).

## Sample content (template)

`game/content/` starts with a tiny sample game: `intro` (cards) → `attic` (pickup,
item-on-hotspot, locked exit opened with an item) → `hall` (dialogue that gives an item,
item+item combo, scripted item look, conditional music, `end`), so `npm run dev` shows
every content format. A copy of it lives in `tests/fixtures/sample/` as a test fixture:
`loadSample()` (`tests/fixtures/sample/load.ts`) assembles it with `assembleContent()` from
`src/content.ts`, the same way `loadContent()` assembles `content/`. `tests/engine.test.ts`
runs on the fixture, so engine tests never depend on the real game; `walkthrough.test.ts`
plays `tests/walkthroughs/*.json` against the real game and
`tests/fixtures/sample/walkthroughs/*.json` against the fixture.

When the real game's first scenes exist, delete the sample scenes, lines, items,
characters and dialogue from `content/`. Leave the fixture alone; the tests keep working.
`import.meta.glob` options must be written inline (an object literal), not passed as a variable.

## Bootstrap (only if `game/` doesn't exist)

1. `npm create vite@latest game -- --template vanilla-ts`, then clear out the
   demo, set `publicDir: '../assets/game'` and `server.port: 5173`, and add
   vitest and tsx.
2. Build in this order, with a test for each pure module: `state` + `cond` →
   `path` → `world` → `script` → `game` + headless → `render`/`input`/`assets`
   with placeholders → `ui` (subtitles, hover label, inventory) → `dialogue` →
   `audio` → `dev` → `validate.ts` → menu and saving.
3. Content for a tech demo: two greybox scenes, one exit each way, one pickup,
   one item-on-hotspot puzzle and one dialogue. A walkthrough test covers it all.
4. Playtest it in Chrome, then show the user.
