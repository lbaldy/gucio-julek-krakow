---
name: book-layout
description: Typeset and produce the picture book — DTP and print production. Bootstraps book/ (layout CSS, fonts), places text on pages, renders a print-ready PDF with headless Chrome (tools/booktools.py), proofs facing pages as images, runs preflight (page count, bleed, resolution, fonts) and prepares the cover and printer hand-off. Use after book-adapt has a page plan, and every time text or art changes.
---

# Book layout and production (DTP)

The layout is HTML/CSS printed to PDF by headless Chrome. There's nothing to
install, it's versionable, and it's the same web stack as the game.
`tools/booktools.py` builds `book/out/book.html` from `book/book.json` +
`book/text.json` + `book/layout/book.css`, then prints it. Everything here is free.

```
book/
  book.md            adaptation design (book-adapt)
  book.json          format + page list (book-adapt writes pages; this skill adds text boxes)
  text.json          every printed word (book-adapt)
  layout/book.css    typography and styles (from this skill's template/)
  fonts/             OFL fonts + their licence files
  out/               book.html, book.pdf, proof/pair_NN.png (generated; not committed)
assets/book/art/     print-ready art (book-art)
```

## 1. Bootstrap (once)

1. `mkdir -p book/layout book/fonts` and copy `.claude/skills/book-layout/template/book.css`
   to `book/layout/book.css`. Add `book/out/` to `.gitignore`.
2. **Fonts.** Body: **Andika** (SIL, OFL), made for early readers (single-storey
   a and g, clear letter shapes) with wide Latin coverage (Polish included):
   ```
   for f in Andika-Regular Andika-Bold; do curl -sfL -o book/fonts/$f.ttf https://github.com/google/fonts/raw/main/ofl/andika/$f.ttf; done
   curl -sfL -o book/fonts/OFL-andika.txt https://github.com/google/fonts/raw/main/ofl/andika/OFL.txt
   ```
   The title font is a taste call: offer the user 2–3 OFL display faces from
   google/fonts that suit the game's style (`design/style.md`). Save the pick as
   `book/fonts/Title.ttf` plus its OFL file. **Test the language's special characters** in every font (Polish:
   "Zażółć gęślą jaźń — „Ćma!”") on a test page, proof it, and Read the image.
   Missing glyphs fall back to another font and show as mismatched letters.
3. Check that the fonts are embedded after the first render:
   `LC_ALL=C grep -a -o "/FontName */[A-Za-z+-]*" book/out/book.pdf | sort -u`
   should list only your fonts (no Times or Helvetica fallback).

## 2. book.json

```json
{
  "title": "<Book title>",
  "lang": "pl",
  "body_pt": 20,
  "format": {"trim_mm": [216, 216], "bleed_mm": 3, "safe_mm": 13, "gutter_mm": 15, "dpi": 300},
  "pages": [
    {"id": "p01", "kind": "text", "no_folio": true,
     "spot": {"art": "book/art/p01_spot.jpg", "box": [48, 95, 120]},
     "text": [{"line": "title", "box": [18, 30, 180, 50], "style": "on-light title v-center", "size_pt": 40, "align": "center"}]},
    {"id": "s02", "kind": "spread", "art": "book/art/s02.jpg",
     "text": [{"line": "s02.1", "page": "left", "box": [18, 18, 120, 60], "style": "on-dark"}]},
    {"id": "p04", "kind": "page", "art": "book/art/p04.jpg"}
  ]
}
```

- `kind`: `spread` (one image across 2 pages), `page` (full-bleed single page) or
  `text` (cream paper page with text and an optional `spot` illustration).
- Pages are numbered in list order from page 1, a right-hand page (recto).
  **A spread must start on an even page**; `check` enforces this. The total must be
  a multiple of 4.
- `box`: `[x, y, w, h]` in **mm from the trim corner** of its page (`page`: `left`/`right` on spreads).
  `spot.box`: `[x, y, width]`.
- `style`: space-separated classes from book.css: `on-light` (ink-brown
  text on a light area), `on-dark` (cream text with a soft night-blue halo),
  `panel` (cream rounded panel, a fallback for busy art), `title`, and `v-center` /
  `v-bottom` (vertical alignment inside the box).
- Optional per text: `size_pt`, `align`. Per page: `no_folio`, `folio: true` (page numbers
  on spreads are off by default; picture books usually skip them), and `class`.

## 3. Typography for read-aloud picture books

- Body 18–22 pt (never below 16), line height ~1.38, **left-aligned or
  centred, ragged, no hyphenation**. Lines ≤ ~50 characters, so boxes are
  ~90–130 mm wide at 20 pt.
- One text block per page side where possible. Keep the box position consistent
  from spread to spread (the reader's eye learns where to look), unless the art
  forces a change.
- Contrast before beauty: ink brown (`--ink`) on light areas, cream with a halo on night
  skies. Use `panel` only when no quiet area exists, and tell book-art to leave
  one next time.
- Dialogue punctuation as book-adapt set it (Polish: paragraphs start with a pauza —).
  The text comes from text.json verbatim;
  fix wording there, never in the layout.
- One-letter words at line ends (Polish *sierotki*) are glued to the next word
  automatically at render.

## 4. Placing text

For each page: run `booktools guides book/art/<id>.jpg --kind spread --id <id> --out raw/book/<id>/guides.png`,
Read it, and set the box over the quiet area that the page plan reserved. Boxes
must stay inside the safe area (13 mm) and out of the gutter (15 mm each side of
the fold); `check` fails otherwise. Without final art, place boxes on the draft
(after printfit) so layout and art move together.

## 5. Render, proof, fix (the loop)

```
python -m tools.booktools check                 # structure, art sizes, text ids, safe/gutter
python -m tools.booktools render                # book/out/book.html + book.pdf
python -m tools.booktools proof [--pairs 1,2]   # book/out/proof/pair_NN.png (pages 2N and 2N+1)
```
Proofs show facing pages trimmed, as the reader sees them, with the safe area
(green dashed), the gutter band (orange) and text boxes (magenta dashed). **Read every
pair image.** Check:
- [ ] Text readable against the art at a glance; never over a face or key object.
- [ ] Line breaks natural; no widow word. Fix by box width, not by editing the text.
- [ ] Text doesn't overflow its box (overflow shows text running past the magenta line).
- [ ] Spread art is continuous across the fold, with nothing important in the orange band.
- [ ] Consistent text position and size across spreads.

Then hand the proofs to **book-adapt** for the proof edit, and show the user the
full set (a contact sheet of the pairs: `python -m tools.imgtools contact /abs/path/book/out/proof/pair_*.png --cols 2 --thumb 800 --out raw/book/proofs.png`).
A real check also needs one **home print**: print 2–3 pairs at 100% scale on A4
(they won't fit whole, but text size and colour are what matter) and read them
aloud.

## 6. Preflight (before anything goes to a printer)

- [ ] `booktools check` passes with no FAIL and no art warnings.
- [ ] Page count is the printer's (multiple of 4; some need exactly 24/32).
- [ ] PDF page size = trim + 2 × bleed: `LC_ALL=C grep -a -o "MediaBox *\[[^]]*\]" book/out/book.pdf | sort | uniq -c`.
      222 mm = 629.3 pt (mm / 25.4 × 72); Chrome lands ~0.1 mm short (629.0), which is within tolerance.
- [ ] Fonts embedded (step 1.3); no fallback fonts.
- [ ] Art embedded at full resolution: `LC_ALL=C grep -a -o "/Width [0-9]*" book/out/book.pdf | sort | uniq -c`
      shows 5173 for spreads and 2622 for pages.
- [ ] Colour: Chrome writes **RGB (sRGB)** PDFs. Photobook services and most
      digital print shops accept that. If a printer requires CMYK or PDF/X, ask
      them to convert, or ask the user before installing anything (ghostscript) to
      do it locally. Don't push dark night-blue areas to near-black; they print
      darker than on screen.
- [ ] Spelling proof done on the final PDF's proofs (book-adapt proof edit).
- [ ] Printer-ready boxes: `render` sets **TrimBox/BleedBox** on `book.pdf` and writes **`book_print.pdf`** with crop
      marks in a 10 mm white slug (needs `pypdf` in .venv). Chrome writes only a MediaBox, which printers read as
      "no bleed". Send `book_print.pdf` unless the printer asks for no marks.
- [ ] No blurred CSS effects (text-shadow / box-shadow blur): Chrome writes them as soft-mask images that some
      renderers and RIPs draw as boxes. Check one page with `sips -s format png page.pdf --out page.png` (Apple's renderer).

## 7. Printer choice and specs (ask the user; it's money)

Get the printer's spec sheet first: trim sizes, bleed, page counts, file format and
cover template. Then adjust `format` in book.json. Typical options:
- **Photobook services** (Cewe, Saal and similar): easiest for 1–20 copies,
  square ~20–21 cm, hardcover. They usually take full-page images (JPEG per page)
  or a PDF. If they want images, export each page from the HTML (`proof` adapted
  to single pages) or ask them which PDF spec they take.
- **Local digital print shop**: PDF with 3 mm bleed on all sides (our default),
  saddle-stitched softcover for ≤ ~40 pages.
- **Amazon KDP paperback**: 8.5 × 8.5 in = 216 mm (our trim), bleed 0.125 in
  (3.2 mm) on top, bottom and outer edge **only**, with no bleed at the inner
  edge. Our pages have bleed on all four sides, so this needs a `bleed_inner: false`
  option in booktools first (pages lose the inner bleed; spreads are split at
  the fold). Minimum 24 pages.

## 8. Cover

The cover is its own one-page document, sized from the printer's cover template:
**width = back trim + spine + front trim + 2 × bleed** (plus wrap for hardcover,
often 15–20 mm a side), **height = trim + 2 × bleed**. The spine depends on the page
count and paper; take it from the printer's calculator. Never guess it.
Make it a mini book in `book/cover/`: a `book.json` with `trim_mm` = the full
cover width × height, `bleed_mm` as the printer says, and one `page` holding
`book/art/cover.jpg` plus title, author and back-blurb text boxes. Then symlink
`book/cover/layout` and `book/cover/fonts` to `../layout` and `../fonts`, add the
cover's text to `book/cover/text.json`, and render with
`BOOK_DIR=book/cover python -m tools.booktools render`. Spine text only from
~6 mm spine width upward. Keep the title inside the front's safe area.

## Done means

`booktools check` passes; `book/out/book.pdf` (and the cover PDF) pass preflight;
every proof pair has been Read and passed the proof edit; the user has seen the
proof contact sheet and approved it. Report the fal spend of the whole book
(`python -m tools.budget`).
