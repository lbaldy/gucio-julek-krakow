"""fal.ai asset generation.

Usage (run from the project root):
  python -m tools.fal_gen image "prompt" --out bg/attic.png --aspect 16:9 --resolution 2K
  python -m tools.fal_gen edit  "prompt" --ref chars/hero.png --out chars/hero_wave.png
  python -m tools.fal_gen rmbg  chars/hero_raw.png --out chars/hero.png
  python -m tools.fal_gen run   fal-ai/some-model --args '{"prompt": "...", "image_url": "file:chars/hero.png"}' --out anim/hero_walk

Relative paths (outputs and inputs) resolve against assets/.
In `run`, any string argument starting with "file:" is uploaded to fal first.
Every call is checked against budget.json first; --dry-run shows the estimate only.
"""
import argparse
import json
import mimetypes
from pathlib import Path

from tools.budget import RES_MULT, fal_estimate, fal_price, guard
from tools.common import ASSETS, download, record, require_env, resolve_out, should_skip

DEFAULT_IMAGE_MODEL = "fal-ai/nano-banana-2"
DEFAULT_EDIT_MODEL = "fal-ai/nano-banana-2/edit"
DEFAULT_RMBG_MODEL = "fal-ai/birefnet/v2"


def _client():
    require_env("FAL_KEY")
    import fal_client
    return fal_client


def resolve_in(path: str) -> Path:
    p = Path(path)
    if not p.is_absolute() and not p.exists():
        p = ASSETS / p
    if not p.exists():
        raise SystemExit(f"Input file not found: {path}")
    return p


def upload(path: str) -> str:
    return _client().upload_file(resolve_in(path))


def run(model: str, arguments: dict) -> dict:
    """Submit to the fal queue, stream logs, and return the result dict."""
    fal = _client()

    def on_update(update):
        for log in getattr(update, "logs", None) or []:
            print(f"  [{model}] {log.get('message', log)}")

    print(f"→ {model}")
    return fal.subscribe(model, arguments=arguments, with_logs=True, on_queue_update=on_update)


def find_media(result) -> list[dict]:
    """Collect every {url: ...} file object anywhere in a fal result."""
    found = []
    if isinstance(result, dict):
        if isinstance(result.get("url"), str):
            found.append(result)
        else:
            for v in result.values():
                found += find_media(v)
    elif isinstance(result, list):
        for v in result:
            found += find_media(v)
    return found


def _ext(media: dict, fallback: str) -> str:
    ext = mimetypes.guess_extension(media.get("content_type") or "") or ""
    if not ext and media.get("file_name"):
        ext = Path(media["file_name"]).suffix
    return {".jpe": ".jpg", ".jpeg": ".jpg"}.get(ext, ext) or fallback


def save_outputs(result: dict, out: Path, fallback_ext: str = ".png") -> list[Path]:
    """Save media from a result. One file → `out`; several → out_1, out_2, ..."""
    media = find_media(result)
    if not media:
        raise SystemExit(f"No media in result: {json.dumps(result)[:500]}")
    paths = []
    for i, m in enumerate(media, 1):
        ext = out.suffix or _ext(m, fallback_ext)
        stem = out.with_suffix("") if out.suffix else out
        target = Path(f"{stem}{'' if len(media) == 1 else f'_{i}'}{ext}")
        paths.append(download(m["url"], target))
    return paths


def _upload_file_refs(value):
    if isinstance(value, str) and value.startswith("file:"):
        return upload(value[5:])
    if isinstance(value, list):
        return [_upload_file_refs(v) for v in value]
    if isinstance(value, dict):
        return {k: _upload_file_refs(v) for k, v in value.items()}
    return value


def cmd_image(a):
    out = resolve_out(a.out)
    if should_skip(out, a.force):
        return
    args = {"prompt": a.prompt, "aspect_ratio": a.aspect, "resolution": a.resolution,
            "num_images": a.num, "output_format": out.suffix.lstrip(".") or "png"}
    if a.seed is not None:
        args["seed"] = a.seed
    est = fal_estimate(a.model, a.num * RES_MULT[a.resolution])
    guard("fal", est, f"image {a.num}x {a.resolution}", a.dry_run)
    result = run(a.model, args)
    record("fal", "image", a.model, args, save_outputs(result, out),
           {"description": result.get("description"), "cost": {"est": est}})


