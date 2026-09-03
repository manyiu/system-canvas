import type { ExampleMeta } from "@system-canvas/core";

export type { ExampleMeta, ExampleDifficulty, LayoutHint } from "@system-canvas/core";

export interface PatternFactory {
  id: string;
  meta: ExampleMeta;
  create: () => import("@system-canvas/core").SystemDocument;
}
