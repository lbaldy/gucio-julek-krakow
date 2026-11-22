"""Local image processing (free, no API calls).

Game space is 1920x1080, and backgrounds are fitted to exactly that, so pixel
coordinates on a background *are* game coordinates.

  python -m tools.imgtools fit     raw/attic/bg_v2.png --out game/scenes/attic/bg.png
  python -m tools.imgtools grid    game/scenes/attic/bg.png --out raw/attic/bg_grid.png
  python -m tools.imgtools overlay attic --out raw/attic/overlay.png
  python -m tools.imgtools trim    raw/chars/hero_cut.png --out game/chars/hero/idle_r.png
  python -m tools.imgtools frames  raw/chars/hero_walk_sheet_cut.png --cols 6 --out-dir game/chars/hero/walk_r
  python -m tools.imgtools patch   raw/attic/bg_full.png --box 820,610,940,700 --out game/scenes/attic/key_patch.png
  python -m tools.imgtools contact raw/style/*.png --out raw/style/contact.png
  python -m tools.imgtools walkloop raw/chars/hero/walk/kling_v1.mp4 --height 500 --out-dir game/chars/hero/walk_r

Relative paths resolve against assets/ (like the generators).
"""
import argparse
import json
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageStat

from tools.common import ASSETS, ROOT

GAME_W, GAME_H = 1920, 1080
GAME_ASSETS = ASSETS / "game"
CONTENT = ROOT / "game" / "content"


def p_in(path: str) -> Path:
    p = Path(path)
    if not p.is_absolute() and not p.exists():
        p = ASSETS / p
    if not p.exists():
        raise SystemExit(f"Not found: {path}")
    return p


def p_out(path: str) -> Path:
    p = Path(path)
    if not p.is_absolute():
        p = ASSETS / p
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def font(size: int):
    return ImageFont.load_default(size=size)


def saved(p: Path):
    print(f"saved: {p.relative_to(ROOT) if p.is_relative_to(ROOT) else p}")


