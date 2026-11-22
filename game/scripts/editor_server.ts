// Dev-server endpoint for the scene editor: POST /__editor/save?scene=<id> writes
// content/scenes/<id>/scene.json, and ?characters=1 writes content/characters.json.
// Files the editor writes don't trigger a reload, so the editing session survives the save.

import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

export function sceneEditor(): Plugin {
  const content = resolve(__dirname, "../content");
  const justWritten = new Set<string>();
  return {
    name: "scene-editor",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__editor/save", (req, res) => {
        const fail = (code: number, msg: string) => {
          res.statusCode = code;
          res.end(msg);
        };
        if (req.method !== "POST") return fail(405, "POST only");
        const q = new URL(req.url ?? "", "http://x").searchParams;
        const id = q.get("scene") ?? "";
        const chars = q.get("characters") === "1";
        const file = chars ? resolve(content, "characters.json") : resolve(content, "scenes", id, "scene.json");
        if (!chars && (!/^[a-z0-9_]+$/.test(id) || !existsSync(file))) return fail(404, `no scene ${id}`);
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          try {
            const data = JSON.parse(body);
            if (chars ? typeof data !== "object" : data.id !== id) return fail(400, "scene id mismatch");
          } catch (e) {
            return fail(400, `bad JSON: ${e}`);
          }
          justWritten.add(file);
          writeFileSync(file, body);
          res.end("ok");
        });
      });
    },
    handleHotUpdate({ file }) {
      if (justWritten.delete(resolve(file))) return [];
    },
  };
}
