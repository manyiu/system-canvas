import { useEffect, useRef } from "react";
import { useDocumentStore } from "../store/document-store.js";

/** Auto-advance selected step while playbackState is "playing". */
export function usePlaybackLoop(): void {
  const playbackState = useDocumentStore((s) => s.playbackState);
  const playbackSpeed = useDocumentStore((s) => s.playbackSpeed);
  const tickPlayback = useDocumentStore((s) => s.tickPlayback);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (playbackState !== "playing") return;

    const intervalMs = Math.max(100, 1000 / playbackSpeed);
    intervalRef.current = setInterval(() => {
      tickPlayback();
    }, intervalMs);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [playbackState, playbackSpeed, tickPlayback]);
}
