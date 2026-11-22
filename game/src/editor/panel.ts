// The editor's side panel: scene picker, save/undo, layer toggles and the selection's numbers.

import type { Editor } from "./editor";
import { LAYERS } from "./shapes";

const CSS = `
#ed-panel { position: fixed; top: 0; right: 0; width: 270px; max-height: 100vh; overflow: auto; box-sizing: border-box;
  padding: 10px 12px; background: rgba(18,18,22,0.9); color: #ddd; font: 12px/1.45 system-ui, sans-serif; z-index: 10; }
#ed-panel.left { right: auto; left: 0; }
#ed-panel h3 { margin: 0 0 6px; font-size: 13px; display: flex; justify-content: space-between; align-items: center; }
#ed-panel section { border-top: 1px solid #333; padding: 7px 0; }
#ed-panel button { background: #2c2c34; color: #eee; border: 1px solid #444; border-radius: 4px; padding: 3px 7px; margin: 0 4px 4px 0; cursor: pointer; font: inherit; }
#ed-panel button:hover { background: #3a3a46; }
#ed-panel select, #ed-panel input[type=number] { background: #222; color: #eee; border: 1px solid #444; border-radius: 3px; font: inherit; }
#ed-panel select { width: 100%; }
#ed-panel input[type=number] { width: 64px; }
#ed-panel label { display: block; }
#ed-panel label.layer { display: inline-block; width: 50%; }
#ed-panel .dirty { color: #fb4; }
#ed-panel .muted { color: #888; }
#ed-panel .terms label { font: 11px monospace; }
#ed-panel kbd { background: #333; border-radius: 3px; padding: 0 4px; font: 11px monospace; }
`;

const HELP = `
<kbd>drag</kbd> corner, handle, sprite or line<br>
<kbd>dbl-click</kbd> an edge: add a corner<br>
<kbd>Del</kbd> corner or walk/blocked area<br>
<kbd>Alt</kbd>+drag: move a whole walk area<br>
<kbd>Tab</kbd> cycle what's under the cursor<br>
<kbd>←↑→↓</kbd> nudge 1px, <kbd>Shift</kbd> 10px<br>
<kbd>Ctrl/⌘</kbd>+click: hero test-walks there<br>
<kbd>Shift</kbd>+drag a posed character: fit the pose sprite<br>
<kbd>⌘S</kbd> save · <kbd>⌘Z</kbd> undo · <kbd>⇧⌘Z</kbd> redo<br>
<kbd>F2</kbd> leave the editor (play normally)`;

export class Panel {
  private el: HTMLDivElement;
  private sceneSel: HTMLSelectElement;
  private info: HTMLDivElement;
  private status: HTMLDivElement;
  private state: HTMLElement;
  private shownKey = "";
  private stateScene = "";
  private heroAt = "";

