import Editor from "@monaco-editor/react";
import { serializeDsl } from "@system-canvas/dsl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDocumentStore } from "../store/document-store.js";

const DEBOUNCE_MS = 300;
const COPIED_FEEDBACK_MS = 2000;

export function DslEditor() {
  const dslText = useDocumentStore((s) => s.dslText);
  const document = useDocumentStore((s) => s.document);
  const parseError = useDocumentStore((s) => s.parseError);
  const syncSource = useDocumentStore((s) => s.syncSource);
  const setFromDsl = useDocumentStore((s) => s.setFromDsl);
  const resetSkipDslParse = useDocumentStore((s) => s.resetSkipDslParse);

  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (syncSource === "canvas" || syncSource === "pattern") {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [syncSource, dslText]);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

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

  const copyDsl = useCallback(async () => {
    await navigator.clipboard.writeText(serializeDsl(document));
    setCopied(true);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => {
      copiedTimerRef.current = null;
      setCopied(false);
    }, COPIED_FEEDBACK_MS);
  }, [document]);

  return (
    <div className="dsl-editor-pane">
      <div className="dsl-editor-header">
        <span className="dsl-editor-title">System DSL</span>
        <button
          type="button"
          className="pane-header-btn"
          data-testid="copy-dsl"
          aria-label="Copy DSL"
          onClick={copyDsl}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
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
