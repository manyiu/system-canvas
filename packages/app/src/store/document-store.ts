import { parseDsl, serializeDsl } from "@system-canvas/dsl";
import type { SystemDocument, SystemGraph } from "@system-canvas/core";
import { getPattern } from "@system-canvas/patterns";
import { layoutGraph } from "@system-canvas/ui";
import { create } from "zustand";

export type SyncSource = "dsl" | "canvas" | "pattern" | "init";

interface DocumentStore {
  document: SystemDocument;
  dslText: string;
  parseError: string | null;
  syncSource: SyncSource;
  selectedScenarioIndex: number;
  selectedStepIndex: number;
  skipNextDslParse: boolean;

  setFromDsl: (text: string) => void;
  setFromCanvas: (graph: SystemGraph) => void;
  loadPattern: (id: string) => void;
  autoLayout: () => void;
  selectScenario: (index: number) => void;
  selectStep: (index: number) => void;
  resetSkipDslParse: () => void;
}

function withSerializedDsl(
  document: SystemDocument,
  syncSource: SyncSource,
): Pick<
  DocumentStore,
  "document" | "dslText" | "parseError" | "syncSource" | "skipNextDslParse"
> {
  return {
    document,
    dslText: serializeDsl(document),
    parseError: null,
    syncSource,
    skipNextDslParse: syncSource === "canvas" || syncSource === "pattern",
  };
}

const initialDoc = getPattern("outbox");

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  document: initialDoc,
  dslText: serializeDsl(initialDoc),
  parseError: null,
  syncSource: "init",
  selectedScenarioIndex: 0,
  selectedStepIndex: 0,
  skipNextDslParse: false,

  setFromDsl: (text) => {
    try {
      const document = parseDsl(text);
      set({
        document,
        dslText: text,
        parseError: null,
        syncSource: "dsl",
        skipNextDslParse: false,
        selectedScenarioIndex: 0,
        selectedStepIndex: 0,
      });
    } catch (error) {
      set({
        dslText: text,
        parseError: error instanceof Error ? error.message : String(error),
        syncSource: "dsl",
      });
    }
  },

  setFromCanvas: (graph) => {
    const { document } = get();
    const nextDoc: SystemDocument = { ...document, graph };
    const serialized = serializeDsl(nextDoc);
    const current = get().dslText;
    set({
      ...withSerializedDsl(nextDoc, "canvas"),
      selectedScenarioIndex: get().selectedScenarioIndex,
      selectedStepIndex: get().selectedStepIndex,
      dslText: serialized === current ? current : serialized,
    });
  },

  loadPattern: (id) => {
    const document = getPattern(id);
    set({
      ...withSerializedDsl(document, "pattern"),
      selectedScenarioIndex: 0,
      selectedStepIndex: 0,
    });
  },

  autoLayout: () => {
    const { document } = get();
    const laidOut = layoutGraph(document.graph);
    get().setFromCanvas(laidOut);
  },

  selectScenario: (index) => {
    set({ selectedScenarioIndex: index, selectedStepIndex: 0 });
  },

  selectStep: (index) => {
    const scenario = get().document.scenarios[get().selectedScenarioIndex];
    const maxIndex = Math.max(0, (scenario?.steps.length ?? 1) - 1);
    set({
      selectedStepIndex: Math.min(Math.max(0, index), maxIndex),
      syncSource: "init",
    });
  },

  resetSkipDslParse: () => {
    set({ skipNextDslParse: false });
  },
}));
