"use client";

import * as React from "react";
import { cn } from "./utils";

// 🆕 Implementation native sans @radix-ui pour compatibilité Figma Make

function Switch({
  className,
  checked,
  onCheckedChange,
  disabled,
  ...props
}: {
  className?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const [internalChecked, setInternalChecked] = React.useState(checked || false);
  
  const isChecked = checked !== undefined ? checked : internalChecked;

  const handleClick = () => {
    if (disabled) return;
    const newValue = !isChecked;
    setInternalChecked(newValue);
    onCheckedChange?.(newValue);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      data-slot="switch"
      data-state={isChecked ? "checked" : "unchecked"}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "peer inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent transition-all outline-none focus-visible:ring-[3px] focus-visible:border-ring focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        isChecked ? "bg-primary" : "bg-switch-background dark:bg-input/80",
        className,
      )}
      {...props}
    >
      <span
        data-slot="switch-thumb"
        data-state={isChecked ? "checked" : "unchecked"}
        className={cn(
          "pointer-events-none block size-4 rounded-full ring-0 transition-transform",
          isChecked 
            ? "translate-x-[calc(100%-2px)] bg-card dark:bg-primary-foreground" 
            : "translate-x-0 bg-card dark:bg-card-foreground",
        )}
      />
    </button>
  );
}

export { Switch };