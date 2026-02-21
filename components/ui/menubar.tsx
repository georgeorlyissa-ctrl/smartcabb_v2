// ⚠️ STUB - Ce composant n'est pas utilisé dans SmartCabb
// Version simplifiée sans @radix-ui pour éviter les erreurs de build

import * as React from "react";

export function Menubar({ children, ...props }: any) {
  return <div {...props}>{children}</div>;
}

export function MenubarMenu({ children, ...props }: any) {
  return <div {...props}>{children}</div>;
}

export function MenubarTrigger({ children, ...props }: any) {
  return <button {...props}>{children}</button>;
}

export function MenubarContent({ children, ...props }: any) {
  return <div {...props}>{children}</div>;
}

export function MenubarItem({ children, ...props }: any) {
  return <div {...props}>{children}</div>;
}

export function MenubarSeparator(props: any) {
  return <hr {...props} />;
}