def cmd_edit(a):
    out = resolve_out(a.out)
    if should_skip(out, a.force):
        return
    args = {"prompt": a.prompt, "aspect_ratio": a.aspect,
            "resolution": a.resolution, "num_images": a.num,
            "output_format": out.suffix.lstrip(".") or "png"}
    if a.seed is not None:
        args["seed"] = a.seed
    est = fal_estimate(a.model, a.num * RES_MULT[a.resolution])
    guard("fal", est, f"edit {a.num}x {a.resolution}", a.dry_run)
    args["image_urls"] = [upload(r) for r in a.ref]
    result = run(a.model, args)
    record("fal", "edit", a.model, {**args, "refs": a.ref}, save_outputs(result, out),
           {"description": result.get("description"), "cost": {"est": est}})


def cmd_rmbg(a):
    out = resolve_out(a.out)
    if should_skip(out, a.force):
        return
    resolve_in(a.input)
    est = fal_estimate(a.model, 10)  # billed per compute second; 10 s is a generous ceiling
    guard("fal", est, "rmbg", a.dry_run)
    args = {"image_url": upload(a.input), "model": a.variant, "operating_resolution": a.op_res,
            "output_format": "png"}
    result = run(a.model, args)
    record("fal", "rmbg", a.model, {**args, "input": a.input}, save_outputs({"image": result["image"]}, out),
           {"cost": {"est": est}})


def cmd_run(a):
    out = resolve_out(a.out)
    if out.suffix and should_skip(out, a.force):
        return
    raw = json.loads(a.args)
    if a.est_usd is not None:
        est = a.est_usd
    elif a.units is not None:
        est = fal_estimate(a.model, a.units)
    else:
        p = fal_price(a.model)
        raise SystemExit(f"{a.model} costs ${p['unit_price']} per {p['unit']}. "
                         f"Pass --units (how many {p['unit']}s this call bills) or --est-usd.")
    guard("fal", est, f"run {a.model}", a.dry_run)
    result = run(a.model, _upload_file_refs(raw))
    if a.dump:
        print(json.dumps(result, indent=2))
    record("fal", "run", a.model, raw, save_outputs(result, out, fallback_ext=""), {"cost": {"est": est}})


def main():
    p = argparse.ArgumentParser(description="Generate game assets with fal.ai")
    sub = p.add_subparsers(dest="cmd", required=True)

    def common(sp, model):
        sp.add_argument("--out", required=True, help="output path (relative → assets/)")
        sp.add_argument("--model", default=model)
        sp.add_argument("--force", action="store_true", help="overwrite an existing output")
        sp.add_argument("--dry-run", action="store_true", help="show the cost estimate, generate nothing")

    def image_opts(sp):
        sp.add_argument("--aspect", default="auto", help="e.g. 16:9, 1:1, 9:16")
        sp.add_argument("--resolution", default="1K", choices=["0.5K", "1K", "2K", "4K"])
        sp.add_argument("--num", type=int, default=1)
        sp.add_argument("--seed", type=int)

    sp = sub.add_parser("image", help="text → image")
    sp.add_argument("prompt")
    common(sp, DEFAULT_IMAGE_MODEL)
    image_opts(sp)
    sp.set_defaults(func=cmd_image)

    sp = sub.add_parser("edit", help="reference image(s) + prompt → image (consistency, variations)")
    sp.add_argument("prompt")
    sp.add_argument("--ref", action="append", required=True, help="reference image; repeatable")
    common(sp, DEFAULT_EDIT_MODEL)
    image_opts(sp)
    sp.set_defaults(func=cmd_edit)

    sp = sub.add_parser("rmbg", help="remove background → transparent PNG")
    sp.add_argument("input")
    common(sp, DEFAULT_RMBG_MODEL)
    sp.add_argument("--variant", default="General Use (Heavy)")
    sp.add_argument("--op-res", default="2048x2048", choices=["1024x1024", "2048x2048", "2304x2304"])
    sp.set_defaults(func=cmd_rmbg)

    sp = sub.add_parser("run", help="call any fal model with raw JSON arguments")
    sp.add_argument("model")
    sp.add_argument("--args", required=True, help='JSON; "file:<path>" strings are uploaded')
    sp.add_argument("--out", required=True, help="output path or stem (extension inferred if omitted)")
    sp.add_argument("--force", action="store_true")
    sp.add_argument("--dump", action="store_true", help="print the full result JSON")
    sp.add_argument("--units", type=float, help="billing units this call uses (see the model's price unit)")
    sp.add_argument("--est-usd", type=float, help="explicit cost estimate when units don't apply")
    sp.add_argument("--dry-run", action="store_true")
    sp.set_defaults(func=cmd_run)

    a = p.parse_args()
    a.func(a)


if __name__ == "__main__":
    main()
