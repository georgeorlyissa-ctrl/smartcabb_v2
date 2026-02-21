// ⚠️ STUB - Ce composant n'est pas utilisé dans SmartCabb
// Version simplifiée sans @radix-ui pour éviter les erreurs de build

import * as React from "react";

export const AspectRatio = React.forwardRef<HTMLDivElement, any>(
  ({ ratio = 1, className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={className} {...props}>
        {children}
      </div>
    );
  }
);

AspectRatio.displayName = "AspectRatio";
