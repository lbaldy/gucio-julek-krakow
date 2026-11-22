---
name: book-adapt
description: Adapt the game into a picture book — the author and editor role. Pick the format and page count, turn the branching game into a linear read-aloud story, plan every spread (text + art brief + page-turn), write and edit the text in the game's language, and run the editorial passes. Writes book/book.md, book/book.json and book/text.json. Use before any book art or layout, and whenever the book's text changes.
---

# Book adaptation: game → picture book (author + editor)

The story is the user's. The game turned it into play; the book turns it back into
a story told in pages. We are the author of the adaptation and its editor. The user
signs off the format, the page plan and the final text. They're the taste calls.

The default is a **read-aloud picture book for ~6-year-olds** (a parent reads, the
child looks); follow the audience in `design/game.md` if it differs. The pictures tell half the story, so the text never describes what
the picture already shows.

## Inputs and outputs

- Read: `story/`, `design/game.md`, `design/scenes/*.md`, `design/characters/*.md`
  and the real game text in `game/content/lines/*.json`. The best game lines are
  the characters' proven voices; reuse them.
- Write:
  - `book/book.md`: the adaptation design (template below). The single place
    for decisions about the book.
  - `book/text.json`: every word printed in the book, keyed by text ID. Like the
    game's line files: no text lives anywhere else.
  - `book/book.json`: the page list (format, pages, art paths, text placement).
    This step writes pages, kinds, art paths and text IDs. **book-layout** adds
    the text boxes.

## Process (with checkpoints)

1. **Read the game as a story.** List its story beats in play order. Note which
   beats are *puzzles* (they need rewriting for a book) and which are *moments*
   (they carry over).
2. **Format proposal → user.** Default: **square 216 × 216 mm, 32 pages,
   softcover**. It's the classic picture-book format, a spread (≈ 2:1) is close
   to the game's 16:9 art, and 216 mm (8.5″) is also a standard KDP size. Offer
   the trade-offs in one short list: 24 vs 32 pages (cost and story room),
   softcover vs hardcover, and photobook service vs print shop vs KDP. Page
   count is a multiple of 4.
3. **Page plan** in `book.md`: one row per spread (template below). The usual
   32-page structure:
   - p1 title page (recto)
   - p2–3 to p30–31: up to 15 spreads (2 of them can be split into single
     pages, a picture on one side and text plus a spot illustration on the other)
   - p32: "The end" / imprint
   Copyright and dedication sit on the title page or p32. A home-printed book
   doesn't need a separate imprint page.
4. **Stop for approval** of format + page plan (show the table and the cost
   estimate from the **book-art** skill).
5. **Write the text** into `text.json`. Then do the **structural edit**, then the
   **line edit** (checklists below). Fill `book.json` pages with `text` entries
   (no `box` yet).
6. **Stop for script sign-off.** Show the whole manuscript in spread order: page
   number, text, a one-line picture note. After sign-off, the text is locked
   until proofs.
7. **Proof edit** after layout (book-layout step 5): read every proof image as
   the reader sees it.

## Adaptation rules

- **Linear and short.** One path through the story, no hotspots, no inventory.
  **500–900 words** in total, **20–70 words per spread**, never more than 90.
  If a spread needs more, it needs two spreads, or less text.
- **Puzzles become little problems the heroes solve.** Problem → a funny try
  that fails → teamwork that works. One game puzzle is at most one spread,
  usually half of one. Drop steps that only existed for gameplay (fetching,
  backtracking, item combining).
- **Every main character matters on the important pages.** Keep the game's
  division of powers (who thinks, who does, whose special trait saves the moment)
  and each character's way of speaking (`design/characters/*.md`).
- **Keep the game's rules.** Its logic, and magic only where the game has magic.
  Safety beats stay as the game handled them (if a child may not do something
  without an adult, the book doesn't let them either). Same names, same looks.
- **Page turns are the book's engine.** End a spread on a question, a sound or a
  half-reveal ("…and then something glowed under the tree."); the turn delivers the
  answer. Mark the hook of every spread in the page plan.
- **Words and pictures counterpoint.** Text says what you can't see (thoughts,
  sounds, what someone says, what happens next). Don't write "the kitchen had a
  red table" when the picture shows it.
- **A refrain.** Give the book one repeated beat a child can join in on: a word
  the youngest character says, a sound, a catchphrase. Use it 3–5 times.
