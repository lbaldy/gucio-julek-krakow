import { defineScene, type GameAPI, type Handler } from "../../../src/engine/api";
import { woolTargets } from "../../globals";

// Act V, the cave at dusk. Fix Krak's cart (the wheel from the reeds, a shoemaker's peg from
// Dratewka), push the fake sheep to the cave mouth. The low point: the dragon sniffs it and isn't
// fooled ("a sheep that doesn't bleat?"); the music stops. Julek, hidden behind the sheep, says
// "Beee!" and the dragon gulps it. There's no way back from here, and the dragon waits forever.

/** While the dragon is waiting, everything except Julek's bleat gets Gucio's "Ćśś!". */
const quiet = (h: Handler): Handler => (g) => (g.flag("dragon_waiting") ? g.say("cave.dragon.wrong") : h(g));

async function cartLook(g: GameAPI) {
  if (g.flag("cart_pushed")) return g.say("cave.cart.look.pushed");
  if (g.flag("cart_fixed")) return g.say("cave.cart.look.fixed");
  if (g.flag("cart_wheel_on")) return g.say("cave.cart.look.wheel");
  return g.say("cave.cart.look");
}

async function wheelOn(g: GameAPI) {
  g.drop("wheel");
  g.set("cart_wheel_on");
  g.set("wheel_seen");
  g.sfx("pop");
  await g.say("cave.cart.use.wheel");
}

async function pegOn(g: GameAPI) {
  if (!g.flag("cart_wheel_on")) return g.say("cave.cart.use.peg.early");
  g.drop("peg");
  g.set("cart_fixed");
  g.sfx("ding");
  await g.say("cave.cart.use.peg");
}

async function push(g: GameAPI) {
  await g.cutscene(async () => {
    await g.walkTo(g.point("push_from"));
    void g.anim("gucio", "push");
    g.set("cart_pushed");
    g.sfx("rustle");
    await g.say("cave.push.1");
    await g.walkTo(g.point("gucio_hide"));
    g.place("julek", g.point("julek_hide"));
    g.set("julek_hiding");
    await g.say("cave.push.2");
    await g.say("cave.push.3");
    await g.say("cave.push.4");
    // the low point
    await g.wait(1200);
    g.set("dragon_out");
    g.pose("dragon", "sniff");
    g.sfx("rustle");
    await g.say("cave.dragon.1");
    g.pose("dragon", "doubt");
    g.music(null);
    await g.say("cave.dragon.2");
    await g.wait(1500);
    await g.say("cave.dragon.3");
    g.set("dragon_waiting");
  });
}

async function cartUse(g: GameAPI) {
  if (g.flag("dragon_waiting")) return g.say("cave.dragon.wrong");
  if (g.flag("cart_fixed") && !g.flag("cart_pushed")) return push(g);
  return cartLook(g);
}

async function beee(g: GameAPI) {
  if (!g.flag("dragon_waiting")) {
    await g.say("cave.cart.julek");
    return g.say("cave.cart.julek.gucio");
  }
  await g.cutscene(async () => {
    g.place("julek", g.point("julek_hide"));
    void g.anim("julek", "shout");
    await g.say("cave.beee.1");
    g.pose("dragon", "happy");
    await g.say("cave.beee.2");
    g.unset("dragon_waiting");
    g.set("beee_done");
    await g.say("cave.beee.3");
    await g.wait(600);
  });
  g.unset("julek_hiding");
  await g.goto("burp");
}

const cart = {
  look: cartLook,
  use: cartUse,
  items: { wheel: quiet(wheelOn), peg: quiet(pegOn), julek: beee },
};

export default defineScene("cave", {
  async enter(g) {
    if (g.visited("cave")) return;
    await g.cutscene(async () => {
      await g.wait(500);
      await g.say("cave.enter.1");
      await g.say("cave.enter.2");
    });
  },
  targets: {
    cart_a: cart,
    cart_b: cart,
    cart_c: cart,
    fake_sheep: { look: (g) => g.say("cave.fake_sheep.look"), use: cartUse, items: { julek: beee } },
    dragon: {
      look: (g) => g.say("cave.dragon.look"),
      talk: (g) => g.say("cave.dragon.wrong"),
      items: { julek: beee },
    },
    wheel: {
      use: async (g) => {
        await g.anim("gucio", "pickup");
        g.take("wheel");
        g.set("wheel_seen");
        await g.say("cave.wheel.pickup");
      },
    },
    reeds: {
      look: (g) => g.say(g.flag("wheel_seen") ? "cave.reeds.look.empty" : "cave.reeds.look"),
      use: quiet((g) => g.say(g.flag("wheel_seen") ? "cave.reeds.look.empty" : "cave.reeds.look")),
    },
    dratewka: {
      talk: quiet((g) => g.dialogue("dratewka_cave")),
      items: { wheel: (g) => g.say("cave.cart.use.peg.early") },
    },
    cave_mouth: { use: quiet((g) => g.say("cave.cave_mouth.use")) },
    smoke: { use: quiet((g) => g.say("cave.smoke.use")) },
    river: { use: quiet((g) => g.say("cave.river.use")) },
    boulder: { use: quiet((g) => g.say("cave.boulder.use")) },
    path_back: { use: quiet((g) => g.say("cave.path_back.use")) },
    ...woolTargets("cave_reeds", "cave_bush", "cave_crack"),
  },
});
