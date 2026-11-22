import { expect, test } from "vitest";
import { evalCond } from "../src/engine/cond";
import { WalkArea } from "../src/engine/path";
import { newState } from "../src/engine/state";
import { loadSample as loadContent } from "./fixtures/sample/load";
import { Game } from "../src/engine/game";
import { headlessAdapters } from "../src/engine/headless";
import { centroid } from "../src/engine/world";
import { choiceRects } from "../src/engine/ui/layout";
import type { Content } from "../src/engine/game";

test("conditions", () => {
  const s = newState("attic");
  s.flags.door_open = true;
  s.inventory.push("key");
  expect(evalCond("door_open && has:key && scene:attic", s)).toBe(true);
  expect(evalCond("!door_open", s)).toBe(false);
  expect(evalCond("!has:rope && !taken:rope", s)).toBe(true);
  expect(evalCond(undefined, s)).toBe(true);
});

test("paths go around a blocked hole", () => {
  const area = new WalkArea([[[0, 0], [1000, 0], [1000, 400], [0, 400]]], [[[400, 100], [600, 100], [600, 400], [400, 400]]]);
  const path = area.find([100, 300], [900, 300]);
  expect(path.length).toBeGreaterThan(1);
  let prev: [number, number] = [100, 300];
  for (const p of path) {
    expect(area.clear(prev, p)).toBe(true);
    prev = p;
  }
  expect(path[path.length - 1]).toEqual([900, 300]);
});

test("clicks outside are clamped to the walkable area", () => {
  const area = new WalkArea([[[0, 500], [1000, 500], [1000, 1000], [0, 1000]]]);
  const [x, y] = area.clamp([300, 100]);
  expect(area.inside([x, y])).toBe(true);
  expect(Math.abs(x - 300)).toBeLessThan(15);
});

test("autosave after each action resumes in a fresh game", async () => {
  const content = loadContent();
  const io = headlessAdapters();
  const a = new Game(content, io, true);
  await a.newGame();
  await a.run(() => a.api.set("autosave_probe"));
  const b = new Game(content, io, true);
  expect(b.load("auto")).toBe(true);
  expect(b.state.flags.autosave_probe).toBe(true);
  expect(b.state.scene).toBe(a.state.scene);
  expect(b.state.inventory).toEqual(a.state.inventory);
});

test("a new game plays the intro and ends where the first scene starts", async () => {
  const content = loadContent();
  const g = new Game(content, headlessAdapters(), true);
  await g.newGame();
  const said = g.events.flatMap((e) => (e.t === "say" ? [e.id] : []));
  expect(said[0]).toBe("intro.card.1");
  expect(said).toContain("attic.enter.first");
  expect(g.state.scene).toBe(content.config.start_scene);
  expect(g.state.visited).toContain("intro");
});

test("music a script started survives a save and resume", async () => {
  const content = loadContent();
  const io = headlessAdapters();
  const a = new Game(content, io, true);
  await a.newGame();
  await a.run(() => a.api.music("hall"));
  const played: (string | null)[] = [];
  const b = new Game(content, { ...io, audio: { ...io.audio, music: (p) => void played.push(p) } }, true);
  expect(b.load("auto")).toBe(true);
  expect(played.at(-1)).toBe("audio/music/hall.mp3");
});

test("a scene's music follows its first matching rule", async () => {
  const content = loadContent();
  const io = headlessAdapters();
  const played: (string | null)[] = [];
  const g = new Game(content, { ...io, audio: { ...io.audio, music: (p) => void played.push(p) } }, true);
  await g.newGame("attic");
  await g.run(() => g.api.goto("hall"));
  expect(played.at(-1)).toBe("audio/music/hall.mp3");
  g.api.set("got_letter");
  await g.run(() => g.api.goto("attic"));
  await g.run(() => g.api.goto("hall"));
  expect(played.at(-1)).toBe("audio/music/hall_late.mp3");
});

test("a save pointing at a scene that no longer exists is ignored", () => {
  const io = headlessAdapters();
  io.storage.set("save:auto", JSON.stringify(newState("no_such_scene")));
  expect(new Game(loadContent(), io, true).load("auto")).toBe(false);
});

/** A fast-booted game switched to real timing, so walks take frames. */
async function timedGame(scene: string) {
  const g = new Game(loadContent(), headlessAdapters(), true);
  await g.newGame(scene);
  Object.assign(g, { fast: false });
  return g;
}

