// What's in the current scene right now: clickable targets, draw order, depth scale.

import { evalCond } from "./cond";
import { pointInPoly } from "./path";
import { REST, combine, leap, motionAt, type Motion, type MoveOpts, type Xf } from "./motion";
import { hiddenKey, type State } from "./state";
import type { CharacterData, Facing, ObjectData, PatchData, Poly, Pt, SceneData, SceneScale, TargetBase } from "./types";

export interface Size {
  w: number;
  h: number;
}

export type SizeOf = (path: string) => Size | null;

export interface Actor {
  id: string;
  x: number;
  y: number;
  facing: Facing;
  path: Pt[];
  arrive: ((arrived: boolean) => void) | null;
  /** One-shot animation, cleared when it finishes. */
  anim: ActorAnim | null;
  /** Movement on top of the drawing (a hop, a nod). */
  motion: Motion | null;
  /** A scripted move (a jump, a push, a knock-back). */
  tween: Tween | null;
  /** Px above the feet point (mid-jump). */
  lift: number;
  alpha: number;
  /** Held pose (e.g. sitting) until cleared. */
  pose: string | null;
  talking: boolean;
  fixedScale?: number;
  /** Sprite folder override (ActorPlacement.look). */
  look?: string;
  /** Height override (ActorPlacement.height_px). */
  heightPx?: number;
  visible_if?: string;
  /** Never drawn (the hero on a no_hero screen). */
  hidden?: boolean;
  walkT: number;
  /** Moving at run speed (a double-click walk). */
  running?: boolean;
  /** Follows the hero (GameConfig.companions). */
  companion?: boolean;
}

export interface ActorAnim {
  name: string;
  t: number;
  ms: number;
  /** The pose shows between these (ms since start); before and after, the actor stands normally. */
  show: [number, number];
  contactMs: number;
  /** Fires once, at contact (or when the anim is cut short before it). */
  contact: (() => void) | null;
  /** Px the figure slides towards the target by the moment of contact, and back. */
  shift: number;
  done: () => void;
}

/** A scripted move in progress. */
export interface Tween {
  from: Pt;
  to: Pt;
  t: number;
  ms: number;
  o: MoveOpts;
  /** Scale and opacity at the start. */
  k0: number;
  a0: number;
  done: () => void;
}

/** What scripts have done to an object, patch or fg layer in this scene (not saved: reset on entry). */
export interface Prop {
  dx: number;
  dy: number;
  lift: number;
  rot: number;
  scale: number;
  alpha: number;
  motion: Motion | null;
  tween: Tween | null;
}

export const newProp = (): Prop => ({ dx: 0, dy: 0, lift: 0, rot: 0, scale: 1, alpha: 1, motion: null, tween: null });

const tweenLeap = (t: Tween | null): Xf => (t?.o.leap ? { ...REST, sy: 1 + leap(t.t / t.ms).sq, sx: 1 - leap(t.t / t.ms).sq * 0.6 } : REST);
const motionXf = (m: Motion | null): Xf => (m ? motionAt(m.name, m.t / m.ms, m.amp) : REST);

/** Everything moving a drawing right now, combined. */
export function xfOf(a: { motion: Motion | null; tween: Tween | null }): Xf {
  return combine(motionXf(a.motion), tweenLeap(a.tween));
}

/** How far (px) a reaching actor has slid towards its target. */
export function animShift(a: Actor): number {
  if (!a.anim?.shift) return 0;
  const t = a.anim.ms - a.anim.t;
  const { contactMs: c, ms } = a.anim;
  const u = t < c ? t / c : t < c + 120 ? 1 : 1 - (t - c - 120) / Math.max(1, ms - c - 120);
  const v = Math.max(0, Math.min(1, u));
  return a.anim.shift * v * v * (3 - 2 * v);
}

export type TargetKind = "hotspot" | "object" | "exit" | "actor";

export interface Target {
  id: string;
  name: string;
  kind: TargetKind;
  walk_to?: Pt;
  face?: string;
  /** Hit area in game coordinates. */
  poly: Poly;
  /** one_tap: skip the look-first tap. */
  pickup?: boolean;
  reach_at?: Pt;
  reach_by?: string;
  reach_pose?: string;
  /** Draw/hit priority: higher wins. */
  z: number;
  exit?: { target: string; spawn?: string };
}

export type Drawable =
  | { kind: "patch"; z: number; patch: PatchData }
  | { kind: "object"; z: number; obj: ObjectData }
  | { kind: "actor"; z: number; actor: Actor }
  | { kind: "fg"; z: number; id?: string; image: string; x: number; y: number };

export function scaleAt(y: number, s?: SceneScale): number {
  if (!s) return 1;
  const t = (y - s.far_y) / (s.near_y - s.far_y || 1);
  return s.far + (s.near - s.far) * Math.max(0, Math.min(1, t));
}

export function actorScale(a: Actor, scene: SceneData): number {
  return a.fixedScale ?? scaleAt(a.y, scene.scale);
}

const rect = (x: number, y: number, w: number, h: number): Poly => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];

export function objectSize(o: ObjectData, sizeOf: SizeOf): Size {
  return sizeOf(o.sprite) ?? { w: o.w ?? 70, h: o.h ?? 50 };
}

/** Height at scale 1: the placement's override, else the character's. */
export function actorHeight(a: Actor, ch: CharacterData | undefined): number {
  return a.heightPx ?? ch?.height_px ?? 400;
}

export function actorBox(a: Actor, ch: CharacterData | undefined, scene: SceneData): Poly {
  const k = actorScale(a, scene);
  const h = actorHeight(a, ch) * k;
  const w = h * (ch?.width_ratio ?? 0.36);
  const lift = (ch?.float_px ?? 0) * k;
  return rect(a.x - w / 2, a.y - h - lift, w, h);
}

