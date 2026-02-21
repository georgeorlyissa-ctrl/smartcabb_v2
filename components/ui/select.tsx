"use client";

import * as React from "react";
import { Check, ChevronDown, ChevronUp } from "../../lib/icons"; // ✅ FIX: Utiliser les icônes locales
import { cn } from "./utils";

// 🆕 Implementation native sans @radix-ui pour compatibilité Figma Make

interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined);

function Select({
  value,
  onValueChange,
  children,
  ...props
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  const [internalValue, setInternalValue] = React.useState(value || props.defaultValue || "");
  const [open, setOpen] = React.useState(false);

  const handleValueChange = (newValue: string) => {
    setInternalValue(newValue);
    onValueChange?.(newValue);
    setOpen(false);
  };

  return (
    <SelectContext.Provider
      value={{
        value: value || internalValue,
        onValueChange: handleValueChange,
        open,
        setOpen,
      }}
    >
      <div data-slot="select" className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

function SelectGroup({ children, ...props }: { children: React.ReactNode }) {
  return <div data-slot="select-group" {...props}>{children}</div>;
}

function SelectValue({
  placeholder,
  ...props
}: {
  placeholder?: string;
  children?: React.ReactNode;
}) {
  const context = React.useContext(SelectContext);
  if (!context) return null;

  return (
    <span data-slot="select-value" {...props}>
      {context.value || placeholder}
    </span>
  );
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: {
  className?: string;
  size?: "sm" | "default";
  children: React.ReactNode;
}) {
  const context = React.useContext(SelectContext);
  if (!context) return null;

  return (
    <button
      type="button"
      data-slot="select-trigger"
      data-size={size}
      onClick={() => context.setOpen(!context.open)}
      className={cn(
        "border-input data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full items-center justify-between gap-2 rounded-md border bg-input-background px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown className="size-4 opacity-50" />
    </button>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: {
  className?: string;
  children: React.ReactNode;
  position?: "popper" | "item-aligned";
}) {
  const context = React.useContext(SelectContext);
  if (!context || !context.open) return null;

  return (
    <div
      data-slot="select-content"
      className={cn(
        "bg-popover text-popover-foreground absolute z-50 mt-1 max-h-60 w-full min-w-[8rem] overflow-auto rounded-md border shadow-md animate-in fade-in-0 zoom-in-95",
        className,
      )}
      {...props}
    >
      <div className="p-1">{children}</div>
    </div>
  );
}

function SelectLabel({
  className,
  children,
  ...props
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-slot="select-label"
      className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}
      {...props}
    >
      {children}
    </div>
  );
}

function SelectItem({
  className,
  children,
  value,
  ...props
}: {
  className?: string;
  children: React.ReactNode;
  value: string;
}) {
  const context = React.useContext(SelectContext);
  if (!context) return null;

  const isSelected = context.value === value;

  return (
    <div
      data-slot="select-item"
      onClick={() => context.onValueChange(value)}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none hover:bg-accent",
        isSelected && "bg-accent",
        className,
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        {isSelected && <Check className="size-4" />}
      </span>
      <span>{children}</span>
    </div>
  );
}

function SelectSeparator({
  className,
  ...props
}: {
  className?: string;
}) {
  return (
    <div
      data-slot="select-separator"
      className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: {
  className?: string;
}) {
  return (
    <div
      data-slot="select-scroll-up-button"
      className={cn("flex cursor-default items-center justify-center py-1", className)}
      {...props}
    >
      <ChevronUp className="size-4" />
    </div>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: {
  className?: string;
}) {
  return (
    <div
      data-slot="select-scroll-down-button"
      className={cn("flex cursor-default items-center justify-center py-1", className)}
      {...props}
    >
      <ChevronDown className="size-4" />
    </div>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};