/**
 * Bite Buddy Color Palette
 * Organized color system for the NFT Pet Game
 */

export const Colors = {
  // Primary Brand Colors
  primary: '#01C57B',
  //'#04DE8C',
  primaryDark: '#232323',
  primaryLight: '#7a8ef0',
  
  // Background Colors
  background: '#1a1a2e',
  cardBackground: '#16213e',
  darkCard: '#0f1419',
  overlay: 'rgba(0, 0, 0, 0.7)',
  
  // Text Colors
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textMuted: '#7f8c8d',
  textDisabled: '#7f8c8d',
  
  // Status Colors
  success: '#16a085',
  warning: '#f39c12',
  danger: '#e74c3c',
  info: '#3498db',
  
  // Pet Rarity Colors
  rarity: {
    common: '#95a5a6',
    rare: '#3498db',
    epic: '#9b59b6',
    legendary: '#f39c12',
  },
  
  // Game UI Colors
  health: '#e74c3c',
  energy: '#667eea',
  xp: '#f39c12',
  coins: '#f39c12',
  
  // Food Quality Colors
  nutrition: {
    excellent: '#16a085',
    good: '#f39c12',
    fair: '#e67e22',
    poor: '#e74c3c',
  },
  
  // Interactive Elements
  buttonPrimary: '#667eea',
  buttonSecondary: '#16213e',
  buttonSuccess: '#16a085',
  buttonDanger: '#e74c3c',
  buttonDisabled: '#2c3e50',
  
  // Borders & Dividers
  border: '#16213e',
  borderLight: '#2c3e50',
  divider: '#34495e',
  
  // Shadows & Glows
  shadow: 'rgba(102, 126, 234, 0.3)',
  glow: '#667eea',
  
  // Achievement & Progress
  achievement: {
    unlocked: '#16a085',
    locked: '#7f8c8d',
    progress: '#667eea',
  },
  
  // Battle System
  battle: {
    player: '#16a085',
    opponent: '#e74c3c',
    neutral: '#667eea',
    attack: '#e74c3c',
    defense: '#3498db',
    special: '#9b59b6',
  },
  
  // Scan System
  scan: {
    frame: '#667eea',
    scanning: '#667eea',
    success: '#16a085',
    analyzing: 'rgba(102, 126, 234, 0.8)',
  },
  
  // Gradients (for future use)
  gradients: {
    primary: ['#667eea', '#764ba2'],
    success: ['#16a085', '#2ecc71'],
    warning: ['#f39c12', '#e67e22'],
    danger: ['#e74c3c', '#c0392b'],
  },
  
  // Theme variants
  light: {
    background: '#FFFFFF',
    cardBackground: '#F8F9FA',
    text: '#2C3E50',
    textSecondary: '#7F8C8D',
  },
  
  dark: {
    background: '#1a1a2e',
    cardBackground: '#16213e',
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
  },
};

// Utility function to get colors based on theme
export const getThemeColors = (isDark: boolean = true) => {
  return isDark ? Colors.dark : Colors.light;
};

// Utility function to get rarity color
export const getRarityColor = (rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary') => {
  switch (rarity) {
    case 'Common': return Colors.rarity.common;
    case 'Rare': return Colors.rarity.rare;
    case 'Epic': return Colors.rarity.epic;
    case 'Legendary': return Colors.rarity.legendary;
    default: return Colors.rarity.common;
  }
};

// Utility function to get nutrition color
export const getNutritionColor = (healthiness: 'Excellent' | 'Good' | 'Fair' | 'Poor') => {
  switch (healthiness) {
    case 'Excellent': return Colors.nutrition.excellent;
    case 'Good': return Colors.nutrition.good;
    case 'Fair': return Colors.nutrition.fair;
    case 'Poor': return Colors.nutrition.poor;
    default: return Colors.nutrition.fair;
  }
};

// Utility function to get stat color based on value
export const getStatColor = (value: number) => {
  if (value > 70) return Colors.success;
  if (value > 40) return Colors.warning;
  return Colors.danger;
};
