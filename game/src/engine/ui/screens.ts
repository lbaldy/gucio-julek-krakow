// DOM overlays over the canvas: the title menu, the options panel and the
// click-to-start screen. DOM rather than canvas so sliders and keyboard focus come free.

import { CHANNELS, type AudioOut, type Channel } from "../audio";
import { MENU_FONT, TITLE_FONT } from "./fonts";

type Ui = Record<string, string>;

// Sizes use --u = 1% of the letterboxed 16:9 frame's height, so the menu scales with the art.
const CSS = `
.scr{--u:min(1vh,0.5625vw);--cream:#e8dcc0;--ochre:#d4a94e;--ink:rgba(16,13,10,0.78);
  position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:calc(var(--u)*1.6);background:#000;color:var(--cream);font-family:${MENU_FONT};user-select:none;z-index:10}
.scr.dim{background:rgba(0,0,0,0.88)}
.scr.art{background-color:#000;background-position:center;background-size:contain;background-repeat:no-repeat}
.scr.art::before{content:"";position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(ellipse 32% 50% at 50% 48%,rgba(0,0,0,0.7),rgba(0,0,0,0.4) 60%,transparent 100%)}
.scr>*{position:relative}
.scr h1{font-family:${TITLE_FONT};font-weight:normal;font-size:calc(var(--u)*13);line-height:1;letter-spacing:0.08em;
  margin:0;text-align:center;max-width:calc(var(--u)*160);padding-left:0.08em;color:var(--cream);
  text-shadow:calc(var(--u)*0.5) calc(var(--u)*0.5) 0 #2a241c,0 0 calc(var(--u)*3) rgba(0,0,0,0.9)}
.scr h2{font-family:${TITLE_FONT};font-weight:normal;font-size:calc(var(--u)*7);letter-spacing:0.12em;margin:0 0 calc(var(--u)*2);
  text-shadow:calc(var(--u)*0.3) calc(var(--u)*0.3) 0 #2a241c}
.scr .tagline{display:flex;align-items:center;gap:calc(var(--u)*1.5);font-size:calc(var(--u)*2.2);letter-spacing:0.25em;
  text-transform:uppercase;color:var(--ochre);margin:calc(var(--u)*0.5) 0 calc(var(--u)*5);text-shadow:0 0 calc(var(--u)*1) #000}
.scr .tagline::before,.scr .tagline::after{content:"";width:calc(var(--u)*6);height:1px;background:var(--ochre);opacity:0.7}
.scr button{width:calc(var(--u)*46);height:calc(var(--u)*6.4);font-family:inherit;font-weight:bold;font-size:calc(var(--u)*2.9);
  letter-spacing:0.14em;text-transform:uppercase;color:var(--cream);cursor:pointer;border:none;
  border-top:1px solid rgba(212,169,78,0.18);border-bottom:1px solid rgba(212,169,78,0.18);
  background:linear-gradient(90deg,transparent,var(--ink) 18%,var(--ink) 82%,transparent);
  transition:color .15s,border-color .15s,letter-spacing .2s}
.scr button:hover,.scr button:focus-visible{color:var(--ochre);outline:none;letter-spacing:0.2em;
  border-color:rgba(212,169,78,0.6)}
.scr label{display:grid;grid-template-columns:calc(var(--u)*34) calc(var(--u)*36) calc(var(--u)*7);align-items:center;
  gap:calc(var(--u)*2);font-size:calc(var(--u)*2.6);text-transform:uppercase;letter-spacing:0.1em}
.scr label span:last-child{text-align:right;color:var(--ochre)}
.scr input[type=range]{width:100%;accent-color:var(--ochre);cursor:pointer}
.scr .prompt{font-size:calc(var(--u)*2.4);letter-spacing:0.2em;text-transform:uppercase;color:var(--ochre);
  margin-top:calc(var(--u)*4);animation:blink 1.6s ease-in-out infinite}
@keyframes blink{50%{opacity:0.4}}
`;

function overlay(dim = false): HTMLDivElement {
  if (!document.getElementById("scr-css")) {
    const st = document.createElement("style");
    st.id = "scr-css";
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const el = document.createElement("div");
  el.className = dim ? "scr dim" : "scr";
  document.body.appendChild(el);
  return el;
}

function add<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, text = ""): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.textContent = text;
  parent.appendChild(el);
  return el;
}

