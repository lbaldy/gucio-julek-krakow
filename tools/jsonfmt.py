"""Compact JSON for content files: coordinate lists and polygons stay on one line.

  python -m tools.jsonfmt game/content/scenes/attic/scene.json [...]
"""
import json
import sys
from pathlib import Path


def _inline(v) -> bool:
    if isinstance(v, (int, float, str, bool)) or v is None:
        return True
    if isinstance(v, list):
        return all(_inline(x) and not isinstance(x, dict) for x in v)
    return False


def dumps(v, ind: int = 0) -> str:
    pad = "  " * (ind + 1)
    if _inline(v) and not isinstance(v, dict):
        return json.dumps(v, ensure_ascii=False, separators=(", ", ": "))
    if isinstance(v, list):
        return "[\n" + ",\n".join(pad + dumps(x, ind + 1) for x in v) + "\n" + "  " * ind + "]"
    if all(_inline(x) for x in v.values()) and len(json.dumps(v, ensure_ascii=False)) < 110:
        return json.dumps(v, ensure_ascii=False, separators=(", ", ": "))
    items = [f"{pad}{json.dumps(k, ensure_ascii=False)}: {dumps(x, ind + 1)}" for k, x in v.items()]
    return "{\n" + ",\n".join(items) + "\n" + "  " * ind + "}"


def write(path, obj):
    Path(path).write_text(dumps(obj) + "\n")


if __name__ == "__main__":
    for f in sys.argv[1:]:
        write(f, json.loads(Path(f).read_text()))
        print(f"formatted {f}")
