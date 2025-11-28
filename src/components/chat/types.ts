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
