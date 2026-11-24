// Which pose puts a character's hand on a target, and what movement closes the rest of the gap. Pure.

import type { CharacterData, Facing, Pt } from "./types";

export interface ReachPlan {
  /** Anim name (no _r), or null when the character has no pose with a `hand`. */
  anim: string | null;
  motion: string;
  amp?: number;
  /** Slide of the whole figure at contact, in px. */
  shift: number;
  facing: Facing;
  /** Where the hand ends up. */
  hand: Pt;
  /** Px the hand stays away from the target (0 = touches). */
  miss: number;
}

/** A hop can make up this share of the character's height; a slide this share sideways. */
export const MAX_HOP = 0.45;
export const MAX_SLIDE = 0.3;
const TIPTOE = 0.07;
const SLACK = 0.04;

export function planReach(
  ch: CharacterData | undefined,
  at: Pt,
  k: number,
  height: number,
  target: Pt,
  facing: Facing,
  pose?: string,
): ReachPlan {
  const h = height * k;
  const dx = target[0] - at[0];
  const face: Facing = Math.abs(dx) < h * 0.04 ? facing : dx < 0 ? "left" : "right";
  const dir = face === "left" ? -1 : 1;
  const need = at[1] - target[1];
  let best: { name: string; hand: Pt; cost: number } | null = null;
  for (const [key, a] of Object.entries(ch?.anims ?? {})) {
    const name = key.replace(/_[rl]$/, "");
    if (!a.hand || (pose ? name !== pose : a.no_reach)) continue;
    const gap = need - a.hand[1] * k;
    const cost = Math.abs(gap);
    if (!best || cost < best.cost) best = { name, hand: a.hand, cost };
  }
  const hand: Pt = best?.hand ?? [height * 0.3, height * 0.5];
  const gap = (need - hand[1] * k) / h;
  const up = Math.max(0, Math.min(MAX_HOP, gap));
  // Nobody hops bent over: a low pose stays on the ground.
  const standing = hand[1] > height * 0.5;
  const motion = standing && gap > TIPTOE ? "hop" : standing && gap > SLACK ? "tiptoe" : !standing ? "dip" : "stretch";
  const rise = motion === "hop" || motion === "tiptoe" ? up : 0;
  const want = dx - dir * hand[0] * k;
  const shift = Math.max(-MAX_SLIDE * h, Math.min(MAX_SLIDE * h, want));
  const end: Pt = [at[0] + shift + dir * hand[0] * k, at[1] - hand[1] * k - rise * h];
  return {
    anim: best?.name ?? null,
    motion,
    amp: rise || undefined,
    shift,
    facing: face,
    hand: end,
    miss: Math.hypot(end[0] - target[0], end[1] - target[1]),
  };
}
