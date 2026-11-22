// No-op adapters for running the game in Node (tests) with instant timing.

import { Game, type Adapters, type Content } from "./game";

export function headlessAdapters(): Adapters {
  const store = new Map<string, string>();
  return {
    sizeOf: () => null,
    audio: { music() {}, ambience() {}, sfx() {}, voice: async () => null },
    storage: { get: (k) => store.get(k) ?? null, set: (k, v) => void store.set(k, v) },
    log() {},
  };
}

export function headlessGame(content: Content): Game {
  return new Game(content, headlessAdapters(), true);
}