const reachOf = (t: TargetBase) => ({ reach_at: t.reach_at, reach_by: t.reach_by, reach_pose: t.reach_pose });

function visible(scene: string, id: string, cond: string | undefined, s: State): boolean {
  return !s.flags[hiddenKey(scene, id)] && evalCond(cond, s);
}

export function targets(
  scene: SceneData,
  s: State,
  actors: Actor[],
  hero: string,
  chars: Record<string, CharacterData>,
  sizeOf: SizeOf,
  heroClickable = false,
  props?: Map<string, Prop>,
): Target[] {
  const out: Target[] = [];
  for (const h of scene.hotspots ?? []) {
    if (visible(scene.id, h.id, h.visible_if, s))
      out.push({ ...reachOf(h), id: h.id, name: h.name, kind: "hotspot", walk_to: h.walk_to, face: h.face, poly: h.polygon, z: 0 });
  }
  for (const e of scene.exits ?? []) {
    if (visible(scene.id, e.id, e.visible_if, s) && evalCond(e.enabled_if, s))
      out.push({
        id: e.id, name: e.name, kind: "exit", walk_to: e.walk_to, face: e.face, poly: e.polygon, z: 1,
        exit: { target: e.target, spawn: e.spawn },
      });
  }
  for (const o of scene.objects ?? []) {
    if (!visible(scene.id, o.id, o.visible_if, s)) continue;
    const { w, h } = objectSize(o, sizeOf);
    const m = props?.get(o.id);
    const poly = o.polygon ?? rect(o.x, o.y, w, h);
    out.push({
      ...reachOf(o), id: o.id, name: o.name, kind: "object", walk_to: o.walk_to, face: o.face, pickup: o.pickup,
      poly: m ? poly.map(([x, y]): Pt => [x + m.dx, y + m.dy]) : poly, z: 1000 + (o.baseline ?? o.y + h) + (m?.dy ?? 0),
    });
  }
  const placements = new Map((scene.actors ?? []).map((p) => [p.id, p]));
  for (const a of actors) {
    if (a.id === hero) {
      // The hero answers clicks only when the game gives him a handler. He sits above painted hotspots
      // (z 0) but below exits, objects and other actors, so pickups and doors behind him still win.
      if (heroClickable && !scene.no_hero)
        out.push({ id: a.id, name: chars[a.id]?.name ?? a.id, kind: "actor", poly: actorBox(a, chars[a.id], scene), z: 0.5 });
      continue;
    }
    if (!visible(scene.id, a.id, a.visible_if, s)) continue;
    const p = placements.get(a.id);
    out.push({
      id: a.id, name: chars[a.id]?.name ?? a.id, kind: "actor", walk_to: p?.walk_to, face: p?.face,
      poly: p?.polygon ?? actorBox(a, chars[a.id], scene), z: 1000 + a.y,
    });
  }
  return out.sort((a, b) => b.z - a.z);
}

/** The point a hand should touch on a target, seen from where the actor stands. */
export function reachPoint(t: Pick<Target, "kind" | "poly" | "reach_at">, from: Pt, height: number): Pt {
  if (t.reach_at) return t.reach_at;
  if (t.kind === "object") {
    const b = bounds(t.poly);
    return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
  }
  // Something big: its nearest part, at chest height.
  const [x0, y0, x1, y1] = bounds(t.poly);
  return [Math.max(x0, Math.min(x1, from[0])), Math.max(y0, Math.min(y1, from[1] - height * 0.55))];
}

const bounds = (p: Poly): [number, number, number, number] => [
  Math.min(...p.map((q) => q[0])), Math.min(...p.map((q) => q[1])), Math.max(...p.map((q) => q[0])), Math.max(...p.map((q) => q[1])),
];

export function targetAt(ts: Target[], p: Pt): Target | null {
  return ts.find((t) => pointInPoly(p, t.poly)) ?? null;
}

/** The key a patch or fg layer is moved by. */
export const patchKey = (p: { id?: string; image: string }) => p.id ?? p.image;

export function drawables(scene: SceneData, s: State, actors: Actor[], sizeOf: SizeOf, props?: Map<string, Prop>): Drawable[] {
  // A moved prop's depth goes with it (how high it's thrown doesn't count).
  const dz = (id?: string) => (id && props?.get(id)?.dy) || 0;
  const out: Drawable[] = [];
  for (const p of scene.patches ?? []) {
    if (visible(scene.id, p.id ?? p.image, p.visible_if, s))
      out.push({ kind: "patch", z: p.baseline ?? -1, patch: p });
  }
  for (const o of scene.objects ?? []) {
    if (visible(scene.id, o.id, o.visible_if, s)) {
      const { h } = objectSize(o, sizeOf);
      out.push({ kind: "object", z: (o.baseline ?? o.y + h) + dz(o.id), obj: o });
    }
  }
  for (const a of actors) {
    if (!a.hidden && visible(scene.id, a.id, a.visible_if, s)) out.push({ kind: "actor", z: a.y, actor: a });
  }
  for (const f of scene.fg ?? []) {
    if (evalCond(f.visible_if, s)) out.push({ kind: "fg", z: f.baseline + dz(f.id), id: f.id, image: f.image, x: f.x, y: f.y });
  }
  return out.sort((a, b) => a.z - b.z);
}

export function centroid(poly: Poly): Pt {
  const n = poly.length || 1;
  return [poly.reduce((s, p) => s + p[0], 0) / n, poly.reduce((s, p) => s + p[1], 0) / n];
}
