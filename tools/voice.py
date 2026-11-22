"""ElevenLabs audio: character voices, voiceover lines, sound effects, and music.

Characters are mapped to voice IDs in assets/voices.json, so lines are spoken by
character name instead of raw voice ID. Every paid call is checked against
budget.json first; --dry-run shows the estimate only.

Usage (run from the project root):
  python -m tools.voice voices                      # list voices on the account
  python -m tools.voice design hero "gruff old sailor, raspy, slow" --text "..."
  python -m tools.voice pick hero 2                 # save design preview #2 as hero's voice
  python -m tools.voice assign narrator <voice_id>  # map an existing voice to a character
  python -m tools.voice tts hero "Ahoy there." --out vo/hero_001.mp3
  python -m tools.voice sfx "creaky wooden door opening" --duration 2 --out sfx/door.mp3
  python -m tools.voice music "melancholic harbor theme, accordion" --seconds 60 --out music/harbor.mp3
"""
import argparse
import base64
import json

import requests

from tools.budget import (VOICE_DESIGN_CREDITS, eleven_used, guard, music_credits,
                          sfx_credits, tts_credits)
from tools.common import ASSETS, record, require_env, resolve_out, should_skip

API = "https://api.elevenlabs.io/v1"
VOICES_FILE = ASSETS / "voices.json"
DESIGNS_DIR = ASSETS / "voice_designs"

DEFAULT_TTS_MODEL = "eleven_multilingual_v2"


def _headers():
    return {"xi-api-key": require_env("ELEVENLABS_API_KEY")}


def _post(path: str, body: dict, params: dict | None = None) -> requests.Response:
    r = requests.post(f"{API}{path}", headers=_headers(), json=body, params=params, timeout=600)
    if not r.ok:
        raise SystemExit(f"ElevenLabs {r.status_code} on {path}: {r.text[:1000]}")
    return r


def _paid_post(est: float, label: str, dry_run: bool, path: str, body: dict, params: dict | None = None):
    """Budget-checked POST. Returns (response, cost) with the real cost when measurable."""
    guard("elevenlabs", est, label, dry_run)
    before = eleven_used()
    r = _post(path, body, params)
    after = eleven_used() if before is not None else None
    cost = {"est": est}
    if after is not None:
        cost["account_delta"] = after - before  # informational only: the counter lags

    return r, cost


def _get(path: str) -> dict:
    r = requests.get(f"{API}{path}", headers=_headers(), timeout=60)
    if not r.ok:
        raise SystemExit(f"ElevenLabs {r.status_code} on {path}: {r.text[:1000]}")
    return r.json()


def load_voices() -> dict:
    return json.loads(VOICES_FILE.read_text()) if VOICES_FILE.exists() else {}


def save_voices(voices: dict):
    VOICES_FILE.parent.mkdir(parents=True, exist_ok=True)
    VOICES_FILE.write_text(json.dumps(voices, indent=2, ensure_ascii=False) + "\n")


def voice_id_for(name_or_id: str) -> tuple[str, dict]:
    entry = load_voices().get(name_or_id)
    if entry:
        return entry["voice_id"], entry.get("settings") or {}
    return name_or_id, {}


def _fmt(out) -> str:
    if out.suffix != ".mp3":
        raise SystemExit(f"Audio outputs must be .mp3 (got {out.name})")
    return "mp3_44100_128"


def cmd_voices(a):
    for v in _get("/voices")["voices"]:
        labels = ", ".join(f"{k}={val}" for k, val in (v.get("labels") or {}).items())
        print(f"{v['voice_id']}  {v['name']:<28} {v.get('category', ''):<12} {labels}")
    mapped = load_voices()
    if mapped:
        print("\nCharacter mapping (assets/voices.json):")
        for name, e in mapped.items():
            print(f"  {name:<16} → {e['voice_id']}")


def cmd_models(a):
    for m in _get("/models"):
        if m.get("can_do_text_to_speech"):
            print(f"{m['model_id']:<32} {m.get('name', '')}")


