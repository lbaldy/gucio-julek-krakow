import { defineScene } from "../../../src/engine/api";

// The ending as voiced picture cards: the eagle on its nest against the red sky, and the name made
// by all three ("Gniazdo!" "Nieźdo!" "Gniezno!"); the emblem and the colours ("Tak mówi legenda");
// the feather; with all 12 feathers the hatched eaglets; morning at home, the end title over it.
export default defineScene("outro", {
  async enter(g) {
    await g.cutscene(async () => {
      g.set("outro_1");
      g.sfx("eagle");
      await g.wait(900);
      await g.say("outro.card.1");
      await g.say("outro.card.1b");
      await g.say("outro.card.1c");
      await g.say("outro.card.1d");
      g.set("outro_2");
      await g.wait(1200);
      await g.say("outro.card.2");
      await g.say("outro.card.2b");
      await g.say("outro.card.2c");
      g.set("outro_3");
      await g.wait(1200);
      g.sfx("magic");
      await g.say("outro.card.3");
      await g.say("outro.card.3b");
      if (g.flag("all_feathers")) {
        g.set("outro_chicks");
        await g.wait(1200);
        await g.say("outro.card.chicks");
        await g.say("outro.card.chicks.b");
      }
      g.set("outro_4");
      await g.wait(1500);
      await g.say("outro.card.4");
      await g.say("outro.card.4b");
      await g.wait(600);
    });
    await g.end("outro.end");
  },
});
