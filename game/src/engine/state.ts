// Persistent game state. Everything a save file holds, and nothing else.

import type { Facing } from "./types";

export interface State {
  scene: string;
  flags: Record<string, boolean>;
  inventory: string[];
  visited: string[];
  hero: { x: number; y: number; facing: Facing };
  /** Current loops as paths under audio/; scripts can change them after entry, so saves keep them. */
  music?: string | null;
  ambience?: string | null;
}

export function newState(scene: string): State {
  return { scene, flags: {}, inventory: [], visited: [], hero: { x: 0, y: 0, facing: "right" } };
}

export function serialize(s: State): string {
  return JSON.stringify(s);
}

export function deserialize(raw: string): State {
  const s = JSON.parse(raw) as State;
  if (typeof s.scene !== "string" || !Array.isArray(s.inventory)) throw new Error("bad save");
  return s;
}

export function hiddenKey(scene: string, id: string): string {
  return `hidden:${scene}/${id}`;
}
