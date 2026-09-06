import type { ExampleMeta } from "@system-canvas/core";

export type { ExampleDifficulty, ExampleMeta, LayoutHint } from "@system-canvas/core";

export interface PatternFactory {
  id: string;
  meta: ExampleMeta;
  create: () => import("@system-canvas/core").SystemDocument;
}
