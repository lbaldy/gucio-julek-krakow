import { defineScene } from "../../../../../src/engine/api";

export default defineScene("hall", {
  async enter(g) {
    if (!g.visited("hall")) await g.say("hall.enter.first");
  },
  targets: {
    pen: {
      use: async (g) => {
        await g.anim("hero", "pickup");
        g.take("pen");
        await g.say("hall.pen.use");
      },
    },
    old_man: {
      talk: (g) => g.dialogue("old_man"),
      items: {
        letter: (g) => g.say("hall.old_man.item.letter"),
        signed_letter: async (g) => {
          g.drop("signed_letter");
          await g.say("hall.old_man.item.signed_letter");
          await g.end("hall.end");
        },
      },
    },
  },
});
