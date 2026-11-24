import { defineScene, type GameAPI } from "../../../src/engine/api";

// The rescue in the dragon's den: Gucio lifts the gate bar and the sheep trot home; Gucio counts
// them, and Kłębuszek is missing, until a tiny "meee" comes from the hollow. Julek crawls in and
// comes out hugging him. The promise is kept: the exit leads to the ending.

async function openGate(g: GameAPI) {
  if (g.flag("gate_open")) return g.say("den.gate.look.open");
  await g.cutscene(async () => {
    // he heaves the bar out of its brackets: it drops and the gate swings open
    await g.reach("gate", {
      pose: "push",
      ms: 1300,
      onContact: () => {
        g.set("gate_open");
        g.sfx("pop");
      },
    });
    void g.anim("gucio", "cheer");
    await g.say("den.gate.use");
    // the pen is off the walkable floor: out through the gate in a straight line, then to the mouth
    const out = ["sheep_a", "sheep_b", "sheep_c"].map(async (s, i) => {
      await g.wait(i * 350);
      await g.actorWalk(s, g.point("gate_out"), "free");
      await g.actorWalk(s, g.point("sheep_exit"));
    });
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
    await g.actorWalk("julek", g.point("julek_hollow"));
    g.actorFace("julek", "right");
    await g.say("den.hollow.julek.1");
    await g.move("julek", g.point("julek_in_hollow"), { pose: "crawl", ms: 1300, fade: 0 });
    await g.say("den.hollow.julek.2");
    // Julek backs out hugging him; then Kłębuszek stands on his own beside the boys
    g.set("klebuszek_found");
    g.set("lamb_hugged");
    g.pose("julek", "hug");
    g.sfx("magic");
    await g.move("julek", g.point("julek_hollow"), { pose: "hug", ms: 900, fade: 1 });
    void g.motion("julek", "sway", { loop: true, amp: 0.04 });
    await g.say("den.hollow.julek.3");
    await g.say("den.hollow.julek.4");
    await g.motion("julek", null);
    g.pose("julek", null);
    g.unset("lamb_hugged");
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
