// Everything in a scene the editor can grab, rebuilt from the live SceneData each frame.
// Shapes hold references into the scene's own arrays, so edits land in the data directly.

import { evalCond } from "../engine/cond";
import { hiddenKey, type State } from "../engine/state";
import type { CharacterData, Poly, Pt, SceneData } from "../engine/types";
import { actorBox, objectSize, type Actor, type SizeOf } from "../engine/world";

export const LAYERS = ["walkable", "blocked", "hotspots", "exits", "objects", "actors", "spawns", "points", "walk_to", "depth"] as const;
export type Layer = (typeof LAYERS)[number];

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Shape {
  /** Stable across frames: "walkable/0", "hotspot/window", "spawn/default"… */
  key: string;
  layer: Layer;
  label: string;
  color: string;
  /** Editable polygon (a live reference into the scene). */
  poly?: Poly;
  /** Point handle: feet, walk_to, spawn. */
  pos?: Pt;
  /** Horizontal line handle (baselines, depth scale): its y. */
  lineY?: number;
  /** Sprite area, for grabbing and drawing. */
  box?: Rect;
  sprite?: string;
  move(dx: number, dy: number): void;
  /** Its visible_if is false right now. */
  hidden: boolean;
  /** Only drawn while this shape (or itself) is selected. */
  owner?: string;
  /** Edits change the walk area. */
  walkArea?: boolean;
  /** Edits aren't saved (the hero). */
  transient?: boolean;
  remove?: () => void;
}

const movePoly = (p: Poly | undefined, dx: number, dy: number) => p?.forEach((v) => ((v[0] += dx), (v[1] += dy)));

