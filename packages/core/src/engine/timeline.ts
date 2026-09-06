import type { Scenario, Timeline } from "../ast/execution.js";

export interface TimelineController {
  getTimeline(): Timeline;
  play(): void;
  pause(): void;
  stepForward(): void;
  stepBack(): void;
  seek(step: number): void;
  setSpeed(speed: number): void;
}

export function createTimelineController(scenario: Scenario): TimelineController {
  const timeline: Timeline = {
    scenarioId: scenario.id,
    currentStep: 0,
    playbackState: "idle",
    speed: 1,
    totalSteps: scenario.steps.length,
  };

  return {
    getTimeline: () => ({ ...timeline }),

    play() {
      timeline.playbackState = "playing";
    },

    pause() {
      timeline.playbackState = "paused";
    },

    stepForward() {
      if (timeline.currentStep < timeline.totalSteps - 1) {
        timeline.currentStep += 1;
      }
      timeline.playbackState = "paused";
    },

    stepBack() {
      if (timeline.currentStep > 0) {
        timeline.currentStep -= 1;
      }
      timeline.playbackState = "paused";
    },

    seek(step: number) {
      timeline.currentStep = Math.max(0, Math.min(step, timeline.totalSteps - 1));
      timeline.playbackState = "paused";
    },

    setSpeed(speed: number) {
      timeline.speed = Math.max(0.1, speed);
    },
  };
}
