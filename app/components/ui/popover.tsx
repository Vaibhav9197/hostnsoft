"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";

import { cn } from "@/app/lib/utils";

function Popover(props: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger(props: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverClose(props: PopoverPrimitive.Close.Props) {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />;
}

function PopoverContent({
  className,
  side = "bottom",
  align = "center",
  sideOffset = 4,
  alignOffset = 0,
  collisionPadding = 16,
  positionMethod,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<
    PopoverPrimitive.Positioner.Props,
    "side" | "align" | "sideOffset" | "alignOffset" | "collisionPadding" | "positionMethod"
  >) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        positionMethod={positionMethod}
        className="isolate z-50"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            // Base UI marks the first and last frames with data-starting-style /
            // data-ending-style, so a plain CSS transition animates both ways.
            "w-72 origin-[var(--transform-origin)] border border-border bg-card p-4 text-sm text-foreground shadow-lg outline-none transition-[opacity,transform] duration-150 ease-out data-[ending-style]:scale-95 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      // A div with role="heading", like DialogTitle: the marketing site's
      // unlayered `h1,h2,h3{...}` rule would otherwise override these utilities.
      render={<div role="heading" aria-level={2} />}
      className={cn("font-bold text-foreground", className)}
      {...props}
    />
  );
}

function PopoverDescription({ className, ...props }: PopoverPrimitive.Description.Props) {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Popover, PopoverClose, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger };
