import { Colors, getStatColor } from '@/constants/Colors';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PetStats {
  hunger: number;
  happiness: number;
  energy: number;
  level: number;
  xp: number;
}

interface FoodItem {
  id: number;
  name: string;
  emoji: string;
  nutritionScore: number;
  energyGain: number;
  cost: number;
}

const foodItems: FoodItem[] = [
  { id: 1, name: 'Apple', emoji: '🍎', nutritionScore: 85, energyGain: 15, cost: 10 },
  { id: 2, name: 'Banana', emoji: '🍌', nutritionScore: 78, energyGain: 20, cost: 8 },
  { id: 3, name: 'Salad', emoji: '🥗', nutritionScore: 95, energyGain: 25, cost: 25 },
  { id: 4, name: 'Pizza', emoji: '🍕', nutritionScore: 45, energyGain: 35, cost: 30 },
  { id: 5, name: 'Burger', emoji: '🍔', nutritionScore: 40, energyGain: 40, cost: 35 },
  { id: 6, name: 'Fish', emoji: '🐟', nutritionScore: 90, energyGain: 30, cost: 40 },
];

export default function HomeScreen() {
  const router = useRouter();
  const [petStats, setPetStats] = useState<PetStats>({
    hunger: 75,
    happiness: 80,
    energy: 60,
    level: 1,
    xp: 150
  });
  const [coins, setCoins] = useState(100);
  const [petEmotion, setPetEmotion] = useState<'happy' | 'hungry' | 'sad' | 'excited'>('happy');
  
  // Animations
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const heartAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous bouncing animation for the pet
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    
    // Blinking animation
    const blinkAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 0.1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
      ])
    );
    
    bounceAnimation.start();
    blinkAnimation.start();
    
    return () => {
      bounceAnimation.stop();
      blinkAnimation.stop();
    };
  }, []);

  useEffect(() => {
    // Update pet emotion based on stats
    if (petStats.hunger < 30) {
      setPetEmotion('hungry');
    } else if (petStats.happiness < 40) {
      setPetEmotion('sad');
    } else if (petStats.happiness > 90) {
      setPetEmotion('excited');
    } else {
      setPetEmotion('happy');
    }
  }, [petStats]);

  const feedPet = (food: FoodItem) => {
    if (coins < food.cost) {
      Alert.alert('Not enough coins!', 'Scan more meals to earn coins.');
      return;
    }

    // Show heart animation
    Animated.sequence([
      Animated.timing(heartAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(heartAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Update stats
    setPetStats(prev => ({
      ...prev,
      hunger: Math.min(100, prev.hunger + (food.nutritionScore / 2)),
      happiness: Math.min(100, prev.happiness + (food.nutritionScore / 3)),
      energy: Math.min(100, prev.energy + food.energyGain),
      xp: prev.xp + food.nutritionScore,
    }));

    setCoins(prev => prev - food.cost);
  };

  const getPetEmoji = () => {
    switch (petEmotion) {
      case 'happy': return '😊';
      case 'hungry': return '😋';
      case 'sad': return '😢';
      case 'excited': return '🤩';
      default: return '😊';
    }
  };



  const StatBar: React.FC<{ label: string; value: number; emoji: string }> = ({ label, value, emoji }) => (
    <View style={styles.statContainer}>
      <View style={styles.statHeader}>
        <Text style={styles.statEmoji}>{emoji}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}/100</Text>
      </View>
      <View style={styles.statBarBackground}>
        <View 
          style={[
            styles.statBarFill, 
            { width: `${value}%`, backgroundColor: getStatColor(value) }
          ]} 
        />
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.levelText}>Level {petStats.level}</Text>
          <Text style={styles.xpText}>XP: {petStats.xp}/200</Text>
        </View>
        <View style={styles.coinsContainer}>
          <Text style={styles.coinsText}>💰 {coins}</Text>
        </View>
      </View>

      {/* Pet Display */}
      <View style={styles.petContainer}>
        <Animated.View
          style={[
            styles.petImageContainer,
            {
              transform: [
                { 
                  translateY: bounceAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -10]
                  })
                }
              ]
            }
          ]}
        >
          <Animated.View style={{ opacity: blinkAnim }}>
            <Image
              source={require('@/assets/images/pet-1.png')}
              style={styles.petImage}
              contentFit="contain"
            />
          </Animated.View>
          
          {/* Pet emotion overlay */}
          <View style={styles.emotionOverlay}>
            <Text style={styles.emotionText}>{getPetEmoji()}</Text>
          </View>
          
          {/* Heart animation */}
          <Animated.View 
            style={[
              styles.heartAnimation,
              {
                opacity: heartAnim,
                transform: [
                  { 
                    translateY: heartAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -30]
                    })
                  },
                  { scale: heartAnim }
                ]
              }
            ]}
          >
            <Text style={styles.heartText}>❤️</Text>
          </Animated.View>
        </Animated.View>

        <Text style={styles.petName}>Fluffy</Text>
        <Text style={styles.petType}>Dragon Pup</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsSection}>
        <StatBar label="Hunger" value={petStats.hunger} emoji="🍽️" />
        <StatBar label="Happiness" value={petStats.happiness} emoji="❤️" />
        <StatBar label="Energy" value={petStats.energy} emoji="⚡" />
      </View>

      {/* Food Items */}
      <View style={styles.foodSection}>
        <Text style={styles.sectionTitle}>Feed Your Pet</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.foodScroll}>
          {foodItems.map((food) => (
            <TouchableOpacity
              key={food.id}
              style={[
                styles.foodItem,
                coins < food.cost && styles.foodItemDisabled
              ]}
              onPress={() => feedPet(food)}
              disabled={coins < food.cost}
            >
              <Text style={styles.foodEmoji}>{food.emoji}</Text>
              <Text style={styles.foodName}>{food.name}</Text>
              <Text style={styles.foodNutrition}>+{food.nutritionScore} nutrition</Text>
              <Text style={styles.foodCost}>💰 {food.cost}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        <TouchableOpacity 
          style={styles.scanButton}
          onPress={() => router.push('/(game)/meal-scan')}
        >
          <Text style={styles.scanButtonText}>📸 Scan Meal</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.battleButton}
          onPress={() => router.push('/(game)/(tabs)/battle')}
        >
          <Text style={styles.battleButtonText}>⚔️ Battle</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  headerInfo: {
    flexDirection: 'column',
  },
  levelText: {
    fontSize: 18,
    fontFamily: 'ClashDisplay-Bold',
    color: '#FFFFFF',
  },
  xpText: {
    fontSize: 14,
    fontFamily: 'ClashDisplay-Regular',
    color: '#B0B0B0',
  },
  coinsContainer: {
    backgroundColor: '#16213e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  coinsText: {
    fontSize: 16,
    fontFamily: 'ClashDisplay-Medium',
    color: '#FFFFFF',
  },
  petContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  petImageContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  petImage: {
    width: 150,
    height: 150,
  },
  emotionOverlay: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#16213e',
    borderRadius: 20,
    padding: 8,
  },
  emotionText: {
    fontSize: 20,
  },
  heartAnimation: {
    position: 'absolute',
    top: 20,
    left: '50%',
    marginLeft: -15,
  },
  heartText: {
    fontSize: 30,
  },
  petName: {
    fontSize: 24,
    fontFamily: 'ClashDisplay-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  petType: {
    fontSize: 16,
    fontFamily: 'ClashDisplay-Regular',
    color: '#B0B0B0',
  },
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  statContainer: {
    marginBottom: 16,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'ClashDisplay-Medium',
    color: '#FFFFFF',
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontFamily: 'ClashDisplay-Regular',
    color: '#B0B0B0',
  },
  statBarBackground: {
    height: 8,
    backgroundColor: '#16213e',
    borderRadius: 4,
    overflow: 'hidden',
  },
  statBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  foodSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'ClashDisplay-Bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  foodScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  foodItem: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    width: 100,
  },
  foodItemDisabled: {
    opacity: 0.5,
  },
  foodEmoji: {
    fontSize: 30,
    marginBottom: 8,
  },
  foodName: {
    fontSize: 12,
    fontFamily: 'ClashDisplay-Medium',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  foodNutrition: {
    fontSize: 10,
    fontFamily: 'ClashDisplay-Regular',
    color: '#16a085',
    marginBottom: 4,
  },
  foodCost: {
    fontSize: 10,
    fontFamily: 'ClashDisplay-Regular',
    color: '#f39c12',
  },
  actionsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 12,
  },
  scanButton: {
    flex: 1,
    backgroundColor: '#667eea',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  scanButtonText: {
    fontSize: 16,
    fontFamily: 'ClashDisplay-Medium',
    color: '#FFFFFF',
  },
  battleButton: {
    flex: 1,
    backgroundColor: '#e74c3c',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  battleButtonText: {
    fontSize: 16,
    fontFamily: 'ClashDisplay-Medium',
    color: '#FFFFFF',
  },
}); 