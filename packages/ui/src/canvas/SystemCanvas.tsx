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
import type { ExecutionStep, SystemDocument, SystemGraph } from "@system-canvas/core";
import { applyFlowChanges } from "../adapter/from-flow.js";
import { toFlowGraph } from "../adapter/to-flow.js";
import { edgeTypes } from "../edges/ChannelEdge.js";
import { nodeTypes } from "../nodes/index.js";

export interface SystemCanvasProps {
  document: SystemDocument;
  selectedStep?: ExecutionStep | null;
  onGraphChange: (graph: SystemGraph) => void;
}

function SystemCanvasInner({
  document,
  selectedStep,
  onGraphChange,
}: SystemCanvasProps) {
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const flowGraph = useMemo(
    () => toFlowGraph(document, { selectedStep, autoLayout: false }),
    [document, selectedStep],
  );

  const [nodes, setNodes] = useState<Node[]>(flowGraph.nodes);
  const [edges, setEdges] = useState<Edge[]>(flowGraph.edges);
  const syncingRef = useRef(false);
  const syncIdRef = useRef(0);
  const positionKey = document.graph.nodes
    .map((node) => `${node.id}:${node.position?.x ?? 0},${node.position?.y ?? 0}`)
    .join("|");
  const graphKey = `${document.graph.id}:${document.graph.channels.length}:${document.graph.nodes.length}:${positionKey}:${selectedStep?.index ?? "none"}`;

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
  }, [graphKey, fitView, flowGraph.nodes.length, nodesInitialized]);

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
        emitGraphChange(next, edges);
        return next;
      });
    },
    [edges, emitGraphChange],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (syncingRef.current) return;
      setEdges((current) => {
        const next = applyEdgeChanges(changes, current);
        emitGraphChange(nodes, next);
        return next;
      });
    },
    [nodes, emitGraphChange],
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setEdges((current) => {
        const next = addEdge(
          { ...connection, type: "channel", id: `ch_${Date.now()}` },
          current,
        );
        emitGraphChange(nodes, next);
        return next;
      });
    },
    [nodes, emitGraphChange],
  );

  return (
    <div className="sc-canvas-root" data-testid="architecture-canvas">
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
