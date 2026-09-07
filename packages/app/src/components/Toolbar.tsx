import { useDocumentStore } from "../store/document-store.js";
import { ExamplesMenu } from "./ExamplesMenu.js";

export function Toolbar() {
  const autoLayout = useDocumentStore((s) => s.autoLayout);

  return (
    <header className="toolbar">
      <div className="toolbar-brand">System Canvas</div>
      <div className="toolbar-actions">
        <ExamplesMenu />
        <button type="button" className="toolbar-btn" onClick={autoLayout}>
          Auto Layout
        </button>
      </div>
    </header>
  );
}