/** Keys pressed while an overlay is up go to the topmost one, not to the game behind it. */
const keyStack: ((e: KeyboardEvent) => void)[] = [];
function captureKeys(onKey: (e: KeyboardEvent) => void): () => void {
  if (!keyStack.length) window.addEventListener("keydown", dispatchKey, true);
  keyStack.push(onKey);
  return () => {
    keyStack.splice(keyStack.indexOf(onKey), 1);
    if (!keyStack.length) window.removeEventListener("keydown", dispatchKey, true);
  };
}
function dispatchKey(e: KeyboardEvent) {
  e.stopImmediatePropagation();
  keyStack[keyStack.length - 1]?.(e);
}

export type MenuChoice = "continue" | "new_game";

/** Title menu. Resolves once the player picks Continue or New game (a click, so audio unlocks). */
export function mainMenu(
  title: string,
  image: string | undefined,
  ui: Ui,
  canContinue: boolean,
  audio: AudioOut,
  saveVolumes: () => void,
): Promise<MenuChoice> {
  const el = overlay();
  if (image) {
    el.classList.add("art");
    el.style.backgroundImage = `url("${import.meta.env.BASE_URL}${image}")`;
  }
  add(el, "h1", title);
  if (ui.tagline) add(el, "div", ui.tagline).className = "tagline";
  return new Promise((res) => {
    const release = captureKeys(() => {});
    const button = (text: string, fn: () => void) => {
      const b = add(el, "button", text);
      b.addEventListener("click", () => {
        audio.unlock();
        fn();
      });
      return b;
    };
    const pick = (c: MenuChoice) => {
      release();
      el.remove();
      res(c);
    };
    const first = canContinue ? button(ui.continue_game ?? "Continue", () => pick("continue")) : null;
    const fresh = button(ui.new_game ?? "New game", () => pick("new_game"));
    const opts = button(ui.options ?? "Options", () => {
      for (const c of el.children) (c as HTMLElement).style.visibility = "hidden";
      void optionsPanel(ui, audio, saveVolumes, !!image).then(() => {
        for (const c of el.children) (c as HTMLElement).style.visibility = "";
        opts.focus();
      });
    });
    (first ?? fresh).focus();
  });
}

/** Volume sliders. Changes apply live and are saved on every change. Resolves when closed. */
export function optionsPanel(ui: Ui, audio: AudioOut, saveVolumes: () => void, dim = true): Promise<void> {
  const el = overlay(dim);
  add(el, "h2", ui.options ?? "Options");
  const labels: Record<Channel, string> = {
    music: ui.volume_music ?? "Music",
    sfx: ui.volume_sfx ?? "Sound effects",
    voice: ui.volume_voice ?? "Dialogue",
  };
  const vols = audio.getVolumes();
  const sliders = CHANNELS.map((ch) => {
    const row = add(el, "label");
    add(row, "span", labels[ch]);
    const input = add(row, "input");
    const val = add(row, "span");
    Object.assign(input, { type: "range", min: "0", max: "100", step: "5", value: String(Math.round(vols[ch] * 100)) });
    val.textContent = input.value;
    input.addEventListener("input", () => {
      audio.unlock();
      audio.setVolume(ch, Number(input.value) / 100);
      val.textContent = input.value;
      saveVolumes();
    });
    return input;
  });
  return new Promise((res) => {
    const close = () => {
      release();
      el.remove();
      res();
    };
    const release = captureKeys((e) => e.key === "Escape" && close());
    const back = add(el, "button", ui.back ?? "Back");
    back.style.marginTop = "calc(var(--u)*3)";
    back.addEventListener("click", close);
    sliders[0].focus();
  });
}

// Browsers keep audio locked until the player interacts, so the game waits for a first click.
export function startScreen(title: string, prompt: string, audio: AudioOut): Promise<void> {
  const el = overlay();
  el.style.cursor = "pointer";
  add(el, "h1", title);
  add(el, "div", prompt).className = "prompt";
  return new Promise((res) => {
    const go = () => {
      audio.unlock();
      release();
      el.remove();
      res();
    };
    const release = captureKeys(go);
    el.addEventListener("pointerdown", go);
  });
}
