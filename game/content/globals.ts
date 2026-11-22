// Handlers that work in every scene: Julek (companion and inventory "power"), Gucio as the hint
// button, the glowing wool tufts (optional collectibles) and the hint lists.

import { defineGlobals, type GameAPI } from "../src/engine/api";

// ── Wool tufts: 3 in each of town, meadow, market and cave, 12 in all (game.json "counter").
// The last one of each scene sits low and tight: only Julek reaches it.

export const WOOL = [
  "town_bench", "town_shutter", "town_flowerbox",
  "meadow_gate", "meadow_reeds", "meadow_willow",
  "market_well", "market_stall", "market_counter",
  "cave_reeds", "cave_bush", "cave_crack",
] as const;
type Wool = (typeof WOOL)[number];
const JULEK_WOOL: Wool[] = ["town_flowerbox", "meadow_willow", "market_counter", "cave_crack"];

export function woolFound(g: GameAPI): number {
  return WOOL.filter((w) => g.flag(`wool_${w}`)).length;
}

async function collectWool(g: GameAPI, id: Wool, byJulek: boolean) {
  if (g.flag(`wool_${id}`)) return;
  g.sfx("star");
  g.set(`wool_${id}`);
  if (woolFound(g) === WOOL.length) {
    g.set("all_wool");
    return g.say("_.wool.all");
  }
  if (byJulek) return g.say("_.wool.julek");
  await g.say(woolFound(g) % 2 ? "_.wool.pickup" : "_.wool.pickup.2");
}

/** Scene targets for a scene's tufts: one tap picks up the open ones; the low one needs Julek. */
export function woolTargets(...ids: Wool[]) {
  const out: Record<string, { look: (g: GameAPI) => Promise<void>; use: (g: GameAPI) => Promise<void>; items?: Record<string, (g: GameAPI) => Promise<void>> }> = {};
  for (const id of ids) {
    const low = JULEK_WOOL.includes(id);
    out[`wool_${id}`] = {
      look: (g) => g.say(low ? "_.wool.low" : "_.wool.look"),
      use: async (g) => {
        if (low) return g.say("_.wool.low");
        await g.anim("gucio", "pickup");
        await collectWool(g, id, false);
      },
      items: {
        julek: async (g) => {
          await g.anim("julek", "crawl");
          await collectWool(g, id, true);
        },
      },
    };
  }
  return out;
}

// ── Hints: the open threads per act, most useful first. The first open one wins.

const holdsBenchItem = (g: GameAPI) => g.has("sheepskin") || g.has("straw") || g.has("sulphur");

const hints: { act: string; open: (g: GameAPI) => boolean; line: string }[] = [
  // Act I: the bedroom
  { act: "bedroom", open: (g) => !g.flag("book_down"), line: "_.hint.book" },
  { act: "bedroom", open: (g) => !g.flag("book_read"), line: "_.hint.read" },
  { act: "bedroom", open: () => true, line: "_.hint.sleep" },
  // Act II: the town and the workshop
  { act: "town", open: (g) => !g.visited("workshop"), line: "_.hint.workshop" },
  { act: "town", open: () => true, line: "_.hint.plan" },
  { act: "workshop", open: (g) => !g.flag("needle_found"), line: "_.hint.needle" },
  { act: "workshop", open: (g) => !g.flag("dratwa_found"), line: "_.hint.dratwa" },
  // Act III: the meadow and the market, in any order
  { act: "gather", open: holdsBenchItem, line: "_.hint.bench" },
  { act: "gather", open: (g) => !g.flag("skin_got"), line: "_.hint.skin" },
  { act: "gather", open: (g) => !g.flag("straw_got") && !g.flag("ram_calm") && g.has("dandelion"), line: "_.hint.dandelion_julek" },
  { act: "gather", open: (g) => !g.flag("straw_got") && !g.flag("ram_calm"), line: "_.hint.ram" },
  { act: "gather", open: (g) => !g.flag("straw_got") && !g.has("sack"), line: "_.hint.sack" },
  { act: "gather", open: (g) => !g.flag("straw_got"), line: "_.hint.straw" },
  { act: "gather", open: (g) => !g.flag("sulphur_got") && g.has("pretzel"), line: "_.hint.pretzel" },
  { act: "gather", open: (g) => !g.flag("sulphur_got") && !g.flag("baby_laughed"), line: "_.hint.baby" },
  { act: "gather", open: (g) => !g.flag("sulphur_got"), line: "_.hint.sulphur" },
  // Act V: the cave
  { act: "cave", open: (g) => g.flag("dragon_waiting"), line: "_.hint.beee" },
  { act: "cave", open: (g) => !g.flag("cart_wheel_on") && !g.has("wheel"), line: "_.hint.wheel" },
  { act: "cave", open: (g) => !g.flag("cart_wheel_on"), line: "_.hint.wheel_on" },
  { act: "cave", open: (g) => !g.flag("cart_fixed") && !g.has("peg"), line: "_.hint.peg" },
  { act: "cave", open: (g) => !g.flag("cart_fixed"), line: "_.hint.peg_on" },
  { act: "cave", open: (g) => !g.flag("cart_pushed"), line: "_.hint.push" },
  // the den
  { act: "den", open: (g) => !g.flag("gate_open"), line: "_.hint.gate" },
  { act: "den", open: (g) => !g.flag("klebuszek_found"), line: "_.hint.hollow" },
];

/** Which act's threads are open: only hints for the current act are given. */
function act(g: GameAPI): string {
  if (!g.flag("dreaming")) return "bedroom";
  if (!g.flag("plan_told")) return "town";
  if (!g.flag("dratewka_ready")) return "workshop";
  if (!g.flag("sheep_sewn")) return "gather";
  if (!g.flag("beee_done")) return "cave";
  return "den";
}

/** The hint said most recently (idle hint or Julek's), so clicking Gucio can repeat it. */
let lastHint: string | null = null;

export async function hint(g: GameAPI) {
  const pick = hints.find((h) => h.act === act(g) && h.open(g));
  if (!pick) return;
  return g.say((lastHint = pick.line));
}

/** Clicking Gucio: repeat the last hint while it still applies; otherwise give a fresh one. */
async function repeatHint(g: GameAPI) {
  if (lastHint && hints.some((h) => h.line === lastHint && h.act === act(g) && h.open(g))) return g.say(lastHint);
  return hint(g);
}

export default defineGlobals({
  hint,
  targets: {
    // Gucio himself is the hint button.
    gucio: {
      talk: repeatHint,
      look: repeatHint,
      use: repeatHint,
    },
    julek: {
      look: (g) => g.say("_.julek.look"),
      // Talking to Julek is the hint button too: Gucio thinks aloud about what's next.
      talk: async (g) => {
        await g.say("_.julek.talk.1");
        await g.say("_.julek.talk.2");
        await hint(g);
      },
    },
  },
});
