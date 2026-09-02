import { useDocumentStore } from "../store/document-store.js";

export function StepTimeline() {
  const document = useDocumentStore((s) => s.document);
  const selectedScenarioIndex = useDocumentStore((s) => s.selectedScenarioIndex);
  const selectedStepIndex = useDocumentStore((s) => s.selectedStepIndex);
  const selectScenario = useDocumentStore((s) => s.selectScenario);
  const selectStep = useDocumentStore((s) => s.selectStep);

  const scenarios = document.scenarios;
  const scenario = scenarios[selectedScenarioIndex];

  if (scenarios.length === 0) {
    return (
      <div className="step-timeline empty">
        No scenarios defined. Add a scenario block in the DSL.
      </div>
    );
  }

  return (
    <div className="step-timeline">
      <label className="timeline-label">
        Scenario
        <select
          className="toolbar-select"
          value={selectedScenarioIndex}
          onChange={(e) => selectScenario(Number(e.target.value))}
        >
          {scenarios.map((s, i) => (
            <option key={s.id} value={i}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <div className="step-buttons">
        {scenario?.steps.map((step, i) => (
          <button
            key={`${step.name}-${i}`}
            type="button"
            className={`step-btn ${i === selectedStepIndex ? "active" : ""}`}
            onClick={() => selectStep(i)}
          >
            {i + 1}. {step.name}
            {step.pattern && (
              <span className="step-pattern">{step.pattern}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
