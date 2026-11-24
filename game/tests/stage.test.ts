import { expect, test } from "vitest";
import { Game } from "../src/engine/game";
import { headlessAdapters } from "../src/engine/headless";
import { MOTIONS, along, motionAt } from "../src/engine/motion";
import { planReach } from "../src/engine/reach";
import { drawables } from "../src/engine/world";
import type { CharacterData, Pt } from "../src/engine/types";
import { loadSample } from "./fixtures/sample/load";

const kid: CharacterData = {
  name: "Kid", height_px: 400, text_color: "#fff",
  anims: {
    pickup_r: { frames: 1, fps: 1, hand: [60, 40] },
    push_r: { frames: 1, fps: 1, hand: [120, 260] },
    up_r: { frames: 1, fps: 1, hand: [0, 440] },
    lift_r: { frames: 1, fps: 1, hand: [0, 420], no_reach: true },
  },
};
const plan = (t: Pt, pose?: string) => planReach(kid, [500, 900], 1, 400, t, "right", pose);

test("every motion starts and ends at rest", () => {
  for (const name of Object.keys(MOTIONS)) {
    for (const p of [0, 1]) {
      const x = motionAt(name, p);
      for (const [k, v] of Object.entries(x)) expect(Math.abs(v - (k === "sx" || k === "sy" ? 1 : 0)), `${name}.${k} at ${p}`).toBeLessThan(1e-6);
    }
  }
});

test("the pose follows the height of the target", () => {
  expect(plan([570, 870])).toMatchObject({ anim: "pickup", motion: "dip", facing: "right" });
  expect(plan([620, 640])).toMatchObject({ anim: "push", motion: "stretch" });
  expect(plan([500, 440])).toMatchObject({ anim: "up", motion: "tiptoe" });
  expect(plan([500, 330])).toMatchObject({ anim: "up", motion: "hop" });
  expect(plan([430, 870]).facing).toBe("left");
  expect(plan([500, 480], "lift").anim).toBe("lift");
});

test("the hand lands on what's in reach, and the miss is known when it isn't", () => {
  for (const t of [[620, 640], [500, 330], [420, 860]] as Pt[]) expect(plan(t).miss, String(t)).toBeLessThan(30);
  expect(plan([500, 100]).miss).toBeGreaterThan(100);
  expect(plan([1200, 640]).miss).toBeGreaterThan(300);
});

test("a curved path goes through its via point", () => {
  expect(along([0, 0], [100, 0], 0.5, [50, 80])).toEqual([50, 80]);
  expect(along([0, 0], [100, 0], 1, [50, 80])).toEqual([100, 0]);
});

/** A game in real (stepped) time, so movement isn't instant. */
async function live() {
  const content = loadSample();
  const g = new Game(content, headlessAdapters(), true);
  await g.newGame("attic");
  await g.idle();
  (g as { fast: boolean }).fast = false;
  const id = g.heroId;
  content.characters[id].anims.grab_r = { frames: 1, fps: 1, hold_ms: 400, hand: [60, 200], motion: "hop" };
  return { g, id, hero: g.hero() };
}
const steps = async (g: Game, ms: number) => {
  for (let t = 0; t < ms; t += 20) {
    g.update(20);
    await Promise.resolve();
  }
};

test("contact happens mid-pose, once, and the pose waits for what it started", async () => {
  const { g, id, hero } = await live();
  let touched = 0;
  let over = false;
  void g.api.anim(id, "grab", { onContact: () => { touched++; return g.api.wait(300); } }).then(() => (over = true));
  await steps(g, 160);
  expect([touched, hero.anim !== null]).toEqual([0, true]);
  await steps(g, 100);
  expect(touched).toBe(1);
  await steps(g, 200);
  expect([hero.anim, hero.motion, over]).toEqual([null, null, false]);
  await steps(g, 200);
  await new Promise((r) => setTimeout(r, 0));
  expect([touched, over]).toEqual([1, true]);
});

test("a pose replaced before contact still makes contact; skipping finishes everything", async () => {
  const { g, id, hero } = await live();
  let touched = 0;
  const first = g.api.anim(id, "grab", { onContact: () => touched++ });
  const second = g.api.anim(id, "grab", { onContact: () => touched++ });
  const jump = g.api.jump(id, [hero.x + 100, hero.y]);
  const x = hero.x;
  await first;
  expect(touched).toBe(1);
  g.cutsceneDepth = 1;
  g.key("Escape");
  await Promise.all([second, jump]);
  expect([touched, hero.x, hero.lift, hero.tween, hero.anim]).toEqual([2, x + 100, 0, null, null]);
});

test("a jump leaves the ground, lands on the spot and can keep its facing", async () => {
  const { g, id, hero } = await live();
  hero.facing = "right";
  const to: Pt = [hero.x - 200, hero.y];
  void g.api.jump(id, to, { keepFacing: true, ms: 800 });
  await steps(g, 400);
  expect(hero.lift).toBeGreaterThan(40);
  await steps(g, 420);
  expect([hero.x, hero.y, hero.lift, hero.facing]).toEqual([...to, 0, "right"]);
});

test("a moved object takes its depth and hit area along, and is back in place on the next entry", async () => {
  const { g } = await live();
  const o = g.scene.objects![0];
  const area = () => g.targets().find((t) => t.id === o.id)!.poly[0];
  const z = () => drawables(g.scene, g.state, g.actors, g.io.sizeOf, g.props).find((d) => d.kind === "object" && d.obj.id === o.id)!.z;
  const [x0, y0] = area();
  const z0 = z();
  void g.api.move(o.id, [o.x + 235, o.y + 150], { ms: 200 });
  await steps(g, 220);
  expect(area()).toEqual([x0 + 200, y0 + 100]);
  expect(z()).toBe(z0 + 100);
  (g as { fast: boolean }).fast = true;
  await g.api.goto("attic");
  expect(area()).toEqual([x0, y0]);
});

test("an item given at contact flies to its slot; headless it just arrives", async () => {
  const { g, id } = await live();
  const item = Object.keys(g.content.items)[0];
  void g.api.anim(id, "grab", { onContact: () => g.api.give(item) });
  await steps(g, 240);
  expect(g.state.inventory).toContain(item);
  expect(g.flights.map((f) => f.slot)).toEqual([item]);
  await steps(g, 800);
  expect(g.flights).toEqual([]);
});

test("loops run until they're stopped, counted ones end by themselves", async () => {
  const { g, id, hero } = await live();
  await g.api.motion(id, "hop", { loop: true });
  await steps(g, 3000);
  expect(hero.motion?.name).toBe("hop");
  await g.api.motion(id, null);
  expect(hero.motion).toBeNull();
  void g.api.motion(id, "hop", { times: 2, ms: 300 });
  await steps(g, 400);
  expect(hero.motion).not.toBeNull();
  await steps(g, 260);
  expect(hero.motion).toBeNull();
});
