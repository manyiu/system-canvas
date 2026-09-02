import type { Payload } from "./payload.js";
export type NodeRef = string | {
    nodeId: string;
    portId?: string;
};
export interface StepInteraction {
    source: NodeRef;
    target: NodeRef;
    label: string;
    payload?: Payload;
    annotations?: string[];
}
export interface StepAnimation {
    payload: Payload;
}
//# sourceMappingURL=interaction.d.ts.map