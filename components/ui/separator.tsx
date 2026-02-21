"use client";

import * as React from "react";
import { cn } from "./utils";

// 🆕 Implementation native sans @radix-ui pour compatibilité Figma Make

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: {
  className?: string;
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}) {
  return (
    <div
      data-slot="separator-root"
      role={decorative ? "none" : "separator"}
      aria-orientation={orientation}
      className={cn(
        "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      data-orientation={orientation}
      {...props}
    />
  );
}

export { Separator };