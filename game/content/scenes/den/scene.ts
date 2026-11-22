import { defineScene, type GameAPI } from "../../../src/engine/api";

// The rescue in the dragon's den: Gucio lifts the gate bar and the sheep trot home; Gucio counts
// them, and Kłębuszek is missing, until a tiny "meee" comes from the hollow. Julek crawls in and
// comes out hugging him. The promise is kept: the exit leads to the ending.

async function openGate(g: GameAPI) {
  if (g.flag("gate_open")) return g.say("den.gate.look.open");
  await g.cutscene(async () => {
    await g.anim("gucio", "lift");
    g.set("gate_open");
    g.sfx("pop");
    await g.say("den.gate.use");
    const out = ["sheep_a", "sheep_b", "sheep_c"].map((s) => g.actorWalk(s, g.point("sheep_exit")));
    await Promise.all(out);
    g.set("sheep_out");
    await g.wait(500);
    await g.say("den.count.1");
    await g.wait(800);
    g.set("klebuszek_heard");
    g.sfx("magic");
    await g.say("den.count.2");
  });
}

async function findLamb(g: GameAPI) {
  if (g.flag("klebuszek_found")) return g.say("den.klebuszek.look");
  if (!g.flag("klebuszek_heard")) return g.say("den.hollow.early");
  await g.cutscene(async () => {
    await g.say("den.hollow.julek.1");
    await g.anim("julek", "crawl");
    await g.say("den.hollow.julek.2");
    g.set("klebuszek_found");
    g.pose("julek", "hug");
    await g.say("den.hollow.julek.3");
    await g.say("den.hollow.julek.4");
    g.pose("julek", null);
  });
}

export default defineScene("den", {
  async enter(g) {
    if (g.visited("den")) return;
    await g.cutscene(async () => {
      await g.wait(500);
      await g.say("den.enter.1");
      await g.say("den.enter.2");
    });
  },
  targets: {
    gate: {
      look: (g) => g.say(g.flag("gate_open") ? "den.gate.look.open" : "den.gate.look"),
      use: openGate,
      items: { julek: (g) => g.say("den.gate.julek") },
    },
    sheep_a: { look: (g) => g.say("den.sheep_pen.look"), talk: (g) => g.say("den.sheep_pen.use") },
    sheep_b: { look: (g) => g.say("den.sheep_pen.look"), talk: (g) => g.say("den.sheep_pen.use") },
    sheep_c: { look: (g) => g.say("den.sheep_pen.look"), talk: (g) => g.say("den.sheep_pen.use") },
    hollow: {
      look: (g) => g.say(g.flag("klebuszek_heard") && !g.flag("klebuszek_found") ? "den.hollow.look.after" : "den.hollow.look"),
      use: (g) => g.say(g.flag("klebuszek_heard") ? "den.hollow.use" : "den.hollow.look"),
      items: { julek: findLamb },
    },
    tail: {
      look: (g) => g.say("den.hollow.look.after"),
      use: (g) => g.say("den.hollow.use"),
      items: { julek: findLamb },
    },
    klebuszek: { look: (g) => g.say("den.klebuszek.look"), talk: (g) => g.say("den.klebuszek.look") },
    dragon_bed: {
      use: (g) => g.say("den.dragon_bed.use"),
      items: {
        julek: async (g) => {
          await g.say("den.dragon_bed.julek");
          await g.say("den.dragon_bed.julek.gucio");
        },
      },
    },
    helmets: { use: (g) => g.say("den.helmets.use") },
    embers: { use: (g) => g.say("den.embers.use") },
    cave_exit: {
      look: (g) => g.say("den.cave_exit.look"),
      go: async (g) => {
        if (!g.flag("klebuszek_found")) return g.say("den.cave_exit.locked");
        await g.say("den.cave_exit.use");
        await g.goto("outro");
      },
    },
  },
});
