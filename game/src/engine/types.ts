// Content formats. These mirror the JSON files in content/ (see the engine skill).

export type Pt = [number, number];
export type Poly = Pt[];
export type Facing = "left" | "right";

export interface TargetBase {
  id: string;
  name: string;
  walk_to?: Pt;
  face?: Facing | "up" | "down";
  visible_if?: string;
  /** Where the hand goes in g.reach (default: an object's centre; a hotspot's nearest part). */
  reach_at?: Pt;
  /** Who reaches for it when the script doesn't say (default: the hero). */
  reach_by?: string;
  /** The pose to reach it with, when the geometry misleads (something drawn high because it's far). */
  reach_pose?: string;
}

export interface HotspotData extends TargetBase {
  polygon: Poly;
}

export interface ObjectData extends TargetBase {
  sprite: string;
  x: number;
  y: number;
  /** Placeholder size when the sprite is missing. */
  w?: number;
  h?: number;
  baseline?: number;
  polygon?: Poly;
  /** one_tap: the first tap uses it straight away (a pickup), instead of looking first. */
  pickup?: boolean;
}

export interface ExitData extends HotspotData {
  target: string;
  spawn?: string;
  enabled_if?: string;
}

export interface ActorPlacement {
  id: string;
  x: number;
  y: number;
  facing?: Facing;
  /** Fixed scale instead of the scene's depth scaling (e.g. someone behind a counter). */
  scale?: number;
  /** Sprite folder under chars/ when this scene needs another outfit (default: id). */
  look?: string;
  /** Height at scale 1 for this outfit, when it differs from the character's (e.g. seated vs standing). */
  height_px?: number;
  visible_if?: string;
  walk_to?: Pt;
  face?: Facing | "up" | "down";
  polygon?: Poly;
}

export interface PatchData {
  id?: string;
  image: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  visible_if?: string;
  /** Depth like an fg layer; default -1 (under everything). A large value (e.g. 9999) puts a
   *  full-screen still above the characters. */
  baseline?: number;
  /** Cross-dissolves in over this many ms each time it becomes visible. */
  fade_in_ms?: number;
  /** A slow camera move over the patch while it's visible (stills): [zoom, focus x, focus y], focus as 0..1 of the image. */
  drift?: { from: Drift; to: Drift; ms: number };
}

export type Drift = [number, number, number];

export interface FgData {
  /** For g.move / g.motion. */
  id?: string;
  image: string;
  x: number;
  y: number;
  baseline: number;
  visible_if?: string;
}

export interface Spawn {
  x: number;
  y: number;
  facing?: Facing;
}

export interface SceneScale {
  near_y: number;
  near: number;
  far_y: number;
  far: number;
}

export interface MusicRule {
  if?: string;
  path: string;
}

export interface SceneData {
  id: string;
  background: string;
  /** A path, or rules checked in order: the first whose `if` holds (or has none) plays. */
  music?: string | MusicRule[];
  ambience?: string;
  walkable: Poly[];
  blocked?: Poly[];
  scale?: SceneScale;
  spawns: Record<string, Spawn>;
  hotspots?: HotspotData[];
  objects?: ObjectData[];
  patches?: PatchData[];
  fg?: FgData[];
  exits?: ExitData[];
  actors?: ActorPlacement[];
  /** Named positions for scripts (cutscene marks): g.point("name"). */
  points?: Record<string, Pt>;
  /** A screen without the hero (e.g. a travel map): the hero isn't drawn and floor clicks do nothing. */
  no_hero?: boolean;
  /** Show `ui.skip` in the corner while a cutscene runs (e.g. the intro); clicking it skips like Esc. */
  skip_hint?: boolean;
  /** No companions in this scene (cards, travel screens, mini-games). */
  no_companions?: boolean;
}

export interface AnimData {
  frames: number;
  fps: number;
  hold_ms?: number;
  /** Sprite shift from the feet, in sprite pixels at scale 1 (mirrored with the sprite). */
  offset?: Pt;
  /** Extra size factor for this anim's frames (a pose drawn at another size). */
  scale?: number;
  /** Where the hand is: px forward and up from the feet, at scale 1, as drawn (after offset and scale).
   *  Poses with a hand are the ones g.reach chooses from. */
  hand?: Pt;
  /** Has a hand but isn't a general reaching pose (it holds a prop): only used when named. */
  no_reach?: boolean;
  /** Motion played with the pose whenever it's a one-shot (g.anim). */
  motion?: string;
}

export interface CharacterData {
  name: string;
  height_px: number;
  text_color: string;
  speed?: number;
  /** px/s at scale 1 while running, for a character with a `run_r` cycle (otherwise running is speed × 2). */
  run_speed?: number;
  /** Drawn this many px (at scale 1) above its feet point, bobbing gently: a flying character. */
  float_px?: number;
  /** Hit-box width as a fraction of the height (default 0.36: a standing person; a lying cat is wider). */
  width_ratio?: number;
  /** CSS colour of a soft light drawn around the character while it has no pose. */
  glow?: string;
  /** Poses held while a condition is true ({"dim": "!iskierka_charged"}); a scripted pose wins. */
  pose_if?: Record<string, string>;
  anims: Record<string, AnimData>;
}

export interface ItemData {
  name: string;
  icon: string;
}

export interface LineData {
  speaker: string;
  text: string;
  spoken?: string; // what the voice reads, when it differs from the subtitle
  /** Delivery for this line only (vo_batch): stability, similarity_boost, style, speed. */
  voice?: Record<string, number>;
  direction?: string;
  model?: string;
}

export interface GameConfig {
  title: string;
  start_scene: string;
  start_spawn?: string;
  /** Hero-less scene that New Game plays first; its script ends by going to start_scene. */
  intro_scene?: string;
  hero: string;
  start_inventory?: string[];
  /** Background of the title menu, relative to the public folder. */
  title_image?: string;
  /** Font files for the title and the menus (any format the browser loads). */
  fonts?: { title?: string; menu?: string };
  fail_lines: {
    use: string[];
    item: string[];
    look: string[];
    talk?: string[];
    /** Per held item: fail lines when that item is used on something that doesn't take it. */
    items?: Record<string, string[]>;
  };
  ui: Record<string, string>;
  /** Characters that follow the hero into every scene (unless `if` fails or the scene places them itself). */
  companions?: CompanionConfig[];
  /** One-tap controls: the first tap on a hotspot or object describes it, later taps use it. */
  one_tap?: boolean;
  /** Inventory bar always shown (instead of revealed by moving to the top edge). */
  inventory_always?: boolean;
  /** After this long with no new flag or item, the scene's (or the global) `hint` handler runs. */
  idle_hint_ms?: number;
  /** A story clock in the top-right corner: the first entry whose `if` holds sets the time ("H:MM"). */
  clock?: {
    times: { if?: string; time: string }[];
    /** Flag prefix of collectibles: each set flag with it lights one of the 12 hour marks gold. */
    marks?: string;
  };
  /** A collectible counter in the top-right corner: each set flag with `prefix` fills one of `total` pips.
   *  `icon` (an image path) is drawn beside the pips; without it a simple feather-like glyph is drawn. */
  counter?: { prefix: string; total: number; icon?: string };
}

export interface CompanionConfig {
  id: string;
  /** Only present while this condition holds. */
  if?: string;
  /** While this holds, the companion stays where a script put it instead of trailing the hero. */
  stay_if?: string;
  /** Where it stands relative to the hero: px behind (along facing), and px towards the back. */
  offset?: Pt;
}
