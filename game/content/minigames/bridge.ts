// Act III: mend the footbridge. Four gaps, each with a carved sign on its posts (sun, moon, fish,
// leaf); four planks below, each burned with one of the same signs. Tap a plank, then a gap: the
// matching gap takes it with a wooden "tok", a wrong one bonks and the plank slides back. It can't
// be lost. Signs are drawn in code (simple folk shapes), so it reads before any art exists.

import { defineMiniGame, type MiniGameCtx } from "../../src/engine/api";

type Sign = "sun" | "moon" | "fish" | "leaf";

const BG = "scenes/river/bridge_closeup.png";
const PLANK = "scenes/river/plank_world.png";
const FILL = "scenes/river/closeup_fill.png";

/** Gaps along the bridge, left to right, and the order the planks lie in below (shuffled). */
const GAPS: { sign: Sign; x: number }[] = [
  { sign: "moon", x: 380 },
  { sign: "fish", x: 785 },
  { sign: "sun", x: 1190 },
  { sign: "leaf", x: 1590 },
];
const TRAY: Sign[] = ["sun", "leaf", "moon", "fish"];
const GAP_Y = 415;
const GAP_W = 220;
const GAP_H = 230;
const TRAY_Y = 860;
const TRAY_X = (i: number) => 360 + i * 400;

let placed: Record<Sign, boolean> = { sun: false, moon: false, fish: false, leaf: false };
let picked: Sign | null = null;
let bonk: { sign: Sign; t: number } | null = null;
let good: { sign: Sign; t: number } | null = null;
let wrongN = 0;
let rightN = 0;
let doneT = -1;

function lift(ctx: MiniGameCtx, s: Sign) {
  picked = s;
  ctx.api.sfx("pop");
}

