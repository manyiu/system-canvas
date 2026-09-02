import type { Scenario } from "./execution.js";
import type { SystemGraph } from "./system.js";

export interface SystemDocument {
  graph: SystemGraph;
  scenarios: Scenario[];
  metadata?: {
    author?: string;
    createdAt?: string;
  };
}
