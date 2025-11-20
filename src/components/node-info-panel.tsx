"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
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

export interface NodeInfoPanelProps extends ComponentPropsWithoutRef<"aside"> {
  badge?: string;
  title: string;
  subtitle?: string;
  description?: string;
  eligibility?: string[];
  benefits?: string[];
  outcomes?: string[];
  resources?: ResourceLink[];
  categories?: Category[];
  nodeType?: string;
  nodeId?: string;
  nodeStatus?: "base" | "in-progress" | "completed";
  progress?: ProgressData | null;
  isCustomNode?: boolean;
  onStatusChange?: (status: "base" | "in-progress" | "completed") => void;
  onNavigateToNode?: (nodeId: string) => void;
  onChecklistStatusChange?: (
    nodeId: string,
    status: "base" | "in-progress" | "completed",
  ) => void;
  onDeleteCustomNode?: (nodeId: string) => Promise<void>;
  onCheckboxClick?: () => void;
  onDropdownOpen?: () => void;
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
  categories,
  nodeType,
  nodeId,
  nodeStatus = "base",
  progress,
  isCustomNode = false,
  onStatusChange,
  onNavigateToNode,
  onChecklistStatusChange,
  onDeleteCustomNode,
  onCheckboxClick,
  onDropdownOpen,
  className,
  ...props
}: NodeInfoPanelProps) {
  // Use title as badge if badge is not provided
  const displayBadge = badge ?? title;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteConfirmRef = useRef<HTMLDivElement>(null);

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
        "max-h-[calc(100vh-2rem)] w-full overflow-y-auto rounded-3xl border border-white/10 bg-[#98B3F9]/95 px-8 pt-8 pb-10 text-black shadow-[0_40px_160px_rgba(0,0,0,0.45)] backdrop-blur md:max-h-[calc(100vh-5rem)] md:max-w-lg",
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#76E54A] px-3 py-1 text-xs font-semibold tracking-wide text-[#1D2740] uppercase [&_strong]:font-bold">
          <ReactMarkdown
            components={{
              p: ({ node: _node, ...props }) => <span {...props} />,
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
        <header>
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-sans text-3xl leading-tight text-black [&_strong]:font-bold">
              <ReactMarkdown
                components={{
                  p: ({ node: _node, ...props }) => <span {...props} />,
                }}
                remarkPlugins={[remarkGfm]}
              >
                {title}
              </ReactMarkdown>
            </h1>
            <div className="flex items-start gap-2">
              {nodeType === "checklist" && onStatusChange ? (
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
              {isCustomNode && nodeId && onDeleteCustomNode ? (
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
          {description ? (
            <div className="mt-2 text-sm leading-relaxed text-black [&_a]:text-blue-600 [&_a]:underline [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-bold">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
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

        {resources?.length ? (
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
      </div>
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
