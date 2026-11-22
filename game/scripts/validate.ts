// npm run check: cross-reference validation of content/. Errors fail; missing art/audio only warns.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Combos, DialogueDef, Globals, ItemLooks, SceneScript } from "../src/engine/api";
import type { CharacterData, GameConfig, ItemData, LineData, SceneData } from "../src/engine/types";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = join(ROOT, "content");
const PUBLIC = join(ROOT, "..", "assets", "game");

const errors: string[] = [];
const warnings: string[] = [];
const err = (m: string) => errors.push(m);
const warn = (m: string) => warnings.push(m);
const json = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8")) as T;
const ls = (dir: string) => (existsSync(dir) ? readdirSync(dir) : []);
const asset = (p: string) => existsSync(join(PUBLIC, p));

const config = json<GameConfig>(join(CONTENT, "game.json"));
const chars = json<Record<string, CharacterData>>(join(CONTENT, "characters.json"));
const items = json<Record<string, ItemData>>(join(CONTENT, "items.json"));
const lines: Record<string, LineData> = {};
for (const f of ls(join(CONTENT, "lines")).filter((f) => f.endsWith(".json"))) {
  for (const [id, l] of Object.entries(json<Record<string, LineData>>(join(CONTENT, "lines", f)))) {
    if (lines[id]) err(`line ${id} defined twice`);
    lines[id] = l;
  }
}
const scenes: Record<string, SceneData> = {};
for (const d of ls(join(CONTENT, "scenes"))) {
  const p = join(CONTENT, "scenes", d, "scene.json");
  if (!existsSync(p)) continue;
  const s = json<SceneData>(p);
  if (s.id !== d) err(`scenes/${d}/scene.json has id "${s.id}"`);
  scenes[s.id] = s;
}

const importDefault = async <T>(p: string): Promise<T> => (await import(pathToFileURL(p).href)).default as T;
const scripts: Record<string, { def: SceneScript; src: string }> = {};
for (const id of Object.keys(scenes)) {
  const p = join(CONTENT, "scenes", id, "scene.ts");
  if (existsSync(p)) scripts[id] = { def: await importDefault<SceneScript>(p), src: readFileSync(p, "utf8") };
}
const dialogues: Record<string, { def: DialogueDef; src: string }> = {};
for (const f of ls(join(CONTENT, "dialogues")).filter((f) => f.endsWith(".ts"))) {
  const p = join(CONTENT, "dialogues", f);
  const def = await importDefault<DialogueDef>(p);
  dialogues[def.id] = { def, src: readFileSync(p, "utf8") };
}
const combosPath = join(CONTENT, "combos.ts");
const combos = existsSync(combosPath) ? await importDefault<Combos>(combosPath) : {};
const combosSrc = existsSync(combosPath) ? readFileSync(combosPath, "utf8") : "";
const looksPath = join(CONTENT, "item_looks.ts");
const itemLooks = existsSync(looksPath) ? await importDefault<ItemLooks>(looksPath) : {};
const looksSrc = existsSync(looksPath) ? readFileSync(looksPath, "utf8") : "";
const globalsPath = join(CONTENT, "globals.ts");
const globals = existsSync(globalsPath) ? await importDefault<Globals>(globalsPath) : {};
const globalsSrc = existsSync(globalsPath) ? readFileSync(globalsPath, "utf8") : "";
const minigames = new Set(ls(join(CONTENT, "minigames")).filter((f) => f.endsWith(".ts")).map((f) => f.replace(/\.ts$/, "")));
const companionIds = new Set((config.companions ?? []).map((c) => c.id));

// ── config, characters, items, lines ─────────────────────────────────────

if (!scenes[config.start_scene]) err(`game.json: start_scene ${config.start_scene} doesn't exist`);
else if (config.start_spawn && !scenes[config.start_scene].spawns[config.start_spawn])
  err(`game.json: start_spawn ${config.start_spawn} not in ${config.start_scene}`);
if (config.intro_scene && !scenes[config.intro_scene]) err(`game.json: intro_scene ${config.intro_scene} doesn't exist`);
if (!chars[config.hero]) err(`game.json: hero ${config.hero} not in characters.json`);
for (const i of config.start_inventory ?? []) if (!items[i]) err(`game.json: start item ${i} not in items.json`);
const { items: itemFails, ...kindFails } = config.fail_lines;
for (const id of Object.values(kindFails).flat()) if (!lines[id]) err(`game.json: fail line ${id} missing`);
for (const [item, ids] of Object.entries(itemFails ?? {})) {
  if (!items[item]) err(`game.json: fail_lines.items: unknown item ${item}`);
  for (const id of ids) if (!lines[id]) err(`game.json: fail line ${id} missing`);
}
for (const c of config.companions ?? []) if (!chars[c.id]) err(`game.json: companion ${c.id} not in characters.json`);

