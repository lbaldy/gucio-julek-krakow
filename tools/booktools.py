"""Picture-book tools (free, local). The book lives in book/; see the book-* skills.

  python -m tools.booktools printfit raw/book/s03_up.png --kind spread --out book/art/s03.jpg
  python -m tools.booktools compose  game/scenes/kitchen/bg.png --put raw/book/hero_reach_cut.png:900,980,620 --out raw/book/s03_comp.png
  python -m tools.booktools guides   book/art/s03.png --kind spread --id s03 --out raw/book/s03_guides.png
  python -m tools.booktools check                       # art sizes, page parity, text ids
  python -m tools.booktools render                      # book/out/book.html + book/out/book.pdf
  python -m tools.booktools proof [--pairs 2,3]         # book/out/proof/pair_NN.png, facing pages as a reader sees them

Image paths resolve against assets/ (like the other tools). book.json, text.json
and the layout live in book/ at the project root.
"""
import argparse
import html
import json
import os
import re
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

from tools.common import ASSETS, ROOT
from tools.imgtools import font, p_in, p_out, saved

BOOK = (ROOT / os.environ.get("BOOK_DIR", "book")).resolve()  # override (e.g. book/cover); relative to the project root
OUT = BOOK / "out"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CSS_PX_PER_MM = 96 / 25.4

# A one-letter word never ends a line (Polish "sierotki"; harmless for English "a"/"I").
ORPHANS = re.compile(r"(?<![\w])([aiouwzAIOUWZ]|[Ss]ię)\s+")


def load_book() -> dict:
    f = BOOK / "book.json"
    if not f.exists():
        raise SystemExit("Missing book/book.json; see the book-adapt skill.")
    return json.loads(f.read_text())


def load_text() -> dict:
    f = BOOK / "text.json"
    return json.loads(f.read_text()) if f.exists() else {}


def fmt(book):
    f = book["format"]
    return f["trim_mm"][0], f["trim_mm"][1], f["bleed_mm"], f["safe_mm"], f.get("gutter_mm", 15), f["dpi"]


def art_px(book, kind):
    """Exact pixel size a page/spread image must have: trim + bleed on every side, at dpi."""
    tw, th, b, _, _, dpi = fmt(book)
    w_mm = (2 * tw if kind == "spread" else tw) + 2 * b
    h_mm = th + 2 * b
    return round(w_mm / 25.4 * dpi), round(h_mm / 25.4 * dpi)


def paginate(book):
    """Assign page numbers. Page 1 is a right-hand page; a spread must start on an even page."""
    n, out = 1, []
    for p in book["pages"]:
        span = 2 if p["kind"] == "spread" else 1
        out.append((n, p))
        n += span
    return out, n - 1


# ---------- image commands ----------

