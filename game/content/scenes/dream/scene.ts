import { defineScene } from "../../../src/engine/api";

// The dream, as voiced picture cards: Lech sees the white eagle on the red sky and loses it in the
// forest; the eagle comes to the boys' bedroom; the feather's light carries them into the forest.
export default defineScene("dream", {
  async enter(g) {
    await g.cutscene(async () => {
      g.set("dream_1");
      g.sfx("eagle");
      await g.wait(800);
      await g.say("dream.card.1");
      await g.say("dream.card.1b");
      g.set("dream_2");
      await g.wait(1000);
      await g.say("dream.card.2");
      await g.say("dream.card.2b");
      g.set("dream_3");
      await g.wait(1000);
      await g.say("dream.card.3");
      await g.say("dream.card.3b");
      g.set("dream_4");
      g.sfx("magic");
      await g.wait(1000);
      await g.say("dream.card.4");
      await g.wait(800);
    });
    for (const f of ["dream_1", "dream_2", "dream_3", "dream_4"]) g.unset(f);
    await g.goto("forest", "default");
  },
});
