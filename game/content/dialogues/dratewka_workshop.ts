import { defineDialogue } from "../../src/engine/api";
import { nextNeed } from "../scenes/workshop/scene";

// Dratewka at his bench: who he is, the plan (the main beat), and his checklist of what's missing.
export default defineDialogue("dratewka_workshop", {
  with: "dratewka",
  start: "root",
  nodes: {
    root: [
      { say: "workshop.dratewka.talk.who.1", reply: ["workshop.dratewka.talk.who.2"] },
      {
        say: "workshop.dratewka.talk.plan.1",
        reply: [
          "workshop.dratewka.talk.plan.2",
          "workshop.dratewka.talk.plan.3",
          "workshop.dratewka.talk.plan.4",
          "workshop.dratewka.talk.plan.5",
          "workshop.dratewka.talk.plan.6",
        ],
        then: (g) => g.set("plan_told"),
      },
      { say: "workshop.dratewka.talk.need.0", if: "plan_told", then: (g) => g.say(nextNeed(g)) },
      { say: "workshop.dratewka.talk.bye.1", reply: ["workshop.dratewka.talk.bye.2"], exit: true },
    ],
  },
});
