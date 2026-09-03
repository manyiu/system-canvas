import { useEffect, useRef, useState } from "react";
import type { PacketFlight } from "./packet-flight.js";

interface PacketMarkerProps {
  path: string;
  flight: PacketFlight;
}

function pointAlongPath(
  pathD: string,
  progress: number,
): { x: number; y: number } | null {
  if (typeof document === "undefined") return null;
  const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
  el.setAttribute("d", pathD);
  const length = el.getTotalLength();
  if (!Number.isFinite(length) || length <= 0) return null;
  const point = el.getPointAtLength(Math.min(1, Math.max(0, progress)) * length);
  return { x: point.x, y: point.y };
}

export function PacketMarker({ path, flight }: PacketMarkerProps) {
  const [position, setPosition] = useState(() => pointAlongPath(path, 0));
  const [status, setStatus] = useState<"in-flight" | "delivered">("in-flight");
  const progressRef = useRef(0);
  const delayElapsedRef = useRef(0);
  const lastTsRef = useRef<number | undefined>(undefined);
  const playStateRef = useRef(flight.playState);
  const durationRef = useRef(flight.durationMs);
  const delayRef = useRef(flight.delayMs);

  playStateRef.current = flight.playState;
  durationRef.current = flight.durationMs;
  delayRef.current = flight.delayMs;

  // Reset only when the flight identity or path changes (new step / remount key).
  useEffect(() => {
    progressRef.current = 0;
    delayElapsedRef.current = 0;
    lastTsRef.current = undefined;
    setStatus("in-flight");
    setPosition(pointAlongPath(path, 0));
  }, [path, flight.id]);

  useEffect(() => {
    let raf = 0;
    let active = true;

    const tick = (ts: number) => {
      if (!active) return;

      if (playStateRef.current !== "running") {
        lastTsRef.current = undefined;
        raf = requestAnimationFrame(tick);
        return;
      }

      if (lastTsRef.current === undefined) {
        lastTsRef.current = ts;
      }
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;

      if (delayElapsedRef.current < delayRef.current) {
        delayElapsedRef.current += dt;
        raf = requestAnimationFrame(tick);
        return;
      }

      if (progressRef.current >= 1) {
        setStatus("delivered");
        raf = requestAnimationFrame(tick);
        return;
      }

      const duration = Math.max(1, durationRef.current);
      progressRef.current = Math.min(1, progressRef.current + dt / duration);
      setPosition(pointAlongPath(path, progressRef.current));
      if (progressRef.current >= 1) {
        setStatus("delivered");
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(raf);
    };
  }, [path, flight.id]);

  // When duration changes mid-flight (speed change), keep progress; durationRef updates above.
  useEffect(() => {
    setPosition(pointAlongPath(path, progressRef.current));
  }, [path, flight.durationMs]);

  if (!position) return null;

  const label = flight.label ?? flight.payloadType;

  return (
    <g
      className="sc-packet"
      data-testid="payload-packet"
      data-channel-id={flight.channelId}
      data-payload-type={flight.payloadType}
      data-status={status}
      transform={`translate(${position.x}, ${position.y})`}
      style={{ pointerEvents: "none" }}
    >
      <circle
        className={`sc-packet-dot${flight.delivery === "async" ? " sc-packet-dot-async" : " sc-packet-dot-sync"}`}
        r={6}
        cx={0}
        cy={0}
      />
      <rect
        className="sc-packet-label-bg"
        x={8}
        y={-10}
        width={Math.max(36, label.length * 6.2)}
        height={16}
        rx={3}
      />
      <text className="sc-packet-label" x={12} y={2}>
        {label}
      </text>
    </g>
  );
}
