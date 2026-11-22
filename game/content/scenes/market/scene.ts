import { defineScene, type GameAPI } from "../../../src/engine/api";
import { woolTargets } from "../../globals";

// Act III, the market: the baker's baby won't stop crying; Julek's "Kuku!" makes it laugh and the
// baker gives an obwarzanek; the hungry merchant trades a sulphur stone for it. Julek grabbing a
// stone and going "Fe!" is an optional gag (it plays after the trade if the player skipped it).

async function peekaboo(g: GameAPI) {
  if (g.flag("baby_asleep")) return g.say("market.cradle.julek.asleep");
  if (g.flag("baby_laughed")) return g.say("market.cradle.julek.after");
  await g.cutscene(async () => {
    void g.anim("julek", "peekaboo");
    await g.say("market.cradle.julek.1");
    await g.say("market.cradle.julek.2");
    g.set("baby_laughed");
    g.ambience("market_loop"); // the crying stops
    void g.anim("baker", "give");
    await g.say("market.cradle.julek.3");
    g.give("pretzel");
    g.sfx("pickup");
  });
}

async function fuj(g: GameAPI, after: boolean) {
  g.set("fuj_done");
  void g.anim("julek", "fuj");
  await g.say(after ? "market.fuj.after.1" : "market.sulphur_box.julek.1");
  await g.say(after ? "market.fuj.after.2" : "market.sulphur_box.julek.2");
}

async function trade(g: GameAPI) {
  if (g.flag("sulphur_got")) return g.say("market.merchant.after");
  await g.cutscene(async () => {
    g.drop("pretzel");
    void g.anim("merchant", "eat");
    await g.say("market.merchant.give.pretzel.1");
    g.give("sulphur");
    g.set("sulphur_got");
    g.sfx("pickup");
    await g.say("market.merchant.give.pretzel.2");
    await g.say("market.merchant.give.pretzel.3");
    if (!g.flag("fuj_done")) await fuj(g, true);
  });
}

/** After the laugh, the baby stays happy until the player leaves; on later visits it sleeps. */
const cradleLine = (g: GameAPI) =>
  g.flag("baby_asleep") ? "market.cradle.look.asleep" : g.flag("baby_laughed") ? "market.cradle.look.after" : "market.cradle.look";

const cradle = {
  look: (g: GameAPI) => g.say(cradleLine(g)),
  use: async (g: GameAPI) => {
    if (g.flag("baby_laughed")) return g.say(cradleLine(g));
    await g.say("market.cradle.use.1");
    await g.say("market.cradle.use.2");
  },
  items: { julek: peekaboo },
};

export default defineScene("market", {
  async enter(g) {
    // the default ambience has the baby crying in it; once he has laughed, the market is calm
    if (g.flag("baby_laughed")) {
      g.set("baby_asleep");
      g.ambience("market_loop");
    }
    if (g.visited("market")) return;
    await g.say("market.enter.first.1");
    await g.say("market.enter.first.2");
  },
  targets: {
    merchant: {
      talk: (g) => g.dialogue("merchant_market"),
      items: {
        pretzel: trade,
        julek: async (g) => {
          await g.say("market.merchant.julek");
          await g.say("market.merchant.julek.merchant");
        },
      },
    },
    baker: {
      talk: (g) => g.dialogue("baker_market"),
      items: { julek: peekaboo },
    },
    cradle,
    sulphur_box: {
      use: (g) => g.say(g.flag("sulphur_got") ? "market.sulphur_box.use.after" : "market.sulphur_box.use"),
      items: { julek: (g) => fuj(g, false), pretzel: trade },
    },
    pretzels: {
      use: (g) => g.say("market.pretzels.use"),
      items: {
        julek: async (g) => {
          await g.say("market.pretzels.julek");
          await g.say("market.pretzels.julek.gucio");
        },
      },
    },
    well: {
      use: (g) => g.say("market.well.use"),
      items: { julek: (g) => g.say("market.well.julek") },
    },
    closed_stalls: { use: (g) => g.say("market.closed_stalls.use") },
    pots: { use: (g) => g.say("market.pots.use") },
    ...woolTargets("market_well", "market_stall", "market_counter"),
  },
});
