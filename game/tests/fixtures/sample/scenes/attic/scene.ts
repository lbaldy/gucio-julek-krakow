import { defineScene } from "../../../../../src/engine/api";

export default defineScene("attic", {
  async enter(g) {
    if (!g.visited("attic")) await g.say("attic.enter.first");
  },
  targets: {
    window: {
      use: (g) => g.say("attic.window.use"),
    },
    chest: {
      use: (g) => g.say(g.flag("chest_open") ? "attic.chest.open.use" : "attic.chest.use"),
      items: {
        crowbar: async (g) => {
          g.set("chest_open");
          await g.say("attic.chest.item.crowbar");
        },
      },
    },
    crowbar: {
      use: async (g) => {
        await g.anim("hero", "pickup");
        g.take("crowbar");
        await g.say("attic.crowbar.use");
      },
    },
    key: {
      use: async (g) => {
        await g.anim("hero", "pickup");
        g.take("key");
        await g.say("attic.key.use");
      },
    },
    to_hall: {
      go: async (g) => {
        if (!g.flag("attic_door_open")) return g.say("attic.to_hall.locked");
        return g.goto("hall", "from_attic");
      },
      items: {
        key: async (g) => {
          g.drop("key");
          g.set("attic_door_open");
          await g.say("attic.to_hall.item.key");
          await g.goto("hall", "from_attic");
        },
      },
    },
  },
});
