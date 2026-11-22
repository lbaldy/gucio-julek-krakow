import { defineDialogue } from "../../src/engine/api";

// Dratewka at the cave, shaking a bit: the peg (once the wheel is found) and his courage.
export default defineDialogue("dratewka_cave", {
  with: "dratewka",
  start: "root",
  nodes: {
    root: [
      {
        say: "cave.dratewka.talk.peg.1",
        if: "wheel_seen && !peg_got",
        reply: ["cave.dratewka.talk.peg.2"],
        then: (g) => {
          g.give("peg");
          g.set("peg_got");
          g.sfx("pickup");
        },
      },
      { say: "cave.dratewka.talk.scared.1", reply: ["cave.dratewka.talk.scared.2"] },
      { say: "cave.dratewka.talk.bye.1", reply: ["cave.dratewka.talk.bye.2"], exit: true },
    ],
  },
});
