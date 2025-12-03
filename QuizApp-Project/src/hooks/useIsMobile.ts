/**
 * @fileoverview Mobile Detection Hook
 * @description Enhanced mobile detection with proper TypeScript support
 * @author Quiz Application Team
 * @version 2.0.0
 */

import { useState, useEffect } from 'react';

/**
 * Mobile Detection Hook
 * @description Detects if the current viewport is mobile-sized
 * @param breakpoint - Pixel width to consider as mobile threshold
 * @returns Boolean indicating if viewport is mobile-sized
 * 
 * USAGE:
 * - const isMobile = useIsMobile(); // Uses default 768px breakpoint
 * - const isSmallScreen = useIsMobile(640); // Custom breakpoint
 * 
 * FEATURES:
 * - Responsive to window resize events
 * - SSR-safe (no hydration issues)
 * - Debounced for performance
 */
export const useIsMobile = (breakpoint: number = 768): boolean => {
  // Initialize with false to prevent hydration mismatch
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    /**
     * Check if current viewport is mobile-sized
     * @returns Boolean indicating mobile status
     */
    const checkIsMobile = (): boolean => {
      if (typeof window === 'undefined') return false;
      return window.innerWidth < breakpoint;
    };

    /**
     * Debounced resize handler to prevent excessive re-renders
     */
    let resizeTimer: NodeJS.Timeout;
    const handleResize = (): void => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setIsMobile(checkIsMobile());
      }, 100); // 100ms debounce
    };

    // Set initial value
    setIsMobile(checkIsMobile());

    // Add resize listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, [breakpoint]);

  return isMobile;
};

/**
 * Extended Mobile Detection Hook
 * @description Provides multiple breakpoint detections
 * @returns Object with various screen size booleans
 */
export const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState({
    isMobile: false,    // < 640px
    isTablet: false,    // 640px - 1024px
    isDesktop: false,   // > 1024px
    isSmall: false,     // < 375px
    width: 0,
    height: 0
  });

  useEffect(() => {
    const updateScreenSize = () => {
      if (typeof window === 'undefined') return;
      
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setScreenSize({
        isMobile: width < 640,
        isTablet: width >= 640 && width < 1024,
        isDesktop: width >= 1024,
        isSmall: width < 375,
        width,
        height
      });
    };

    let resizeTimer: NodeJS.Timeout;
    const debouncedUpdate = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateScreenSize, 100);
    };

    updateScreenSize();
    window.addEventListener('resize', debouncedUpdate);

    return () => {
      window.removeEventListener('resize', debouncedUpdate);
      clearTimeout(resizeTimer);
    };
  }, []);

  return screenSize;
};