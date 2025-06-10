/**
 * Theme configuration for the TWiT Mobile App
 * Based on the official TWiT brand colors from their website
 */

export const COLORS = {
  // Primary brand colors
  PRIMARY: '#1f2550',      // Dark navy blue (navigation background)
  PRIMARY_LIGHT: '#2c3567', // Slightly lighter navy
  SECONDARY: '#4fc3f7',    // Light blue accent (from podcast link)
  
  // Call-to-action colors
  CTA: '#f8ad09',          // Yellow/orange for buttons
  CTA_DARK: '#e8a000',     // Darker version for pressed states
  
  // Text colors
  TEXT_DARK: '#232b42',    // Nearly black text
  TEXT_MEDIUM: '#4a4a4a',  // Medium gray text
  TEXT_LIGHT: '#f8f9fa',   // Light text (for dark backgrounds)
  
  // UI elements
  BACKGROUND: '#f8f9fa',   // Light background
  CARD: '#ffffff',         // Card background
  BORDER: '#e9ecef',       // Light borders
  ERROR: '#e53935',        // Error states
  SUCCESS: '#43a047',      // Success states
  
  // Tab bar
  TAB_ACTIVE: '#4fc3f7',   // Active tab
  TAB_INACTIVE: '#8e909f', // Inactive tab
};

export const TYPOGRAPHY = {
  FONT_SIZE: {
    SMALL: 12,
    MEDIUM: 14,
    LARGE: 16,
    X_LARGE: 18,
    XX_LARGE: 22,
    XXX_LARGE: 26,
  },
};

export const SPACING = {
  SMALL: 8,
  MEDIUM: 16, 
  LARGE: 24,
  X_LARGE: 32,
};

export default { COLORS, TYPOGRAPHY, SPACING };
