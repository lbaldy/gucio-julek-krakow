import { defineScene, type GameAPI } from "../../../src/engine/api";

// Act I, the tutorial: a spring evening. Julek crawls under his crib for the book about Poland,
// Gucio reads the White Eagle page, Julek yawns, and the bed starts the dream.

async function fetchBook(g: GameAPI) {
  await g.cutscene(async () => {
    await g.say("bedroom.crib.julek");
    await g.anim("julek", "crawl");
    await g.say("bedroom.crib.julek.2");
    g.sfx("pickup");
    await g.say("bedroom.crib.julek.gucio");
    // reading it straight away: a close-up of the page, Gucio's question, Julek's "Ptak!"
    g.set("reading_book");
    g.sfx("magic");
    await g.wait(700);
    await g.say("bedroom.book.read.1");
    await g.say("bedroom.book.read.2");
    await g.say("bedroom.book.read.3");
    g.unset("reading_book");
    g.set("book_read");
    await g.wait(400);
    await g.say("bedroom.book.read.4");
    await g.say("bedroom.book.read.5");
  });
}

export default defineScene("bedroom", {
  async enter(g) {
    if (!g.visited("bedroom")) {
      await g.say("bedroom.enter.mama");
      await g.say("bedroom.enter.first");
    }
  },
  targets: {
    crib: {
      look: (g) => g.say(g.flag("book_read") ? "bedroom.crib.look.after" : "bedroom.crib.look"),
      use: (g) => g.say(g.flag("book_read") ? "bedroom.crib.use.after" : "bedroom.crib.use"),
      items: { julek: (g) => (g.flag("book_read") ? g.say("bedroom.crib.julek.after") : fetchBook(g)) },
    },
    book: {
      look: (g) => g.say("bedroom.book.look"),
      use: (g) => g.say("bedroom.crib.use"),
      items: { julek: fetchBook },
    },
    bed: {
      use: async (g) => {
        if (!g.flag("book_read")) return g.say("bedroom.bed.use.early");
        await g.cutscene(async () => {
          await g.walkTo(g.point("gucio_bed"));
          await g.say("bedroom.bed.use");
          await g.say("bedroom.bed.use.julek");
          g.sfx("magic");
          await g.wait(800);
        });
        g.set("dreaming");
        await g.goto("dream");
      },
    },
    window: { use: (g) => g.say("bedroom.window.use") },
    lamp: { use: (g) => g.say("bedroom.lamp.use") },
    toy_chest: {
      use: (g) => g.say("bedroom.toy_chest.look"),
      items: { julek: (g) => g.say("bedroom.toy_chest.julek") },
    },
    shelf: { use: (g) => g.say("bedroom.shelf.use") },
    door: { use: (g) => g.say("bedroom.door.use") },
  },
});
