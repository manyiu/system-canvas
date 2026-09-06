import { createExecutor } from "@system-canvas/core";
import { SystemCanvas } from "@system-canvas/ui";
import { useMemo } from "react";
import { useDocumentStore } from "../store/document-store.js";

const executor = createExecutor();

function clampStepIndex(index: number, stepCount: number): number {
  if (stepCount <= 0) return 0;
  return Math.min(Math.max(0, index), stepCount - 1);
}

export function CanvasPane() {
  const document = useDocumentStore((s) => s.document);
  const selectedScenarioIndex = useDocumentStore((s) => s.selectedScenarioIndex);
  const selectedStepIndex = useDocumentStore((s) => s.selectedStepIndex);
  const playbackSpeed = useDocumentStore((s) => s.playbackSpeed);
  const playbackState = useDocumentStore((s) => s.playbackState);
  const setFromCanvas = useDocumentStore((s) => s.setFromCanvas);

  const executionResult = useMemo(() => {
    const scenario = document.scenarios[selectedScenarioIndex];
    if (!scenario || scenario.steps.length === 0) return null;
    const safeIndex = clampStepIndex(selectedStepIndex, scenario.steps.length);
    return executor.executeStep(document.graph, scenario, safeIndex);
  }, [document.graph, document.scenarios, selectedScenarioIndex, selectedStepIndex]);

  return (
    <div className="canvas-pane">
      <div className="pane-header">Architecture Canvas</div>
      <SystemCanvas
        document={document}
        executionResult={executionResult}
        playbackSpeed={playbackSpeed}
        playbackState={playbackState}
        onGraphChange={setFromCanvas}
      />
    </div>
  );
}
