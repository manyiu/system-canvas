import { listPatterns } from "@system-canvas/patterns";
import { useDocumentStore } from "../store/document-store.js";

export function PatternPicker() {
  const loadPattern = useDocumentStore((s) => s.loadPattern);
  const patterns = listPatterns();

  return (
    <select
      className="toolbar-select"
      defaultValue="outbox"
      onChange={(e) => loadPattern(e.target.value)}
    >
      {patterns.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
