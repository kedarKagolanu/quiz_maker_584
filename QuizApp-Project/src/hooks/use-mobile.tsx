/**
 * @fileoverview Mobile Detection Hook (Enhanced)
 * @description Improved mobile detection with better performance and TypeScript support
 * @author Quiz Application Team
 * @version 2.0.0
 */

import * as React from "react"

/** Mobile breakpoint threshold in pixels */
const MOBILE_BREAKPOINT = 768

/**
 * Enhanced Mobile Detection Hook
 * @description Detects if current viewport is mobile-sized with improved performance
 * @returns Boolean indicating if viewport is mobile-sized
 * 
 * IMPROVEMENTS:
 * - Uses matchMedia API for better performance
 * - Proper TypeScript support
 * - SSR-safe initialization
 * - Debounced updates to prevent excessive re-renders
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Use matchMedia for better performance and proper media query handling
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    /** 
     * Handle media query changes with debouncing
     * @description Updates mobile state when viewport size changes
     */
    let debounceTimer: NodeJS.Timeout
    const onChange = () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
      }, 100) // 100ms debounce to prevent excessive updates
    }
    
    // Add event listener for media query changes
    mql.addEventListener("change", onChange)
    
    // Set initial value
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    
    // Cleanup function
    return () => {
      mql.removeEventListener("change", onChange)
      clearTimeout(debounceTimer)
    }
  }, [])

  // Return boolean (never undefined after first render)
  return !!isMobile
}
