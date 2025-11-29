"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ExternalLink,
  Trash2,
  X,
  Check,
  Loader2,
  ArrowLeft,
  Pencil,
  Plus,
} from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { ProgressData } from "@/lib/progress-utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type ResourceLink = {
  label: string;
  href: string;
};

export type ChecklistItem = {
  id: string;
  title: string;
  status?: "base" | "in-progress" | "completed";
  href?: string;
};

export type Category = {
  id: string;
  title: string;
  description?: string;
  items: ChecklistItem[];
};

/** Data structure for editing custom nodes */
export interface CustomNodeEditData {
  title: string;
  description: string;
  checklistItems: Array<{ id: string; title: string; completed: boolean }>;
  resources: ResourceLink[];
}

export interface NodeInfoPanelProps extends ComponentPropsWithoutRef<"aside"> {
  badge?: string;
  title: string;
  subtitle?: string;
  description?: string;
  eligibility?: string[];
  benefits?: string[];
  outcomes?: string[];
  resources?: ResourceLink[];
  checklistItems?: Array<{ id: string; title: string; completed: boolean }>;
  categories?: Category[];
  nodeType?: string;
  nodeId?: string;
  nodeStatus?: "base" | "in-progress" | "completed";
  progress?: ProgressData | null;
  isCustomNode?: boolean;
  /** Parent node ID for back navigation (null if no parent) */
  parentNodeId?: string | null;
  /** Parent node title for back button label */
  parentNodeTitle?: string | null;
  onStatusChange?: (status: "base" | "in-progress" | "completed") => void;
  onNavigateToNode?: (nodeId: string) => void;
  onChecklistStatusChange?: (
    nodeId: string,
    status: "base" | "in-progress" | "completed",
  ) => void;
  onDeleteCustomNode?: (nodeId: string) => Promise<void>;
  /** Called when a custom node is edited and saved */
  onEditCustomNode?: (
    nodeId: string,
    data: CustomNodeEditData,
  ) => Promise<void>;
  onCheckboxClick?: () => void;
  onDropdownOpen?: () => void;
  /** Called when close button is clicked */
  onClose?: () => void;
}