def cmd_fit(a):
    """Cover-resize and crop to the game size. --anchor bottom keeps the floor."""
    w, h = map(int, a.size.split("x"))
    img = Image.open(p_in(a.input)).convert("RGB")
    scale = max(w / img.width, h / img.height)
    img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    x = (img.width - w) // 2
    y = {"top": 0, "center": (img.height - h) // 2, "bottom": img.height - h}[a.anchor]
    out = p_out(a.out)
    img.crop((x, y, x + w, y + h)).save(out)
    saved(out)


def cmd_grid(a):
    """Labelled coordinate grid, used to read off hotspot polygons by eye."""
    img = Image.open(p_in(a.input)).convert("RGBA")
    layer = Image.new("RGBA", img.size)
    d = ImageDraw.Draw(layer)
    f = font(22)
    for x in range(0, img.width, a.step // 2):
        major = x % a.step == 0
        d.line([(x, 0), (x, img.height)], fill=(255, 255, 0, 140 if major else 50), width=2 if major else 1)
    for y in range(0, img.height, a.step // 2):
        major = y % a.step == 0
        d.line([(0, y), (img.width, y)], fill=(255, 255, 0, 140 if major else 50), width=2 if major else 1)
    for x in range(0, img.width, a.step * 2):
        for y in range(0, img.height, a.step * 2):
            d.ellipse([x - 5, y - 5, x + 5, y + 5], fill=(255, 60, 60, 255))
            d.text((x + 8, y + 6), f"{x},{y}", fill=(255, 255, 255, 255), font=f, stroke_width=3, stroke_fill="black")
    out = p_out(a.out)
    Image.alpha_composite(img, layer).convert("RGB").save(out)
    saved(out)


def _poly(d, pts, color, width=3, fill_alpha=50):
    pts = [tuple(p) for p in pts]
    if len(pts) >= 3:
        d.polygon(pts, fill=color + (fill_alpha,), outline=color + (255,), width=width)


def _label(d, xy, text, color):
    d.text(xy, text, fill=color + (255,), font=font(24), stroke_width=3, stroke_fill="black", anchor="mm")


def _centroid(pts):
    return sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)


def cmd_overlay(a):
    """Draw a scene's geometry over its background to verify placement and scale."""
    scene_dir = CONTENT / "scenes" / a.scene
    scene = json.loads((scene_dir / "scene.json").read_text())
    img = Image.open(GAME_ASSETS / scene["background"]).convert("RGBA")
    layer = Image.new("RGBA", img.size)
    d = ImageDraw.Draw(layer)

    for poly in scene.get("walkable", []):
        _poly(d, poly, (0, 220, 0), fill_alpha=45)
    for poly in scene.get("blocked", []):
        _poly(d, poly, (220, 0, 0), fill_alpha=60)
    for kind, color in (("hotspots", (255, 210, 0)), ("exits", (60, 140, 255))):
        for h in scene.get(kind, []):
            _poly(d, h["polygon"], color)
            _label(d, _centroid(h["polygon"]), h["id"], color)
            if "walk_to" in h:
                x, y = h["walk_to"]
                d.ellipse([x - 8, y - 8, x + 8, y + 8], outline=color + (255,), width=3)
                d.line([_centroid(h["polygon"]), (x, y)], fill=color + (160,), width=2)

    for o in scene.get("objects", []):
        sprite_path = GAME_ASSETS / o["sprite"]
        if sprite_path.exists():
            spr = Image.open(sprite_path).convert("RGBA")
            layer.alpha_composite(spr, (int(o["x"]), int(o["y"])))
            d.rectangle([o["x"], o["y"], o["x"] + spr.width, o["y"] + spr.height], outline=(255, 0, 255, 255), width=2)
        _label(d, (o["x"], o["y"] - 14), o["id"], (255, 0, 255))

    # Scale check: a box of the hero's height at the near and far scale lines.
    s = scene.get("scale")
    chars_file = CONTENT / "characters.json"
    hero_h = 500
    if chars_file.exists():
        chars = json.loads(chars_file.read_text())
        hero_h = chars.get(a.hero, {}).get("height_px", hero_h)
    if s:
        for y, k in ((s["near_y"], s["near"]), (s["far_y"], s["far"])):
            d.line([(0, y), (img.width, y)], fill=(255, 255, 255, 120), width=2)
            h = hero_h * k
            w = h * 0.35
            for x in (img.width * 0.25, img.width * 0.75):
                d.rectangle([x - w / 2, y - h, x + w / 2, y], outline=(255, 255, 255, 255), width=3)
            _label(d, (80, y - 16), f"y={y} ×{k}", (255, 255, 255))

    for name, sp in (scene.get("spawns") or {}).items():
        x, y = sp["x"], sp["y"]
        d.line([(x - 14, y), (x + 14, y)], fill=(255, 40, 40, 255), width=4)
        d.line([(x, y - 14), (x, y + 14)], fill=(255, 40, 40, 255), width=4)
        _label(d, (x, y + 28), name, (255, 80, 80))

    out = p_out(a.out)
    Image.alpha_composite(img, layer).convert("RGB").save(out)
    saved(out)


def _trim(img: Image.Image, pad: int) -> tuple[Image.Image, tuple]:
    bbox = img.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    if not bbox:
        raise SystemExit("Image is fully transparent.")
    x0, y0, x1, y1 = bbox
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    x1, y1 = min(img.width, x1 + pad), min(img.height, y1 + pad)
    return img.crop((x0, y0, x1, y1)), (x0, y0, x1, y1)


def cmd_trim(a):
    """Crop to visible pixels; optionally scale to a target height (e.g. character height)."""
    img, bbox = _trim(Image.open(p_in(a.input)).convert("RGBA"), a.pad)
    if a.height:
        img = img.resize((round(img.width * a.height / img.height), a.height), Image.LANCZOS)
    if a.canvas:
        w, h = map(int, a.canvas.split("x"))
        img.thumbnail((w, h), Image.LANCZOS)
        canvas = Image.new("RGBA", (w, h))
        canvas.alpha_composite(img, ((w - img.width) // 2, (h - img.height) // 2))
        img = canvas
    out = p_out(a.out)
    img.save(out)
    saved(out)
    print(f"bbox in source: {bbox}  size: {img.width}x{img.height}")


def cmd_frames(a):
    """Slice a sprite sheet into frames on a shared canvas, aligned bottom-centre (feet)."""
    sheet = Image.open(p_in(a.input)).convert("RGBA")
    cw, ch = sheet.width // a.cols, sheet.height // a.rows
    cells = []
    for r in range(a.rows):
        for c in range(a.cols):
            cell = sheet.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
            if cell.getchannel("A").getbbox():
                cells.append(_trim(cell, 0)[0])
    if a.height:
        tallest = max(c.height for c in cells)
        k = a.height / tallest
        cells = [c.resize((max(1, round(c.width * k)), max(1, round(c.height * k))), Image.LANCZOS) for c in cells]
    W, H = max(c.width for c in cells), max(c.height for c in cells)
    out_dir = p_out(a.out_dir + "/x").parent
    for i, c in enumerate(cells):
        frame = Image.new("RGBA", (W, H))
        frame.alpha_composite(c, ((W - c.width) // 2, H - c.height))
        frame.save(out_dir / f"{i:02d}.png")
    print(f"{len(cells)} frames {W}x{H} → {out_dir.relative_to(ROOT)}")


def _key_flat(img: Image.Image, bg: tuple, lo: int = 14, hi: int = 34) -> Image.Image:
    """Alpha from distance to a flat background colour (max channel), ramped lo..hi.

    Only background-coloured pixels connected to the image border are keyed, so a pale
    character (cream fur on a light-grey backdrop) keeps its insides opaque.
    """
    rgb = img.convert("RGB")
    d = [c for c in ImageChops.difference(rgb, Image.new("RGB", rgb.size, bg)).split()]
    dist = ImageChops.lighter(ImageChops.lighter(d[0], d[1]), d[2])
    alpha = dist.point(lambda v: 0 if v < lo else 255 if v > hi else (v - lo) * 255 // (hi - lo))
    # Border-connected background: close the figure's silhouette (fur outlines have gaps), then
    # flood the outside from a 1px frame around the image; everything not reached is the figure.
    fg = dist.point(lambda v: 255 if v > hi else 0).filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.MinFilter(13))
    pad = Image.new("L", (fg.width + 2, fg.height + 2), 0)
    pad.paste(fg, (1, 1))
    ImageDraw.floodfill(pad, (0, 0), 128)
    outside = pad.crop((1, 1, pad.width - 1, pad.height - 1)).point(lambda v: 255 if v == 128 else 0)
    alpha = ImageChops.composite(alpha, Image.new("L", alpha.size, 255), outside)
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    out = rgb.convert("RGBA")
    out.putalpha(alpha)
    return out


def _drop_specks(img: Image.Image, keep: float = 0.01) -> Image.Image:
    """Clear connected alpha blobs smaller than `keep` × the largest one."""
    a = img.getchannel("A")
    w, h = a.size
    px = a.load()
    seen = bytearray(w * h)
    blobs = []
    for y0 in range(h):
        for x0 in range(w):
            if seen[y0 * w + x0] or px[x0, y0] <= 20:
                continue
            stack, blob = [(x0, y0)], []
            seen[y0 * w + x0] = 1
            while stack:
                x, y = stack.pop()
                blob.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and px[nx, ny] > 20:
                        seen[ny * w + nx] = 1
                        stack.append((nx, ny))
            blobs.append(blob)
    if not blobs:
        return img
    big = max(len(b) for b in blobs)
    for b in blobs:
        if len(b) < big * keep:
            for x, y in b:
                px[x, y] = 0
    img.putalpha(a)
    return img


def cmd_walkloop(a):
    """Turn a walk-in-place video (flat background) into an aligned, looping walk cycle.

    Finds the loop by frame similarity, keys out the background, aligns frames on the
    torso centre and a shared ground line, and reports the stride so the engine's walk
    speed can match the feet (no skating)."""
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["ffmpeg", "-v", "error", "-i", str(p_in(a.input)), "-vf", f"fps={a.src_fps}",
                        f"{tmp}/%04d.png"], check=True)
        src = [Image.open(f).convert("RGB") for f in sorted(Path(tmp).glob("*.png"))]
    small = [im.convert("L").resize((im.width // 8, im.height // 8)) for im in src]
    diff = lambda i, j: ImageStat.Stat(ImageChops.difference(small[i], small[j])).mean[0]
    if a.start is not None and a.period:
        start, period = a.start, a.period
    else:
        lo, hi = a.min_period * a.src_fps // 24, len(src) - a.src_fps // 2
        cands = [(diff(s, s + p), s, p) for p in range(lo, hi) for s in range(a.src_fps // 4, len(src) - p)]
        err, start, period = min(cands)
        print(f"loop: frames {start}..{start + period - 1} ({period / a.src_fps:.2f}s), seam diff {err:.1f}")
    bg = src[0].getpixel((4, 4))
    idx = [start + round(i * period / a.frames) for i in range(a.frames)]
    frames = [_key_flat(src[i], bg) for i in idx]

    def torso_cx(im):
        al = im.getchannel("A")
        _, top, _, bot = al.getbbox()
        band = al.crop((0, top + (bot - top) * 25 // 100, im.width, top + (bot - top) * 45 // 100))
        x0, _, x1, _ = band.point(lambda v: 255 if v > 128 else 0).getbbox()
        return (x0 + x1) / 2

    cxs = [torso_cx(f) for f in frames]
    boxes = [f.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox() for f in frames]
    top, ground = min(b[1] for b in boxes), max(b[3] for b in boxes)
    half = max(max(c - b[0], b[2] - c) for c, b in zip(cxs, boxes)) + 4
    k = a.height / (ground - top)
    size = (round(2 * half * k), a.height)
    out_dir = p_out(a.out_dir + "/x").parent
    feet = []
    for i, (f, c) in enumerate(zip(frames, cxs)):
        fr = _drop_specks(f.crop((round(c - half), top, round(c - half) + round(2 * half), ground)).resize(size, Image.LANCZOS))
        fr.save(out_dir / f"{i:02d}.png")
        al = fr.getchannel("A")
        feet.append([x for x in range(fr.width) if max(al.getpixel((x, y)) for y in range(fr.height - 8, fr.height)) > 128])
    # Stride: the rearmost planted pixel slides backwards at body speed during stance.
    steps = [b[-1] - c[-1] for b, c in zip(feet, feet[1:] + feet[:1]) if b and c and 0 < b[-1] - c[-1] < size[0] / 4]
    steps.sort()
    per_frame = steps[len(steps) // 2] if steps else 0
    print(f"{a.frames} frames {size[0]}x{size[1]} → {out_dir.relative_to(ROOT)}")
    print(f"stride ≈ {per_frame}px/frame at scale 1: speed = {per_frame} × fps "
          f"(12 fps → {per_frame * 12}, 16 → {per_frame * 16}, 18 → {per_frame * 18}, 20 → {per_frame * 20})")


def cmd_patch(a):
    """Cut a box from an image with feathered edges, for state changes painted into a background."""
    x0, y0, x1, y1 = map(int, a.box.split(","))
    img = Image.open(p_in(a.input)).convert("RGBA").crop((x0, y0, x1, y1))
    mask = Image.new("L", img.size, 0)
    f = a.feather
    ImageDraw.Draw(mask).rectangle([f, f, img.width - f, img.height - f], fill=255)
    img.putalpha(mask.filter(ImageFilter.GaussianBlur(f / 2)))
    out = p_out(a.out)
    img.save(out)
    saved(out)
    print(f'place at "x": {x0}, "y": {y0}')


def cmd_contact(a):
    """Labelled side-by-side sheet of candidates, for choosing between them."""
    imgs = [(Path(p).stem, Image.open(p_in(p)).convert("RGBA")) for p in a.inputs]
    tw = a.thumb
    thumbs = []
    for name, im in imgs:
        th = round(im.height * tw / im.width)
        thumbs.append((name, im.resize((tw, th), Image.LANCZOS)))
    cols = min(a.cols, len(thumbs))
    rows = -(-len(thumbs) // cols)
    cell_h = max(t.height for _, t in thumbs) + 40
    sheet = Image.new("RGBA", (cols * (tw + 16) + 16, rows * cell_h + 16), (40, 40, 40, 255))
    d = ImageDraw.Draw(sheet)
    for i, (name, t) in enumerate(thumbs):
        x = 16 + (i % cols) * (tw + 16)
        y = 16 + (i // cols) * cell_h
        sheet.alpha_composite(t, (x, y))
        d.text((x, y + t.height + 6), f"{i + 1}. {name}", fill="white", font=font(22))
    out = p_out(a.out)
    sheet.convert("RGB").save(out)
    saved(out)


def main():
    p = argparse.ArgumentParser(description="Local image tools (no API cost)")
    sub = p.add_subparsers(dest="cmd", required=True)

    sp = sub.add_parser("fit", help="cover-fit to the game resolution")
    sp.add_argument("input"); sp.add_argument("--out", required=True)
    sp.add_argument("--size", default=f"{GAME_W}x{GAME_H}")
    sp.add_argument("--anchor", default="center", choices=["top", "center", "bottom"])
    sp.set_defaults(func=cmd_fit)

    sp = sub.add_parser("grid", help="coordinate grid overlay")
    sp.add_argument("input"); sp.add_argument("--out", required=True)
    sp.add_argument("--step", type=int, default=100)
    sp.set_defaults(func=cmd_grid)

    sp = sub.add_parser("overlay", help="draw scene geometry over its background")
    sp.add_argument("scene"); sp.add_argument("--out", required=True)
    sp.add_argument("--hero", default="hero", help="character whose height is used for the scale check")
    sp.set_defaults(func=cmd_overlay)

    sp = sub.add_parser("trim", help="crop to visible pixels")
    sp.add_argument("input"); sp.add_argument("--out", required=True)
    sp.add_argument("--pad", type=int, default=2)
    sp.add_argument("--height", type=int, help="resize to this height")
    sp.add_argument("--canvas", help="centre on a WxH transparent canvas (e.g. 256x256 icons)")
    sp.set_defaults(func=cmd_trim)

    sp = sub.add_parser("frames", help="slice a sprite sheet into aligned frames")
    sp.add_argument("input"); sp.add_argument("--out-dir", required=True)
    sp.add_argument("--cols", type=int, required=True); sp.add_argument("--rows", type=int, default=1)
    sp.add_argument("--height", type=int, help="scale so the tallest frame has this height")
    sp.set_defaults(func=cmd_frames)

    sp = sub.add_parser("walkloop", help="walk-in-place video → aligned looping walk frames")
    sp.add_argument("input"); sp.add_argument("--out-dir", required=True)
    sp.add_argument("--height", type=int, required=True, help="character height_px")
    sp.add_argument("--frames", type=int, default=16, help="frames in the output loop")
    sp.add_argument("--src-fps", type=int, default=24)
    sp.add_argument("--min-period", type=int, default=14, help="shortest loop to consider, in 24fps frames")
    sp.add_argument("--start", type=int, help="loop start frame (skips auto-detection, with --period)")
    sp.add_argument("--period", type=int, help="loop length in source frames")
    sp.set_defaults(func=cmd_walkloop)

    sp = sub.add_parser("patch", help="feathered crop for background state changes")
    sp.add_argument("input"); sp.add_argument("--out", required=True)
    sp.add_argument("--box", required=True, help="x0,y0,x1,y1")
    sp.add_argument("--feather", type=int, default=12)
    sp.set_defaults(func=cmd_patch)

    sp = sub.add_parser("contact", help="labelled comparison sheet")
    sp.add_argument("inputs", nargs="+"); sp.add_argument("--out", required=True)
    sp.add_argument("--thumb", type=int, default=600); sp.add_argument("--cols", type=int, default=3)
    sp.set_defaults(func=cmd_contact)

    a = p.parse_args()
    a.func(a)


if __name__ == "__main__":
    main()
