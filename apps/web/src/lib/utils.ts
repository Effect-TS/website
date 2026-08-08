import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cssVars<T extends Record<`--${string}`, string>>(
  vars: T,
): React.CSSProperties & T {
  return { ...vars }
}
