import { buildSystemDocument } from "./ast-builder.js";
import { parse } from "./generated/parser.js";
import type { SystemDocument } from "@system-canvas/core";

export function parseDsl(source: string): SystemDocument {
  const parsed = parse(source);
  return buildSystemDocument(parsed);
}

export { buildSystemDocument } from "./ast-builder.js";
export { serializeDsl } from "./serialize.js";
