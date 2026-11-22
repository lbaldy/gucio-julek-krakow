import { defineDialogue } from "../../src/engine/api";

// Lech in the clearing: the food worry, the mushroom lesson (once the ferns were looked at), his people.
export default defineDialogue("lech_clearing", {
  with: "lech",
  start: "root",
  nodes: {
    root: [
      { say: "clearing.lech.q.like", reply: ["clearing.lech.talk.like.1", "clearing.lech.talk.like.2"] },
      {
        say: "clearing.lech.talk.mushrooms.1",
        if: "ferns_seen && !lech_mushrooms",
        reply: ["clearing.lech.talk.mushrooms.2", "clearing.lech.talk.mushrooms.3", "clearing.lech.talk.mushrooms.4"],
        then: (g) => g.set("lech_mushrooms"),
      },
      { say: "clearing.lech.q.people", reply: ["clearing.lech.talk.people"] },
      { say: "clearing.lech.q.bye", reply: ["clearing.lech.talk.bye"], exit: true },
    ],
  },
});
