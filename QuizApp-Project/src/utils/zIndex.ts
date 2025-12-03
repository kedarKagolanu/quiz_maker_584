/**
 * @fileoverview Z-Index Management System
 * @description Centralized z-index constants to prevent layering conflicts
 * @author Quiz Application Team
 * @version 2.0.0
 */

/**
 * Z-Index Hierarchy Constants
 * @description Defines proper layering order for all UI elements
 * 
 * LAYERING STRATEGY:
 * - Background elements: 10-19
 * - Content elements: 20-29  
 * - Fixed UI elements: 30-39
 * - Notifications: 40-49
 * - Music player: 50-59
 * - Modals and overlays: 60-89
 * - Critical toasts/alerts: 90-100
 */
export const Z_INDEX = {
  /** Background elements and base layers */
  BACKGROUND: 10,
  
  /** Main content and standard components */
  CONTENT: 20,
  
  /** Sidebar and navigation elements */
  SIDEBAR: 25,
  
  /** Fixed positioned elements (debug info, etc.) */
  FIXED_ELEMENTS: 30,
  
  /** Notification toasts and alerts */
  NOTIFICATIONS: 40,
  
  /** Music player controls */
  MUSIC_PLAYER: 50,
  
  /** Modal dialogs and overlays */
  MODALS: 60,
  
  /** Loading overlays */
  LOADING_OVERLAY: 70,
  
  /** Critical system toasts */
  TOAST: 100
} as const;

/**
 * Tailwind CSS Z-Index Classes
 * @description Pre-built Tailwind classes for consistent z-index usage
 */
export const zIndexClasses = {
  background: 'z-10',
  content: 'z-20',
  sidebar: 'z-[25]',
  fixedElements: 'z-[30]',
  notifications: 'z-[40]',
  musicPlayer: 'z-[50]',
  modals: 'z-[60]',
  loadingOverlay: 'z-[70]',
  toast: 'z-[100]'
} as const;

/**
 * Get Z-Index Value
 * @param layer - The UI layer name
 * @returns Numeric z-index value
 */
export const getZIndex = (layer: keyof typeof Z_INDEX): number => {
  return Z_INDEX[layer];
};