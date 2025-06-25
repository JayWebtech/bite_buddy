import { walletManager } from '@/utils/wallet';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
    
    checkFirstTimeUser();
  }, []);

  const checkFirstTimeUser = async () => {
    try {
      // Check if wallet exists (you can replace this with your own logic)
      const walletExists = await walletManager.getWalletInfo();
      
      // Add minimum splash duration for better UX
      setTimeout(() => {
        setIsChecking(false);
        if (walletExists?.isDeployed) {
          router.replace('/(game)/(tabs)/home');
        } else {
          if (walletExists?.publicKey && walletExists?.OZcontractAddress && walletExists?.OZaccountConstructorCallData) {

            if (!walletExists?.petType) {
              router.replace('/(auth)/pet-selection');
            } else {
              //router.replace('/(auth)/wallet-setup');
              router.replace('/(game)/(tabs)/home');
            }
          } else {
            router.replace('/(auth)/onboarding');
          }
        }
      }, 2000); // Minimum 2 seconds splash time
      
    } catch (error) {
      console.error('Error checking first time user:', error);
      // On error, assume first time user
      setTimeout(() => {
        setIsChecking(false);
        router.replace('/(auth)/onboarding');
      }, 2000);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/splash_bg.png')}
        style={styles.backgroundImage}
        contentFit="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 100,
    height: 100,
  },
}); 