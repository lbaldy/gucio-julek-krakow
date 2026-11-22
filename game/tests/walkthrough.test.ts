import { describe, expect, test } from "vitest";
import { loadContent } from "../src/content";
import { runStep, start, type Start, type Step } from "../src/engine/driver";
import { headlessGame } from "../src/engine/headless";
import { loadSample } from "./fixtures/sample/load";

interface Walkthrough {
  start?: Start;
  steps: Step[];
}

const game = import.meta.glob<Walkthrough>("./walkthroughs/*.json", { eager: true, import: "default" });
const sample = import.meta.glob<Walkthrough>("./fixtures/sample/walkthroughs/*.json", { eager: true, import: "default" });

describe("walkthroughs", () => {
  const runs = [
    ...Object.entries(game).map(([p, w]) => [p, w, loadContent] as const),
    ...Object.entries(sample).map(([p, w]) => [p, w, loadSample] as const),
  ];
  for (const [path, w, load] of runs) {
    test(path.replace(/^.*\//, ""), async () => {
      const g = headlessGame(load());
      await start(g, w.start);
      for (const [i, s] of w.steps.entries()) {
        try {
          await runStep(g, s);
        } catch (e) {
          const said = g.events.filter((x) => x.t === "say").slice(-3).map((x) => (x.t === "say" ? x.id : ""));
          throw new Error(`step ${i + 1} ${JSON.stringify(s)}: ${(e as Error).message}\n  last lines: ${said.join(", ")}`);
        }
      }
      expect(g.lastError).toBeNull();
    });
  }
});
