import { forwardRef, type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const appendixVariants = cva(
  "node-appendix absolute inline-flex flex-col items-center rounded-md border-none bg-transparent p-1 text-[#FFEDDA] nodrag",
  {
    variants: {
      position: {
        top: "-translate-y-[100%] -mt-3 left-1/2 -translate-x-1/2",
        bottom: "top-[100%] mt-3 left-1/2 -translate-x-1/2",
        left: "right-[100%] -mr-3",
        right: "left-[100%] ml-3",
      },
    },
    defaultVariants: {
      position: "top",
    },
  },
);

export interface NodeAppendixProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof appendixVariants> {
  className?: string;
  position?: "top" | "bottom" | "left" | "right";
}

export const NodeAppendix = forwardRef<HTMLDivElement, NodeAppendixProps>(
  ({ children, className, position, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(appendixVariants({ position }), className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

NodeAppendix.displayName = "NodeAppendix";
