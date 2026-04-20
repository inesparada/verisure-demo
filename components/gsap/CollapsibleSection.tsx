"use client";

/**
 * CollapsibleSection - GSAP-powered height collapse/expand
 */

import { useRef, useLayoutEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { gsap } from "./gsapConfig";

export interface CollapsibleSectionProps {
  isOpen: boolean;
  duration?: number;
  ease?: string;
  includeOpacity?: boolean;
  openMarginTop?: number;
  className?: string;
  children: ReactNode;
  onTransitionComplete?: () => void;
}

export function CollapsibleSection({
  isOpen,
  duration = 0.5,
  ease = "power2.inOut",
  includeOpacity = true,
  openMarginTop = 12,
  className,
  children,
  onTransitionComplete,
}: CollapsibleSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (!isOpen) {
        gsap.set(container, {
          height: 0,
          opacity: includeOpacity ? 0 : 1,
          marginTop: 0,
          overflow: "hidden",
        });
      } else {
        gsap.set(container, {
          height: "auto",
          opacity: 1,
          marginTop: openMarginTop,
          overflow: "visible",
        });
      }
      return;
    }

    if (isOpen) {
      gsap.set(container, { overflow: "hidden" });
      const naturalHeight = content.offsetHeight;

      gsap.to(container, {
        height: naturalHeight,
        opacity: includeOpacity ? 1 : undefined,
        marginTop: openMarginTop,
        duration,
        ease,
        onComplete: () => {
          gsap.set(container, { height: "auto", overflow: "visible" });
          onTransitionComplete?.();
        },
      });
    } else {
      gsap.set(container, { overflow: "hidden" });

      gsap.to(container, {
        height: 0,
        opacity: includeOpacity ? 0 : undefined,
        marginTop: 0,
        duration,
        ease,
        onComplete: onTransitionComplete,
      });
    }
  }, [isOpen, duration, ease, includeOpacity, openMarginTop, onTransitionComplete]);

  return (
    <div ref={containerRef} className={className}>
      <div ref={contentRef}>{children}</div>
    </div>
  );
}



