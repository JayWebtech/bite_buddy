import { MintPetPrompt } from '@/components/ui/MintPetPrompt';
import { Colors, getRarityColor } from '@/constants/Colors';
import { walletManager } from '@/utils/wallet';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

export default function CollectionScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'meals' | 'pets'>('meals');
  const [mealNFTs, setMealNFTs] = useState<MealNFT[]>([]);
  const [petCollection, setPetCollection] = useState<PetCollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

        // Parse timestamp
        const timestamp = parseInt(contractData[12], 16) * 1000; // Convert to milliseconds

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
                if (charCode > 0) { // Only add valid characters
                  decoded += String.fromCharCode(charCode);
                }
              }
              ipfsUri += decoded;
            }
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
    Alert.alert(
      `Meal NFT #${meal.id}`,
      `Hash: ${meal.meal_hash.substring(0, 10)}...\nRarity: ${meal.rarity}\n\nNutrition Profile:\n• Calories: ${meal.calories}\n• Protein: ${meal.protein}%\n• Carbs: ${meal.carbs}%\n• Fats: ${meal.fats}%\n• Vitamins: ${meal.vitamins}%\n• Minerals: ${meal.minerals}%\n• Fiber: ${meal.fiber}%\n\nIPFS: ${meal.ipfs_image_uri ? 'Available' : 'Not available'}`,
      [
        { text: 'View on IPFS', onPress: () => meal.ipfs_image_uri && console.log('Open IPFS:', meal.ipfs_image_uri) },
        { text: 'OK' }
      ]
    );
  };

  const renderMealNFTs = () => (
    <View style={styles.gridContainer}>
      {mealNFTs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🍽️</Text>
          <Text style={styles.emptyTitle}>No Meal NFTs Yet</Text>
          <Text style={styles.emptyDescription}>
            Start feeding your pet to collect meal NFTs!
          </Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => router.push('/(game)/(tabs)/scan')}
          >
            <Text style={styles.emptyButtonText}>📸 Scan Food</Text>
          </TouchableOpacity>
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
                style={[styles.mealCard, { borderColor: getRarityColor(meal.rarity) }]}
                onPress={() => handleMealNFTPress(meal)}
              >
                <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(meal.rarity) }]}>
                  <Text style={styles.rarityText}>{meal.rarity}</Text>
                </View>
                
                {meal.ipfs_image_uri ? (
                  <Image
                    source={{ uri: meal.ipfs_image_uri }}
                    style={styles.mealImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.mealImagePlaceholder}>
                    <Text style={styles.mealEmoji}>🍽️</Text>
                  </View>
                )}
                
                <Text style={styles.mealName}>#{meal.id}</Text>
                <Text style={styles.mealHash}>{meal.meal_hash.substring(0, 8)}...</Text>
                
                <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(meal.grade) }]}>
                  <Text style={styles.gradeText}>{meal.grade}</Text>
                </View>
                
                <View style={styles.mealStats}>
                  <View style={styles.statMini}>
                    <Text style={styles.statMiniLabel}>🔥</Text>
                    <Text style={styles.statMiniValue}>{meal.calories}</Text>
                  </View>
                  <View style={styles.statMini}>
                    <Text style={styles.statMiniLabel}>💪</Text>
                    <Text style={styles.statMiniValue}>{meal.protein}%</Text>
                  </View>
                  <View style={styles.statMini}>
                    <Text style={styles.statMiniLabel}>🌾</Text>
                    <Text style={styles.statMiniValue}>{meal.carbs}%</Text>
                  </View>
                  <View style={styles.statMini}>
                    <Text style={styles.statMiniLabel}>🥑</Text>
                    <Text style={styles.statMiniValue}>{meal.fats}%</Text>
                  </View>
                </View>
                
                <Text style={styles.mealTime}>{formatTimeAgo(meal.timestamp)}</Text>
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
          <View key={pet.id} style={styles.petCard}>
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
          </View>
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
    backgroundColor: Colors.cardBackground,
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
  mealCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 2,
    position: 'relative',
    width: (width - 60) / 2,
    height: 220, // Fixed height to accommodate image
  },
  rarityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
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
  mealName: {
    fontSize: 14,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    minHeight: 32,
  },
  mealHash: {
    fontSize: 14,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  gradeBadge: {
    alignSelf: 'center',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gradeText: {
    fontSize: 12,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  mealStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  statMini: {
    alignItems: 'center',
  },
  statMiniLabel: {
    fontSize: 12,
  },
  statMiniValue: {
    fontSize: 10,
    fontFamily: 'Blockblueprint',
    color: Colors.primary,
    fontWeight: 'bold',
  },
  mealTime: {
    fontSize: 10,
    fontFamily: 'Blockblueprint',
    color: '#8A8A8A',
    textAlign: 'center',
  },
  mealImage: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  mealImagePlaceholder: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.darkCard,
    marginBottom: 8,
  },

  // Pet Collection
  petsContainer: {
    paddingBottom: 20,
  },
  petCard: {
    backgroundColor: Colors.cardBackground,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
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