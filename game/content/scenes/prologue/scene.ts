import { defineScene } from "../../../src/engine/api";

// The dream prologue as voiced picture cards: the glowing book; the shepherd counts Kłębuszek into
// the fold; the dragon's eyes; the empty fold; the knights run away; the boys wake by the Vistula.
export default defineScene("prologue", {
  async enter(g) {
    await g.cutscene(async () => {
      g.set("pro_glow");
      g.sfx("magic");
      await g.wait(800);
      await g.say("prologue.glow.mama");
      g.set("pro_fold");
      await g.wait(900);
      await g.say("prologue.fold.narrator");
      await g.say("prologue.fold.shepherd");
      g.set("pro_eyes");
      g.music(null);
      await g.wait(1400);
      await g.say("prologue.eyes.dragon");
      g.set("pro_empty");
      await g.wait(1000);
      await g.say("prologue.empty.shepherd");
      g.set("pro_knights");
      await g.wait(900);
      await g.say("prologue.knights.narrator");
      g.sfx("boing");
      await g.say("prologue.knights.krak");
      g.set("pro_bank");
      g.sfx("magic");
      await g.wait(1000);
      await g.say("prologue.bank.1");
      await g.say("prologue.bank.2");
      await g.say("prologue.bank.3");
    });
    for (const f of ["glow", "fold", "eyes", "empty", "knights", "bank"]) g.unset(`pro_${f}`);
    await g.goto("town", "default");
  },
});
