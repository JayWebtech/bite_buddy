import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ScanResult {
  foodName: string;
  calories: number;
  nutritionScore: number;
  healthiness: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  coins: number;
  xp: number;
}

const mockScanResults: ScanResult[] = [
  {
    foodName: 'Grilled Salmon with Vegetables',
    calories: 320,
    nutritionScore: 95,
    healthiness: 'Excellent',
    coins: 50,
    xp: 95
  },
  {
    foodName: 'Caesar Salad',
    calories: 280,
    nutritionScore: 78,
    healthiness: 'Good',
    coins: 35,
    xp: 78
  },
  {
    foodName: 'Pizza Slice',
    calories: 450,
    nutritionScore: 45,
    healthiness: 'Fair',
    coins: 15,
    xp: 45
  },
  {
    foodName: 'Fried Chicken',
    calories: 520,
    nutritionScore: 30,
    healthiness: 'Poor',
    coins: 10,
    xp: 30
  },
  {
    foodName: 'Quinoa Bowl',
    calories: 350,
    nutritionScore: 88,
    healthiness: 'Excellent',
    coins: 45,
    xp: 88
  }
];

export default function MealScanScreen() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [hasScanned, setHasScanned] = useState(false);
  
  // Animations
  const scanAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (isScanning) {
      // Start scan animation
      const scanAnimation = Animated.loop(
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      
      scanAnimation.start();
      pulseAnimation.start();
      
      // Simulate scan completion after 3 seconds
      const timer = setTimeout(() => {
        completeScan();
        scanAnimation.stop();
        pulseAnimation.stop();
      }, 3000);
      
      return () => {
        clearTimeout(timer);
        scanAnimation.stop();
        pulseAnimation.stop();
      };
    }
  }, [isScanning]);

  const startScan = () => {
    setIsScanning(true);
    setScanResult(null);
    setHasScanned(false);
  };

  const completeScan = () => {
    // Randomly select a scan result
    const randomResult = mockScanResults[Math.floor(Math.random() * mockScanResults.length)];
    setScanResult(randomResult);
    setIsScanning(false);
    setHasScanned(true);
    
    // Animate result slide in
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const retryPhoto = () => {
    setScanResult(null);
    setHasScanned(false);
    slideAnim.setValue(300);
  };

  const confirmScan = () => {
    if (!scanResult) return;
    
    Alert.alert(
      'Meal Logged!',
      `You earned ${scanResult.coins} coins and ${scanResult.xp} XP! Your pet is happy!`,
      [
        {
          text: 'Feed Pet',
          onPress: () => router.push('/(game)/(tabs)/home')
        },
                 {
           text: 'Scan Another',
           onPress: () => {
             setScanResult(null);
             setHasScanned(false);
             slideAnim.setValue(300);
           }
         }
      ]
    );
  };

  const getHealthinessColor = (healthiness: ScanResult['healthiness']) => {
    switch (healthiness) {
      case 'Excellent': return '#16a085';
      case 'Good': return '#f39c12';
      case 'Fair': return '#e67e22';
      case 'Poor': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Meal Scanner</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Scanner View */}
      <View style={styles.scannerContainer}>
        {!isScanning && !hasScanned && (
          <View style={styles.cameraPlaceholder}>
            <Image
              source={require('@/assets/images/asset-1.png')}
              style={styles.placeholderImage}
              contentFit="contain"
            />
            <Text style={styles.placeholderText}>Point camera at your meal</Text>
            <Text style={styles.placeholderSubtext}>
              We'll analyze nutrition and reward your pet!
            </Text>
          </View>
        )}
        
        {isScanning && (
          <View style={styles.scanningOverlay}>
            <Animated.View
              style={[
                styles.scanningPet,
                {
                  transform: [{ scale: pulseAnim }]
                }
              ]}
            >
              <Image
                source={require('@/assets/images/pet-1.png')}
                style={styles.scanningPetImage}
                contentFit="contain"
              />
            </Animated.View>
            
            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [
                    {
                      translateY: scanAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-100, 100]
                      })
                    }
                  ]
                }
              ]}
            />
            
            <Text style={styles.scanningText}>Analyzing meal...</Text>
            <Text style={styles.scanningSubtext}>Calculating nutrition score</Text>
          </View>
        )}

        {/* Scanner Frame */}
        <View style={styles.scannerFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
      </View>

      {/* Scan Result */}
      {hasScanned && scanResult && (
        <Animated.View
          style={[
            styles.resultContainer,
            {
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>Scan Complete!</Text>
            <View style={[
              styles.healthinessBadge,
              { backgroundColor: getHealthinessColor(scanResult.healthiness) }
            ]}>
              <Text style={styles.healthinessText}>{scanResult.healthiness}</Text>
            </View>
          </View>
          
          <Text style={styles.foodName}>{scanResult.foodName}</Text>
          
          <View style={styles.nutritionStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{scanResult.calories}</Text>
              <Text style={styles.statLabel}>Calories</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{scanResult.nutritionScore}</Text>
              <Text style={styles.statLabel}>Nutrition</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>+{scanResult.coins}</Text>
              <Text style={styles.statLabel}>Coins</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>+{scanResult.xp}</Text>
              <Text style={styles.statLabel}>XP</Text>
            </View>
          </View>

          <View style={styles.resultActions}>
            <TouchableOpacity style={styles.retryButton} onPress={retryPhoto}>
              <Text style={styles.retryButtonText}>📷 Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={confirmScan}>
              <Text style={styles.confirmButtonText}>✓ Confirm</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Scan Button */}
      {!isScanning && !hasScanned && (
        <View style={styles.scanButtonContainer}>
          <TouchableOpacity style={styles.scanButton} onPress={startScan}>
            <Text style={styles.scanButtonText}>📸</Text>
          </TouchableOpacity>
          <Text style={styles.scanButtonLabel}>Tap to Scan</Text>
        </View>
      )}

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>How It Works</Text>
        <Text style={styles.infoText}>
          • Scan any meal to get nutrition analysis{'\n'}
          • Healthier foods earn more coins & XP{'\n'}
          • Feed your pet with earned coins{'\n'}
          • Each scan generates a zk-proof on Starknet
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'ClashDisplay-Medium',
    color: '#667eea',
  },
  title: {
    fontSize: 20,
    fontFamily: 'ClashDisplay-Bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  scannerContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 20,
    backgroundColor: '#16213e',
    position: 'relative',
    overflow: 'hidden',
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  placeholderImage: {
    width: 100,
    height: 100,
    marginBottom: 20,
    opacity: 0.6,
  },
  placeholderText: {
    fontSize: 18,
    fontFamily: 'ClashDisplay-Medium',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: 14,
    fontFamily: 'ClashDisplay-Regular',
    color: '#B0B0B0',
    textAlign: 'center',
  },
  scanningOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  scanningPet: {
    marginBottom: 40,
  },
  scanningPetImage: {
    width: 80,
    height: 80,
  },
  scanLine: {
    position: 'absolute',
    width: '80%',
    height: 2,
    backgroundColor: '#667eea',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  scanningText: {
    fontSize: 20,
    fontFamily: 'ClashDisplay-Medium',
    color: '#FFFFFF',
    marginTop: 60,
  },
  scanningSubtext: {
    fontSize: 14,
    fontFamily: 'ClashDisplay-Regular',
    color: '#B0B0B0',
    marginTop: 8,
  },
  scannerFrame: {
    position: 'absolute',
    top: '20%',
    left: '15%',
    right: '15%',
    bottom: '20%',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#667eea',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  resultContainer: {
    backgroundColor: '#0f1419',
    margin: 20,
    borderRadius: 16,
    padding: 20,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 20,
    fontFamily: 'ClashDisplay-Bold',
    color: '#FFFFFF',
  },
  healthinessBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  healthinessText: {
    fontSize: 12,
    fontFamily: 'ClashDisplay-Medium',
    color: '#FFFFFF',
  },
  foodName: {
    fontSize: 18,
    fontFamily: 'ClashDisplay-Medium',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  nutritionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'ClashDisplay-Bold',
    color: '#667eea',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'ClashDisplay-Regular',
    color: '#B0B0B0',
  },
  resultActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    flex: 1,
    backgroundColor: '#16213e',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'ClashDisplay-Medium',
    color: '#FFFFFF',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#16a085',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontFamily: 'ClashDisplay-Medium',
    color: '#FFFFFF',
  },
  scanButtonContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  scanButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  scanButtonText: {
    fontSize: 32,
  },
  scanButtonLabel: {
    fontSize: 16,
    fontFamily: 'ClashDisplay-Medium',
    color: '#FFFFFF',
  },
  infoSection: {
    backgroundColor: '#16213e',
    margin: 20,
    borderRadius: 12,
    padding: 16,
    marginBottom: 100,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'ClashDisplay-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'ClashDisplay-Regular',
    color: '#B0B0B0',
    lineHeight: 20,
  },
}); 