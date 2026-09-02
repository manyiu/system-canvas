import Editor from "@monaco-editor/react";
import { useCallback, useEffect, useRef } from "react";
import { useDocumentStore } from "../store/document-store.js";

const DEBOUNCE_MS = 300;

export function DslEditor() {
  const dslText = useDocumentStore((s) => s.dslText);
  const parseError = useDocumentStore((s) => s.parseError);
  const syncSource = useDocumentStore((s) => s.syncSource);
  const setFromDsl = useDocumentStore((s) => s.setFromDsl);
  const resetSkipDslParse = useDocumentStore((s) => s.resetSkipDslParse);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (syncSource === "canvas" || syncSource === "pattern") {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [syncSource, dslText]);

  const handleChange = useCallback(
    (value: string | undefined) => {
      const text = value ?? "";
      const { dslText: currentText, skipNextDslParse } = useDocumentStore.getState();

      if (skipNextDslParse) {
        if (text === currentText) {
          resetSkipDslParse();
        }
        return;
      }

      if (!text.trim() || text === currentText) {
        return;
      }

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setFromDsl(text);
      }, DEBOUNCE_MS);
    },
    [setFromDsl, resetSkipDslParse],
  );

  return (
    <div className="dsl-editor-pane">
      <div className="pane-header">System DSL</div>
      {parseError && <div className="parse-error">{parseError}</div>}
      <Editor
        height="100%"
        defaultLanguage="plaintext"
        theme="vs-dark"
        value={dslText}
        onChange={handleChange}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          wordWrap: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
      />
    </div>
  );
}
