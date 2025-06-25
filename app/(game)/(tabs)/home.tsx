import GameAlert from '@/components/ui/GameAlert';
import GameButton from '@/components/ui/GameButton';
import { MintPetPrompt } from '@/components/ui/MintPetPrompt';
import { Colors, getStatColor } from '@/constants/Colors';
import { walletManager } from '@/utils/wallet';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { shortString } from 'starknet';

interface PetStats {
  hunger: number;
  happiness: number;
  energy: number;
  level: number;
  xp: number;
}

interface ContractPet {
  id: string;
  owner: string;
  pet_type: string;
  name: string;
  level: number;
  xp: number;
  energy: number;
  hunger: number;
  happiness: number;
  last_fed: number;
  total_meals: number;
  created_at: number;
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

// Pet data mapping based on pet-selection.tsx
const petAnimationMap: { [key: string]: any } = {
  'Fluffy': require('@/assets/animations/lottie-1.json'),
  'Sparkle': require('@/assets/animations/lottie-2.json'), 
  'Thunder': require('@/assets/animations/lottie-3.json'),
  'Mystic': require('@/assets/animations/lottie-4.json'),
};

const petTypeMap: { [key: string]: string } = {
  'Fluffy': 'Dragon Pup',
  'Sparkle': 'Crystal Fox',
  'Thunder': 'Storm Wolf', 
  'Mystic': 'Shadow Cat',
};

const InteractivePet: React.FC<{
  stats: PetStats;
  onFeed: (happiness: number) => void;
  onPet: () => void;
  onPlay: () => void;
  petName: string;
  petType?: string;
}> = ({ stats, onFeed, onPet, onPlay, petName, petType }) => {
  const lottieRef = useRef<LottieView>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [interactionFeedback, setInteractionFeedback] = useState<{ type: string; x: number; y: number; visible: boolean }>({
    type: '',
    x: 0,
    y: 0,
    visible: false
  });
  
  // Animation references
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const feedbackScale = useRef(new Animated.Value(0)).current;

  // Handle head petting
  const handleHeadPet = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    
    setIsInteracting(true);
    
    // Show interaction feedback
    showInteractionFeedback('❤️', locationX, locationY);
    
    // Scale animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    if (lottieRef.current) {
      lottieRef.current.reset();
      lottieRef.current.play();
    }

    onPet();
    
