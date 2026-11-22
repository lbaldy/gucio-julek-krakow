"""Shared helpers: env loading, output paths, download, and the asset manifest.

Every generated asset is recorded in assets/manifest.jsonl (prompt, model,
params, output path) so any asset can be traced back and regenerated.
"""
import json
import os
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
MANIFEST = ASSETS / "manifest.jsonl"

load_dotenv(ROOT / ".env")


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(f"Missing {name}. Add it to {ROOT / '.env'} (see .env.example).")
    return value


def resolve_out(path: str) -> Path:
    """Relative output paths land under assets/."""
    p = Path(path)
    if not p.is_absolute():
        p = ASSETS / p
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def should_skip(out: Path, force: bool) -> bool:
    """Generation costs money: never overwrite an existing asset unless forced."""
    if out.exists() and not force:
        print(f"skip (exists): {out.relative_to(ROOT)}  — use --force to regenerate")
        return True
    return False


def download(url: str, out: Path) -> Path:
    out.parent.mkdir(parents=True, exist_ok=True)
    if url.startswith("data:"):
        import base64
        out.write_bytes(base64.b64decode(url.split(",", 1)[1]))
        return out
    with requests.get(url, stream=True, timeout=300) as r:
        r.raise_for_status()
        with open(out, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 16):
                f.write(chunk)
    return out


def record(service: str, kind: str, model: str, params: dict, outputs: list[Path], extra: dict | None = None):
    ASSETS.mkdir(parents=True, exist_ok=True)
    entry = {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "service": service,
        "kind": kind,
        "model": model,
        "params": params,
        "outputs": [str(p.relative_to(ROOT)) if p.is_relative_to(ROOT) else str(p) for p in outputs],
    }
    if extra:
        entry.update(extra)
    with open(MANIFEST, "a") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    for p in entry["outputs"]:
        print(f"saved: {p}")
