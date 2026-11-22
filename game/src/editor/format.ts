// scene.json writer in the house style: one top-level key per line, and one line per
// entry of a list of objects (hotspots, objects…), a map of objects (spawns) or a list of
// several polygons. Music rules stay on one line; scale factors keep their ".0".

const SHORT_LISTS = new Set(["music"]);
const FLOATS = new Set(["near", "far", "scale"]);

const compact = (v: unknown, key = ""): string => {
  if (typeof v === "number" && FLOATS.has(key) && Number.isInteger(v)) return v.toFixed(1);
  if (Array.isArray(v)) return `[${v.map((x) => compact(x)).join(", ")}]`;
  if (v && typeof v === "object")
    return `{${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${compact(x, k)}`).join(", ")}}`;
  return JSON.stringify(v);
};

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

function value(key: string, v: unknown): string {
  const objs = Array.isArray(v) && v.length > 0 && v.every(isObj);
  const polys = Array.isArray(v) && v.every((p) => Array.isArray(p) && Array.isArray(p[0]));
  const oneLine = Array.isArray(v) && (objs ? SHORT_LISTS.has(key) : !polys || v.length <= 1);
  if (Array.isArray(v) && !oneLine) return `[\n${v.map((x) => `    ${compact(x)}`).join(",\n")}\n  ]`;
  if (isObj(v) && Object.keys(v).length && (key === "points" || Object.values(v).every(isObj)))
    return `{\n${Object.entries(v).map(([k, x]) => `    ${JSON.stringify(k)}: ${compact(x)}`).join(",\n")}\n  }`;
  return compact(v);
}

export function formatScene(scene: object): string {
  return `{\n${Object.entries(scene).map(([k, v]) => `  ${JSON.stringify(k)}: ${value(k, v)}`).join(",\n")}\n}\n`;
}

/** characters.json: one key per line per character, one line per anim. */
export function formatCharacters(chars: Record<string, object>): string {
  const char = (c: object) =>
    Object.entries(c)
      .map(([k, v]) =>
        k === "anims" && isObj(v)
          ? `    "anims": {\n${Object.entries(v).map(([a, d]) => `      ${JSON.stringify(a)}: ${compact(d)}`).join(",\n")}\n    }`
          : `    ${JSON.stringify(k)}: ${compact(v, k)}`,
      )
      .join(",\n");
  return `{\n${Object.entries(chars).map(([id, c]) => `  ${JSON.stringify(id)}: {\n${char(c)}\n  }`).join(",\n")}\n}\n`;
}
