import { defineCombos, type GameAPI } from "../src/engine/api";
import { calmRam } from "./scenes/meadow/scene";

// Giving Julek an item makes him use it: the dandelion goes to the ram, the obwarzanek almost
// goes into his mouth.
export default defineCombos({
  "dandelion+julek": (g: GameAPI) => (g.cond("scene:meadow") ? calmRam(g) : g.say("_.hint.julek_combo")),
  "pretzel+julek": async (g: GameAPI) => {
    await g.say("market.pretzel.julek.1");
    await g.say("market.pretzel.julek.2");
  },
});