export function buildShapes(
  scene: SceneData,
  s: State,
  actors: Actor[],
  heroId: string,
  chars: Record<string, CharacterData>,
  sizeOf: SizeOf,
): Shape[] {
  const out: Shape[] = [];
  const hidden = (id: string, cond?: string) => !!s.flags[hiddenKey(scene.id, id)] || !evalCond(cond, s);
  const walkTo = (id: string, at: Pt | undefined, isHidden: boolean) => {
    if (at) out.push({ key: `walk_to/${id}`, layer: "walk_to", label: `${id} ↓`, color: "#fd0", pos: at, hidden: isHidden, move: (dx, dy) => movePoly([at], dx, dy) });
  };

  scene.walkable.forEach((poly, i) =>
    out.push({
      key: `walkable/${i}`, layer: "walkable", label: `walkable ${i}`, color: "#3e3", poly, hidden: false, walkArea: true,
      move: (dx, dy) => movePoly(poly, dx, dy),
      remove: scene.walkable.length > 1 ? () => scene.walkable.splice(i, 1) : undefined,
    }),
  );
  (scene.blocked ?? []).forEach((poly, i) =>
    out.push({
      key: `blocked/${i}`, layer: "blocked", label: `blocked ${i}`, color: "#f44", poly, hidden: false, walkArea: true,
      move: (dx, dy) => movePoly(poly, dx, dy),
      remove: () => scene.blocked!.splice(i, 1),
    }),
  );
  for (const h of scene.hotspots ?? []) {
    const hd = hidden(h.id, h.visible_if);
    out.push({ key: `hotspot/${h.id}`, layer: "hotspots", label: h.id, color: "#fc3", poly: h.polygon, hidden: hd, move: (dx, dy) => movePoly(h.polygon, dx, dy) });
    walkTo(h.id, h.walk_to, hd);
  }
  for (const e of scene.exits ?? []) {
    const hd = hidden(e.id, e.visible_if);
    out.push({ key: `exit/${e.id}`, layer: "exits", label: `→ ${e.id}`, color: "#6af", poly: e.polygon, hidden: hd, move: (dx, dy) => movePoly(e.polygon, dx, dy) });
    walkTo(e.id, e.walk_to, hd);
  }
  for (const o of scene.objects ?? []) {
    const hd = hidden(o.id, o.visible_if);
    const { w, h } = objectSize(o, sizeOf);
    out.push({
      key: `object/${o.id}`, layer: "objects", label: o.id, color: "#f93", poly: o.polygon, box: { x: o.x, y: o.y, w, h }, sprite: o.sprite, hidden: hd,
      move: (dx, dy) => ((o.x += dx), (o.y += dy), movePoly(o.polygon, dx, dy)),
    });
    out.push({
      key: `baseline/object/${o.id}`, layer: "depth", label: `${o.id} baseline`, color: "#f93", lineY: o.baseline ?? o.y + h, hidden: hd, owner: `object/${o.id}`,
      move: (_, dy) => void (o.baseline = (o.baseline ?? o.y + h) + dy),
    });
    walkTo(o.id, o.walk_to, hd);
  }
  (scene.patches ?? []).forEach((p, i) => {
    const id = p.id ?? p.image;
    const size = sizeOf(p.image) ?? { w: p.w ?? 120, h: p.h ?? 120 };
    out.push({
      key: `patch/${i}`, layer: "objects", label: `patch ${p.id ?? i}`, color: "#c8f", box: { x: p.x, y: p.y, ...size }, sprite: p.image, hidden: hidden(id, p.visible_if),
      move: (dx, dy) => ((p.x += dx), (p.y += dy)),
    });
  });
  (scene.fg ?? []).forEach((f, i) => {
    const size = sizeOf(f.image) ?? { w: 120, h: 120 };
    const hd = !evalCond(f.visible_if, s);
    out.push({
      key: `fg/${i}`, layer: "objects", label: `fg ${i}`, color: "#8cf", box: { x: f.x, y: f.y, ...size }, sprite: f.image, hidden: hd,
      move: (dx, dy) => ((f.x += dx), (f.y += dy)),
    });
    out.push({
      key: `baseline/fg/${i}`, layer: "depth", label: `fg ${i} baseline`, color: "#8cf", lineY: f.baseline, hidden: hd, owner: `fg/${i}`,
      move: (_, dy) => void (f.baseline += dy),
    });
  });
  for (const p of scene.actors ?? []) {
    const live = actors.find((a) => a.id === p.id);
    const hd = hidden(p.id, p.visible_if);
    const box = p.polygon ? undefined : live && actorBox(live, chars[p.id], scene);
    out.push({
      key: `actor/${p.id}`, layer: "actors", label: p.id, color: "#f6f", pos: [p.x, p.y], poly: p.polygon,
      box: box && { x: box[0][0], y: box[0][1], w: box[1][0] - box[0][0], h: box[2][1] - box[0][1] }, hidden: hd,
      move: (dx, dy) => {
        p.x += dx;
        p.y += dy;
        movePoly(p.polygon, dx, dy);
        if (live) [live.x, live.y] = [p.x, p.y];
      },
    });
    walkTo(p.id, p.walk_to, hd);
  }
  const hero = actors.find((a) => a.id === heroId);
  if (hero && !scene.no_hero) {
    const b = actorBox(hero, chars[heroId], scene);
    out.push({
      key: "hero", layer: "actors", label: "hero (preview)", color: "#7cf", pos: [hero.x, hero.y], transient: true, hidden: false,
      box: { x: b[0][0], y: b[0][1], w: b[1][0] - b[0][0], h: b[2][1] - b[0][1] },
      move: (dx, dy) => ((hero.x += dx), (hero.y += dy)),
    });
  }
  for (const [name, sp] of Object.entries(scene.spawns)) {
    out.push({ key: `spawn/${name}`, layer: "spawns", label: `spawn ${name}`, color: "#0ff", pos: [sp.x, sp.y], hidden: false, move: (dx, dy) => ((sp.x += dx), (sp.y += dy)) });
  }
  for (const [name, pt] of Object.entries(scene.points ?? {})) {
    out.push({ key: `point/${name}`, layer: "points", label: `• ${name}`, color: "#9f6", pos: pt, hidden: false, move: (dx, dy) => movePoly([pt], dx, dy) });
  }
  const sc = scene.scale;
  if (sc) {
    out.push({ key: "scale/near", layer: "depth", label: `near ×${sc.near}`, color: "#aaf", lineY: sc.near_y, hidden: false, move: (_, dy) => void (sc.near_y += dy) });
    out.push({ key: "scale/far", layer: "depth", label: `far ×${sc.far}`, color: "#aaf", lineY: sc.far_y, hidden: false, move: (_, dy) => void (sc.far_y += dy) });
  }
  return out;
}

/** Point-to-segment distance. */
export function segDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

export function polyArea(p: Poly): number {
  let s = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) s += (p[j][0] + p[i][0]) * (p[j][1] - p[i][1]);
  return Math.abs(s / 2);
}
