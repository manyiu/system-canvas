import type { Scenario } from "./execution.js";
import type { CustomPatternDefinition } from "./patterns.js";
import type { SystemGraph } from "./system.js";

export interface SystemDocument {
  graph: SystemGraph;
  scenarios: Scenario[];
  /** Top-level custom pattern definitions from DSL */
  patterns?: CustomPatternDefinition[];
  metadata?: {
    author?: string;
    createdAt?: string;
  };
}
