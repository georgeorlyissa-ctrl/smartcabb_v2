/**
 * 🎭 RADIX DIALOG - STANDALONE LOCAL
 * 
 * Implémentation locale sans dépendance @radix-ui/react-dialog
 * Compatible avec SmartCabb
 * 
 * @version 1.0.0
 * @date 2026-01-21
 */

import * as React from 'react';
import { createPortal } from 'react-dom';

// ========================================
// TYPES
// ========================================

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog components must be used within Dialog.Root');
  }
  return context;
}

// ========================================
// ROOT
// ========================================

export interface DialogRootProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  modal?: boolean;
}

export function Root({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
  modal = true
}: DialogRootProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  }, [controlledOpen, onOpenChange]);

  return (
    <DialogContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

// ========================================
// TRIGGER
// ========================================

export interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const Trigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ asChild, onClick, ...props }, ref) => {
    const { onOpenChange } = useDialogContext();

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      onOpenChange(true);
      onClick?.(event);
    };

    if (asChild && React.isValidElement(props.children)) {
      return React.cloneElement(props.children as React.ReactElement, {
        onClick: handleClick,
        ref
      });
    }

    return <button ref={ref} onClick={handleClick} {...props} />;
  }
);

Trigger.displayName = 'DialogTrigger';

// ========================================
// PORTAL
// ========================================

export interface DialogPortalProps {
  children: React.ReactNode;
  container?: HTMLElement;
}

export function Portal({ children, container }: DialogPortalProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  const targetContainer = container || document.body;

  return createPortal(children, targetContainer);
}

// ========================================
// OVERLAY
// ========================================

export interface DialogOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  forceMount?: boolean;
}

export const Overlay = React.forwardRef<HTMLDivElement, DialogOverlayProps>(
  ({ forceMount, className = '', ...props }, ref) => {
    const { open, onOpenChange } = useDialogContext();

    if (!open && !forceMount) return null;

    return (
      <div
        ref={ref}
        className={`fixed inset-0 z-50 bg-black/50 ${className}`}
        onClick={() => onOpenChange(false)}
        {...props}
      />
    );
  }
);

Overlay.displayName = 'DialogOverlay';

// ========================================
// CONTENT
// ========================================

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  forceMount?: boolean;
  onOpenAutoFocus?: (event: Event) => void;
  onCloseAutoFocus?: (event: Event) => void;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onPointerDownOutside?: (event: PointerEvent) => void;
  onInteractOutside?: (event: Event) => void;
}

export const Content = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({
    forceMount,
    onOpenAutoFocus,
    onCloseAutoFocus,
    onEscapeKeyDown,
    onPointerDownOutside,
    onInteractOutside,
    className = '',
    children,
    ...props
  }, ref) => {
    const { open, onOpenChange } = useDialogContext();

    React.useEffect(() => {
      if (!open) return;

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onEscapeKeyDown?.(event);
          if (!event.defaultPrevented) {
            onOpenChange(false);
          }
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [open, onOpenChange, onEscapeKeyDown]);

    if (!open && !forceMount) return null;

    return (
      <Portal>
        <Overlay />
        <div
          ref={ref}
          className={`fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 ${className}`}
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
          {children}
        </div>
      </Portal>
    );
  }
);

Content.displayName = 'DialogContent';

// ========================================
// CLOSE
// ========================================

export interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const Close = React.forwardRef<HTMLButtonElement, DialogCloseProps>(
  ({ asChild, onClick, ...props }, ref) => {
    const { onOpenChange } = useDialogContext();

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      onOpenChange(false);
      onClick?.(event);
    };

    if (asChild && React.isValidElement(props.children)) {
      return React.cloneElement(props.children as React.ReactElement, {
        onClick: handleClick,
        ref
      });
    }

    return <button ref={ref} onClick={handleClick} {...props} />;
  }
);

Close.displayName = 'DialogClose';

// ========================================
// TITLE
// ========================================

export interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const Title = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className = '', ...props }, ref) => {
    return <h2 ref={ref} className={className} {...props} />;
  }
);

Title.displayName = 'DialogTitle';

// ========================================
// DESCRIPTION
// ========================================

export interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const Description = React.forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ className = '', ...props }, ref) => {
    return <p ref={ref} className={className} {...props} />;
  }
);

Description.displayName = 'DialogDescription';

// ========================================
// EXPORTS
// ========================================

export const Dialog = {
  Root,
  Trigger,
  Portal,
  Overlay,
  Content,
  Close,
  Title,
  Description
};

export default Dialog;