import { defineDialogue } from "../../src/engine/api";

// King Krak on his bench: who he is, what happened to the knights, and (after the plan) his doubt.
export default defineDialogue("krak_town", {
  with: "krak",
  start: "root",
  nodes: {
    root: [
      { say: "town.krak.talk.who.1", reply: ["town.krak.talk.who.2"] },
      { say: "town.krak.talk.knights.1", reply: ["town.krak.talk.knights.2", "town.krak.talk.knights.3"] },
      { say: "town.krak.talk.plan.1", if: "plan_told", reply: ["town.krak.talk.plan.2"], then: (g) => g.set("krak_told") },
      { say: "town.krak.talk.bye.1", reply: ["town.krak.talk.bye.2"], exit: true },
    ],
  },
});
