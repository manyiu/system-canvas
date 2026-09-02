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
export declare function createTimelineController(scenario: Scenario): TimelineController;
//# sourceMappingURL=timeline.d.ts.map