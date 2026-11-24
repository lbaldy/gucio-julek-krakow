// Staging: one-shot poses with a contact moment, motions, scripted moves, reaching and items in flight.
// game.ts owns the state; these functions start things on it and step them.

import type { Game } from "./game";
import { EASE, MOTIONS, along, leap, type Motion, type MoveOpts } from "./motion";
import { planReach } from "./reach";
import type { Pt } from "./types";
import { counterIcon, invSlots } from "./ui/layout";
import { actorHeight, actorScale, centroid, newProp, objectSize, patchKey, reachPoint, scaleAt, type Actor, type ActorAnim, type Prop, type Target, type Tween } from "./world";

export interface AnimOpts {
  /** Runs at the moment of contact (the hand closes, the push lands); a promise it returns is awaited. */
  onContact?: () => unknown;
  motion?: string;
  amp?: number;
  ms?: number;
  /** When contact happens, 0..1 (default: the motion's own moment). */
  contact?: number;
}

export interface ReachOpts extends Pick<AnimOpts, "onContact" | "ms"> {
  /** Who reaches (default: the target's `reach_by`, else the hero). Someone else walks up first. */
  by?: string;
  pose?: string;
}

/** An item on its way somewhere: to the inventory, the counter, or a spot in the scene. */
export interface Flight {
  image: string;
  from: Pt;
  to: Pt;
  t: number;
  ms: number;
  /** Drawn size at the start and the end. */
  size: [number, number];
  /** The inventory item it will become (its slot stays empty until it lands). */
  slot?: string;
  done: () => void;
}

const REACH_MS: Record<string, number> = { hop: 780, tiptoe: 1050, stretch: 900, dip: 850 };

const findActor = (g: Game, id: string): Actor | undefined => g.actors.find((a) => a.id === id);

export function propOf(g: Game, id: string): Prop {
  propBase(g, id); // throws on a wrong id
  let p = g.props.get(id);
  if (!p) g.props.set(id, (p = newProp()));
  return p;
}

/** Bottom centre of an object, patch or fg layer as placed in scene.json. */
function propBase(g: Game, id: string): Pt {
  const o = (g.scene.objects ?? []).find((x) => x.id === id);
  if (o) {
    const { w, h } = objectSize(o, g.io.sizeOf);
    return [o.x + w / 2, o.y + h];
  }
  const patch = (g.scene.patches ?? []).find((x) => patchKey(x) === id);
  const p = patch ?? (g.scene.fg ?? []).find((x) => x.id === id);
  if (!p) throw new Error(`nothing called ${id} in ${g.scene.id} to move`);
  const size = g.io.sizeOf(p.image);
  return [p.x + (patch?.w ?? size?.w ?? 120) / 2, p.y + (patch?.h ?? size?.h ?? 120)];
}

/** Where a thing is, for something to fly from or to: a target's middle, an actor's hands. */
export function spotOf(g: Game, at: string | Pt): Pt {
  if (typeof at !== "string") return at;
  const a = findActor(g, at);
  if (a) return [a.x, a.y - actorHeight(a, g.content.characters[a.id]) * actorScale(a, g.scene) * 0.55];
  const t = g.targets().find((x) => x.id === at);
  return t ? (t.reach_at ?? centroid(t.poly)) : propBase(g, at);
}

// ── poses ────────────────────────────────────────────────────────────────

function handOf(g: Game, a: Actor, name: string): Pt {
  const ch = g.content.characters[a.id];
  const k = actorScale(a, g.scene);
  const h = actorHeight(a, ch);
  const [hx, hy] = ch?.anims[`${name}_r`]?.hand ?? [h * 0.3, h * 0.5];
  return [a.x + (a.facing === "left" ? -1 : 1) * hx * k, a.y - hy * k];
}

/** Plays a pose once. `at` is where the hand will be (reach knows); `shift` slides the figure there and back. */
export function playAnim(g: Game, a: Actor, name: string, o: AnimOpts = {}, at?: Pt, shift = 0): Promise<void> {
  const data = g.content.characters[a.id]?.anims[`${name}_r`];
  const touch = () => {
    g.contactAt = g.instant ? null : (at ?? handOf(g, a, name));
    try {
      return o.onContact?.();
    } finally {
      g.contactAt = null;
    }
  };
  if (g.instant) return Promise.resolve().then(touch).then(() => undefined);
  const ms = o.ms ?? (data ? data.hold_ms ?? (data.frames / data.fps) * 1000 : 500);
  const motion = o.motion ?? data?.motion;
  const def = motion ? MOTIONS[motion] : undefined;
  a.anim?.done(); // a newer pose takes over
  return new Promise<void>((res, rej) => {
    let said: unknown;
    const anim: ActorAnim = {
      name, t: ms, ms, shift,
      // A moving one-frame pose gets a wind-up and a recovery in the standing drawing.
      show: def && (data?.frames ?? 1) === 1 ? (motion === "hop" ? [ms * 0.2, ms * 0.84] : [ms * 0.14, ms * 0.9]) : [0, ms],
      contactMs: ms * (o.contact ?? def?.contact ?? 0.45),
      contact: () => {
        anim.contact = null;
        try {
          said = touch();
        } catch (e) {
          rej(e);
        }
      },
      done: () => {
        anim.contact?.();
        if (a.anim === anim) a.anim = null;
        Promise.resolve(said).then(() => res(), rej);
      },
    };
    a.anim = anim;
    if (motion) void playMotion(g, a, motion, { ms, amp: o.amp });
  });
}

