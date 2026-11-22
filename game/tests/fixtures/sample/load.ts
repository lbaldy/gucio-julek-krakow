// The template's tiny sample game (intro → attic → hall), kept as a fixture so the engine's
// own tests don't depend on the real game's content.

import { assembleContent } from "../../../src/content";
import type { Content } from "../../../src/engine/game";
import config from "./game.json";
import characters from "./characters.json";
import items from "./items.json";

export function loadSample(): Content {
  return assembleContent({
    config,
    characters,
    items,
    scenes: import.meta.glob("./scenes/*/scene.json", { eager: true, import: "default" }),
    scripts: import.meta.glob("./scenes/*/scene.ts", { eager: true, import: "default" }),
    dialogues: import.meta.glob("./dialogues/*.ts", { eager: true, import: "default" }),
    lines: import.meta.glob("./lines/*.json", { eager: true, import: "default" }),
    combos: import.meta.glob("./combos.ts", { eager: true, import: "default" }),
    itemLooks: import.meta.glob("./item_looks.ts", { eager: true, import: "default" }),
    globals: import.meta.glob("./globals.ts", { eager: true, import: "default" }),
    minigames: import.meta.glob("./minigames/*.ts", { eager: true, import: "default" }),
  });
}
