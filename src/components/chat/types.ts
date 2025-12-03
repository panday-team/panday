/**
 * Type definitions for chat widget components and hooks
 */

export interface ChatWidgetProps {
  selectedNodeId?: string | null;
  selectedNodeTitle?: string | null;
  roadmapId?: string;
  userProfile?: {
    trade?: string;
    currentLevel?: string;
    specialization?: string;
    residencyStatus?: string;
  };
  onChatOpen?: () => void;
  forceClose?: boolean;
  onCustomNodeCreated?: (nodeId?: string) => void;
  /** Whether the node info panel is currently open */
  isNodePanelOpen?: boolean;
}

export type StreamStatusEvent = {
  type: "status";
  message: string;
};

export type StreamMetadataEvent = {
  type: "metadata";
  roadmapId?: string;
  sources?: unknown;
};

export type FaqQuickEntry = {
  id: string;
  question: string;
  frequency: number;
};

export type MinimalMessage = { content: string };

export interface RenameState {
  id: string;
  value: string;
}

/**
 * Node proposal returned by the proposeNode tool
 * Displayed as an interactive confirmation card in the chat
 */
export interface NodeProposal {
  title: string;
  description: string;
  parentId: string;
  parentLabel: string;
  type: "checklist" | "resource" | "action" | "roadblock";
  checklistItems: string[] | null;
  resources: Array<{ label: string; href: string }> | null;
  notes: string | null;
  dueDate: string | null;
}

/**
 * Tool invocation state for proposeNode
 */
export interface ProposeNodeToolPart {
  type: "tool-proposeNode";
  toolCallId: string;
  state: "partial-call" | "call" | "result";
  input?: NodeProposal;
  result?: {
    status: "pending" | "accepted" | "declined";
    proposal: NodeProposal;
    nodeId?: string;
  };
}
