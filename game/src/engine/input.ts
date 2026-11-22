// Mouse, touch and keyboard → Game (in game coordinates).

import type { AudioOut } from "./audio";
import type { Game } from "./game";
import type { Renderer } from "./render";

const LONG_PRESS_MS = 450;
const DOUBLE_TAP_MS = 350;
const DOUBLE_TAP_PX = 60; // game pixels

export function bindInput(canvas: HTMLCanvasElement, g: Game, r: Renderer, audio: AudioOut) {
  const pos = (e: { clientX: number; clientY: number }) => r.toGame(e.clientX, e.clientY);

  canvas.addEventListener("mousemove", (e) => g.pointerMove(pos(e)));
  canvas.addEventListener("mousedown", (e) => {
    audio.unlock();
    // detail counts presses in quick succession at one spot: 2+ is a double-click.
    g.pointerDown(pos(e), e.button === 2 ? "right" : "left", e.button !== 2 && e.detail >= 2);
  });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  let press: { timer: number; fired: boolean; start: [number, number] } | null = null;
  let lastTap: { at: number; p: [number, number] } | null = null;
  canvas.addEventListener("touchstart", (e) => {
    audio.unlock();
    const p = pos(e.touches[0]);
    g.pointerMove(p, true);
    const state = { timer: 0, fired: false, start: p };
    state.timer = window.setTimeout(() => {
      state.fired = true;
      g.pointerDown(p, "right");
    }, LONG_PRESS_MS);
    press = state;
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener("touchmove", (e) => {
    const p = pos(e.touches[0]);
    // A drag (steering in a mini-game) is neither a long-press nor a tap.
    if (press && !press.fired && Math.hypot(p[0] - press.start[0], p[1] - press.start[1]) > DOUBLE_TAP_PX) {
      clearTimeout(press.timer);
      press.fired = true;
    }
    g.pointerMove(p, true);
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener("touchend", (e) => {
    if (press && !press.fired) {
      clearTimeout(press.timer);
      const p = pos(e.changedTouches[0]);
      const double = !!lastTap && e.timeStamp - lastTap.at < DOUBLE_TAP_MS && Math.hypot(p[0] - lastTap.p[0], p[1] - lastTap.p[1]) < DOUBLE_TAP_PX;
      lastTap = double ? null : { at: e.timeStamp, p };
      g.pointerDown(p, "left", double, true);
    }
    press = null;
    e.preventDefault();
  }, { passive: false });

  window.addEventListener("keydown", (e) => {
    audio.unlock();
    if (e.key === "F1") e.preventDefault();
    g.key(e.key);
  });
}
