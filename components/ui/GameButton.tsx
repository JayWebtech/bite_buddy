import { GameAudio } from '@/utils/soundManager';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';

interface GameButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function GameButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  style,
  textStyle,
}: GameButtonProps) {
  const getGradientColors = (): string[] => {
    if (disabled) return ['#718096', '#4a5568'];
    
    switch (variant) {
      case 'primary':
        return ['#FFD700', '#FFA500', '#FF8C00']; // Gold gradient
      case 'secondary':
        return ['#87CEEB', '#4682B4', '#2F4F4F']; // Blue gradient
      case 'success':
        return ['#90EE90', '#32CD32', '#228B22']; // Green gradient
      case 'danger':
        return ['#FF6B6B', '#E74C3C', '#C0392B']; // Red gradient
      default:
        return ['#FFD700', '#FFA500', '#FF8C00'];
    }
  };

  const getBorderColor = () => {
    if (disabled) return '#4a5568';
    
    switch (variant) {
      case 'primary':
        return '#B8860B'; // Dark gold
      case 'secondary':
        return '#2F4F4F'; // Dark blue
      case 'success':
        return '#228B22'; // Dark green
      case 'danger':
        return '#8B0000'; // Dark red
      default:
        return '#B8860B';
    }
  };

  const handlePress = () => {
    if (!disabled) {
      GameAudio.buttonPress();
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.buttonContainer, style]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {/* Main gradient background */}
      <LinearGradient
        colors={getGradientColors() as any}
        style={[
          styles.button,
          styles[size],
          { borderColor: getBorderColor() },
          disabled && styles.disabled,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {/* Glass highlight overlay */}
        <LinearGradient
          colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.1)', 'transparent']}
          style={styles.glassOverlay}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.6 }}
        />
        
        {/* Button text */}
        <Text style={[
          styles.buttonText,
          size === 'small' && styles.smallText,
          size === 'medium' && styles.mediumText,
          size === 'large' && styles.largeText,
          disabled && styles.disabledText,
          textStyle,
        ]}>
          {title.toUpperCase()}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    position: 'relative',
  },
  button: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  
  glassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 13,
  },
  
  shadowBottom: {
    position: 'absolute',
    bottom: -4,
    left: 3,
    right: 3,
    height: 8,
    borderRadius: 16,
    zIndex: -1,
  },
  
  // Sizes
  small: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  medium: {
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  large: {
    paddingHorizontal: 36,
    paddingVertical: 18,
  },
  
  // Disabled state
  disabled: {
    shadowOpacity: 0.1,
  },
  
  // Text styles
  buttonText: {
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
    zIndex: 2,
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 20,
  },
  disabledText: {
    color: '#a0aec0',
    textShadowColor: 'rgba(0,0,0,0.3)',
  },
}); 