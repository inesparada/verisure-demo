"use client";

/**
 * ExpandableGridItem - Grid item with animated column span
 */

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useExpandableGrid } from "./ExpandableGrid";

export interface ExpandableGridItemProps {
  collapsedSpan: number;
  expandedSpan: number;
  className?: string;
  children: ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function ExpandableGridItem({
  collapsedSpan,
  expandedSpan,
  className,
  children,
  onMouseEnter,
  onMouseLeave,
}: ExpandableGridItemProps) {
  const { isExpanded } = useExpandableGrid();
  const flipId = useId();
  const currentSpan = isExpanded ? expandedSpan : collapsedSpan;

  return (
    <div
      data-flip-id={flipId}
      className={cn("min-w-0 min-h-0", className)}
      style={{
        gridColumn: `span ${currentSpan} / span ${currentSpan}`,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}



