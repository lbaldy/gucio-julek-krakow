import { defineScene, type GameAPI } from "../../../src/engine/api";

// Act I, the tutorial: a summer evening. Julek is a sheep tonight; his "Beee! Hop!" bouncing in the
// crib shakes the book about Poland off the shelf (the setup for the climax). Mama reads the legend
// of the Wawel dragon up to the cliffhanger, and the bed starts the dream.

async function bounce(g: GameAPI) {
  if (g.flag("book_down")) return g.say("bedroom.crib.julek.after");
  await g.cutscene(async () => {
    // Julek is painted into the crib (a patch) while he bounces; the companion steps out meanwhile
    g.set("julek_bouncing");
    await g.say("bedroom.crib.julek.1");
    g.sfx("boing");
    await g.say("bedroom.crib.julek.2");
    g.set("book_down");
    g.sfx("pop");
    await g.say("bedroom.crib.julek.3");
    await g.say("bedroom.crib.julek.4");
    g.unset("julek_bouncing");
  });
}

async function read(g: GameAPI) {
  await g.cutscene(async () => {
    await g.anim("gucio", "pickup");
    g.set("reading_book");
    g.sfx("magic");
    await g.wait(700);
    await g.say("bedroom.book.read.1");
    await g.say("bedroom.book.read.2");
    await g.say("bedroom.book.read.3");
    await g.say("bedroom.book.read.4");
    await g.say("bedroom.book.read.5");
    await g.say("bedroom.book.read.6");
    g.unset("reading_book");
    g.set("book_read");
    await g.say("bedroom.book.read.7");
  });
}

export default defineScene("bedroom", {
  async enter(g) {
    if (g.visited("bedroom")) return;
    await g.say("bedroom.enter.1");
    await g.say("bedroom.enter.2");
    await g.say("bedroom.enter.3");
  },
  targets: {
    shelf: {
      look: (g) => g.say(g.flag("book_down") ? "bedroom.shelf.look.after" : "bedroom.shelf.look"),
      use: (g) => g.say(g.flag("book_down") ? "bedroom.shelf.look.after" : "bedroom.shelf.use"),
      items: { julek: (g) => g.say("bedroom.shelf.julek") },
    },
    book_shelf: {
      look: (g) => g.say("bedroom.shelf.look"),
      use: (g) => g.say("bedroom.shelf.use"),
      items: { julek: (g) => g.say("bedroom.shelf.julek") },
    },
    crib: {
      use: (g) => g.say("bedroom.crib.use"),
      items: { julek: bounce },
    },
    book: { use: read },
    bed: {
      use: async (g) => {
        if (!g.flag("book_read")) return g.say("bedroom.bed.use.early");
        await g.cutscene(async () => {
          await g.walkTo(g.point("gucio_bed"));
          await g.say("bedroom.bed.use");
          g.sfx("magic");
          await g.wait(800);
        });
        g.set("dreaming");
        await g.goto("prologue");
      },
    },
    window: { use: (g) => g.say("bedroom.window.use") },
    lamp: { use: (g) => g.say("bedroom.lamp.use") },
    toy_chest: {
      use: (g) => g.say("bedroom.toy_chest.look"),
      items: { julek: (g) => g.say("bedroom.toy_chest.julek") },
    },
    door: { use: (g) => g.say("bedroom.door.use") },
  },
});
