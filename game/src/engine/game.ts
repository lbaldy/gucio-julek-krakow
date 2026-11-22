// The game: state + current scene + script runtime. No DOM; adapters do I/O.

import type { Combos, DialogueDef, GameAPI, Globals, Handler, ItemLooks, MiniGame, MiniGameCtx, SceneScript, TargetHandlers } from "./api";
import { evalCond } from "./cond";
import { runDialogue } from "./dialogue";
import { WalkArea } from "./path";
import { deserialize, hiddenKey, newState, serialize, type State } from "./state";
import type { CharacterData, Facing, GameConfig, ItemData, LineData, Pt, SceneData } from "./types";
import { INV_BAR, INV_REVEAL_Y, SKIP_HINT, choiceRects, hit, invSlots, menuRects, MENU_ITEMS } from "./ui/layout";
import type { CompanionConfig } from "./types";
import { actorScale, centroid, targetAt, targets, type Actor, type SizeOf, type Target } from "./world";

export interface Content {
  config: GameConfig;
  characters: Record<string, CharacterData>;
  items: Record<string, ItemData>;
  lines: Record<string, LineData>;
  scenes: Record<string, SceneData>;
  scripts: Record<string, SceneScript>;
  dialogues: Record<string, DialogueDef>;
  combos: Combos;
  itemLooks: ItemLooks;
  globals: Globals;
  minigames: Record<string, MiniGame>;
}

export type GameEvent =
  | { t: "say"; id: string; speaker: string; text: string }
  | { t: "act"; verb: string; target: string; item?: string }
  | { t: "scene"; id: string; spawn: string }
  | { t: "item"; op: "give" | "drop"; item: string }
  | { t: "flag"; name: string; value: boolean }
  | { t: "error"; message: string };

export interface VoiceHandle {
  done: Promise<void>;
  level(): number;
  stop(): void;
}

export interface Adapters {
  sizeOf: SizeOf;
  audio: {
    music(path: string | null): void;
    ambience(path: string | null): void;
    sfx(path: string): void;
    voice(lineId: string): Promise<VoiceHandle | null>;
  };
  storage: { get(key: string): string | null; set(key: string, value: string): void };
  log(e: GameEvent): void;
  /** Shows the options screen over the menu (browser only; headless has none). */
  options?(): void;
  /** Loads a scene's assets; the game waits on it behind a black screen. */
  prepare?(scene: string): Promise<void>;
  /** Image access for mini-games (browser only). */
  images?: { load(paths: string[]): Promise<void>; get(path: string): HTMLImageElement | null };
}

export type Verb = "look" | "use" | "talk" | "go";

interface Speech {
  lineId: string;
  speaker: string;
  text: string;
  remaining: number;
  voice: VoiceHandle | null;
  finish: () => void;
}

/** How the hero gets to a click: walk, run (double-click), or jump straight there (double-click on an exit). */
type Approach = "walk" | "run" | "jump";

const SPEED = 380;
/** A mini-game can be skipped (skip hint / Esc) after this long. */
const MINIGAME_SKIP_MS = 10_000;
/** A companion starts following once it's this far from its spot behind the hero. */
const FOLLOW_SLACK = 90;
/** Speed and walk-cycle multiplier for a double-click walk. */
const RUN = 2;

export class Game {
  state: State;
  scene!: SceneData;
  walk!: WalkArea;
  actors: Actor[] = [];
  speech: Speech | null = null;
  choice: { options: { lineId: string; text: string }[]; pick: (i: number) => void } | null = null;
  /** The dialogue option being read aloud (hovered with a mouse, or tapped once on touch); -1 for none. */
  choiceHover = -1;
  private hoverVoice: { token: number; voice: VoiceHandle | null } = { token: 0, voice: null };
  /** A full-screen text card; `over` draws it as a title over the scene (the end card on its last picture). */
  card: { text: string; finish: (() => void) | null; over?: boolean } | null = null;
  fade = 1;
  /** A scene's assets are loading: the screen stays black and input is ignored. */
  loading = false;
  busy = false;
  skipping = false;
  selectedItem: string | null = null;
  pointer: Pt = [-1, -1];
  menuOpen = false;
  debug = false;
  events: GameEvent[] = [];
  lastError: Error | null = null;
  readonly api: GameAPI;

