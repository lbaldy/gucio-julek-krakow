// Drives the game by target IDs: used by walkthrough tests and window.__game.

import { evalCond } from "./cond";
import type { Game, Verb } from "./game";

export interface Step {
  look?: string;
  use?: string;
  talk?: string;
  go?: string;
  item?: string;
  on?: string;
  combine?: [string, string];
  lookItem?: string;
  choose?: number;
  expect?: string;
  /** Expect this line ID to have been said by the previous step. */
  said?: string;
}

export interface Start {
  scene?: string;
  spawn?: string;
  give?: string[];
  set?: string[];
}

async function settle(g: Game, action: () => Promise<unknown>): Promise<void> {
  g.lastError = null;
  let err: unknown = null;
  const p = action().catch((e) => (err = e));
  await new Promise((r) => setTimeout(r, 0));
  await g.idle();
  if (!g.choice) await p;
  if (err) throw err;
  if (g.lastError) throw g.lastError;
}

export async function start(g: Game, s: Start = {}) {
  // Flags and items go in before the scene is entered, so its enter() and the companions see them.
  await g.newGame(s.scene, s.spawn, (st) => {
    for (const item of s.give ?? []) if (!st.inventory.includes(item)) st.inventory.push(item);
    for (const flag of s.set ?? []) st.flags[flag] = true;
  });
  await g.idle();
}

export async function runStep(g: Game, s: Step): Promise<void> {
  const mark = g.events.length;
  const verb = (v: Verb, id: string) => settle(g, () => g.act(v, id));
  if (s.look) await verb("look", s.look);
  else if (s.use) await verb("use", s.use);
  else if (s.talk) await verb("talk", s.talk);
  else if (s.go) await verb("go", s.go);
  else if (s.item) await settle(g, () => g.act("use", s.on!, s.item));
  else if (s.combine) await settle(g, () => g.combine(s.combine![0], s.combine![1]));
  else if (s.lookItem) await settle(g, () => g.lookItem(s.lookItem!));
  else if (s.choose) {
    if (!g.choice) throw new Error("no dialogue choice pending");
    const n = g.choice.options.length;
    if (s.choose < 1 || s.choose > n) throw new Error(`choice ${s.choose} out of range (1–${n})`);
    await settle(g, async () => g.choice!.pick(s.choose! - 1));
  }
  if (s.expect && !evalCond(s.expect, g.state)) throw new Error(`expected: ${s.expect}`);
  if (s.said && !g.events.slice(mark).some((e) => e.t === "say" && e.id === s.said))
    throw new Error(`expected line ${s.said} to be said`);
}
