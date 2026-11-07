const channel = "last-light-development-v1";
const storageKey = "last-light.development.v1";
const byId = (id) => document.getElementById(id);
const frame = byId("game-frame");
const requests = new Map();
let current = null, nextRequest = 0, initialized = false, initializing = false, activeBoot = null;
let saved = null;
let connectTimer;
try { saved = JSON.parse(localStorage.getItem(storageKey) || "null"); } catch { /* Session controls work without storage. */ }
function status(message, error = false) { byId("status").textContent = message; byId("status").dataset.error = String(error); }
function command(name, payload = {}) {
  const requestId = ++nextRequest;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { requests.delete(requestId); reject(Error("游戏连接超时，请重载游戏")); }, 8000);
    requests.set(requestId, { resolve, reject, timer });
    frame.contentWindow.postMessage({ channel, type: "command", command: name, payload, requestId }, location.origin);
  });
}
function run(name, payload = {}) { command(name, payload).then(() => status("已完成 · " + (current?.snapshot.state.phase ?? ""))).catch((error) => status(error.message, true)); }
function persist() {
  if (!initialized || !current) return;
  saved = { snapshot: current.snapshot, checkpoints: current.checkpoints };
  try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch { /* Do not disable debugging when storage is full or blocked. */ }
}
function populate(select, entries) {
  if (select.children.length) return;
  select.replaceChildren(...entries.map(([id, text]) => {
    const option = document.createElement("option"); option.value = id; option.textContent = text; return option;
  }));
}
function button(text, callback) {
  const item = document.createElement("button"); item.type = "button"; item.textContent = text; item.addEventListener("click", callback); return item;
}
function render(view) {
  current = view;
  for (const item of document.querySelectorAll("button[disabled]")) item.disabled = false;
  byId("undo").disabled = view.history.index <= 0;
  byId("redo").disabled = view.history.index >= view.history.count - 1;
  byId("history-status").textContent = `历史 ${view.history.index + 1} / ${view.history.count} · ${view.history.label || ""}`;
  populate(byId("preset"), view.presets); populate(byId("profile"), view.profiles);
  byId("language").value = view.snapshot.language;
  byId("dialog-title").textContent = view.snapshot.panelOpen ? view.title : "当前在房间中 · 可移动或使用快捷交互";
  byId("choices").replaceChildren(...view.actions.map((action, index) => {
    const item = button((action.suggested ? "◆ " : "") + action.label, () => run("choose", { index, revision: view.revision }));
    if (action.suggested) item.className = "suggested";
    return item;
  }));
  const labels = { tape: "旧录音", letter: "Nell 的信", manual: "说明书", bench: "自动回复测试", "bench-silent": "关闭回复测试", comparison: "比对完成", live: "今晚录音", rechecked: "复查说明书", coverage: "中继日志", report: "报告已送达" };
  byId("evidence").replaceChildren(...Object.entries(labels).map(([id, name]) => {
    const label = document.createElement("label"), input = document.createElement("input");
    input.type = "checkbox"; input.checked = view.snapshot.state.evidence.includes(id);
    input.disabled = id === "report" || (id === "live" && view.snapshot.state.reportSent);
    input.addEventListener("change", () => {
      const ids = new Set(current.snapshot.state.evidence);
      input.checked ? ids.add(id) : ids.delete(id);
      run("evidence", { ids: [...ids] });
    });
    label.append(input, name); return label;
  }));
  byId("checkpoints").replaceChildren(...view.checkpoints.map(({ id, label }) => {
    const row = document.createElement("div"); row.className = "checkpoint";
    row.append(button(label, () => run("load-checkpoint", { id })), button("删除", () => run("delete-checkpoint", { id })));
    return row;
  }));
  const s = view.snapshot.state;
  byId("state-summary").textContent = `phase: ${s.phase} · trial: ${s.trial} · ${view.recommendation.trait || "尚无倾向"}`;
  byId("state-view").textContent = JSON.stringify(view.snapshot, null, 2);
}
window.addEventListener("message", async (event) => {
  if (event.origin !== location.origin || event.source !== frame.contentWindow || event.data?.channel !== channel || event.data.type !== "view") return;
  const view = event.data;
  if (view.boot !== activeBoot) { activeBoot = view.boot; initialized = false; initializing = false; }
  render(view);
  if (view.requestId && requests.has(view.requestId)) {
    const request = requests.get(view.requestId); clearTimeout(request.timer); requests.delete(view.requestId);
    view.error ? request.reject(Error(view.error)) : request.resolve(view);
  }
  if (view.ready) clearTimeout(connectTimer);
  if (view.ready && !initialized && !initializing) {
    initializing = true;
    const workspace = saved;
    try {
      if (workspace?.snapshot) await command("restore", { snapshot: workspace.snapshot });
      if (workspace?.checkpoints?.length) await command("import-checkpoints", { entries: workspace.checkpoints });
      status(workspace ? "已恢复上次的开发状态" : "已连接 · 选择阶段开始调试");
    } catch (error) { status("保存的状态无法恢复：" + error.message, true); }
    finally { initialized = true; initializing = false; persist(); }
  } else persist();
});
function loadFrame(reload = false) {
  clearTimeout(connectTimer);
  connectTimer = setTimeout(() => {
    status("游戏连接超时，请重载游戏", true);
    byId("reload").disabled = false;
  }, 8000);
  frame.src = "./player.html?dev=1" + (reload ? "&reload=" + Date.now() : "");
}
byId("jump").addEventListener("click", () => run("jump", { id: byId("preset").value, profile: byId("profile").value }));
byId("undo").addEventListener("click", () => run("undo"));
byId("redo").addEventListener("click", () => run("redo"));
byId("close").addEventListener("click", () => run("close"));
byId("language").addEventListener("change", () => run("language", { language: byId("language").value }));
for (const item of document.querySelectorAll("[data-target]")) item.addEventListener("click", () => run("open", { target: item.dataset.target }));
byId("save-checkpoint").addEventListener("click", () => run("checkpoint", { name: byId("checkpoint-name").value.trim() || current?.title || "检查点" }));
byId("reload").addEventListener("click", () => {
  persist(); status("正在重载代码并恢复状态…");
  for (const pending of requests.values()) { clearTimeout(pending.timer); pending.reject(Error("游戏正在重载")); }
  requests.clear();
  loadFrame(true);
});
byId("edit").addEventListener("click", () => { byId("snapshot-editor").value = JSON.stringify(current.snapshot, null, 2); });
byId("apply").addEventListener("click", () => {
  try { run("restore", { snapshot: JSON.parse(byId("snapshot-editor").value) }); } catch (error) { status("JSON 无效：" + error.message, true); }
});
byId("export").addEventListener("click", () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(current.snapshot, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = "last-light-" + current.snapshot.state.phase + ".json"; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
byId("import-file").addEventListener("change", async (event) => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 200000) throw Error("快照文件不能超过 200 KB");
    await command("restore", { snapshot: JSON.parse(await file.text()) }); status("快照已导入");
  } catch (error) { status(error.message, true); }
  event.target.value = "";
});
document.addEventListener("keydown", (event) => {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault(); run(event.shiftKey ? "redo" : "undo");
  }
});

// Subscribe before navigating the frame so its first ready message is observed.
loadFrame();