  /** Cutscenes running; the outermost one ends any skip. */
  cutsceneDepth = 0;
  /** The running mini-game, if any: it owns update, drawing and input. */
  mini: { impl: MiniGame; ctx: MiniGameCtx } | null = null;
  /** Time since the last progress (new flag or item), for idle hints. */
  idleMs = 0;
  private timers: { t: number; done: () => void }[] = [];
  private fadeGoal: { to: number; done: () => void } | null = null;
  private failIdx: Record<string, number> = {};
  private pending = 0;

  constructor(
    readonly content: Content,
    readonly io: Adapters,
    readonly fast = false,
  ) {
    this.state = newState(content.config.start_scene);
    this.api = this.makeApi();
  }

  // ── lifecycle ───────────────────────────────────────────────────────────

  get heroId() {
    return this.content.config.hero;
  }

  hero(): Actor {
    return this.actors.find((a) => a.id === this.heroId)!;
  }

  /** No scene given: the configured intro plays first (its script then goes to start_scene). */
  async newGame(scene?: string, spawn?: string, setup?: (s: State) => void): Promise<void> {
    this.state = newState(scene ?? this.content.config.intro_scene ?? this.content.config.start_scene);
    this.state.inventory = [...(this.content.config.start_inventory ?? [])];
    setup?.(this.state); // dev/test starting state, applied before the first scene's enter() runs
    this.card = null;
    this.menuOpen = false;
    this.fade = 1;
    // start_spawn belongs to start_scene; a jump to any other scene uses its default spawn.
    const startSpawn = this.state.scene === this.content.config.start_scene ? this.content.config.start_spawn : undefined;
    await this.run(() => this.api.goto(this.state.scene, spawn ?? startSpawn ?? "default"));
  }

  save(slot: string) {
    this.syncHero();
    this.io.storage.set(`save:${slot}`, serialize(this.state));
  }

  hasSave(slot: string): boolean {
    return this.io.storage.get(`save:${slot}`) !== null;
  }

  /** Restores a slot. A save the current content can't place (renamed scene or spawn) is ignored. */
  load(slot: string): boolean {
    const raw = this.io.storage.get(`save:${slot}`);
    if (!raw) return false;
    let state: State;
    try {
      state = deserialize(raw);
      if (!this.content.scenes[state.scene]) throw new Error(`save points at unknown scene ${state.scene}`);
    } catch (e) {
      console.warn(`[save] ignoring slot ${slot}:`, e);
      return false;
    }
    this.state = state;
    this.selectedItem = null;
    this.card = null;
    this.menuOpen = false;
    const loops = { music: state.music, ambience: state.ambience };
    this.enterScene(this.state.scene, null);
    if (loops.music !== undefined) this.setLoop("music", loops.music);
    if (loops.ambience !== undefined) this.setLoop("ambience", loops.ambience);
    const h = this.hero();
    Object.assign(h, { x: this.state.hero.x, y: this.state.hero.y, facing: this.state.hero.facing });
    this.placeCompanions(true);
    this.fade = 1;
    this.pending++;
    void this.prepare(state.scene).then(() => {
      this.pending--;
      this.fade = 0;
    });
    return true;
  }

  private syncHero() {
    const h = this.hero();
    if (h) this.state.hero = { x: h.x, y: h.y, facing: h.facing };
  }

  private async prepare(scene: string) {
    if (!this.io.prepare) return;
    this.loading = true;
    try {
      await this.io.prepare(scene);
    } finally {
      this.loading = false;
    }
  }

  private enterScene(id: string, spawn: string | null) {
    const data = this.content.scenes[id];
    if (!data) throw new Error(`unknown scene: ${id}`);
    this.scene = data;
    this.state.scene = id;
    this.walk = new WalkArea(data.walkable, data.blocked);
    const sp = spawn ? data.spawns[spawn] : null;
    if (spawn && !sp) throw new Error(`unknown spawn ${spawn} in ${id}`);
    const hero = this.newActor(this.heroId, sp?.x ?? 960, sp?.y ?? 900, sp?.facing ?? "right");
    this.actors = [hero, ...(data.actors ?? []).map((p) => ({
      ...this.newActor(p.id, p.x, p.y, p.facing ?? "left"), fixedScale: p.scale, look: p.look, heightPx: p.height_px, visible_if: p.visible_if,
    }))];
    hero.hidden = data.no_hero;
    this.placeCompanions(true);
    const music = typeof data.music === "string" ? data.music : data.music?.find((r) => evalCond(r.if, this.state))?.path;
    this.setLoop("music", music ?? null);
    this.setLoop("ambience", data.ambience ?? null);
    this.log({ t: "scene", id, spawn: spawn ?? "" });
  }

