import { defineItemLooks } from "../src/engine/api";
import { acornsFound, eggsFound } from "./globals";

// The counted items say how many there are (one icon, the count lives in flags).
export default defineItemLooks({
  acorns: (g) => g.say(["item.acorns.look.1", "item.acorns.look.1", "item.acorns.look.2", "item.acorns.look.3"][acornsFound(g)]),
  eggs: (g) => g.say(["item.eggs.look.1", "item.eggs.look.1", "item.eggs.look.2", "item.eggs.look.3"][eggsFound(g)]),
});
