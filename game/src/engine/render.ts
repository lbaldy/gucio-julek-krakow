// Canvas2D renderer. Reads the Game; never mutates it.

import type { Images } from "./assets";
import type { Game } from "./game";
import type { CharacterData, PatchData, Poly } from "./types";
import { MENU_FONT, TITLE_FONT } from "./ui/fonts";
import { H, INV_BAR, SKIP_HINT, W, choiceRects, counterIcon, counterLayout, hit, invSlots, menuRects, MENU_ITEMS } from "./ui/layout";
import { clockMarks, clockMinutes, counterValue } from "./clock";
import { EASE, along } from "./motion";
import { actorHeight, actorScale, animShift, centroid, drawables, objectSize, patchKey, xfOf, type Actor, type Prop } from "./world";

const FONT = `"Trebuchet MS", "Segoe UI", sans-serif`;

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private t = 0;
  /** How long the current scene load has been running (ms). */
  private loadingT = 0;
  /** When each patch (by scene and image) last became visible, for its fade-in and drift. */
  private shownAt = new Map<string, number>();

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly g: Game,
    readonly img: Images,
  ) {
    this.ctx = canvas.getContext("2d")!;
  }

  /** Map a client (CSS px) point to game coordinates. */
  toGame(cx: number, cy: number): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    const k = Math.min(r.width / W, r.height / H);
    const ox = (r.width - W * k) / 2;
    const oy = (r.height - H * k) / 2;
    return [(cx - r.left - ox) / k, (cy - r.top - oy) / k];
  }

  draw(dtMs: number) {
    this.t += dtMs;
    const { canvas, ctx, g } = this;
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.round(canvas.clientWidth * dpr);
    const ch = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== cw || canvas.height !== ch) Object.assign(canvas, { width: cw, height: ch });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, cw, ch);
    const k = Math.min(cw / W, ch / H);
    ctx.setTransform(k, 0, 0, k, (cw - W * k) / 2, (ch - H * k) / 2);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();

    if (g.mini) {
      ctx.save();
      g.mini.impl.draw(g.mini.ctx, ctx);
      ctx.restore();
      this.subtitle();
      this.skipHint();
    } else if (g.scene) {
      this.background();
      const shown = new Set<string>();
      for (const d of drawables(g.scene, g.state, g.actors, this.img.size, g.props)) {
        if (d.kind === "actor") this.actor(d.actor);
        else if (d.kind === "object") {
          const size = objectSize(d.obj, this.img.size);
          this.moved(d.obj.id, { ...d.obj, ...size }, () => this.image(d.obj.sprite, d.obj.x, d.obj.y, size, d.obj.id));
        } else if (d.kind === "patch") {
          const size = this.img.size(d.patch.image);
          const box = { x: d.patch.x, y: d.patch.y, w: d.patch.w ?? size?.w ?? 120, h: d.patch.h ?? size?.h ?? 120 };
          this.moved(patchKey(d.patch), box, () => shown.add(this.patch(d.patch)));
        } else {
          const size = this.img.size(d.image);
          this.moved(d.id, { x: d.x, y: d.y, w: size?.w ?? 120, h: size?.h ?? 120 }, () => this.image(d.image, d.x, d.y, null, ""));
        }
      }
      for (const k of this.shownAt.keys()) if (!shown.has(k)) this.shownAt.delete(k);
      if (g.debug) this.debugOverlay();
      this.subtitle();
      this.skipHint();
      this.hoverLabel();
      this.inventory();
      this.clock(dtMs);
      this.counter(dtMs);
      this.flights();
      this.choices();
    }
    if (g.fade > 0) {
      ctx.fillStyle = `rgba(0,0,0,${g.fade})`;
      ctx.fillRect(0, 0, W, H);
    }
    this.loadingT = g.loading ? this.loadingT + dtMs : 0;
    this.spinner();
    this.cardOverlay();
    this.menu();
    this.cursorItem();
    ctx.restore();
    this.cursor();
  }

  /**
   * The mouse cursor tells a pre-reader what's clickable: a glowing star over anything they can use,
   * an arrow over exits (pointing the way out), a hand over buttons, the plain arrow elsewhere.
   */
  private cursorMode = "";
  private cursor() {
    const { g } = this;
    const p = g.pointer;
    let mode = "default";
    if (g.menuOpen) mode = menuRects().some((r) => hit(r, p)) ? "button" : "default";
    else if (g.card || g.loading) mode = "default";
    else if (g.choice && !g.speech) mode = choiceRects(g.choice.options.length).some((r) => hit(r, p)) ? "button" : "default";
    else if (g.inventoryOpen() && hit(INV_BAR, p)) {
      mode = invSlots(g.state.inventory.length).some((r) => hit(r, p)) ? "button" : "default";
    } else if (g.skipHintShown() && hit(SKIP_HINT, p)) mode = "button";
    else if (g.scene && !g.busy) {
      const t = g.targetAt(p);
      if (t?.kind === "exit") mode = centroid(t.poly)[0] < W / 2 ? "exit_left" : "exit_right";
      else if (t) mode = g.selectedItem ? "use_item" : "use";
    }
    // Holding an item: the item icon itself is the cursor (drawn by cursorItem), so hide the system one.
    if (g.selectedItem && !g.menuOpen && !g.card && !(g.choice && !g.speech)) mode = "none";
    if (mode === this.cursorMode) return;
    this.cursorMode = mode;
    this.ctx.canvas.style.cursor = CURSORS[mode] ?? "default";
  }

  /** Three pulsing dots in the corner while a scene's art loads; hidden for quick loads. */
  private spinner() {
    if (this.loadingT < 300) return;
    const { ctx } = this;
    const appear = Math.min(1, (this.loadingT - 300) / 300);
    for (let i = 0; i < 3; i++) {
      const pulse = 0.5 + 0.5 * Math.sin(this.t / 180 - i * 0.9);
      ctx.fillStyle = `rgba(232,220,190,${appear * (0.25 + 0.75 * pulse)})`;
      ctx.beginPath();
      ctx.arc(W - 150 + i * 40, H - 70, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── scene ──────────────────────────────────────────────────────────────

  private background() {
    const { ctx, g } = this;
    const bg = this.img.get(g.scene.background);
    if (bg) return ctx.drawImage(bg, 0, 0, W, H);
    // Greybox: draw the scene's geometry so it's playable without art.
    ctx.fillStyle = "#3a3a3e";
    ctx.fillRect(0, 0, W, H);
    for (const p of g.scene.walkable) this.poly(p, "#4c4c50", null);
    for (const p of g.scene.blocked ?? []) this.poly(p, "#333336", null);
    for (const h of g.scene.hotspots ?? []) {
      this.poly(h.polygon, "rgba(160,150,120,0.35)", "#a89f80");
      this.label(h.name, ...centroid(h.polygon), "#d8d0b0", 22);
    }
    for (const e of g.scene.exits ?? []) {
      this.poly(e.polygon, "rgba(80,120,200,0.3)", "#6a8ad0");
      this.label(`→ ${e.name}`, ...centroid(e.polygon), "#a8c0f0", 22);
    }
    this.label(`[greybox] ${g.scene.id}`, W - 200, H - 24, "#888", 20);
  }

  private image(path: string, x: number, y: number, size: { w: number; h: number } | null, label: string) {
    const im = this.img.get(path);
    if (im) return this.ctx.drawImage(im, x, y);
    if (!size || !label) return;
    this.ctx.fillStyle = "rgba(200,120,60,0.6)";
    this.ctx.fillRect(x, y, size.w, size.h);
    this.label(label, x + size.w / 2, y + size.h / 2, "#fff", 18);
  }

  /** Draws something with whatever scripts have done to it (g.move, g.motion). */
  private moved(id: string | undefined, box: { x: number; y: number; w: number; h: number }, draw: () => void) {
    const p: Prop | undefined = id ? this.g.props.get(id) : undefined;
    if (!p) return draw();
    const { ctx } = this;
    const xf = xfOf(p);
    const [cx, by] = [box.x + box.w / 2, box.y + box.h];
    ctx.save();
    ctx.globalAlpha *= p.alpha;
    ctx.translate(cx + p.dx + xf.fwd * box.h, by + p.dy - p.lift - xf.up * box.h);
    ctx.rotate(xf.rot);
    ctx.scale(xf.sx * p.scale, xf.sy * p.scale);
    if (p.rot) {
      // A spin turns about the middle; motions pivot at the bottom.
      ctx.translate(0, -box.h / 2);
      ctx.rotate(p.rot);
      ctx.translate(0, box.h / 2);
    }
    ctx.translate(-cx, -by);
    draw();
    ctx.restore();
  }

  /** Items on their way to the inventory, the counter or a spot in the scene. */
  private flights() {
    const { ctx, g } = this;
    for (const f of g.flights) {
      const im = this.img.get(f.image);
      if (!im) continue;
      const p = f.t / f.ms;
      const u = EASE.both(p);
      const [x, y] = along(f.from, f.to, u);
      const s = f.size[0] + (f.size[1] - f.size[0]) * u;
      const k = s / Math.max(im.naturalWidth, im.naturalHeight);
      ctx.drawImage(im, x - (im.naturalWidth * k) / 2, y - 60 * 4 * p * (1 - p) - (im.naturalHeight * k) / 2, im.naturalWidth * k, im.naturalHeight * k);
    }
  }

  /** Draws a patch with its fade-in and drift, timed from when it became visible; returns its key. */
  private patch(p: PatchData): string {
    const { ctx, g } = this;
    const key = `${g.scene.id}/${p.image}`;
    const im = this.img.get(p.image);
    if (!im || (!p.fade_in_ms && !p.drift)) {
      this.image(p.image, p.x, p.y, { w: p.w ?? 120, h: p.h ?? 120 }, p.id ?? "");
      return key;
    }
    if (!this.shownAt.has(key)) this.shownAt.set(key, this.t);
    const age = this.t - this.shownAt.get(key)!;
    const w = p.w ?? im.naturalWidth;
    const h = p.h ?? im.naturalHeight;
    ctx.save();
    if (p.fade_in_ms) ctx.globalAlpha = Math.min(1, age / p.fade_in_ms);
    if (p.drift) {
      const { from, to, ms } = p.drift;
      const u = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, age / ms)); // ease in and out
      const [zoom, fx, fy] = from.map((v, i) => v + (to[i] - v) * u);
      const z = Math.max(1, zoom);
      const sw = im.naturalWidth / z;
      const sh = im.naturalHeight / z;
      const sx = Math.max(0, Math.min(im.naturalWidth - sw, fx * im.naturalWidth - sw / 2));
      const sy = Math.max(0, Math.min(im.naturalHeight - sh, fy * im.naturalHeight - sh / 2));
      ctx.drawImage(im, sx, sy, sw, sh, p.x, p.y, w, h);
    } else ctx.drawImage(im, p.x, p.y, w, h);
    ctx.restore();
    return key;
  }

  private animName(a: Actor, ch: CharacterData | undefined): { name: string; frame: number } {
    const g = this.g;
    const has = (n: string) => !!ch?.anims[`${n}_r`];
    const cycle = (n: string, t: number) => Math.floor((t / 1000) * (ch?.anims[`${n}_r`]?.fps ?? 8)) % (ch?.anims[`${n}_r`]?.frames ?? 1);
    const at = a.anim ? a.anim.ms - a.anim.t : 0;
    if (a.anim && has(a.anim.name) && at >= a.anim.show[0] && at <= a.anim.show[1]) {
      // One-shots play from their first frame and hold the last.
      const d = ch!.anims[`${a.anim.name}_r`];
      return { name: a.anim.name, frame: Math.min(d.frames - 1, Math.floor((at / 1000) * d.fps)) };
    }
    if (a.tween) {
      // A scripted move shows its pose; a leap crouches and lands in the standing drawing.
      const { o, t, ms } = a.tween;
      const air = !o.leap || (t > ms * 0.18 && t < ms * 0.84);
      if (o.pose && air && has(o.pose)) return { name: o.pose, frame: cycle(o.pose, t) };
    }
    if (a.path.length && a.running && has("run")) return { name: "run", frame: cycle("run", a.walkT) };
    // Walking beats a held pose, so a posed companion doesn't slide along on a still frame.
    if (a.path.length && has("walk")) return { name: "walk", frame: cycle("walk", a.walkT) };
    const pose = g.poseOf(a);
    // Talking: the pose's own talk frames (`dim_talk`) if it has them, else plain `talk` when not posed.
    const talk = pose ? `${pose}_talk` : "talk";
    if (a.talking && has(talk)) {
      const v = g.speech?.voice;
      const frames = ch!.anims[`${talk}_r`].frames;
      if (v) {
        const lvl = v.level();
        return { name: talk, frame: Math.min(frames - 1, lvl > 0.3 ? 2 : lvl > 0.08 ? 1 : 0) };
      }
      return { name: talk, frame: cycle(talk, this.t) };
    }
    if (pose && has(pose)) return { name: pose, frame: 0 };
    return { name: "idle", frame: 0 };
  }

  private actor(a: Actor) {
    const { ctx, g } = this;
    const ch = g.content.characters[a.id];
    const k = actorScale(a, g.scene);
    const { name, frame } = this.animName(a, ch);
    const mirrored = a.facing === "left" && !ch?.anims[`${name}_l`];
    const dir = a.facing === "left" && !mirrored ? "l" : "r";
    const im = this.img.get(`chars/${a.look ?? a.id}/${name}_${dir}/${String(frame).padStart(2, "0")}.png`);
    // Fake walk when there's no walk cycle: bob and sway.
    const fakeWalk = a.path.length > 0 && name !== "walk" && !ch?.float_px;
    const hover = ch?.float_px ? -(ch.float_px + Math.sin(this.t / 420) * 12) * k : 0;
    const bob = (fakeWalk ? -Math.abs(Math.sin(a.walkT / 110)) * 10 * k : 0) + hover;
    const xf = xfOf(a);
    const unit = actorHeight(a, ch) * k;
    const side = a.facing === "left" ? -1 : 1;
    const x = a.x + animShift(a) + side * xf.fwd * unit;
    const lift = a.lift + xf.up * unit;
    ctx.save();
    ctx.globalAlpha *= a.alpha;
    if (a.fixedScale === undefined) {
      // Contact shadow keeps feet planted on the floor; it stays there, smaller, while they're in the air.
      const w = unit * 0.2 * (1 - Math.min(0.45, (lift / unit) * 0.8));
      ctx.fillStyle = "rgba(20,16,10,0.32)";
      ctx.beginPath();
      ctx.ellipse(x, a.y - 2, w, w * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.translate(x, a.y + bob - lift);
    ctx.rotate(xf.rot * side);
    ctx.scale(xf.sx, xf.sy);
    if (fakeWalk) ctx.rotate(Math.sin(a.walkT / 110) * 0.03);
    if (mirrored) ctx.scale(-1, 1);
    if (ch?.glow && !g.poseOf(a)) {
      // A soft light around a glowing character (a fairy); a pose (e.g. "dim") switches it off.
      const h = actorHeight(a, ch) * k;
      const grad = ctx.createRadialGradient(0, -h * 0.5, 0, 0, -h * 0.5, h * 1.1);
      grad.addColorStop(0, ch.glow);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.75 + Math.sin(this.t / 300) * 0.15;
      ctx.fillStyle = grad;
      ctx.fillRect(-h * 1.1, -h * 1.6, h * 2.2, h * 2.2);
      ctx.restore();
    }
    const fit = ch?.anims[`${name}_r`];
    if (fit?.offset) ctx.translate(fit.offset[0] * k, fit.offset[1] * k);
    if (im) {
      const h = im.naturalHeight * k * (fit?.scale ?? 1);
      const w = im.naturalWidth * k * (fit?.scale ?? 1);
      ctx.drawImage(im, -w / 2, -h, w, h);
    } else {
      const h = actorHeight(a, ch) * k;
      const w = h * 0.32;
      ctx.fillStyle = a.id === g.heroId ? "#5f7a9a" : "#8a6f5a";
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h, w, h, w / 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(w * 0.22, -h + w * 0.45, w * 0.08, 0, Math.PI * 2); // eye shows facing
      ctx.fill();
    }
    ctx.restore();
    if (!im) {
      const h = actorHeight(a, ch) * k - hover;
      const tag = [g.poseOf(a) ?? a.anim?.name, a.talking ? "talk" : null].filter(Boolean).join(" ");
      this.label(`${ch?.name ?? a.id}${tag ? ` (${tag})` : ""}`, a.x, a.y - h - 16, "#fff", 18);
    }
  }

  // ── overlays ───────────────────────────────────────────────────────────

  private subtitle() {
    const { g } = this;
    const s = g.speech;
    if (!s) return;
    const color = g.content.characters[s.speaker]?.text_color ?? "#ffffff";
    const a = g.actors.find((x) => x.id === s.speaker);
    let x = W / 2;
    let y = H - 110;
    if (a) {
      const k = actorScale(a, g.scene);
      const ch = g.content.characters[a.id];
      x = Math.max(480, Math.min(W - 480, a.x));
      y = Math.max(140, a.y - (actorHeight(a, ch) + (ch?.float_px ?? 0)) * k - 40);
    }
    this.wrapped(s.text, x, y, 880, color, 40, "bottom");
  }

  private skipHint() {
    const { ctx, g } = this;
    const text = g.content.config.ui.skip;
    if (!g.skipHintShown() || !text) return;
    const r = SKIP_HINT;
    const over = hit(r, g.pointer);
    ctx.font = `bold 26px ${MENU_FONT}`;
    ctx.letterSpacing = "3px";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(0,0,0,0.75)";
    ctx.strokeText(text.toUpperCase(), r.x + r.w - 12, r.y + r.h / 2);
    ctx.fillStyle = over ? "#d4a94e" : "rgba(232,220,192,0.8)";
    ctx.fillText(text.toUpperCase(), r.x + r.w - 12, r.y + r.h / 2);
    ctx.letterSpacing = "0px";
  }

  private hoverLabel() {
    const { g } = this;
    if (g.busy || g.choice || g.menuOpen || g.card || g.inventoryOpen()) return;
    const t = g.targetAt(g.pointer);
    if (!t) return;
    const item = g.selectedItem ? g.content.items[g.selectedItem]?.name : null;
    const text = item ? `${item} → ${t.name}` : t.name;
    this.label(text, g.pointer[0], g.pointer[1] - (item ? 72 : 36), "#fff", 30);
  }

  private inventory() {
    const { ctx, g } = this;
    // The bar also shows while something flies into it.
    if (!g.inventoryOpen() && !g.flights.some((f) => f.slot)) return;
    ctx.fillStyle = "rgba(20,18,16,0.85)";
    ctx.fillRect(INV_BAR.x, INV_BAR.y, INV_BAR.w, INV_BAR.h);
    const slots = invSlots(g.state.inventory.length);
    g.state.inventory.forEach((id, i) => {
      const r = slots[i];
      ctx.fillStyle = g.selectedItem === id ? "rgba(255,210,120,0.35)" : "rgba(255,255,255,0.08)";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      const item = g.content.items[id];
      const im = item && this.img.get(item.icon);
      if (g.flights.some((f) => f.slot === id)) return; // still on its way
      if (im) ctx.drawImage(im, r.x + 4, r.y + 4, r.w - 8, r.h - 8);
      else this.wrapped(item?.name ?? id, r.x + r.w / 2, r.y + r.h / 2 + 10, r.w - 8, "#ddd", 16, "middle");
    });
    const hover = slots.findIndex((r) => g.pointer[0] >= r.x && g.pointer[0] < r.x + r.w && g.pointer[1] < r.y + r.h);
    if (hover >= 0) {
      const id = g.state.inventory[hover];
      const name = g.content.items[id]?.name ?? id;
      const sel = g.selectedItem && g.selectedItem !== id ? `${g.content.items[g.selectedItem]?.name} + ${name}` : name;
      this.label(sel, slots[hover].x + slots[hover].w / 2, INV_BAR.h + 26, "#fff", 26);
    }
  }

  /** Displayed clock time in minutes; it spins forward to the story time, and snaps on loads. */
  private clockShown: number | null = null;
  private clock(dtMs: number) {
    const { ctx, g } = this;
    const goal = g.scene.no_hero ? null : clockMinutes(g.content.config, g.state);
    if (goal === null) return;
    if (this.clockShown === null || goal < this.clockShown) this.clockShown = goal;
    else this.clockShown = Math.min(goal, this.clockShown + (dtMs / 1000) * 240);
    const min = this.clockShown;
    const hour = min / 60;
    const night = hour < 6 || hour >= 18;
    const [x, y, r] = [W - 84, 66, 54];
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = night ? "#c9cfe6" : "#f1e6cf";
    ctx.strokeStyle = "#5a3f2b";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // hour marks; collectibles light them gold, clockwise from one o'clock
    const lit = clockMarks(g.content.config, g.state);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const on = ((i + 11) % 12) < lit;
      ctx.fillStyle = on ? "#e0a020" : "#5a3f2b";
      ctx.beginPath();
      ctx.arc(Math.sin(a) * (r - 12), -Math.cos(a) * (r - 12), on ? 6 : i % 3 === 0 ? 4.5 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // sun by day, moon by night: a time of day a pre-reader can read
    ctx.fillStyle = night ? "#f4e7a1" : "#f2c14e";
    ctx.beginPath();
    ctx.arc(0, 24, 10, 0, Math.PI * 2);
    ctx.fill();
    if (night) {
      ctx.fillStyle = "#c9cfe6";
      ctx.beginPath();
      ctx.arc(5, 21, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    const hand = (a: number, len: number, w: number) => {
      ctx.lineWidth = w;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.sin(a) * len, -Math.cos(a) * len);
      ctx.stroke();
    };
    hand(((hour % 12) / 12) * Math.PI * 2, r * 0.5, 7);
    hand(((min % 60) / 60) * Math.PI * 2, r * 0.78, 4);
    ctx.restore();
  }

  /** The collectible counter: an icon and `total` pips; a new find pops the icon. Hidden in no-hero scenes. */
  private counterShown = -1;
  private counterPop = 0;
  private counter(dtMs: number) {
    const { ctx, g } = this;
    const cfg = g.content.config.counter;
    if (!cfg || g.scene.no_hero) return;
    const n = counterValue(g.content.config, g.state);
    if (this.counterShown >= 0 && n > this.counterShown) this.counterPop = 600;
    this.counterShown = n;
    this.counterPop = Math.max(0, this.counterPop - dtMs);
    const { x0, y0, pip, gap, perRow, pipsW } = counterLayout(g.content.config);
    const s = 1 + (this.counterPop / 600) * 0.35;
    ctx.save();
    ctx.fillStyle = "rgba(241,230,207,0.82)";
    ctx.strokeStyle = "#5a3f2b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x0 - 96, y0 - 14, pipsW + 112, 70, 20);
    ctx.fill();
    ctx.stroke();
    // icon
    ctx.translate(...counterIcon(g.content.config));
    ctx.scale(s, s);
    const im = cfg.icon ? this.img.get(cfg.icon) : null;
    if (im) ctx.drawImage(im, -30, -30, 60, 60);
    else {
      ctx.rotate(-0.6);
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#5a3f2b";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 27, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.lineTo(0, 30);
      ctx.stroke();
    }
    ctx.restore();
    // pips, two rows
    for (let i = 0; i < cfg.total; i++) {
      const cx = x0 + (i % perRow) * (pip + gap) + pip / 2;
      const cy = y0 + (i < perRow ? 6 : 36);
      ctx.fillStyle = i < n ? "#e0a020" : "rgba(90,63,43,0.25)";
      ctx.beginPath();
      ctx.arc(cx, cy, i < n ? pip / 2 + 1 : pip / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private choices() {
    const { ctx, g } = this;
    if (!g.choice || g.speech) return;
    const rects = choiceRects(g.choice.options.length);
    ctx.fillStyle = "rgba(10,10,12,0.85)";
    ctx.fillRect(0, rects[0].y - 16, W, H - rects[0].y + 16);
    g.choice.options.forEach((o, i) => {
      const r = rects[i];
      const over = i === g.choiceHover;
      ctx.font = `${over ? "bold " : ""}32px ${FONT}`;
      ctx.fillStyle = over ? "#ffd27f" : "#e8e2d4";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`${i + 1}. ${o.text}`, r.x, r.y + r.h / 2);
    });
  }

  private cardOverlay() {
    const { ctx, g } = this;
    if (!g.card) return;
    if (g.card.over) {
      // The end title: a soft dark band at the bottom of the last picture, big warm-gold letters.
      const band = ctx.createLinearGradient(0, H * 0.55, 0, H);
      band.addColorStop(0, "rgba(10,8,6,0)");
      band.addColorStop(1, "rgba(10,8,6,0.72)");
      ctx.fillStyle = band;
      ctx.fillRect(0, H * 0.55, W, H * 0.45);
      ctx.font = `${Math.round(H * 0.12)}px ${TITLE_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "rgba(20,14,8,0.8)";
      ctx.fillText(g.card.text, W / 2 + 5, H * 0.88 + 5);
      ctx.fillStyle = "#ffd77a";
      ctx.fillText(g.card.text, W / 2, H * 0.88);
      return;
    }
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    this.wrapped(g.card.text, W / 2, H / 2, 1200, "#e8e2d4", 48, "middle");
  }

  // Matches the DOM title menu (ui/screens.ts): ink strips, typewriter caps, ochre on hover.
  private menu() {
    const { ctx, g } = this;
    if (!g.menuOpen) return;
    ctx.fillStyle = "rgba(0,0,0,0.78)";
    ctx.fillRect(0, 0, W, H);
    const rects = menuRects();
    ctx.font = `${Math.round(H * 0.085)}px ${TITLE_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#2a241c";
    ctx.fillText(g.content.config.title.toUpperCase(), W / 2 + 4, rects[0].y - 56 + 4);
    ctx.fillStyle = "#e8dcc0";
    ctx.fillText(g.content.config.title.toUpperCase(), W / 2, rects[0].y - 56);
    rects.forEach((r, i) => {
      const over = g.pointer[0] >= r.x && g.pointer[0] < r.x + r.w && g.pointer[1] >= r.y && g.pointer[1] < r.y + r.h;
      const strip = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
      strip.addColorStop(0, "rgba(16,13,10,0)");
      strip.addColorStop(0.18, "rgba(16,13,10,0.85)");
      strip.addColorStop(0.82, "rgba(16,13,10,0.85)");
      strip.addColorStop(1, "rgba(16,13,10,0)");
      ctx.fillStyle = strip;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = over ? "rgba(212,169,78,0.6)" : "rgba(212,169,78,0.18)";
      ctx.fillRect(r.x, r.y, r.w, 1);
      ctx.fillRect(r.x, r.y + r.h - 1, r.w, 1);
      const text = (g.content.config.ui[MENU_ITEMS[i]] ?? MENU_ITEMS[i]).toUpperCase();
      ctx.font = `bold 31px ${MENU_FONT}`;
      ctx.letterSpacing = over ? "6px" : "4px";
      ctx.textBaseline = "middle";
      ctx.fillStyle = over ? "#d4a94e" : "#e8dcc0";
      ctx.fillText(text, r.x + r.w / 2, r.y + r.h / 2 + 2);
      ctx.letterSpacing = "0px";
    });
  }

  private cursorItem() {
    const { ctx, g } = this;
    if (!g.selectedItem) return;
    const item = g.content.items[g.selectedItem];
    const im = item && this.img.get(item.icon);
    const [x, y] = g.pointer;
    // The held item is the cursor: centred on the pointer, glowing when it's over something it can be used on.
    const over = !!g.scene && !g.busy && !g.menuOpen && !g.card && !(g.inventoryOpen() && hit(INV_BAR, g.pointer)) && !!g.targetAt(g.pointer);
    if (over) {
      const pulse = 0.75 + 0.25 * Math.sin(this.t / 160);
      const glow = ctx.createRadialGradient(x, y, 10, x, y, 66);
      glow.addColorStop(0, `rgba(255,214,90,${0.75 * pulse})`);
      glow.addColorStop(1, "rgba(255,214,90,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 66, 0, Math.PI * 2);
      ctx.fill();
    }
    const s = over ? 92 : 80;
    if (im) ctx.drawImage(im, x - s / 2, y - s / 2, s, s);
    else this.label(item?.name ?? g.selectedItem, x, y, "#ffd27f", 22);
  }

  private debugOverlay() {
    const { ctx, g } = this;
    for (const p of g.scene.walkable) this.poly(p, "rgba(0,220,0,0.15)", "#0d0");
    for (const p of g.scene.blocked ?? []) this.poly(p, "rgba(220,0,0,0.2)", "#d00");
    for (const t of g.targets()) {
      this.poly(t.poly, null, t.kind === "exit" ? "#6af" : t.kind === "actor" ? "#f6f" : "#fd0");
      this.label(t.id, ...centroid(t.poly), "#fd0", 18);
      if (t.walk_to) {
        ctx.strokeStyle = "#fd0";
        ctx.beginPath();
        ctx.arc(t.walk_to[0], t.walk_to[1], 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    const h = g.hero();
    if (h?.path.length) {
      ctx.strokeStyle = "#0ff";
      ctx.beginPath();
      ctx.moveTo(h.x, h.y);
      for (const [x, y] of h.path) ctx.lineTo(x, y);
      ctx.stroke();
    }
    this.label(`${Math.round(g.pointer[0])}, ${Math.round(g.pointer[1])}`, 90, H - 24, "#0f0", 22);
  }

  // ── primitives ─────────────────────────────────────────────────────────

  private poly(p: Poly, fill: string | null, stroke: string | null) {
    const { ctx } = this;
    if (p.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(p[0][0], p[0][1]);
    for (const [x, y] of p.slice(1)) ctx.lineTo(x, y);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  private label(text: string, x: number, y: number, color: string, size: number) {
    const { ctx } = this;
    ctx.font = `bold ${size}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(3, size / 6);
    ctx.strokeStyle = "rgba(0,0,0,0.9)";
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  private wrapped(text: string, x: number, y: number, maxW: number, color: string, size: number, anchor: "bottom" | "middle") {
    const { ctx } = this;
    ctx.font = `bold ${size}px ${FONT}`;
    const lines: string[] = [];
    let cur = "";
    for (const word of text.split(/\s+/)) {
      const next = cur ? `${cur} ${word}` : word;
      if (ctx.measureText(next).width > maxW && cur) {
        lines.push(cur);
        cur = word;
      } else cur = next;
    }
    if (cur) lines.push(cur);
    const lh = size * 1.2;
    const top = anchor === "bottom" ? y - lines.length * lh : y - (lines.length * lh) / 2;
    lines.forEach((l, i) => this.label(l, x, top + lh * (i + 0.5), color, size));
  }
}

// Cursors as inline SVG (large, for small hands and eyes). The numbers after the URL are the hotspot.
const svg = (body: string, x: number, y: number, fallback: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'>${body}</svg>`)}") ${x} ${y}, ${fallback}`;
const STAR = "M24 3l6.2 13.1 14.3 1.8-10.5 9.9 2.7 14.2L24 35l-12.7 7 2.7-14.2L3.5 17.9l14.3-1.8z";
const CURSORS: Record<string, string> = {
  default: "default",
  none: "none",
  button: "pointer",
  use: svg(`<circle cx='24' cy='24' r='22' fill='#ffe9a8' opacity='0.45'/><path d='${STAR}' fill='#ffd24a' stroke='#6b3f1d' stroke-width='2.5' stroke-linejoin='round'/>`, 24, 24, "pointer"),
  use_item: svg(`<path d='${STAR}' fill='#ffd24a' opacity='0.55' stroke='#6b3f1d' stroke-width='2' stroke-linejoin='round'/>`, 24, 24, "pointer"),
  exit_right: svg(`<path d='M6 17h20V7l18 17-18 17V31H6z' fill='#ffd24a' stroke='#6b3f1d' stroke-width='2.5' stroke-linejoin='round'/>`, 40, 24, "e-resize"),
  exit_left: svg(`<path d='M42 17H22V7L4 24l18 17V31h20z' fill='#ffd24a' stroke='#6b3f1d' stroke-width='2.5' stroke-linejoin='round'/>`, 8, 24, "w-resize"),
};
