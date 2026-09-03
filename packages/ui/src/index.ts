export { SystemCanvas, type SystemCanvasProps } from "./canvas/SystemCanvas.js";
export { toFlowGraph, type FlowGraph, type FlowGraphOptions } from "./adapter/to-flow.js";
export {
  applyFlowChanges,
  createFlowNode,
  createFlowEdge,
} from "./adapter/from-flow.js";
export { layoutGraph, graphNeedsLayout } from "./adapter/layout.js";
export { resolveChannelHandles } from "./adapter/resolve-handles.js";
export {
  applyVisualDirectives,
  getNodeVisualStyle,
  type NodeVisualStyle,
  type EdgeVisualStyle,
} from "./visuals/apply-directives.js";
export { resolveNodeIcon, inferIconSlug, NODE_ICON_SLUGS } from "./icons/registry.js";
export type { NodeIconSlug } from "./icons/registry.js";
export { nodeTypes } from "./nodes/index.js";
export { edgeTypes } from "./edges/ChannelEdge.js";
