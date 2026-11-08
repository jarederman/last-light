import { fixture, presets, profiles } from "./fixtures.js?v=illustrated-ui-8";
import { History, validateSnapshot } from "./snapshots.js?v=illustrated-ui-8";

const channel = "last-light-development-v1";
export function connectDevelopment(adapter) {
  const boot = String(Date.now()) + "-" + Math.random();
  const history = new History();
  const checkpoints = new Map();
  let revision = 0, digest = "", lastPosition = "", scheduled = false;
  const fingerprint = (record) => JSON.stringify({ ...record.snapshot, position: null, direction: null,
    panel: record.panel && { label: record.panel.label, title: record.panel.title, body: record.panel.body, actions: record.panel.actions.map(({ text }) => text) }, menu: record.menu });
  function send(extra = {}) {
    window.parent.postMessage({ channel, type: "view", boot, revision, ...adapter.view(), presets, profiles,
      history: { index: history.index, count: history.entries.length, label: history.entries[history.index]?.label },
      checkpoints: [...checkpoints].map(([id, entry]) => ({ id, label: entry.label, snapshot: entry.snapshot })), ...extra,
    }, location.origin);
  }
  function scan(label = "游戏内操作") {
    const record = adapter.capture(), next = fingerprint(record);
    const position = JSON.stringify(record.snapshot.position);
    if (next === digest) { if (position !== lastPosition) { lastPosition = position; send(); } return; }
    history.push(record, label); digest = next; lastPosition = position; revision++; send();
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; scan(); });
  }
  function restore(record) {
    adapter.restore(record); digest = fingerprint(adapter.capture()); revision++;
  }
  window.addEventListener("message", (event) => {
    if (event.origin !== location.origin || event.source !== window.parent || event.data?.channel !== channel || event.data.type !== "command") return;
    const { command, payload = {}, requestId } = event.data;
    try {
      scan();
      if (command === "undo" || command === "redo") {
        const entry = command === "undo" ? history.undo() : history.redo();
        if (entry) restore(entry);
      } else if (command === "jump") adapter.loadFixture(fixture(payload.id, payload.profile));
      else if (command === "open") adapter.open(payload.target);
      else if (command === "choose") {
        if (payload.revision !== revision) throw Error("选项已变化，请使用当前选项");
        adapter.choose(payload.index);
      } else if (command === "close") adapter.close();
      else if (command === "language") {
        if (!["en", "zh-CN"].includes(payload.language)) throw Error("语言无效");
        adapter.setLanguage(payload.language); adapter.open();
      } else if (command === "restore") {
        adapter.restore({ snapshot: validateSnapshot(payload.snapshot) });
      } else if (command === "evidence") {
        const next = adapter.capture().snapshot;
        next.state.evidence = payload.ids;
        adapter.restore({ snapshot: validateSnapshot(next) });
      } else if (command === "checkpoint") {
        if (typeof payload.name !== "string" || payload.name.length > 80) throw Error("检查点名称无效");
        if (checkpoints.size >= 20) throw Error("最多保存 20 个检查点，请先删除一个");
        const id = String(Date.now()) + "-" + checkpoints.size;
        checkpoints.set(id, { ...adapter.capture(), label: payload.name || "检查点" });
      } else if (command === "load-checkpoint") {
        const entry = checkpoints.get(payload.id); if (!entry) throw Error("检查点不存在");
        adapter.restore(entry);
      } else if (command === "delete-checkpoint") checkpoints.delete(payload.id);
      else if (command === "import-checkpoints") {
        if (!Array.isArray(payload.entries) || payload.entries.length > 20) throw Error("检查点数量无效");
        const entries = payload.entries.map((entry) => {
          if (typeof entry.id !== "string" || typeof entry.label !== "string" || entry.label.length > 80) throw Error("检查点格式无效");
          return [entry.id, { snapshot: validateSnapshot(entry.snapshot), label: entry.label }];
        });
        checkpoints.clear(); for (const [id, entry] of entries) checkpoints.set(id, entry);
      } else throw Error("未知开发操作");
      if (!["undo", "redo"].includes(command)) scan(command);
      send({ requestId, ok: true });
    } catch (error) { send({ requestId, error: error.message }); }
  });
  document.addEventListener("click", schedule);
  document.addEventListener("keydown", schedule);
  document.getElementById("dialog").addEventListener("close", schedule);
  // Walking can open a panel from requestAnimationFrame, outside input events.
  setInterval(() => scan(), 250);
  scan("初始状态"); send({ ready: true });
}
