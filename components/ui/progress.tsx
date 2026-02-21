// ⚠️ STUB - Ce composant n'est pas utilisé dans SmartCabb
// Version simplifiée sans @radix-ui pour éviter les erreurs de build

import * as React from "react";

export function Progress({ value = 0, className, ...props }: any) {
  return (
    <div className={className} {...props}>
      <div style={{ width: `${value}%` }} />
    </div>
  );
}
