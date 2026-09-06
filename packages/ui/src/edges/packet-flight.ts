import type { PacketTrace, PlaybackState } from "@system-canvas/core";

export interface PacketFlight {
  id: string;
  channelId: string;
  payloadType: string;
  label?: string;
  durationMs: number;
  delayMs: number;
  playState: "running" | "paused";
  delivery?: "sync" | "async";
}

const PACKET_BUDGET = 0.65;
const SYNC_FACTOR = 0.85;
const STAGGER_MS = 80;

export function formatPacketLabel(payloadType: string, data?: Record<string, unknown>): string {
  if (!data) return payloadType;
  for (const key of Object.keys(data)) {
    const value = data[key];
    if (typeof value === "string" || typeof value === "number") {
      return `${payloadType} · ${key}=${value}`;
    }
  }
  return payloadType;
}

export function stepDwellMs(playbackSpeed: number): number {
  return Math.max(100, 1000 / Math.max(0.1, playbackSpeed));
}

export function buildPacketFlights(
  traces: PacketTrace[],
  channelId: string,
  delivery: "sync" | "async" | undefined,
  playbackSpeed: number,
  playbackState: PlaybackState,
): PacketFlight[] {
  const dwell = stepDwellMs(playbackSpeed);
  const baseMs = dwell * PACKET_BUDGET;
  const durationMs = delivery === "sync" ? baseMs * SYNC_FACTOR : baseMs;
  const playState = playbackState === "paused" ? "paused" : "running";

  return traces
    .filter((trace) => trace.channelId === channelId && trace.status === "in-flight")
    .map((trace, index) => ({
      id: trace.id,
      channelId: trace.channelId,
      payloadType: trace.payload.type,
      label: formatPacketLabel(trace.payload.type, trace.payload.data),
      durationMs,
      delayMs: index * (STAGGER_MS / Math.max(0.1, playbackSpeed)),
      playState,
      delivery,
    }));
}
