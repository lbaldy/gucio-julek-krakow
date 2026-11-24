// Movement of a drawn thing over time: motions (hop, lunge, nod…) and the easing for tweens. Pure math,
// no art needed: they act on whatever sprite is showing. Every motion starts and ends at rest.

/** Offsets in units of the thing's own height: `fwd` along its facing, `up` off the ground. */
export interface Xf {
  fwd: number;
  up: number;
  sx: number;
  sy: number;
  /** Radians; positive leans forward. Pivots at the feet. */
  rot: number;
}

export interface MotionDef {
  ms: number;
  /** Default strength; what it means depends on the motion (a hop's height, a lunge's reach). */
  amp: number;
  /** When it makes contact, as a fraction of `ms`: an apex, the end of a lunge. */
  contact: number;
  f(p: number, amp: number): Partial<Xf>;
}

const { sin, PI, abs, min, max } = Math;
export const clamp01 = (v: number) => max(0, min(1, v));
export const ease = (u: number) => u * u * (3 - 2 * u);
/** 0 → 1 → 0, staying up between `a` and `b`. */
const plateau = (p: number, a: number, b: number) => (p < a ? ease(p / a) : p > b ? ease((1 - p) / (1 - b)) : 1);
/** A single bump between `a` and `b`. */
const bump = (p: number, a: number, b: number) => (p <= a || p >= b ? 0 : sin(((p - a) / (b - a)) * PI));
const squash = (v: number) => ({ sy: 1 + v, sx: 1 - v * 0.6 });

/** Crouch, leave the ground, land. `up` is 1 at the top. */
export function leap(p: number): { up: number; sq: number; air: number } {
  const [off, down] = [0.2, 0.8];
  const u = clamp01((p - off) / (down - off));
  return {
    up: 4 * u * (1 - u),
    air: u,
    sq: -0.1 * bump(p, 0, off * 1.1) + 0.05 * bump(p, off, 0.45) - 0.08 * bump(p, down - 0.02, 1),
  };
}

export const MOTIONS: Record<string, MotionDef> = {
  hop: { ms: 620, amp: 0.22, contact: 0.5, f: (p, a) => ({ up: a * leap(p).up, ...squash(leap(p).sq) }) },
  tiptoe: { ms: 900, amp: 0.05, contact: 0.5, f: (p, a) => ({ up: a * 0.6 * plateau(p, 0.35, 0.7), sy: 1 + a * 0.4 * plateau(p, 0.35, 0.7) - 0.04 * bump(p, 0, 0.25) }) },
  stretch: { ms: 800, amp: 0.04, contact: 0.45, f: (p, a) => ({ ...squash(a * plateau(p, 0.35, 0.65) - a * bump(p, 0, 0.25)), rot: a * 0.8 * plateau(p, 0.4, 0.65) }) },
  dip: { ms: 700, amp: 0.05, contact: 0.45, f: (p, a) => squash(-a * plateau(p, 0.4, 0.6)) },
  lunge: { ms: 700, amp: 0.4, contact: 0.5, f: (p, a) => ({ fwd: -a * 0.25 * bump(p, 0, 0.4) + a * (p < 0.3 ? 0 : p < 0.5 ? ease((p - 0.3) / 0.2) : ease((1 - p) / 0.5)), rot: -0.06 * bump(p, 0, 0.4) + 0.08 * bump(p, 0.3, 0.7) }) },
  strain: { ms: 1200, amp: 0.03, contact: 0.4, f: (p, a) => ({ rot: a * plateau(p, 0.2, 0.8) * (1 + 0.35 * sin(p * PI * 14)), up: a * 0.4 * plateau(p, 0.25, 0.7), sy: 1 - 0.05 * bump(p, 0, 0.25) }) },
  shake: { ms: 700, amp: 0.03, contact: 0.3, f: (p, a) => ({ fwd: a * sin(p * PI * 8) * (1 - p), rot: a * sin(p * PI * 8) * (1 - p) }) },
  nod: { ms: 800, amp: 0.03, contact: 0.3, f: (p, a) => ({ ...squash(-a * abs(sin(p * PI * 2))), rot: a * abs(sin(p * PI * 2)) }) },
  sway: { ms: 1600, amp: 0.03, contact: 0.5, f: (p, a) => ({ rot: a * sin(p * PI * 2) }) },
  chuckle: { ms: 450, amp: 0.025, contact: 0.5, f: (p, a) => squash(-a * abs(sin(p * PI * 2))) },
  rattle: { ms: 420, amp: 0.02, contact: 0.5, f: (p, a) => ({ up: a * abs(sin(p * PI * 2)), rot: a * 0.5 * sin(p * PI * 2) }) },
};

export const REST: Xf = { fwd: 0, up: 0, sx: 1, sy: 1, rot: 0 };

export interface Motion {
  name: string;
  t: number;
  ms: number;
  amp: number;
  /** Rounds left (Infinity: until it's stopped). */
  times: number;
  done: () => void;
}

/** The transform of a motion (by name) at progress `p`. */
export function motionAt(name: string, p: number, amp?: number): Xf {
  const d = MOTIONS[name];
  return d ? { ...REST, ...d.f(clamp01(p), amp ?? d.amp) } : REST;
}

export function combine(a: Xf, b: Xf): Xf {
  return { fwd: a.fwd + b.fwd, up: a.up + b.up, sx: a.sx * b.sx, sy: a.sy * b.sy, rot: a.rot + b.rot };
}

export interface MoveOpts {
  ms?: number;
  /** Start here instead of where it is now. */
  from?: [number, number];
  /** Bends the path through this point (an eagle circling away). */
  via?: [number, number];
  /** Height of a thrown arc, in px. */
  arc?: number;
  /** Whole turns while moving (props). */
  spin?: number;
  /** Props: size factor at the end. Actors: fixed scale at the end; null returns to the scene's depth scale. */
  scale?: number | null;
  /** Opacity at the end (0 disappears). */
  fade?: number;
  ease?: "both" | "in" | "out" | "none";
  /** Actors: the pose shown while moving. */
  pose?: string;
  /** Actors: keep facing the way they were (a knock-back). */
  keepFacing?: boolean;
  /** Crouch before and squash after, like a jump (g.jump sets it). */
  leap?: boolean;
}

export const EASE: Record<NonNullable<MoveOpts["ease"]>, (u: number) => number> = {
  both: ease,
  in: (u) => u * u,
  out: (u) => 1 - (1 - u) * (1 - u),
  none: (u) => u,
};

/** A point on the straight line, or on the curve through `via`, from `a` to `b`. */
export function along(a: [number, number], b: [number, number], u: number, via?: [number, number]): [number, number] {
  if (!via) return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  // The quadratic curve that passes through `via` half-way.
  const c = [2 * via[0] - (a[0] + b[0]) / 2, 2 * via[1] - (a[1] + b[1]) / 2];
  const v = 1 - u;
  return [v * v * a[0] + 2 * v * u * c[0] + u * u * b[0], v * v * a[1] + 2 * v * u * c[1] + u * u * b[1]];
}