  private companionConfigs(): CompanionConfig[] {
    const d = this.scene;
    if (d.no_hero || d.no_companions) return [];
    const placed = new Set((d.actors ?? []).map((a) => a.id));
    return (this.content.config.companions ?? []).filter((c) => !placed.has(c.id) && evalCond(c.if, this.state));
  }

  /**
   * Adds companions that should be here and removes ones that shouldn't. New ones (or all, with
   * `regroup`, on entering a scene) stand behind the hero.
   */
  placeCompanions(regroup = false) {
    const want = this.companionConfigs();
    const ids = new Set(want.map((c) => c.id));
    const all = new Set((this.content.config.companions ?? []).map((c) => c.id));
    const placed = new Set((this.scene.actors ?? []).map((a) => a.id));
    this.actors = this.actors.filter((a) => !all.has(a.id) || ids.has(a.id) || placed.has(a.id));
    const h = this.hero();
    for (const c of want) {
      let a = this.actors.find((x) => x.id === c.id);
      if (a && !regroup) continue;
      if (!a) {
        a = this.newActor(c.id, h.x, h.y, h.facing);
        a.companion = true;
        this.actors.push(a);
      }
      const [x, y] = this.companionSpot(c, h);
      Object.assign(a, { x, y, facing: h.facing, path: [] });
    }
  }

  private companionSpot(c: CompanionConfig, h: Actor): Pt {
    const [back, up] = c.offset ?? [150, 10];
    const k = actorScale(h, this.scene);
    const dir = h.facing === "right" ? -1 : 1;
    const spot = (d: number): Pt => [h.x + d * back * k, h.y - up * k];
    const behind = spot(dir);
    const clamped = this.walk.clamp(behind);
    // Squeezed against a wall (e.g. right after coming in through a side door): stand in front instead.
    if (Math.abs(clamped[0] - behind[0]) > back * k * 0.4) return this.walk.clamp(spot(-dir));
    return clamped;
  }

  /** Companions trail the hero while nothing scripted is running. */
  private follow() {
    if (this.busy || this.mini) return;
    const h = this.hero();
    if (!h) return;
    for (const c of this.content.config.companions ?? []) {
      const a = this.actors.find((x) => x.id === c.id && x.companion);
      // Never override a scripted walk (actorWalk sets `arrive`); only trail the hero when free.
      if (!a || a.anim || a.arrive) continue;
      const goal = this.companionSpot(c, h);
      if (Math.hypot(goal[0] - a.x, goal[1] - a.y) < FOLLOW_SLACK) continue;
      const end = a.path.at(-1);
      if (end && Math.hypot(end[0] - goal[0], end[1] - goal[1]) < FOLLOW_SLACK) continue;
      a.path = this.walk.find([a.x, a.y], goal);
      a.running = h.running;
    }
  }

  private setLoop(kind: "music" | "ambience", path: string | null) {
    this.state[kind] = path;
    this.io.audio[kind](path ? `audio/${path}` : null);
  }

  /** The pose an actor holds now: a scripted one, else the first of its character's `pose_if` that holds. */
  poseOf(a: Actor): string | null {
    if (a.pose) return a.pose;
    const rules = this.content.characters[a.id]?.pose_if;
    for (const [name, cond] of Object.entries(rules ?? {})) if (evalCond(cond, this.state)) return name;
    return null;
  }

  private newActor(id: string, x: number, y: number, facing: Facing): Actor {
    return { id, x, y, facing, path: [], arrive: null, anim: null, pose: null, talking: false, walkT: 0 };
  }

  private log(e: GameEvent) {
    if ((e.t === "flag" && !e.name.startsWith("looked:")) || (e.t === "item" && e.op === "give")) this.idleMs = 0;
    this.events.push(e);
    this.io.log(e);
  }

  // ── per-frame update (browser only; fast mode never waits on it) ─────────

  update(dtMs: number) {
    if (this.menuOpen) return;
    if (this.mini) {
      this.mini.ctx.elapsed += dtMs;
      this.mini.impl.update(this.mini.ctx, dtMs);
    }
    this.follow();
    for (const a of this.actors) this.stepActor(a, dtMs);
    this.tickIdle(dtMs);
    for (const t of [...this.timers]) {
      t.t -= dtMs;
      if (t.t <= 0) t.done();
    }
    if (this.speech && !this.speech.voice) {
      this.speech.remaining -= dtMs;
      if (this.speech.remaining <= 0) this.speech.finish();
    }
    if (this.fadeGoal) {
      const step = dtMs / 350;
      this.fade += Math.sign(this.fadeGoal.to - this.fade) * step;
      if (Math.abs(this.fadeGoal.to - this.fade) <= step) {
        this.fade = this.fadeGoal.to;
        this.fadeGoal.done();
      }
    }
  }

