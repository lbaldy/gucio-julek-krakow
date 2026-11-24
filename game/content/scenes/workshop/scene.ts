import { defineScene, type GameAPI } from "../../../src/engine/api";

// Dratewka's workshop. Act II: his plan, then the needle (Julek crawls under the workbench) and the
// dratwa (the tangle mini-game); with both, the dragon's rumble and the meadow and market open.
// Act IV: the sheepskin, straw and sulphur go onto the bench (any order; the fake sheep fills up),
// Dratewka sews, the townspeople peek in, Krak lends his cart, and it's dusk at the cave.

const BENCH = ["sheepskin", "straw", "sulphur"] as const;
type BenchItem = (typeof BENCH)[number];
const benchCount = (g: GameAPI) => BENCH.filter((i) => g.flag(`bench_${i}`)).length;
const BENCH_LINE: Record<BenchItem, string> = {
  sheepskin: "workshop.workbench.use.skin",
  straw: "workshop.workbench.use.straw",
  sulphur: "workshop.workbench.use.sulphur",
};

/** Dratewka's checklist: what is still missing, in the order he needs it. */
export function nextNeed(g: GameAPI): string {
  if (!g.flag("needle_found")) return "workshop.dratewka.talk.need.needle";
  if (!g.flag("dratwa_found")) return "workshop.dratewka.talk.need.dratwa";
  if (!g.flag("bench_sheepskin") && !g.has("sheepskin")) return "workshop.dratewka.talk.need.skin";
  if (!g.flag("bench_straw") && !g.has("straw")) return "workshop.dratewka.talk.need.straw";
  if (!g.flag("bench_sulphur") && !g.has("sulphur")) return "workshop.dratewka.talk.need.sulphur";
  return "workshop.dratewka.talk.need.done";
}

async function readyIfBoth(g: GameAPI) {
  if (!g.flag("needle_found") || !g.flag("dratwa_found") || g.flag("dratewka_ready")) return;
  await g.cutscene(async () => {
    await g.wait(600);
    g.sfx("boing");
    // the rumble makes everybody jump
    for (const who of ["gucio", "julek", "dratewka"]) void g.motion(who, "hop", { amp: 0.08, ms: 480 });
    await g.say("workshop.ready.1");
    await g.say("workshop.ready.2");
    g.set("dratewka_ready");
    await g.say("workshop.ready.3");
  });
}

async function needle(g: GameAPI) {
  if (g.flag("needle_found")) return g.say("workshop.crack.look.empty");
  if (!g.flag("plan_told")) return g.say("workshop.crack.early");
  await g.cutscene(async () => {
    await g.say("workshop.crack.julek.1");
    await g.reach("crack", { by: "julek", pose: "crawl" });
    void g.motion("julek", "hop", { amp: 0.15 });
    await g.say("workshop.crack.julek.2");
    g.sfx("pickup");
    g.set("needle_found");
    await g.say("workshop.crack.julek.3");
  });
  await readyIfBoth(g);
}

async function tangle(g: GameAPI) {
  if (g.flag("dratwa_found")) return g.say("workshop.tangle.look.after");
  if (!g.flag("plan_told")) return g.say("workshop.tangle.early");
  await g.say("workshop.tangle.start");
  await g.minigame("tangle");
  g.set("dratwa_found");
  g.sfx("ding");
  await g.say("workshop.tangle.done.1");
  await g.say("workshop.tangle.done.2");
  await readyIfBoth(g);
}

async function sew(g: GameAPI) {
  await g.cutscene(async () => {
    await g.wait(500);
    void g.anim("dratewka", "sew");
    await g.say("workshop.sew.1");
    g.set("peeking");
    await g.say("workshop.sew.2");
    await g.say("workshop.sew.3");
    g.set("sheep_sewn");
    g.sfx("magic");
    g.place("krak", g.point("krak_door"));
    g.set("krak_in_workshop");
    await g.actorWalk("krak", g.point("krak_in"));
    await g.say("workshop.sew.4");
    await g.say("workshop.sew.5");
    await g.wait(800);
  });
  g.unset("peeking");
  await g.goto("cave", "default");
}

async function putOnBench(g: GameAPI, item: BenchItem) {
  await g.toss(item, g.point("bench"));
  g.set(`bench_${item}`);
  g.set(`bench_${benchCount(g)}`);
  g.sfx("pickup");
  await g.say(BENCH_LINE[item]);
  if (benchCount(g) === 3) await sew(g);
}

const benchItems = {
  sheepskin: (g: GameAPI) => putOnBench(g, "sheepskin"),
  straw: (g: GameAPI) => putOnBench(g, "straw"),
  sulphur: (g: GameAPI) => putOnBench(g, "sulphur"),
  sack: (g: GameAPI) => g.say("workshop.workbench.use.sack"),
};

const benchTarget = {
  look: (g: GameAPI) => g.say(g.flag("dratewka_ready") ? "workshop.workbench.look.assembly" : "workshop.workbench.look"),
  use: (g: GameAPI) => g.say("workshop.workbench.use"),
  items: {
    ...benchItems,
    julek: async (g: GameAPI) => {
      await g.say("workshop.workbench.julek.1");
      await g.say("workshop.workbench.julek.2");
    },
  },
};

export default defineScene("workshop", {
  async enter(g) {
    if (g.visited("workshop")) return;
    await g.cutscene(async () => {
      await g.wait(400);
      await g.say("workshop.enter.first.1");
      await g.say("workshop.enter.first.2");
      await g.say("workshop.enter.first.3");
    });
  },
  targets: {
    dratewka: {
      talk: (g) => g.dialogue("dratewka_workshop"),
      items: {
        ...benchItems,
        julek: async (g) => {
          await g.say("workshop.dratewka.julek");
          await g.say("workshop.dratewka.julek.dratewka");
        },
      },
    },
    workbench: benchTarget,
    fake_1: benchTarget,
    fake_2: benchTarget,
    fake_3: benchTarget,
    fake_4: { look: (g: GameAPI) => g.say("workshop.workbench.look.assembly") },
    crack: {
      look: (g) => g.say(g.flag("needle_found") ? "workshop.crack.look.empty" : "workshop.crack.look"),
      use: (g) => g.say(g.flag("needle_found") ? "workshop.crack.look.empty" : "workshop.crack.use"),
      items: { julek: needle },
    },
    tangle: {
      look: (g) => g.say(g.flag("dratwa_found") ? "workshop.tangle.look.after" : "workshop.tangle.look"),
      use: tangle,
      items: {
        julek: async (g) => {
          await g.say("workshop.tangle.julek");
          await g.say("workshop.tangle.julek.gucio");
        },
      },
    },
    window: { use: (g) => g.say("workshop.window.use") },
    shoes: {
      use: (g) => g.say("workshop.shoes.use"),
      items: { julek: (g) => g.say("workshop.shoes.julek") },
    },
    lasts: { use: (g) => g.say("workshop.lasts.use") },
    pegs: { use: (g) => g.say("workshop.pegs.use") },
  },
});