export async function reach(g: Game, target: string | Pt, o: ReachOpts = {}): Promise<void> {
  let t: Pick<Target, "kind" | "poly" | "reach_at" | "reach_by" | "reach_pose" | "walk_to">;
  if (typeof target === "string") {
    const found = g.targets().find((x) => x.id === target);
    if (!found) throw new Error(`reach: no target ${target}`);
    t = found;
  } else t = { kind: "object", poly: [target] };
  const id = o.by ?? t.reach_by ?? g.heroId;
  const a = findActor(g, id);
  if (!a) throw new Error(`reach: actor not in scene: ${id}`);
  const ch = g.content.characters[id];
  const height = actorHeight(a, ch);
  const pose = o.pose ?? t.reach_pose;
  const planAt = (from: Pt, k: number) => planReach(ch, from, k, height, reachPoint(t, from, height * k), a.facing, pose);
  if (id !== g.heroId && t.walk_to) {
    // Somebody else (Julek) hurries up to it on his own feet, an arm's length away.
    const k = scaleAt(t.walk_to[1], g.scene.scale);
    const arm = (ch?.anims[`${planAt(t.walk_to, k).anim}_r`]?.hand?.[0] ?? height * 0.3) * k;
    const [tx] = reachPoint(t, t.walk_to, height * k);
    await g.walkActor(a, g.walk.clamp([tx + (a.x < tx ? -arm : arm), t.walk_to[1] + 2]), "run");
  }
  const p = planAt([a.x, a.y], actorScale(a, g.scene));
  a.facing = p.facing;
  await playAnim(g, a, p.anim ?? "reach", { motion: p.motion, amp: p.amp, ms: o.ms ?? REACH_MS[p.motion], onContact: o.onContact }, p.hand, p.shift);
}

// ── motions and moves ────────────────────────────────────────────────────

export function playMotion(
  g: Game,
  on: { motion: Motion | null },
  name: string | null,
  o: { ms?: number; amp?: number; loop?: boolean; times?: number } = {},
): Promise<void> {
  on.motion?.done();
  if (!name) return Promise.resolve();
  const def = MOTIONS[name];
  if (!def) throw new Error(`unknown motion: ${name}`);
  if (g.instant) return Promise.resolve();
  return new Promise<void>((res) => {
    const m: Motion = {
      name, t: 0, ms: o.ms ?? def.ms, amp: o.amp ?? def.amp, times: o.loop ? Infinity : (o.times ?? 1),
      done: () => {
        if (on.motion === m) on.motion = null;
        res();
      },
    };
    on.motion = m;
    if (o.loop) res(); // a loop runs until it's replaced or stopped with null
  });
}

/** Moves an actor (by its feet) or a prop (by its bottom centre) without walking. */
export function moveThing(g: Game, id: string, to: Pt, o: MoveOpts = {}): Promise<void> {
  const a = findActor(g, id);
  if (a) {
    if (a.path.length || a.arrive) g.settle(a, false);
    a.tween?.done();
    if (o.from) [a.x, a.y] = o.from;
    if (!o.keepFacing && Math.abs(to[0] - a.x) > 4) a.facing = to[0] < a.x ? "left" : "right";
    return tween(g, a, [a.x, a.y], to, o, actorScale(a, g.scene), () => {
      [a.x, a.y] = to;
      a.lift = 0;
      if (o.scale !== undefined) a.fixedScale = o.scale ?? undefined;
      if (o.fade !== undefined) a.alpha = o.fade;
    });
  }
  const base = propBase(g, id);
  const p = propOf(g, id);
  p.tween?.done();
  if (o.from) [p.dx, p.dy] = [o.from[0] - base[0], o.from[1] - base[1]];
  return tween(g, p, [base[0] + p.dx, base[1] + p.dy], to, o, p.scale, () => {
    [p.dx, p.dy] = [to[0] - base[0], to[1] - base[1]];
    p.lift = 0;
    p.rot = 0;
    if (typeof o.scale === "number") p.scale = o.scale;
    if (o.fade !== undefined) p.alpha = o.fade;
  });
}

