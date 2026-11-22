// Handlers that work in every scene: Julek (companion and inventory "power"), Gucio as the hint
// button, the white feathers (optional collectibles) and the hint lists.

import { defineGlobals, type GameAPI } from "../src/engine/api";

// ── White feathers: 3 per forest scene, 12 in all (game.json "counter"). Some only Julek reaches;
// those come out together with a puzzle item (the log, the bush, the hollow, the blueberries).

export const FEATHERS = [
  "forest_ferns", "forest_log", "forest_path",
  "river_marigold", "river_willow", "river_bush",
  "oak_violets", "oak_hollow", "oak_root",
  "clearing_daisies", "clearing_berries", "clearing_boulder",
] as const;

export function feathersFound(g: GameAPI): number {
  return FEATHERS.filter((f) => g.flag(`feather_${f}`)).length;
}

/** Collect a feather: a chime, the counter pops, and a short line (Julek's "Piórko!" every other time). */
export async function collectFeather(g: GameAPI, id: (typeof FEATHERS)[number], quiet = false) {
  if (g.flag(`feather_${id}`)) return;
  g.sfx("star");
  g.set(`feather_${id}`);
  if (feathersFound(g) === FEATHERS.length) {
    g.set("all_feathers");
    return g.say("_.feather.all");
  }
  if (quiet) return;
  await g.say(feathersFound(g) % 2 ? "_.feather.pickup" : "_.feather.pickup.2");
}

/** Scene targets for feathers lying in the open: one tap picks them up. */
export function featherTargets(...ids: (typeof FEATHERS)[number][]) {
  const out: Record<string, { look: (g: GameAPI) => Promise<void>; use: (g: GameAPI) => Promise<void> }> = {};
  for (const id of ids) {
    out[`feather_${id}`] = {
      look: (g) => g.say("_.feather.look"),
      use: async (g) => {
        await g.anim("gucio", "pickup");
        await collectFeather(g, id);
      },
    };
  }
  return out;
}

// ── Hints: the open threads per scene, most useful first. The first open one in the current
// scene wins; otherwise the first open one anywhere (it names where to go).

const count = (g: GameAPI, flags: string[]) => flags.filter((f) => g.flag(f)).length;
export const ACORNS = ["acorn_branch", "acorn_leaves", "acorn_stash"];
export const PLANKS = ["plank_bank", "plank_willow", "plank_reeds", "plank_bush"];
export const EGGS = ["egg_moss", "egg_hollow", "egg_branch"];
export const FOODS = ["basket_blueberries", "basket_apples", "basket_porcino"];
export const acornsFound = (g: GameAPI) => count(g, ACORNS);
export const planksFound = (g: GameAPI) => count(g, PLANKS);
export const eggsFound = (g: GameAPI) => count(g, EGGS);
export const foodsIn = (g: GameAPI) => count(g, FOODS);

const hints: { act: string; open: (g: GameAPI) => boolean; line: string }[] = [
  // Act I: the bedroom
  { act: "bedroom", open: (g) => !g.flag("book_read"), line: "_.hint.book" },
  { act: "bedroom", open: (g) => g.flag("book_read"), line: "_.hint.sleep" },
  // Act II: the forest, Ruda's acorns
  { act: "forest", open: (g) => acornsFound(g) === 3, line: "_.hint.give_acorns" },
  { act: "forest", open: (g) => !g.flag("ruda_asked"), line: "_.hint.ruda" },
  { act: "forest", open: (g) => !g.flag("acorn_branch") && !g.has("stick"), line: "_.hint.stick" },
  { act: "forest", open: (g) => !g.flag("acorn_branch"), line: "_.hint.branch" },
  { act: "forest", open: (g) => !g.flag("acorn_leaves"), line: "_.hint.leaves" },
  { act: "forest", open: (g) => !g.flag("acorn_stash"), line: "_.hint.jay" },
  { act: "forest", open: (g) => g.has("acorns"), line: "_.hint.give_acorns" },
  // Act III: the river, the bridge
  { act: "river", open: (g) => !g.visited("river"), line: "_.hint.river" },
  { act: "river", open: (g) => planksFound(g) === 4, line: "_.hint.bridge" },
  { act: "river", open: (g) => !g.flag("plank_bank") || !g.flag("plank_willow"), line: "_.hint.planks" },
  { act: "river", open: (g) => !g.flag("plank_reeds") && !g.has("stick"), line: "_.hint.stick_back" },
  { act: "river", open: (g) => !g.flag("plank_reeds"), line: "_.hint.reeds" },
  { act: "river", open: (g) => !g.flag("plank_bush"), line: "_.hint.bush" },
  // Act IV: the oak, the eggs
  { act: "oak", open: (g) => !g.visited("oak"), line: "_.hint.cross" },
  { act: "oak", open: (g) => eggsFound(g) === 3, line: "_.hint.nest" },
  { act: "oak", open: (g) => !g.flag("eagle_asked"), line: "_.hint.eagle" },
  { act: "oak", open: (g) => !g.flag("egg_hollow"), line: "_.hint.hollow" },
  { act: "oak", open: (g) => !g.flag("egg_moss") || !g.flag("egg_branch"), line: "_.hint.eggs" },
  // Act V: the clearing, the basket
  { act: "clearing", open: (g) => !g.visited("clearing"), line: "_.hint.clearing" },
  { act: "clearing", open: (g) => g.has("blueberries") || g.has("apples") || g.has("porcino"), line: "_.hint.fill" },
  { act: "clearing", open: (g) => g.flag("berries_eaten") && !g.flag("berries_picked"), line: "_.hint.blueberries_again" },
  { act: "clearing", open: (g) => !g.flag("berries_eaten"), line: "_.hint.blueberries" },
  { act: "clearing", open: (g) => !g.flag("apples_down") && !g.has("stick"), line: "_.hint.stick_back" },
  { act: "clearing", open: (g) => !g.flag("apples_down"), line: "_.hint.apples" },
  { act: "clearing", open: (g) => !g.flag("lech_mushrooms"), line: "_.hint.ask_lech" },
  { act: "clearing", open: (g) => !g.flag("porcino_picked"), line: "_.hint.porcino" },
  { act: "clearing", open: (g) => !g.flag("toadstool_lesson") && !g.flag("toadstool_hinted"), line: "_.hint.toadstool" },
];

/** Which act's threads are open: only hints for the current act are given. */
function act(g: GameAPI): string {
  if (!g.flag("dreaming")) return "bedroom";
  if (!g.flag("ruda_told")) return "forest";
  if (!g.flag("bridge_fixed")) return "river";
  if (!g.flag("nest_done")) return "oak";
  return "clearing";
}

/** The hint said most recently (idle hint or Julek's), so clicking Gucio can repeat it. */
let lastHint: string | null = null;

export async function hint(g: GameAPI) {
  const pick = hints.find((h) => h.act === act(g) && h.open(g));
  if (!pick) return;
  if (pick.line === "_.hint.toadstool") g.set("toadstool_hinted");
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
