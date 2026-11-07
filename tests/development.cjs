const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
(async () => {
  const listeners = {}, sent = [];
  const parent = { postMessage: (data, origin) => sent.push({ data, origin }) };
  const context = vm.createContext({
    window: { parent, addEventListener: (name, run) => { listeners[name] = run; } },
    location: { origin: 'https://example.com' },
    document: { addEventListener() {}, getElementById: () => ({ addEventListener() {} }) },
    setInterval() {}, queueMicrotask: (run) => run(),
  });
  const cache = new Map();
  function load(file) {
    file = path.resolve(root, file);
    if (!cache.has(file)) cache.set(file, new vm.SourceTextModule(fs.readFileSync(file, 'utf8'), { context, identifier: file }));
    return cache.get(file);
  }
  const module = load('src/dev/bridge.js');
  await module.link((id, from) => load(path.resolve(path.dirname(from.identifier), id.split('?')[0])));
  await module.evaluate();
  const { fixture, presets, profiles } = cache.get(path.join(root, 'src/dev/fixtures.js')).namespace;
  const { History, validateSnapshot } = cache.get(path.join(root, 'src/dev/snapshots.js')).namespace;
  function snap(state) { return JSON.parse(JSON.stringify({ schema: 1, state: { ...state, evidence: [...state.evidence] }, position: { x: 320, y: 355 }, direction: 'up', language: 'en', panelOpen: true })); }
  for (const [id] of presets) for (const [profile] of profiles) validateSnapshot(snap(fixture(id, profile).state));
  const valid = snap(fixture('full').state);
  for (const corrupt of [
    (s) => { s.state.phase = 'invalid'; },
    (s) => { s.state.reportSnapshot = null; },
    (s) => { s.state.evidence = []; },
    (s) => { s.state.finalReply.text = '<img src=x onerror=alert(1)>'; },
    (s) => { s.position.x = -5; },
    (s) => { s.state.closing = null; },
  ]) {
    const bad = JSON.parse(JSON.stringify(valid)); corrupt(bad); assert.throws(() => validateSnapshot(bad));
  }
  assert.throws(() => validateSnapshot(JSON.parse('{"schema":1,"__proto__":{"x":true}}')));
  const history = new History(3);
  history.push({ value: 1 }); history.push({ value: 2 }); history.push({ value: 3 });
  assert.equal(history.undo().value, 2); assert.equal(history.redo().value, 3);
  history.undo(); history.push({ value: 4 }); assert.equal(history.redo(), null);
  history.push({ value: 5 }); assert.equal(history.entries.length, 3);
  let current = { snapshot: snap(fixture('arrival').state), panel: null, liveState: null, menu: '' }, choices = 0;
  const adapter = {
    capture: () => JSON.parse(JSON.stringify(current)),
    view: () => ({ snapshot: current.snapshot, actions: [], recommendation: {} }),
    restore: (entry) => { current = { ...entry }; },
    loadFixture: (next) => { current = { ...current, snapshot: snap(next.state) }; },
    open: () => {}, close: () => {}, setLanguage: () => {}, choose: () => { choices++; },
  };
  module.namespace.connectDevelopment(adapter);
  const dispatch = (command, payload = {}, origin = 'https://example.com', source = parent) => listeners.message({ origin, source, data: { channel: 'last-light-development-v1', type: 'command', command, payload, requestId: command } });
  const count = sent.length;
  dispatch('jump', { id: 'full' }, 'https://evil.example');
  dispatch('jump', { id: 'full' }, 'https://example.com', {});
  assert.equal(sent.length, count, 'Only the same-origin parent controls the game');
  assert.equal(sent.at(-1).data.ready, true);
  dispatch('jump', { id: 'full', profile: 'approval' }); assert.equal(current.snapshot.state.phase, 'ending');
  dispatch('undo'); assert.equal(current.snapshot.state.phase, 'arrival');
  dispatch('redo'); assert.equal(current.snapshot.state.phase, 'ending');
  dispatch('checkpoint', { name: 'ending' }); const checkpoint = sent.at(-1).data.checkpoints[0];
  dispatch('jump', { id: 'archive', profile: 'warmth' });
  dispatch('load-checkpoint', { id: checkpoint.id }); assert.equal(current.snapshot.state.phase, 'ending');
  dispatch('choose', { index: 0, revision: -1 }); assert.equal(choices, 0); assert.ok(sent.at(-1).data.error);
  const before = JSON.stringify(current.snapshot);
  dispatch('restore', { snapshot: { schema: 9 } }); assert.equal(JSON.stringify(current.snapshot), before);
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(index, /content="0;url=.\/(dev|player).html"/);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "last-light-entry-"));
  try {
    fs.mkdirSync(path.join(temp, "tools"));
    fs.copyFileSync(path.join(root, "tools/entry.mjs"), path.join(temp, "tools/entry.mjs"));
    for (const mode of ["player", "dev"]) {
      execFileSync(process.execPath, [path.join(temp, "tools/entry.mjs"), mode]);
      assert.ok(fs.readFileSync(path.join(temp, "index.html"), "utf8").includes("content=\"0;url=./" + mode + ".html\""));
    }
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
  const player = fs.readFileSync(path.join(root, 'player.html'), 'utf8');
  assert.match(player, /id="room"/); assert.doesNotMatch(player, /workbench\.js/);
  for (const name of ['player.html', 'dev.html']) {
    const html = fs.readFileSync(path.join(root, name), 'utf8');
    for (const match of html.matchAll(/(?:src|href)="\.\/([^"?]+)(?:\?[^\"]*)?"/g)) assert.ok(fs.existsSync(path.join(root, match[1])), name + ': ' + match[1]);
  }
  console.log('PASS: 80 development presets, snapshot validation, undo/redo, checkpoints, message isolation, stale choices, player entry separation');
})().catch((error) => { console.error(error); process.exitCode = 1; });