    setTimeout(() => {
      setIsInteracting(false);
    }, 2000);
  };

  // Handle body tickling
  const handleBodyTickle = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    
    setIsInteracting(true);
    
    showInteractionFeedback('😆', locationX, locationY);
    
    // Wiggle animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (lottieRef.current) {
      lottieRef.current.reset();
      lottieRef.current.play();
    }

    onPlay();
    
    setTimeout(() => {
      setIsInteracting(false);
    }, 2000);
  };

  // Handle feeding
  const handleFeedingArea = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    
    setIsInteracting(true);
    
    showInteractionFeedback('🍽️', locationX, locationY);
    
    if (lottieRef.current) {
      lottieRef.current.reset();
      lottieRef.current.play();
    }

    onFeed(10);
    
    setTimeout(() => {
      setIsInteracting(false);
    }, 2000);
  };

  // Show interaction feedback
  const showInteractionFeedback = (emoji: string, x: number, y: number) => {
    setInteractionFeedback({ type: emoji, x, y, visible: true });
    
    Animated.parallel([
      Animated.timing(feedbackOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(feedbackScale, {
        toValue: 1,
        tension: 150,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Fade out after showing
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(feedbackOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(feedbackScale, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setInteractionFeedback(prev => ({ ...prev, visible: false }));
          feedbackScale.setValue(0);
        });
      }, 1000);
    });
  };

  return (
    <View style={styles.interactivePetContainer}>
      <Animated.View
        style={[
          styles.petAnimationContainer,
          {
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        <LottieView
          ref={lottieRef}
          source={petAnimationMap[petName] || require('@/assets/animations/lottie-1.json')} // Dynamic pet animation
          style={styles.petLottie}
          autoPlay
          loop={!isInteracting}
          speed={1}
        />
        
        {/* Head petting zone */}
        <TouchableOpacity
          style={styles.headZone}
          onPress={handleHeadPet}
          activeOpacity={0.7}
        >
          <View style={styles.interactionHint}>
            <Text style={styles.hintText}>Pet</Text>
          </View>
        </TouchableOpacity>

        {/* Body tickle zone */}
        <TouchableOpacity
          style={styles.bodyZone}
          onPress={handleBodyTickle}
          activeOpacity={0.7}
        >
          <View style={styles.interactionHint}>
            <Text style={styles.hintText}>Tickle</Text>
          </View>
        </TouchableOpacity>

        {/* Feeding zone */}
        <TouchableOpacity
          style={styles.feedingZone}
          onPress={handleFeedingArea}
          activeOpacity={0.7}
        >
          <View style={styles.interactionHint}>
            <Text style={styles.hintText}>Feed</Text>
          </View>
        </TouchableOpacity>

        {/* Interaction feedback */}
        {interactionFeedback.visible && (
          <Animated.View
            style={[
              styles.interactionFeedback,
              {
                left: interactionFeedback.x - 15,
                top: interactionFeedback.y - 15,
                opacity: feedbackOpacity,
                transform: [{ scale: feedbackScale }],
              }
            ]}
          >
            <Text style={styles.feedbackText}>{interactionFeedback.type}</Text>
          </Animated.View>
        )}
      </Animated.View>

      {/* Pet info */}
      <View style={styles.petInfo}>
        <Text style={styles.petName}>{petName}</Text>
        <Text style={styles.petType}>{petType || petTypeMap[petName] || 'Interactive Pet'}</Text>
        <Text style={styles.interactionHint}>
          Tap different areas to interact!
        </Text>
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const [petStats, setPetStats] = useState<PetStats>({
    hunger: 75,
    happiness: 80,
    energy: 60,
    level: 1,
    xp: 150
  });
  const [petData, setPetData] = useState<ContractPet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [petName, setPetName] = useState('Fluffy');
  const [petType, setPetType] = useState('Dragon Pup');
  const [coins, setCoins] = useState(100);
  const [showAlert, setShowAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon: string;
  }>({
    visible: false,
    title: '',
    message: '',
    icon: '🎮'
  });

  // Helper function to parse Uint256 values from contract response
  const parseUint256 = (low: string, high: string): number => {
    const lowBig = BigInt(low);
    const highBig = BigInt(high);
    const result = lowBig + (highBig << 128n);
    return Number(result);
  };

  // Helper function to parse contract pet response
  const parsePetContractResponse = (response: string[]): ContractPet | null => {
    try {
      console.log('Raw contract response:', response);
      console.log('Response length:', response.length);

      // Expected format based on your response:
      // [token_id_low, token_id_high, owner, pet_type, name, level_low, level_high, 
      //  xp_low, xp_high, energy_low, energy_high, hunger_low, hunger_high, 
      //  happiness_low, happiness_high, last_fed_low, last_fed_high, 
      //  total_meals_low, total_meals_high, created_at]

      if (response.length < 19) {
        console.log('Invalid response length:', response.length);
        return null;
      }

      const pet: ContractPet = {
        id: parseUint256(response[0], response[1]).toString(),
        owner: response[2],
        pet_type: response[3],
        name: response[4],
        level: parseUint256(response[5], response[6]),
        xp: parseUint256(response[7], response[8]),
        energy: parseUint256(response[9], response[10]),
        hunger: parseUint256(response[11], response[12]),
        happiness: parseUint256(response[13], response[14]),
        last_fed: parseUint256(response[15], response[16]),
        total_meals: parseUint256(response[17], response[18]),
        created_at: response.length > 19 ? Number(response[19]) : 0,
      };

      // Log parsed values for debugging
      console.log('Parsed pet data:', {
        id: pet.id,
        level: pet.level,
        xp: pet.xp,
        energy: pet.energy,
        hunger: pet.hunger,
        happiness: pet.happiness,
        last_fed: pet.last_fed,
        total_meals: pet.total_meals,
      });

      // Decode pet type and name from felt252
      try {
        const decodedType = shortString.decodeShortString(pet.pet_type);
        const decodedName = shortString.decodeShortString(pet.name);
        console.log('Decoded pet type:', decodedType);
        console.log('Decoded pet name:', decodedName);
        
        pet.pet_type = decodedType;
        pet.name = decodedName;
      } catch (e) {
        console.log('Could not decode pet type/name:', e);
      }

      return pet;
    } catch (error) {
      console.log('Error parsing pet contract response:', error);
      return null;
    }
  };

  // Fetch pet data from contract
  const fetchPetData = async () => {
    try {
      setIsLoading(true);
      const contractPetData = await walletManager.getPet();
      
      if (contractPetData && contractPetData.length > 0) {
        const pet = parsePetContractResponse(contractPetData);
        
        if (pet) {
          setPetData(pet);
          
          // Update local stats with contract data
          setPetStats({
            hunger: pet.hunger,
            happiness: pet.happiness,
            energy: pet.energy,
            level: pet.level,
            xp: pet.xp
          });

          setPetName(pet.name || 'Pet');
          setPetType(pet.pet_type || petTypeMap[pet.name] || 'Pet');
        } else {
          throw new Error('Failed to parse pet data');
        }
      } else {
        // No pet found - show default values
        console.log('No pet found for this wallet');
        setShowAlert({
          visible: true,
          title: 'No Pet Found',
          message: 'You need to mint a pet first. Check your wallet setup.',
          icon: 'error'
        });
      }
    } catch (error) {
      console.log('Error fetching pet data:', error);
      setShowAlert({
        visible: true,
        title: 'Error',
        message: 'Could not load pet data. Using demo mode.',
        icon: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load pet data on component mount
  useEffect(() => {
    fetchPetData();
  }, []);

  const feedPet = (food: FoodItem) => {
    if (coins < food.cost) {
      setShowAlert({
        visible: true,
        title: 'Not enough coins!',
        message: 'Scan more meals to earn coins.',
        icon: 'error'
      });
      return;
    }

    // Update stats
    setPetStats(prev => ({
      ...prev,
      hunger: Math.min(100, prev.hunger + (food.nutritionScore / 2)),
      happiness: Math.min(100, prev.happiness + (food.nutritionScore / 3)),
      energy: Math.min(100, prev.energy + food.energyGain),
      xp: prev.xp + food.nutritionScore,
    }));

    setCoins(prev => prev - food.cost);

    setShowAlert({
      visible: true,
      title: 'Yummy!',
      message: `${petName} enjoyed the ${food.name}!`,
      icon: 'success'
    });
  };

  const handlePetInteraction = (happinessGain: number) => {
    setPetStats(prev => ({
      ...prev,
      happiness: Math.min(100, prev.happiness + happinessGain),
      xp: prev.xp + 5,
    }));
  };

  const handlePetPetting = () => {
    setPetStats(prev => ({
      ...prev,
      happiness: Math.min(100, prev.happiness + 8),
      xp: prev.xp + 3,
    }));
  };

  const handlePetPlaying = () => {
    setPetStats(prev => ({
      ...prev,
      happiness: Math.min(100, prev.happiness + 12),
      energy: Math.max(0, prev.energy - 5),
      xp: prev.xp + 8,
    }));
  };

  // Refresh button handler
  const handleRefresh = () => {
    fetchPetData();
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

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.wrapper}>
        <Image
          source={require('@/assets/images/bg_screen_2.png')}
          style={styles.backgroundImage}
          contentFit="cover"
        />
        <View style={styles.darkOverlay} />
        <View style={styles.loadingContainer}>
          <LottieView
            source={petAnimationMap[petName] || require('@/assets/animations/lottie-1.json')}
            style={styles.loadingLottie}
            autoPlay
            loop
          />
          <Text style={styles.loadingText}>Loading {petName}...</Text>
        </View>
      </View>
    );
  }

  return (
    <MintPetPrompt>
      <View style={styles.wrapper}>
        <Image
          source={require('@/assets/images/bg_screen_2.png')}
          style={styles.backgroundImage}
          contentFit="cover"
        />
        
        {/* Dark overlay */}
        <View style={styles.darkOverlay} />
        
        <ScrollView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerInfo}>
              <Text style={styles.levelText}>Level {petStats.level}</Text>
              <Text style={styles.xpText}>XP: {petStats.xp}/{(petStats.level * 100)}</Text>
              {petData && (
                <Text style={styles.petIdText}>Pet ID: #{petData.id}</Text>
              )}
            </View>
            <View style={styles.headerRight}>
            <View style={styles.coinsContainer}>
              <Text style={styles.coinsText}>💰 {coins}</Text>
              </View>
              <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Interactive Pet Display */}
          <InteractivePet
            stats={petStats}
            onFeed={handlePetInteraction}
            onPet={handlePetPetting}
            onPlay={handlePetPlaying}
            petName={petName}
            petType={petType}
          />

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
            <GameButton
            title='Scan meal'
              variant='primary'
              onPress={() => router.push('/(game)/meal-scan')}
            />

  <GameButton
            title='Go to battle'
              variant='success'
              onPress={() => router.push('/(game)/(tabs)/battle')}
            />
          </View>

          {/* Custom Alert */}
          <GameAlert
            visible={showAlert.visible}
            title={showAlert.title}
            message={showAlert.message}
            icon={showAlert.icon}
            iconType="image"
            onClose={() => setShowAlert(prev => ({ ...prev, visible: false }))}
          />
        </ScrollView>
      </View>
    </MintPetPrompt>
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
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
  },
  xpText: {
    fontSize: 14,
    fontFamily: 'Blockblueprint',
    color: '#B0B0B0',
  },
  coinsContainer: {
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  coinsText: {
    fontSize: 16,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
  },
  interactivePetContainer: {
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  petAnimationContainer: {
    position: 'relative',
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  petLottie: {
    width: 250,
    height: 250,
  },
  headZone: {
    position: 'absolute',
    top: '10%',
    left: '30%',
    width: '40%',
    height: '30%',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bodyZone: {
    position: 'absolute',
    top: '40%',
    left: '25%',
    width: '50%',
    height: '35%',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedingZone: {
    position: 'absolute',
    bottom: '10%',
    left: '35%',
    width: '30%',
    height: '20%',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  interactionHint: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    opacity: 0.7,
  },
  hintText: {
    fontSize: 10,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
  },
  interactionFeedback: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  feedbackText: {
    fontSize: 16,
  },
  petInfo: {
    alignItems: 'center',
  },
  petName: {
    fontSize: 24,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  petType: {
    fontSize: 16,
    fontFamily: 'Blockblueprint',
    color: '#B0B0B0',
    marginBottom: 8,
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
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontFamily: 'Blockblueprint',
    color: '#B0B0B0',
  },
  statBarBackground: {
    height: 8,
    backgroundColor: Colors.cardBackground,
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
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  foodScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  foodItem: {
    backgroundColor: Colors.cardBackground,
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
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  foodNutrition: {
    fontSize: 10,
    fontFamily: 'Blockblueprint',
    color: '#16a085',
    marginBottom: 4,
  },
  foodCost: {
    fontSize: 10,
    fontFamily: 'Blockblueprint',
    color: '#f39c12',
  },
  actionsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 12,
    width: "100%"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLottie: {
    width: 200,
    height: 200,
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginTop: 20,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    backgroundColor: Colors.primary,
    padding: 8,
    borderRadius: 12,
    marginLeft: 12,
  },
  refreshText: {
    fontSize: 18,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
  },
  petIdText: {
    fontSize: 14,
    fontFamily: 'Blockblueprint',
    color: '#B0B0B0',
  },
}); 