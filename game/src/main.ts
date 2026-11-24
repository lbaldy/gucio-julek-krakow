import { loadContent } from "./content";
import { Images } from "./engine/assets";
import { AudioOut, CHANNELS, type Volumes } from "./engine/audio";
import { devParams, exposeDevApi, logEvent, startFromParams } from "./engine/dev";
import { Game, type Content } from "./engine/game";
import { deserialize } from "./engine/state";
import { bindInput } from "./engine/input";
import { Renderer } from "./engine/render";
import { loadFonts } from "./engine/ui/fonts";
import { mainMenu, optionsPanel, startScreen } from "./engine/ui/screens";

/** Every image a scene draws: its art, the hero, and the actors it places (in their outfit). */
function sceneImages(c: Content, id: string): string[] {
  const s = c.scenes[id];
  if (!s) return []; // unknown scene: let the game report it
  const paths = new Set<string>([s.background]);
  for (const o of s.objects ?? []) paths.add(o.sprite);
  for (const p of s.patches ?? []) paths.add(p.image);
  for (const f of s.fg ?? []) paths.add(f.image);
  const chars = [
    { id: c.config.hero, folder: c.config.hero },
    ...(c.config.companions ?? []).map((x) => ({ id: x.id, folder: x.id })),
    ...(s.actors ?? []).map((a) => ({ id: a.id, folder: a.look ?? a.id })),
  ];
  for (const { id: charId, folder } of chars) {
    for (const [anim, a] of Object.entries(c.characters[charId]?.anims ?? {})) {
      for (let f = 0; f < a.frames; f++) paths.add(`chars/${folder}/${anim}/${String(f).padStart(2, "0")}.png`);
    }
  }
  return [...paths];
}

/**
 * Loads a scene's images before it's shown, then warms up the scenes its exits lead to,
 * so the next scene change is usually instant.
 */
function scenePreparer(c: Content, images: Images) {
  return async (id: string) => {
    await images.loadAll(sceneImages(c, id));
    for (const e of c.scenes[id]?.exits ?? []) void images.loadAll(sceneImages(c, e.target));
  };
}

const storage = {
  get(k: string) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string) {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* storage unavailable: saving silently disabled */
    }
  },
};

function loadVolumes(): Volumes {
  const v: Volumes = { music: 1, sfx: 1, voice: 1 };
  try {
    const saved = JSON.parse(storage.get("settings:volume") ?? "{}") as Partial<Volumes>;
    for (const ch of CHANNELS) if (typeof saved[ch] === "number") v[ch] = saved[ch];
  } catch {
    /* corrupt settings: keep defaults */
  }
  return v;
}

function savedScene(store: typeof storage): string | null {
  try {
    const raw = store.get("save:auto");
    return raw ? deserialize(raw).scene : null;
  } catch {
    return null;
  }
}

async function boot() {
  const content = loadContent();
  const params = devParams();
  const ui = content.config.ui;
  const images = new Images();
  const audio = new AudioOut(loadVolumes());
  const saveVolumes = () => storage.set("settings:volume", JSON.stringify(audio.getVolumes()));
  const options = () => void optionsPanel(ui, audio, saveVolumes);
  const prepare = scenePreparer(content, images);
  const imageIo = { load: (paths: string[]) => images.loadAll(paths), get: (p: string) => images.get(p) };
  const game = new Game(content, { sizeOf: images.size, audio, storage, log: logEvent, options, prepare, images: imageIo }, params.fast);
  const canvas = document.getElementById("game") as HTMLCanvasElement;
  const renderer = new Renderer(canvas, game, images);
  bindInput(canvas, game, renderer, audio);
  exposeDevApi(game, renderer);
  document.title = content.config.title;

  // Only the title screen waits; each scene loads its own art when entered (Adapters.prepare).
  const titleImage = content.config.title_image ? [content.config.title_image] : [];
  await Promise.all([images.loadAll(titleImage), loadFonts(content.config.fonts)]);
  void images.loadAll([...Object.values(content.items).map((i) => i.icon), ...(content.config.counter?.icon ? [content.config.counter.icon] : [])]);
  // Warm up the first scene (or the saved one) while the player looks at the menu; a new game starts with the intro.
  const first = params.scene ?? savedScene(storage);
  if (first) void prepare(first);
  else for (const id of [content.config.intro_scene, content.config.start_scene]) if (id) void prepare(id);
  // Scene editor: dev server only (it saves through a Vite middleware), toggled with F2.
  const editor = import.meta.env.DEV
    ? new (await import("./editor/editor")).Editor(canvas, game, images, (x, y) => renderer.toGame(x, y))
    : null;
  if (editor && new URLSearchParams(location.search).get("edit") === "1") editor.toggle(true);
  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(50, now - last);
    last = now;
    if (!game.manual) {
      game.update(dt);
      renderer.draw(dt);
      editor?.draw();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  const devJump = !!(params.scene || params.give.length || params.set.length);
  if (params.fast || devJump) {
    if (!params.fast) await startScreen(content.config.title, ui.start ?? "", audio);
    return startFromParams(game, params);
  }
  game.debug = params.debug;
  const choice = await mainMenu(content.config.title, content.config.title_image, ui, game.hasSave("auto"), audio, saveVolumes);
  if (choice === "new_game" || !game.load("auto")) await game.newGame();
}

void boot();