  private tickIdle(dtMs: number) {
    const limit = this.content.config.idle_hint_ms;
    if (!limit || this.busy || this.mini || this.choice || this.card || this.loading || this.fade > 0 || this.state.flags.game_end) return;
    this.idleMs += dtMs;
    if (this.idleMs < limit) return;
    this.idleMs = 0;
    const fn = this.content.scripts[this.scene.id]?.hint ?? this.content.globals.hint;
    if (fn) void this.run(() => fn(this.api));
  }

  private stepActor(a: Actor, dtMs: number) {
    if (a.anim) {
      a.anim.t -= dtMs;
      if (a.anim.t <= 0) a.anim.done();
    }
    if (!a.path.length) return;
    const ch = this.content.characters[a.id];
    // A character with its own run cycle runs at run_speed, and the cycle plays in real time.
    const ownRun = a.running && !!ch?.run_speed && !!ch.anims.run_r;
    const run = a.running && !ownRun ? RUN : 1;
    a.walkT += dtMs * run;
    const speed = (ownRun ? ch!.run_speed! : (ch?.speed ?? SPEED) * run) * actorScale(a, this.scene);
    let budget = (speed * dtMs) / 1000;
    while (budget > 0 && a.path.length) {
      const [tx, ty] = a.path[0];
      const d = Math.hypot(tx - a.x, ty - a.y);
      if (Math.abs(tx - a.x) > 2) a.facing = tx < a.x ? "left" : "right";
      if (d <= budget) {
        a.x = tx;
        a.y = ty;
        a.path.shift();
        budget -= d;
      } else {
        a.x += ((tx - a.x) / d) * budget;
        a.y += ((ty - a.y) / d) * budget;
        budget = 0;
      }
    }
    if (!a.path.length) this.settle(a, true);
  }

  private settle(a: Actor, arrived: boolean) {
    a.path = [];
    a.walkT = 0;
    a.running = false;
    const cb = a.arrive;
    a.arrive = null;
    cb?.(arrived);
  }

  private get instant() {
    return this.fast || this.skipping;
  }

  // ── targets and actions ──────────────────────────────────────────────────

  targets(): Target[] {
    const heroClickable = !!(this.content.scripts[this.scene.id]?.targets?.[this.heroId] ?? this.content.globals.targets?.[this.heroId]);
    return targets(this.scene, this.state, this.actors, this.heroId, this.content.characters, this.io.sizeOf, heroClickable);
  }

  targetAt(p: Pt): Target | null {
    return targetAt(this.targets(), p);
  }

  private walkActor(a: Actor, to: Pt, how: Approach = "walk"): Promise<boolean> {
    if (a.arrive) this.settle(a, false);
    const path = this.walk.find([a.x, a.y], to);
    if (!path.length) return Promise.resolve(true);
    if (this.instant || how === "jump") {
      const [x, y] = path[path.length - 1];
      if (Math.abs(x - a.x) > 2) a.facing = x < a.x ? "left" : "right";
      a.x = x;
      a.y = y;
      return Promise.resolve(true);
    }
    a.path = path;
    a.running = how === "run";
    return new Promise((res) => (a.arrive = res));
  }

  faceToward(id: string) {
    const t = this.targets().find((x) => x.id === id);
    const h = this.hero();
    if (!t || !h) return;
    const [cx] = centroid(t.poly);
    if (Math.abs(cx - h.x) > 4) h.facing = cx < h.x ? "left" : "right";
  }

  /** Perform a verb (or item use) on a target, walking (or running, or jumping) there first. */
  async act(verb: Verb, id: string, item?: string, how: Approach = "walk"): Promise<void> {
    const t = this.targets().find((x) => x.id === id);
    if (!t) throw new Error(`target not available: ${id}`);
    if (item && !this.state.inventory.includes(item)) throw new Error(`item not in inventory: ${item}`);
    this.log({ t: "act", verb: item ? "item" : verb, target: id, item });
    this.pending++;
    try {
      if (verb !== "look" && t.walk_to) {
        if (!(await this.walkActor(this.hero(), t.walk_to, how))) return; // interrupted by another click
      }
      if (t.face === "left" || t.face === "right") this.hero().facing = t.face;
      else this.faceToward(id);
      if (verb === "look" && this.content.config.one_tap) this.state.flags[`looked:${this.scene.id}/${id}`] = true;
      await this.run(() => this.dispatch(verb, t, item));
      if (item) this.selectedItem = null;
    } finally {
      this.pending--;
    }
  }

