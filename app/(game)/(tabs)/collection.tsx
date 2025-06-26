import GameAlert from '@/components/ui/GameAlert';
import { MintPetPrompt } from '@/components/ui/MintPetPrompt';
import { Colors, getRarityColor } from '@/constants/Colors';
import { walletManager } from '@/utils/wallet';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

interface MealNFT {
  id: string;
  meal_hash: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  vitamins: number;
  minerals: number;
  fiber: number;
  ipfs_image_uri: string;
  timestamp: number;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  grade: string;
}

interface PetCollectionItem {
  id: string;
  name: string;
  type: string;
  level: number;
  totalMeals: number;
  created_at: number;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
}

interface GameAlertState {
  visible: boolean;
  title: string;
  message: string;
  icon: string;
  buttons: Array<{
    text: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'success' | 'danger';
  }>;
}

export default function CollectionScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'meals' | 'pets'>('meals');
  const [mealNFTs, setMealNFTs] = useState<MealNFT[]>([]);
  const [petCollection, setPetCollection] = useState<PetCollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [gameAlert, setGameAlert] = useState<GameAlertState>({
    visible: false,
    title: '',
    message: '',
    icon: '🎮',
    buttons: []
  });

  useEffect(() => {
    loadCollectionData();
  }, []);

  const loadCollectionData = async () => {
    try {
      setIsLoading(true);
      
      // Load pet data from contract
      const petData = await walletManager.getPet();
      if (petData) {
        const petItem: PetCollectionItem = {
          id: petData.id?.toString() || '1',
          name: petData.name || 'Unknown Pet',
          type: petData.name || 'Dragon Pup',
          level: petData.level || 1,
          totalMeals: 0, // Will be updated from meals count
          created_at: Date.now(),
          rarity: getPetRarity(petData.level || 1)
        };
        setPetCollection([petItem]);

        // Load meal NFTs for this pet
        await loadMealNFTs(petData.id?.toString() || '1');
      }
    } catch (error) {
      console.error('Error loading collection data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMealNFTs = async (petId: string) => {
    try {
      console.log('Loading meals for pet ID:', petId);
      const mealsData = await walletManager.getMealsByPet(petId);
      console.log('Received meals data:', mealsData);
      
      if (mealsData && mealsData.length > 0) {
        // Parse the meals data from contract response
        const parsedMeals = parseMealsFromContract(mealsData);
        setMealNFTs(parsedMeals);
        
        // Update pet's total meals count
        setPetCollection(prev => prev.map(pet => ({
          ...pet,
          totalMeals: parsedMeals.length
        })));
      } else {
        setMealNFTs([]);
      }
    } catch (error) {
      console.error('Error loading meal NFTs:', error);
      setMealNFTs([]);
    }
  };

  const parseMealsFromContract = (contractData: any[]): MealNFT[] => {
    console.log('Parsing meals from contract data:', contractData);
    
    const meals: MealNFT[] = [];
    
    try {
      // The contract response appears to be a single meal with the following structure:
      // Based on the response, it looks like:
      // [0] = meal_id low (0x1)
      // [1] = meal_id high (0x0) 
      // [2] = pet_id low (0x1)
      // [3] = pet_id high (0x0)
      // [4] = meal_hash (0x71d20550e5d24d4a8400af96863b731b44365994776241c17b4f7ff867c5aae)
      // [5] = calories (0xb4 = 180)
      // [6] = protein (0x5 = 5)
      // [7] = carbs (0x50 = 80)
      // [8] = fats (0xf = 15)
      // [9] = vitamins (0x5 = 5)
      // [10] = minerals (0xa = 10)
      // [11] = fiber (0x2 = 2)
      // [12] = timestamp (0x2b = 43)
      // [13] = IPFS URI length (0x4)
      // [14] = IPFS timestamp (0x685c900b)
      // [15-19] = IPFS URI parts (hex encoded)

      if (contractData.length >= 15) {
        // Parse meal ID (u256)
        const mealIdLow = parseInt(contractData[0], 16);
        const mealIdHigh = parseInt(contractData[1], 16);
        const mealId = mealIdLow + (mealIdHigh << 128);

        // Parse meal hash (felt252)
        const mealHash = contractData[4];

        // Parse nutrition values
        const calories = parseInt(contractData[5], 16);
        const protein = parseInt(contractData[6], 16);
        const carbs = parseInt(contractData[7], 16);
        const fats = parseInt(contractData[8], 16);
        const vitamins = parseInt(contractData[9], 16);
        const minerals = parseInt(contractData[10], 16);
        const fiber = parseInt(contractData[11], 16);

        // Parse timestamp - the contract seems to return a relative timestamp
        // For now, use current time minus a reasonable offset based on the contract value
        const contractTimestamp = parseInt(contractData[12], 16);
        const timestamp = Date.now() - (contractTimestamp * 60 * 60 * 1000); // Assume contract timestamp is hours ago

        // Parse IPFS URI - it appears to be split across multiple hex values
        let ipfsUri = '';
        try {
          // Combine the IPFS URI parts (indices 15-19)
          const ipfsParts = contractData.slice(15, 20);
          for (const part of ipfsParts) {
            if (part && part !== '0x0') {
              // Convert hex to string
              const hexString = part.startsWith('0x') ? part.slice(2) : part;
              // Simple hex to string conversion for React Native
              let decoded = '';
              for (let i = 0; i < hexString.length; i += 2) {
                const hexPair = hexString.substr(i, 2);
                const charCode = parseInt(hexPair, 16);
                // Only add printable ASCII characters (32-126) to avoid corruption
                if (charCode >= 32 && charCode <= 126) {
                  decoded += String.fromCharCode(charCode);
                }
              }
              ipfsUri += decoded;
            }
          }
          
          // Clean up and validate the IPFS URI
          ipfsUri = ipfsUri.trim();
          
          // If the URI doesn't start with http, it might be malformed
          if (ipfsUri && !ipfsUri.startsWith('http')) {
            console.log('Invalid IPFS URI format:', ipfsUri);
            ipfsUri = '';
          }
          
        } catch (error) {
          console.log('Error parsing IPFS URI:', error);
          ipfsUri = '';
        }

        console.log('Parsed meal data:', {
          mealId,
          mealHash,
          calories,
          protein,
          carbs,
          fats,
          vitamins,
          minerals,
          fiber,
          timestamp,
          ipfsUri
        });

        const meal: MealNFT = {
          id: mealId.toString(),
          meal_hash: mealHash,
          calories: calories,
          protein: protein,
          carbs: carbs,
          fats: fats,
          vitamins: vitamins,
          minerals: minerals,
          fiber: fiber,
          ipfs_image_uri: ipfsUri,
          timestamp: timestamp,
          rarity: getMealRarity(calories),
          grade: getMealGrade(calories)
        };

        meals.push(meal);
      }
    } catch (error) {
      console.error('Error parsing meals:', error);
    }
    
    console.log('Parsed meals:', meals);
    return meals;
  };

  const getMealRarity = (calories: number): 'Common' | 'Rare' | 'Epic' | 'Legendary' => {
    if (calories >= 400) return 'Legendary';
    if (calories >= 300) return 'Epic';
    if (calories >= 200) return 'Rare';
    return 'Common';
  };

  const getMealGrade = (calories: number): string => {
    if (calories >= 400) return 'S';
    if (calories >= 300) return 'A';
    if (calories >= 200) return 'B';
    if (calories >= 100) return 'C';
    return 'D';
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCollectionData();
    setRefreshing(false);
  };

  const getPetRarity = (level: number): 'Common' | 'Rare' | 'Epic' | 'Legendary' => {
    if (level >= 20) return 'Legendary';
    if (level >= 10) return 'Epic';
    if (level >= 5) return 'Rare';
    return 'Common';
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  const handleMealNFTPress = (meal: MealNFT) => {
    setGameAlert({
      visible: true,
      title: `🍽️ Meal NFT #${meal.id}`,
      message: `Hash: ${meal.meal_hash.substring(0, 10)}...\nRarity: ${meal.rarity}\n\nNutrition Profile:\n• Calories: ${meal.calories}\n• Protein: ${meal.protein}%\n• Carbs: ${meal.carbs}%\n• Fats: ${meal.fats}%\n• Vitamins: ${meal.vitamins}%\n• Minerals: ${meal.minerals}%\n• Fiber: ${meal.fiber}%\n\nIPFS: ${meal.ipfs_image_uri ? 'Available' : 'Not available'}`,
      icon: '🏆',
      buttons: meal.ipfs_image_uri ? [
        { 
          text: 'View IPFS', 
          onPress: async () => {
            try {
              await Linking.openURL(meal.ipfs_image_uri);
              hideGameAlert();
            } catch (error) {
              console.log('Error opening IPFS URL:', error);
              // Show error message but keep alert open
            }
          },
          variant: 'primary' as const
        },
        { 
          text: 'Close', 
          onPress: hideGameAlert,
          variant: 'secondary' as const
        }
      ] : [
        { 
          text: 'Close', 
          onPress: hideGameAlert,
          variant: 'primary' as const
        }
      ]
    });
  };

  const renderMealNFTs = () => (
    <View style={styles.gridContainer}>
      {mealNFTs.length === 0 ? (
        <View style={styles.emptyState}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
            style={styles.glassEmptyCard}
          >
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyTitle}>No Meal NFTs Yet</Text>
            <Text style={styles.emptyDescription}>
              Start feeding your pet to collect meal NFTs!
            </Text>
            <TouchableOpacity 
              style={styles.glassEmptyButton}
              onPress={() => router.push('/(game)/(tabs)/scan')}
            >
              <LinearGradient
                colors={[Colors.primary, '#00A868']}
                style={styles.glassButtonGradient}
              >
                <Text style={styles.emptyButtonText}>📸 Scan Food</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Meal NFTs ({mealNFTs.length})</Text>
            <Text style={styles.sectionSubtitle}>Your feeding history</Text>
          </View>
          
          <View style={styles.mealGrid}>
            {mealNFTs.map((meal) => (
              <TouchableOpacity
                key={meal.id}
                style={styles.glassMealCard}
                onPress={() => handleMealNFTPress(meal)}
              >
                <LinearGradient
                  colors={[
                    'rgba(255, 255, 255, 0.15)',
                    'rgba(255, 255, 255, 0.05)',
                    'rgba(255, 255, 255, 0.1)'
                  ]}
                  style={styles.glassCardGradient}
                >
                  {/* Glow effect border */}
                  <View style={[styles.glowBorder, { 
                    shadowColor: getRarityColor(meal.rarity),
                    borderColor: getRarityColor(meal.rarity) 
                  }]} />
                  
                  {/* Rarity badge */}
                  <LinearGradient
                    colors={[getRarityColor(meal.rarity), `${getRarityColor(meal.rarity)}80`]}
                    style={styles.glassRarityBadge}
                  >
                    <Text style={styles.rarityText}>{meal.rarity}</Text>
                  </LinearGradient>
                  

                  
                  {/* Card content */}
                  <View style={styles.glassCardContent}>
                    <Text style={styles.glassMealName}>#{meal.id}</Text>
                    <Text style={styles.glassMealHash}>{meal.meal_hash.substring(0, 8)}...</Text>
                    
                    {/* Grade badge with glow */}
                    <View style={styles.glassGradeBadgeContainer}>
                      <LinearGradient
                        colors={[getGradeColor(meal.grade), `${getGradeColor(meal.grade)}80`]}
                        style={styles.glassGradeBadge}
                      >
                        <Text style={styles.gradeText}>{meal.grade}</Text>
                      </LinearGradient>
                    </View>
                    
                    {/* Stats with glass effect */}
                    <View style={styles.glassStatsContainer}>
                      <View style={styles.glassStat}>
                        <Text style={styles.glassStatEmoji}>🔥</Text>
                        <Text style={styles.glassStatValue}>{meal.calories}</Text>
                      </View>
                      <View style={styles.glassStat}>
                        <Text style={styles.glassStatEmoji}>💪</Text>
                        <Text style={styles.glassStatValue}>{meal.protein}%</Text>
                      </View>
                      <View style={styles.glassStat}>
                        <Text style={styles.glassStatEmoji}>🌾</Text>
                        <Text style={styles.glassStatValue}>{meal.carbs}%</Text>
                      </View>
                      
                    </View>
                  </View>
                  
                  {/* Shine effect */}
                  <LinearGradient
                    colors={['transparent', 'rgba(255, 255, 255, 0.3)', 'transparent']}
                    style={styles.cardShine}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );

  const renderPetCollection = () => (
    <View style={styles.petsContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Pet Collection</Text>
        <Text style={styles.sectionSubtitle}>Your beloved companions</Text>
      </View>
      
      {petCollection.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🐾</Text>
          <Text style={styles.emptyTitle}>No Pets Yet</Text>
          <Text style={styles.emptyDescription}>
            Mint your first pet to start your collection!
          </Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => router.push('/(game)/(tabs)/home')}
          >
            <Text style={styles.emptyButtonText}>🎮 Get Pet</Text>
          </TouchableOpacity>
        </View>
      ) : (
        petCollection.map((pet) => (
          <LinearGradient
          colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']} key={pet.id} style={styles.petCard}>
            <View style={styles.petHeader}>
              <View style={styles.petInfo}>
                <Text style={styles.petName}>{pet.name}</Text>
                <Text style={styles.petType}>{pet.type}</Text>
              </View>
              <View style={[
                styles.petRarity,
                { backgroundColor: getRarityColor(pet.rarity) }
              ]}>
                <Text style={styles.petRarityText}>{pet.rarity}</Text>
              </View>
            </View>
            
            <View style={styles.petStats}>
              <View style={styles.petStat}>
                <Text style={styles.petStatLabel}>Level</Text>
                <Text style={styles.petStatValue}>{pet.level}</Text>
              </View>
              <View style={styles.petStat}>
                <Text style={styles.petStatLabel}>Meals Fed</Text>
                <Text style={styles.petStatValue}>{pet.totalMeals}</Text>
              </View>
              <View style={styles.petStat}>
                <Text style={styles.petStatLabel}>Age</Text>
                <Text style={styles.petStatValue}>
                  {Math.floor((Date.now() - pet.created_at) / (1000 * 60 * 60 * 24))}d
                </Text>
              </View>
            </View>
          </LinearGradient>
        ))
      )}
    </View>
  );

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'S': return '#FFD700';
      case 'A': return '#32CD32';
      case 'B': return '#FFA500';
      case 'C': return '#FF6347';
      case 'D': return '#DC143C';
      case 'F': return '#8B0000';
      default: return Colors.textSecondary;
    }
  };

  const showGameAlert = (title: string, message: string, icon: string, buttons: GameAlertState['buttons']) => {
    setGameAlert({
      visible: true,
      title,
      message,
      icon,
      buttons
    });
  };

  const hideGameAlert = () => {
    setGameAlert(prev => ({ ...prev, visible: false }));
  };

  return (
    <MintPetPrompt>
      <View style={styles.wrapper}>
        <Image
          source={require('@/assets/images/bg_screen_2.png')}
          style={styles.backgroundImage}
          contentFit="cover"
        />
        <View style={styles.darkOverlay} />
        
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>My Collection</Text>
            <Text style={styles.subtitle}>NFTs, achievements & more</Text>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'meals' && styles.activeTab]}
              onPress={() => setActiveTab('meals')}
            >
              <Text style={[styles.tabText, activeTab === 'meals' && styles.activeTabText]}>
                🍽️ Meals
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'pets' && styles.activeTab]}
              onPress={() => setActiveTab('pets')}
            >
              <Text style={[styles.tabText, activeTab === 'pets' && styles.activeTabText]}>
                🐾 Pets
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.primary}
              />
            }
          >
            {activeTab === 'meals' && renderMealNFTs()}
            {activeTab === 'pets' && renderPetCollection()}
          </ScrollView>
        </View>

        <GameAlert
          visible={gameAlert.visible}
          title={gameAlert.title}
          message={gameAlert.message}
          icon={gameAlert.icon}
          iconType={gameAlert.icon === 'success' ? 'image' : 'emoji'}
          buttons={gameAlert.buttons}
          onClose={hideGameAlert}
        />
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Blockblueprint',
    color: Colors.primary,
    textAlign: 'center',
    lineHeight: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Blockblueprint',
    color: '#B0B0B0',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  
  // Common styles
  sectionHeader: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Blockblueprint',
    color: '#B0B0B0',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    fontFamily: 'Blockblueprint',
    color: '#B0B0B0',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
  },

  // Meal NFTs
  gridContainer: {
    paddingBottom: 20,
  },
  mealGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 10,
  },
  glassEmptyCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  glassEmptyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  glassButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  glassMealCard: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    marginBottom: 16,
    width: (width - 60) / 2,
    height: 'auto',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  glassCardGradient: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    overflow: 'hidden',
  },
  glowBorder: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderWidth: 2,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  glassRarityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  rarityText: {
    fontSize: 10,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  mealEmoji: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 8,
  },
  glassImageContainer: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  imageGlowWrapper: {
    flex: 1,
    borderRadius: 12,
    position: 'relative',
  },
  imageGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 16,
    opacity: 0.3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  glassMealImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  glassMealImagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  glassCardContent: {
    marginTop: 30,
    flex: 1,
    alignItems: 'center',
  },
  glassMealName: {
    fontSize: 16,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  glassMealHash: {
    fontSize: 12,
    fontFamily: 'Blockblueprint',
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: 8,
  },
  glassGradeBadgeContainer: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  glassGradeBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  gradeText: {
    fontSize: 14,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  glassStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    paddingHorizontal: 4,
    gap: 10
  },
  glassStat: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 35,
  },
  glassStatEmoji: {
    fontSize: 14,
    marginBottom: 2,
  },
  glassStatValue: {
    fontSize: 10,
    fontFamily: 'Blockblueprint',
    color: Colors.primary,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  glassMealTime: {
    fontSize: 10,
    fontFamily: 'Blockblueprint',
    color: '#8A8A8A',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    opacity: 0.6,
  },

  // Pet Collection
  petsContainer: {
    paddingBottom: 20,
  },
  petCard: {
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  petHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 20,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  petType: {
    fontSize: 14,
    fontFamily: 'Blockblueprint',
    color: Colors.primary,
  },
  petRarity: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  petRarityText: {
    fontSize: 12,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  petStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  petStat: {
    alignItems: 'center',
  },
  petStatLabel: {
    fontSize: 12,
    fontFamily: 'Blockblueprint',
    color: '#B0B0B0',
    marginBottom: 4,
  },
  petStatValue: {
    fontSize: 16,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
}); 