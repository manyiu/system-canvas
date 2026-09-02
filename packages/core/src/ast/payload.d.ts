export interface Payload {
    id: string;
    type: string;
    data: Record<string, unknown>;
    headers?: Record<string, string>;
    correlationId?: string;
}
export type PacketStatus = "in-flight" | "delivered" | "dropped" | "transformed";
export interface PacketTrace {
    id: string;
    payload: Payload;
    channelId: string;
    sourceNodeId: string;
    targetNodeId: string;
    stepIndex: number;
    timestamp: number;
    status: PacketStatus;
}
//# sourceMappingURL=payload.d.ts.map