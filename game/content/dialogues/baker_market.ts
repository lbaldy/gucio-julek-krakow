import { defineDialogue } from "../../src/engine/api";

// The tired baker: her crying baby (the hint for Julek's peekaboo) and the obwarzanek.
export default defineDialogue("baker_market", {
  with: "baker",
  start: "root",
  nodes: {
    root: [
      { say: "market.baker.talk.what.1", if: "!baby_laughed", reply: ["market.baker.talk.what.2"] },
      { say: "market.baker.talk.what.1", if: "baby_laughed", reply: ["market.baker.talk.what.3"] },
      { say: "market.baker.talk.pretzel.1", if: "!baby_laughed", reply: ["market.baker.talk.pretzel.2"] },
      { say: "market.baker.talk.bye.1", reply: ["market.baker.talk.bye.2"], exit: true },
    ],
  },
});
