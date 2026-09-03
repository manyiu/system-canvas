import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useNodesInitialized,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ExecutionResult,
  PlaybackState,
  SystemDocument,
  SystemGraph,
} from "@system-canvas/core";
import { applyFlowChanges } from "../adapter/from-flow.js";
import { toFlowGraph } from "../adapter/to-flow.js";
import { edgeTypes } from "../edges/ChannelEdge.js";
import { nodeTypes } from "../nodes/index.js";
import { NetworkSwimlanesOverlay } from "./NetworkSwimlanes.js";

export interface SystemCanvasProps {
  document: SystemDocument;
  executionResult?: ExecutionResult | null;
  playbackSpeed?: number;
  playbackState?: PlaybackState;
  onGraphChange: (graph: SystemGraph) => void;
}

function SystemCanvasInner({
  document,
  executionResult,
  playbackSpeed = 1,
  playbackState = "idle",
  onGraphChange,
}: SystemCanvasProps) {
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
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
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const syncingRef = useRef(false);
  const syncIdRef = useRef(0);

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

  useEffect(() => {
    const syncId = ++syncIdRef.current;
    syncingRef.current = true;
    setNodes(flowGraph.nodes);
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

    const frame = requestAnimationFrame(() => {
      fitView({ padding: 0.2, duration: 200 });
    });

    return () => cancelAnimationFrame(frame);
  }, [fitViewKey, fitView, flowGraph.nodes.length, nodesInitialized]);

  const emitGraphChange = useCallback(
    (nextNodes: Node[], nextEdges: Edge[]) => {
      const updated = applyFlowChanges(document.graph, nextNodes, nextEdges);
      onGraphChange(updated);
    },
    [document.graph, onGraphChange],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (syncingRef.current) return;
      setNodes((current) => {
        const next = applyNodeChanges(changes, current);
        emitGraphChange(next, edgesRef.current);
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
        const next = addEdge(
          { ...connection, type: "channel", id: `ch_${Date.now()}` },
          current,
        );
        emitGraphChange(nodesRef.current, next);
        return next;
      });
    },
    [emitGraphChange],
  );

  return (
    <div className="sc-canvas-root" data-testid="architecture-canvas">
      <div className="sc-flow-legend" aria-label="Flow delivery legend">
        <span className="sc-legend-item sc-legend-sync">sync — solid, call &amp; wait</span>
        <span className="sc-legend-item sc-legend-async">async — dashed, message / event</span>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onlyRenderVisibleElements={false}
        minZoom={0.2}
        maxZoom={2}
      >
        <NetworkSwimlanesOverlay graph={document.graph} />
        <Background gap={16} color="#334155" />
        <Controls />
        <MiniMap nodeColor="#475569" maskColor="rgb(15 23 42 / 70%)" />
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
