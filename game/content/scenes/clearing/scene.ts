import { defineScene, type GameAPI } from "../../../src/engine/api";
import { collectFeather, featherTargets, foodsIn } from "../../globals";

// Act V: Lech loves the clearing but worries about food. The boys fill the basket: blueberries
// (Julek eats the first handful), apples (the stick), a porcino (only after asking Lech: the
// mushroom lesson; the toadstool is the gag). With three foods Ruda runs in with hazelnuts, the
// basket is full, Lech decides: this is the place. Then the ending cards.

async function putInBasket(g: GameAPI, item: "blueberries" | "apples" | "porcino") {
  g.drop(item);
  g.set(`basket_${item}`);
  g.set(`basket_${foodsIn(g)}`);
  g.sfx("pickup");
  await g.say(`clearing.basket.item.${item}`);
  if (foodsIn(g) < 3) return;
  await g.cutscene(async () => {
    await g.wait(500);
    g.place("ruda", g.point("ruda_from"));
    g.set("ruda_arrived");
    await g.actorWalk("ruda", g.point("ruda_to"));
    g.pose("ruda", "nuts");
    await g.say("clearing.ruda.arrive.1");
    await g.say("clearing.ruda.arrive.2");
    g.set("basket_full");
    g.sfx("ding");
    await g.say("clearing.ruda.arrive.3");
    await g.say("clearing.ruda.arrive.4");
    void g.anim("lech", "happy");
    await g.say("clearing.basket.full.1");
    await g.say("clearing.basket.full.2");
    await g.wait(800);
  });
  await g.goto("outro");
}

const basketItems = {
  blueberries: (g: GameAPI) => putInBasket(g, "blueberries"),
  apples: (g: GameAPI) => putInBasket(g, "apples"),
  porcino: (g: GameAPI) => putInBasket(g, "porcino"),
};

async function pickPorcino(g: GameAPI) {
  if (g.flag("porcino_picked")) return g.say("clearing.ferns.look.empty");
  if (!g.flag("lech_mushrooms")) return g.say("clearing.ferns.use.early");
  await g.anim("gucio", "pickup");
  g.set("porcino_picked");
  g.give("porcino");
  await g.say("clearing.ferns.use");
}

async function julekBerries(g: GameAPI) {
  if (g.flag("berries_picked")) return g.say("clearing.blueberries.look.empty");
  await g.anim("julek", g.flag("berries_eaten") ? "dig" : "eat");
  if (!g.flag("berries_eaten")) {
    g.set("berries_eaten");
    await g.say("clearing.blueberries.julek.1");
    return g.say("clearing.blueberries.julek.1.gucio");
  }
  g.set("berries_picked");
  g.give("blueberries");
  await g.say("clearing.blueberries.julek.2");
  await collectFeather(g, "clearing_berries", true);
  await g.say("clearing.blueberries.julek.2.gucio");
}

export default defineScene("clearing", {
  async enter(g) {
    if (g.visited("clearing")) return;
    await g.cutscene(async () => {
      await g.wait(500);
      await g.say("clearing.enter.first.1");
      await g.say("clearing.enter.first.2");
      await g.say("clearing.enter.first.3");
      await g.say("clearing.enter.first.4");
    });
  },
  targets: {
    lech: {
      talk: (g) => g.dialogue("lech_clearing"),
      items: {
        ...basketItems,
        julek: async (g) => {
          await g.say("clearing.lech.julek");
          await g.say("clearing.lech.julek.lech");
        },
      },
    },
    basket: {
      look: (g) => g.say(`clearing.basket.look.${Math.min(foodsIn(g), 2)}`),
      use: (g) => g.say("clearing.basket.use"),
      items: basketItems,
    },
    blueberries: {
      look: (g) => g.say(g.flag("berries_picked") ? "clearing.blueberries.look.empty" : "clearing.blueberries.look"),
      use: (g) => g.say(g.flag("berries_picked") ? "clearing.blueberries.look.empty" : "clearing.blueberries.use"),
      items: { julek: julekBerries },
    },
    apple_tree: {
      look: (g) => g.say(g.flag("apples_down") ? "clearing.apple_tree.look.empty" : "clearing.apple_tree.look"),
      use: (g) => g.say(g.flag("apples_down") ? "clearing.apple_tree.look.empty" : "clearing.apple_tree.use"),
      items: {
        stick: async (g) => {
          if (g.flag("apples_down")) return g.say("clearing.apple_tree.look.empty");
          await g.anim("gucio", "stick");
          g.set("apples_down");
          g.sfx("boing");
          await g.say("clearing.apple_tree.item.stick");
          await g.say("clearing.apple_tree.item.stick.julek");
        },
        julek: async (g) => {
          await g.say("clearing.apple_tree.julek");
          await g.say("clearing.apple_tree.julek.gucio");
        },
      },
    },
    apples_fallen: {
      use: async (g) => {
        await g.anim("gucio", "pickup");
        g.take("apples");
        await g.say("clearing.apples.got");
      },
    },
    ferns: {
      look: async (g) => {
        if (g.flag("porcino_picked")) return g.say("clearing.ferns.look.empty");
        g.set("ferns_seen");
        await g.say("clearing.ferns.look");
      },
      use: pickPorcino,
    },
    porcino_obj: {
      look: async (g) => {
        g.set("ferns_seen");
        await g.say("clearing.ferns.look");
      },
      use: async (g) => {
        g.set("ferns_seen");
        return pickPorcino(g);
      },
    },
    toadstool: {
      use: (g) => g.say("clearing.toadstool.use"),
      items: {
        julek: async (g) => {
          await g.cutscene(async () => {
            await g.say("clearing.toadstool.julek");
            await g.say("clearing.toadstool.julek.gucio");
            await g.say("clearing.toadstool.julek.2");
            await g.say("clearing.toadstool.julek.lech");
          });
          g.set("toadstool_lesson");
        },
        stick: (g) => g.say("clearing.toadstool.use"),
      },
    },
    stream: { use: (g) => g.say("clearing.stream.use") },
    ...featherTargets("clearing_daisies", "clearing_boulder"),
  },
});
