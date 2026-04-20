"use client";

/**
 * ExpandableGrid - GSAP Flip-powered expandable grid layout
 */

import {
  createContext,
  useContext,
  useRef,
  useLayoutEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
  type ReactNode,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";
import { Flip, FLIP_DEFAULTS } from "./gsapConfig";

export interface ExpandableGridRef {
  captureState: () => void;
}

interface ExpandableGridContextValue {
  isExpanded: boolean;
  gridRef: RefObject<HTMLDivElement | null>;
}

const ExpandableGridContext = createContext<ExpandableGridContextValue | null>(null);

export function useExpandableGrid() {
  const context = useContext(ExpandableGridContext);
  if (!context) {
    throw new Error("useExpandableGrid must be used within an ExpandableGrid");
  }
  return context;
}

export interface ExpandableGridProps {
  isExpanded: boolean;
  columns?: number;
  gap?: number;
  className?: string;
  children: ReactNode;
  duration?: number;
  onTransitionComplete?: () => void;
}

export const ExpandableGrid = forwardRef<ExpandableGridRef, ExpandableGridProps>(
  function ExpandableGrid(
    {
      isExpanded,
      columns = 4,
      gap = 16,
      className,
      children,
      duration = 0.6,
      onTransitionComplete,
    },
    ref
  ) {
    const gridRef = useRef<HTMLDivElement>(null);
    const flipStateRef = useRef<Flip.FlipState | null>(null);
    const isFirstRender = useRef(true);

    const captureState = useCallback(() => {
      if (!gridRef.current) return;
      const items = gridRef.current.querySelectorAll("[data-flip-id]");
      if (items.length > 0) {
        flipStateRef.current = Flip.getState(items);
      }
    }, []);

    useImperativeHandle(ref, () => ({
      captureState,
    }), [captureState]);

    useLayoutEffect(() => {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }

      if (!flipStateRef.current || !gridRef.current) return;

      const items = gridRef.current.querySelectorAll("[data-flip-id]");
      if (items.length === 0) return;

      Flip.from(flipStateRef.current, {
        ...FLIP_DEFAULTS,
        duration,
        targets: items,
        onComplete: () => {
          flipStateRef.current = null;
          onTransitionComplete?.();
        },
      });
    }, [isExpanded, duration, onTransitionComplete]);

    const contextValue: ExpandableGridContextValue = {
      isExpanded,
      gridRef,
    };

    return (
      <ExpandableGridContext.Provider value={contextValue}>
        <div
          ref={gridRef}
          className={cn("grid min-h-0 relative", className)}
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: `${gap}px`,
          }}
        >
          {children}
        </div>
      </ExpandableGridContext.Provider>
    );
  }
);



