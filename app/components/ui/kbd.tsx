import { cn } from "@/app/lib/utils";

/**
 * shadcn/ui `Kbd` — a keyboard key. Written by hand rather than pulled from the
 * registry: the published component is Tailwind v4 (`in-data-[…]` variants for
 * rendering inside a tooltip), and this project is on Tailwind 3.4. The v4-only
 * variants are dropped; everything else matches the upstream markup and API.
 *
 * Presentational only — it labels a key, it does not handle one.
 *
 * Note the radius: this project's Tailwind theme sets every named radius
 * (borderRadius.sm and friends) to 0px, so upstream's `rounded-sm` renders as a
 * square. The arbitrary `rounded-[2px]` restores the intended shape.
 */
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 w-fit min-w-5 select-none items-center justify-center gap-1 rounded-[2px] bg-muted px-1 font-sans text-xs font-medium text-muted-foreground",
        "[&_svg:not([class*='size-'])]:size-3",
        className,
      )}
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <kbd data-slot="kbd-group" className={cn("inline-flex items-center gap-1", className)} {...props} />
  );
}

export { Kbd, KbdGroup };
