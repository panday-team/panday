"use client";

//TODO🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥: Match colourway with udpated design🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
import type { ComponentPropsWithoutRef } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

export type ResourceLink = {
  label: string;
  href: string;
};

export type ChecklistItem = {
  id: string;
  title: string;
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
  onStatusChange?: (status: "base" | "in-progress" | "completed") => void;
  onNavigateToNode?: (nodeId: string) => void;
}

export function NodeInfoPanel({
  badge = "Start",
  title,
  subtitle,
  description,
  eligibility,
  benefits,
  outcomes,
  resources,
  categories,
  nodeType,
  nodeId: _nodeId,
  nodeStatus = "base",
  onStatusChange,
  onNavigateToNode,
  className,
  ...props
}: NodeInfoPanelProps) {
  return (
    <aside
      className={cn(
        "w-full rounded-3xl border border-white/10 bg-[#98B3F9]/95 px-8 pt-8 pb-10 text-black shadow-[0_40px_160px_rgba(0,0,0,0.45)] backdrop-blur md:max-w-lg",
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#76E54A] px-3 py-1 text-xs font-semibold tracking-wide text-[#1D2740] uppercase">
          {badge}
        </span>
        {subtitle ? (
          <span className="text-xs font-medium text-black/60">{subtitle}</span>
        ) : null}
      </div>

      <div className="mt-6 space-y-5">
        <header>
          <h1 className="font-sans text-3xl leading-tight text-black">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 text-sm leading-relaxed text-black">
              {description}
            </p>
          ) : null}
        </header>

        {eligibility?.length ? (
          <Section title="Eligibility" items={eligibility} />
        ) : null}
        {benefits?.length ? (
          <Section title="Benefits" items={benefits} />
        ) : null}
        {outcomes?.length ? (
          <Section title="Final Outcome" items={outcomes} />
        ) : null}

        {nodeType === "checklist" && onStatusChange ? (
          <section className="flex flex-row items-center gap-8">
            <label className="flex cursor-pointer items-center gap-2">
              <span className="text-sm text-black/90">Completed</span>
              <Checkbox
                checked={nodeStatus === "completed"}
                onCheckedChange={(checked) => {
                  onStatusChange(checked ? "completed" : "base");
                }}
                className="border-2 border-white/60 bg-white/10 data-[state=checked]:border-white data-[state=checked]:bg-[#61FF05] data-[state=checked]:text-white"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <span className="text-sm text-black/90">Save for Later</span>
              <Checkbox
                checked={nodeStatus === "in-progress"}
                onCheckedChange={(checked) => {
                  onStatusChange(checked ? "in-progress" : "base");
                }}
                className="border-2 border-white/60 bg-white/10 data-[state=checked]:border-white data-[state=checked]:bg-[#61FF05] data-[state=checked]:text-white"
              />
            </label>
          </section>
        ) : null}

        {categories?.length && onNavigateToNode ? (
          <CategoryNav categories={categories} onNavigateToNode={onNavigateToNode} />
        ) : null}

        {resources?.length ? (
          <section className="space-y-2 text-sm text-white/75">
            <h2 className="font-semibold text-white">Resources</h2>
            <ul className="space-y-1">
              {resources.map((resource) => (
                <li key={resource.href}>
                  <a
                    className="underline-offset-2 hover:underline"
                    href={resource.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {resource.label}
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
    <section className="space-y-2 text-sm leading-relaxed text-white/75">
      <h2 className="font-semibold text-white">{title}</h2>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function CategoryNav({
  categories,
  onNavigateToNode,
}: {
  categories: Category[];
  onNavigateToNode: (nodeId: string) => void;
}) {
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
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
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-white/20 px-3 py-2 text-left text-sm font-medium text-black hover:bg-white/30 transition-colors">
                <span>{category.title}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-1 pl-3">
                {category.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onNavigateToNode(item.id)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-black/80 hover:bg-white/20 hover:text-black transition-colors"
                  >
                    <span className="text-xs">→</span>
                    <span>{item.title}</span>
                  </button>
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </section>
  );
}
