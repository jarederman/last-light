export { validateSnapshot } from "../core/snapshot.js?v=action-and-voice-1";

export class History {
  constructor(limit = 120) { this.limit = limit; this.entries = []; this.index = -1; }
  push(record, label = "操作") {
    this.entries.splice(this.index + 1);
    this.entries.push({ ...record, label });
    if (this.entries.length > this.limit) this.entries.shift();
    this.index = this.entries.length - 1;
  }
  undo() { return this.index > 0 ? this.entries[--this.index] : null; }
  redo() { return this.index < this.entries.length - 1 ? this.entries[++this.index] : null; }
}
