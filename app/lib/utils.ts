import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn/ui class combiner: merges conditional classes (clsx) and de-duplicates
// conflicting Tailwind utilities (tailwind-merge), so `cn("p-2", cond && "p-4")`
// resolves to the last-wins Tailwind class.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
