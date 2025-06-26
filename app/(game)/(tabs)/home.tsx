import GameAlert from '@/components/ui/GameAlert';
import GameButton from '@/components/ui/GameButton';
import { MintPetPrompt } from '@/components/ui/MintPetPrompt';
import { Colors, getStatColor } from '@/constants/Colors';
import { GameAudio } from '@/utils/soundManager';
import { walletManager } from '@/utils/wallet';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PetStats {
  health: number;
  energy: number;
  nutrition_score: number;
  level: number;
  experience: number;
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

// Pet data mapping based on species from contract
const petAnimationMap: { [key: number]: any } = {
  1: require('@/assets/animations/lottie-1.json'), // SPECIES_VEGGIE_FLUFFY
  2: require('@/assets/animations/lottie-2.json'), // SPECIES_PROTEIN_SPARKLE
  3: require('@/assets/animations/lottie-3.json'), // SPECIES_BALANCE_THUNDER
  4: require('@/assets/animations/lottie-4.json'), // SPECIES_BALANCE_MYSTIC
};

const petTypeMap: { [key: number]: string } = {
  1: 'Veggie Dragon Pup',
  2: 'Protein Crystal Fox',
  3: 'Balance Storm Wolf', 
  4: 'Balance Shadow Cat',
};

const InteractivePet: React.FC<{
  stats: PetStats;
  onFeed: (energyGain: number) => void;
  onPet: () => void;
  onPlay: () => void;
  petName: string;
  petType?: string;
  petSpecies: number;
}> = ({ stats, onFeed, onPet, onPlay, petName, petType, petSpecies }) => {
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
    
    // Play pet happy sound
    GameAudio.petHappy();
    
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
    
    // Play pet happy sound for playing interaction
    GameAudio.petHappy();
    
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
    
    // Play pet eating sound
    GameAudio.petEating();
    
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
                      source={petAnimationMap[petSpecies] || require('@/assets/animations/lottie-1.json')} // Dynamic pet animation
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
    health: 100,
    energy: 50,
    nutrition_score: 0,
    level: 1,
    experience: 0
  });
  const [petData, setPetData] = useState<ContractPet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [petName, setPetName] = useState('Fluffy');
  const [petType, setPetType] = useState('Dragon Pup');
  const [petSpecies, setPetSpecies] = useState<number>(1);
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



  // Fetch pet data from contract
  const fetchPetData = async () => {
    try {
      setIsLoading(true);
      const contractPetData = await walletManager.getPet();

      console.log("contractPetData", contractPetData)
      
      if (contractPetData) {
        // contractPetData is now a parsed PetData object from walletManager
        const pet: ContractPet = {
          id: contractPetData.id,
          owner: '', // Not needed for display
          pet_type: contractPetData.name,
          name: contractPetData.name,
          level: contractPetData.level,
          xp: contractPetData.experience, // Use experience from contract
          energy: contractPetData.energy,
          hunger: Math.max(0, 100 - contractPetData.energy), // Calculate hunger from energy
          happiness: Math.min(100, contractPetData.health + contractPetData.energy) / 2, // Calculate happiness from health + energy
          last_fed: 0, // Not available in simplified format
          total_meals: 0, // Not available in simplified format
          created_at: 0, // Not available in simplified format
        };

        setPetData(pet);
        
        // Update local stats with contract data
        setPetStats({
          health: contractPetData.health,
          energy: contractPetData.energy,
          nutrition_score: contractPetData.nutrition_score,
          level: contractPetData.level,
          experience: contractPetData.experience
        });

        setPetName(pet.name);
        setPetType(pet.pet_type);
        setPetSpecies(contractPetData.type);
      } else {
        // No pet found - show default values
        console.log('No pet data returned from contract');
        setShowAlert({
          visible: true,
          title: 'No Pet Found',
          message: 'You need to mint a pet first. Check your wallet setup or mint a new pet.',
          icon: 'error'
        });
      }
    } catch (error) {
      console.log('Error fetching pet data:', error);
      
      setShowAlert({
        visible: true,
        title: 'Error',
        message: 'Could not load pet data. Please check your connection and try again.',
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
      health: Math.min(100, prev.health + (food.nutritionScore / 4)),
      energy: Math.min(100, prev.energy + food.energyGain),
      nutrition_score: prev.nutrition_score + food.nutritionScore,
      experience: prev.experience + food.nutritionScore,
    }));

    setCoins(prev => prev - food.cost);

    setShowAlert({
      visible: true,
      title: 'Yummy!',
      message: `${petName} enjoyed the ${food.name}!`,
      icon: 'success'
    });
  };

  const handlePetInteraction = (energyGain: number) => {
    setPetStats(prev => ({
      ...prev,
      health: Math.min(100, prev.health + energyGain / 2),
      experience: prev.experience + 5,
    }));
  };

  const handlePetPetting = () => {
    setPetStats(prev => ({
      ...prev,
      health: Math.min(100, prev.health + 8),
      experience: prev.experience + 3,
    }));
  };

  const handlePetPlaying = () => {
    setPetStats(prev => ({
      ...prev,
      health: Math.min(100, prev.health + 12),
      experience: prev.experience + 8,
    }));
  };

  // Refresh button handler
  const handleRefresh = () => {
    // Play button press sound
    GameAudio.buttonPress();
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
            source={petAnimationMap[petSpecies] || require('@/assets/animations/lottie-1.json')}
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
              <Text style={styles.xpText}>XP: {petStats.experience}/{(petStats.level * 100)}</Text>
              {petData && (
                <Text style={styles.petIdText}>Pet ID: #{petData.id}</Text>
              )}
            </View>
            <View style={styles.headerRight}>
              <View style={styles.coinsContainer}>
                <TouchableOpacity style={styles.refreshButton}  onPress={handleRefresh}>
                  <Ionicons name="refresh" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
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
            petSpecies={petSpecies}
          />

          {/* Stats */}
          <View style={styles.statsSection}>
            <StatBar label="Health" value={petStats.health} emoji="❤️" />
            <StatBar label="Energy" value={petStats.energy} emoji="⚡" />
            <StatBar label="Nutrition" value={Math.min(100, petStats.nutrition_score / 10)} emoji="🍽️" />
          </View>

          {/* Food Items */}
          {/* <View style={styles.foodSection}>
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
          </View> */}

          {/* Action Buttons */}
          <View style={styles.actionsSection}>
            <GameButton
              title='Scan meal'
              variant='primary'
              onPress={() => router.push('/(game)/(tabs)/scan')}
              style={styles.actionButton}
            />

            <GameButton
              title='Go to battle'
              variant='success'
              onPress={() => router.push('/(game)/(tabs)/battle')}
              style={styles.actionButton}
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
    color: '#FFFFFF',
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
  actionButton: {
    flex: 1,
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