function tween(g: Game, on: Actor | Prop, from: Pt, to: Pt, o: MoveOpts, k0: number, finish: () => void): Promise<void> {
  if (g.instant) {
    finish();
    return Promise.resolve();
  }
  const dist = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const ms = Math.max(1, o.ms ?? Math.max(400, Math.min(1800, dist * 1.6)));
  return new Promise<void>((res) => {
    const t: Tween = {
      from, to, t: 0, ms, o, k0, a0: on.alpha,
      done: () => {
        if (on.tween === t) on.tween = null;
        finish();
        res();
      },
    };
    on.tween = t;
  });
}

function stepTween(on: Actor | Prop, dtMs: number, apply: (t: Tween, at: Pt, u: number, lift: number) => void) {
  const t = on.tween;
  if (!t) return;
  t.t = Math.min(t.ms, t.t + dtMs);
  const p = t.t / t.ms;
  const l = leap(p);
  const u = t.o.leap ? l.air : EASE[t.o.ease ?? "both"](p);
  apply(t, along(t.from, t.to, u, t.o.via), u, (t.o.arc ?? 0) * (t.o.leap ? l.up : 4 * p * (1 - p)));
  if (t.o.fade !== undefined) on.alpha = mix(t.a0, t.o.fade, u);
  if (p >= 1) t.done();
}

const mix = (a: number, b: number, u: number) => a + (b - a) * u;

function stepMotion(on: { motion: Motion | null }, dtMs: number) {
  const m = on.motion;
  if (!m) return;
  m.t += dtMs;
  while (m.t >= m.ms && m.times > 1) {
    m.t -= m.ms;
    m.times--;
  }
  if (m.t >= m.ms) m.done();
}

export function stepActorStage(g: Game, a: Actor, dtMs: number) {
  const anim = a.anim;
  if (anim) {
    anim.t -= dtMs;
    if (anim.contact && anim.ms - anim.t >= anim.contactMs) anim.contact();
    if (anim.t <= 0) anim.done();
  }
  stepMotion(a, dtMs);
  stepTween(a, dtMs, (t, [x, y], u, lift) => {
    Object.assign(a, { x, y, lift });
    if (t.o.scale !== undefined) a.fixedScale = mix(t.k0, t.o.scale ?? scaleAt(t.to[1], g.scene.scale), u);
  });
}

export function stepProps(g: Game, dtMs: number) {
  for (const [id, p] of g.props) {
    stepMotion(p, dtMs);
    if (p.tween) {
      const base = propBase(g, id);
      stepTween(p, dtMs, (t, [x, y], u, lift) => {
        Object.assign(p, { dx: x - base[0], dy: y - base[1], lift, rot: (t.o.spin ?? 0) * Math.PI * 2 * u });
        if (typeof t.o.scale === "number") p.scale = mix(t.k0, t.o.scale, u);
      });
    }
  }
  for (const f of [...g.flights]) {
    f.t += dtMs;
    if (f.t >= f.ms) f.done();
  }
}

/** Finishes everything in progress (Esc in a cutscene). */
export function finishStage(g: Game) {
  for (const a of g.actors) a.anim?.done();
  for (const on of [...g.actors, ...g.props.values()]) {
    on.tween?.done();
    on.motion?.done();
  }
  for (const f of [...g.flights]) f.done();
}

// ── items in flight ──────────────────────────────────────────────────────

function fly(g: Game, f: Omit<Flight, "t" | "done">): Promise<void> {
  return new Promise<void>((res) => {
    const flight: Flight = {
      ...f, t: 0,
      done: () => {
        g.flights = g.flights.filter((x) => x !== flight);
        res();
      },
    };
    g.flights.push(flight);
  });
}

export function flyToInventory(g: Game, item: string, from: Pt) {
  const r = invSlots(g.state.inventory.length)[g.state.inventory.indexOf(item)];
  if (!r || g.instant) return;
  void fly(g, { image: g.content.items[item].icon, from, to: [r.x + r.w / 2, r.y + r.h / 2], ms: 750, size: [56, r.w - 8], slot: item });
}

export function flyToCounter(g: Game, from: Pt) {
  const icon = g.content.config.counter?.icon;
  if (icon && !g.instant) void fly(g, { image: icon, from, to: counterIcon(g.content.config), ms: 750, size: [46, 56] });
}

/** From the hero's hands to a spot in the scene. */
export function tossItem(g: Game, item: string, to: Pt): Promise<void> {
  if (g.instant) return Promise.resolve();
  return fly(g, { image: g.content.items[item].icon, from: spotOf(g, g.heroId), to, ms: 550, size: [64, 72] });
}