def cmd_design(a):
    body = {"voice_description": a.description, "model_id": a.model}
    if a.text:
        body["text"] = a.text
    else:
        body["auto_generate_text"] = True
    if a.seed is not None:
        body["seed"] = a.seed
    r, cost = _paid_post(VOICE_DESIGN_CREDITS, f"design {a.character}", a.dry_run, "/text-to-voice/design", body)
    data = r.json()
    record("elevenlabs", "design", a.model, body, [], {"character": a.character, "cost": cost})
    folder = DESIGNS_DIR / a.character
    folder.mkdir(parents=True, exist_ok=True)
    previews = []
    for i, p in enumerate(data["previews"], 1):
        path = folder / f"preview_{i}.mp3"
        path.write_bytes(base64.b64decode(p["audio_base_64"]))
        previews.append({"n": i, "generated_voice_id": p["generated_voice_id"], "file": str(path)})
        print(f"preview {i}: {path}")
    (folder / "design.json").write_text(json.dumps(
        {"description": a.description, "text": data.get("text"), "previews": previews}, indent=2))
    print(f"\nListen, then: python -m tools.voice pick {a.character} <n>")


def cmd_pick(a):
    design = json.loads((DESIGNS_DIR / a.character / "design.json").read_text())
    chosen = next(p for p in design["previews"] if p["n"] == a.n)
    others = [p["generated_voice_id"] for p in design["previews"] if p["n"] != a.n]
    data = _post("/text-to-voice", {
        "voice_name": a.name or a.character,
        "voice_description": design["description"],
        "generated_voice_id": chosen["generated_voice_id"],
        "played_not_selected_voice_ids": others,
    }).json()
    voices = load_voices()
    voices[a.character] = {"voice_id": data["voice_id"], "description": design["description"]}
    save_voices(voices)
    print(f"{a.character} → {data['voice_id']} (saved to assets/voices.json)")


def cmd_assign(a):
    voices = load_voices()
    voices[a.character] = {**voices.get(a.character, {}), "voice_id": a.voice_id}
    save_voices(voices)
    print(f"{a.character} → {a.voice_id}")


def cmd_tts(a):
    out = resolve_out(a.out)
    if should_skip(out, a.force):
        return
    voice_id, stored = voice_id_for(a.voice)
    settings = {**stored}
    for key in ("stability", "similarity_boost", "style", "speed"):
        if getattr(a, key) is not None:
            settings[key] = getattr(a, key)
    body = {"text": a.text, "model_id": a.model}
    if settings:
        body["voice_settings"] = settings
    for key in ("previous_text", "next_text", "seed", "language_code"):
        if getattr(a, key) is not None:
            if key in ("previous_text", "next_text") and "v3" in a.model:
                continue  # eleven_v3 rejects context text (400 unsupported_model)
            body[key] = getattr(a, key)
    r, cost = _paid_post(tts_credits(a.text, a.model), f"tts {a.voice} ({len(a.text)} chars)", a.dry_run,
                         f"/text-to-speech/{voice_id}", body, params={"output_format": _fmt(out)})
    out.write_bytes(r.content)
    record("elevenlabs", "tts", a.model, {**body, "voice": a.voice, "voice_id": voice_id}, [out],
           {"request_id": r.headers.get("request-id"), "cost": cost})


def cmd_sfx(a):
    out = resolve_out(a.out)
    if should_skip(out, a.force):
        return
    body = {"text": a.prompt, "loop": a.loop, "prompt_influence": a.influence, "model_id": a.model}
    if a.duration is not None:
        body["duration_seconds"] = a.duration
    r, cost = _paid_post(sfx_credits(a.duration), "sfx", a.dry_run,
                         "/sound-generation", body, params={"output_format": _fmt(out)})
    out.write_bytes(r.content)
    record("elevenlabs", "sfx", a.model, body, [out], {"cost": cost})


