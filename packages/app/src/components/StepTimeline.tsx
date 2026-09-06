import { usePlaybackLoop } from "../hooks/usePlaybackLoop.js";
import { SCENARIO_CHIP_THRESHOLD, STEP_CHIP_THRESHOLD } from "../lib/playback-ui.js";
import { useDocumentStore } from "../store/document-store.js";

const SPEED_OPTIONS = [
  { label: "0.5x", value: 0.5 },
  { label: "1x", value: 1 },
  { label: "2x", value: 2 },
] as const;

export function StepTimeline() {
  usePlaybackLoop();

  const document = useDocumentStore((s) => s.document);
  const selectedScenarioIndex = useDocumentStore((s) => s.selectedScenarioIndex);
  const selectedStepIndex = useDocumentStore((s) => s.selectedStepIndex);
  const playbackState = useDocumentStore((s) => s.playbackState);
  const playbackSpeed = useDocumentStore((s) => s.playbackSpeed);
  const selectScenario = useDocumentStore((s) => s.selectScenario);
  const selectStep = useDocumentStore((s) => s.selectStep);
  const setPlaybackSpeed = useDocumentStore((s) => s.setPlaybackSpeed);
  const play = useDocumentStore((s) => s.play);
  const pause = useDocumentStore((s) => s.pause);
  const stepForward = useDocumentStore((s) => s.stepForward);
  const stepBack = useDocumentStore((s) => s.stepBack);

  const scenarios = document.scenarios;
  const scenario = scenarios[selectedScenarioIndex];
  const stepCount = scenario?.steps.length ?? 0;
  const currentStep = scenario?.steps[selectedStepIndex];
  const isPlaying = playbackState === "playing";
  const useScenarioChips = scenarios.length <= SCENARIO_CHIP_THRESHOLD;
  const useStepButtons = stepCount > 0 && stepCount <= STEP_CHIP_THRESHOLD;

  if (scenarios.length === 0) {
    return (
      <div className="playback-panel empty">
        No scenarios defined. Add a scenario block in the DSL.
      </div>
    );
  }

  return (
    <div className="playback-panel" data-testid="step-timeline">
      <div className="playback-row playback-row-primary">
        <div className="scenario-strip" data-testid="scenario-strip">
          <span className="timeline-label">Scenario</span>
          {useScenarioChips ? (
            <div className="scenario-chips" role="tablist" aria-label="Scenarios">
              {scenarios.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === selectedScenarioIndex}
                  className={`scenario-chip ${i === selectedScenarioIndex ? "active" : ""}`}
                  onClick={() => selectScenario(i)}
                  data-testid={`scenario-chip-${s.id}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          ) : (
            <select
              className="toolbar-select"
              value={selectedScenarioIndex}
              onChange={(e) => selectScenario(Number(e.target.value))}
              data-testid="scenario-select"
              aria-label="Scenario"
            >
              {scenarios.map((s, i) => (
                <option key={s.id} value={i}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="timeline-transport" data-testid="timeline-transport">
          <button
            type="button"
            className="transport-btn"
            onClick={() => stepBack()}
            disabled={selectedStepIndex <= 0}
            aria-label="Step back"
            data-testid="playback-step-back"
          >
            ‹
          </button>
          <button
            type="button"
            className="transport-btn transport-play"
            onClick={() => (isPlaying ? pause() : play())}
            disabled={stepCount <= 0}
            aria-label={isPlaying ? "Pause" : "Play"}
            data-testid="playback-play-pause"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            className="transport-btn"
            onClick={() => stepForward()}
            disabled={selectedStepIndex >= stepCount - 1}
            aria-label="Step forward"
            data-testid="playback-step-forward"
          >
            ›
          </button>

          <label className="timeline-label">
            Speed
            <select
              className="toolbar-select"
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              data-testid="playback-speed"
            >
              {SPEED_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {stepCount > 0 && (
            <label className="timeline-label timeline-scrubber-label">
              Step
              <input
                type="range"
                className="timeline-scrubber"
                min={0}
                max={stepCount - 1}
                step={1}
                value={Math.min(selectedStepIndex, stepCount - 1)}
                onChange={(e) => selectStep(Number(e.target.value))}
                aria-label="Seek step"
                data-testid="playback-scrubber"
              />
              <span className="timeline-scrubber-value" data-testid="playback-step-label">
                {selectedStepIndex + 1}/{stepCount}
              </span>
            </label>
          )}
        </div>

        {currentStep && (
          <div className="current-step-title" data-testid="current-step-title">
            {selectedStepIndex + 1}. {currentStep.name}
          </div>
        )}
      </div>

      {useStepButtons && (
        <div className="playback-row playback-row-steps">
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
                  <span className="step-pattern" title={`tag: ${step.pattern}`}>
                    {step.pattern}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {stepCount > STEP_CHIP_THRESHOLD && (
        <details className="playback-row step-list-expand" data-testid="step-list-expand">
          <summary>All steps ({stepCount})</summary>
          <ol className="step-list">
            {scenario?.steps.map((step, i) => (
              <li key={`${step.name}-${i}`}>
                <button
                  type="button"
                  className={`step-list-item ${i === selectedStepIndex ? "active" : ""}`}
                  onClick={() => selectStep(i)}
                >
                  {i + 1}. {step.name}
                </button>
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