  defaultVerb(t: Target): Verb {
    return t.kind === "exit" ? "go" : t.kind === "actor" ? "talk" : "use";
  }

  async lookItem(item: string) {
    const fn = this.content.itemLooks[item];
    await this.run(() => (fn ? fn(this.api) : this.sayOrFail(`item.${item}.look`, "look")));
  }

  async combine(a: string, b: string) {
    this.log({ t: "act", verb: "combine", target: b, item: a });
    const fn = this.content.combos[`${a}+${b}`] ?? this.content.combos[`${b}+${a}`];
    this.api.sfx(fn === undefined ? "fail" : "combine");
    await this.run(() => (fn ? fn(this.api) : this.fail("item")));
    this.selectedItem = null;
  }

  /** The scene script's handler for a target, else the global one (companions). */
  private handler(id: string, pick: (h: TargetHandlers) => Handler | undefined): Handler | undefined {
    const local = this.content.scripts[this.scene.id]?.targets?.[id];
    const global = this.content.globals.targets?.[id];
    return (local && pick(local)) ?? (global && pick(global));
  }

  /** Whether a target has something to say when looked at. */
  hasLook(id: string): boolean {
    return !!this.handler(id, (h) => h.look) || !!this.content.lines[`${this.scene.id}.${id}.look`];
  }

  private async dispatch(verb: Verb, t: Target, item?: string): Promise<unknown> {
    const base = `${this.scene.id}.${t.id}`;
    if (item) {
      const fn = this.handler(t.id, (h) => h.items?.[item]);
      return fn ? fn(this.api) : this.sayOrFail(`${base}.item.${item}`, "item", item);
    }
    const fn = this.handler(t.id, (h) => h[verb]);
    if (fn) return fn(this.api);
    switch (verb) {
      case "look":
        return this.sayOrFail(`${base}.look`, "look");
      case "talk":
        return this.sayOrFail(`${base}.talk`, "use");
      case "go":
        if (t.exit) return this.api.goto(t.exit.target, t.exit.spawn);
        return this.fail("use");
      case "use":
        // One-tap: something with nothing to do just describes itself again.
        if (!this.content.lines[`${base}.use`] && this.content.config.one_tap && this.hasLook(t.id)) return this.dispatch("look", t);
        return this.sayOrFail(`${base}.use`, "use");
    }
  }

  private sayOrFail(lineId: string, kind: "use" | "item" | "look" | "talk", item?: string) {
    return this.content.lines[lineId] ? this.api.say(lineId) : this.fail(kind, item);
  }

  private fail(kind: "use" | "item" | "look" | "talk", item?: string) {
    const fl = this.content.config.fail_lines;
    const own = item ? fl.items?.[item] : undefined;
    const pool = own ?? (kind === "talk" ? fl.talk : undefined) ?? fl[kind === "talk" ? "use" : kind];
    const key = own ? `item:${item}` : kind;
    const i = (this.failIdx[key] = ((this.failIdx[key] ?? -1) + 1) % pool.length);
    return this.api.say(pool[i]);
  }

  /** Run a script with input locked. Errors are logged, not thrown into the UI. */
  async run(fn: () => unknown): Promise<void> {
    this.busy = true;
    try {
      await fn();
    } catch (e) {
      this.lastError = e instanceof Error ? e : new Error(String(e));
      this.log({ t: "error", message: this.lastError.message });
      console.error(e);
    } finally {
      this.busy = false;
      this.speech = null;
      if (this.scene) this.placeCompanions(); // a flag may have brought a companion along, or sent one away
    }
    // Autosave whenever the game comes to rest; an ended game keeps its last playable save.
    if (!this.state.flags.game_end) this.save("auto");
  }

  choose(lineIds: string[]): Promise<number> {
    return new Promise((res) => {
      this.choice = {
        options: lineIds.map((id) => ({ lineId: id, text: this.line(id).text })),
        pick: (i) => {
          this.choice = null;
          this.readOption(-1);
          res(i);
        },
      };
    });
  }

  /** Resolves once nothing is running, or the game is waiting for a dialogue choice. */
  async idle(): Promise<void> {
    for (;;) {
      if (this.choice || (!this.busy && !this.pending && !this.hero()?.path.length && !this.speech)) return;
      await new Promise((r) => setTimeout(r, this.fast ? 0 : 20));
    }
  }

