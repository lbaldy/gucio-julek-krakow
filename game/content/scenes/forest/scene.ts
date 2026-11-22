import { defineScene, type GameAPI } from "../../../src/engine/api";
import { acornsFound, collectFeather, featherTargets } from "../../globals";

// Act II: the boys wake in the dream forest, meet Lech and help the squirrel Ruda get her three
// acorns back (one on the branch: the stick; one in the leaves; one under the jay: Julek's shout).
// With all three she remembers: the eagle flew to the river.

/** A found acorn goes into the "acorns" item (one item, the count lives in flags). */
async function gotAcorn(g: GameAPI, flag: string) {
  g.set(flag);
  g.sfx("pickup");
  if (!g.has("acorns")) g.give("acorns");
}

async function knockAcorn(g: GameAPI) {
  if (g.flag("acorn_branch_down")) return g.say("forest.branch.look.empty");
  await g.anim("gucio", "stick");
  g.set("acorn_branch_down");
  g.sfx("boing");
  await g.say("forest.branch.item.stick");
}

async function useStash(g: GameAPI) {
  if (!g.flag("jay_gone")) {
    await g.say("forest.stash.use.1");
    g.sfx("honk");
    return g.say("forest.stash.use.2");
  }
  if (g.flag("acorn_stash")) return g.say("forest.stash.look.empty");
  await g.anim("gucio", "pickup");
  await gotAcorn(g, "acorn_stash");
  await g.say("forest.acorn.got");
}

async function julekShout(g: GameAPI) {
  if (g.flag("jay_gone")) return g.say("forest.stash.julek.after");
  await g.cutscene(async () => {
    void g.anim("julek", "shout");
    await g.say("forest.stash.julek");
    g.sfx("honk");
    g.set("jay_gone");
    await g.say("forest.stash.julek.gucio");
  });
}

export default defineScene("forest", {
  async enter(g) {
    if (g.visited("forest")) return;
    await g.cutscene(async () => {
      await g.wait(600);
      await g.say("forest.enter.first");
      await g.say("forest.enter.first.julek");
      await g.say("forest.lech.talk.intro.1");
      await g.say("forest.lech.talk.intro.2");
      await g.say("forest.lech.talk.intro.3");
      await g.say("forest.lech.talk.what.1");
      await g.say("forest.lech.talk.what.2");
    });
  },
  targets: {
    lech: {
      talk: (g) => g.dialogue("lech_forest"),
      items: {
        julek: async (g) => {
          await g.say("forest.lech.julek");
          await g.say("forest.lech.julek.lech");
        },
        acorns: (g) => g.say("forest.lech.item.acorns"),
      },
    },
    ruda: {
      talk: (g) => (g.flag("ruda_told") ? g.say("forest.ruda.talk.after") : g.dialogue("ruda_forest")),
      items: {
        acorns: async (g) => {
          const n = acornsFound(g);
          g.drop("acorns");
          if (n < 3) return g.say(`forest.ruda.item.acorns.${n}`);
          await g.cutscene(async () => {
            g.set("ruda_told");
            void g.anim("ruda", "happy");
            await g.say("forest.ruda.item.acorns.3.1");
            await g.say("forest.ruda.item.acorns.3.2");
            g.sfx("ding");
            await g.say("forest.ruda.item.acorns.3.3");
          });
        },
        julek: async (g) => {
          await g.say("forest.ruda.julek");
          await g.say("forest.ruda.julek.gucio");
        },
      },
    },
    stick: {
      use: async (g) => {
        await g.anim("gucio", "pickup");
        g.take("stick");
        await g.say("item.stick.found");
      },
    },
    branch: {
      look: (g) => g.say(g.flag("acorn_branch_down") ? "forest.branch.look.empty" : "forest.branch.look"),
      use: (g) => g.say(g.flag("acorn_branch_down") ? "forest.branch.look.empty" : "forest.branch.use"),
      items: {
        stick: knockAcorn,
        julek: async (g) => {
          await g.say("forest.branch.julek");
          await g.say("forest.branch.julek.gucio");
        },
      },
    },
    acorn_on_branch: {
      look: (g) => g.say("forest.branch.look"),
      use: (g) => g.say("forest.branch.use"),
      items: { stick: knockAcorn },
    },
    acorn_fallen: {
      use: async (g) => {
        await g.anim("gucio", "pickup");
        await gotAcorn(g, "acorn_branch");
        await g.say("forest.acorn.got");
      },
    },
    leaves: {
      look: (g) => g.say(g.flag("acorn_leaves") ? "forest.leaves.look.empty" : "forest.leaves.look"),
      use: async (g) => {
        if (g.flag("acorn_leaves")) return g.say("forest.leaves.look.empty");
        g.sfx("rustle");
        await g.anim("gucio", "pickup");
        await gotAcorn(g, "acorn_leaves");
        await g.say("forest.leaves.use");
      },
      items: { julek: (g) => g.say("forest.leaves.julek") },
    },
    jay: {
      look: (g) => g.say("forest.stash.look"),
      use: useStash,
      items: { julek: julekShout, stick: (g) => g.say("forest.jay.stick") },
    },
    stash: {
      look: (g) => g.say(g.flag("jay_gone") ? (g.flag("acorn_stash") ? "forest.stash.look.empty" : "forest.stash.look.free") : "forest.stash.look"),
      use: useStash,
      items: {
        julek: julekShout,
        stick: (g) => g.say("forest.jay.stick"),
      },
    },
    log: {
      look: (g) => g.say(g.flag("feather_forest_log") ? "forest.log.look.empty" : "forest.log.look"),
      use: (g) => g.say(g.flag("feather_forest_log") ? "forest.log.look.empty" : "forest.log.use"),
      items: {
        julek: async (g) => {
          if (g.flag("feather_forest_log")) return g.say("forest.log.look.empty");
          await g.anim("julek", "crawl");
          await g.say("forest.log.julek");
          await collectFeather(g, "forest_log");
        },
      },
    },
    squirrel_tree: { use: (g) => g.say("forest.squirrel_tree.use") },
    stone: { use: (g) => g.say("forest.stone.use") },
    path_river: {
      go: (g) => (g.flag("ruda_told") ? g.goto("river", "from_forest") : g.say("forest.path_river.locked")),
    },
    ...featherTargets("forest_ferns", "forest_path"),
  },
});
