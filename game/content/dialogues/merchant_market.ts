import { defineDialogue } from "../../src/engine/api";

// The grumpy, hungry merchant: what the stones are, and his price (an obwarzanek).
export default defineDialogue("merchant_market", {
  with: "merchant",
  start: "root",
  nodes: {
    root: [
      { say: "market.merchant.talk.stones.1", reply: ["market.merchant.talk.stones.2"] },
      { say: "market.merchant.talk.give.1", if: "!sulphur_got", reply: ["market.merchant.talk.give.2"], then: (g) => g.set("price_known") },
      { say: "market.merchant.talk.bye.1", reply: ["market.merchant.talk.bye.2"], exit: true },
    ],
  },
});
