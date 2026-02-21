// ⚠️ STUB - Ce composant n'est pas utilisé dans SmartCabb
// Version simplifiée sans @radix-ui pour éviter les erreurs de build

import * as React from "react";

export function NavigationMenu({ children, ...props }: any) {
  return <nav {...props}>{children}</nav>;
}

export function NavigationMenuList({ children, ...props }: any) {
  return <ul {...props}>{children}</ul>;
}

export function NavigationMenuItem({ children, ...props }: any) {
  return <li {...props}>{children}</li>;
}

export function NavigationMenuTrigger({ children, ...props }: any) {
  return <button {...props}>{children}</button>;
}

export function NavigationMenuContent({ children, ...props }: any) {
  return <div {...props}>{children}</div>;
}

export function NavigationMenuLink({ children, ...props }: any) {
  return <a {...props}>{children}</a>;
}
