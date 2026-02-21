// ⚠️ STUB - Ce composant n'est pas utilisé dans SmartCabb
// Version simplifiée sans @radix-ui pour éviter les erreurs de build

import * as React from "react";

export function Slider({ value = [0], onValueChange, className, ...props }: any) {
  return (
    <input
      type="range"
      value={value[0]}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
      className={className}
      {...props}
    />
  );
}
