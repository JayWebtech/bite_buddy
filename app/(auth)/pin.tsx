import { Colors } from '@/constants/Colors';
import { walletManager } from '@/utils/wallet';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';

export default function PinScreen() {
  const router = useRouter();
  const { seedphrase } = useLocalSearchParams();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState('');

  // Animation refs
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(30)).current;
  const pinDotsScale = useRef(new Animated.Value(0.8)).current;
  const pinDotsOpacity = useRef(new Animated.Value(0)).current;
  const keypadOpacity = useRef(new Animated.Value(0)).current;
  const keypadTranslateY = useRef(new Animated.Value(50)).current;
  const errorShakeAnim = useRef(new Animated.Value(0)).current;
  const pinDotAnimations = useRef(
    Array.from({ length: 6 }, () => ({
      scale: new Animated.Value(1),
      pulse: new Animated.Value(1),
    }))
  ).current;

  useEffect(() => {
    // Entrance animations
    Animated.sequence([
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(pinDotsScale, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(pinDotsOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(keypadOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(keypadTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const animatePinDot = (index: number) => {
    Animated.sequence([
      Animated.spring(pinDotAnimations[index].scale, {
        toValue: 1.3,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(pinDotAnimations[index].scale, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse effect
    Animated.sequence([
      Animated.timing(pinDotAnimations[index].pulse, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(pinDotAnimations[index].pulse, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateErrorShake = () => {
    Animated.sequence([
      Animated.timing(errorShakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(errorShakeAnim, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(errorShakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(errorShakeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePinPress = (digit: string) => {
    if (isConfirming) {
      if (confirmPin.length < 6) {
        const newLength = confirmPin.length;
        animatePinDot(newLength);
        setConfirmPin(prev => prev + digit);
      }
    } else {
      if (pin.length < 6) {
        const newLength = pin.length;
        animatePinDot(newLength);
        setPin(prev => prev + digit);
      }
    }
    setError('');
  };

  const handleDelete = () => {
    if (isConfirming) {
      setConfirmPin(prev => prev.slice(0, -1));
    } else {
      setPin(prev => prev.slice(0, -1));
    }
    setError('');
  };

  useEffect(() => {
    if (pin.length === 6 && !isConfirming) {
      setIsConfirming(true);
      // Reset animations for confirmation phase
      pinDotAnimations.forEach(anim => {
        anim.scale.setValue(1);
        anim.pulse.setValue(1);
      });
    }
  }, [pin]);

  useEffect(() => {
    if (confirmPin.length === 6) {
      if (pin === confirmPin) {
        // PIN matches, setup wallet and continue to pet selection
        setupWalletWithPin();
      } else {
        // PIN doesn't match, show error and reset
        setError('PINs do not match. Try again.');
        animateErrorShake();
        Vibration.vibrate(500);
        setTimeout(() => {
          setPin('');
          setConfirmPin('');
          setIsConfirming(false);
          setError('');
          // Reset dot animations
          pinDotAnimations.forEach(anim => {
            anim.scale.setValue(1);
            anim.pulse.setValue(1);
          });
        }, 2000);
      }
    }
  }, [confirmPin]);

  const setupWalletWithPin = async () => {
    try {
      const seedPhrase = seedphrase ? JSON.parse(seedphrase as string) : walletManager.generateSeedPhrase();
      
      // Setup wallet with the PIN
      await walletManager.setupWalletFromSeed(seedPhrase, pin);
      
      // Continue to pet selection
      router.push('/(auth)/pet-selection');
    } catch (error) {
      console.error('Error setting up wallet:', error);
      setError('Failed to setup wallet. Please try again.');
      animateErrorShake();
      Vibration.vibrate(500);
      
      // Reset after error
      setTimeout(() => {
        setPin('');
        setConfirmPin('');
        setIsConfirming(false);
        setError('');
        pinDotAnimations.forEach(anim => {
          anim.scale.setValue(1);
          anim.pulse.setValue(1);
        });
      }, 3000);
    }
  };

  const renderPinDots = (currentPin: string) => {
    return (
      <Animated.View 
        style={[
          styles.pinDots,
          {
            opacity: pinDotsOpacity,
            transform: [
              { scale: pinDotsScale },
              { translateX: errorShakeAnim },
            ],
          },
        ]}
      >
        {[...Array(6)].map((_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.pinDot,
              index < currentPin.length && styles.pinDotFilled,
              {
                transform: [
                  { scale: pinDotAnimations[index].scale },
                  { scale: pinDotAnimations[index].pulse },
                ],
              },
            ]}
          />
        ))}
      </Animated.View>
    );
  };

  const KeypadButton = ({ keyValue, onPress }: { keyValue: string; onPress: () => void }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }).start();
      onPress();
    };

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={styles.keypadButton}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
        >
          {keyValue === 'delete' ? (
            <Text style={styles.deleteText}>⌫</Text>
          ) : (
            <Text style={styles.keypadText}>{keyValue}</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderKeypad = () => {
    const keys = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'delete']
    ];

    return (
      <Animated.View 
        style={[
          styles.keypad,
          {
            opacity: keypadOpacity,
            transform: [{ translateY: keypadTranslateY }],
          },
        ]}
      >
        {keys.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key, keyIndex) => (
              key === '' ? (
                <View key={keyIndex} style={styles.keypadButtonEmpty} />
              ) : (
                <KeypadButton
                  key={keyIndex}
                  keyValue={key}
                  onPress={() => {
                    if (key === 'delete') {
                      handleDelete();
                    } else {
                      handlePinPress(key);
                    }
                  }}
                />
              )
            ))}
          </View>
        ))}
      </Animated.View>
    );
  };

  return (
    <View style={styles.wrapper}>
      <Image
        source={require('@/assets/images/bg_screen_2.png')}
        style={styles.backgroundImage}
        contentFit="cover"
      />
      
      {/* Dark overlay */}
      <View style={styles.darkOverlay} />
      
      <View style={styles.container}>
        <View style={styles.header}>
          <Animated.View
            style={{
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            }}
          >
            <Text style={styles.title}>
              {isConfirming ? 'CONFIRM YOUR PIN' : 'CREATE YOUR PIN'}
            </Text>
          </Animated.View>
          
          <Animated.View
            style={{
              opacity: subtitleOpacity,
              transform: [{ translateY: subtitleTranslateY }],
            }}
          >
            <Text style={styles.subtitle}>
              {isConfirming 
                ? 'Enter your PIN again to confirm'
                : 'Choose a 6-digit PIN to secure your pets'
              }
            </Text>
          </Animated.View>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.pinContainer}>
          {renderPinDots(isConfirming ? confirmPin : pin)}
        </View>

        {renderKeypad()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    zIndex: -1,
  },
  darkOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 40,
  },
  petImage: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 34,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Blockblueprint',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorContainer: {
    backgroundColor: '#ff4757',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
  },
  pinContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  pinDots: {
    flexDirection: 'row',
    gap: 16,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: Colors.primary,
  },
  keypad: {
    gap: 20,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
  },
  keypadButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  keypadButtonEmpty: {
    width: 60,
    height: 60,
  },
  keypadText: {
    fontSize: 24,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
  },
  deleteText: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  backButton: {
    position: 'absolute',
    bottom: 50,
    left: 24,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Blockblueprint',
    color: '#667eea',
  },
}); 