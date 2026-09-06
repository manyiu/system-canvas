import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  type Connection,
  Controls,
  type Edge,
  type EdgeChange,
  MiniMap,
  type Node,
  type NodeChange,
  type OnConnect,
  type OnMoveEnd,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type {
  ExecutionResult,
  PlaybackState,
  SystemDocument,
  SystemGraph,
} from "@system-canvas/core";
import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyFlowChanges } from "../adapter/from-flow.js";
import { toFlowGraph } from "../adapter/to-flow.js";
import { edgeTypes } from "../edges/ChannelEdge.js";
import type { SystemNodeData } from "../nodes/BaseSystemNode.js";
import { nodeTypes } from "../nodes/index.js";
import { NetworkSwimlanesOverlay } from "./NetworkSwimlanes.js";

export interface SystemCanvasProps {
  document: SystemDocument;
  executionResult?: ExecutionResult | null;
  playbackSpeed?: number;
  playbackState?: PlaybackState;
  onGraphChange: (graph: SystemGraph) => void;
}

const MINIMAP_IDLE_COLOR = "#94a3b8";
const MINIMAP_SELECTION_STROKE = "#38bdf8";
const FIT_VIEW_PADDING = 0.2;

function SystemCanvasInner({
  document,
  executionResult,
  playbackSpeed = 1,
  playbackState = "idle",
  onGraphChange,
}: SystemCanvasProps) {
  const { fitView, getNodes, getNodesBounds, getViewport } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const canvasRootRef = useRef<HTMLDivElement>(null);
  const flowGraph = useMemo(
    () =>
      toFlowGraph(document, {
        executionResult,
        autoLayout: false,
        playbackSpeed,
        playbackState,
      }),
    [document, executionResult, playbackSpeed, playbackState],
  );

  const [nodes, setNodes] = useState<Node[]>(flowGraph.nodes);
  const [edges, setEdges] = useState<Edge[]>(flowGraph.edges);
  const [minimapNeeded, setMinimapNeeded] = useState(false);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const syncingRef = useRef(false);
  const syncIdRef = useRef(0);
  const programmaticMoveRef = useRef(false);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const positionKey = document.graph.nodes
    .map((node) => `${node.id}:${node.position?.x ?? 0},${node.position?.y ?? 0}`)
    .join("|");
  const graphKey = `${document.graph.id}:${document.graph.channels.length}:${document.graph.nodes.length}:${positionKey}:${executionResult?.step.index ?? "none"}`;
  const fitViewKey = `${document.graph.id}:${document.graph.channels.length}:${document.graph.nodes.length}`;

  const updateMinimapNeeded = useCallback(() => {
    const container = canvasRootRef.current;
    if (!container || !nodesInitialized) {
      setMinimapNeeded(false);
      return;
    }

    const currentNodes = getNodes().filter((node) => !node.hidden);
    if (currentNodes.length === 0) {
      setMinimapNeeded(false);
      return;
    }

    const { clientWidth: width, clientHeight: height } = container;
    const { x, y, zoom } = getViewport();
    if (width === 0 || height === 0 || zoom === 0) {
      setMinimapNeeded(false);
      return;
    }

    const bounds = getNodesBounds(currentNodes);
    const visibleLeft = -x / zoom;
    const visibleTop = -y / zoom;
    const visibleRight = visibleLeft + width / zoom;
    const visibleBottom = visibleTop + height / zoom;
    // ~2px screen-space tolerance so fitView(padding: 0.2) still counts as "fits"
    const epsilon = 2 / zoom;

    const fits =
      bounds.x >= visibleLeft - epsilon &&
      bounds.y >= visibleTop - epsilon &&
      bounds.x + bounds.width <= visibleRight + epsilon &&
      bounds.y + bounds.height <= visibleBottom + epsilon;

    setMinimapNeeded(!fits);
  }, [getNodes, getNodesBounds, getViewport, nodesInitialized]);

  useEffect(() => {
    const syncId = ++syncIdRef.current;
    syncingRef.current = true;
    setNodes((current) => {
      const previousById = new Map(current.map((node) => [node.id, node]));
      return flowGraph.nodes.map((node) => {
        const previous = previousById.get(node.id);
        if (!previous?.measured) return node;
        return {
          ...node,
          measured: previous.measured,
          ...(previous.width != null ? { width: previous.width } : {}),
          ...(previous.height != null ? { height: previous.height } : {}),
        };
      });
    });
    requestAnimationFrame(() => {
      if (syncId !== syncIdRef.current) return;
      setEdges(flowGraph.edges);
      requestAnimationFrame(() => {
        if (syncId !== syncIdRef.current) return;
        syncingRef.current = false;
      });
    });
  }, [graphKey, flowGraph.nodes, flowGraph.edges]);

  useEffect(() => {
    if (!nodesInitialized || flowGraph.nodes.length === 0) return;

    programmaticMoveRef.current = true;

    const frame = requestAnimationFrame(() => {
      void fitView({ padding: FIT_VIEW_PADDING, duration: 200 }).then(() => {
        programmaticMoveRef.current = false;
        updateMinimapNeeded();
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [fitViewKey, fitView, flowGraph.nodes.length, nodesInitialized, updateMinimapNeeded]);

  useEffect(() => {
    const container = canvasRootRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      updateMinimapNeeded();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [updateMinimapNeeded]);

  useEffect(() => {
    if (!nodesInitialized) return;
    updateMinimapNeeded();
  }, [nodes, nodesInitialized, updateMinimapNeeded]);

  const emitGraphChange = useCallback(
    (nextNodes: Node[], nextEdges: Edge[]) => {
      const updated = applyFlowChanges(document.graph, nextNodes, nextEdges);
      onGraphChange(updated);
    },
    [document.graph, onGraphChange],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (syncingRef.current) {
        const dimensionChanges = changes.filter((change) => change.type === "dimensions");
        if (dimensionChanges.length === 0) return;
        setNodes((current) => applyNodeChanges(dimensionChanges, current));
        return;
      }

      const dimensionOnly =
        changes.length > 0 && changes.every((change) => change.type === "dimensions");

      setNodes((current) => {
        const next = applyNodeChanges(changes, current);
        if (!dimensionOnly) {
          emitGraphChange(next, edgesRef.current);
        }
        return next;
      });
    },
    [emitGraphChange],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (syncingRef.current) return;
      setEdges((current) => {
        const next = applyEdgeChanges(changes, current);
        emitGraphChange(nodesRef.current, next);
        return next;
      });
    },
    [emitGraphChange],
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setEdges((current) => {
        const next = addEdge({ ...connection, type: "channel", id: `ch_${Date.now()}` }, current);
        emitGraphChange(nodesRef.current, next);
        return next;
      });
    },
    [emitGraphChange],
  );

  const onMoveEnd: OnMoveEnd = useCallback(() => {
    if (programmaticMoveRef.current) {
      programmaticMoveRef.current = false;
    }
    updateMinimapNeeded();
  }, [updateMinimapNeeded]);

  const minimapNodeColor = useCallback((node: Node) => {
    const data = node.data as SystemNodeData;
    return data.visual?.borderColor ?? MINIMAP_IDLE_COLOR;
  }, []);

  const minimapNodeStrokeColor = useCallback((node: Node) => {
    return node.selected ? MINIMAP_SELECTION_STROKE : "transparent";
  }, []);

  const onMinimapNodeClick = useCallback(
    (_event: MouseEvent, node: Node) => {
      setNodes((current) =>
        current.map((entry) => ({
          ...entry,
          selected: entry.id === node.id,
        })),
      );
      programmaticMoveRef.current = true;
      void fitView({ nodes: [node], padding: 0.4, duration: 200 }).then(() => {
        programmaticMoveRef.current = false;
        updateMinimapNeeded();
      });
    },
    [fitView, updateMinimapNeeded],
  );

  return (
    <div ref={canvasRootRef} className="sc-canvas-root" data-testid="architecture-canvas">
      <div className="sc-flow-legend" aria-label="Flow delivery legend">
        <span className="sc-legend-item sc-legend-sync">sync — solid, call &amp; wait</span>
        <span className="sc-legend-item sc-legend-async">async — dashed, message / event</span>
      </div>
      <ReactFlow
        colorMode="dark"
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onMoveEnd={onMoveEnd}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onlyRenderVisibleElements={false}
        minZoom={0.2}
        maxZoom={2}
      >
        <NetworkSwimlanesOverlay graph={document.graph} />
        <Background gap={16} color="#334155" />
        <Controls />
        {minimapNeeded ? (
          <MiniMap
            ariaLabel="Architecture overview"
            pannable
            zoomable
            bgColor="#0f172a"
            nodeColor={minimapNodeColor}
            nodeStrokeColor={minimapNodeStrokeColor}
            nodeStrokeWidth={2}
            maskColor="rgb(2 6 23 / 70%)"
            maskStrokeColor="#475569"
            maskStrokeWidth={2}
            style={{ width: 140, height: 90 }}
            onNodeClick={onMinimapNodeClick}
          />
        ) : null}
      </ReactFlow>
    </div>
  );
}

export function SystemCanvas(props: SystemCanvasProps) {
  return (
    <ReactFlowProvider>
      <SystemCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
