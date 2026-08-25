import * as React from "react";
import { cn } from "@/lib/utils";

type JOJOSkeletonVariant =
  | "default"
  | "text"
  | "title"
  | "avatar"
  | "image"
  | "card"
  | "button"
  | "input"
  | "circle";

interface JOJOSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: JOJOSkeletonVariant;
  lines?: number;
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

/**
 * JOJOSkeleton
 *
 * Generic reusable skeleton component.
 * Requires `.skeleton` shimmer class in globals.css.
 */
export function JOJOSkeleton({
  className,
  variant = "default",
  lines = 1,
  rounded,
  ...props
}: JOJOSkeletonProps) {
  const roundedClass = getRoundedClass(rounded);

  if (variant === "text" && lines > 1) {
    return (
      <div className={cn("space-y-2", className)} aria-hidden="true" {...props}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "skeleton h-4",
              roundedClass || "rounded-md",
              index === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "skeleton",
        getVariantClass(variant),
        roundedClass,
        className
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

function getVariantClass(variant: JOJOSkeletonVariant) {
  switch (variant) {
    case "text":
      return "h-4 w-full rounded-md";

    case "title":
      return "h-6 w-2/3 rounded-md";

    case "avatar":
      return "h-12 w-12 rounded-full";

    case "circle":
      return "rounded-full";

    case "image":
      return "aspect-video w-full rounded-xl";

    case "card":
      return "h-40 w-full rounded-2xl";

    case "button":
      return "h-10 w-28 rounded-xl";

    case "input":
      return "h-12 w-full rounded-xl";

    case "default":
    default:
      return "h-4 w-full rounded-md";
  }
}

function getRoundedClass(rounded?: JOJOSkeletonProps["rounded"]) {
  switch (rounded) {
    case "none":
      return "rounded-none";

    case "sm":
      return "rounded-sm";

    case "md":
      return "rounded-md";

    case "lg":
      return "rounded-lg";

    case "xl":
      return "rounded-xl";

    case "2xl":
      return "rounded-2xl";

    case "full":
      return "rounded-full";

    default:
      return "";
  }
}