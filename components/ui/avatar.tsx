// ⚠️ STUB - Ce composant n'est pas utilisé dans SmartCabb
// Version simplifiée sans @radix-ui pour éviter les erreurs de build

import * as React from "react";

export function Avatar({ children, ...props }: any) {
  return <div {...props}>{children}</div>;
}

export function AvatarImage({ ...props }: any) {
  return <img {...props} alt="" />;
}

export function AvatarFallback({ children, ...props }: any) {
  return <div {...props}>{children}</div>;
}