  line(id: string): LineData {
    const l = this.content.lines[id];
    if (!l) throw new Error(`missing line: ${id}`);
    return l;
  }

  // ── input (game coordinates) ─────────────────────────────────────────────

  inventoryOpen(): boolean {
    if (this.busy || this.choice || this.card || this.menuOpen || this.mini || !this.scene || this.scene.no_hero) return false;
    return !!this.content.config.inventory_always || (this.pointer[1] >= 0 && this.pointer[1] < INV_REVEAL_Y);
  }

  pointerMove(p: Pt, touch = false) {
    this.pointer = p;
    if (this.mini && !this.menuOpen) this.mini.impl.pointer?.(this.mini.ctx, p, false);
    // Pre-readers: hovering a dialogue option reads it aloud. (Touch reads on the first tap instead.)
    if (this.choice && !touch && !this.menuOpen) this.readOption(this.optionAt(p));
  }

  private optionAt(p: Pt): number {
    return this.choice ? choiceRects(this.choice.options.length).findIndex((r) => hit(r, p)) : -1;
  }

  /** Reads option `i` in the hero's voice (no subtitle: the option text is on screen); -1 stops. */
  private readOption(i: number) {
    if (i === this.choiceHover) return;
    this.choiceHover = i;
    const token = ++this.hoverVoice.token;
    this.hoverVoice.voice?.stop();
    this.hoverVoice.voice = null;
    const line = i >= 0 ? this.choice?.options[i]?.lineId : undefined;
    if (!line || this.instant) return;
    void this.io.audio.voice(line).then((v) => {
      if (token === this.hoverVoice.token) this.hoverVoice.voice = v;
      else v?.stop(); // the pointer moved on while it was loading
    });
  }

  /** The skip hint shows during cutscenes in skip_hint scenes, and in a mini-game once it can be skipped. */
  skipHintShown(): boolean {
    if (this.mini) return this.mini.ctx.elapsed >= MINIGAME_SKIP_MS;
    return !!this.scene?.skip_hint && this.cutsceneDepth > 0 && !this.skipping;
  }

  /** `double`: the second press of a double-click (run there; on an exit, skip the walk). */
  pointerDown(p: Pt, button: "left" | "right", double = false, touch = false) {
    this.pointer = p;
    if (!this.scene || this.loading) return; // still booting, or the scene's art is loading
    if (this.menuOpen) return this.menuClick(p);
    if (this.mini) {
      if (this.skipHintShown() && hit(SKIP_HINT, p)) return this.mini.ctx.finish();
      return this.mini.impl.pointer?.(this.mini.ctx, p, true);
    }
    if (this.scene.skip_hint && this.cutsceneDepth > 0 && hit(SKIP_HINT, p)) return this.skipNow();
    if (this.card) return this.card.finish?.();
    if (this.speech) return this.speech.finish();
    if (this.choice) {
      const i = this.optionAt(p);
      // On touch there's no hover: the first tap on an option reads it, a second tap picks it.
      if (touch && i >= 0 && i !== this.choiceHover) return this.readOption(i);
      if (i >= 0) this.choice.pick(i);
      return;
    }
    if (this.busy) return;
    if (this.inventoryOpen() && hit(INV_BAR, p)) {
      const i = invSlots(this.state.inventory.length).findIndex((r) => hit(r, p));
      const item = this.state.inventory[i];
      if (!item) return;
      if (button === "right") return void this.lookItem(item);
      if (this.selectedItem && this.selectedItem !== item) return void this.combine(this.selectedItem, item);
      this.selectedItem = this.selectedItem === item ? null : item;
      return;
    }
    const t = this.targetAt(p);
    if (button === "right") {
      if (this.selectedItem) this.selectedItem = null;
      else if (t) void this.act("look", t.id);
      return;
    }
    const how: Approach = !double ? "walk" : t?.kind === "exit" ? "jump" : "run";
    if (t) {
      const firstTap = this.content.config.one_tap && !this.selectedItem && (t.kind === "hotspot" || (t.kind === "object" && !t.pickup))
        && !this.state.flags[`looked:${this.scene.id}/${t.id}`] && this.hasLook(t.id);
      void this.act(firstTap ? "look" : this.defaultVerb(t), t.id, this.selectedItem ?? undefined, how);
    } else if (!this.scene.no_hero) {
      void this.walkActor(this.hero(), p, how);
    }
  }

