import { defineScene, type GameAPI } from "../../../src/engine/api";
import { collectFeather, eggsFound, featherTargets } from "../../globals";

// Act IV: the White Eagle is restless; its three eggs fell into the soft moss. Gucio picks one from
// the moss, Julek fetches one from the hollow, Gucio climbs the low branch for the third; then he
// climbs up to the nest. The calmed eagle bows and flies off to fetch Lech to the clearing.

async function gotEgg(g: GameAPI, flag: string) {
  g.set(flag);
  g.sfx("pickup");
  if (!g.has("eggs")) g.give("eggs");
}

async function askEagle(g: GameAPI) {
  if (g.flag("nest_done")) return g.say("oak.eagle.look.done");
  g.sfx("eagle");
  await g.say("oak.eagle.talk");
  await g.say("oak.eagle.talk.2");
  g.set("eagle_asked");
}

async function fillNest(g: GameAPI) {
  if (g.flag("nest_done")) return g.say("oak.nest.look.done");
  const n = eggsFound(g);
  if (n < 3 || !g.has("eggs")) return g.say(`oak.nest.use.${n}`);
  await g.cutscene(async () => {
    await g.say("oak.nest.use.3");
    await g.anim("gucio", "climb");
    g.drop("eggs");
    g.set("nest_done");
    g.sfx("ding");
    await g.say("oak.nest.done.1");
    await g.say("oak.nest.done.2");
    g.sfx("eagle");
    await g.wait(900);
    g.set("eagle_gone");
    g.sfx("magic");
    await g.say("oak.nest.done.3");
  });
}

export default defineScene("oak", {
  async enter(g) {
    if (!g.visited("oak")) {
      await g.say("oak.enter.first");
      await g.say("oak.enter.first.julek");
    }
  },
  targets: {
    eagle: {
      look: (g) => g.say("oak.eagle.look"),
      use: askEagle,
      talk: askEagle,
      items: {
        eggs: fillNest,
        julek: (g) => g.say("oak.eagle.julek"),
      },
    },
    eagle_calm: { look: (g) => g.say("oak.eagle.look.done"), use: (g) => g.say("oak.eagle.look.done") },
    nest: {
      look: (g) => g.say(g.flag("nest_done") ? "oak.nest.look.done" : "oak.nest.look"),
      use: fillNest,
      items: { eggs: fillNest },
    },
    egg_moss_obj: {
      look: (g) => g.say("oak.moss.look"),
      use: async (g) => {
        await g.anim("gucio", "pickup");
        await gotEgg(g, "egg_moss");
        await g.say("oak.moss.use");
      },
    },
    moss: {
      look: (g) => g.say(g.flag("egg_moss") ? "oak.moss.look.empty" : "oak.moss.look"),
      use: async (g) => {
        if (g.flag("egg_moss")) return g.say("oak.moss.look.empty");
        await g.anim("gucio", "pickup");
        await gotEgg(g, "egg_moss");
        await g.say("oak.moss.use");
      },
    },
    hollow: {
      look: (g) => g.say(g.flag("egg_hollow") ? "oak.hollow.look.empty" : "oak.hollow.look"),
      use: (g) => g.say(g.flag("egg_hollow") ? "oak.hollow.look.empty" : "oak.hollow.look"),
      items: {
        julek: async (g) => {
          if (g.flag("egg_hollow")) return g.say("oak.hollow.look.empty");
          await g.anim("julek", "crawl");
          await g.say("oak.hollow.julek");
          await collectFeather(g, "oak_hollow", true);
          await gotEgg(g, "egg_hollow");
          await g.say("oak.hollow.julek.gucio");
        },
      },
    },
    low_branch: {
      look: (g) => g.say(g.flag("egg_branch") ? "oak.low_branch.look.empty" : "oak.low_branch.look"),
      use: async (g) => {
        if (g.flag("egg_branch")) return g.say("oak.low_branch.look.empty");
        await g.anim("gucio", "climb");
        await gotEgg(g, "egg_branch");
        await g.say("oak.low_branch.use");
      },
      items: {
        julek: async (g) => {
          await g.say("oak.low_branch.julek");
          await g.say("oak.low_branch.julek.gucio");
        },
      },
    },
    egg_fork: {
      look: (g) => g.say("oak.low_branch.look"),
      use: async (g) => {
        await g.anim("gucio", "climb");
        await gotEgg(g, "egg_branch");
        await g.say("oak.low_branch.use");
      },
    },
    trunk: {
      use: (g) => g.say("oak.trunk.use"),
      items: { julek: (g) => g.say("oak.trunk.julek") },
    },
    view: {
      go: (g) => (g.flag("nest_done") ? g.goto("clearing", "from_oak") : g.say("oak.view.locked")),
    },
    ...featherTargets("oak_violets", "oak_root"),
  },
});
