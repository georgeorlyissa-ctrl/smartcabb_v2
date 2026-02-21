// ⚠️ STUB - Ce composant n'est pas utilisé dans SmartCabb
// Version simplifiée sans @radix-ui pour éviter les erreurs de build

import * as React from "react";

export const Collapsible = React.forwardRef<HTMLDivElement, any>(
  ({ children, ...props }, ref) => {
    return <div ref={ref} {...props}>{children}</div>;
  }
);

Collapsible.displayName = "Collapsible";

export const CollapsibleTrigger = React.forwardRef<HTMLButtonElement, any>(
  ({ children, ...props }, ref) => {
    return <button ref={ref} {...props}>{children}</button>;
  }
);

CollapsibleTrigger.displayName = "CollapsibleTrigger";

export const CollapsibleContent = React.forwardRef<HTMLDivElement, any>(
  ({ children, ...props }, ref) => {
    return <div ref={ref} {...props}>{children}</div>;
  }
);

CollapsibleContent.displayName = "CollapsibleContent";
