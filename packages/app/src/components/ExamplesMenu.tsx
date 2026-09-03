import { useRef } from "react";
import {
  exampleDisplayName,
  groupExamplesByDifficulty,
} from "../lib/example-groups.js";
import { useDocumentStore } from "../store/document-store.js";

export function ExamplesMenu() {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const loadExample = useDocumentStore((s) => s.loadExample);
  const loadedExampleId = useDocumentStore((s) => s.loadedExampleId);
  const groups = groupExamplesByDifficulty();
  const currentLabel = exampleDisplayName(loadedExampleId);

  const closeMenu = () => {
    if (detailsRef.current) detailsRef.current.open = false;
  };

  const selectExample = (id: string) => {
    if (id === loadedExampleId) {
      closeMenu();
      return;
    }
    loadExample(id);
    closeMenu();
  };

  const reloadExample = () => {
    if (!loadedExampleId) return;
    const name = exampleDisplayName(loadedExampleId);
    const ok = window.confirm(
      `Reload "${name}"? Any edits to this example will be lost.`,
    );
    if (ok) {
      loadExample(loadedExampleId);
      closeMenu();
    }
  };

  return (
    <details ref={detailsRef} className="examples-menu" data-testid="examples-menu">
      <summary className="examples-menu-trigger toolbar-btn" data-testid="examples-menu-trigger">
        Examples · {currentLabel}
      </summary>
      <div className="examples-menu-panel" role="menu">
        {groups.map((group) => (
          <div key={group.difficulty} className="examples-menu-group">
            <div className="examples-menu-group-label">{group.label}</div>
            {group.examples.map((ex) => (
              <button
                key={ex.id}
                type="button"
                role="menuitem"
                className={`examples-menu-item ${ex.id === loadedExampleId ? "active" : ""}`}
                onClick={() => selectExample(ex.id)}
                data-testid={`example-item-${ex.id}`}
                title={ex.patternsUsed.join(", ")}
              >
                {ex.name}
              </button>
            ))}
          </div>
        ))}
        <div className="examples-menu-footer">
          <button
            type="button"
            className="examples-menu-reload"
            disabled={loadedExampleId === null}
            onClick={reloadExample}
            data-testid="reload-example"
          >
            Reload current example
          </button>
        </div>
      </div>
    </details>
  );
}
