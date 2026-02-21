// ⚠️ STUB - Ce composant n'est pas utilisé dans SmartCabb
// Version simplifiée sans @radix-ui pour éviter les erreurs de build

import * as React from "react";

export const Form = ({ children, ...props }: any) => {
  return <form {...props}>{children}</form>;
};

export const FormField = ({ children, ...props }: any) => {
  return <div {...props}>{children}</div>;
};

export const FormItem = ({ children, ...props }: any) => {
  return <div {...props}>{children}</div>;
};

export const FormLabel = ({ children, ...props }: any) => {
  return <label {...props}>{children}</label>;
};

export const FormControl = ({ children, ...props }: any) => {
  return <div {...props}>{children}</div>;
};

export const FormDescription = ({ children, ...props }: any) => {
  return <p {...props}>{children}</p>;
};

export const FormMessage = ({ children, ...props }: any) => {
  return <span {...props}>{children}</span>;
};

export const useFormField = () => ({});
