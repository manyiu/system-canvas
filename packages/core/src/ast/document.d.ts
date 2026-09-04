import type { Scenario } from "./execution.js";
import type { SystemGraph } from "./system.js";
import type { CustomPatternDefinition } from "./patterns.js";
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
//# sourceMappingURL=document.d.ts.map