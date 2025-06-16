"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  className?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

function Switch({
  className,
  checked = false,
  onCheckedChange,
  disabled,
  ...props
}: SwitchProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onCheckedChange?.(event.target.checked);
  };

  return (
    <label
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        {...props}
      />
      <div
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </label>
  )
}

export { Switch }