def cmd_music(a):
    out = resolve_out(a.out)
    if should_skip(out, a.force):
        return
    body = {"prompt": a.prompt, "model_id": a.model, "force_instrumental": not a.vocals}
    if a.seconds is not None:
        body["music_length_ms"] = int(a.seconds * 1000)
    r, cost = _paid_post(music_credits(a.seconds), f"music {a.seconds or '?'}s", a.dry_run,
                         "/music", body, params={"output_format": _fmt(out)})
    out.write_bytes(r.content)
    record("elevenlabs", "music", a.model, body, [out], {"cost": cost})


def main():
    p = argparse.ArgumentParser(description="Generate game audio with ElevenLabs")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("voices", help="list account voices + character mapping").set_defaults(func=cmd_voices)
    sub.add_parser("models", help="list TTS models").set_defaults(func=cmd_models)

    sp = sub.add_parser("design", help="design a new character voice from a description (3 previews)")
    sp.add_argument("character")
    sp.add_argument("description")
    sp.add_argument("--text", help="preview line, 100–1000 chars (auto-generated if omitted)")
    sp.add_argument("--model", default="eleven_multilingual_ttv_v2",
                    choices=["eleven_multilingual_ttv_v2", "eleven_ttv_v3"])
    sp.add_argument("--seed", type=int)
    sp.add_argument("--dry-run", action="store_true", help="show the cost estimate, generate nothing")
    sp.set_defaults(func=cmd_design)

    sp = sub.add_parser("pick", help="save a designed preview as the character's voice")
    sp.add_argument("character")
    sp.add_argument("n", type=int)
    sp.add_argument("--name", help="voice name in ElevenLabs (defaults to character)")
    sp.set_defaults(func=cmd_pick)

    sp = sub.add_parser("assign", help="map an existing voice ID to a character")
    sp.add_argument("character")
    sp.add_argument("voice_id")
    sp.set_defaults(func=cmd_assign)

    sp = sub.add_parser("tts", help="speak a line as a character (or raw voice ID)")
    sp.add_argument("voice", help="character name from voices.json, or a voice ID")
    sp.add_argument("text")
    sp.add_argument("--out", required=True)
    sp.add_argument("--model", default=DEFAULT_TTS_MODEL, help="e.g. eleven_v3 for audio tags like [whispers]")
    sp.add_argument("--stability", type=float)
    sp.add_argument("--similarity-boost", dest="similarity_boost", type=float)
    sp.add_argument("--style", type=float)
    sp.add_argument("--speed", type=float)
    sp.add_argument("--previous-text", dest="previous_text", help="preceding line, for natural flow")
    sp.add_argument("--next-text", dest="next_text")
    sp.add_argument("--language-code", dest="language_code")
    sp.add_argument("--seed", type=int)
    sp.add_argument("--force", action="store_true")
    sp.add_argument("--dry-run", action="store_true", help="show the cost estimate, generate nothing")
    sp.set_defaults(func=cmd_tts)

    sp = sub.add_parser("sfx", help="sound effect from a description")
    sp.add_argument("prompt")
    sp.add_argument("--out", required=True)
    sp.add_argument("--duration", type=float, help="0.5–30 s (inferred if omitted)")
    sp.add_argument("--loop", action="store_true", help="seamless loop (ambience)")
    sp.add_argument("--influence", type=float, default=0.3, help="0–1 prompt adherence")
    sp.add_argument("--model", default="eleven_text_to_sound_v2")
    sp.add_argument("--force", action="store_true")
    sp.add_argument("--dry-run", action="store_true", help="show the cost estimate, generate nothing")
    sp.set_defaults(func=cmd_sfx)

    sp = sub.add_parser("music", help="music track from a description")
    sp.add_argument("prompt")
    sp.add_argument("--out", required=True)
    sp.add_argument("--seconds", type=float, help="3–600 s")
    sp.add_argument("--vocals", action="store_true", help="allow vocals (instrumental by default)")
    sp.add_argument("--model", default="music_v1")
    sp.add_argument("--force", action="store_true")
    sp.add_argument("--dry-run", action="store_true", help="show the cost estimate, generate nothing")
    sp.set_defaults(func=cmd_music)

    a = p.parse_args()
    a.func(a)


if __name__ == "__main__":
    main()
