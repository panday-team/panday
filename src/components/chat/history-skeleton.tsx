/**
 * History skeleton loading state component
 */

import { HISTORY_SKELETON_ITEMS } from "./utils";

export function HistorySkeleton() {
  return (
    <div className="space-y-2">
      {HISTORY_SKELETON_ITEMS.map((_, index) => (
        <div
          key={index}
          className="h-[70px] animate-pulse rounded-2xl border border-white/5 bg-white/5"
        />
      ))}
    </div>
  );
}