export function NodeInfoPanel({
  badge,
  title,
  subtitle,
  description,
  eligibility,
  benefits,
  outcomes,
  resources,
  checklistItems,
  categories,
  nodeType,
  nodeId,
  nodeStatus = "base",
  progress,
  isCustomNode = false,
  parentNodeId,
  parentNodeTitle,
  onStatusChange,
  onNavigateToNode,
  onChecklistStatusChange,
  onDeleteCustomNode,
  onEditCustomNode,
  onCheckboxClick,
  onDropdownOpen,
  onClose,
  className,
  ...props
}: NodeInfoPanelProps) {
  // Use title as badge if badge is not provided
  const displayBadge = badge ?? title;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const deleteConfirmRef = useRef<HTMLDivElement>(null);

  // Edit state - initialize with current values
  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState(description ?? "");
  const [editChecklistItems, setEditChecklistItems] = useState<
    Array<{ id: string; title: string; completed: boolean }>
  >(checklistItems ?? []);
  const [editResources, setEditResources] = useState<ResourceLink[]>(
    resources ?? [],
  );
  const [editError, setEditError] = useState<string | null>(null);

  // Reset edit state when node changes or when exiting edit mode
  useEffect(() => {
    if (!isEditing) {
      setEditTitle(title);
      setEditDescription(description ?? "");
      setEditChecklistItems(checklistItems ?? []);
      setEditResources(resources ?? []);
    }
  }, [title, description, checklistItems, resources, isEditing]);

  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
    setEditError(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditError(null);
    // Reset to original values
    setEditTitle(title);
    setEditDescription(description ?? "");
    setEditChecklistItems(checklistItems ?? []);
    setEditResources(resources ?? []);
  }, [title, description, checklistItems, resources]);

  const handleSaveEdit = useCallback(async () => {
    if (!nodeId || !onEditCustomNode) return;

    setIsSaving(true);
    setEditError(null);
    try {
      await onEditCustomNode(nodeId, {
        title: editTitle,
        description: editDescription,
        checklistItems: editChecklistItems,
        resources: editResources,
      });
      setIsEditing(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save changes";
      setEditError(message);
    } finally {
      setIsSaving(false);
    }
  }, [
    nodeId,
    onEditCustomNode,
    editTitle,
    editDescription,
    editChecklistItems,
    editResources,
  ]);

  const handleAddChecklistItem = useCallback(() => {
    setEditChecklistItems((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, title: "", completed: false },
    ]);
  }, []);

  const handleRemoveChecklistItem = useCallback((index: number) => {
    setEditChecklistItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleChecklistItemChange = useCallback(
    (index: number, value: string) => {
      setEditChecklistItems((prev) => {
        const updated = [...prev];
        const item = updated[index];
        if (item) {
          updated[index] = {
            id: item.id,
            title: value,
            completed: item.completed,
          };
        }
        return updated;
      });
    },
    [],
  );

  const handleAddResource = useCallback(() => {
    setEditResources((prev) => [...prev, { label: "", href: "" }]);
  }, []);

  const handleRemoveResource = useCallback((index: number) => {
    setEditResources((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleResourceChange = useCallback(
    (index: number, field: "label" | "href", value: string) => {
      setEditResources((prev) => {
        const updated = [...prev];
        const item = updated[index];
        if (item) {
          updated[index] = {
            label: field === "label" ? value : item.label,
            href: field === "href" ? value : item.href,
          };
        }
        return updated;
      });
    },
    [],
  );

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (nodeId && onDeleteCustomNode) {
      setIsDeleting(true);
      try {
        await onDeleteCustomNode(nodeId);
      } finally {
        setIsDeleting(false);
        setShowDeleteConfirm(false);
      }
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  // Close confirmation on click outside
  useEffect(() => {
    if (!showDeleteConfirm) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        deleteConfirmRef.current &&
        !deleteConfirmRef.current.contains(event.target as Node)
      ) {
        setShowDeleteConfirm(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDeleteConfirm]);

  return (
    <aside
      data-tutorial="node-info-panel"
      className={cn(
        "flex max-h-[calc(100vh-2rem)] w-full min-w-[320px] flex-col rounded-3xl border border-white/10 bg-[#98B3F9]/95 text-black shadow-[0_40px_160px_rgba(0,0,0,0.45)] backdrop-blur md:max-h-[calc(100vh-5rem)] md:max-w-lg md:min-w-[480px]",
        className,
      )}
      {...props}
    >
      {/* Scrollable content area */}
      <div className="scrollbar-panel flex-1 overflow-y-auto px-8 pt-6 pb-6">
        {/* Navigation bar: Back and Close buttons */}
        <div className="mb-4 flex items-center justify-between">
          {parentNodeId && onNavigateToNode ? (
            <button
              onClick={() => onNavigateToNode(parentNodeId)}
              className="group flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-black/70 transition-all hover:bg-white/20 hover:text-black"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              <span className="max-w-[120px] truncate">
                {parentNodeTitle ?? "Back"}
              </span>
            </button>
          ) : (
            <div /> /* Spacer to keep close button on the right */
          )}
          {onClose ? (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-black/60 transition-all hover:bg-white/20 hover:text-black"
              aria-label="Close panel"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#76E54A] px-3 py-1 text-xs font-semibold tracking-wide text-[#1D2740] uppercase [&_strong]:font-bold">
            <ReactMarkdown
              components={{
                p: ({ node: _node, ...props }) => <span {...props} />,
                a: ({ node: _node, ...props }) => (
                  <a {...props} target="_blank" rel="noreferrer" />
                ),
              }}
              remarkPlugins={[remarkGfm]}
            >
              {displayBadge}
            </ReactMarkdown>
          </span>
          <div className="flex items-center gap-2">
            {subtitle ? (
              <span className="text-xs font-medium text-black/60 [&_strong]:font-bold">
                <ReactMarkdown
                  components={{
                    p: ({ node: _node, ...props }) => <span {...props} />,
                    a: ({ node: _node, ...props }) => (
                      <a {...props} target="_blank" rel="noreferrer" />
                    ),
                  }}
                  remarkPlugins={[remarkGfm]}
                >
                  {subtitle}
                </ReactMarkdown>
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-6 space-y-5">
          {/* Edit Mode Header */}
          {isEditing && isCustomNode ? (
            <div className="flex items-center gap-2 rounded-xl bg-amber-400/20 px-4 py-2.5 ring-1 ring-amber-500/30">
              <Pencil className="h-4 w-4 text-amber-700" />
              <span className="text-sm font-medium text-amber-800">
                Editing Custom Node
              </span>
            </div>
          ) : null}

          <header>
            <div className="flex items-start justify-between gap-4">
              {isEditing ? (
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-medium text-black/60">
                    Title
                  </label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="h-11 border-black/20 bg-white/70 text-xl font-semibold text-black shadow-sm placeholder:text-black/40 focus:bg-white focus:ring-2 focus:ring-amber-400/50"
                    placeholder="Node title"
                    maxLength={100}
                  />
                </div>
              ) : (
                <h1 className="font-sans text-3xl leading-tight text-black [&_strong]:font-bold">
                  <ReactMarkdown
                    components={{
                      p: ({ node: _node, ...props }) => <span {...props} />,
                      a: ({ node: _node, ...props }) => (
                        <a {...props} target="_blank" rel="noreferrer" />
                      ),
                    }}
                    remarkPlugins={[remarkGfm]}
                  >
                    {title}
                  </ReactMarkdown>
                </h1>
              )}
              <div className="flex items-start gap-2">
                {/* Edit button for custom nodes */}
                {isCustomNode && nodeId && onEditCustomNode && !isEditing ? (
                  <button
                    onClick={handleStartEdit}
                    className="group mt-1 shrink-0 rounded-md p-1 text-black/40 transition-all duration-200 hover:bg-black/10 hover:text-black/70"
                    title="Edit this custom node"
                    aria-label="Edit custom node"
                  >
                    <Pencil className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                  </button>
                ) : null}
                {nodeType === "checklist" && onStatusChange && !isEditing ? (
                  <div className="mt-1 shrink-0 p-1">
                    <Checkbox
                      data-tutorial="checklist-checkbox"
                      checked={nodeStatus === "completed"}
                      onCheckedChange={(checked) => {
                        onStatusChange(checked ? "completed" : "base");
                        if (onCheckboxClick) {
                          onCheckboxClick();
                        }
                      }}
                      className="h-5 w-5 border-2 border-white/60 bg-white/10 data-[state=checked]:border-white data-[state=checked]:bg-[#61FF05] data-[state=checked]:text-white"
                    />
                  </div>
                ) : null}
                {isCustomNode && nodeId && onDeleteCustomNode && !isEditing ? (
                  <div className="relative" ref={deleteConfirmRef}>
                    <button
                      onClick={handleDeleteClick}
                      className={cn(
                        "group mt-1 shrink-0 rounded-md p-1 transition-all duration-200",
                        showDeleteConfirm
                          ? "bg-red-500/20 text-red-600"
                          : "text-red-600/60 hover:bg-red-500/10 hover:text-red-600",
                      )}
                      title="Delete this custom node"
                      aria-label="Delete custom node"
                    >
                      <Trash2 className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                    </button>
                    {showDeleteConfirm && (
                      <div className="animate-in fade-in slide-in-from-top-2 absolute top-full right-0 z-50 mt-2 duration-200">
                        <div className="flex items-center gap-1.5 rounded-xl border-2 border-black/10 bg-white p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-sm">
                          <button
                            onClick={() => void handleDeleteConfirm()}
                            disabled={isDeleting}
                            className="group/btn flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-red-600 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Confirm delete"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:scale-110" />
                            )}
                            {isDeleting ? "Deleting..." : "Delete"}
                          </button>
                          <button
                            onClick={handleDeleteCancel}
                            disabled={isDeleting}
                            className="group/btn flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Cancel delete"
                          >
                            <X className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:scale-110" />
                            Cancel
                          </button>
                        </div>
                        {/* Subtle arrow pointer */}
                        <div className="absolute -top-1 right-2 h-2 w-2 rotate-45 border-t-2 border-l-2 border-black/10 bg-white"></div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
            {/* Description - editable for custom nodes in edit mode */}
            {isEditing && isCustomNode ? (
              <div className="mt-4 space-y-1">
                <label className="text-xs font-medium text-black/60">
                  Description
                </label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="min-h-[100px] resize-none border-black/20 bg-white/70 text-sm leading-relaxed text-black shadow-sm placeholder:text-black/40 focus:bg-white focus:ring-2 focus:ring-amber-400/50"
                  placeholder="Add a description for this step..."
                  maxLength={1000}
                />
              </div>
            ) : description ? (
              <div className="mt-2 space-y-3 text-sm leading-relaxed text-black [&_a]:text-blue-600 [&_a]:underline [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-black [&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-black [&_ol]:mb-2 [&_ol]:ml-4 [&_ol]:list-decimal [&_ol]:space-y-1 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_ul]:mb-2 [&_ul]:ml-4 [&_ul]:list-disc [&_ul]:space-y-1">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ node: _node, ...props }) => (
                      <a {...props} target="_blank" rel="noreferrer" />
                    ),
                  }}
                >
                  {description}
                </ReactMarkdown>
              </div>
            ) : null}
          </header>

          {progress && progress.total > 0 ? (
            <ProgressBar
              completed={progress.completed}
              total={progress.total}
              percentage={progress.percentage}
            />
          ) : null}

          {eligibility?.length ? (
            <Section title="Eligibility" items={eligibility} />
          ) : null}
          {benefits?.length ? (
            <Section title="Benefits" items={benefits} />
          ) : null}
          {outcomes?.length ? (
            <Section title="Final Outcome" items={outcomes} />
          ) : null}

          {categories?.length && onNavigateToNode ? (
            <CategoryNav
              categories={categories}
              onNavigateToNode={onNavigateToNode}
              onChecklistStatusChange={onChecklistStatusChange}
              onCheckboxClick={onCheckboxClick}
              onDropdownOpen={onDropdownOpen}
            />
          ) : null}

          {/* Resources Section - editable for custom nodes */}
          {isEditing && isCustomNode ? (
            <section className="space-y-3 rounded-xl bg-white/30 p-4 ring-1 ring-black/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-black/60" />
                  <h2 className="font-semibold text-black">Resources</h2>
                </div>
                <button
                  onClick={handleAddResource}
                  className="flex items-center gap-1.5 rounded-lg bg-black/5 px-2.5 py-1.5 text-xs font-medium text-black/70 transition-all hover:bg-black/10 hover:text-black"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Link
                </button>
              </div>
              {editResources.length > 0 ? (
                <ul className="space-y-3">
                  {editResources.map((resource, index) => (
                    <li
                      key={index}
                      className="group relative rounded-lg bg-white/50 p-3 ring-1 ring-black/10 transition-all hover:ring-black/20"
                    >
                      <button
                        onClick={() => handleRemoveResource(index)}
                        className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow-sm transition-all group-hover:opacity-100 hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="space-y-2">
                        <Input
                          value={resource.label}
                          onChange={(e) =>
                            handleResourceChange(index, "label", e.target.value)
                          }
                          className="h-8 border-black/10 bg-white/80 text-sm font-medium text-black placeholder:text-black/40 focus:ring-2 focus:ring-amber-400/50"
                          placeholder="Link name (e.g., SkilledTradesBC)"
                        />
                        <Input
                          value={resource.href}
                          onChange={(e) =>
                            handleResourceChange(index, "href", e.target.value)
                          }
                          className="h-8 border-black/10 bg-white/80 font-mono text-xs text-black/70 placeholder:text-black/40 focus:ring-2 focus:ring-amber-400/50"
                          placeholder="https://example.com"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-black/10 py-6 text-center">
                  <ExternalLink className="mb-2 h-6 w-6 text-black/30" />
                  <p className="text-xs text-black/50">No resources yet</p>
                  <p className="text-xs text-black/40">
                    Add helpful links for this step
                  </p>
                </div>
              )}
            </section>
          ) : resources?.length ? (
            <section className="space-y-2 text-sm text-black/80">
              <h2 className="font-semibold text-black">Resources</h2>
              <ul className="space-y-1">
                {resources.map((resource) => (
                  <li key={resource.href} className="[&_strong]:font-bold">
                    <a
                      className="underline-offset-2 hover:underline"
                      href={resource.href}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <ReactMarkdown
                        components={{
                          p: ({ node: _node, ...props }) => <span {...props} />,
                        }}
                        remarkPlugins={[remarkGfm]}
                      >
                        {resource.label}
                      </ReactMarkdown>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Checklist Section - editable for custom nodes */}
          {isEditing && isCustomNode ? (
            <section className="space-y-3 rounded-xl bg-white/30 p-4 ring-1 ring-black/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-black/60" />
                  <h2 className="font-semibold text-black">Checklist</h2>
                </div>
                <button
                  onClick={handleAddChecklistItem}
                  className="flex items-center gap-1.5 rounded-lg bg-black/5 px-2.5 py-1.5 text-xs font-medium text-black/70 transition-all hover:bg-black/10 hover:text-black"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Item
                </button>
              </div>
              {editChecklistItems.length > 0 ? (
                <ul className="space-y-2">
                  {editChecklistItems.map((item, index) => (
                    <li
                      key={item.id}
                      className="group flex items-center gap-3 rounded-lg bg-white/50 px-3 py-2.5 ring-1 ring-black/10 transition-all hover:ring-black/20"
                    >
                      <Checkbox
                        checked={item.completed}
                        disabled
                        className="h-5 w-5 shrink-0 border-2 border-black/20 bg-white data-[state=checked]:border-[#61FF05] data-[state=checked]:bg-[#61FF05] data-[state=checked]:text-white"
                      />
                      <Input
                        value={item.title}
                        onChange={(e) =>
                          handleChecklistItemChange(index, e.target.value)
                        }
                        className="h-8 flex-1 border-black/10 bg-white/80 text-sm text-black placeholder:text-black/40 focus:ring-2 focus:ring-amber-400/50"
                        placeholder="What needs to be done?"
                      />
                      <button
                        onClick={() => handleRemoveChecklistItem(index)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-red-500/50 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500 hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-black/10 py-6 text-center">
                  <Check className="mb-2 h-6 w-6 text-black/30" />
                  <p className="text-xs text-black/50">
                    No checklist items yet
                  </p>
                  <p className="text-xs text-black/40">
                    Break down this step into tasks
                  </p>
                </div>
              )}
            </section>
          ) : checklistItems?.length ? (
            <section className="space-y-2 text-sm text-black/80">
              <h2 className="font-semibold text-black">Checklist</h2>
              <ul className="space-y-2">
                {checklistItems.map((item) => (
                  <li key={item.id} className="flex items-start gap-2">
                    <Checkbox
                      checked={item.completed}
                      disabled
                      className="mt-0.5 h-4 w-4 shrink-0 border-2 border-black/30 bg-white/10 data-[state=checked]:border-[#61FF05] data-[state=checked]:bg-[#61FF05] data-[state=checked]:text-white"
                    />
                    <span className="flex-1 leading-relaxed [&_strong]:font-bold">
                      {item.title}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      {/* Sticky footer for edit mode action buttons */}
      {isEditing && isCustomNode ? (
        <div className="shrink-0 border-t border-black/10 bg-[#98B3F9]/95 px-8 py-4">
          {/* Error message */}
          {editError ? (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-700 ring-1 ring-red-500/20">
              <X className="h-4 w-4 shrink-0" />
              <span>{editError}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-black/5 px-5 py-2.5 text-sm font-medium text-black/70 shadow-sm transition-all hover:bg-black/10 hover:shadow active:scale-[0.98] disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={() => void handleSaveEdit()}
              disabled={isSaving || !editTitle.trim()}
              className="flex items-center gap-2 rounded-xl bg-[#61FF05] px-5 py-2.5 text-sm font-semibold text-black shadow-sm transition-all hover:bg-[#6FFF1A] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="space-y-2 text-sm leading-relaxed text-black/80">
      <h2 className="font-semibold text-black">{title}</h2>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {items.map((item) => (
          <li key={item} className="[&_strong]:font-bold">
            <ReactMarkdown
              components={{
                p: ({ node: _node, ...props }) => <span {...props} />,
                a: ({ node: _node, ...props }) => (
                  <a {...props} target="_blank" rel="noreferrer" />
                ),
              }}
              remarkPlugins={[remarkGfm]}
            >
              {item}
            </ReactMarkdown>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CategoryNav({
  categories,
  onNavigateToNode,
  onChecklistStatusChange,
  onCheckboxClick,
  onDropdownOpen,
}: {
  categories: Category[];
  onNavigateToNode: (nodeId: string) => void;
  onChecklistStatusChange?: (
    nodeId: string,
    status: "base" | "in-progress" | "completed",
  ) => void;
  onCheckboxClick?: () => void;
  onDropdownOpen?: () => void;
}) {
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      const wasOpening = !next.has(categoryId);

      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }

      // Defer callback to after render completes
      if (wasOpening && onDropdownOpen) {
        setTimeout(() => {
          onDropdownOpen();
        }, 0);
      }

      return next;
    });
  };

  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-black">Quick Navigation</h2>
      <div className="space-y-2">
        {categories.map((category) => {
          const isOpen = openCategories.has(category.id);
          return (
            <Collapsible
              key={category.id}
              open={isOpen}
              onOpenChange={() => toggleCategory(category.id)}
            >
              <CollapsibleTrigger
                data-tutorial="dropdown-trigger"
                className="flex w-full items-center justify-between rounded-lg bg-white/20 px-3 py-2 text-left text-sm font-medium text-black transition-colors hover:bg-white/30"
              >
                <span className="[&_strong]:font-bold">
                  <ReactMarkdown
                    components={{
                      p: ({ node: _node, ...props }) => <span {...props} />,
                      a: ({ node: _node, ...props }) => (
                        <a {...props} target="_blank" rel="noreferrer" />
                      ),
                    }}
                    remarkPlugins={[remarkGfm]}
                  >
                    {category.title}
                  </ReactMarkdown>
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-1 pl-3">
                {category.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-white/20"
                  >
                    {onChecklistStatusChange ? (
                      <Checkbox
                        data-tutorial="checklist-checkbox"
                        checked={item.status === "completed"}
                        onCheckedChange={(checked) => {
                          onChecklistStatusChange(
                            item.id,
                            checked ? "completed" : "base",
                          );
                          if (onCheckboxClick) {
                            onCheckboxClick();
                          }
                        }}
                        className="h-4 w-4 shrink-0 border-2 border-black/30 bg-white/10 data-[state=checked]:border-[#61FF05] data-[state=checked]:bg-[#61FF05] data-[state=checked]:text-white"
                      />
                    ) : (
                      <span className="text-xs text-black/60">→</span>
                    )}
                    {item.href ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-1 items-center gap-1.5 text-left text-sm text-black/80 transition-colors hover:text-black hover:underline [&_strong]:font-bold"
                      >
                        <span>
                          <ReactMarkdown
                            components={{
                              p: ({ node: _node, ...props }) => (
                                <span {...props} />
                              ),
                              a: ({ node: _node, ...props }) => (
                                <a
                                  {...props}
                                  target="_blank"
                                  rel="noreferrer"
                                />
                              ),
                            }}
                            remarkPlugins={[remarkGfm]}
                          >
                            {item.title}
                          </ReactMarkdown>
                        </span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    ) : (
                      <button
                        onClick={() => onNavigateToNode(item.id)}
                        className="flex-1 text-left text-sm text-black/80 transition-colors hover:text-black [&_strong]:font-bold"
                      >
                        <ReactMarkdown
                          components={{
                            p: ({ node: _node, ...props }) => (
                              <span {...props} />
                            ),
                            a: ({ node: _node, ...props }) => (
                              <a {...props} target="_blank" rel="noreferrer" />
                            ),
                          }}
                          remarkPlugins={[remarkGfm]}
                        >
                          {item.title}
                        </ReactMarkdown>
                      </button>
                    )}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </section>
  );
}
