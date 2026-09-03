import { parseDsl, serializeDsl } from "@system-canvas/dsl";
import type {
  PlaybackState,
  SystemDocument,
  SystemGraph,
} from "@system-canvas/core";
import { getExample, listExamples } from "@system-canvas/patterns";
import { graphNeedsLayout, layoutGraph } from "@system-canvas/ui";
import { create } from "zustand";

export type SyncSource = "dsl" | "canvas" | "pattern" | "init";

interface DocumentStore {
  document: SystemDocument;
  dslText: string;
  parseError: string | null;
  syncSource: SyncSource;
  /** Currently loaded example id, or null when the document diverged via DSL. */
  loadedExampleId: string | null;
  selectedScenarioIndex: number;
  selectedStepIndex: number;
  playbackState: PlaybackState;
  playbackSpeed: number;
  skipNextDslParse: boolean;

  setFromDsl: (text: string) => void;
  setFromCanvas: (graph: SystemGraph) => void;
  loadExample: (id: string) => void;
  autoLayout: () => void;
  selectScenario: (index: number) => void;
  selectStep: (index: number) => void;
  setPlaybackState: (state: PlaybackState) => void;
  setPlaybackSpeed: (speed: number) => void;
  play: () => void;
  pause: () => void;
  stepForward: () => void;
  stepBack: () => void;
  tickPlayback: () => void;
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

function clampStepIndex(index: number, stepCount: number): number {
  if (stepCount <= 0) return 0;
  return Math.min(Math.max(0, index), stepCount - 1);
}

function ensureLaidOut(document: SystemDocument): SystemDocument {
  if (!graphNeedsLayout(document.graph)) return document;
  return { ...document, graph: layoutGraph(document.graph) };
}

function scenarioIndexForExample(
  document: SystemDocument,
  exampleId: string,
): number {
  const meta = listExamples().find((e) => e.id === exampleId);
  if (!meta) return 0;
  const index = document.scenarios.findIndex(
    (s) => s.id === meta.defaultScenarioId,
  );
  return index >= 0 ? index : 0;
}

const initialExampleId = "bitly";
const initialDoc = ensureLaidOut(getExample(initialExampleId));
const initialScenarioIndex = scenarioIndexForExample(
  initialDoc,
  initialExampleId,
);

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  document: initialDoc,
  dslText: serializeDsl(initialDoc),
  parseError: null,
  syncSource: "init",
  loadedExampleId: initialExampleId,
  selectedScenarioIndex: initialScenarioIndex,
  selectedStepIndex: 0,
  playbackState: "idle",
  playbackSpeed: 1,
  skipNextDslParse: false,

  setFromDsl: (text) => {
    try {
      const parsed = parseDsl(text);
      const needsLayout = graphNeedsLayout(parsed.graph);
      const document = ensureLaidOut(parsed);
      set({
        document,
        dslText: needsLayout ? serializeDsl(document) : text,
        parseError: null,
        syncSource: "dsl",
        loadedExampleId: null,
        skipNextDslParse: false,
        selectedScenarioIndex: 0,
        selectedStepIndex: 0,
        playbackState: "idle",
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

  loadExample: (id) => {
    const document = ensureLaidOut(getExample(id));
    set({
      ...withSerializedDsl(document, "pattern"),
      loadedExampleId: id,
      selectedScenarioIndex: scenarioIndexForExample(document, id),
      selectedStepIndex: 0,
      playbackState: "idle",
    });
  },

  autoLayout: () => {
    const { document, loadedExampleId } = get();
    if (loadedExampleId) {
      const meta = listExamples().find((e) => e.id === loadedExampleId);
      if (meta?.layoutHint === "manual") {
        const ok = window.confirm(
          "This example uses a hand-tuned layout. Auto Layout may produce a messy graph. Continue?",
        );
        if (!ok) return;
      }
    }
    const laidOut = layoutGraph(document.graph);
    get().setFromCanvas(laidOut);
  },

  selectScenario: (index) => {
    set({
      selectedScenarioIndex: index,
      selectedStepIndex: 0,
      playbackState: "idle",
    });
  },

  selectStep: (index) => {
    const scenario = get().document.scenarios[get().selectedScenarioIndex];
    const maxIndex = Math.max(0, (scenario?.steps.length ?? 1) - 1);
    set({
      selectedStepIndex: Math.min(Math.max(0, index), maxIndex),
      playbackState: "paused",
      syncSource: "init",
    });
  },

  setPlaybackState: (state) => {
    set({ playbackState: state });
  },

  setPlaybackSpeed: (speed) => {
    set({ playbackSpeed: Math.max(0.1, speed) });
  },

  play: () => {
    const { document, selectedScenarioIndex, selectedStepIndex } = get();
    const scenario = document.scenarios[selectedScenarioIndex];
    const stepCount = scenario?.steps.length ?? 0;
    if (stepCount <= 0) return;
    const atEnd = selectedStepIndex >= stepCount - 1;
    set({
      selectedStepIndex: atEnd ? 0 : selectedStepIndex,
      playbackState: "playing",
      syncSource: "init",
    });
  },

  pause: () => {
    set({ playbackState: "paused" });
  },

  stepForward: () => {
    const { document, selectedScenarioIndex, selectedStepIndex } = get();
    const scenario = document.scenarios[selectedScenarioIndex];
    const stepCount = scenario?.steps.length ?? 0;
    set({
      selectedStepIndex: clampStepIndex(selectedStepIndex + 1, stepCount),
      playbackState: "paused",
      syncSource: "init",
    });
  },

  stepBack: () => {
    const { document, selectedScenarioIndex, selectedStepIndex } = get();
    const scenario = document.scenarios[selectedScenarioIndex];
    const stepCount = scenario?.steps.length ?? 0;
    set({
      selectedStepIndex: clampStepIndex(selectedStepIndex - 1, stepCount),
      playbackState: "paused",
      syncSource: "init",
    });
  },

  tickPlayback: () => {
    const { document, selectedScenarioIndex, selectedStepIndex, playbackState } =
      get();
    if (playbackState !== "playing") return;

    const scenario = document.scenarios[selectedScenarioIndex];
    const stepCount = scenario?.steps.length ?? 0;
    if (stepCount <= 0) {
      set({ playbackState: "idle" });
      return;
    }

    if (selectedStepIndex >= stepCount - 1) {
      set({ playbackState: "paused" });
      return;
    }

    set({
      selectedStepIndex: selectedStepIndex + 1,
      syncSource: "init",
    });
  },

  resetSkipDslParse: () => {
    set({ skipNextDslParse: false });
  },
}));

/** @deprecated Use loadedExampleId */
export function useLoadedPatternId() {
  return useDocumentStore((s) => s.loadedExampleId);
}

/** @deprecated Use loadExample */
export function useLoadPattern() {
  return useDocumentStore((s) => s.loadExample);
}
