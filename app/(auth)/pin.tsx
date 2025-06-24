import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';

export default function PinScreen() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState('');

  const handlePinPress = (digit: string) => {
    if (isConfirming) {
      if (confirmPin.length < 6) {
        setConfirmPin(prev => prev + digit);
      }
    } else {
      if (pin.length < 6) {
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
    }
  }, [pin]);

  useEffect(() => {
    if (confirmPin.length === 6) {
      if (pin === confirmPin) {
        // PIN matches, continue to pet selection
        router.push('/(auth)/pet-selection');
      } else {
        // PIN doesn't match, show error and reset
        setError('PINs do not match. Try again.');
        Vibration.vibrate(500);
        setTimeout(() => {
          setPin('');
          setConfirmPin('');
          setIsConfirming(false);
          setError('');
        }, 2000);
      }
    }
  }, [confirmPin]);

  const renderPinDots = (currentPin: string) => {
    return (
      <View style={styles.pinDots}>
        {[...Array(6)].map((_, index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              index < currentPin.length && styles.pinDotFilled
            ]}
          />
        ))}
      </View>
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
      <View style={styles.keypad}>
        {keys.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key, keyIndex) => (
              <TouchableOpacity
                key={keyIndex}
                style={[
                  styles.keypadButton,
                  key === '' && styles.keypadButtonEmpty
                ]}
                onPress={() => {
                  if (key === 'delete') {
                    handleDelete();
                  } else if (key !== '') {
                    handlePinPress(key);
                  }
                }}
                disabled={key === ''}
              >
                {key === 'delete' ? (
                  <Text style={styles.deleteText}>⌫</Text>
                ) : (
                  <Text style={styles.keypadText}>{key}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('@/assets/images/pet-3.png')}
          style={styles.petImage}
          contentFit="contain"
        />
        <Text style={styles.title}>
          {isConfirming ? 'Confirm Your PIN' : 'Create Your PIN'}
        </Text>
        <Text style={styles.subtitle}>
          {isConfirming 
            ? 'Enter your PIN again to confirm'
            : 'Choose a 6-digit PIN to secure your pets'
          }
        </Text>
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

      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  petImage: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'ClashDisplay-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'ClashDisplay-Regular',
    color: '#B0B0B0',
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
    fontFamily: 'ClashDisplay-Medium',
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
    borderColor: '#667eea',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: '#667eea',
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
    backgroundColor: '#16213e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadButtonEmpty: {
    backgroundColor: 'transparent',
  },
  keypadText: {
    fontSize: 24,
    fontFamily: 'ClashDisplay-Medium',
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
    fontFamily: 'ClashDisplay-Medium',
    color: '#667eea',
  },
}); 