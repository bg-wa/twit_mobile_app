/**
 * TWiT Mobile App Theme
 * Centralized theme configuration for consistent styling across the app
 */

export const colors = {
  primary: '#ff0000',       // TWiT red
  secondary: '#333333',     // Dark gray
  background: '#f5f5f5',    // Light gray background
  card: '#ffffff',          // White card background
  text: {
    primary: '#333333',     // Primary text color
    secondary: '#666666',   // Secondary text color
    light: '#999999',       // Light text color
    inverse: '#ffffff',     // Text on dark backgrounds
  },
  border: '#eeeeee',        // Border color
  error: '#ff3b30',         // Error color
  success: '#34c759',       // Success color
  warning: '#ffcc00',       // Warning color
};

export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    tiny: 10,
    small: 12,
    regular: 14,
    medium: 16,
    large: 18,
    xlarge: 20,
    xxlarge: 24,
  },
};

export const spacing = {
  tiny: 4,
  small: 8,
  medium: 16,
  large: 24,
  xlarge: 32,
  xxlarge: 48,
};

export const borderRadius = {
  small: 4,
  medium: 8,
  large: 16,
  round: 9999,
};

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
};

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
};
