const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

(async () => {
  const context = vm.createContext({});
  const cache = new Map();
  function load(filename) {
    if (!cache.has(filename)) cache.set(filename, new vm.SourceTextModule(
      fs.readFileSync(filename, "utf8"), { context, identifier: filename }));
    return cache.get(filename);
  }
  const root = path.resolve(__dirname, "..");
  const world = load(path.join(root, "src/core/world.js"));
  await world.link((specifier, parent) => load(path.resolve(path.dirname(parent.identifier), specifier.split("?")[0])));
  await world.evaluate();
  const nav = load(path.join(root, "src/core/navigation.js"));
  await nav.link(() => { throw new Error("Unexpected navigation import"); });
  await nav.evaluate();
  const { canStand, actorScale } = world.namespace;
  const { findRoute, distance } = nav.namespace;

  const origin = { x: 410, y: 262 };
  const target = { x: 550, y: 250 };
  const route = findRoute(origin, target, canStand);
  assert.ok(route.reached && distance(route.path.at(-1), target) <= 6);
  assert.ok(route.path.every((point) => point.y >= 240 && point.y < 286),
    "The upper desk corridor stays open all the way to the archive");
  assert.ok(!canStand({ x: 460, y: 320 }), "Desk base blocks the player");
  assert.ok(!canStand({ x: 510, y: 360 }), "Chair base blocks the player");
  assert.ok(canStand({ x: 470, y: 369 }), "Space beside the chair is accessible");
  assert.ok(canStand({ x: 513, y: 376 }), "The terminal can be approached from the front");

  for (const point of [{ x: 319, y: 243 }, { x: 319, y: 263 }, { x: 319, y: 223 },
                       { x: 298, y: 243 }, { x: 340, y: 243 }]) {
    assert.ok(!canStand(point), "Mara blocks overlapping feet from every side");
    assert.ok(canStand(point, false), "Her collision disappears after handover");
  }
  const maraRoute = findRoute({ x: 320, y: 355 }, { x: 319, y: 243 }, canStand, 29);
  assert.ok(maraRoute.reached, "The expanded NPC collision still permits conversation");
  assert.ok(distance(maraRoute.path.at(-1), { x: 319, y: 243 }) > 25,
    "Conversation does not merge the actors' foot positions");
  assert.ok(maraRoute.path.every((point) => point.x === 320 && point.y > 268),
    "The approach stops in front of Mara without a detour behind her");
  assert.ok(actorScale(369) > actorScale(243) * 1.2);
  assert.ok(actorScale(400) === actorScale(377), "Depth scaling is clamped at the floor edge");
  console.log("PASS: archive corridor, desk/chair footprints, NPC clearance, front approach, perspective scale");
})().catch((error) => { console.error(error); process.exitCode = 1; });
