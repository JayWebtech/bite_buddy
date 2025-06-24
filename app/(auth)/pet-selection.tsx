import { Colors, getRarityColor } from '@/constants/Colors';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Pet {
  id: number;
  name: string;
  type: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  image: any;
  stats: {
    hunger: number;
    happiness: number;
    energy: number;
  };
}

const pets: Pet[] = [
  {
    id: 1,
    name: 'Fluffy',
    type: 'Dragon Pup',
    rarity: 'Common',
    image: require('@/assets/images/pet-1.png'),
    stats: { hunger: 100, happiness: 80, energy: 90 }
  },
  {
    id: 2,
    name: 'Sparkle',
    type: 'Crystal Fox',
    rarity: 'Rare',
    image: require('@/assets/images/pet-2.png'),
    stats: { hunger: 90, happiness: 95, energy: 85 }
  },
  {
    id: 3,
    name: 'Thunder',
    type: 'Storm Wolf',
    rarity: 'Epic',
    image: require('@/assets/images/pet-3.png'),
    stats: { hunger: 85, happiness: 75, energy: 100 }
  },
  {
    id: 4,
    name: 'Mystic',
    type: 'Shadow Cat',
    rarity: 'Legendary',
    image: require('@/assets/images/pet-4.png'),
    stats: { hunger: 95, happiness: 90, energy: 95 }
  },
  {
    id: 5,
    name: 'Bubbles',
    type: 'Water Spirit',
    rarity: 'Rare',
    image: require('@/assets/images/pet-5.png'),
    stats: { hunger: 88, happiness: 92, energy: 87 }
  },
  {
    id: 6,
    name: 'Flame',
    type: 'Fire Phoenix',
    rarity: 'Epic',
    image: require('@/assets/images/pet-6.png'),
    stats: { hunger: 82, happiness: 85, energy: 98 }
  }
];

const AnimatedPet: React.FC<{ 
  pet: Pet; 
  isSelected: boolean; 
  onSelect: () => void;
}> = ({ pet, isSelected, onSelect }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous bounce animation to simulate breathing/life
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
    
    bounceAnimation.start();
    
    return () => bounceAnimation.stop();
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    onSelect();
  };



  return (
    <TouchableOpacity onPress={handlePress}>
      <Animated.View 
        style={[
          styles.petCard,
          isSelected && styles.petCardSelected,
          {
            transform: [
              { scale: scaleAnim },
              { translateY: bounceAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -5]
              })}
            ]
          }
        ]}
      >
        <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(pet.rarity) }]}>
          <Text style={styles.rarityText}>{pet.rarity}</Text>
        </View>
        
        <Image
          source={pet.image}
          style={styles.petImage}
          contentFit="contain"
        />
        
        <Text style={styles.petName}>{pet.name}</Text>
        <Text style={styles.petType}>{pet.type}</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>❤️</Text>
            <Text style={styles.statValue}>{pet.stats.happiness}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>🍽️</Text>
            <Text style={styles.statValue}>{pet.stats.hunger}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>⚡</Text>
            <Text style={styles.statValue}>{pet.stats.energy}</Text>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function PetSelectionScreen() {
  const router = useRouter();
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);

  const handleContinue = () => {
    if (selectedPet) {
      // Store selected pet and navigate to game
      router.push('/(game)/(tabs)/home');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Buddy</Text>
        <Text style={styles.subtitle}>
          Select your first NFT pet to start your journey
        </Text>
      </View>

      <ScrollView style={styles.petsContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.petsGrid}>
          {pets.map((pet) => (
            <AnimatedPet
              key={pet.id}
              pet={pet}
              isSelected={selectedPet?.id === pet.id}
              onSelect={() => setSelectedPet(pet)}
            />
          ))}
        </View>
      </ScrollView>

      {selectedPet && (
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedText}>
            You selected <Text style={styles.selectedName}>{selectedPet.name}</Text>
          </Text>
          <Text style={styles.selectedDescription}>
            A {selectedPet.rarity} {selectedPet.type} ready for adventure!
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.continueButton,
            !selectedPet && styles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={!selectedPet}
        >
          <Text style={[
            styles.continueButtonText,
            !selectedPet && styles.continueButtonTextDisabled
          ]}>
            Start Adventure
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontFamily: 'ClashDisplay-Bold',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'ClashDisplay-Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  petsContainer: {
    flex: 1,
  },
  petsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  petCard: {
    width: '48%',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  petCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.darkCard,
  },
  rarityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rarityText: {
    fontSize: 10,
    fontFamily: 'ClashDisplay-Medium',
    color: '#FFFFFF',
  },
  petImage: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  petName: {
    fontSize: 16,
    fontFamily: 'ClashDisplay-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  petType: {
    fontSize: 12,
    fontFamily: 'ClashDisplay-Regular',
    color: '#B0B0B0',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 12,
    fontFamily: 'ClashDisplay-Medium',
    color: '#FFFFFF',
  },
  selectedInfo: {
    backgroundColor: '#16213e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  selectedText: {
    fontSize: 16,
    fontFamily: 'ClashDisplay-Regular',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  selectedName: {
    fontFamily: 'ClashDisplay-Bold',
    color: '#667eea',
  },
  selectedDescription: {
    fontSize: 14,
    fontFamily: 'ClashDisplay-Regular',
    color: '#B0B0B0',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'ClashDisplay-Medium',
    color: '#667eea',
  },
  continueButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  continueButtonDisabled: {
    backgroundColor: '#2c3e50',
  },
  continueButtonText: {
    fontSize: 16,
    fontFamily: 'ClashDisplay-Medium',
    color: '#FFFFFF',
  },
  continueButtonTextDisabled: {
    color: '#7f8c8d',
  },
}); 