for (const [id, l] of Object.entries(lines)) {
  if (l.speaker !== "narrator" && !chars[l.speaker]) err(`line ${id}: unknown speaker ${l.speaker}`);
  if (!l.text?.trim()) err(`line ${id}: empty text`);
}
let missingVo = 0;
for (const id of Object.keys(lines)) if (!asset(`audio/vo/${id}.mp3`)) missingVo++;
if (missingVo) warn(`${missingVo}/${Object.keys(lines).length} lines have no VO yet`);

for (const [id, it] of Object.entries(items)) {
  if (!asset(it.icon)) warn(`item ${id}: icon ${it.icon} missing`);
  if (!lines[`item.${id}.look`]) warn(`item ${id}: no look line item.${id}.look`);
}
for (const [id, ch] of Object.entries(chars)) {
  for (const [anim, a] of Object.entries(ch.anims)) {
    for (let f = 0; f < a.frames; f++) {
      const p = `chars/${id}/${anim}/${String(f).padStart(2, "0")}.png`;
      if (!asset(p)) warn(`character ${id}: frame ${p} missing`);
    }
  }
}

// ── scenes ───────────────────────────────────────────────────────────────

for (const s of Object.values(scenes)) {
  const where = `scene ${s.id}`;
  if (!asset(s.background)) warn(`${where}: background ${s.background} missing (greybox)`);
  const music = typeof s.music === "string" ? [s.music] : (s.music ?? []).map((r) => r.path);
  for (const a of [...music, s.ambience]) if (a && !asset(`audio/${a}`)) warn(`${where}: audio/${a} missing`);
  if (!s.spawns.default) err(`${where}: no "default" spawn`);
  const ids = new Set<string>(s.no_companions || s.no_hero ? [] : companionIds);
  const targetsList = [...(s.hotspots ?? []), ...(s.objects ?? []), ...(s.exits ?? [])];
  for (const t of targetsList) {
    if (ids.has(t.id)) err(`${where}: duplicate id ${t.id}`);
    ids.add(t.id);
    if (!t.name) err(`${where}: ${t.id} has no name`);
  }
  for (const a of s.actors ?? []) {
    ids.add(a.id);
    if (!chars[a.id]) err(`${where}: actor ${a.id} not in characters.json`);
  }
  for (const o of s.objects ?? []) if (!asset(o.sprite)) warn(`${where}: sprite ${o.sprite} missing`);
  for (const p of s.patches ?? []) if (!asset(p.image)) warn(`${where}: patch ${p.image} missing`);
  for (const e of s.exits ?? []) {
    const target = scenes[e.target];
    if (!target) err(`${where}: exit ${e.id} → unknown scene ${e.target}`);
    else if (e.spawn && !target.spawns[e.spawn]) err(`${where}: exit ${e.id} → no spawn ${e.spawn} in ${e.target}`);
  }
  const script = scripts[s.id]?.def;
  for (const [tid, h] of Object.entries(script?.targets ?? {})) {
    if (!ids.has(tid)) err(`${s.id}/scene.ts: target ${tid} not in scene.json`);
    for (const item of Object.keys(h.items ?? {})) if (!items[item]) err(`${s.id}/scene.ts: unknown item ${item} on ${tid}`);
  }
  for (const [, name] of (scripts[s.id]?.src ?? "").matchAll(/\.point\(\s*["'`]([^"'`]+)["'`]\s*\)/g))
    if (!s.points?.[name]) err(`${s.id}/scene.ts: point ${name} not in scene.json points`);
  for (const t of [...(s.hotspots ?? []), ...(s.objects ?? []), ...(s.actors ?? [])]) {
    if (!lines[`${s.id}.${t.id}.look`] && !script?.targets?.[t.id]?.look)
      warn(`${where}: ${t.id} has no look line or handler`);
  }
}

// ── script sources: line IDs and references ──────────────────────────────

const linePrefixes = new Set([...Object.keys(scenes), "_", "item", "combo"]);

function checkSource(file: string, src: string) {
  const consts: Record<string, string> = {};
  for (const m of src.matchAll(/const\s+(\w+)\s*=\s*"([^"]+)"/g)) consts[m[1]] = m[2];
  const literals = [...src.matchAll(/"([^"\n]*)"|`([^`\n]*)`/g)].map((m) => m[1] ?? m[2]);
  const prefixes = new Set(Object.values(consts));
  for (let lit of literals) {
    if (prefixes.has(lit)) continue; // a prefix constant, not a line ID
    lit = lit.replace(/\$\{(\w+)\}/g, (all, name) => consts[name] ?? all);
    if (!linePrefixes.has(lit.split(".")[0]) || !lit.includes(".")) continue;
    if (lit.includes("${")) {
      const escape = (part: string) => part.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
      const re = new RegExp(`^${lit.split(/\$\{[^}]*\}/).map(escape).join("[^.]+")}$`);
      if (!Object.keys(lines).some((id) => re.test(id))) err(`${file}: no line matches ${lit}`);
    } else if (!lines[lit]) err(`${file}: missing line ${lit}`);
  }
  for (const m of src.matchAll(/\.(give|take|drop|has)\(\s*"([^"]+)"/g)) if (!items[m[2]]) err(`${file}: unknown item ${m[2]}`);
  for (const m of src.matchAll(/\.goto\(\s*"([^"]+)"(?:\s*,\s*"([^"]+)")?/g)) {
    if (!scenes[m[1]]) err(`${file}: goto unknown scene ${m[1]}`);
    else if (m[2] && !scenes[m[1]].spawns[m[2]]) err(`${file}: goto ${m[1]} unknown spawn ${m[2]}`);
  }
  for (const m of src.matchAll(/\.dialogue\(\s*"([^"]+)"/g)) if (!dialogues[m[1]]) err(`${file}: unknown dialogue ${m[1]}`);
  for (const m of src.matchAll(/\.minigame\(\s*"([^"]+)"/g)) if (!minigames.has(m[1])) err(`${file}: unknown minigame ${m[1]}`);
  for (const m of src.matchAll(/\.sfx\(\s*"([^"]+)"/g)) if (!asset(`audio/sfx/${m[1]}.mp3`)) warn(`${file}: sfx ${m[1]} missing`);
}

for (const [id, { src }] of Object.entries(scripts)) checkSource(`scenes/${id}/scene.ts`, src);
for (const [id, { def, src }] of Object.entries(dialogues)) {
  checkSource(`dialogues/${id}.ts`, src);
  if (!chars[def.with]) err(`dialogue ${id}: unknown character ${def.with}`);
  if (!def.nodes[def.start]) err(`dialogue ${id}: start node ${def.start} missing`);
  for (const [node, opts] of Object.entries(def.nodes)) {
    if (!opts.some((o) => o.exit)) warn(`dialogue ${id}/${node}: no exit option`);
    for (const o of opts) if (o.goto && !def.nodes[o.goto]) err(`dialogue ${id}/${node}: goto unknown node ${o.goto}`);
  }
}
checkSource("combos.ts", combosSrc);
for (const key of Object.keys(combos)) {
  for (const i of key.split("+")) if (!items[i]) err(`combos.ts: unknown item ${i} in ${key}`);
}

checkSource("item_looks.ts", looksSrc);
checkSource("globals.ts", globalsSrc);
for (const [tid, h] of Object.entries(globals.targets ?? {})) {
  if (!chars[tid]) err(`globals.ts: target ${tid} is not a character`);
  for (const item of Object.keys(h.items ?? {})) if (!items[item]) err(`globals.ts: unknown item ${item} on ${tid}`);
}
for (const f of minigames) checkSource(`minigames/${f}.ts`, readFileSync(join(CONTENT, "minigames", `${f}.ts`), "utf8"));

// Conditions only support `&&` and `!` (see cond.ts); anything else silently misbehaves.
const badCond = (where: string, c: string | undefined) => {
  if (c && /\|\||[()]/.test(c)) err(`${where}: condition "${c}" uses || or parentheses (only && and ! work)`);
};
for (const s of Object.values(scenes)) {
  for (const t of [...(s.hotspots ?? []), ...(s.objects ?? []), ...(s.patches ?? []), ...(s.actors ?? []), ...(s.fg ?? [])])
    badCond(`scene ${s.id}`, t.visible_if);
  for (const e of s.exits ?? []) {
    badCond(`scene ${s.id}`, e.visible_if);
    badCond(`scene ${s.id}`, e.enabled_if);
  }
}
for (const [id, { def }] of Object.entries(dialogues))
  for (const opts of Object.values(def.nodes)) for (const o of opts) badCond(`dialogue ${id}`, o.if);
for (const id of Object.keys(itemLooks)) if (!items[id]) err(`item_looks.ts: unknown item ${id}`);

// ── report ───────────────────────────────────────────────────────────────

const group = (msgs: string[]) => {
  const counts = new Map<string, number>();
  for (const m of msgs) {
    const key = m.replace(/frame \S+ missing/, "frames missing").replace(/(icon|sprite|patch) \S+ missing/, "$1 files missing");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts].map(([m, n]) => (n > 1 ? `${m} (×${n})` : m));
};
for (const w of group(warnings)) console.log(`warn  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
console.log(`\n${basename(CONTENT)}: ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
