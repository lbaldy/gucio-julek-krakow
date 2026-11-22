// Dialogue tree runtime.

import type { DialogueDef } from "./api";
import { evalCond } from "./cond";
import type { Game } from "./game";

export async function runDialogue(g: Game, def: DialogueDef): Promise<void> {
  g.faceToward(def.with);
  let node = def.start;
  for (;;) {
    const opts = (def.nodes[node] ?? [])
      .map((o, i) => ({ o, used: `dlg:${def.id}:${node}:${i}` }))
      .filter(({ o, used }) => evalCond(o.if, g.state) && !(o.once && g.state.flags[used]));
    if (!opts.length) return;
    const { o, used } = opts[await g.choose(opts.map(({ o }) => o.say))];
    g.state.flags[used] = true;
    await g.api.say(o.say);
    for (const r of o.reply ?? []) await g.api.say(r);
    if (o.then) await o.then(g.api);
    if (o.exit) return;
    if (o.goto) node = o.goto;
  }
}