export default defineMiniGame({
  images: [BG, PLANK, FILL],

  init() {
    placed = { sun: false, moon: false, fish: false, leaf: false };
    picked = null;
    bonk = good = null;
    wrongN = rightN = 0;
    doneT = -1;
  },

  update(ctx, dt) {
    if (bonk && (bonk.t += dt) > 500) bonk = null;
    if (good && (good.t += dt) > 500) good = null;
    if (doneT >= 0 && (doneT += dt) > 1600) ctx.finish();
  },

  pointer(ctx, [x, y], down) {
    if (!down || doneT >= 0) return;
    // a plank in the tray
    const ti = TRAY.findIndex((s, i) => !placed[s] && Math.abs(x - TRAY_X(i)) < 170 && Math.abs(y - TRAY_Y) < 90);
    if (ti >= 0) return lift(ctx, TRAY[ti]);
    // a gap
    const gap = GAPS.find((gp) => !placed[gp.sign] && Math.abs(x - gp.x) < GAP_W / 2 && Math.abs(y - GAP_Y) < GAP_H);
    if (!gap || !picked) return;
    if (gap.sign === picked) {
      placed[picked] = true;
      good = { sign: picked, t: 0 };
      picked = null;
      ctx.api.sfx("ding");
      void ctx.api.say(`river.bridge.right.${(rightN++ % 3) + 1}`);
      if (Object.values(placed).every(Boolean)) doneT = 0;
    } else {
      bonk = { sign: picked, t: 0 };
      picked = null;
      ctx.api.sfx("boing");
      void ctx.api.say(`river.bridge.wrong.${(wrongN++ % 3) + 1}`);
    }
  },

  draw(ctx, c) {
    const bg = ctx.image(BG);
    if (bg) c.drawImage(bg, 0, 0, 1920, 1080);
    else {
      // water and two banks
      c.fillStyle = "#6f9fb0";
      c.fillRect(0, 0, 1920, 1080);
      c.fillStyle = "#7fa84a";
      c.fillRect(0, 0, 200, 1080);
      c.fillRect(1720, 0, 200, 1080);
      // the bridge: two rails, mossy old planks between the gaps
      c.fillStyle = "#a07a4c";
      c.fillRect(200, GAP_Y - GAP_H / 2 - 30, 1520, 24);
      c.fillRect(200, GAP_Y + GAP_H / 2 + 6, 1520, 24);
      c.fillStyle = "#b08a5a";
      for (let x = 200; x < 1720; x += 60) {
        if (GAPS.some((g) => Math.abs(x + 30 - g.x) < GAP_W / 2)) continue;
        c.fillRect(x + 4, GAP_Y - GAP_H / 2, 52, GAP_H);
      }
    }
    // gaps with their carved signs; filled ones show the plank
    for (const gp of GAPS) {
      const x0 = gp.x - GAP_W / 2;
      const y0 = GAP_Y - GAP_H / 2;
      if (placed[gp.sign]) {
        // the gap is filled with fresh poles matching the deck (a slice of the close-up art)
        const fill = ctx.image(FILL);
        if (fill) {
          const k = good?.sign === gp.sign ? 1.06 : 1;
          c.save();
          c.translate(gp.x, GAP_Y);
          c.scale(k, k);
          c.drawImage(fill, -fill.width / 2, -fill.height / 2);
          sign(c, gp.sign, 0, 0, 34);
          c.restore();
        } else plank(ctx, c, gp.x, GAP_Y, GAP_W - 10, GAP_H - 10, gp.sign, good?.sign === gp.sign ? 1.06 : 1);
      } else {
        if (!bg) {
          c.fillStyle = "rgba(20,40,50,0.55)";
          c.fillRect(x0, y0, GAP_W, GAP_H);
        }
        const glow = picked ? 0.55 + 0.35 * Math.sin(ctx.elapsed / 180) : 0.35;
        c.strokeStyle = `rgba(242,193,78,${glow})`;
        c.lineWidth = 6;
        c.strokeRect(x0, y0, GAP_W, GAP_H);
      }
      // the sign on the post above the gap (painted in the close-up art; drawn only without it)
      if (bg) continue;
      c.fillStyle = "#e9dcc0";
      c.beginPath();
      c.arc(gp.x, GAP_Y - GAP_H / 2 - 120, 62, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#5a3f2b";
      c.lineWidth = 5;
      c.stroke();
      sign(c, gp.sign, gp.x, GAP_Y - GAP_H / 2 - 120, 40);
    }
    // the planks still in the tray
    TRAY.forEach((s, i) => {
      if (placed[s]) return;
      let dx = 0;
      if (bonk?.sign === s) dx = Math.sin(bonk.t / 30) * 18 * (1 - bonk.t / 500);
      const up = picked === s ? -40 : 0;
      plank(ctx, c, TRAY_X(i) + dx, TRAY_Y + up, 300, 140, s, picked === s ? 1.08 : 1);
      if (picked === s) {
        c.strokeStyle = "#f2c14e";
        c.lineWidth = 8;
        c.strokeRect(TRAY_X(i) - 170, TRAY_Y + up - 70, 340, 140);
      }
    });
  },
});

function plank(ctx: MiniGameCtx, c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, s: Sign, k: number) {
  const im = ctx.image(PLANK);
  c.save();
  c.translate(x, y);
  c.scale(k, k);
  if (im) c.drawImage(im, -w / 2, -h / 2, w, h);
  else {
    c.fillStyle = "#d9b27a";
    c.strokeStyle = "#5a3f2b";
    c.lineWidth = 5;
    c.beginPath();
    c.roundRect(-w / 2, -h / 2, w, h, 14);
    c.fill();
    c.stroke();
  }
  sign(c, s, 0, 0, Math.min(w, h) * 0.32);
  c.restore();
}

/** The four folk signs, burned/carved in warm brown. */
function sign(c: CanvasRenderingContext2D, s: Sign, x: number, y: number, r: number) {
  c.save();
  c.translate(x, y);
  c.fillStyle = "#7a3b22";
  c.strokeStyle = "#7a3b22";
  c.lineWidth = r * 0.16;
  c.lineCap = "round";
  c.beginPath();
  if (s === "sun") {
    c.arc(0, 0, r * 0.45, 0, Math.PI * 2);
    c.fill();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      c.moveTo(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62);
      c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.stroke();
  } else if (s === "moon") {
    c.arc(0, 0, r * 0.85, Math.PI * 0.3, Math.PI * 1.7);
    c.arc(r * 0.35, 0, r * 0.62, Math.PI * 1.6, Math.PI * 0.4, true);
    c.fill();
  } else if (s === "fish") {
    c.ellipse(-r * 0.15, 0, r * 0.62, r * 0.36, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(r * 0.4, 0);
    c.lineTo(r * 0.95, -r * 0.4);
    c.lineTo(r * 0.95, r * 0.4);
    c.closePath();
    c.fill();
  } else {
    c.ellipse(0, 0, r * 0.9, r * 0.42, -0.5, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#e9dcc0";
    c.lineWidth = r * 0.08;
    c.beginPath();
    c.moveTo(-r * 0.75, r * 0.38);
    c.lineTo(r * 0.75, -r * 0.38);
    c.stroke();
  }
  c.restore();
}
