import { Colors, getRarityColor } from '@/constants/Colors';
import { walletManager } from '@/utils/wallet';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

interface MealNFT {
  id: number;
  foodName: string;
  emoji: string;
  energyValue: number;
  hungerValue: number;
  happinessValue: number;
  healthScore: number;
  timestamp: number;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  grade: string;
}

interface Achievement {
  id: number;
  title: string;
  description: string;
  emoji: string;
  isUnlocked: boolean;
  progress: number;
  maxProgress: number;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
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

// Mock data - in real implementation this would come from blockchain
const mockMealNFTs: MealNFT[] = [
  {
    id: 1,
    foodName: 'Grilled Salmon',
    emoji: '🍣',
    energyValue: 85,
    hungerValue: 90,
    happinessValue: 80,
    healthScore: 95,
    timestamp: Date.now() - 3600000,
    rarity: 'Legendary',
    grade: 'S'
  },
  {
    id: 2,
    foodName: 'Fresh Salad',
    emoji: '🥗',
    energyValue: 70,
    hungerValue: 60,
    happinessValue: 65,
    healthScore: 90,
    timestamp: Date.now() - 7200000,
    rarity: 'Epic',
    grade: 'A'
  },
  {
    id: 3,
    foodName: 'Pizza Slice',
    emoji: '🍕',
    energyValue: 60,
    hungerValue: 75,
    happinessValue: 85,
    healthScore: 40,
    timestamp: Date.now() - 86400000,
    rarity: 'Common',
    grade: 'C'
  },
];

const achievements: Achievement[] = [
  {
    id: 1,
    title: 'First Meal',
    description: 'Feed your pet for the first time',
    emoji: '🍽️',
    isUnlocked: true,
    progress: 1,
    maxProgress: 1,
    rarity: 'Common'
  },
  {
    id: 2,
    title: 'Healthy Eater',
    description: 'Feed your pet 10 healthy meals',
    emoji: '🥗',
    isUnlocked: false,
    progress: 3,
    maxProgress: 10,
    rarity: 'Rare'
  },
  {
    id: 3,
    title: 'Gourmet Chef',
    description: 'Collect 5 legendary meal NFTs',
    emoji: '👨‍🍳',
    isUnlocked: false,
    progress: 1,
    maxProgress: 5,
    rarity: 'Epic'
  },
  {
    id: 4,
    title: 'Pet Master',
    description: 'Reach level 10 with your pet',
    emoji: '🏆',
    isUnlocked: false,
    progress: 0,
    maxProgress: 1,
    rarity: 'Legendary'
  },
];

export default function CollectionScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'meals' | 'achievements' | 'pets'>('meals');
  const [mealNFTs, setMealNFTs] = useState<MealNFT[]>(mockMealNFTs);
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
          type: petData.pet_type || 'Dragon Pup',
          level: petData.level || 1,
          totalMeals: petData.total_meals || 0,
          created_at: petData.created_at || Date.now(),
          rarity: getPetRarity(petData.level || 1)
        };
        setPetCollection([petItem]);
      }
    } catch (error) {
      console.error('Error loading collection data:', error);
    } finally {
      setIsLoading(false);
    }
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
      `${meal.foodName} NFT`,
      `Grade: ${meal.grade}\nRarity: ${meal.rarity}\n\nNutrition Stats:\n• Energy: ${meal.energyValue}\n• Hunger: ${meal.hungerValue}\n• Happiness: ${meal.happinessValue}\n• Health: ${meal.healthScore}`,
      [{ text: 'OK' }]
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
                
                <Text style={styles.mealEmoji}>{meal.emoji}</Text>
                <Text style={styles.mealName}>{meal.foodName}</Text>
                
                <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(meal.grade) }]}>
                  <Text style={styles.gradeText}>{meal.grade}</Text>
                </View>
                
                <View style={styles.mealStats}>
                  <View style={styles.statMini}>
                    <Text style={styles.statMiniLabel}>⚡</Text>
                    <Text style={styles.statMiniValue}>{meal.energyValue}</Text>
                  </View>
                  <View style={styles.statMini}>
                    <Text style={styles.statMiniLabel}>🍽️</Text>
                    <Text style={styles.statMiniValue}>{meal.hungerValue}</Text>
                  </View>
                  <View style={styles.statMini}>
                    <Text style={styles.statMiniLabel}>😊</Text>
                    <Text style={styles.statMiniValue}>{meal.happinessValue}</Text>
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

  const renderAchievements = () => (
    <View style={styles.achievementsContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        <Text style={styles.sectionSubtitle}>Your progress milestones</Text>
      </View>
      
      {achievements.map((achievement) => (
        <View
          key={achievement.id}
          style={[
            styles.achievementCard,
            achievement.isUnlocked && styles.achievementUnlocked
          ]}
        >
          <View style={styles.achievementHeader}>
            <Text style={[
              styles.achievementEmoji,
              !achievement.isUnlocked && styles.achievementEmojiLocked
            ]}>
              {achievement.emoji}
            </Text>
            <View style={styles.achievementInfo}>
              <Text style={[
                styles.achievementTitle,
                !achievement.isUnlocked && styles.achievementTitleLocked
              ]}>
                {achievement.title}
              </Text>
              <Text style={styles.achievementDescription}>
                {achievement.description}
              </Text>
            </View>
            <View style={[
              styles.achievementRarity,
              { backgroundColor: getRarityColor(achievement.rarity) }
            ]}>
              <Text style={styles.achievementRarityText}>
                {achievement.rarity}
              </Text>
            </View>
          </View>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(achievement.progress / achievement.maxProgress) * 100}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {achievement.progress}/{achievement.maxProgress}
            </Text>
          </View>
        </View>
      ))}
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
            style={[styles.tab, activeTab === 'achievements' && styles.activeTab]}
            onPress={() => setActiveTab('achievements')}
          >
            <Text style={[styles.tabText, activeTab === 'achievements' && styles.activeTabText]}>
              🏆 Achievements
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
          {activeTab === 'achievements' && renderAchievements()}
          {activeTab === 'pets' && renderPetCollection()}
        </ScrollView>
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
    paddingHorizontal: 10,
    gap: 10,
  },
  mealCard: {
    width: (width - 60) / 2,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    position: 'relative',
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

  // Achievements
  achievementsContainer: {
    paddingBottom: 20,
  },
  achievementCard: {
    backgroundColor: Colors.cardBackground,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  achievementUnlocked: {
    borderColor: Colors.primary,
    backgroundColor: Colors.darkCard,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  achievementEmojiLocked: {
    opacity: 0.3,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  achievementTitleLocked: {
    color: '#8A8A8A',
  },
  achievementDescription: {
    fontSize: 12,
    fontFamily: 'Blockblueprint',
    color: '#B0B0B0',
    lineHeight: 16,
  },
  achievementRarity: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  achievementRarityText: {
    fontSize: 10,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Blockblueprint',
    color: '#B0B0B0',
    minWidth: 40,
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