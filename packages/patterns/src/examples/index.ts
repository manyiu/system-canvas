import type { PatternFactory } from "../types.js";
import { communityExamples } from "./community.js";
import { easyExamples } from "./easy.js";
import { hardExamples } from "./hard.js";
import { mediumExamples } from "./medium.js";

export const allExamples: PatternFactory[] = [
  ...easyExamples,
  ...mediumExamples,
  ...hardExamples,
  ...communityExamples,
];
