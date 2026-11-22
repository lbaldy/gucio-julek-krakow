// Condition strings: "door_open", "!has:key", "taken:key && !door_open", "scene:attic".

import type { State } from "./state";

export function evalCond(expr: string | undefined, s: State): boolean {
  if (!expr || !expr.trim()) return true;
  return expr.split("&&").every((raw) => {
    let term = raw.trim();
    let negate = false;
    while (term.startsWith("!")) {
      negate = !negate;
      term = term.slice(1).trim();
    }
    return evalTerm(term, s) !== negate;
  });
}

function evalTerm(term: string, s: State): boolean {
  const i = term.indexOf(":");
  if (i < 0) return !!s.flags[term];
  const kind = term.slice(0, i);
  const arg = term.slice(i + 1);
  switch (kind) {
    case "has":
      return s.inventory.includes(arg);
    case "taken":
      return !!s.flags[`taken:${arg}`];
    case "visited":
      return s.visited.includes(arg);
    case "scene":
      return s.scene === arg;
    default:
      return !!s.flags[term];
  }
}