  constructor(readonly ed: Editor) {
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
    this.el = document.createElement("div");
    this.el.id = "ed-panel";
    this.el.style.display = "none";
    this.el.innerHTML = `
      <h3>Scene editor <button data-act="dock" title="move panel to the other side">⇄</button></h3>
      <select data-id="scene"></select>
      <section>
        <button data-act="save">Save</button><button data-act="undo">Undo</button><button data-act="redo">Redo</button>
        <div data-id="status" class="muted"></div>
      </section>
      <section data-id="layers"></section>
      <section data-id="info"></section>
      <section data-id="state"></section>
      <section>
        <button data-act="add-blocked">+ blocked area</button><button data-act="add-walkable">+ walk area</button>
        <button data-act="delete">Delete</button>
      </section>
      <section class="muted">${HELP}</section>`;
    document.body.appendChild(this.el);
    const q = <T extends Element>(id: string) => this.el.querySelector(`[data-id=${id}]`) as T;
    this.sceneSel = q("scene");
    this.info = q("info");
    this.status = q("status");
    this.state = q("state");

    for (const id of Object.keys(ed.g.content.scenes).sort()) this.sceneSel.add(new Option(id, id));
    this.sceneSel.addEventListener("change", () => ed.gotoScene(this.sceneSel.value));

    const layers = q<HTMLElement>("layers");
    for (const l of LAYERS) layers.appendChild(this.check(l, () => ed.layers.has(l), (on) => (on ? ed.layers.add(l) : ed.layers.delete(l))));
    layers.appendChild(this.check("show hidden things (visible_if off)", () => ed.showHidden, (on) => (ed.showHidden = on), false));

    this.el.addEventListener("click", (e) => {
      const act = (e.target as HTMLElement).dataset.act;
      if (act === "save") void ed.save();
      else if (act === "undo") ed.undo();
      else if (act === "redo") ed.undo(true);
      else if (act === "delete") ed.deleteSelected();
      else if (act === "add-blocked") ed.addPoly("blocked");
      else if (act === "add-walkable") ed.addPoly("walkable");
      else if (act === "dock") this.el.classList.toggle("left");
      else if (act === "reenter") ed.reenter();
      else if (act === "spawn-here") ed.spawnFromHero(this.info.querySelector<HTMLSelectElement>("[data-f=spawn]")!.value);
    });
    // Polled so scene changes from play or scripts show up too.
    setInterval(() => this.el.style.display !== "none" && this.update(), 250);
  }

  show(on: boolean) {
    this.el.style.display = on ? "" : "none";
    if (on) this.update();
  }

  update() {
    const ed = this.ed;
    if (!ed.g.scene) return;
    if (this.sceneSel.value !== ed.g.scene.id) this.sceneSel.value = ed.g.scene.id;
    const dirty = [...ed.dirty];
    this.status.innerHTML = (dirty.length ? `<span class="dirty">● unsaved: ${dirty.join(", ")}</span><br>` : "") + escape(ed.status);

    const s = ed.selected();
    const p = ed.selPoint(s);
    const actor = ed.actorOf(s);
    const key = `${ed.sel?.key}|${ed.sel?.vertex}|${actor?.pose}`;
    if (key !== this.shownKey) {
      this.shownKey = key;
      this.renderInfo();
    }
    // Refresh numbers in place unless the user is typing in them.
    const set = (f: string, v: number | undefined) => {
      const inp = this.info.querySelector<HTMLInputElement>(`[data-f=${f}]`);
      if (inp && v !== undefined) inp.value = String(v);
    };
    if (!this.info.contains(document.activeElement)) {
      set("x", p?.[0]);
      set("y", p?.[1]);
      const fit = actor && ed.poseFit(actor);
      set("ox", fit?.offset?.[0] ?? 0);
      set("oy", fit?.offset?.[1] ?? 0);
      set("ps", fit?.scale ?? 1);
    }
    // Preselect the spawn nearest the preview hero whenever it moves.
    const spawnSel = this.info.querySelector<HTMLSelectElement>("[data-f=spawn]");
    const h = ed.g.hero();
    const at = h ? `${Math.round(h.x)},${Math.round(h.y)}` : "";
    if (spawnSel && at !== this.heroAt) spawnSel.value = ed.spawnsByDistance()[0];
    this.heroAt = at;
    this.updateState();
  }

  /** Flags and conditions this scene's variations depend on; ticking one changes the current playthrough. */
  private updateState() {
    const ed = this.ed;
    if (this.stateScene !== ed.g.scene.id) {
      this.stateScene = ed.g.scene.id;
      this.state.innerHTML = `
        <div><b>Variations</b> <button data-act="reenter" title="run the scene's entry again with these flags">↻ re-enter scene</button></div>
        <div class="muted">Flags this scene and its script check. Ticking them changes the current playthrough.</div>
        <div class="terms"></div>`;
      const list = this.state.querySelector(".terms")!;
      for (const term of ed.stateTerms()) {
        const l = this.check(term, () => ed.termOn(term), (on) => ed.setTerm(term, on), false);
        l.dataset.term = term;
        list.appendChild(l);
      }
    }
    this.state.querySelectorAll<HTMLLabelElement>("label[data-term]").forEach((l) => {
      l.querySelector("input")!.checked = ed.termOn(l.dataset.term!);
    });
  }