  key(name: string) {
    if (this.loading) return;
    if (name === "Escape") {
      if (this.mini && this.skipHintShown()) return this.mini.ctx.finish();
      if (this.cutsceneDepth > 0) return this.skipNow();
      if (this.speech) return this.speech.finish();
      if (this.selectedItem) return void (this.selectedItem = null);
      this.menuOpen = !this.menuOpen;
    } else if (name === "F1") {
      this.debug = !this.debug;
    } else if (this.choice && /^[1-9]$/.test(name)) {
      const i = Number(name) - 1;
      if (i < this.choice.options.length) this.choice.pick(i);
    } else if (name === " " || name === ".") {
      if (this.speech) this.speech.finish();
    }
  }

  private menuClick(p: Pt) {
    const i = menuRects().findIndex((r) => hit(r, p));
    switch (MENU_ITEMS[i]) {
      case "resume":
        this.menuOpen = false;
        break;
      case "save":
        if (!this.busy) this.save("1");
        this.menuOpen = false;
        break;
      case "load":
        if (!this.busy) this.load("1");
        break;
      case "options":
        this.io.options?.();
        break;
      case "new_game":
        if (!this.busy) void this.newGame();
        break;
    }
  }

  private skipNow() {
    this.skipping = true;
    this.speech?.finish();
    this.card?.finish?.();
    for (const t of [...this.timers]) t.done();
    for (const a of this.actors) {
      a.anim?.done();
      if (a.path.length) {
        [a.x, a.y] = a.path[a.path.length - 1];
        this.settle(a, true);
      }
    }
    if (this.fadeGoal) {
      this.fade = this.fadeGoal.to;
      this.fadeGoal.done();
    }
  }

  // ── script API ───────────────────────────────────────────────────────────

