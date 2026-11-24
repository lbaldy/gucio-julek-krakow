// Screen layout shared by input handling and rendering (pure, no DOM).

import type { GameConfig, Pt } from "../types";

export const W = 1920;
export const H = 1080;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const hit = (r: Rect, [x, y]: Pt) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

/** Inventory bar slides down when the pointer is near the top edge. */
export const INV_REVEAL_Y = 130;
export const INV_BAR: Rect = { x: 0, y: 0, w: W, h: 128 };

export function invSlots(n: number): Rect[] {
  const size = 104;
  const gap = 14;
  return Array.from({ length: n }, (_, i) => ({ x: 24 + i * (size + gap), y: 12, w: size, h: size }));
}

export function choiceRects(n: number): Rect[] {
  const h = 56;
  return Array.from({ length: n }, (_, i) => ({ x: 80, y: H - 40 - (n - i) * h, w: W - 160, h: h - 4 }));
}

/** The collectible counter: where its pips start, and its icon's middle (an arriving find flies there). */
export function counterLayout(cfg: GameConfig): { x0: number; y0: number; pip: number; gap: number; perRow: number; pipsW: number } {
  const perRow = Math.ceil((cfg.counter?.total ?? 0) / 2);
  const [pip, gap] = [14, 8];
  const pipsW = perRow * (pip + gap) - gap;
  return { x0: (cfg.clock ? W - 160 : W - 30) - pipsW, y0: 40, pip, gap, perRow, pipsW };
}

export function counterIcon(cfg: GameConfig): Pt {
  const { x0, y0 } = counterLayout(cfg);
  return [x0 - 52, y0 + 21];
}

/** The "skip" hint in a skip_hint scene's corner. */
export const SKIP_HINT: Rect = { x: W - 360, y: H - 84, w: 336, h: 60 };

export const MENU_ITEMS = ["resume", "save", "load", "options", "new_game"] as const;
export type MenuItem = (typeof MENU_ITEMS)[number];

export function menuRects(): Rect[] {
  const w = 520;
  const h = 76;
  const top = H / 2 - (MENU_ITEMS.length * (h + 16)) / 2;
  return MENU_ITEMS.map((_, i) => ({ x: (W - w) / 2, y: top + i * (h + 16), w, h }));
}
