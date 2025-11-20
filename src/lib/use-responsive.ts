"use client";

import { useState, useEffect } from "react";

export const BREAKPOINTS = {
  mobile: 0, // 0-639px
  sm: 640, // 640-767px
  md: 768, // 768-1023px  (tablet)
  lg: 1024, // 1024-1279px (laptop)
  xl: 1280, // 1280-1535px (desktop)
  "2xl": 1536, // 1536px+      (large desktop)
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

export interface ResponsiveState {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  breakpoint: Breakpoint;
}

/**
 * Hook for responsive breakpoint detection
 * Provides consistent breakpoint logic across all components
 *
 * Breakpoints:
 * - mobile: < 640px
 * - sm: 640-767px
 * - md: 768-1023px (tablet)
 * - lg: 1024-1279px (laptop)
 * - xl: 1280-1535px (desktop)
 * - 2xl: 1536px+ (large desktop)
 */
export function useResponsive(): ResponsiveState {
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  }>({
    width: typeof window !== "undefined" ? window.innerWidth : 1024,
    height: typeof window !== "undefined" ? window.innerHeight : 768,
  });

  useEffect(() => {
    // Debounce resize events for performance
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 150); // 150ms debounce
    };

    // Set initial dimensions
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const { width, height } = dimensions;

  // Calculate breakpoint
  let breakpoint: Breakpoint = "mobile";
  if (width >= BREAKPOINTS["2xl"]) breakpoint = "2xl";
  else if (width >= BREAKPOINTS.xl) breakpoint = "xl";
  else if (width >= BREAKPOINTS.lg) breakpoint = "lg";
  else if (width >= BREAKPOINTS.md) breakpoint = "md";
  else if (width >= BREAKPOINTS.sm) breakpoint = "sm";

  return {
    width,
    height,
    isMobile: width < BREAKPOINTS.sm,
    isTablet: width >= BREAKPOINTS.sm && width < BREAKPOINTS.lg,
    isDesktop: width >= BREAKPOINTS.lg,
    isLargeDesktop: width >= BREAKPOINTS["2xl"],
    breakpoint,
  };
}

/**
 * Get responsive value based on current breakpoint
 * @example
 * const padding = getResponsiveValue(responsive, {
 *   mobile: 16,
 *   tablet: 24,
 *   desktop: 32,
 * });
 */
export function getResponsiveValue<T>(
  responsive: ResponsiveState,
  values: {
    mobile?: T;
    tablet?: T;
    desktop?: T;
    default?: T;
  },
): T | undefined {
  if (responsive.isMobile && values.mobile !== undefined) return values.mobile;
  if (responsive.isTablet && values.tablet !== undefined) return values.tablet;
  if (responsive.isDesktop && values.desktop !== undefined)
    return values.desktop;
  return values.default;
}
