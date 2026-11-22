import { defineDialogue } from "../../src/engine/api";

// Lech in the forest, after the intro cutscene: where to look (ask the animals), the eagle again, goodbye.
export default defineDialogue("lech_forest", {
  with: "lech",
  start: "root",
  nodes: {
    root: [
      { say: "forest.lech.q.where", reply: ["forest.lech.talk.where"] },
      { say: "forest.lech.q.what", reply: ["forest.lech.talk.what.1"] },
      { say: "forest.lech.q.bye", reply: ["forest.lech.talk.bye"], exit: true },
    ],
  },
});
