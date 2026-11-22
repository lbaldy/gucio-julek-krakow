// Collects everything in content/ into one Content object.

import type { Combos, DialogueDef, Globals, ItemLooks, MiniGame, SceneScript } from "./engine/api";
import type { Content } from "./engine/game";
import type { CharacterData, GameConfig, ItemData, LineData, SceneData } from "./engine/types";
import config from "../content/game.json";
import characters from "../content/characters.json";
import items from "../content/items.json";

type Mods = Record<string, unknown>;

/** The eager `import.meta.glob` results for one content folder (globs must be literals, so callers pass them). */
export interface ContentModules {
  config: unknown;
  characters: unknown;
  items: unknown;
  scenes: Mods;
  scripts: Mods;
  dialogues: Mods;
  lines: Mods;
  combos: Mods;
  itemLooks: Mods;
  globals: Mods;
  minigames: Mods;
}

const byGlob = <T>(mods: Mods) => Object.values(mods) as T[];

export function assembleContent(m: ContentModules): Content {
  const scenes = byGlob<SceneData>(m.scenes);
  const scripts = byGlob<SceneScript>(m.scripts);
  const dialogues = byGlob<DialogueDef>(m.dialogues);
  const lineFiles = byGlob<Record<string, LineData>>(m.lines);
  const minigames = Object.fromEntries(
    Object.entries(m.minigames as Record<string, MiniGame>).map(([p, mod]) => [p.split("/").pop()!.replace(/\.ts$/, ""), mod]),
  );

  return {
    config: m.config as GameConfig,
    characters: m.characters as Record<string, CharacterData>,
    items: m.items as Record<string, ItemData>,
    lines: Object.assign({}, ...lineFiles),
    scenes: Object.fromEntries(scenes.map((s) => [s.id, s])),
    scripts: Object.fromEntries(scripts.map((s) => [s.id, s])),
    dialogues: Object.fromEntries(dialogues.map((d) => [d.id, d])),
    combos: byGlob<Combos>(m.combos)[0] ?? {},
    itemLooks: byGlob<ItemLooks>(m.itemLooks)[0] ?? {},
    globals: byGlob<Globals>(m.globals)[0] ?? {},
    minigames,
  };
}

export function loadContent(): Content {
  return assembleContent({
    config,
    characters,
    items,
    scenes: import.meta.glob("../content/scenes/*/scene.json", { eager: true, import: "default" }),
    scripts: import.meta.glob("../content/scenes/*/scene.ts", { eager: true, import: "default" }),
    dialogues: import.meta.glob("../content/dialogues/*.ts", { eager: true, import: "default" }),
    lines: import.meta.glob("../content/lines/*.json", { eager: true, import: "default" }),
    combos: import.meta.glob("../content/combos.ts", { eager: true, import: "default" }),
    itemLooks: import.meta.glob("../content/item_looks.ts", { eager: true, import: "default" }),
    globals: import.meta.glob("../content/globals.ts", { eager: true, import: "default" }),
    minigames: import.meta.glob("../content/minigames/*.ts", { eager: true, import: "default" }),
  });
}
