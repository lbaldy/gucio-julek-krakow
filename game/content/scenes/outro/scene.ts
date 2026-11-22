import { defineScene } from "../../../src/engine/api";

// The ending: Kłębuszek comes home (the promise kept), Dratewka's moment, the feast and the name
// Kraków, the gift of wool, (with all 12 tufts) Kłębuszek jumping again, the real dragon today, and
// the morning at home. The end title goes over the last picture, never a black screen.
export default defineScene("outro", {
  async enter(g) {
    await g.cutscene(async () => {
      g.set("out_reunion");
      await g.wait(900);
      await g.say("outro.reunion.shepherd");
      await g.say("outro.reunion.gucio");
      g.set("out_hero");
      await g.wait(1000);
      await g.say("outro.hero.krak");
      await g.say("outro.hero.dratewka");
      g.set("out_feast");
      await g.wait(1000);
      await g.say("outro.feast.narrator");
      await g.say("outro.feast.crowd");
      await g.say("outro.feast.julek");
      await g.say("outro.feast.gucio");
      g.set("out_gift");
      await g.wait(1000);
      await g.say("outro.gift.shepherd");
      await g.say("outro.gift.julek");
      if (g.flag("all_wool")) {
        g.set("out_bonus");
        await g.wait(1000);
        await g.say("outro.bonus.shepherd");
      }
      g.set("out_today");
      g.sfx("fire");
      await g.wait(1000);
      await g.say("outro.today.narrator");
      g.set("out_morning");
      g.music("home");
      await g.wait(1200);
      await g.say("outro.morning.1");
      await g.say("outro.morning.2");
      await g.say("outro.morning.3");
      await g.say("outro.morning.4");
      await g.say("outro.morning.5");
      g.set("out_end");
      await g.wait(1000);
      await g.say("outro.end.gucio");
      await g.wait(600);
    });
    await g.end("outro.end");
  },
});