def cmd_printfit(a):
    book = load_book()
    w, h = art_px(book, a.kind)
    img = Image.open(p_in(a.input)).convert("RGB")
    scale = max(w / img.width, h / img.height)
    if scale > 1.02:
        print(f"warning: upscaling x{scale:.2f} locally; upscale with fal first (book-art skill)")
    img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    x = {"left": 0, "center": (img.width - w) // 2, "right": img.width - w}[a.hanchor]
    y = {"top": 0, "center": (img.height - h) // 2, "bottom": img.height - h}[a.anchor]
    out = p_out(a.out)
    dpi = book["format"]["dpi"]
    img = img.crop((x, y, x + w, y + h))
    if out.suffix.lower() in (".jpg", ".jpeg"):
        # print finals: Chrome embeds JPEGs as-is (PNGs get re-compressed per page, ~10x larger)
        img.save(out, dpi=(dpi, dpi), quality=95, subsampling=0)
    else:
        img.save(out, dpi=(dpi, dpi))
    saved(out)
    print(f"{w}x{h}px @ {dpi} dpi")


def cmd_compose(a):
    """Layout draft: paste cut-out characters onto a background (feet at x,y, scaled to height)."""
    bg = Image.open(p_in(a.bg)).convert("RGBA")
    for spec in a.put:
        path, nums = spec.rsplit(":", 1)
        parts = nums.split(",")
        cx, fy, hh = int(parts[0]), int(parts[1]), int(parts[2])
        flip = len(parts) > 3 and parts[3] == "flip"
        sp = Image.open(p_in(path)).convert("RGBA")
        sp = sp.crop(sp.getbbox())
        sp = sp.resize((round(sp.width * hh / sp.height), hh), Image.LANCZOS)
        if flip:
            sp = sp.transpose(Image.FLIP_LEFT_RIGHT)
        bg.alpha_composite(sp, (cx - sp.width // 2, fy - sp.height))
    out = p_out(a.out)
    bg.convert("RGB").save(out)
    saved(out)


def cmd_guides(a):
    """Draw bleed, trim, safe area, the gutter band and the page's text boxes over its art."""
    book = load_book()
    tw, th, b, safe, gutter, _ = fmt(book)
    img = Image.open(p_in(a.input)).convert("RGB")
    pages = 2 if a.kind == "spread" else 1
    w_mm = pages * tw + 2 * b
    s = img.width / w_mm  # px per mm
    d = ImageDraw.Draw(img)
    lw = max(2, img.width // 800)

    def r(x0, y0, x1, y1, col):
        d.rectangle([x0 * s, y0 * s, x1 * s, y1 * s], outline=col, width=lw)

    r(b, b, b + pages * tw, b + th, (40, 90, 220))                       # trim (blue)
    for i in range(pages):                                               # safe (green)
        x0 = b + i * tw
        r(x0 + safe, b + safe, x0 + tw - safe, b + th - safe, (40, 160, 60))
    if pages == 2:                                                       # gutter (orange)
        fx = b + tw
        r(fx - gutter, b, fx + gutter, b + th, (240, 140, 20))
        d.line([fx * s, 0, fx * s, img.height], fill=(240, 140, 20), width=lw)
    if a.id:
        page = next((p for p in book["pages"] if p["id"] == a.id), None)
        if page is None:
            raise SystemExit(f"No page {a.id} in book.json")
        for t in page.get("text", []):
            if "box" not in t:
                continue
            x, y, w, h = t["box"]
            x0 = b + (tw if t.get("page") == "right" and pages == 2 else 0) + x
            r(x0, b + y, x0 + w, b + y + h, (200, 40, 160))              # text box (magenta)
            d.text((x0 * s + 8, (b + y) * s + 8), t["line"], fill=(200, 40, 160), font=font(max(20, img.width // 90)))
    out = p_out(a.out)
    img.thumbnail((2400, 2400))
    img.save(out)
    saved(out)
    print("blue = trim, green = safe area, orange = gutter (no faces or text), magenta = text boxes")


# ---------- book commands ----------

def cmd_check(a):
    book, text = load_book(), load_text()
    tw, th, b, safe, gutter, dpi = fmt(book)
    problems, warnings = [], []
    numbered, total = paginate(book)
    ids = set()
    for n, p in numbered:
        pid = p["id"]
        if pid in ids:
            problems.append(f"{pid}: duplicate id")
        ids.add(pid)
        if p["kind"] == "spread" and n % 2:
            problems.append(f"{pid}: spread starts on page {n} (odd); spreads must start on an even page")
        if p.get("art"):
            f = ASSETS / p["art"]
            if not f.exists():
                warnings.append(f"{pid}: art missing ({p['art']})")
            else:
                want = art_px(book, "spread" if p["kind"] == "spread" or p.get("half") else "page")
                with Image.open(f) as im:
                    got = im.size
                if got != want:
                    eff = dpi * got[0] / want[0]
                    msg = f"{pid}: art is {got[0]}x{got[1]}, needs {want[0]}x{want[1]} (≈{eff:.0f} dpi); run printfit"
                    (problems if eff < 250 else warnings).append(msg)
        elif p["kind"] != "text":
            warnings.append(f"{pid}: no art yet")
        for t in p.get("text", []):
            if t["line"] not in text:
                problems.append(f"{pid}: text id {t['line']} not in text.json")
            if "box" not in t:
                warnings.append(f"{pid}: text {t['line']} has no box yet (rendered in the default box)")
                continue
            x, y, w, h = t["box"]
            if x < safe or y < safe or x + w > tw - safe or y + h > th - safe:
                problems.append(f"{pid}: text box {t['line']} leaves the safe area")
            if p["kind"] == "spread":
                fold_side = x + w > tw - gutter if t.get("page", "left") == "left" else x < gutter
                if fold_side:
                    problems.append(f"{pid}: text box {t['line']} runs into the gutter")
    used = {t["line"] for p in book["pages"] for t in p.get("text", [])}
    for k in text:
        if k not in used and not k.startswith("_"):
            warnings.append(f"text id {k} is not placed on any page")
    print(f"{total} pages ({'OK, multiple of 4' if total % 4 == 0 else 'NOT a multiple of 4: printers bind in 4-page signatures'})")
    if total % 4 and not book.get("single_sheet"):  # a cover is one sheet, not a signature
        problems.append(f"page count {total} is not a multiple of 4")
    for w in warnings:
        print("warn:", w)
    for p in problems:
        print("FAIL:", p)
    if problems:
        raise SystemExit(1)
    print("check passed" + (" (with warnings)" if warnings else ""))


def para(s: str) -> str:
    s = html.escape(s)
    s = ORPHANS.sub(lambda m: m.group(1) + "&nbsp;", s)
    # a dash inside a paragraph never starts a line (that reads as a new speaker): glue it to the word before
    s = re.sub(r"(?<=\S) +— ", "&nbsp;— ", s)
    # hyphenated words (HA-HA, robot-odkurzacz) are never split at the hyphen
    s = re.sub(r"(\S+-\S+)", r'<span style="white-space:nowrap">\1</span>', s)
    return s.replace("\n", "<br>")


def build_html(book, text, proof=False) -> str:
    tw, th, b, safe, gutter, dpi = fmt(book)
    pw, ph = tw + 2 * b, th + 2 * b
    numbered, _ = paginate(book)
    rel = lambda p: (ASSETS / p).as_uri()  # noqa: E731

    def text_blocks(p, side):
        out = []
        for t in p.get("text", []):
            if p["kind"] == "spread" and t.get("page", "left") != side:
                continue
            x, y, w, h = t.get("box", [safe, safe, tw - 2 * safe, th / 3])
            style = t.get("style", "on-light")
            size = t.get("size_pt", book.get("body_pt", 20))
            align = t.get("align", "left")
            paras = "".join(f"<p>{para(s)}</p>" for s in text.get(t["line"], f"[{t['line']}]").split("\n\n"))
            out.append(
                f'<div class="text {style}" data-line="{t["line"]}" style="left:{x + b}mm;top:{y + b}mm;'
                f'width:{w}mm;height:{h}mm;font-size:{size}pt;text-align:{align}">{paras}</div>')
        return "".join(out)

    pages = []
    for n, p in numbered:
        kind = p["kind"]
        sides = ["left", "right"] if kind == "spread" else [None]
        for i, side in enumerate(sides):
            num = n + i
            cls = f'page kind-{kind} {"verso" if num % 2 == 0 else "recto"} {p.get("class", "")}'.strip()
            art = ""
            if p.get("art"):
                if kind == "spread":
                    # each half shows its side of the spread; the inner bleed shows a sliver of the other half
                    off = 0 if side == "left" else -tw
                    art = (f'<img class="art" src="{rel(p["art"])}" '
                           f'style="width:{2 * tw + 2 * b}mm;height:{ph}mm;left:{off}mm">')
                elif p.get("half"):
                    # one half of a spread-sized image as a single page (e.g. front/back cover from one wrap picture)
                    off = 0 if p["half"] == "left" else -tw
                    art = (f'<img class="art" src="{rel(p["art"])}" '
                           f'style="width:{2 * tw + 2 * b}mm;height:{ph}mm;left:{off}mm">')
                else:
                    art = f'<img class="art" src="{rel(p["art"])}" style="width:{pw}mm;height:{ph}mm;left:0">'
            spot = ""
            if p.get("spot"):
                sx, sy, sw = p["spot"]["box"]
                spot = f'<img class="spot" src="{rel(p["spot"]["art"])}" style="left:{sx + b}mm;top:{sy + b}mm;width:{sw}mm">'
            folio = "" if p.get("no_folio") or kind == "spread" and not p.get("folio") else \
                f'<div class="folio">{num + book.get("folio_offset", 0)}</div>'
            pages.append(f'<section class="{cls}" data-id="{p["id"]}" data-n="{num}">{art}{spot}'
                         f'{text_blocks(p, side or "left")}{folio}</section>')

    css = (BOOK / "layout" / "book.css").read_text() if (BOOK / "layout" / "book.css").exists() else ""
    vars_ = (f":root{{--pw:{pw}mm;--ph:{ph}mm;--bleed:{b}mm;--safe:{safe}mm;--trim-w:{tw}mm;"
             f"--trim-h:{th}mm;--gutter:{gutter}mm}}"
             f"@page{{size:{pw}mm {ph}mm;margin:0}}")
    proof_js = """
<script>
const q = new URLSearchParams(location.search), pair = q.get('pair');
if (pair !== null) {
  document.body.classList.add('proof');
  const L = 2 * +pair, R = L + 1;
  document.querySelectorAll('.page').forEach(s => { const n = +s.dataset.n; if (n !== L && n !== R) s.remove(); });
  if (!document.querySelector(`[data-n="${L}"]`)) document.body.insertAdjacentHTML('afterbegin', '<section class="page blank"></section>');
}
</script>"""
    return (f'<!doctype html><html lang="{book.get("lang", "pl")}"><head><meta charset="utf-8">'
            f'<title>{html.escape(book["title"])}</title><style>{vars_}\n{css}</style></head>'
            f'<body>{"".join(pages)}{proof_js}</body></html>')


def chrome(*args):
    if not Path(CHROME).exists():
        raise SystemExit(f"Chrome not found at {CHROME}")
    r = subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                        "--allow-file-access-from-files", "--run-all-compositor-stages-before-draw",
                        "--virtual-time-budget=10000", *args],
                       capture_output=True, text=True, timeout=300)
    if r.returncode:
        raise SystemExit(r.stderr[-2000:])


def cmd_render(a):
    book, text = load_book(), load_text()
    OUT.mkdir(parents=True, exist_ok=True)
    page_html = OUT / "book.html"
    page_html.write_text(build_html(book, text))
    print(f"saved: {page_html}")
    if a.html_only:
        return
    pdf = OUT / (a.name or "book.pdf")
    chrome("--no-pdf-header-footer", f"--print-to-pdf={pdf}", page_html.as_uri())
    _, total = paginate(book)
    print(f"saved: {pdf} ({total} pages, {pdf.stat().st_size / 1e6:.1f} MB)")
    print_ready(pdf, book)


PT_PER_MM = 72 / 25.4


def print_ready(pdf: Path, book, slug_mm: float = 10, mark_mm: float = 5):
    """Make the PDF printer-ready: set TrimBox/BleedBox on every page of `pdf`, and write
    `<name>_print.pdf` with crop marks in a white slug around the bleed (marks start at the
    bleed edge so they never touch the art). Needs pypdf."""
    try:
        from pypdf import PdfReader, PdfWriter, Transformation
        from pypdf.generic import ArrayObject, ContentStream, FloatObject, NameObject, RectangleObject
    except ImportError:
        print("pypdf not installed: PDF has no TrimBox/BleedBox and no crop marks")
        return
    tw, th, b, *_ = fmt(book)
    TW, TH, B = tw * PT_PER_MM, th * PT_PER_MM, b * PT_PER_MM
    S, M = slug_mm * PT_PER_MM, mark_mm * PT_PER_MM

    def boxes(page, ox=0.0, oy=0.0):
        # content is laid out from the top-left corner of the (Chrome-rounded) media box
        top = float(page.mediabox.top) if not (ox or oy) else oy + B + TH + B
        trim = RectangleObject([ox + B, top - B - TH, ox + B + TW, top - B])
        mb = page.mediabox  # Chrome rounds the page ~0.1 mm short: keep the boxes inside the media box
        bleed = RectangleObject([max(ox, float(mb.left)), max(top - 2 * B - TH, float(mb.bottom)),
                                 min(ox + TW + 2 * B, float(mb.right)), top])
        page.trimbox, page.bleedbox = trim, bleed
        return trim

    src = PdfReader(pdf)
    plain, marked = PdfWriter(), PdfWriter()
    for page in src.pages:
        p = plain.add_page(page)
        boxes(p)
    plain.add_metadata({"/Title": book.get("title", "")})
    plain.write(pdf)

    src = PdfReader(pdf)
    for page in src.pages:
        h = float(page.mediabox.height)
        W, H = TW + 2 * B + 2 * S, TH + 2 * B + 2 * S
        new = marked.add_blank_page(width=W, height=H)
        # move the page so its bleed sits inside the slug (top-left aligned, as laid out)
        new.merge_transformed_page(page, Transformation().translate(S, H - S - h))
        new.mediabox = RectangleObject([0, 0, W, H])
        trim = boxes(new, S, S)
        x0, y0, x1, y1 = (float(v) for v in trim)
        ops = ["q", "0 0 0 1 K", "0.25 w"]
        g = B  # gap: marks start at the bleed edge
        for x in (x0, x1):
            for y, d in ((y0, -1), (y1, 1)):
                ops.append(f"{x:.3f} {y + d * g:.3f} m {x:.3f} {y + d * (g + M):.3f} l S")
        for y in (y0, y1):
            for x, d in ((x0, -1), (x1, 1)):
                ops.append(f"{x + d * g:.3f} {y:.3f} m {x + d * (g + M):.3f} {y:.3f} l S")
        ops.append("Q")
        cs = ContentStream(None, marked)
        cs.set_data("\n".join(ops).encode())
        contents = new.get_contents()
        arr = ArrayObject()
        if contents is not None:
            arr.append(marked._add_object(contents))
        arr.append(marked._add_object(cs))
        new[NameObject("/Contents")] = arr
    marked.add_metadata({"/Title": book.get("title", "")})
    out = pdf.with_name(pdf.stem + "_print.pdf")
    marked.write(out)
    print(f"print-ready: TrimBox {tw}x{th} mm + BleedBox {b} mm in {pdf.name}; with crop marks: {out.name}")


def cmd_proof(a):
    book, text = load_book(), load_text()
    tw, th, b, *_ = fmt(book)
    OUT.mkdir(parents=True, exist_ok=True)
    page_html = OUT / "book.html"
    page_html.write_text(build_html(book, text))
    _, total = paginate(book)
    pairs = [int(x) for x in a.pairs.split(",")] if a.pairs else range(0, total // 2 + 1)
    w = round(2 * (tw + 2 * b) * CSS_PX_PER_MM) + 40
    h = round((th + 2 * b) * CSS_PX_PER_MM) + 40
    d = OUT / "proof"
    d.mkdir(exist_ok=True)
    for i in pairs:
        png = d / f"pair_{i:02d}.png"
        chrome(f"--screenshot={png}", f"--window-size={w},{h}", "--force-device-scale-factor=1",
               page_html.as_uri() + f"?pair={i}")
        print(f"saved: {png}  (pages {2 * i}–{2 * i + 1})")


def text_height_mm(txt: str, width_mm: float, size_pt: float, font_path: Path) -> float:
    """Height of a text block as book.css sets it (line-height 1.38, 0.55em paragraph gap)."""
    from PIL import ImageFont
    px_per_mm = 10  # measure at 254 dpi; only ratios matter
    size_px = size_pt / 72 * 25.4 * px_per_mm
    f = ImageFont.truetype(str(font_path), round(size_px))
    maxw = width_mm * px_per_mm
    lines = 0
    paras = txt.split("\n\n")
    for para in paras:
        for hard in para.split("\n"):
            cur = ""
            for w in hard.split():
                trial = (cur + " " + w).strip()
                if f.getlength(trial) <= maxw or not cur:
                    cur = trial
                else:
                    lines += 1
                    cur = w
            lines += 1
    line_mm = size_pt * 1.38 / 72 * 25.4
    gap_mm = size_pt * 0.55 / 72 * 25.4
    return lines * line_mm + (len(paras) - 1) * gap_mm + 1.5


def cmd_autoplace(a):
    """For every text on a page with art, search box positions/widths inside the safe area
    (and out of the gutter) and pick the calmest one: low edge density, even tone, near the top.
    The style follows the tone underneath: light → on-light, dark → on-dark, mixed/busy → panel."""
    import numpy as np
    book, text = load_book(), load_text()
    tw, th, b, safe, gutter, _ = fmt(book)
    font_path = ROOT / a.font
    body = book.get("body_pt", 18)
    want = set(a.ids.split(",")) if a.ids else None
    for p in book["pages"]:
        if p.get("lock") or not p.get("art") or (want and p["id"] not in want):
            continue
        im = Image.open(ASSETS / p["art"]).convert("L")
        pages = 2 if p["kind"] == "spread" else 1
        W, H = pages * tw + 2 * b, th + 2 * b
        g = np.asarray(im.resize((round(W), round(H)), Image.BILINEAR), dtype=float) / 255  # 1 px = 1 mm
        gx = np.abs(np.diff(g, axis=1, prepend=g[:, :1]))
        gy = np.abs(np.diff(g, axis=0, prepend=g[:1, :]))
        edges = gx + gy
        # spread each edge over ~4 mm so a curtain or a face near the text counts too
        from PIL import ImageFilter
        e_img = Image.fromarray(np.clip(edges * 255 * 4, 0, 255).astype("uint8")).filter(ImageFilter.MaxFilter(5))
        edges = np.asarray(e_img.filter(ImageFilter.BoxBlur(2)), dtype=float) / 255 / 4
        for t in p.get("text", []):
            side = t.get("page", "left")
            x_off = b + (tw if pages == 2 and side == "right" else 0)
            lo_x = safe + (gutter if pages == 2 and side == "right" else 0)
            hi_x = tw - safe - (gutter if pages == 2 and side == "left" else 0)
            size = t.get("size_pt", body)
            best = None
            for w in (80, 92, 104, 116, 126):
                if w > hi_x - lo_x:
                    continue
                for panel in (False, True):
                    inner = w - (10 if panel else 0)
                    h = text_height_mm(text.get(t["line"], ""), inner, size, font_path) + (8 if panel else 0)
                    if h > th - 2 * safe:
                        continue
                    for y in range(round(safe), round(th - safe - h) + 1, 4):
                        for x in range(round(lo_x), round(hi_x - w) + 1, 4):
                            X0, Y0 = round(x_off + x), round(b + y)
                            reg = g[Y0:Y0 + round(h), X0:X0 + w]
                            ereg = edges[Y0:Y0 + round(h), X0:X0 + w]
                            e = ereg.mean() + 1.5 * float(np.percentile(ereg, 92))
                            lum, spread_ = reg.mean(), reg.std()
                            calm = e * 6 + spread_ * 2
                            if panel:
                                cost = 0.9 + calm * 0.15          # a panel always works, but is a last resort
                            elif lum > 0.62 or lum < 0.38:
                                cost = calm
                            else:
                                continue                          # mid-tone without a panel: poor contrast
                            cost += y / th * 0.35                 # prefer the top (reading order)
                            cost += (126 - w) / 126 * 0.10        # prefer wider, shorter blocks
                            if best is None or cost < best[0]:
                                style = "panel" if panel else ("on-light" if lum > 0.5 else "on-dark")
                                best = (cost, [x, y, w, round(h + 2)], style)
            if best is None:
                print(f"{p['id']} {t['line']}: no place found; keeping current box")
                continue
            keep = [c for c in t.get("style", "").split() if c in ("title", "v-center", "v-bottom")]
            t["box"], t["style"] = best[1], " ".join([best[2]] + keep)
            print(f"{p['id']:>4} {t['line']:<6} {side:<5} box={best[1]} {best[2]:<8} cost={best[0]:.2f}")
    (BOOK / "book.json").write_text(json.dumps(book, ensure_ascii=False, indent=1))
    print("book.json updated; proof and review every pair")


def main():
    p = argparse.ArgumentParser(description="Picture-book tools (no API cost)")
    sub = p.add_subparsers(dest="cmd", required=True)

    sp = sub.add_parser("printfit", help="cover-fit art to the exact print size (trim + bleed at dpi)")
    sp.add_argument("input"); sp.add_argument("--out", required=True)
    sp.add_argument("--kind", choices=["page", "spread"], required=True)
    sp.add_argument("--anchor", default="center", choices=["top", "center", "bottom"])
    sp.add_argument("--hanchor", default="center", choices=["left", "center", "right"])
    sp.set_defaults(func=cmd_printfit)

    sp = sub.add_parser("compose", help="paste cut-out characters onto a background (layout draft)")
    sp.add_argument("bg"); sp.add_argument("--out", required=True)
    sp.add_argument("--put", action="append", required=True,
                    help="cutout.png:feet_x,feet_y,height[,flip]  (background pixels); repeatable")
    sp.set_defaults(func=cmd_compose)

    sp = sub.add_parser("guides", help="trim / safe / gutter / text-box overlay for composition checks")
    sp.add_argument("input"); sp.add_argument("--out", required=True)
    sp.add_argument("--kind", choices=["page", "spread"], required=True)
    sp.add_argument("--id", help="page id in book.json, to draw its text boxes")
    sp.set_defaults(func=cmd_guides)

    sp = sub.add_parser("check", help="validate book.json, text.json and art sizes")
    sp.set_defaults(func=cmd_check)

    sp = sub.add_parser("render", help="build book/out/book.html and print it to PDF with headless Chrome")
    sp.add_argument("--html-only", action="store_true"); sp.add_argument("--name", help="PDF file name")
    sp.set_defaults(func=cmd_render)

    sp = sub.add_parser("autoplace", help="put each text box on the calmest area of its art (writes book.json)")
    sp.add_argument("--ids", help="comma list of page ids (default: all unlocked pages with art)")
    sp.add_argument("--font", default="book/fonts/Andika-Regular.ttf", help="body font, relative to the project root")
    sp.set_defaults(func=cmd_autoplace)

    sp = sub.add_parser("proof", help="screenshot facing-page pairs to book/out/proof/")
    sp.add_argument("--pairs", help="comma list of pair numbers (pair N = pages 2N and 2N+1)")
    sp.set_defaults(func=cmd_proof)

    a = p.parse_args()
    a.func(a)


if __name__ == "__main__":
    main()
