// In-game scene editor (dev server only). F2 or ?edit=1 toggles it.
// Drag polygon corners, sprites, actors, spawns, script points, walk_to points, baselines and
// depth-scale lines on top of the running scene. Preview poses and fit their sprites, and flip
// the flags the scene's variations depend on. Ctrl/Cmd+S writes the JSON through the dev server.

import type { Images } from "../engine/assets";
import type { Game } from "../engine/game";
import { WalkArea, pointInPoly } from "../engine/path";
import { evalCond } from "../engine/cond";
import type { AnimData, Poly, Pt } from "../engine/types";
import { H, W } from "../engine/ui/layout";
import { actorScale, centroid, type Actor } from "../engine/world";
import { formatCharacters, formatScene } from "./format";
import { Panel } from "./panel";
import { LAYERS, buildShapes, polyArea, segDist, type Layer, type Shape } from "./shapes";

export interface Selection {
  key: string;
  vertex?: number;
}

interface Drag {
  shape: Shape;
  vertex?: number;
  /** Shift-drag on a posed actor: moves the pose sprite's offset instead of the actor. */
  fit?: { actor: Actor; anim: AnimData };
  start: Pt;
  orig: Pt;
  applied: Pt;
  snapshot: Snapshot;
  changed: boolean;
}

interface Snapshot {
  scene: string;
  chars: string;
}

export const CHARACTERS = "characters.json";