function framesToArrive(g: Game): number {
  let n = 0;
  while (g.hero().path.length && n < 10_000) {
    g.update(16);
    n++;
  }
  return n;
}

test("a double-click runs to the floor point twice as fast", async () => {
  const times: number[] = [];
  for (const double of [false, true]) {
    const g = await timedGame("hall");
    const to = g.targets().find((t) => t.id === "to_attic")!.walk_to!;
    expect(g.targetAt(to)).toBeNull();
    g.pointerDown(to, "left", double);
    expect(g.hero().running).toBe(double);
    times.push(framesToArrive(g));
    expect(g.hero().running).toBe(false);
  }
  expect(times[0]).toBeGreaterThan(10);
  expect(times[1]).toBeLessThan(times[0] * 0.6);
});

test("a double-click on an exit skips the walk", async () => {
  const g = await timedGame("hall");
  const exit = g.targets().find((t) => t.id === "to_attic")!;
  const at = centroid(exit.poly);
  g.pointerDown(at, "left");
  expect(g.hero().path.length).toBeGreaterThan(0);
  g.pointerDown(at, "left", true);
  expect(g.hero().path.length).toBe(0);
  expect(Math.hypot(g.hero().x - exit.walk_to![0], g.hero().y - exit.walk_to![1])).toBeLessThan(2);
});

// ── Features added while building a real game, tested on the sample content plus a little injected data. ──

/** Sample content with private copies of the data a test may change. */
function sampleContent(tweak: (c: Content) => void = () => {}): Content {
  const c = loadContent();
  c.config = structuredClone(c.config);
  c.characters = structuredClone(c.characters);
  c.scenes = structuredClone(c.scenes);
  c.lines = { ...c.lines };
  tweak(c);
  return c;
}

async function gameWith(scene: string, tweak: (c: Content) => void, timed = false) {
  const g = new Game(sampleContent(tweak), headlessAdapters(), true);
  await g.newGame(scene);
  if (timed) Object.assign(g, { fast: false });
  return g;
}

const withPet = (c: Content) => {
  c.characters.pet = { name: "Pet", height_px: 200, text_color: "#fff", speed: 420, anims: { idle_r: { frames: 1, fps: 1 } } };
  c.characters.ghost = { name: "Ghost", height_px: 400, text_color: "#fff", anims: { idle_r: { frames: 1, fps: 1 } } };
  c.config.companions = [{ id: "pet" }, { id: "ghost", if: "ghost_on" }];
};

test("companions follow the hero into scenes, and a flag brings one along", async () => {
  const g = await gameWith("attic", (c) => {
    withPet(c);
    c.scenes.hall.no_companions = true;
  });
  const ids = () => g.actors.map((a) => a.id);
  expect(ids()).toContain("pet");
  expect(ids()).not.toContain("ghost");
  await g.run(() => g.api.set("ghost_on"));
  expect(ids()).toContain("ghost");
  await g.run(() => g.api.goto("hall", "from_attic"));
  expect(ids()).not.toContain("pet"); // no_companions
});

test("a companion trails the hero and keeps its distance", async () => {
  const g = await gameWith("attic", withPet, true);
  const pet = g.actors.find((a) => a.id === "pet")!;
  g.pointerDown([1600, 1000], "left");
  for (let i = 0; i < 400 && (g.hero().path.length || pet.path.length); i++) g.update(16);
  expect(Math.hypot(pet.x - g.hero().x, pet.y - g.hero().y)).toBeLessThan(260);
  expect(pet.x).toBeLessThan(g.hero().x); // behind, walking right
});

test("one tap: the first tap describes a hotspot, the next one uses it", async () => {
  const g = await gameWith("attic", (c) => (c.config.one_tap = true), true);
  Object.assign(g, { fast: true });
  const said = () => g.events.flatMap((e) => (e.t === "say" ? [e.id] : []));
  const at = centroid(g.targets().find((t) => t.id === "window")!.poly);
  g.pointerDown(at, "left");
  await g.idle();
  expect(said().at(-1)).toBe("attic.window.look");
  g.pointerDown(at, "left");
  await g.idle();
  expect(said().at(-1)).toBe("attic.window.use");
});

