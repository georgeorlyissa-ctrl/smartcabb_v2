import * as React from 'react';

// Wrapper local pour Radix UI Popover (remplace @radix-ui/react-popover)
export const Root = ({ 
  children, 
  ...props 
}: { 
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  modal?: boolean;
}) => {
  const [open, setOpen] = React.useState(props.defaultOpen ?? false);
  const isControlled = props.open !== undefined;
  const isOpen = isControlled ? props.open : open;

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setOpen(newOpen);
    }
    props.onOpenChange?.(newOpen);
  };

  return (
    <div data-radix-popover-root="" {...props}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as any, { 
            __popoverOpen: isOpen,
            __setPopoverOpen: handleOpenChange 
          });
        }
        return child;
      })}
    </div>
  );
};

export const Trigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean; __popoverOpen?: boolean; __setPopoverOpen?: (open: boolean) => void }
>(({ children, asChild, __popoverOpen, __setPopoverOpen, ...props }, ref) => {
  const handleClick = () => {
    __setPopoverOpen?.(!__popoverOpen);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as any, {
      ref,
      onClick: (e: any) => {
        handleClick();
        (children as any).props?.onClick?.(e);
      },
    });
  }

  return (
    <button
      ref={ref}
      type="button"
      data-radix-popover-trigger=""
      aria-expanded={__popoverOpen}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
});
Trigger.displayName = 'PopoverTrigger';

export const Anchor = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }
>(({ children, asChild, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as any, { ref, ...props });
  }
  return <div ref={ref} data-radix-popover-anchor="" {...props}>{children}</div>;
});
Anchor.displayName = 'PopoverAnchor';

export const Content = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    align?: 'start' | 'center' | 'end';
    sideOffset?: number;
    alignOffset?: number;
    side?: 'top' | 'right' | 'bottom' | 'left';
    __popoverOpen?: boolean;
  }
>(({ children, align = 'center', sideOffset = 0, side = 'bottom', __popoverOpen, style, ...props }, ref) => {
  if (!__popoverOpen) return null;

  return (
    <div
      ref={ref}
      data-radix-popover-content=""
      data-side={side}
      data-align={align}
      style={{
        position: 'absolute',
        zIndex: 50,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
});
Content.displayName = 'PopoverContent';

export const Portal = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export const Close = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean; __setPopoverOpen?: (open: boolean) => void }
>(({ children, asChild, __setPopoverOpen, ...props }, ref) => {
  const handleClick = () => {
    __setPopoverOpen?.(false);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as any, {
      ref,
      onClick: (e: any) => {
        handleClick();
        (children as any).props?.onClick?.(e);
      },
    });
  }

  return (
    <button
      ref={ref}
      type="button"
      data-radix-popover-close=""
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
});
Close.displayName = 'PopoverClose';
