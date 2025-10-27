import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";
import { RoadmapChecklist } from "@/components/roadmap-checklist";
import type { ChecklistSection } from "@/data/types/roadmap";

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
  checklists?: ChecklistSection[];
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
  checklists,
  className,
  ...props
}: NodeInfoPanelProps) {
  // If we have checklists, render the new checklist-based UI
  if (checklists?.length) {
    return (
      <aside
        className={cn(
          "w-full rounded-3xl border border-white/10 bg-[#2D354B]/95 px-8 pt-8 pb-10 text-[#FFEDDA] shadow-[0_40px_160px_rgba(0,0,0,0.45)] backdrop-blur md:w-md md:max-w-[33vw]",
          className,
        )}
        {...props}
      >
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#76E54A] px-3 py-1 text-xs font-semibold tracking-wide text-[#1D2740] uppercase">
            {badge}
          </span>
          {subtitle ? (
            <span className="text-xs font-medium text-white/60">
              {subtitle}
            </span>
          ) : null}
        </div>

        <div className="mt-6 space-y-5">
          <header>
            <h1 className="font-['Inria_Sans',sans-serif] text-[31px] leading-tight text-white">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                {description}
              </p>
            ) : null}
          </header>

          <div className="max-h-[60vh] overflow-y-auto pr-2">
            <RoadmapChecklist sections={checklists} />
          </div>
        </div>
      </aside>
    );
  }

  // Fallback to the old UI if no checklists
  return (
    <aside
      className={cn(
        "w-full rounded-3xl border border-white/10 bg-[#2D354B]/95 px-8 pt-8 pb-10 text-[#FFEDDA] shadow-[0_40px_160px_rgba(0,0,0,0.45)] backdrop-blur md:w-md md:max-w-[33vw]",
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#76E54A] px-3 py-1 text-xs font-semibold tracking-wide text-[#1D2740] uppercase">
          {badge}
        </span>
        {subtitle ? (
          <span className="text-xs font-medium text-white/60">{subtitle}</span>
        ) : null}
      </div>

      <div className="mt-6 space-y-5">
        <header>
          <h1 className="font-['Inria_Sans',sans-serif] text-[31px] leading-tight text-white">
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
