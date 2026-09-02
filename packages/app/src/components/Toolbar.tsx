import { serializeDsl } from "@system-canvas/dsl";
import { useDocumentStore } from "../store/document-store.js";
import { PatternPicker } from "./PatternPicker.js";

export function Toolbar() {
  const document = useDocumentStore((s) => s.document);
  const autoLayout = useDocumentStore((s) => s.autoLayout);
  const loadPattern = useDocumentStore((s) => s.loadPattern);

  const exportDsl = async () => {
    const text = serializeDsl(document);
    await navigator.clipboard.writeText(text);
  };

  return (
    <header className="toolbar">
      <div className="toolbar-brand">System Canvas</div>
      <div className="toolbar-actions">
        <label className="toolbar-label">
          Pattern
          <PatternPicker />
        </label>
        <button type="button" className="toolbar-btn" onClick={autoLayout}>
          Auto Layout
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => loadPattern("outbox")}
        >
          New
        </button>
        <button type="button" className="toolbar-btn primary" onClick={exportDsl}>
          Copy DSL
        </button>
      </div>
    </header>
  );
}
