"use client";

/**
 * AnimatedColumn - GSAP-powered column width animation
 */

import {
  useRef,
  useLayoutEffect,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import { cn } from "@/lib/utils";
import { gsap } from "./gsapConfig";

export interface AnimatedColumnProps {
  show: boolean;
  width: number;
  staggerDelay?: number;
  duration?: number;
  ease?: string;
  className?: string;
  children: ReactNode;
  onTransitionComplete?: () => void;
}

export function AnimatedColumn({
  show,
  width,
  staggerDelay = 0,
  duration = 0.5,
  ease = "power2.inOut",
  className,
  children,
  onTransitionComplete,
}: AnimatedColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const [shouldRender, setShouldRender] = useState(show);

  useLayoutEffect(() => {
    const column = columnRef.current;
    if (!column) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (!show) {
        gsap.set(column, {
          width: 0,
          opacity: 0,
          overflow: "hidden",
        });
      } else {
        gsap.set(column, {
          width: width,
          opacity: 1,
          overflow: "hidden",
        });
      }
      return;
    }

    if (show) {
      setShouldRender(true);

      gsap.to(column, {
        width: width,
        opacity: 1,
        duration,
        ease,
        delay: staggerDelay,
        onComplete: onTransitionComplete,
      });
    } else {
      gsap.to(column, {
        width: 0,
        opacity: 0,
        duration,
        ease,
        delay: staggerDelay,
        onComplete: () => {
          setShouldRender(false);
          onTransitionComplete?.();
        },
      });
    }
  }, [show, width, duration, ease, staggerDelay, onTransitionComplete]);

  useLayoutEffect(() => {
    if (show && !shouldRender) {
      setShouldRender(true);
    }
  }, [show, shouldRender]);

  if (!shouldRender && !show) {
    return null;
  }

  return (
    <div
      ref={columnRef}
      className={cn("overflow-hidden whitespace-nowrap shrink-0", className)}
      style={{ willChange: "width, opacity" } as CSSProperties}
    >
      {children}
    </div>
  );
}

export interface AnimatedColumnGroupProps {
  show: boolean;
  stagger?: number;
  duration?: number;
  ease?: string;
  className?: string;
  children: ReactNode;
}

export function AnimatedColumnGroup({
  show,
  stagger = 0.05,
  duration = 0.5,
  ease = "power2.inOut",
  className,
  children,
}: AnimatedColumnGroupProps) {
  const groupRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group || isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const columns = group.querySelectorAll("[data-animated-column]");
    if (columns.length === 0) return;

    if (show) {
      gsap.to(columns, {
        width: (i, el) => el.dataset.targetWidth || 100,
        opacity: 1,
        duration,
        ease,
        stagger: stagger,
      });
    } else {
      gsap.to(columns, {
        width: 0,
        opacity: 0,
        duration,
        ease,
        stagger: stagger,
      });
    }
  }, [show, stagger, duration, ease]);

  return (
    <div ref={groupRef} className={cn("contents", className)}>
      {children}
    </div>
  );
}



