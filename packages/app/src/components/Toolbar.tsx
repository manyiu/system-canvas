import { serializeDsl } from "@system-canvas/dsl";
import { useDocumentStore } from "../store/document-store.js";
import { ExamplesMenu } from "./ExamplesMenu.js";

export function Toolbar() {
  const document = useDocumentStore((s) => s.document);
  const autoLayout = useDocumentStore((s) => s.autoLayout);

  const exportDsl = async () => {
    const text = serializeDsl(document);
    await navigator.clipboard.writeText(text);
  };

  return (
    <header className="toolbar">
      <div className="toolbar-brand">System Canvas</div>
      <div className="toolbar-actions">
        <ExamplesMenu />
        <button type="button" className="toolbar-btn" onClick={autoLayout}>
          Auto Layout
        </button>
        <button type="button" className="toolbar-btn primary" onClick={exportDsl}>
          Copy DSL
        </button>
      </div>
    </header>
  );
}
