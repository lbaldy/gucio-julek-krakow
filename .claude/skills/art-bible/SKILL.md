---
name: art-bible
description: Establish and maintain the game's visual identity — choose an art style with the user, write design/style.md (the style prompt every image uses), and create the style anchor and character reference sheets that keep all generated art consistent. Use once at the start, and whenever a new character is introduced.
---

# Art bible: style and reference images

Consistency is the hardest part of AI-generated game art. We get it from
**reference images, not prompt words**. Every later image is an `edit` that
takes the anchors as `--ref`, so the model copies the look instead of reinventing it.

## Files

- `design/style.md`: the style prompt block, palette, rendering rules, negatives.
- `assets/ref/style_anchor.png`: one approved background-like image that sets
  the look. Every background is generated from it.
- `assets/ref/chars/<char_id>.png`: the approved full-body reference for each
  character, facing right.
- `assets/raw/style/…`: exploration drafts (not shipped).

## 1. Choose a style (once)

1. From `design/game.md`, propose **3 distinct directions** in words, each with
   a one-line pitch. For example: "painterly gouache, warm and storybook, like
   Broken Sword", "crisp vector shapes, flat colour, limited palette", "moody
   pixel-art feel at high resolution". Consider what the AI renders well (painterly,
   illustrated) and what it doesn't (strict pixel grids, exact repeated patterns).
2. Generate **one image per direction** of the same representative scene, at
   `--resolution 1K --aspect 16:9`. That's three calls, about $0.24. Then make a
   contact sheet:
   ```
   python -m tools.fal_gen image "<style A> … <scene>" --out raw/style/a.png --aspect 16:9
   python -m tools.imgtools contact raw/style/a.png raw/style/b.png raw/style/c.png --out raw/style/contact.png
   ```
   Look at the sheet with Read, then show it to the user with your view on each.
3. When the user picks one, refine it with at most 2 more edits of the winner.
   Then copy the final to `assets/ref/style_anchor.png`.

## 2. Write design/style.md

```markdown
# Style
## Style prompt  (prepended to every image prompt, verbatim)
<one dense paragraph: medium, rendering, line, lighting, palette, mood, camera>

## Palette
<5–8 named colours with hex, e.g. "harbor teal #2f6f73">

## Backgrounds
- Camera: eye-level, slightly elevated, 3/4 view; floor visible in lower third.
- Always empty of people. No text, legible signage, UI or watermarks.
- <lighting / time-of-day conventions>

## Characters
- Proportions (e.g. 6 heads tall, slightly stylised), outline weight, shading.
- Rendered on a plain flat light-grey background (#d0d0d0), full body, feet visible.

## Negatives
<things that keep creeping in and must be avoided>
```

The style prompt must describe the *look*, not the content. Content goes in
each asset's own prompt.

## 3. Character reference sheets (per character)

Inputs: `design/characters/<id>.md` (the look section) and the style anchor.

1. Generate the reference with the style anchor as `--ref`, so it matches the
   world:
   ```
   python -m tools.fal_gen edit "<style prompt>. Full-body character, <look>, standing in a relaxed neutral pose, facing right in 3/4 view, feet visible, plain flat light-grey background, no shadow on the ground. Match the art style of the reference image only; ignore its content." \
     --ref ref/style_anchor.png --out raw/chars/<id>/ref_v1.png --aspect 2:3 --resolution 1K
   ```
2. Check it with Read: hands, face, silhouette readability, colours from the
   palette, and whether it stands out against the backgrounds.
3. Have the user approve the main character's reference. Secondary characters
   can be approved in a batch with a contact sheet.
4. Make the approved version at 2K by re-running the edit with `--resolution 2K`
   and the v1 image as an extra `--ref`. Then save it as
   `assets/ref/chars/<id>.png`.

## Prompt-writing rules

- Order: style prompt → subject → composition/camera → lighting → constraints.
- Say where things are ("on the left, a cluttered workbench"). Spatial layout
  is what we'll put hotspots on.
- With references, say what to take from them: "keep the character exactly as
  in the first image; use the art style of the second image".
- Put negatives in words ("no people, no text"). There is no negative-prompt field.
- Use the same seed (`--seed`) across a family of drafts so that changing one
  word changes one thing.
