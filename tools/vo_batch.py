"""Voiceover batches driven by the game's line files.

Reads game/content/lines/*.json ({line_id: {speaker, text, spoken?, direction?, model?}}),
"spoken" is what the voice reads when it differs from the subtitle (e.g. numbers spelled out).
"voice" overrides the delivery for one line: stability, similarity_boost, style, speed.
works out which lines have no recording yet or have changed text, and records
them. Without --go it only prints the plan and total cost.

  python -m tools.vo_batch                    # plan for all scenes
  python -m tools.vo_batch --scene attic      # plan for one lines file
  python -m tools.vo_batch --scene attic --go # record missing lines
  python -m tools.vo_batch --go --stale       # also re-record lines whose text changed
  python -m tools.vo_batch --only a.b.look,a.c.use --go   # just these lines
"""
import argparse
import hashlib
import json
import subprocess
import sys

from tools.budget import load_budget, spent, tts_credits
from tools.common import ASSETS, ROOT
from tools.voice import DEFAULT_TTS_MODEL, load_voices

LINES_DIR = ROOT / "game" / "content" / "lines"
VO_DIR = ASSETS / "game" / "audio" / "vo"
INDEX = VO_DIR / ".index.json"
# The game's spoken language ("language" in game.json, e.g. "pl"); passed to v3, which otherwise guesses.
LANGUAGE = json.loads((ROOT / "game" / "content" / "game.json").read_text()).get("language")


def line_hash(line: dict) -> str:
    parts = [line["speaker"], line["text"], line.get("model")]
    if line.get("voice"):
        parts.append(json.dumps(line["voice"], sort_keys=True))
    if line.get("spoken"):
        parts.append(line["spoken"])
    key = json.dumps(parts, ensure_ascii=False)
    return hashlib.sha1(key.encode()).hexdigest()[:12]


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--scene", help="lines file name without .json")
    p.add_argument("--go", action="store_true", help="actually record")
    p.add_argument("--stale", action="store_true", help="include lines whose text changed")
    p.add_argument("--limit", type=int, default=40, help="max lines per run")
    p.add_argument("--only", help="comma-separated line IDs to record (e.g. for a spot-check)")
    a = p.parse_args()

    files = [LINES_DIR / f"{a.scene}.json"] if a.scene else sorted(LINES_DIR.glob("*.json"))
    voices = load_voices()
    index = json.loads(INDEX.read_text()) if INDEX.exists() else {}

    only = set(a.only.split(",")) if a.only else None
    todo, unvoiced = [], set()
    for f in files:
        lines = json.loads(f.read_text())
        prev_text = None
        for line_id, line in lines.items():
            out = VO_DIR / f"{line_id}.mp3"
            h = line_hash(line)
            state = "missing" if not out.exists() else ("stale" if index.get(line_id) != h else "ok")
            if line["speaker"] not in voices:
                unvoiced.add(line["speaker"])
            elif only is not None and line_id not in only:
                pass
            elif state == "missing" or (state == "stale" and a.stale):
                todo.append((line_id, line, state, h, prev_text))
            prev_text = line.get("spoken") or line["text"]

    if unvoiced:
        print(f"no voice yet (skipped): {', '.join(sorted(unvoiced))}")
    if not todo:
        print("nothing to record.")
        return
    todo = todo[: a.limit]
    total = 0
    for line_id, line, state, _, _ in todo:
        model = line.get("model", DEFAULT_TTS_MODEL)
        cost = tts_credits(line.get("spoken") or line["text"], model)
        total += cost
        print(f"  {state:<7} {line_id:<36} {line['speaker']:<10} {cost:>5.0f} cr  {(line.get('spoken') or line['text'])[:50]}")
    b = load_budget()["elevenlabs"]
    used = spent("elevenlabs")
    print(f"\n{len(todo)} lines, ~{total:,.0f} credits · spent {used:,.0f} of {b['total']:,}")
    if used + total > b["total"]:
        sys.exit("[budget] refused: this batch would exceed the ElevenLabs total cap.")
    if not a.go:
        print("plan only; add --go to record.")
        return

    for line_id, line, state, h, prev_text in todo:
        model = line.get("model", DEFAULT_TTS_MODEL)
        # Audio tags like "[whispers]" are only understood by v3; older models would read them aloud.
        spoken = line.get("spoken") or line["text"]
        text = f"{line['direction']} {spoken}" if line.get("direction") and "v3" in model else spoken
        cmd = [sys.executable, "-m", "tools.voice", "tts", line["speaker"], text,
               "--out", str(VO_DIR / f"{line_id}.mp3"), "--model", model]
        # Per-line delivery: {"voice": {"stability": 0.8, "style": 0, "speed": 0.85}} for a calmer read.
        for k, v in (line.get("voice") or {}).items():
            cmd += [f"--{k.replace('_', '-')}", str(v)]
        if prev_text:
            cmd += ["--previous-text", prev_text]  # voice.py drops it for v3, which rejects it
        if LANGUAGE and "v3" in model:
            cmd += ["--language-code", LANGUAGE]
        if state == "stale":
            cmd.append("--force")
        if subprocess.run(cmd, cwd=ROOT).returncode != 0:
            sys.exit(f"stopped at {line_id}")
        index[line_id] = h
        INDEX.parent.mkdir(parents=True, exist_ok=True)
        INDEX.write_text(json.dumps(index, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
