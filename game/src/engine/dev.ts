// Dev hooks for playtesting: URL params, console log, window.__game.

import { centroid } from "./world";
import { runStep, start, type Step } from "./driver";
import type { Game, GameEvent } from "./game";

export interface DevParams {
  scene?: string;
  spawn?: string;
  give: string[];
  set: string[];
  fast: boolean;
  debug: boolean;
}

export function devParams(): DevParams {
  const q = new URLSearchParams(location.search);
  const list = (k: string) => (q.get(k) ?? "").split(",").filter(Boolean);
  return {
    scene: q.get("scene") ?? undefined,
    spawn: q.get("spawn") ?? undefined,
    give: list("give"),
    set: list("set"),
    fast: q.get("fast") === "1",
    debug: q.get("debug") === "1",
  };
}

export function logEvent(e: GameEvent) {
  switch (e.t) {
    case "say":
      return console.log(`[say] ${e.id} ${e.speaker}: ${e.text}`);
    case "act":
      return console.log(`[act] ${e.verb} ${e.target}${e.item ? ` with ${e.item}` : ""}`);
    case "scene":
      return console.log(`[act] scene ${e.id} @${e.spawn}`);
    case "item":
      return console.log(`[act] ${e.op} ${e.item}`);
    case "flag":
      return console.log(`[act] flag ${e.name}=${e.value}`);
    case "error":
      return console.error(`[error] ${e.message}`);
  }
}

export async function startFromParams(g: Game, p: DevParams) {
  g.debug = p.debug;
  if (p.scene || p.give.length || p.set.length) await start(g, p);
  else if (!g.load("auto")) await g.newGame();
}

export function exposeDevApi(g: Game) {
  const step = (s: Step) => runStep(g, s);
  (window as unknown as Record<string, unknown>).__game = {
    game: g,
    state: () => structuredClone(g.state),
    targets: () =>
      g.targets().map((t) => ({ id: t.id, name: t.name, kind: t.kind, at: centroid(t.poly).map(Math.round) })),
    click: (target: string | [number, number], double = false) => {
      const p = typeof target === "string" ? g.targets().find((t) => t.id === target) : null;
      if (typeof target === "string" && !p) throw new Error(`no target ${target}`);
      g.pointerDown(p ? centroid(p.poly) : (target as [number, number]), "left", double);
    },
    look: (id: string) => step({ look: id }),
    use: (id: string) => step({ use: id }),
    talk: (id: string) => step({ talk: id }),
    go: (id: string) => step({ go: id }),
    useItem: (item: string, on: string) => step({ item, on }),
    lookItem: (item: string) => step({ lookItem: item }),
    combine: (a: string, b: string) => step({ combine: [a, b] }),
    choose: (n: number) => step({ choose: n }),
    goto: (scene: string, spawn?: string) => g.run(() => g.api.goto(scene, spawn)),
    give: (item: string) => g.api.give(item),
    set: (flag: string) => g.api.set(flag),
    idle: () => g.idle(),
    log: g.events,
  };
}
