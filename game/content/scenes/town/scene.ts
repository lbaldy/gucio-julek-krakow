import { defineScene, type GameAPI } from "../../../src/engine/api";
import { woolTargets } from "../../globals";

// Act II, the hub: the settlement under Wawel. On the first visit three short beats play: a knight
// runs away and drops his helmet (Krak sighs); the old shepherd tells of Kłębuszek and Gucio
// promises to bring him back; the merchant and the baker laugh at Dratewka through his window.
// The meadow and market paths open once Dratewka has his needle and dratwa.

async function knightBeat(g: GameAPI) {
  g.place("knight", g.point("knight_from"));
  g.set("knight_running");
  g.sfx("honk");
  const run = g.actorWalk("knight", g.point("knight_to"), "run");
  await g.wait(2500); // he passes over the spot, and his helmet bounces off
  g.set("helmet_dropped");
  g.sfx("boing");
  await g.move("helmet", g.point("helmet_spot"), { from: g.point("helmet_from"), arc: 90, spin: -1, ms: 650, ease: "in" });
  void g.motion("helmet", "rattle", { times: 2 });
  await run;
  g.unset("knight_running");
  await g.say("town.knight.1");
  await g.say("town.knight.2");
  await g.say("town.knight.3");
}

async function promiseBeat(g: GameAPI) {
  g.place("shepherd", g.point("shepherd_from"));
  g.set("shepherd_here");
  await g.actorWalk("shepherd", g.point("shepherd_to"));
  await g.say("town.promise.1");
  await g.say("town.promise.2");
  await g.say("town.promise.3");
  await g.wait(500);
  await g.say("town.promise.4");
  g.set("promise_made");
  await g.say("town.promise.5");
  await g.actorWalk("shepherd", g.point("shepherd_from"));
  g.unset("shepherd_here");
}

async function laughBeat(g: GameAPI) {
  g.set("laughing");
  void g.motion("merchant", "chuckle", { loop: true });
  void g.motion("baker", "chuckle", { loop: true, ms: 520 });
  await g.say("town.laugh.1");
  await g.say("town.laugh.2");
  g.unset("laughing");
  g.set("laughed");
  await g.say("town.laugh.3");
}

const gated = (target: string, spawn: string) => (g: GameAPI) =>
  g.flag("dratewka_ready") ? g.goto(target, spawn) : g.say("town.path.locked");

export default defineScene("town", {
  async enter(g) {
    if (g.visited("town")) return;
    await g.cutscene(async () => {
      await g.wait(600);
      await knightBeat(g);
      await g.wait(400);
      await promiseBeat(g);
      await g.wait(400);
      await laughBeat(g);
    });
  },
  targets: {
    krak: {
      talk: (g) => g.dialogue("krak_town"),
      items: {
        julek: async (g) => {
          await g.say("town.krak.julek");
          await g.say("town.krak.julek.krak");
        },
      },
    },
    workshop_window: {
      look: (g) => g.say(g.flag("plan_told") ? "town.workshop_window.look.after" : "town.workshop_window.look"),
      use: (g) => g.say("town.workshop_window.use"),
    },
    houses: { use: (g) => g.say("town.houses.use") },
    hill: { use: (g) => g.say("town.hill.use") },
    helmet: {
      use: (g) => g.say("town.helmet.use"),
      items: {
        julek: async (g) => {
          await g.reach("helmet", { by: "julek", onContact: () => g.set("helmet_worn") });
          g.pose("julek", "helmet");
          void g.motion("julek", "sway", { loop: true, amp: 0.06 });
          await g.say("town.helmet.julek.1");
          await g.say("town.helmet.julek.2");
          await g.motion("julek", null);
          g.pose("julek", null);
          g.unset("helmet_worn");
        },
      },
    },
    path_meadow: { go: gated("meadow", "default") },
    path_market: { go: gated("market", "default") },
    path_hill: {
      look: (g) => g.say("town.path_hill.look"),
      go: (g) => g.say(g.flag("plan_told") ? "town.path_hill.locked.after" : "town.path_hill.locked"),
    },
    ...woolTargets("town_bench", "town_shutter", "town_flowerbox"),
  },
});
