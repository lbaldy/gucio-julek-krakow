// Dev hooks for playtesting: URL params, console log, window.__game.

import { centroid } from "./world";
import { runStep, start, type Step } from "./driver";
import type { Game, GameEvent } from "./game";
import type { Renderer } from "./render";

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

/**
 * Steps the game by hand and lays the frames out as a filmstrip over the page (click it to close), so
 * movement can be judged from one screenshot. `box` is the part of the scene to show.
 */
async function film(
  g: Game,
  r: Renderer,
  action: () => unknown,
  { frames = 12, every = 100, from = 0, box = [0, 0, 1920, 1080] as [number, number, number, number], cols = 4 } = {},
): Promise<string> {
  document.getElementById("film")?.remove();
  const [x, y, w, h] = box;
  const cw = Math.floor(1600 / cols);
  const ch = Math.round((cw * h) / w);
  const strip = document.createElement("canvas");
  Object.assign(strip, { id: "film", width: cw * cols, height: ch * Math.ceil(frames / cols) });
  strip.style.cssText = "position:fixed;inset:0;margin:auto;max-width:100vw;max-height:100vh;object-fit:contain;z-index:99;background:#222";
  strip.onclick = () => strip.remove();
  const c = strip.getContext("2d")!;
  const breathe = () => new Promise((res) => setTimeout(res, 0));
  const run = async (ms: number) => {
    for (let t = 0; t < ms; t += 20) {
      g.update(20);
      await breathe();
    }
  };
  g.manual = true;
  let failed = "";
  void Promise.resolve(action()).catch((e) => (failed = String(e)));
  await breathe();
  await run(from);
  r.draw(0); // sizes the canvas
  const s = r.canvas;
  const k = Math.min(s.width / 1920, s.height / 1080);
  const [ox, oy] = [(s.width - 1920 * k) / 2, (s.height - 1080 * k) / 2];
  for (let i = 0; i < frames; i++) {
    r.draw(0);
    const [fx, fy] = [(i % cols) * cw, Math.floor(i / cols) * ch];
    c.drawImage(s, ox + x * k, oy + y * k, w * k, h * k, fx, fy, cw - 2, ch - 2);
    c.font = "16px sans-serif";
    c.fillStyle = "#d00";
    c.fillText(`${from + i * every}`, fx + 6, fy + 18);
    await run(every);
  }
  g.manual = false;
  document.body.append(strip);
  return failed || "ok";
}

export function exposeDevApi(g: Game, r: Renderer) {
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
    /** Filmstrip of an action: film(() => __game.useItem("julek", "crib"), {frames, every, box}). */
    film: (action: () => unknown, opts?: Parameters<typeof film>[3]) => film(g, r, action, opts),
    log: g.events,
  };
}
