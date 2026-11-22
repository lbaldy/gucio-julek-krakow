import { defineScene } from "../../../../../src/engine/api";

export default defineScene("intro", {
  async enter(g) {
    await g.cutscene(async () => {
      await g.card("intro.card.1");
      await g.card("intro.card.2");
    });
    await g.goto("attic", "default");
  },
});
