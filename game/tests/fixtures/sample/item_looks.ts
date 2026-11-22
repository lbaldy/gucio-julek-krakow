import { defineItemLooks } from "../../../src/engine/api";

export default defineItemLooks({
  letter: async (g) => {
    await g.say("item.letter.read.1");
    await g.say("item.letter.read.2");
  },
});
