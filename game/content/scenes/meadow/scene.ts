import { defineScene, type GameAPI } from "../../../src/engine/api";
import { woolTargets } from "../../globals";

// Act III, the shepherd's meadow: the old sheepskin from the shepherd, and the straw past Bodzio
// the ram. Bodzio butts anyone big; given a dandelion by Julek (the dandelion on Julek), he goes
// soft. Then the sack on the haystack. With both, the shepherd's quiet memory and Gucio's promise.

async function butt(g: GameAPI, line: string) {
  await g.walkTo(g.point("ram_side"));
  void g.anim("ram", "butt");
  g.sfx("boing");
  await g.walkTo(g.point("butt_back"));
  await g.say(line);
}

/** Julek feeds Bodzio the dandelion and strokes his nose (also the dandelion+julek combo). */
export async function calmRam(g: GameAPI) {
  if (g.flag("ram_calm")) return g.say("meadow.ram.use.soft");
  await g.cutscene(async () => {
    await g.walkTo(g.point("butt_back"));
    void g.anim("julek", "offer");
    await g.say("meadow.ram.combo.1");
    g.drop("dandelion");
    g.set("ram_calm");
    await g.say("meadow.ram.combo.2");
    await g.say("meadow.ram.combo.3");
  });
}

async function endBeat(g: GameAPI) {
  if (!g.flag("skin_got") || !g.flag("straw_got") || g.flag("meadow_end")) return;
  g.set("meadow_end");
  await g.cutscene(async () => {
    await g.wait(600);
    await g.say("meadow.end.1");
    await g.say("meadow.end.2");
    await g.say("meadow.end.3");
  });
}

async function haystack(g: GameAPI) {
  if (g.flag("straw_got")) return g.say("meadow.haystack.look.done");
  if (!g.flag("ram_calm")) return butt(g, "meadow.ram.use");
  if (!g.has("sack")) return g.say("meadow.haystack.use.nosack");
  await g.anim("gucio", "pickup");
  g.drop("sack");
  g.give("straw");
  g.set("straw_got");
  g.sfx("rustle");
  await g.say("meadow.haystack.use.sack");
  await endBeat(g);
}

export default defineScene("meadow", {
  async enter(g) {
    if (!g.visited("meadow")) await g.say("meadow.enter.first");
  },
  targets: {
    shepherd: {
      talk: async (g) => {
        await g.dialogue("shepherd_meadow");
        await endBeat(g);
      },
      items: {
        julek: async (g) => {
          await g.say("meadow.shepherd.julek");
          await g.say("meadow.shepherd.julek.shepherd");
        },
      },
    },
    ram: {
      look: (g) => g.say(g.flag("ram_calm") ? "meadow.ram.look.soft" : "meadow.ram.look"),
      use: (g) => (g.flag("ram_calm") ? g.say("meadow.ram.use.soft") : butt(g, "meadow.ram.use")),
      items: {
        dandelion: (g) => (g.flag("ram_calm") ? g.say("meadow.ram.use.soft") : butt(g, "meadow.ram.use.dandelion")),
        julek: (g) => (g.has("dandelion") ? calmRam(g) : g.flag("ram_calm") ? g.say("meadow.ram.use.soft") : g.say("meadow.ram.julek.nodandelion")),
      },
    },
    haystack: {
      look: (g) => g.say(g.flag("straw_got") ? "meadow.haystack.look.done" : g.flag("ram_calm") ? "meadow.haystack.look.free" : "meadow.haystack.look"),
      use: haystack,
      items: { sack: haystack },
    },
    dandelions: {
      use: async (g) => {
        if (g.has("dandelion")) return g.say("meadow.dandelions.use.have");
        await g.anim("gucio", "pickup");
        g.give("dandelion");
        await g.say("meadow.dandelions.use");
      },
      items: {
        julek: async (g) => {
          await g.say("meadow.dandelions.julek");
          await g.say("meadow.dandelions.julek.gucio");
        },
      },
    },
    sack: {
      use: async (g) => {
        await g.anim("gucio", "pickup");
        g.take("sack");
        await g.say("meadow.sack.use");
      },
    },
    fold: { use: (g) => g.say("meadow.fold.use") },
    footprints: {
      use: (g) => g.say("meadow.footprints.use"),
      items: { julek: (g) => g.say("meadow.footprints.julek") },
    },
    river: { use: (g) => g.say("meadow.river.use") },
    hill: { use: (g) => g.say("meadow.hill.use") },
    sheep_a: { look: (g) => g.say("meadow.sheep.look"), talk: (g) => g.say("meadow.sheep.use"), items: { julek: (g) => g.say("meadow.sheep.julek") } },
    sheep_b: { look: (g) => g.say("meadow.sheep.look"), talk: (g) => g.say("meadow.sheep.use"), items: { julek: (g) => g.say("meadow.sheep.julek") } },
    ...woolTargets("meadow_gate", "meadow_reeds", "meadow_willow"),
  },
});
