// components/common/select.tsx
"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Root Components
// ─────────────────────────────────────────────────────────────

function Select(props: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root {...props} />;
}

function SelectGroup(
  props: React.ComponentProps<typeof SelectPrimitive.Group>
) {
  return <SelectPrimitive.Group {...props} />;
}

function SelectValue(
  props: React.ComponentProps<typeof SelectPrimitive.Value>
) {
  return <SelectPrimitive.Value {...props} />;
}

// ─────────────────────────────────────────────────────────────
// Trigger
// Responsive:
// - Mobile: h-11, px-4, min-w-[120px]
// - Desktop: h-13, px-6, min-w-[140px]
// ─────────────────────────────────────────────────────────────

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "inline-flex items-center justify-between gap-2 body-sm-medium",
        "rounded-full bg-theme_10",
        "px-5 h-11",
        "border-none outline-none shadow-none ring-0",
        "body-sm-regular text-theme_13_samecolour",
        "transition-all duration-200",
        "focus:outline-none focus:ring-0 focus-visible:ring-0",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "[&>span]:truncate",
        className
      )}
      {...props}
    >
      {children}

      <SelectPrimitive.Icon asChild>
        <ChevronDown
          size={18}
          className={cn(
            "shrink-0",
            "transition-transform duration-200",
            "data-[state=open]:rotate-180"
          )}
        />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

// ─────────────────────────────────────────────────────────────
// Scroll Buttons
// ─────────────────────────────────────────────────────────────

function SelectScrollUpButton(
  props: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>
) {
  return (
    <SelectPrimitive.ScrollUpButton
      className="flex items-center justify-center py-1 text-theme_5"
      {...props}
    >
      <ChevronUp size={16} />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton(
  props: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>
) {
  return (
    <SelectPrimitive.ScrollDownButton
      className="flex items-center justify-center py-1 text-theme_5"
      {...props}
    >
      <ChevronDown size={16} />
    </SelectPrimitive.ScrollDownButton>
  );
}

// ─────────────────────────────────────────────────────────────
// Content
// Responsive:
// - Width follows trigger
// - Mobile safe max-width
// - Max height with scrolling
// ─────────────────────────────────────────────────────────────

function SelectContent({
  className,
  children,
  position = "popper",
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        sideOffset={sideOffset}
        className={cn(
          "relative z-50",
          "min-w-[var(--radix-select-trigger-width)]",
          "max-w-[calc(100vw-2rem)]",
          "overflow-hidden rounded-[18px]",
          "bg-theme_10 py-2",
          "border-none outline-none shadow-lg",
          "max-h-72 overflow-y-auto",
          "data-[state=open]:animate-in",
          "data-[state=closed]:animate-out",
          "data-[state=open]:fade-in-0",
          "data-[state=closed]:fade-out-0",
          "data-[state=open]:zoom-in-95",
          "data-[state=closed]:zoom-out-95",
          className
        )}
        {...props}
      >
        <SelectScrollUpButton />

        <SelectPrimitive.Viewport className="p-0">
          {children}
        </SelectPrimitive.Viewport>

        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

// ─────────────────────────────────────────────────────────────
// Item
// Responsive:
// - Mobile: h-10
// - Desktop: h-12
// ─────────────────────────────────────────────────────────────

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex w-full cursor-pointer select-none",
        "items-start",
        "rounded-[32px] px-4 sm:px-6 py-2",
        "outline-none",
        "body-sm-regular",
        "text-theme_1",
        "transition-colors duration-200",
        "hover:text-theme_13_samecolour",
        "focus:text-theme_13_samecolour",
        "data-[state=checked]:text-theme_13_samecolour",
        "data-[disabled]:pointer-events-none",
        "data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

// ─────────────────────────────────────────────────────────────
// Optional Components
// ─────────────────────────────────────────────────────────────

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      className={cn(
        "px-4 py-2 text-xs text-theme_5",
        className
      )}
      {...props}
    />
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      className={cn("my-1 h-px bg-theme_9", className)}
      {...props}
    />
  );
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};