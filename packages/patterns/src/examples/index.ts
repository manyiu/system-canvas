import { easyExamples } from "./easy.js";
import { mediumExamples } from "./medium.js";
import { hardExamples } from "./hard.js";
import { communityExamples } from "./community.js";
import type { PatternFactory } from "../types.js";

export const allExamples: PatternFactory[] = [
  ...easyExamples,
  ...mediumExamples,
  ...hardExamples,
  ...communityExamples,
];
