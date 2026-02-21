// ⚠️ STUB - Ce composant n'est pas utilisé dans SmartCabb
// Version simplifiée sans @radix-ui pour éviter les erreurs de build

import * as React from "react";

export function RadioGroup({ children, ...props }: any) {
  return <div {...props}>{children}</div>;
}

export function RadioGroupItem({ ...props }: any) {
  return <input type="radio" {...props} />;
}
