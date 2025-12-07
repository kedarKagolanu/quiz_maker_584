import { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'sonner';

interface TabSwitchOptions {
  maxWarnings?: number;
  hasTimeLimit?: boolean;
  onWarningLimitExceeded?: () => void;
  onTabSwitch?: (switchCount: number) => void;
  enabled?: boolean;
}

export const useTabSwitchDetection = ({
  maxWarnings = 3,
  hasTimeLimit = false,
  onWarningLimitExceeded,
  onTabSwitch,
  enabled = true
}: TabSwitchOptions) => {
  const [sessionId] = useState(() => Date.now().toString()); // Unique session ID
  const switchCountRef = useRef(0);
  const warningCountRef = useRef(0);
  const isActiveRef = useRef(true);

  // Reset counters when quiz changes or enabled state changes
  useEffect(() => {
    if (enabled) {
      switchCountRef.current = 0;
      warningCountRef.current = 0;
      isActiveRef.current = true;
    }
  }, [enabled, sessionId]); // Include sessionId to ensure fresh state for new quiz attempts

  const handleVisibilityChange = useCallback(() => {
    if (!enabled) return;
    
    if (document.hidden) {
      // User switched away from tab
      isActiveRef.current = false;
    } else {
      // User returned to tab
      if (!isActiveRef.current) {
        switchCountRef.current += 1;
        onTabSwitch?.(switchCountRef.current);
        
        if (hasTimeLimit) {
          // Show warning for timed quizzes
          warningCountRef.current += 1;
          
          const remainingWarnings = maxWarnings - warningCountRef.current;
          
          if (remainingWarnings > 0) {
            // Use alert() followed by confirm() for better visibility in timed quizzes
            alert(
              `⚠️ TAB SWITCH WARNING ${warningCountRef.current}/${maxWarnings}\n\n` +
              `You switched tabs during a timed quiz!\n` +
              `${remainingWarnings} warning(s) remaining.`
            );
            
            const endQuiz = confirm('Click OK to END the quiz now, or Cancel to CONTINUE the quiz');
            
            if (endQuiz) {
              onWarningLimitExceeded?.();
              return;
            }
            
            // Continue with quiz - don't restart anything
            
            toast.warning(
              `⚠️ Warning ${warningCountRef.current}/${maxWarnings}: ${remainingWarnings} left`,
              {
                duration: 3000,
                style: {
                  background: '#FEF3C7',
                  color: '#92400E',
                  border: '1px solid #F59E0B'
                }
              }
            );
          } else {
            // Exceeded warning limit - force confirmation
            alert('🛑 QUIZ TERMINATED\n\nYou exceeded the maximum number of tab switches for this timed quiz.');
            onWarningLimitExceeded?.();
          }
        } else {
          // For non-timed quizzes, just show a friendly reminder (no penalties)
          toast.info(
            `📌 Welcome back! Quiz continues where you left off. Tab switches: ${switchCountRef.current}`,
            {
              duration: 2000,
              style: {
                background: '#EFF6FF',
                color: '#1E40AF',
                border: '1px solid #3B82F6'
              }
            }
          );
        }
        
        isActiveRef.current = true;
      }
    }
  }, [enabled, hasTimeLimit, maxWarnings, onWarningLimitExceeded, onTabSwitch]);

  const handleFocus = useCallback(() => {
    if (!enabled) return;
    isActiveRef.current = true;
  }, [enabled]);

  const handleBlur = useCallback(() => {
    if (!enabled) return;
    isActiveRef.current = false;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Visibility API for tab switching
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Focus/blur for additional detection
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [handleVisibilityChange, handleFocus, handleBlur, enabled]);

  return {
    switchCount: switchCountRef.current,
    warningCount: warningCountRef.current,
    remainingWarnings: Math.max(0, maxWarnings - warningCountRef.current)
  };
};