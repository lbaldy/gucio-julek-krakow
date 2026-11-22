// The scripting surface used by content/: scene scripts, dialogues, combos.

import type { Facing, Pt } from "./types";

export type Handler = (g: GameAPI) => unknown | Promise<unknown>;

export interface TargetHandlers {
  look?: Handler;
  use?: Handler;
  talk?: Handler;
  go?: Handler;
  items?: Record<string, Handler>;
}

export interface SceneScript {
  id: string;
  enter?: Handler;
  /** Runs when the player has been idle for `idle_hint_ms` (falls back to the global hint). */
  hint?: Handler;
  targets?: Record<string, TargetHandlers>;
}

/** Handlers that apply in every scene: companions, plus a fallback hint. */
export interface Globals {
  targets?: Record<string, TargetHandlers>;
  hint?: Handler;
}

/** A mini-game takes over update, drawing and input until it calls `finish`. */
export interface MiniGameCtx {
  api: GameAPI;
  /** Image by public path, or null while loading/missing (draw a placeholder). */
  image(path: string): HTMLImageElement | null;
  finish(): void;
  /** Real milliseconds since start. */
  elapsed: number;
}

export interface MiniGame {
  /** Images to load before it starts. */
  images?: string[];
  init(ctx: MiniGameCtx): void;
  update(ctx: MiniGameCtx, dtMs: number): void;
  draw(ctx: MiniGameCtx, c: CanvasRenderingContext2D): void;
  pointer?(ctx: MiniGameCtx, p: Pt, down: boolean): void;
}

export interface DialogueOption {
  /** Line the hero speaks; its text is the option label. */
  say: string;
  reply?: string[];
  once?: boolean;
  if?: string;
  then?: Handler;
  goto?: string;
  exit?: boolean;
}

export interface DialogueDef {
  id: string;
  with: string;
  start: string;
  nodes: Record<string, DialogueOption[]>;
}

export type Combos = Record<string, Handler>;

/** Scripted look handlers for inventory items (otherwise `item.<id>.look` plays). */
export type ItemLooks = Record<string, Handler>;

export interface GameAPI {
  say(lineId: string): Promise<void>;
  card(lineId: string): Promise<void>;
  end(lineId: string): Promise<void>;
  walkTo(target: string | Pt): Promise<void>;
  face(dir: Facing): void;
  /** Walk (or run, with the character's `run` cycle and `run_speed` if it has them) an actor to a point, or to a target's walk_to.
   *  `free` walks in a straight line, ignoring the walkable area (sheep leaving a pen the hero can't enter). */
  actorWalk(actorId: string, to: Pt | string, how?: "walk" | "run" | "free"): Promise<void>;
  actorFace(actorId: string, dir: Facing): void;
  /** Move an actor instantly (e.g. on scene entry, to where a past cutscene left them). */
  place(actorId: string, at: Pt): void;
  /** A named position from the scene's `points`. */
  point(name: string): Pt;
  anim(actorId: string, name: string): Promise<void>;
  pose(actorId: string, name: string | null): void;
  wait(ms: number): Promise<void>;
  flag(name: string): boolean;
  set(name: string, value?: boolean): void;
  unset(name: string): void;
  visited(scene: string): boolean;
  has(item: string): boolean;
  give(item: string): void;
  take(item: string): void;
  drop(item: string): void;
  show(id: string): void;
  hide(id: string): void;
  goto(scene: string, spawn?: string): Promise<void>;
  dialogue(id: string): Promise<void>;
  sfx(name: string): void;
  music(name: string | null): void;
  ambience(name: string | null): void;
  cutscene(fn: () => Promise<unknown>): Promise<void>;
  cond(expr: string): boolean;
  scene(): string;
  /** Run a mini-game (content/minigames/<id>.ts) until it finishes; instant in fast mode. */
  minigame(id: string): Promise<void>;
}

export function defineScene(id: string, s: Omit<SceneScript, "id">): SceneScript {
  return { id, ...s };
}

export function defineDialogue(id: string, d: Omit<DialogueDef, "id">): DialogueDef {
  return { id, ...d };
}

export function defineCombos(c: Combos): Combos {
  return c;
}

export function defineItemLooks(l: ItemLooks): ItemLooks {
  return l;
}

export function defineGlobals(g: Globals): Globals {
  return g;
}

export function defineMiniGame(m: MiniGame): MiniGame {
  return m;
}
