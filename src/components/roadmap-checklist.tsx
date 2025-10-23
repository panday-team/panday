"use client";

import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import type { ChecklistSection, ChecklistItem } from "@/data/types/roadmap";

interface RoadmapChecklistProps {
  sections: ChecklistSection[];
  onItemToggle?: (
    sectionIndex: number,
    itemId: string,
    checked: boolean,
  ) => void;
}

export function RoadmapChecklist({
  sections,
  onItemToggle,
}: RoadmapChecklistProps) {
  return (
    <div className="space-y-4">
      {sections.map((section, sectionIndex) => (
        <ChecklistSectionComponent
          key={`section-${sectionIndex}`}
          section={section}
          sectionIndex={sectionIndex}
          onItemToggle={onItemToggle}
        />
      ))}
    </div>
  );
}

interface ChecklistSectionComponentProps {
  section: ChecklistSection;
  sectionIndex: number;
  onItemToggle?: (
    sectionIndex: number,
    itemId: string,
    checked: boolean,
  ) => void;
}

function ChecklistSectionComponent({
  section,
  sectionIndex,
  onItemToggle,
}: ChecklistSectionComponentProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (section.collapsible) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="border-border bg-card hover:bg-accent flex w-full items-center justify-between rounded-lg border p-3 text-left">
          <h3 className="text-foreground text-sm font-semibold">
            {section.title}
          </h3>
          {isOpen ? (
            <ChevronDown className="text-muted-foreground h-4 w-4" />
          ) : (
            <ChevronRight className="text-muted-foreground h-4 w-4" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2 pl-2">
          {section.items.map((item) => (
            <ChecklistItemComponent
              key={item.id}
              item={item}
              sectionIndex={sectionIndex}
              onItemToggle={onItemToggle}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-foreground text-sm font-semibold">{section.title}</h3>
      <div className="space-y-2 pl-2">
        {section.items.map((item) => (
          <ChecklistItemComponent
            key={item.id}
            item={item}
            sectionIndex={sectionIndex}
            onItemToggle={onItemToggle}
          />
        ))}
      </div>
    </div>
  );
}

interface ChecklistItemComponentProps {
  item: ChecklistItem;
  sectionIndex: number;
  onItemToggle?: (
    sectionIndex: number,
    itemId: string,
    checked: boolean,
  ) => void;
}

function ChecklistItemComponent({
  item,
  sectionIndex,
  onItemToggle,
}: ChecklistItemComponentProps) {
  const [checked, setChecked] = useState(item.completed ?? false);

  const handleCheckedChange = (newChecked: boolean) => {
    setChecked(newChecked);
    onItemToggle?.(sectionIndex, item.id, newChecked);
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case "requirement":
        return "bg-lime-500/10 text-lime-500 border-lime-500/20";
      case "resource":
        return "bg-cyan-500/10 text-cyan-500 border-cyan-500/20";
      case "task":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "milestone":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="border-border bg-card hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-3 transition-colors">
      <Checkbox
        id={item.id}
        checked={checked}
        onCheckedChange={handleCheckedChange}
        className="mt-0.5"
      />
      <div className="flex-1 space-y-1">
        <div className="flex items-start gap-2">
          <label
            htmlFor={item.id}
            className={`flex-1 cursor-pointer text-sm leading-tight font-medium ${
              checked ? "text-muted-foreground line-through" : "text-foreground"
            }`}
          >
            {item.label}
            {item.required && <span className="text-destructive ml-1">*</span>}
          </label>
          {item.type && (
            <Badge
              variant="outline"
              className={`shrink-0 text-xs ${getTypeColor(item.type)}`}
            >
              {item.type}
            </Badge>
          )}
        </div>
        {item.description && (
          <p className="text-muted-foreground text-xs">{item.description}</p>
        )}
        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Visit resource
          </a>
        )}
      </div>
    </div>
  );
}