  private makeApi(): GameAPI {
    const g = this;
    const actor = (id: string) => {
      const a = g.actors.find((x) => x.id === id);
      if (!a) throw new Error(`actor not in scene: ${id}`);
      return a;
    };
    const wait = (ms: number) =>
      g.instant ? Promise.resolve() : new Promise<void>((res) => {
        const t = { t: ms, done: () => { g.timers = g.timers.filter((x) => x !== t); res(); } };
        g.timers.push(t);
      });
    const fadeTo = (to: number): Promise<void> => {
      if (g.instant) {
        g.fade = to;
        return Promise.resolve();
      }
      return new Promise<void>((res) => {
        g.fadeGoal = { to, done: () => { g.fadeGoal = null; res(); } };
      });
    };
    const setFlag = (name: string, value: boolean) => {
      g.state.flags[name] = value;
      g.log({ t: "flag", name, value });
    };

    const api: GameAPI = {
      async say(lineId) {
        const l = g.line(lineId);
        g.log({ t: "say", id: lineId, speaker: l.speaker, text: l.text });
        if (g.instant) return;
        const speaker = g.actors.find((a) => a.id === l.speaker);
        const voice = await g.io.audio.voice(lineId);
        await new Promise<void>((res) => {
          const finish = () => {
            if (g.speech !== s) return;
            g.speech = null;
            voice?.stop();
            if (speaker) speaker.talking = false;
            res();
          };
          const s: Speech = {
            lineId, speaker: l.speaker, text: l.text, voice, finish,
            remaining: Math.max(1500, 55 * l.text.length),
          };
          g.speech = s;
          if (speaker) speaker.talking = true;
          voice?.done.then(finish);
        });
      },
      async card(lineId) {
        const l = g.line(lineId);
        g.log({ t: "say", id: lineId, speaker: l.speaker, text: l.text });
        if (g.instant) return;
        api.sfx("card");
        const voice = await g.io.audio.voice(lineId);
        await new Promise<void>((res) => {
          const finish = () => {
            if (g.card !== card) return;
            g.timers = g.timers.filter((x) => x !== t);
            voice?.stop();
            g.card = null;
            res();
          };
          // Without a recording the card is timed by text length; with one it stays until the voice ends.
          const t = { t: voice ? Infinity : Math.max(2500, 60 * l.text.length), done: finish };
          const card = { text: l.text, finish };
          g.timers.push(t);
          g.card = card;
          voice?.done.then(() => { t.t = 800; });
        });
      },
      async end(lineId) {
        const l = g.line(lineId);
        g.log({ t: "say", id: lineId, speaker: l.speaker, text: l.text });
        setFlag("game_end", true);
        g.card = { text: l.text, finish: null, over: true };
        if (!g.instant) void g.io.audio.voice(lineId);
      },
      async walkTo(target) {
        let to: Pt;
        if (typeof target === "string") {
          const t = g.targets().find((x) => x.id === target);
          if (!t) throw new Error(`walkTo: no target ${target}`);
          to = t.walk_to ?? centroid(t.poly);
        } else to = target;
        await g.walkActor(g.hero(), to);
      },
      face(dir) {
        g.hero().facing = dir;
      },
      async actorWalk(id, to, how = "walk") {
        if (typeof to === "string") {
          const t = g.targets().find((x) => x.id === to);
          if (!t) throw new Error(`actorWalk: no target ${to}`);
          to = t.walk_to ?? centroid(t.poly);
        }
        await g.walkActor(actor(id), to, how);
      },
      actorFace(id, dir) {
        actor(id).facing = dir;
      },
      place(id, [x, y]) {
        Object.assign(actor(id), { x, y, path: [] });
      },
      anim(id, name) {
        const a = actor(id);
        const data = g.content.characters[id]?.anims[name] ?? g.content.characters[id]?.anims[`${name}_r`];
        const ms = data ? data.hold_ms ?? (data.frames / data.fps) * 1000 : 500;
        if (g.instant) return Promise.resolve();
        return new Promise<void>((res) => {
          a.anim = { name, t: ms, ms, done: () => { a.anim = null; res(); } };
        });
      },
      pose(id, name) {
        actor(id).pose = name;
      },
      point(name) {
        const p = g.scene.points?.[name];
        if (!p) throw new Error(`no point ${name} in ${g.scene.id}`);
        return [p[0], p[1]];
      },
      wait,
      flag: (name) => !!g.state.flags[name],
      set: (name, value = true) => setFlag(name, value),
      unset: (name) => setFlag(name, false),
      visited: (scene) => g.state.visited.includes(scene),
      has: (item) => g.state.inventory.includes(item),
      give(item) {
        if (!g.content.items[item]) throw new Error(`unknown item: ${item}`);
        if (!g.state.inventory.includes(item)) {
          g.state.inventory.push(item);
          api.sfx("pickup");
        }
        g.log({ t: "item", op: "give", item });
      },
      take(item) {
        api.give(item);
        setFlag(`taken:${item}`, true);
      },
      drop(item) {
        g.state.inventory = g.state.inventory.filter((i) => i !== item);
        if (g.selectedItem === item) g.selectedItem = null;
        g.log({ t: "item", op: "drop", item });
      },
      show: (id) => setFlag(hiddenKey(g.scene.id, id), false),
      hide: (id) => setFlag(hiddenKey(g.scene.id, id), true),
      async goto(scene, spawn = "default") {
        g.syncHero();
        await fadeTo(1);
        await g.prepare(scene);
        g.enterScene(scene, spawn);
        g.selectedItem = null;
        const fadeIn = fadeTo(0);
        const script = g.content.scripts[scene];
        if (script?.enter) await script.enter(api);
        if (!g.state.visited.includes(scene)) g.state.visited.push(scene);
        await fadeIn;
      },
      dialogue(id) {
        const def = g.content.dialogues[id];
        if (!def) throw new Error(`unknown dialogue: ${id}`);
        return runDialogue(g, def);
      },
      sfx(name) {
        if (!g.instant) g.io.audio.sfx(`audio/sfx/${name}.mp3`);
      },
      music: (name) => g.setLoop("music", name ? `music/${name}.mp3` : null),
      ambience: (name) => g.setLoop("ambience", name ? `amb/${name}.mp3` : null),
      async cutscene(fn) {
        g.cutsceneDepth++;
        try {
          await fn();
        } finally {
          if (--g.cutsceneDepth === 0) g.skipping = false;
        }
      },
      cond: (expr) => evalCond(expr, g.state),
      scene: () => g.scene.id,
      async minigame(id) {
        const impl = g.content.minigames[id];
        if (!impl) throw new Error(`unknown minigame: ${id}`);
        if (g.instant) return;
        if (impl.images?.length) await g.io.images?.load(impl.images);
        await new Promise<void>((res) => {
          const ctx: MiniGameCtx = {
            api,
            image: (path) => g.io.images?.get(path) ?? null,
            elapsed: 0,
            finish: () => {
              if (g.mini?.ctx !== ctx) return;
              g.mini = null;
              res();
            },
          };
          impl.init(ctx);
          g.mini = { impl, ctx };
        });
      },
    };
    return api;
  }
}
