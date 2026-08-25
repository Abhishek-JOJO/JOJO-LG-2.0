"use client";

import { cn } from "@/lib/utils";

interface RichTextProps {
  /** Raw HTML string from the API (may contain inline styles, <p>, <span>, etc.) */
  html: string | null | undefined;
  className?: string;
}

/**
 * Strips inline `color` CSS from an HTML string so API-provided text colors
 * (e.g. `color: rgb(0, 0, 0)`) don't override the app's theme colors.
 */
function stripInlineColors(html: string): string {
  return html
    // Remove color property from style attributes, keeping other styles intact
    .replace(/color\s*:\s*[^;"]+(;)?/gi, "")
    // Clean up empty style attributes left behind: style=""  or  style=" "
    .replace(/\s*style\s*=\s*["']\s*["']/gi, "");
}

/**
 * Returns true when the HTML contains no visible text content.
 * Handles cases like `<p><br></p>` or `<p></p>`.
 */
function isBlankHtml(html: string): boolean {
  // Strip all tags and decode common entities, then check for non-whitespace
  const text = html
    .replace(/<br\s*\/?>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
  return text.length === 0;
}

/**
 * RichText — renders API-supplied HTML descriptions safely.
 *
 * - Strips inline `color` styles so the app theme controls text color.
 * - Returns null when the content is blank (e.g. `<p><br></p>`).
 * - Pass a `className` to control font size, color, spacing, etc.
 *
 * Usage:
 * ```tsx
 * <RichText html={asset.asset_description} className="body-sm-regular text-theme_4" />
 * <RichText html={asset.asset_short_description} className="body-xs-regular text-theme_5" />
 * ```
 */
export function RichText({ html, className }: RichTextProps) {
  if (!html || isBlankHtml(html)) return null;

  const sanitized = stripInlineColors(html);

  return (
    <div
      className={cn("rich-text", className)}
      // Content comes from our own API — inline colors stripped above.
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