// Scene scripts as text, to find the flags their variations hinge on (dev server only).
const SCRIPT_SRC = import.meta.glob("../../content/scenes/*/scene.ts", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

const HANDLE_PX = 10; // grab radius in screen pixels
const BODY_RANK = { actors: 0, objects: 1, hotspots: 2, exits: 2, blocked: 3, walkable: 4 } as Record<string, number>;
const bodyLayer = (s: Shape) => (s.layer in BODY_RANK ? s.layer : "hotspots");

export class Editor {
  active = false;
  layers = new Set<Layer>(LAYERS);
  showHidden = false;
  sel: Selection | null = null;
  status = "";
  readonly dirty = new Set<string>();
  private hover: Selection | null = null;
  private drag: Drag | null = null;
  private mouse: Pt = [0, 0];
  /** Content as last loaded or saved, per scene id and CHARACTERS: dirty means different from this. */
  private saved = new Map<string, string>();
  private undos = new Map<string, Snapshot[]>();
  private redos = new Map<string, Snapshot[]>();
  private panel: Panel;

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly g: Game,
    readonly img: Images,
    readonly toGame: (cx: number, cy: number) => Pt,
  ) {
    this.panel = new Panel(this);
    this.bind();
    addEventListener("beforeunload", (e) => {
      if (this.dirty.size) e.preventDefault();
    });
  }

  toggle(on = !this.active) {
    this.active = on;
    this.drag = null;
    this.panel.show(on);
    if (on) {
      this.g.debug = false;
      this.g.pointerMove([-1, -1]); // the game's hover label would freeze where the cursor was
    }
  }

  // ── model ──────────────────────────────────────────────────────────────

  shapes(): Shape[] {
    const g = this.g;
    return buildShapes(g.scene, g.state, g.actors, g.heroId, g.content.characters, this.img.size);
  }

  /** Shapes currently shown and grabbable. */
  visibleShapes(): Shape[] {
    const sel = this.sel?.key;
    return this.shapes().filter(
      (s) => this.layers.has(s.layer) && (!s.hidden || this.showHidden) && (!s.owner || sel === s.owner || sel === s.key),
    );
  }

  selected(): Shape | undefined {
    return this.sel ? this.shapes().find((s) => s.key === this.sel!.key) : undefined;
  }

  /** The point the panel shows for the selection: a vertex, a handle, a sprite's corner or a line's y. */
  selPoint(s: Shape | undefined = this.selected()): Pt | null {
    if (!s) return null;
    if (this.sel?.vertex !== undefined && s.poly) return s.poly[this.sel.vertex] ?? null;
    if (s.pos) return s.pos;
    if (s.box) return [s.box.x, s.box.y];
    if (s.lineY !== undefined) return [0, s.lineY];
    return null;
  }

  /** One undoable edit of the current scene (and characters.json). */
  edit(fn: () => void, transient = false) {
    const before = this.snapshot();
    fn();
    if (!transient) this.commit(before);
    this.changed(transient);
  }

  setPoint(x: number, y: number) {
    const s = this.selected();
    const cur = this.selPoint(s);
    if (!s || !cur) return;
    this.edit(() => {
      if (this.sel?.vertex !== undefined && s.poly) [s.poly[this.sel.vertex][0], s.poly[this.sel.vertex][1]] = [x, y];
      else s.move(x - cur[0], y - cur[1]);
    }, s.transient);
  }

  setScaleFactor(which: "near" | "far", v: number) {
    const sc = this.g.scene.scale;
    if (sc && Number.isFinite(v)) this.edit(() => void (sc[which] = v));
  }

  addPoly(kind: "walkable" | "blocked") {
    const [x, y] = this.mouseInScene();
    const poly: Poly = [[x - 80, y - 40], [x + 80, y - 40], [x + 80, y + 40], [x - 80, y + 40]];
    this.edit(() => {
      const list = kind === "walkable" ? this.g.scene.walkable : (this.g.scene.blocked ??= []);
      list.push(poly);
      this.sel = { key: `${kind}/${list.length - 1}` };
    });
  }

  deleteSelected() {
    const s = this.selected();
    if (!s || !this.sel) return;
    const v = this.sel.vertex;
    if (v !== undefined && s.poly && s.poly.length > 3) {
      this.edit(() => s.poly!.splice(v, 1));
      this.sel = { key: s.key };
    } else if (v === undefined && s.remove) {
      this.edit(() => s.remove!());
      this.sel = null;
    } else this.status = "can't delete that (polygons keep ≥ 3 corners; only walk/blocked areas can be removed)";
  }

  undo(redo = false) {
    const id = this.g.scene.id;
    const from = (redo ? this.redos : this.undos).get(id);
    const snap = from?.pop();
    if (!snap) return;
    const to = redo ? this.undos : this.redos;
    to.set(id, [...(to.get(id) ?? []), this.snapshot()]);
    const replace = (target: object, json: string) => {
      const t = target as Record<string, unknown>;
      for (const k of Object.keys(t)) delete t[k];
      Object.assign(t, JSON.parse(json));
    };
    replace(this.g.scene, snap.scene);
    replace(this.g.content.characters, snap.chars);
    this.markDirty();
    for (const p of this.g.scene.actors ?? []) {
      const a = this.g.actors.find((x) => x.id === p.id);
      if (a) [a.x, a.y] = [p.x, p.y];
    }
    this.changed(false);
  }

  async save() {
    const ids = [...this.dirty];
    if (!ids.length) return void (this.status = "nothing to save");
    for (const id of ids) {
      const res =
        id === CHARACTERS
          ? await fetch("/__editor/save?characters=1", { method: "POST", body: formatCharacters(this.g.content.characters) })
          : await fetch(`/__editor/save?scene=${id}`, { method: "POST", body: formatScene(this.g.content.scenes[id]) });
      if (!res.ok) {
        this.status = `save failed for ${id}: ${await res.text()}`;
        return this.panel.update();
      }
      this.dirty.delete(id);
      this.saved.set(id, JSON.stringify(id === CHARACTERS ? this.g.content.characters : this.g.content.scenes[id]));
    }
    this.status = `saved ${ids.join(", ")}`;
    this.panel.update();
  }

  gotoScene(id: string, spawn?: string) {
    if (this.g.busy) return void (this.status = "busy: wait for the current script (Esc skips)");
    this.sel = null;
    void this.g.run(() => this.g.api.goto(id, spawn));
  }

  // ── poses ──────────────────────────────────────────────────────────────

  /** The live actor behind an actor shape ("hero" or "actor/<id>"). */
  actorOf(s: Shape | undefined): Actor | undefined {
    if (!s || s.layer !== "actors") return undefined;
    const id = s.key === "hero" ? this.g.heroId : s.key.slice("actor/".length);
    return this.g.actors.find((a) => a.id === id);
  }

  /** Pose names the character has (anims without their _r/_l suffix). */
  poseNames(a: Actor): string[] {
    const anims = Object.keys(this.g.content.characters[a.id]?.anims ?? {});
    return [...new Set(anims.map((n) => n.replace(/_[rl]$/, "")))].filter((n) => n !== "idle");
  }

  /** The anim data that holds the shown pose's offset/scale. */
  poseFit(a: Actor): AnimData | undefined {
    return a.pose ? this.g.content.characters[a.id]?.anims[`${a.pose}_r`] : undefined;
  }

  setPose(a: Actor, name: string | null) {
    a.pose = name;
    a.anim = null;
    this.panel.update();
  }

  setFit(a: Actor, ox: number, oy: number, scale: number) {
    const fit = this.poseFit(a);
    if (!fit) return;
    this.edit(() => {
      if (ox || oy) fit.offset = [Math.round(ox), Math.round(oy)];
      else delete fit.offset;
      if (Number.isFinite(scale) && scale > 0 && scale !== 1) fit.scale = Math.round(scale * 1000) / 1000;
      else delete fit.scale;
    });
  }

  // ── state: the flags a scene's variations hinge on ─────────────────────

  /** Condition terms used by this scene's JSON and script, e.g. "wardrobe_open", "has:key", "visited:attic". */
  stateTerms(): string[] {
    const sc = this.g.scene;
    const conds: (string | undefined)[] = [`visited:${sc.id}`];
    for (const t of [...(sc.hotspots ?? []), ...(sc.objects ?? []), ...(sc.actors ?? []), ...(sc.patches ?? []), ...(sc.fg ?? [])])
      conds.push(t.visible_if);
    for (const e of sc.exits ?? []) conds.push(e.visible_if, e.enabled_if);
    if (Array.isArray(sc.music)) for (const r of sc.music) conds.push(r.if);
    const src = Object.entries(SCRIPT_SRC).find(([path]) => path.includes(`/scenes/${sc.id}/`))?.[1] ?? "";
    for (const [, kind, arg] of src.matchAll(/\.(flag|has|visited|cond)\(\s*["'`]([^"'`$]+)["'`]/g))
      conds.push(kind === "flag" || kind === "cond" ? arg : `${kind}:${arg}`);
    const terms = conds.flatMap((c) => (c ?? "").split("&&").map((t) => t.trim().replace(/^!+/, "").trim()));
    return [...new Set(terms.filter((t) => t && !t.startsWith("scene:")))];
  }

  termOn(term: string): boolean {
    return evalCond(term, this.g.state);
  }

  setTerm(term: string, on: boolean) {
    const s = this.g.state;
    const [kind, arg] = term.includes(":") ? term.split(":", 2) : ["", term];
    const toggle = (list: string[], v: string) => (on ? list.includes(v) || list.push(v) : list.splice(list.indexOf(v) >>> 0, list.includes(v) ? 1 : 0));
    if (kind === "has") toggle(s.inventory, arg);
    else if (kind === "visited") toggle(s.visited, arg);
    else s.flags[term] = on; // plain flags and taken:<object>
    this.panel.update();
  }

  /** Spawn names, nearest to the hero first. */
  spawnsByDistance(): string[] {
    const h = this.g.hero();
    const dist = ([, p]: [string, { x: number; y: number }]) => Math.hypot(p.x - h.x, p.y - h.y);
    return Object.entries(this.g.scene.spawns).sort((a, b) => dist(a) - dist(b)).map(([n]) => n);
  }

  /** Store the preview hero's position and facing in a spawn: that's what the game uses. */
  spawnFromHero(name: string) {
    const sp = this.g.scene.spawns[name];
    const h = this.g.hero();
    if (!sp) return;
    this.edit(() => Object.assign(sp, { x: Math.round(h.x), y: Math.round(h.y), facing: h.facing }));
    this.status = `spawn ${name} set to ${Math.round(h.x)}, ${Math.round(h.y)}`;
    this.panel.update();
  }

  /** Re-run the scene's entry with the current flags, for variations set up by its script.
   *  Uses the spawn nearest the hero, so a scene entered at "bench" replays from the bench. */
  reenter() {
    this.gotoScene(this.g.scene.id, this.spawnsByDistance()[0]);
  }

  private snapshot(): Snapshot {
    return { scene: JSON.stringify(this.g.scene), chars: JSON.stringify(this.g.content.characters) };
  }

  private commit(before: Snapshot) {
    const id = this.g.scene.id;
    const now = this.snapshot();
    if (before.scene === now.scene && before.chars === now.chars) return;
    if (!this.saved.has(id)) this.saved.set(id, before.scene);
    if (!this.saved.has(CHARACTERS)) this.saved.set(CHARACTERS, before.chars);
    this.undos.set(id, [...(this.undos.get(id) ?? []), before].slice(-200));
    this.redos.delete(id);
    this.markDirty();
  }

  private markDirty() {
    const now = { [this.g.scene.id]: JSON.stringify(this.g.scene), [CHARACTERS]: JSON.stringify(this.g.content.characters) };
    for (const [id, json] of Object.entries(now)) {
      if (this.saved.has(id) && this.saved.get(id) !== json) this.dirty.add(id);
      else this.dirty.delete(id);
    }
  }

  private changed(transient: boolean) {
    const sc = this.g.scene;
    if (!transient) this.g.walk = new WalkArea(sc.walkable, sc.blocked);
    this.panel.update();
  }

  private mouseInScene(): Pt {
    return [Math.round(Math.max(100, Math.min(W - 100, this.mouse[0]))), Math.round(Math.max(60, Math.min(H - 60, this.mouse[1])))];
  }

  // ── hit testing ────────────────────────────────────────────────────────

  private radius(): number {
    return HANDLE_PX / Math.min(this.canvas.clientWidth / W, this.canvas.clientHeight / H);
  }

  /** Corners and point handles first (nearest wins), then lines, then bodies under p:
   *  characters over sprites over hotspots/exits over walk areas, smallest first. */
  private hitAll(p: Pt): Selection[] {
    const r = this.radius();
    const shapes = this.visibleShapes();
    const d = (a: Pt) => Math.hypot(a[0] - p[0], a[1] - p[1]);
    const near: { sel: Selection; d: number }[] = [];
    const selShape = shapes.find((s) => s.key === this.sel?.key);
    for (const s of selShape ? [selShape, ...shapes] : shapes) {
      s.poly?.forEach((v, i) => d(v) <= r && near.push({ sel: { key: s.key, vertex: i }, d: d(v) - (s === selShape ? r : 0) }));
      if (s.pos && d(s.pos) <= r) near.push({ sel: { key: s.key }, d: d(s.pos) });
    }
    near.sort((a, b) => a.d - b.d);
    const lines = shapes.filter((s) => s.lineY !== undefined && Math.abs(s.lineY - p[1]) <= r).map((s) => ({ key: s.key }));
    const bodies = shapes
      .map((s) => {
        const inPoly = s.poly && pointInPoly(p, s.poly);
        const inBox = s.box && p[0] >= s.box.x && p[0] <= s.box.x + s.box.w && p[1] >= s.box.y && p[1] <= s.box.y + s.box.h;
        const area = inPoly ? polyArea(s.poly!) : inBox ? s.box!.w * s.box!.h : -1;
        return { s, area, rank: BODY_RANK[bodyLayer(s)] };
      })
      .filter((b) => b.area >= 0)
      .sort((a, b) => a.rank - b.rank || a.area - b.area)
      .map((b) => ({ key: b.s.key }));
    return [...near.map((n) => n.sel), ...lines, ...bodies];
  }

  private edgeAt(p: Pt): { shape: Shape; index: number } | null {
    const r = this.radius();
    const shapes = this.visibleShapes().filter((s) => s.poly);
    const selShape = shapes.find((s) => s.key === this.sel?.key);
    for (const s of selShape ? [selShape, ...shapes] : shapes) {
      const poly = s.poly!;
      for (let i = 0; i < poly.length; i++) if (segDist(p, poly[i], poly[(i + 1) % poly.length]) <= r) return { shape: s, index: i + 1 };
    }
    return null;
  }

  // ── input (capture phase, so the game never sees events while editing) ──

  private bind() {
    const c = this.canvas;
    const pos = (e: MouseEvent) => this.toGame(e.clientX, e.clientY);
    const swallow = (e: Event) => {
      e.stopImmediatePropagation();
      e.preventDefault();
    };
    // While a line, card, dialogue choice or the menu is up, clicks go to the game.
    const gameUi = () => !!(this.g.speech || this.g.card || this.g.choice || this.g.menuOpen);
    c.addEventListener("mousedown", (e) => {
      if (!this.active || gameUi()) return;
      swallow(e);
      this.down(pos(e), e);
    }, true);
    c.addEventListener("mousemove", (e) => {
      if (!this.active) return;
      e.stopImmediatePropagation();
      this.move(pos(e));
    }, true);
    addEventListener("mouseup", () => this.up(), true);
    c.addEventListener("dblclick", (e) => {
      if (this.active) this.insertVertex(pos(e));
    }, true);
    c.addEventListener("contextmenu", (e) => this.active && swallow(e), true);
    addEventListener("keydown", (e) => {
      if (e.key === "F2") {
        swallow(e);
        return this.toggle();
      }
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;
      if (!this.active || typing) return;
      if (this.key(e)) swallow(e);
    }, true);
  }

  private down(p: Pt, e: MouseEvent) {
    this.mouse = p;
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey) {
      // Test walk: the hero paths there with the edited walk area.
      if (!this.g.scene.no_hero) void this.g.api.walkTo([Math.round(p[0]), Math.round(p[1])]);
      return;
    }
    const hits = this.hitAll(p);
    this.sel = hits[0] ?? null;
    this.panel.update();
    const shape = this.sel && this.shapes().find((s) => s.key === this.sel!.key);
    if (!shape) return;
    // A walk area's body only selects; drag its corners (or Alt-drag to move it whole).
    if (this.sel!.vertex === undefined && shape.layer === "walkable" && !e.altKey) return;
    const v = this.sel!.vertex;
    const actor = this.actorOf(shape);
    const anim = actor && this.poseFit(actor);
    const fit = e.shiftKey && v === undefined && actor && anim ? { actor, anim } : undefined;
    const orig: Pt = v !== undefined ? [...shape.poly![v]] : fit ? [...(anim!.offset ?? [0, 0])] : [0, 0];
    this.drag = { shape, vertex: v, fit, start: p, orig, applied: [0, 0], snapshot: this.snapshot(), changed: false };
  }

  private move(p: Pt) {
    this.mouse = p;
    const d = this.drag;
    if (!d) {
      this.hover = this.hitAll(p)[0] ?? null;
      return;
    }
    const tx = Math.round(p[0] - d.start[0]);
    const ty = Math.round(p[1] - d.start[1]);
    if (!d.changed && Math.hypot(tx, ty) < 2) return;
    d.changed = true;
    if (d.fit) {
      // Offsets are in sprite pixels at scale 1, mirrored with the sprite.
      const { actor, anim } = d.fit;
      const k = actorScale(actor, this.g.scene);
      const mirrored = actor.facing === "left" && !this.g.content.characters[actor.id]?.anims[`${actor.pose}_l`];
      anim.offset = [Math.round(d.orig[0] + (mirrored ? -tx : tx) / k), Math.round(d.orig[1] + ty / k)];
    } else if (d.vertex !== undefined) {
      const v = d.shape.poly![d.vertex];
      v[0] = d.orig[0] + tx;
      v[1] = d.orig[1] + ty;
    } else {
      d.shape.move(tx - d.applied[0], ty - d.applied[1]);
      d.applied = [tx, ty];
    }
    if (d.shape.walkArea) this.g.walk = new WalkArea(this.g.scene.walkable, this.g.scene.blocked);
    this.panel.update();
  }

  private up() {
    const d = this.drag;
    this.drag = null;
    if (!d?.changed || (d.shape.transient && !d.fit)) return;
    this.commit(d.snapshot);
    this.changed(false);
  }

  private insertVertex(p: Pt) {
    const hit = this.edgeAt(p);
    if (!hit) return;
    this.edit(() => hit.shape.poly!.splice(hit.index, 0, [Math.round(p[0]), Math.round(p[1])]));
    this.sel = { key: hit.shape.key, vertex: hit.index };
    this.panel.update();
  }

  /** Returns true if the editor handled the key. */
  private key(e: KeyboardEvent): boolean {
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key.toLowerCase();
    if (mod && k === "s") return void this.save(), true;
    if (mod && k === "z") return this.undo(e.shiftKey), true;
    if (mod && k === "y") return this.undo(true), true;
    if (e.key === "Delete" || e.key === "Backspace") return this.deleteSelected(), true;
    if (e.key === "Escape" && this.sel) return (this.sel = null), this.panel.update(), true;
    if (e.key === "Tab") {
      // Cycle through everything under the cursor.
      const hits = this.hitAll(this.mouse);
      const i = hits.findIndex((h) => h.key === this.sel?.key && h.vertex === this.sel?.vertex);
      this.sel = hits[(i + 1) % hits.length] ?? null;
      this.panel.update();
      return true;
    }
    const arrows: Record<string, Pt> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const a = arrows[e.key];
    const s = a && this.selected();
    if (a && s) {
      const step = e.shiftKey ? 10 : 1;
      const p = this.selPoint(s);
      if (p) this.setPoint(p[0] + a[0] * step, p[1] + a[1] * step);
      else this.edit(() => s.move(a[0] * step, a[1] * step)); // a whole polygon
      return true;
    }
    return false;
  }

  // ── drawing (after the game's frame, in game coordinates) ──────────────

  draw() {
    if (!this.active || !this.g.scene) return;
    const ctx = this.canvas.getContext("2d")!;
    const k = Math.min(this.canvas.width / W, this.canvas.height / H);
    ctx.save();
    ctx.setTransform(k, 0, 0, k, (this.canvas.width - W * k) / 2, (this.canvas.height - H * k) / 2);
    const px = 1 / Math.min(this.canvas.clientWidth / W, this.canvas.clientHeight / H); // one screen pixel
    const shapes = this.visibleShapes();
    const isSel = (s: Shape) => s.key === this.sel?.key;
    const isHover = (s: Shape) => s.key === this.hover?.key;

    for (const s of shapes) {
      ctx.globalAlpha = s.hidden ? 0.5 : 1;
      if (s.hidden && s.sprite) {
        const im = this.img.get(s.sprite);
        if (im && s.box) {
          ctx.globalAlpha = 0.45;
          ctx.drawImage(im, s.box.x, s.box.y);
          ctx.globalAlpha = 0.5;
        }
      }
      ctx.lineWidth = (isSel(s) ? 3 : isHover(s) ? 2 : 1.25) * px;
      ctx.strokeStyle = isSel(s) ? "#fff" : s.color;
      if (s.poly) {
        path(ctx, s.poly);
        if (s.layer === "walkable" || s.layer === "blocked") {
          ctx.fillStyle = s.layer === "walkable" ? "rgba(40,230,40,0.14)" : "rgba(240,40,40,0.22)";
          ctx.fill();
        }
        ctx.setLineDash(s.hidden ? [6 * px, 4 * px] : []);
        ctx.stroke();
      }
      if (s.box) {
        ctx.setLineDash([5 * px, 4 * px]);
        ctx.strokeRect(s.box.x, s.box.y, s.box.w, s.box.h);
      }
      ctx.setLineDash([]);
      if (s.lineY !== undefined) {
        ctx.setLineDash([12 * px, 6 * px]);
        ctx.beginPath();
        ctx.moveTo(0, s.lineY);
        ctx.lineTo(W, s.lineY);
        ctx.stroke();
        ctx.setLineDash([]);
        label(ctx, `${s.label}  y=${s.lineY}`, 12 * px, s.lineY - 4 * px, s.color, px, "left");
      }
      if (s.pos) this.handle(ctx, s, px);
      if (s.poly) {
        const big = isSel(s) || isHover(s);
        s.poly.forEach((v, i) => {
          const on = isSel(s) && this.sel?.vertex === i;
          const r = (on ? 6 : big ? 4.5 : 3) * px;
          ctx.fillStyle = on ? "#fff" : s.color;
          ctx.fillRect(v[0] - r, v[1] - r, 2 * r, 2 * r);
          ctx.strokeStyle = "#000";
          ctx.lineWidth = px;
          ctx.strokeRect(v[0] - r, v[1] - r, 2 * r, 2 * r);
        });
      }
      const at = s.box ? [s.box.x + s.box.w / 2, s.box.y - 10 * px] : s.poly && !s.pos ? centroid(s.poly) : null;
      if (at && (s.layer !== "walkable" || isSel(s))) label(ctx, s.label, at[0], at[1], isSel(s) ? "#fff" : s.color, px, "center");
    }
    ctx.globalAlpha = 1;

    const hero = this.g.hero();
    if (hero?.path.length) {
      ctx.strokeStyle = "#0ff";
      ctx.lineWidth = 2 * px;
      ctx.beginPath();
      ctx.moveTo(hero.x, hero.y);
      for (const [x, y] of hero.path) ctx.lineTo(x, y);
      ctx.stroke();
    }
    const [mx, my] = this.mouse.map(Math.round);
    label(ctx, `${mx}, ${my}`, mx + 14 * px, my + 22 * px, "#0f0", px, "left");
    ctx.restore();
  }

  private handle(ctx: CanvasRenderingContext2D, s: Shape, px: number) {
    const [x, y] = s.pos!;
    const r = (s.key === this.sel?.key ? 9 : 7) * px;
    ctx.fillStyle = s.key === this.sel?.key ? "#fff" : s.color;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1.5 * px;
    ctx.beginPath();
    if (s.layer === "spawns") {
      // Diamond for spawns.
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();
    } else if (s.layer === "actors") {
      ctx.ellipse(x, y, r * 1.6, r * 0.6, 0, 0, Math.PI * 2); // feet
    } else ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    label(ctx, s.label, x, y + 20 * px, s.key === this.sel?.key ? "#fff" : s.color, px, "center");
  }
}

function path(ctx: CanvasRenderingContext2D, p: Poly) {
  ctx.beginPath();
  p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, px: number, align: CanvasTextAlign) {
  ctx.font = `bold ${13 * px}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = 3 * px;
  ctx.strokeStyle = "rgba(0,0,0,0.9)";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