  private renderInfo() {
    const ed = this.ed;
    const s = ed.selected();
    if (!s) {
      this.info.innerHTML = `<span class="muted">Nothing selected. Click something in the scene.</span>`;
      return;
    }
    const v = ed.sel?.vertex;
    const what = v !== undefined ? `corner ${v} of ${s.label}` : s.box && !s.pos ? `${s.label} (top-left)` : s.label;
    const onlyY = s.lineY !== undefined;
    const scaleKey = s.key === "scale/near" ? "near" : s.key === "scale/far" ? "far" : null;
    const sc = ed.g.scene.scale;
    const actor = ed.actorOf(s);
    const poses = actor ? ed.poseNames(actor) : [];
    const fit = actor && ed.poseFit(actor);
    const poseUi = actor
      ? `<div>pose <select data-f="pose" style="width:auto"><option value="">idle</option>${poses
          .map((n) => `<option ${actor.pose === n ? "selected" : ""}>${escape(n)}</option>`)
          .join("")}</select></div>` +
        (fit
          ? `<div>pose fit: dx <input type="number" data-f="ox"> dy <input type="number" data-f="oy"></div>
             <div>pose size × <input type="number" step="0.01" data-f="ps"> <span class="muted">(characters.json, every scene)</span></div>`
          : "")
      : "";
    const spawnUi =
      s.key === "hero"
        ? `<div class="muted">Preview only: in the game, the hero's position comes from a spawn (cyan ◆).
             Place them here, then store it:</div>
           <div><select data-f="spawn" style="width:auto">${ed
             .spawnsByDistance()
             .map((n) => `<option>${escape(n)}</option>`)
             .join("")}</select> <button data-act="spawn-here">Set spawn here</button></div>`
        : "";
    this.info.innerHTML = `
      <div><b>${escape(what)}</b> <span class="muted">${escape(s.key)}${s.hidden ? " · hidden now" : ""}${s.transient ? " · preview" : ""}</span></div>
      <div>${onlyY ? "" : `x <input type="number" data-f="x"> `}y <input type="number" data-f="y"></div>
      ${scaleKey && sc ? `<div>scale × <input type="number" step="0.01" data-f="k" value="${sc[scaleKey]}"></div>` : ""}
      ${spawnUi}
      ${poseUi}`;
    this.info.querySelector<HTMLSelectElement>("[data-f=pose]")?.addEventListener("change", (e) => {
      ed.setPose(actor!, (e.target as HTMLSelectElement).value || null);
    });
    const num = (f: string) => Number(this.info.querySelector<HTMLInputElement>(`[data-f=${f}]`)?.value);
    this.info.querySelectorAll("input").forEach((inp) =>
      inp.addEventListener("change", () => {
        const val = Number(inp.value);
        if (inp.dataset.f === "k") return ed.setScaleFactor(scaleKey!, val);
        if (["ox", "oy", "ps"].includes(inp.dataset.f!)) return ed.setFit(actor!, num("ox"), num("oy"), num("ps"));
        const p = ed.selPoint();
        if (!p || !Number.isFinite(val)) return;
        ed.setPoint(inp.dataset.f === "x" ? Math.round(val) : p[0], inp.dataset.f === "y" ? Math.round(val) : p[1]);
      }),
    );
    this.update();
  }

  private check(text: string, get: () => boolean, set: (on: boolean) => void, layer = true): HTMLLabelElement {
    const l = document.createElement("label");
    if (layer) l.className = "layer";
    const c = document.createElement("input");
    c.type = "checkbox";
    c.checked = get();
    c.addEventListener("change", () => set(c.checked));
    l.append(c, ` ${text}`);
    return l;
  }
}

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
