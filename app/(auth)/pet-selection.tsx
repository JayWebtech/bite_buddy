import GameButton from '@/components/ui/GameButton';
import { Colors, getRarityColor } from '@/constants/Colors';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import LottieView from 'lottie-react-native';
import React, { useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Pet {
  id: number;
  name: string;
  type: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  lottieFile: any; // Main Lottie animation file
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
    lottieFile: require('@/assets/animations/lottie-1.json'),
    stats: { hunger: 75, happiness: 80, energy: 90 }
  },
  {
    id: 2,
    name: 'Sparkle',
    type: 'Crystal Fox',
    rarity: 'Rare',
    lottieFile: require('@/assets/animations/lottie-2.json'),
    stats: { hunger: 85, happiness: 85, energy: 80 }
  },
  {
    id: 3,
    name: 'Thunder',
    type: 'Storm Wolf',
    rarity: 'Epic',
    lottieFile: require('@/assets/animations/lottie-3.json'),
    stats: { hunger: 90, happiness: 75, energy: 95 }
  },
  {
    id: 4,
    name: 'Mystic',
    type: 'Shadow Cat',
    rarity: 'Legendary',
    lottieFile: require('@/assets/animations/lottie-4.json'),
    stats: { hunger: 95, happiness: 100, energy: 95 }
  }
];

const InteractivePet: React.FC<{ 
  pet: Pet; 
  isSelected: boolean; 
  onSelect: () => void;
}> = ({ pet, isSelected, onSelect }) => {
  const lottieRef = useRef<LottieView>(null);
  const cardScaleAnim = useRef(new Animated.Value(1)).current;
  const [isInteracting, setIsInteracting] = useState(false);

  // Handle pet interaction
  const handlePetTap = () => {
    setIsInteracting(true);
    
    // Card press animation
    Animated.sequence([
      Animated.timing(cardScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(cardScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Trigger tap animation
    if (lottieRef.current) {
      lottieRef.current.reset();
      lottieRef.current.play();
    }

    // Reset interaction state
    setTimeout(() => {
      setIsInteracting(false);
    }, 2000);

    onSelect();
  };

  const handlePetPress = () => {
    // Different interaction - like petting
    if (lottieRef.current) {
      lottieRef.current.reset();
      lottieRef.current.play(0, 50); // Play specific frames for petting animation
    }
  };

  const handlePetLongPress = () => {
    // Another interaction - like feeding
    if (lottieRef.current) {
      lottieRef.current.reset();
      lottieRef.current.play();
    }
  };

  return (
    <TouchableOpacity 
      onPress={handlePetTap}
      onLongPress={handlePetLongPress}
      delayLongPress={500}
      activeOpacity={0.9}
    >
      <Animated.View 
        style={[
          styles.petCard,
          isSelected && styles.petCardSelected,
          {
            transform: [{ scale: cardScaleAnim }],
            borderColor: isSelected ? Colors.primary : 'transparent',
          }
        ]}
      >
        <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(pet.rarity) }]}>
          <Text style={styles.rarityText}>{pet.rarity}</Text>
        </View>
        
        {/* Interactive Lottie Pet */}
        <View style={styles.petContainer}>
          <LottieView
            ref={lottieRef}
            source={pet.lottieFile}
            style={styles.petLottie}
            autoPlay
            loop={!isInteracting} // Stop looping during interactions
            speed={1}
          />
          
          {/* Touch zones for different interactions */}
          <TouchableOpacity 
            style={styles.headTouchZone}
            onPress={handlePetPress}
            activeOpacity={0.7}
          />
          
          {/* Interaction feedback */}
          {isInteracting && (
            <View style={styles.interactionFeedback}>
              <Text style={styles.interactionText}>👋</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.petName}>{pet.name}</Text>
        <Text style={styles.petType}>{pet.type}</Text>
        
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function PetSelectionScreen() {
  const router = useRouter();
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);

  const handleContinue = async () => {
    if (selectedPet) {
      await SecureStore.setItemAsync("pet_type", JSON.stringify(selectedPet));
      router.push('/(auth)/wallet-setup');
    }
  };

  return (
    <View style={styles.wrapper}>
      <Image
        source={require('@/assets/images/bg_screen_2.png')}
        style={styles.backgroundImage}
        contentFit="cover"
      />
      
      {/* Dark overlay */}
      <View style={styles.darkOverlay} />
      
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Buddy</Text>
          <Text style={styles.subtitle}>
            Select your NFT pet companion
          </Text>
        </View>

        <ScrollView style={styles.petsContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.petsGrid}>
            {pets.map((pet) => (
              <InteractivePet
                key={pet.id}
                pet={pet}
                isSelected={selectedPet?.id === pet.id}
                onSelect={() => setSelectedPet(pet)}
              />
            ))}
          </View>
        </ScrollView>

        {selectedPet && (
          <View style={styles.footer}>
            <GameButton
              title={`Continue with ${selectedPet.name}`}
              onPress={handleContinue}
              variant='primary'
            />
          </View>
        )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 16,
    paddingTop: 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 36,
    fontFamily: 'Blockblueprint',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
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
    paddingBottom: 20,
    gap: 12,
  },
  petCard: {
    flex: 1,
    minWidth: '48%',
    maxWidth: '100%',
    backgroundColor: Colors.primaryDark,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  petCardSelected: {
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    elevation: 8,
  },
  rarityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  rarityText: {
    fontSize: 10,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  petContainer: {
    position: 'relative',
    width: '100%',
    height: 100,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  petLottie: {
    width: '100%',
    height: 100,
  },
  headTouchZone: {
    position: 'absolute',
    top: 0,
    left: '25%',
    width: '50%',
    height: '50%',
    backgroundColor: 'transparent',
  },
  interactionFeedback: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  interactionText: {
    fontSize: 16,
  },
  petName: {
    fontSize: 16,
    fontFamily: 'Blockblueprint',
    color: Colors.text,
    marginBottom: 2,
    textAlign: 'center',
  },
  petType: {
    fontSize: 10,
    fontFamily: 'Blockblueprint',
    color: Colors.textSecondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  stat: {
    alignItems: 'center',
    padding: 2,
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 1,
  },
  statValue: {
    fontSize: 10,
    fontFamily: 'Blockblueprint',
    color: Colors.text,
    fontWeight: 'bold',
  },
  interactionHint: {
    fontSize: 7,
    fontFamily: 'Blockblueprint',
    color: Colors.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 10,
  },
  footer: {
    paddingVertical: 20,
  },
  continueButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonText: {
    fontSize: 18,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
  },
}); 