// Walkable areas: a union of polygons minus blocked holes.
// Paths: straight line if clear, else A* over a visibility graph of polygon corners.

import type { Poly, Pt } from "./types";

export function pointInPoly([x, y]: Pt, poly: Poly): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function closestOnSegment(p: Pt, a: Pt, b: Pt): Pt {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return [a[0] + t * dx, a[1] + t * dy];
}

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

const NUDGES: Pt[] = [];
for (const r of [3, 6, 10]) for (let k = 0; k < 8; k++) NUDGES.push([Math.cos((k * Math.PI) / 4) * r, Math.sin((k * Math.PI) / 4) * r]);

export class WalkArea {
  private nodes: Pt[] = [];

  constructor(
    readonly walkable: Poly[],
    readonly blocked: Poly[] = [],
  ) {
    for (const poly of [...walkable, ...blocked]) {
      for (const v of poly) {
        const n = this.nudgeInside(v);
        if (n) this.nodes.push(n);
      }
    }
  }

  inside(p: Pt): boolean {
    return this.walkable.some((w) => pointInPoly(p, w)) && !this.blocked.some((b) => pointInPoly(p, b));
  }

  private nudgeInside(p: Pt): Pt | null {
    if (this.inside(p)) return p;
    for (const [dx, dy] of NUDGES) {
      const q: Pt = [p[0] + dx, p[1] + dy];
      if (this.inside(q)) return q;
    }
    return null;
  }

  /** Nearest walkable point to p (p itself if it's walkable). */
  clamp(p: Pt): Pt {
    if (this.inside(p)) return p;
    let best: Pt | null = null;
    let bestD = Infinity;
    for (const poly of [...this.walkable, ...this.blocked]) {
      for (let i = 0; i < poly.length; i++) {
        const c = closestOnSegment(p, poly[i], poly[(i + 1) % poly.length]);
        const n = this.nudgeInside(c);
        if (n && dist(p, n) < bestD) {
          best = n;
          bestD = dist(p, n);
        }
      }
    }
    return best ?? p;
  }

  clear(a: Pt, b: Pt): boolean {
    const steps = Math.max(1, Math.ceil(dist(a, b) / 6));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (!this.inside([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])) return false;
    }
    return true;
  }

  /** Waypoints from `from` to (clamped) `to`, excluding `from`. */
  find(from: Pt, to: Pt): Pt[] {
    const start = this.clamp(from);
    const goal = this.clamp(to);
    if (this.clear(start, goal)) return [goal];

    const pts = [start, goal, ...this.nodes];
    const g = new Map<number, number>([[0, 0]]);
    const prev = new Map<number, number>();
    const open = new Set([0]);
    const closed = new Set<number>();
    while (open.size) {
      let cur = -1;
      let curF = Infinity;
      for (const i of open) {
        const f = g.get(i)! + dist(pts[i], goal);
        if (f < curF) {
          cur = i;
          curF = f;
        }
      }
      if (cur === 1) {
        const out: Pt[] = [];
        for (let i = 1; i !== 0; i = prev.get(i)!) out.unshift(pts[i]);
        return out;
      }
      open.delete(cur);
      closed.add(cur);
      for (let j = 1; j < pts.length; j++) {
        if (closed.has(j) || !this.clear(pts[cur], pts[j])) continue;
        const cand = g.get(cur)! + dist(pts[cur], pts[j]);
        if (cand < (g.get(j) ?? Infinity)) {
          g.set(j, cand);
          prev.set(j, cur);
          open.add(j);
        }
      }
    }
    return []; // unreachable: stay put
  }
}
