import { defineCombos } from "../../../src/engine/api";

export default defineCombos({
  "pen+letter": async (g) => {
    g.drop("letter");
    g.give("signed_letter");
    await g.say("combo.sign_letter");
  },
});
