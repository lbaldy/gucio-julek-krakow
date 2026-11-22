"""Spending guardrails.

Every paid call is estimated *before* it runs and refused if it would exceed a
cap in budget.json (per-call and total, per service). Spend is tallied from
assets/manifest.jsonl. budget.json is the user's to change, not Claude's.

  python -m tools.budget          # show spend vs caps
"""
import json
import math
import os

import requests

from tools.common import ASSETS, MANIFEST, ROOT, require_env

BUDGET_FILE = ROOT / "budget.json"
PRICING_CACHE = ASSETS / ".fal_pricing.json"

# fal bills Nano Banana per image, but higher resolutions cost more; overestimate.
RES_MULT = {"0.5K": 1.0, "1K": 1.0, "2K": 1.5, "4K": 2.0}

# ElevenLabs credit estimates. Deliberately conservative; when the API key has
# User:Read, the real cost is measured from the subscription counter and logged.
SFX_CREDITS_PER_SEC = 40
SFX_CREDITS_AUTO = 200
MUSIC_CREDITS_PER_MIN = 2000
MUSIC_DEFAULT_SECONDS = 180
VOICE_DESIGN_CREDITS = 1000


class Unit:
    def __init__(self, service, label, fmt):
        self.service, self.label, self.fmt = service, label, fmt


UNITS = {
    "fal": Unit("fal", "USD", lambda v: f"${v:.3f}"),
    "elevenlabs": Unit("elevenlabs", "credits", lambda v: f"{v:,.0f} cr"),
}


def load_budget() -> dict:
    if not BUDGET_FILE.exists():
        raise SystemExit(f"Missing {BUDGET_FILE}; refusing to spend without caps.")
    return json.loads(BUDGET_FILE.read_text())


def entries():
    if not MANIFEST.exists():
        return
    for line in MANIFEST.read_text().splitlines():
        if line.strip():
            yield json.loads(line)


def entry_cost(e) -> float:
    # The ElevenLabs usage counter lags by a call or more, so a per-call "actual" is
    # often 0 or includes earlier calls. Count the (conservative) estimate instead;
    # the report shows the account's real total separately.
    return (e.get("cost") or {}).get("est", 0)


def spent(service: str) -> float:
    return sum(entry_cost(e) for e in entries() if e["service"] == service)


def guard(service: str, est: float, label: str, dry_run: bool = False):
    """Refuse the call if it breaks a cap. Exits on dry run after printing."""
    b = load_budget()[service]
    fmt = UNITS[service].fmt
    total = spent(service)
    print(f"[budget] {label}: est {fmt(est)} · spent {fmt(total)} of {fmt(b['total'])}")
    if est > b["per_call"]:
        raise SystemExit(f"[budget] refused: {fmt(est)} exceeds the per-call cap of {fmt(b['per_call'])}.")
    if total + est > b["total"]:
        raise SystemExit(f"[budget] refused: would exceed the {service} total cap of {fmt(b['total'])}.")
    if dry_run:
        print("[budget] dry run, nothing generated.")
        raise SystemExit(0)


# --- fal ---------------------------------------------------------------------

def fal_price(model: str) -> dict:
    """{unit_price, unit, currency} from fal's pricing API, cached locally."""
    cache = json.loads(PRICING_CACHE.read_text()) if PRICING_CACHE.exists() else {}
    if model not in cache:
        r = requests.get("https://api.fal.ai/v1/models/pricing",
                         params={"endpoint_id": model},
                         headers={"Authorization": f"Key {require_env('FAL_KEY')}"}, timeout=30)
        if not r.ok:
            raise SystemExit(f"Can't fetch fal pricing for {model} ({r.status_code}): {r.text[:300]}")
        prices = r.json().get("prices") or []
        if not prices:
            raise SystemExit(f"fal has no price listed for {model}; pass --est-usd explicitly.")
        cache[model] = prices[0]
        PRICING_CACHE.parent.mkdir(parents=True, exist_ok=True)
        PRICING_CACHE.write_text(json.dumps(cache, indent=2))
    return cache[model]


def fal_estimate(model: str, units: float) -> float:
    p = fal_price(model)
    if p.get("currency", "USD") != "USD":
        raise SystemExit(f"Unexpected currency for {model}: {p}")
    return p["unit_price"] * units


# --- ElevenLabs --------------------------------------------------------------

def tts_credits(text: str, model: str) -> float:
    return len(text) * (0.5 if ("flash" in model or "turbo" in model) else 1.0)


def sfx_credits(duration: float | None) -> float:
    return math.ceil(duration * SFX_CREDITS_PER_SEC) if duration else SFX_CREDITS_AUTO


def music_credits(seconds: float | None) -> float:
    return math.ceil((seconds or MUSIC_DEFAULT_SECONDS) / 60 * MUSIC_CREDITS_PER_MIN)


def eleven_used() -> int | None:
    """Credits used this billing period, or None if the key lacks User:Read."""
    if not os.environ.get("ELEVENLABS_API_KEY"):
        return None
    try:
        r = requests.get("https://api.elevenlabs.io/v1/user/subscription",
                         headers={"xi-api-key": require_env("ELEVENLABS_API_KEY")}, timeout=30)
        return r.json()["character_count"] if r.ok else None
    except (requests.RequestException, KeyError, ValueError):
        return None


def main():
    b = load_budget()
    for service, unit in UNITS.items():
        rows = [e for e in entries() if e["service"] == service]
        total = sum(entry_cost(e) for e in rows)
        print(f"{service:<11} {unit.fmt(total)} of {unit.fmt(b[service]['total'])} "
              f"(per-call cap {unit.fmt(b[service]['per_call'])}, {len(rows)} generations)")
        by_kind = {}
        for e in rows:
            by_kind[e["kind"]] = by_kind.get(e["kind"], 0) + entry_cost(e)
        for kind, v in sorted(by_kind.items()):
            print(f"    {kind:<8} {unit.fmt(v)}")
    used = eleven_used()
    if used is not None:
        print(f"\nElevenLabs account: {used:,} credits used this billing period")


if __name__ == "__main__":
    main()
