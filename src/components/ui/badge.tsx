import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border border-transparent px-3 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        default:
          "bg-secondary/10 text-secondary-foreground ring-1 ring-secondary/30",
        success:
          "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-200",
        warning:
          "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-200",
        destructive:
          "bg-destructive/15 text-destructive ring-1 ring-destructive/30",
        outline: "border-border/60 bg-background",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
