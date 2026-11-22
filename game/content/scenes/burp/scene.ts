import { defineScene } from "../../../src/engine/api";

// The dragon's comic downfall in cards: gulp and tummy ache, drinking the Vistula, round as a
// balloon (silence), the gigantic BEEEK, and the flight over the mountains. Then into the den.
export default defineScene("burp", {
  async enter(g) {
    await g.cutscene(async () => {
      g.set("burp_gulp");
      g.sfx("pop");
      await g.wait(700);
      await g.say("burp.gulp.dragon");
      await g.say("burp.gulp.julek");
      g.set("burp_drink");
      await g.wait(900);
      await g.say("burp.drink.dragon");
      await g.say("burp.drink.gucio");
      g.set("burp_balloon");
      g.music(null);
      await g.wait(2200);
      g.set("burp_beeek");
      g.sfx("boing");
      await g.wait(900);
      await g.say("burp.beeek.julek");
      g.set("burp_fly");
      await g.wait(900);
      await g.say("burp.fly.narrator");
      await g.say("burp.fly.julek");
      await g.wait(600);
    });
    for (const f of ["gulp", "drink", "balloon", "beeek", "fly"]) g.unset(`burp_${f}`);
    await g.goto("den", "default");
  },
});
