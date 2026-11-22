import { defineScene, type GameAPI } from "../../../src/engine/api";
import { collectFeather, featherTargets, planksFound } from "../../globals";

// Act III: four planks for the broken footbridge: on the bank, in the willow roots, in the reeds
// (the stick) and under the bush (Julek). Each goes straight onto the pile; with all four, the
// matching mini-game mends the bridge and the boys cross to the oak.

async function addPlank(g: GameAPI, flag: string) {
  g.set(flag);
  g.sfx("pickup");
  const n = planksFound(g);
  g.set(`pile_${n}`);
  await g.say("river.plank.add");
}

async function needStick(g: GameAPI) {
  await g.say("river.reeds.use");
  if (!g.has("stick")) await g.say("river.stick.missing");
}

export default defineScene("river", {
  async enter(g) {
    if (!g.visited("river")) {
      await g.say("river.enter.first");
      await g.say("river.enter.first.2");
    }
  },
  targets: {
    bridge: {
      look: (g) => g.say(g.flag("bridge_fixed") ? "river.bridge.look.done" : "river.bridge.look"),
      use: async (g) => {
        if (g.flag("bridge_fixed")) return g.goto("oak", "from_river");
        if (planksFound(g) < 4) return g.say("river.bridge.use.early");
        await g.say("river.bridge.intro");
        await g.minigame("bridge");
        await g.cutscene(async () => {
          g.set("bridge_fixed");
          g.sfx("ding");
          await g.say("river.bridge.done");
          void g.anim("julek", "cheer");
          await g.say("river.bridge.done.julek");
        });
      },
    },
    pile: {
      look: (g) => {
        const n = planksFound(g);
        if (g.flag("bridge_fixed")) return g.say("river.bridge.look.done");
        return g.say(n === 4 ? "river.pile.look.full" : n === 0 ? "river.pile.look" : `river.pile.look.${n}`);
      },
      use: (g) => (planksFound(g) === 4 && !g.flag("bridge_fixed") ? g.say("_.hint.bridge") : g.say("river.pile.use")),
    },
    plank_bank_obj: {
      look: (g) => g.say("river.plank_bank.look"),
      use: async (g) => {
        await g.anim("gucio", "pickup");
        await addPlank(g, "plank_bank");
      },
    },
    willow: {
      look: (g) => g.say(g.flag("plank_willow") ? "river.willow.look.empty" : "river.willow.look"),
      use: async (g) => {
        if (g.flag("plank_willow")) return g.say("river.willow.look.empty");
        await g.anim("gucio", "pickup");
        await g.say("river.willow.use");
        await addPlank(g, "plank_willow");
      },
    },
    reeds: {
      look: (g) => g.say(g.flag("plank_reeds") ? "river.reeds.look.empty" : "river.reeds.look"),
      use: (g) => (g.flag("plank_reeds") ? g.say("river.reeds.look.empty") : needStick(g)),
      items: {
        stick: async (g) => {
          if (g.flag("plank_reeds")) return g.say("river.reeds.look.empty");
          await g.anim("gucio", "stick");
          await g.say("river.reeds.item.stick");
          await addPlank(g, "plank_reeds");
        },
        julek: async (g) => {
          await g.say("river.river_water.julek");
          await g.say("river.river_water.julek.gucio");
        },
      },
    },
    bush: {
      look: (g) => g.say(g.flag("plank_bush") ? "river.bush.look.empty" : "river.bush.look"),
      use: (g) => g.say(g.flag("plank_bush") ? "river.bush.look.empty" : "river.bush.look"),
      items: {
        julek: async (g) => {
          if (g.flag("plank_bush")) return g.say("river.bush.look.empty");
          await g.anim("julek", "crawl");
          await g.say("river.bush.julek");
          await collectFeather(g, "river_bush", true);
          await g.say("river.bush.julek.gucio");
          await addPlank(g, "plank_bush");
        },
      },
    },
    river_water: {
      use: (g) => g.say("river.river_water.use"),
      items: {
        julek: async (g) => {
          await g.say("river.river_water.julek");
          await g.say("river.river_water.julek.gucio");
        },
      },
    },
    frog: {
      use: (g) => g.say("river.frog.use"),
      items: { julek: (g) => g.say("river.frog.julek") },
    },
    ...featherTargets("river_marigold", "river_willow"),
  },
});
