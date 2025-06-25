import { Colors } from '@/constants/Colors';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GameButton from './GameButton';

const { width, height } = Dimensions.get('window');

interface GameAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: Array<{
    text: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'success' | 'danger';
  }>;
  onClose?: () => void;
  icon?: string | 'success' | 'error';
  iconType?: 'emoji' | 'image';
}

export default function GameAlert({
  visible,
  title,
  message,
  buttons = [{ text: 'OK', onPress: () => {}, variant: 'primary' }],
  onClose,
  icon = '🎮',
  iconType = 'emoji',
}: GameAlertProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.5,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getIconSource = () => {
    if (iconType === 'image') {
      switch (icon) {
        case 'success':
          return require('@/assets/images/icons/success.png');
        case 'error':
          return require('@/assets/images/icons/error.png');
        default:
          // If it's a custom path string
          return { uri: icon as string };
      }
    }
    return null;
  };

  const renderIcon = () => {
    if (iconType === 'image') {
      return (
        <Image
          source={getIconSource()}
          style={styles.iconImage}
          contentFit="contain"
        />
      );
    } else {
      return <Text style={styles.icon}>{icon}</Text>;
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <Animated.View
          style={[
            styles.alertContainer,
            {
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim },
              ],
            },
          ]}
        >
          {/* Glow effect */}
          <View style={styles.glowContainer}>
            <LinearGradient
              colors={[`${Colors.primary}40`, `${Colors.primary}20`,`${Colors.primary}20`]}
              style={styles.glow}
            />
          </View>

          {/* Main alert card */}
          <View style={styles.alertCard}>
            {/* Header with icon */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                {renderIcon()}
              </View>
              <Text style={styles.title}>{title}</Text>
            </View>

            {/* Message */}
            <View style={styles.messageContainer}>
              <Text style={styles.message}>{message}</Text>
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              {buttons.map((button, index) => (
                <GameButton
                  key={index}
                  title={button.text}
                  onPress={() => {
                    button.onPress();
                    onClose?.();
                  }}
                  variant={button.variant || 'primary'}
                  size="medium"
                  style={styles.alertButton}
                />
              ))}
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${Colors.primaryDark}CC`,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  alertContainer: {
    width: width * 0.85,
    maxWidth: 400,
    position: 'relative',
  },
  glowContainer: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    zIndex: -1,
  },
  glow: {
    flex: 1,
    borderRadius: 30,
  },
  alertCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 3,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryDark,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: {
    fontSize: 28,
  },
  iconImage: {
    width: 50,
    height: 50,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  messageContainer: {
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  message: {
    fontSize: 16,
    fontFamily: 'Blockblueprint',
    color: '#E0E0E0',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  alertButton: {
    flex: 1,
    maxWidth: 140,
  },
}); 