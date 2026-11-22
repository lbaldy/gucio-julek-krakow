// Act II: untangle Dratewka's threads. Three spools at the top (red, blue, yellow), a knot in the
// middle, and the three thread ends hanging below. The glowing spool is the one to fill: tap the
// thread end of the same colour and it slides out of the knot and winds on. Red, then blue, then
// the yellow dratwa. A wrong end tugs, the knot shakes, and Gucio says "To nie ta." It can't be
// lost. Everything is drawn in code, so it plays before any art exists; a close-up background
// (TABLE) is used when present.

import { defineMiniGame, type MiniGameCtx } from "../../src/engine/api";

type Col = "red" | "blue" | "yellow";

const TABLE = "scenes/workshop/tangle_closeup.png";
const ORDER: Col[] = ["red", "blue", "yellow"];
const HEX: Record<Col, string> = { red: "#b8432f", blue: "#5f84b8", yellow: "#e0b23a" };
const SPOOL_X: Record<Col, number> = { red: 560, blue: 960, yellow: 1360 };
const SPOOL_Y = 210;
/** Where each loose end hangs (shuffled, so no end is under its own spool). */
const END_X: Record<Col, number> = { yellow: 560, red: 960, blue: 1360 };
const END_Y = 900;
const KNOT: [number, number] = [960, 560];

let round = 0;
let wound: Record<Col, number> = { red: 0, blue: 0, yellow: 0 };
let shake = 0;
let wrongN = 0;
let doneT = -1;

export default defineMiniGame({
  images: [TABLE],

  init() {
    round = 0;
    wound = { red: 0, blue: 0, yellow: 0 };
    shake = 0;
    wrongN = 0;
    doneT = -1;
  },

  update(ctx, dt) {
    if (shake > 0) shake = Math.max(0, shake - dt);
    for (const c of ORDER) if (wound[c] > 0 && wound[c] < 1) wound[c] = Math.min(1, wound[c] + dt / 700);
    if (doneT >= 0 && (doneT += dt) > 1400) ctx.finish();
  },

  pointer(ctx, [x, y], down) {
    if (!down || doneT >= 0 || round >= ORDER.length) return;
    const hit = ORDER.find((c) => !wound[c] && Math.abs(x - END_X[c]) < 140 && Math.abs(y - END_Y) < 140);
    if (!hit) return;
    if (hit === ORDER[round]) {
      wound[hit] = 0.01;
      ctx.api.sfx("pop");
      round++;
      if (round === ORDER.length) doneT = 0;
      else void ctx.api.say("workshop.tangle.right");
    } else {
      shake = 500;
      ctx.api.sfx("boing");
      if (wrongN++ % 2 === 0) void ctx.api.say("workshop.tangle.wrong");
    }
  },

  draw(ctx, c) {
    const bg = ctx.image(TABLE);
    if (bg) c.drawImage(bg, 0, 0, 1920, 1080);
    else {
      c.fillStyle = "#c89a62";
      c.fillRect(0, 0, 1920, 1080);
      c.fillStyle = "rgba(90,63,43,0.18)";
      for (let y = 0; y < 1080; y += 90) c.fillRect(0, y, 1920, 6);
    }
    const target = ORDER[round];
    const dx = shake ? Math.sin(shake / 25) * 14 * (shake / 500) : 0;
    // threads still in the knot: spool → knot → loose end
    for (const col of ORDER) {
      if (wound[col] >= 1) continue;
      const k = wound[col];
      c.strokeStyle = HEX[col];
      c.lineWidth = 14;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(SPOOL_X[col], SPOOL_Y + 70);
      const kx = KNOT[0] + dx + (k ? (SPOOL_X[col] - KNOT[0]) * k : 0);
      const ky = KNOT[1] + (k ? (SPOOL_Y - KNOT[1]) * k : 0);
      c.bezierCurveTo(SPOOL_X[col], 420, kx - 160, ky - 80, kx, ky);
      if (!k) {
        // loops through the knot, then down to the end
        c.bezierCurveTo(kx + 180, ky + 60, kx - 200, ky + 140, kx + 40, ky + 120);
        c.bezierCurveTo(kx + 220, ky + 100, END_X[col], 700, END_X[col], END_Y);
      }
      c.stroke();
    }
    // the knot itself
    if (round < ORDER.length) {
      c.fillStyle = "rgba(90,63,43,0.25)";
      c.beginPath();
      c.ellipse(KNOT[0] + dx, KNOT[1] + 60, 190, 120, 0, 0, Math.PI * 2);
      c.fill();
    }
    // spools: the one to fill glows
    for (const col of ORDER) spool(c, ctx, SPOOL_X[col], SPOOL_Y, col, wound[col], col === target);
    // loose ends: a frayed tassel
    for (const col of ORDER) {
      if (wound[col]) continue;
      c.fillStyle = HEX[col];
      c.beginPath();
      c.arc(END_X[col] + (col === target ? 0 : dx), END_Y, 34, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#5a3f2b";
      c.lineWidth = 4;
      c.stroke();
    }
  },
});

function spool(c: CanvasRenderingContext2D, ctx: MiniGameCtx, x: number, y: number, col: Col, k: number, glow: boolean) {
  if (glow) {
    c.strokeStyle = `rgba(242,193,78,${0.55 + 0.35 * Math.sin(ctx.elapsed / 180)})`;
    c.lineWidth = 10;
    c.strokeRect(x - 110, y - 110, 220, 220);
  }
  // wooden flanges and the core, wound fuller as k grows
  c.fillStyle = "#a07a4c";
  c.fillRect(x - 90, y - 90, 180, 26);
  c.fillRect(x - 90, y + 64, 180, 26);
  c.fillStyle = "#d9b27a";
  c.fillRect(x - 40, y - 64, 80, 128);
  // an empty spool shows a thin band of its colour (a pale tint reads grey on the table)
  const w = 14 + 66 * Math.min(1, k * 1.2);
  c.fillStyle = HEX[col];
  c.fillRect(x - w, y - 64, w * 2, 128);
  c.strokeStyle = "#5a3f2b";
  c.lineWidth = 5;
  c.strokeRect(x - 90, y - 90, 180, 180);
}
