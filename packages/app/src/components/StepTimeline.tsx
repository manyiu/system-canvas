import { usePlaybackLoop } from "../hooks/usePlaybackLoop.js";
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
  const isPlaying = playbackState === "playing";

  if (scenarios.length === 0) {
    return (
      <div className="step-timeline empty">
        No scenarios defined. Add a scenario block in the DSL.
      </div>
    );
  }

  return (
    <div className="step-timeline" data-testid="step-timeline">
      <label className="timeline-label">
        Scenario
        <select
          className="toolbar-select"
          value={selectedScenarioIndex}
          onChange={(e) => selectScenario(Number(e.target.value))}
          data-testid="scenario-select"
        >
          {scenarios.map((s, i) => (
            <option key={s.id} value={i}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

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
            <span
              className="timeline-scrubber-value"
              data-testid="playback-step-label"
            >
              {selectedStepIndex + 1}/{stepCount}
            </span>
          </label>
        )}
      </div>

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
