import { defineDialogue } from "../../src/engine/api";

// The old shepherd on his meadow: the sheepskin (once the plan is known), Kłębuszek, the ram hint.
export default defineDialogue("shepherd_meadow", {
  with: "shepherd",
  start: "root",
  nodes: {
    root: [
      {
        say: "meadow.shepherd.talk.skin.1",
        if: "plan_told && !skin_got",
        reply: ["meadow.shepherd.talk.skin.2"],
        then: (g) => {
          g.give("sheepskin");
          g.set("skin_got");
          g.sfx("pickup");
        },
      },
      { say: "meadow.shepherd.talk.klebuszek.1", reply: ["meadow.shepherd.talk.klebuszek.2"] },
      { say: "meadow.shepherd.talk.ram.1", if: "!ram_calm", reply: ["meadow.shepherd.talk.ram.2"] },
      { say: "meadow.shepherd.talk.bye.1", reply: ["meadow.shepherd.talk.bye.2"], exit: true },
    ],
  },
});
