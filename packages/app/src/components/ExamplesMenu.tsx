import { useRef } from "react";
import { groupPatternsByCategory, patternDisplayName } from "../lib/pattern-groups.js";
import { useDocumentStore } from "../store/document-store.js";

export function ExamplesMenu() {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const loadPattern = useDocumentStore((s) => s.loadPattern);
  const loadedPatternId = useDocumentStore((s) => s.loadedPatternId);
  const groups = groupPatternsByCategory();
  const currentLabel = patternDisplayName(loadedPatternId);

  const closeMenu = () => {
    if (detailsRef.current) detailsRef.current.open = false;
  };

  const selectExample = (id: string) => {
    if (id === loadedPatternId) {
      closeMenu();
      return;
    }
    loadPattern(id);
    closeMenu();
  };

  const reloadExample = () => {
    if (!loadedPatternId) return;
    const name = patternDisplayName(loadedPatternId);
    const ok = window.confirm(
      `Reload "${name}"? Any edits to this example will be lost.`,
    );
    if (ok) {
      loadPattern(loadedPatternId);
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
          <div key={group.category} className="examples-menu-group">
            <div className="examples-menu-group-label">{group.label}</div>
            {group.patterns.map((p) => (
              <button
                key={p.id}
                type="button"
                role="menuitem"
                className={`examples-menu-item ${p.id === loadedPatternId ? "active" : ""}`}
                onClick={() => selectExample(p.id)}
                data-testid={`example-item-${p.id}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        ))}
        <div className="examples-menu-footer">
          <button
            type="button"
            className="examples-menu-reload"
            disabled={loadedPatternId === null}
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
