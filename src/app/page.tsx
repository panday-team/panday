"use client";
import { useState, useCallback } from "react";
import {
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

type NodeData = {
  label: string;
};

type FlowNode = Node<NodeData>;
type FlowEdge = Edge;
type FlowNodeChange = NodeChange<FlowNode>;
type FlowEdgeChange = EdgeChange<FlowEdge>;

const initialNodes: FlowNode[] = [
  { id: "n1", position: { x: 0, y: 0 }, data: { label: "Node 1" } },
  { id: "n2", position: { x: 0, y: 100 }, data: { label: "Node 2" } },
];

const initialEdges: FlowEdge[] = [{ id: "n1-n2", source: "n1", target: "n2" }];

export default function App() {
  const [nodes, setNodes] = useState<FlowNode[]>(initialNodes);
  const [edges, setEdges] = useState<FlowEdge[]>(initialEdges);

  const onNodesChange = useCallback(
    (changes: FlowNodeChange[]) =>
      setNodes((nodesSnapshot) =>
        applyNodeChanges<FlowNode>(changes, nodesSnapshot),
      ),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: FlowEdgeChange[]) =>
      setEdges((edgesSnapshot) =>
        applyEdgeChanges<FlowEdge>(changes, edgesSnapshot),
      ),
    [],
  );
  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((edgesSnapshot) => addEdge(connection, edgesSnapshot)),
    [],
  );

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      />
    </div>
  );
}
