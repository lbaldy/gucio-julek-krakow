import { defineDialogue } from "../../../../src/engine/api";

export default defineDialogue("old_man", {
  with: "old_man",
  start: "root",
  nodes: {
    root: [
      { say: "hall.old_man.q_who", reply: ["hall.old_man.a_who.1", "hall.old_man.a_who.2"], once: true },
      {
        say: "hall.old_man.q_leave",
        if: "!got_letter",
        reply: ["hall.old_man.a_leave.1"],
        then: (g) => {
          g.give("letter");
          g.set("got_letter");
        },
      },
      { say: "hall.old_man.bye", exit: true },
    ],
  },
});
