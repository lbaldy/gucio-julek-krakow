// The story clock: game time derived from flags (never from real time), so it survives saves
// and a slow player can never "run out" of it.

import { evalCond } from "./cond";
import type { State } from "./state";
import type { GameConfig } from "./types";

/** Minutes since midnight for the current state, or null when the game has no clock. */
export function clockMinutes(config: GameConfig, state: State): number | null {
  const entry = config.clock?.times.find((t) => evalCond(t.if, state));
  if (!entry) return null;
  const [h, m] = entry.time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** How many of the clock's 12 hour marks are lit: set flags with the `marks` prefix (at most 12). */
export function clockMarks(config: GameConfig, state: State): number {
  const prefix = config.clock?.marks;
  if (!prefix) return 0;
  return Math.min(12, Object.keys(state.flags).filter((f) => f.startsWith(prefix) && state.flags[f]).length);
}

/** How many collectibles of the `counter` are found: set flags with its prefix (at most `total`). */
export function counterValue(config: GameConfig, state: State): number {
  const c = config.counter;
  if (!c) return 0;
  return Math.min(c.total, Object.keys(state.flags).filter((f) => f.startsWith(c.prefix) && state.flags[f]).length);
}