test("one tap: a pickup object is used on the first tap", async () => {
  const g = await gameWith("attic", (c) => {
    c.config.one_tap = true;
    c.scenes.attic.objects!.find((o) => o.id === "crowbar")!.pickup = true;
  }, true);
  Object.assign(g, { fast: true });
  const t = g.targets().find((t) => t.id === "crowbar")!;
  g.pointerDown(centroid(t.poly), "left");
  await g.idle();
  expect(g.events.flatMap((e) => (e.t === "say" ? [e.id] : [])).at(-1)).toBe("attic.crowbar.use");
});

test("a held item can have its own fail lines", async () => {
  const g = await gameWith("attic", (c) => {
    c.lines["_.crowbar.fail"] = { speaker: c.config.hero, text: "Not with a crowbar." };
    c.config.fail_lines.items = { crowbar: ["_.crowbar.fail"] };
  });
  g.api.give("crowbar");
  await g.act("use", "window", "crowbar");
  expect(g.events.flatMap((e) => (e.t === "say" ? [e.id] : [])).at(-1)).toBe("_.crowbar.fail");
});

test("a mini-game runs until it finishes, and can be skipped after 10 s", async () => {
  const g = await gameWith("attic", (c) => {
    c.minigames = { ...c.minigames, noop: { init() {}, update() {}, draw() {} } };
  }, true);
  let done = false;
  void g.run(async () => {
    await g.api.minigame("noop");
    done = true;
  });
  await new Promise((r) => setTimeout(r, 0));
  expect(g.mini).not.toBeNull();
  g.key("Escape"); // too early to skip: it pauses instead
  expect(g.menuOpen).toBe(true);
  g.update(5000);
  expect(g.mini!.ctx.elapsed).toBe(0);
  g.key("Escape");
  for (let i = 0; i < 700; i++) g.update(16); // ~11 s
  expect(g.mini).not.toBeNull();
  expect(g.skipHintShown()).toBe(true);
  g.key("Escape");
  await new Promise((r) => setTimeout(r, 0));
  expect(g.mini).toBeNull();
  expect(done).toBe(true);
});

test("after a long idle, the hint handler speaks", async () => {
  const g = await gameWith("attic", (c) => {
    c.config.idle_hint_ms = 30_000;
    c.globals = { ...c.globals, hint: (api) => api.say("attic.window.look") };
  }, true);
  g.fade = 0;
  for (let i = 0; i < 2000; i++) g.update(16); // ~32 s
  await new Promise((r) => setTimeout(r, 0));
  expect(g.speech?.lineId).toBe("attic.window.look");
});

test("dialogue options: hover reads one, touch reads on the first tap and picks on the second", async () => {
  const g = await gameWith("hall", () => {});
  void g.act("talk", "old_man");
  await g.idle();
  expect(g.choice).not.toBeNull();
  const rects = choiceRects(g.choice!.options.length);
  const mid = (i: number): [number, number] => [rects[i].x + 20, rects[i].y + rects[i].h / 2];
  g.pointerMove(mid(0));
  expect(g.choiceHover).toBe(0);
  const last = g.choice!.options.length - 1;
  g.pointerDown(mid(last), "left", false, true);
  expect(g.choice).not.toBeNull(); // first tap only reads
  expect(g.choiceHover).toBe(last);
  g.pointerDown(mid(last), "left", false, true);
  await g.idle();
  expect(g.choiceHover).toBe(-1);
});

test("pose_if: a character holds a pose while its condition is true, and saves don't lose it", async () => {
  const g = await gameWith("hall", (c) => {
    c.characters.old_man.pose_if = { sit: "!old_man_up" };
    c.characters.old_man.anims.sit_r = { frames: 1, fps: 1 };
  });
  const man = () => g.actors.find((a) => a.id === "old_man")!;
  expect(g.poseOf(man())).toBe("sit");
  await g.run(() => g.api.set("old_man_up"));
  expect(g.poseOf(man())).toBeNull();
  await g.run(() => g.api.unset("old_man_up"));
  g.save("t");
  expect(g.load("t")).toBe(true);
  expect(g.poseOf(man())).toBe("sit");
});

