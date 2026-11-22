import { defineDialogue } from "../../src/engine/api";

// Ruda before she has her acorns: too upset to remember the eagle; she names the three places.
export default defineDialogue("ruda_forest", {
  with: "ruda",
  start: "root",
  nodes: {
    root: [
      { say: "forest.ruda.talk.eagle.1", reply: ["forest.ruda.talk.eagle.2"] },
      {
        say: "forest.ruda.q.what",
        reply: ["forest.ruda.talk.intro.1", "forest.ruda.talk.acorns.1", "forest.ruda.talk.acorns.2", "forest.ruda.talk.acorns.3", "forest.ruda.talk.acorns.4"],
        then: (g) => g.set("ruda_asked"),
      },
      { say: "forest.ruda.q.bye", reply: ["forest.ruda.talk.bye"], exit: true },
    ],
  },
});
