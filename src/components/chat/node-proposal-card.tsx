"use client";

import { useState, useCallback } from "react";
import { Check, X, ChevronDown, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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

export type ProposalStatus = "pending" | "accepted" | "declined" | "error";

interface NodeProposalCardProps {
  proposal: NodeProposal;
  onAccept: (editedProposal: NodeProposal) => void;
  onDecline: () => void;
  disabled?: boolean;
  /** Current status of the proposal. Defaults to 'pending' */
  status?: ProposalStatus;
  /** Error message to show if status is 'error' */
  errorMessage?: string;
}

const NODE_TYPE_LABELS: Record<NodeProposal["type"], string> = {
  checklist: "Checklist",
  resource: "Resource",
  action: "Action",
  roadblock: "Roadblock",
};

const NODE_TYPE_COLORS: Record<NodeProposal["type"], string> = {
  checklist: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  resource: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  action: "bg-green-500/20 text-green-300 border-green-500/30",
  roadblock: "bg-orange-500/20 text-orange-300 border-orange-500/30",
};

// Common parent nodes for the dropdown
const PARENT_OPTIONS = [
  { id: "level-1", label: "Level 1" },
  { id: "level-2", label: "Level 2" },
  { id: "level-3", label: "Level 3" },
  { id: "level-4-construction", label: "Level 4 (Construction)" },
  { id: "level-4-industrial", label: "Level 4 (Industrial)" },
  { id: "red-seal-construction", label: "Red Seal (Construction)" },
  { id: "red-seal-industrial", label: "Red Seal (Industrial)" },
  { id: "foundation-program", label: "Foundation Program" },
  { id: "ace-it-program", label: "ACE IT Program" },
  { id: "direct-entry", label: "Direct Entry" },
];

export function NodeProposalCard({
  proposal,
  onAccept,
  onDecline,
  disabled = false,
  status = "pending",
  errorMessage,
}: NodeProposalCardProps) {
  // All hooks must be called unconditionally at the top
  const [isEditing, setIsEditing] = useState(false);
  const [editedProposal, setEditedProposal] = useState<NodeProposal>(proposal);
  const [showParentDropdown, setShowParentDropdown] = useState(false);

  const handleAccept = useCallback(() => {
    onAccept(editedProposal);
  }, [editedProposal, onAccept]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditedProposal((prev) => ({ ...prev, title: e.target.value }));
    },
    [],
  );

  const handleParentChange = useCallback((parentId: string) => {
    const option = PARENT_OPTIONS.find((o) => o.id === parentId);
    setEditedProposal((prev) => ({
      ...prev,
      parentId,
      parentLabel: option?.label ?? parentId,
    }));
    setShowParentDropdown(false);
  }, []);

  const handleChecklistItemChange = useCallback(
    (index: number, value: string) => {
      setEditedProposal((prev) => {
        if (!prev.checklistItems) return prev;
        const updated = [...prev.checklistItems];
        updated[index] = value;
        return { ...prev, checklistItems: updated };
      });
    },
    [],
  );

  const handleRemoveChecklistItem = useCallback((index: number) => {
    setEditedProposal((prev) => {
      if (!prev.checklistItems) return prev;
      const updated = prev.checklistItems.filter((_, i) => i !== index);
      return { ...prev, checklistItems: updated.length > 0 ? updated : null };
    });
  }, []);

  const handleAddChecklistItem = useCallback(() => {
    setEditedProposal((prev) => ({
      ...prev,
      checklistItems: [...(prev.checklistItems ?? []), ""],
    }));
  }, []);

  // Render completed states
  if (status === "accepted") {
    return (
      <div className="my-3 overflow-hidden rounded-xl border border-green-500/30 bg-gradient-to-br from-green-500/10 to-teal-500/10">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
            <CheckCircle2 size={18} className="text-green-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">
              {editedProposal.title}
            </p>
            <p className="text-xs text-green-400">Added to your roadmap</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "declined") {
    return (
      <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
            <XCircle size={18} className="text-white/50" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/50 line-through">
              {editedProposal.title}
            </p>
            <p className="text-xs text-white/40">Declined</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="my-3 overflow-hidden rounded-xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-orange-500/10">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20">
            <XCircle size={18} className="text-red-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">
              {editedProposal.title}
            </p>
            <p className="text-xs text-red-400">
              {errorMessage ?? "Failed to create node"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Default pending state with interactive UI
  return (
    <div className="my-3 overflow-hidden rounded-xl border border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-blue-500/10">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-500/20">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-teal-400"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
          <span className="text-xs font-medium text-white/70">Create Node</span>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-xs font-medium",
              NODE_TYPE_COLORS[editedProposal.type],
            )}
          >
            {NODE_TYPE_LABELS[editedProposal.type]}
          </span>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs text-white/50 hover:text-white/80"
        >
          {isEditing ? "Done editing" : "Edit"}
        </button>
      </div>

      {/* Content */}
      <div className="space-y-3 p-4">
        {/* Title */}
        <div>
          <label className="mb-1 block text-xs text-white/50">Title</label>
          {isEditing ? (
            <Input
              value={editedProposal.title}
              onChange={handleTitleChange}
              className="h-8 border-white/20 bg-white/5 text-sm text-white"
              maxLength={100}
            />
          ) : (
            <p className="text-sm font-medium text-white">
              {editedProposal.title}
            </p>
          )}
        </div>

        {/* Parent Node */}
        <div>
          <label className="mb-1 block text-xs text-white/50">Attach to</label>
          {isEditing ? (
            <div className="relative">
              <button
                onClick={() => setShowParentDropdown(!showParentDropdown)}
                className="flex h-8 w-full items-center justify-between rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white"
              >
                {editedProposal.parentLabel}
                <ChevronDown size={14} className="text-white/50" />
              </button>
              {showParentDropdown && (
                <div className="absolute top-full z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-white/20 bg-slate-800 py-1 shadow-lg">
                  {PARENT_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleParentChange(option.id)}
                      className={cn(
                        "w-full px-3 py-1.5 text-left text-sm hover:bg-white/10",
                        editedProposal.parentId === option.id
                          ? "bg-teal-500/20 text-teal-300"
                          : "text-white/80",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-white/80">
              {editedProposal.parentLabel}
            </p>
          )}
        </div>

        {/* Checklist Items */}
        {editedProposal.checklistItems &&
          editedProposal.checklistItems.length > 0 && (
            <div>
              <label className="mb-1 block text-xs text-white/50">
                Checklist Items ({editedProposal.checklistItems.length})
              </label>
              <ul className="space-y-1.5">
                {editedProposal.checklistItems.map((item, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm border border-white/30" />
                    {isEditing ? (
                      <>
                        <Input
                          value={item}
                          onChange={(e) =>
                            handleChecklistItemChange(index, e.target.value)
                          }
                          className="h-7 flex-1 border-white/20 bg-white/5 text-xs text-white"
                        />
                        <button
                          onClick={() => handleRemoveChecklistItem(index)}
                          className="text-red-400/70 hover:text-red-400"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-white/70">{item}</span>
                    )}
                  </li>
                ))}
              </ul>
              {isEditing && (
                <button
                  onClick={handleAddChecklistItem}
                  className="mt-2 text-xs text-teal-400 hover:text-teal-300"
                >
                  + Add item
                </button>
              )}
            </div>
          )}

        {/* Description preview (collapsed) */}
        {editedProposal.description && !isEditing && (
          <p className="line-clamp-2 text-xs text-white/50">
            {editedProposal.description}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDecline}
          disabled={disabled}
          className="h-8 text-white/70 hover:bg-white/10 hover:text-white"
        >
          <X size={14} className="mr-1" />
          Decline
        </Button>
        <Button
          size="sm"
          onClick={handleAccept}
          disabled={disabled}
          className="h-8 bg-teal-500 text-white hover:bg-teal-400"
        >
          <Check size={14} className="mr-1" />
          Create Node
        </Button>
      </div>
    </div>
  );
}
