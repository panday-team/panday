"use client";

import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

type ResourceLink = {
  label: string;
  href: string;
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
  nodeType?: string;
  nodeId?: string;
  nodeStatus?: "base" | "in-progress" | "completed";
  onStatusChange?: (status: "base" | "in-progress" | "completed") => void;
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
  nodeType,
  nodeId: _nodeId,
  nodeStatus = "base",
  onStatusChange,
  className,
  nodeColour,
  ...props
}: NodeInfoPanelProps) {
  return (
    <aside
      className={cn(
        "w-full rounded-3xl border border-white/10 bg-[#2D354B]/95 px-8 pt-8 pb-10 text-[#FFEDDA] md:max-w-md",
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-4">
        <span
          className={`inline-flex items-center gap-2 rounded-full ${nodeColour} px-3 py-1 text-xs font-semibold tracking-wide text-[#1D2740] uppercase`}
        >
          {badge}
        </span>
        {subtitle ? (
          <span className="text-xs font-medium text-white/60">{subtitle}</span>
        ) : null}
      </div>

      <div className="mt-6 space-y-5">
        <header>
          <h1 className="font-sans text-3xl leading-tight text-white">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 text-sm leading-relaxed text-white/75">
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
              <span className="text-sm text-white/90">Completed</span>
              <Checkbox
                checked={nodeStatus === "completed"}
                onCheckedChange={(checked) => {
                  onStatusChange(checked ? "completed" : "base");
                }}
                className="border-2 border-white/60 bg-white/10 data-[state=checked]:border-white data-[state=checked]:bg-[#61FF05] data-[state=checked]:text-white"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <span className="text-sm text-white/90">Save for Later</span>
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
