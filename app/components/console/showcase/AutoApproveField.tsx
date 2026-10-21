"use client";

import { useId } from "react";

import { cn } from "@/app/lib/utils";

/**
 * An event page's approval choice, as two radio cards (same look as the
 * submit form's "Where it appears"). `codeSlot` sits inside the "approve"
 * card, since the code only matters there. Used on the create form and on
 * the manage page's invite card.
 */
export function AutoApproveField({
  checked,
  onChange,
  disabled,
  codeSlot,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  codeSlot?: React.ReactNode;
}) {
  const id = useId();
  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-2 text-[0.86rem] font-medium text-foreground">Who can add apps</legend>
      <Option
        name={id}
        checked={!checked}
        onSelect={() => onChange(false)}
        title="Only apps you approve"
        detail="You review each app before it goes on the page."
      >
        {codeSlot}
      </Option>
      <Option
        name={id}
        checked={checked}
        onSelect={() => onChange(true)}
        title="Anyone"
        detail="Apps go on the page at once."
      />
    </fieldset>
  );
}

function Option({
  name,
  checked,
  onSelect,
  title,
  detail,
  children,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  title: string;
  detail: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-md border p-3.5 transition-colors", checked ? "border-primary bg-primary/5" : "border-border")}>
      <label className="flex cursor-pointer items-start gap-3">
        <input type="radio" name={name} checked={checked} onChange={onSelect} className="mt-1 size-4 accent-primary" />
        <span className="min-w-0">
          <span className="block text-[0.92rem] font-medium text-foreground">{title}</span>
          <span className="block text-[0.82rem] text-muted-foreground">{detail}</span>
        </span>
      </label>
      {checked && children && <div className="mt-3 pl-7">{children}</div>}
    </div>
  );
}