- **Ending mirrors the opening.** E.g. bedtime at the start, the morning after at
  the end (take both from the game's intro and outro).

## Text conventions

- Short sentences: 6–12 words for narration, fewer for the youngest characters.
  Sentences that are fun to read aloud: rhythm, onomatopoeia (*clink, splash,
  meow, psssst*), no tongue-twisters unless deliberate.
- Vocabulary a 6-year-old knows. One "big word" per few spreads is fine if the
  picture explains it.
- Characters call each other what they do in the game (names, nicknames).
- Use the language's own dialogue punctuation, consistently. **Polish:** dialogue
  starts with a dash (pauza) on a new paragraph: `— Mniam! — zawołał Julek.`
  Quoted words inside narration use „…”. Never mix in English quotes ("…").
- Paragraph breaks are `\n\n` in `text.json`. A forced line break is `\n`. One-letter
  words at line ends (Polish *sierotki*: a, i, o, u, w, z) are fixed automatically
  at render; don't hand-insert non-breaking spaces.

## Text IDs

`<page_id>.<n>`, e.g. `s03.1`, `s03.2`; `title`, `end`, `imprint`, `dedication`.
Page IDs: `p01` for single pages (number = page), `s02` for a spread starting on
page 2. Keys starting with `_` are notes, ignored by layout (e.g. `"_s03": "…"`).

## book.md template

```markdown
# <Title>: picture book
Status: <draft / approved YYYY-MM-DD> · Source: game design v<n>, lines as of <commit>

## Format
Trim 216 × 216 mm · 32 pp · softcover · bleed 3 mm · printer: <tbd>
Audience: read-aloud, ~6 y. Words: <total> (target 500–900).

## Refrain
<the repeated beat and where it appears>

## Page plan
| pages | id | beat (from game scene) | text gist | picture (who, doing what, where) | text space | page-turn hook | art source |
|---|---|---|---|---|---|---|---|
| 1 | p01 | title | title, authors | spot: main characters | centre | — | new spot |
| 2–3 | s02 | bedtime (bedroom) | the kids fall asleep | wide bedroom at night, both in bed | top-left wall | "Someone is tapping at the window…" | game bg + chars |

## Cut from the game
Beats or puzzles dropped, and why (so the user can disagree).

## Cost
(from book-art: art per spread × count + extras)
```

"Art source" uses the book-art reuse ladder: `game bg + chars`, `game bg reframed`,
`new from refs`, `spot`.

## Editorial checklists

**Structural edit** (on the page plan, before writing full text)
- [ ] Every spread has one clear action; no spread is only "they walked to…".
- [ ] Tension rises to the climax, then a quick warm landing. The end
      isn't longer than 2 spreads after the climax.
- [ ] Every spread has a page-turn hook, or is deliberately a quiet beat.
- [ ] Each main character saves at least one moment; helpers (magic, sidekicks)
      help but don't solve.
- [ ] Nothing scarier than the game: antagonists stay as gentle as they are there.
- [ ] Each picture is drawable in one image: ≤ 3 characters doing one thing
      in one place. Note where the text sits (a quiet area).

**Line edit** (on `text.json`)
- [ ] Read every spread aloud in your head. Mark any sentence you'd stumble on.
- [ ] Word counts per spread within 20–70. Total in range. Put the counts in book.md.
- [ ] No text duplicates what the picture shows.
- [ ] Names, spellings and facts match the game (`design/`, `lines/`).
- [ ] Dialogue punctuation follows the language (Polish: pauza, „…”), and the
      refrain is consistent.
- [ ] Spell-check pass, diacritics included (Polish: ą ć ę ł ń ó ś ź ż). Typos in a printed book
      are forever.

**Proof edit** (on `book/out/proof/pair_*.png`)
- [ ] Line breaks read naturally: no single word on the last line of a
      paragraph (widow) where it can be fixed by re-wrapping the box.
- [ ] Text never covers a face, a key object or a character's key moment.
- [ ] Reading order is obvious (top-left → bottom-right, left page before right).
- [ ] Text sits on a quiet, high-contrast area. If not, use the `panel` style or
      move the box.
- [ ] The page turn falls where the plan says.

Record every editorial change after sign-off in book.md ("Changes after
sign-off") and show it to the user.
