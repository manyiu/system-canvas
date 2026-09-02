import { SystemCanvas } from "@system-canvas/ui";
import { useDocumentStore } from "../store/document-store.js";

export function CanvasPane() {
  const document = useDocumentStore((s) => s.document);
  const selectedScenarioIndex = useDocumentStore((s) => s.selectedScenarioIndex);
  const selectedStepIndex = useDocumentStore((s) => s.selectedStepIndex);
  const setFromCanvas = useDocumentStore((s) => s.setFromCanvas);

  const scenario = document.scenarios[selectedScenarioIndex];
  const selectedStep = scenario?.steps[selectedStepIndex] ?? null;

  return (
    <div className="canvas-pane">
      <div className="pane-header">Architecture Canvas</div>
      <SystemCanvas
        document={document}
        selectedStep={selectedStep}
        onGraphChange={setFromCanvas}
      />
    </div>
  );
}