test("an actor with its own run cycle runs at run_speed", async () => {
  const frames: number[] = [];
  for (const how of ["walk", "run"] as const) {
    const g = await gameWith("hall", (c) => {
      c.characters.old_man.speed = 200;
      c.characters.old_man.run_speed = 800;
      c.characters.old_man.anims.run_r = { frames: 6, fps: 12 };
    }, true);
    const man = g.actors.find((a) => a.id === "old_man")!;
    void g.run(() => g.api.actorWalk("old_man", [500, 1000], how));
    await new Promise((r) => setTimeout(r, 0));
    expect(man.running).toBe(how === "run");
    let n = 0;
    while (man.path.length && n < 10_000) {
      g.update(16);
      n++;
    }
    frames.push(n);
  }
  // 4× the speed (not the generic 2× run) → about a quarter of the frames.
  expect(frames[1]).toBeLessThan(frames[0] * 0.3);
});

test("a one-shot anim lasts frames / fps and then clears", async () => {
  const g = await gameWith("hall", (c) => (c.characters.old_man.anims.wave_r = { frames: 6, fps: 12 }), true);
  const man = g.actors.find((a) => a.id === "old_man")!;
  let done = false;
  void g.run(async () => {
    await g.api.anim("old_man", "wave");
    done = true;
  });
  await new Promise((r) => setTimeout(r, 0));
  expect(man.anim?.ms).toBe(500);
  for (let i = 0; i < 20; i++) g.update(16);
  expect(done).toBe(false);
  for (let i = 0; i < 20; i++) g.update(16);
  await new Promise((r) => setTimeout(r, 0));
  expect(done).toBe(true);
  expect(man.anim).toBeNull();
});

test("the story clock follows flags: the first matching entry wins, no clock without config", async () => {
  const { clockMinutes } = await import("../src/engine/clock");
  const c = loadContent().config;
  const s = newState("attic");
  expect(clockMinutes(c, s)).toBeNull();
  const withClock = { ...c, clock: { times: [{ if: "late", time: "23:59" }, { if: "noon", time: "12:00" }, { time: "8:00" }] } };
  expect(clockMinutes(withClock, s)).toBe(8 * 60);
  s.flags.noon = true;
  expect(clockMinutes(withClock, s)).toBe(12 * 60);
  s.flags.late = true;
  expect(clockMinutes(withClock, s)).toBe(23 * 60 + 59);
});

test("clock marks count the set flags with the collectible prefix, up to 12", async () => {
  const { clockMarks } = await import("../src/engine/clock");
  const c = { ...loadContent().config, clock: { times: [{ time: "8:00" }], marks: "second_" } };
  const s = newState("attic");
  expect(clockMarks(c, s)).toBe(0);
  s.flags.second_a = true;
  s.flags.second_b = false;
  s.flags.other = true;
  expect(clockMarks(c, s)).toBe(1);
  for (let i = 0; i < 20; i++) s.flags[`second_${i}`] = true;
  expect(clockMarks(c, s)).toBe(12);
});

test("the collectible counter counts set flags with its prefix, up to its total; none without config", async () => {
  const { counterValue } = await import("../src/engine/clock");
  const base = loadContent().config;
  const s = newState("attic");
  expect(counterValue(base, s)).toBe(0);
  const c = { ...base, counter: { prefix: "feather_", total: 5 } };
  s.flags.feather_a = true;
  s.flags.feather_b = false;
  s.flags.other = true;
  expect(counterValue(c, s)).toBe(1);
  for (let i = 0; i < 9; i++) s.flags[`feather_${i}`] = true;
  expect(counterValue(c, s)).toBe(5);
});

import { drawables as _drawables } from "../src/engine/world";
test("a patch with a baseline sorts above actors; without one it stays under", () => {
  const scene = { id: "t", background: "", walkable: [], scale: { near_y: 1, near: 1, far_y: 0, far: 1 }, spawns: {}, hotspots: [], objects: [], exits: [],
    patches: [{ id: "low", image: "a.png", x: 0, y: 0 }, { id: "high", image: "b.png", x: 0, y: 0, baseline: 9999 }] } as any;
  const state = { flags: {}, inventory: [], visited: [], scene: "t" } as any;
  const actor = { id: "hero", x: 0, y: 900 } as any;
  const order = _drawables(scene, state, [actor], () => null).map((d: any) => d.kind === "patch" ? d.patch.id : d.kind);
  expect(order.indexOf("low")).toBeLessThan(order.indexOf("actor"));
  expect(order.indexOf("high")).toBeGreaterThan(order.indexOf("actor"));
});
