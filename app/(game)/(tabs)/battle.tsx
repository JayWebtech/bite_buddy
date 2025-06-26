import GameAlert from '@/components/ui/GameAlert';
import GameButton from '@/components/ui/GameButton';
import { MintPetPrompt } from '@/components/ui/MintPetPrompt';
import { Colors } from '@/constants/Colors';
import { walletManager } from '@/utils/wallet';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

interface Opponent {
  id: number;
  name: string;
  level: number;
  image: any;
  webImage?: string;
  stats: {
    health: number;
    attack: number;
    defense: number;
  };
  reward: number;
  petId?: string;
}

interface BattleCard {
  id: number;
  name: string;
  type: 'attack' | 'defense' | 'special';
  power: number;
  energyCost: number;
  description: string;
  emoji: string;
  cardIndex: number;
}

interface PlayerPet {
  id: string;
  name: string;
  level: number;
  health: number;
  energy: number;
  maxHealth: number;
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

// Random pet images for computer opponents from web
const randomPetImages = [
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&h=400&fit=crop', // Orange cat
  'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=400&fit=crop', // Golden retriever
  'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400&h=400&fit=crop', // Cute cat
  'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=400&h=400&fit=crop', // Husky dog
  'https://images.unsplash.com/photo-1596492784531-6e4eb5ea9993?w=400&h=400&fit=crop', // Fluffy cat
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop', // Puppy
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=400&fit=crop', // White cat
  'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=400&h=400&fit=crop', // Brown dog
  'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400&h=400&fit=crop', // Maine coon cat
  'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=400&fit=crop', // Corgi
];

// User pet animations
const userPetAnimations = [
  require('@/assets/animations/lottie-1.json'),
  require('@/assets/animations/lottie-2.json'),
  require('@/assets/animations/lottie-3.json'),
  require('@/assets/animations/lottie-4.json'),
];

// Utility functions
const getRandomPetImage = () => {
  return randomPetImages[Math.floor(Math.random() * randomPetImages.length)];
};

const getOpponentPetImage = (opponentId: number) => {
  // Use deterministic selection based on opponent ID
  const index = (opponentId - 1) % randomPetImages.length;
  return randomPetImages[index];
};

const getUserPetAnimation = (petId?: string) => {
  // Use pet ID to deterministically select animation, or default to first one
  const index = petId ? parseInt(petId) % userPetAnimations.length : 0;
  return userPetAnimations[index];
};

// Removed static opponents array - now using only contract opponents

const battleCards: BattleCard[] = [
  { id: 1, name: 'Quick Strike', type: 'attack', power: 30, energyCost: 20, description: 'Fast attack', emoji: '⚡', cardIndex: 0 },
  { id: 2, name: 'Power Slam', type: 'attack', power: 50, energyCost: 35, description: 'Heavy damage', emoji: '💥', cardIndex: 1 },
  { id: 3, name: 'Shield Up', type: 'defense', power: 25, energyCost: 15, description: 'Block damage', emoji: '🛡️', cardIndex: 2 },
  { id: 4, name: 'Heal', type: 'special', power: 40, energyCost: 30, description: 'Restore health', emoji: '❤️', cardIndex: 3 },
  { id: 5, name: 'Energy Boost', type: 'special', power: 50, energyCost: 10, description: 'Gain energy', emoji: '⭐', cardIndex: 4 },
];

export default function BattleScreen() {
  const router = useRouter();
  const [selectedOpponent, setSelectedOpponent] = useState<Opponent | null>(null);
  const [playerPet, setPlayerPet] = useState<PlayerPet | null>(null);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [playerEnergy, setPlayerEnergy] = useState(100);
  const [opponentHealth, setOpponentHealth] = useState(100);
  const [inBattle, setInBattle] = useState(false);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [currentBattleId, setCurrentBattleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [contractOpponents, setContractOpponents] = useState<{[key: number]: any}>({});
  const [storedMoves, setStoredMoves] = useState<number[]>([]);
  const [loadingOpponents, setLoadingOpponents] = useState(true);
  const [processingMove, setProcessingMove] = useState(false);
  const [submittingBattle, setSubmittingBattle] = useState(false);
  const [gameAlert, setGameAlert] = useState<GameAlertState>({
    visible: false,
    title: '',
    message: '',
    icon: '🎮',
    buttons: []
  });
  
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadPlayerPet();
    loadComputerOpponents();
  }, []);

  const loadComputerOpponents = async () => {
    try {
      setLoadingOpponents(true);
      // Load real computer opponents from contract
      const loadedOpponents: {[key: number]: any} = {};
      
      for (let i = 1; i <= 3; i++) {
        const opponent = await walletManager.getComputerOpponent(i);
        if (opponent && opponent.id !== '0x0' && opponent.health > 0) {
          loadedOpponents[i] = opponent;
          console.log(`✅ Contract opponent ${i} loaded:`, opponent);
        } else {
          console.log(`⚠️ Contract opponent ${i} not initialized`);
        }
      }
      
      setContractOpponents(loadedOpponents);
    } catch (error) {
      console.error('Error loading computer opponents:', error);
    } finally {
      setLoadingOpponents(false);
    }
  };

  // Create opponents from contract data only
  const getContractOpponents = (): Opponent[] => {
    const contractOpponentsList: Opponent[] = [];
    
    Object.entries(contractOpponents).forEach(([key, contractData]) => {
      const opponentId = parseInt(key);
      if (contractData && contractData.health > 0) {
        contractOpponentsList.push({
          id: opponentId,
          name: contractData.name,
          level: contractData.level,
          image: require('@/assets/images/pet-2.png'), // Default image
          webImage: getOpponentPetImage(opponentId),
          stats: {
            health: contractData.health,
            attack: Math.floor(contractData.health / 4), // Derive attack from health
            defense: Math.floor(contractData.health / 6), // Derive defense from health
          },
          reward: 50 + (contractData.level * 25), // Level-based rewards
          petId: contractData.id
        });
      }
    });
    
    return contractOpponentsList;
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

  const loadPlayerPet = async () => {
    try {
      const petData = await walletManager.getPet();
      if (petData) {
        setPlayerPet({
          id: petData.id,
          name: petData.name,
          level: petData.level,
          health: petData.health,
          energy: petData.energy,
          maxHealth: 100
        });
        setPlayerHealth(petData.health);
        setPlayerEnergy(petData.energy);
      }
    } catch (error) {
      console.error('Error loading player pet:', error);
    }
  };

  const startBattle = async (opponent: Opponent) => {
    if (!playerPet) {
      showGameAlert(
        'No Pet Available',
        'You need a pet to battle! Please mint your pet first.',
        '🐾',
        [{ text: 'OK', onPress: hideGameAlert, variant: 'primary' }]
      );
      return;
    }

    if (playerPet.energy < 20) {
      showGameAlert(
        'Insufficient Energy',
        'Your pet needs at least 20 energy to battle. Feed your pet to restore energy!',
        '⚡',
        [
          { text: 'Feed Pet', onPress: () => router.push('/(game)/(tabs)/scan'), variant: 'primary' },
          { text: 'Cancel', onPress: hideGameAlert, variant: 'secondary' }
        ]
      );
      return;
    }

    // Calculate win probability to show player
    const playerPower = calculateBattlePower(playerPet);
    const opponentPower = calculateBattlePower(opponent);
    const winChance = calculateWinProbability(playerPower, opponentPower, playerPet.level);
    
    // Show battle preview
    showGameAlert(
      '⚔️ Battle Preview',
      `${playerPet.name} vs ${opponent.name}\n\n` +
      `Your Power: ${playerPower}\n` +
      `Opponent Power: ${opponentPower}\n` +
      `Win Chance: ${winChance}%\n\n` +
      `Energy Cost: 20\n` +
      `Potential Reward: ${opponent.reward} coins`,
      '🎯',
      [
        { text: 'Start', onPress: () => { 
          confirmBattle(opponent)
        }, variant: 'success' },
        { text: 'Cancel', onPress: hideGameAlert, variant: 'secondary' }
      ]
    );
  };

  const calculateBattlePower = (pet: PlayerPet | Opponent) => {
    if ('stats' in pet) {
      // Opponent calculation
      const level = pet.level;
      const basePower = level * 10;
      const healthBonus = Math.floor(pet.stats.health / 10);
      const attackBonus = Math.floor(pet.stats.attack / 5);
      const defenseBonus = Math.floor(pet.stats.defense / 5);
      return basePower + healthBonus + attackBonus + defenseBonus;
    } else {
      // Player pet calculation  
      const basePower = pet.level * 10;
      const nutritionPower = Math.floor((pet.id ? parseInt(pet.id) * 50 : 100) / 20); // Mock nutrition score
      const experiencePower = Math.floor((pet.level * pet.level * 100) / 200);
      const mealPower = 5; // Mock well-fed bonus
      return basePower + nutritionPower + experiencePower + mealPower;
    }
  };

  const calculateWinProbability = (playerPower: number, opponentPower: number, playerLevel: number) => {
    // Apply dynamic difficulty scaling
    let adjustedPlayerPower = playerPower;
    let adjustedOpponentPower = opponentPower;
    
    if (playerLevel <= 2) {
      adjustedPlayerPower = Math.floor(playerPower * 1.2);
      adjustedOpponentPower = Math.floor(opponentPower * 0.85);
    } else if (playerLevel <= 5) {
      adjustedPlayerPower = Math.floor(playerPower * 1.1);
      adjustedOpponentPower = Math.floor(opponentPower * 0.95);
    }
    
    const totalPower = adjustedPlayerPower + adjustedOpponentPower;
    if (totalPower === 0) return 50;
    
    const rawPercentage = Math.floor((adjustedPlayerPower * 100) / totalPower);
    
    // Clamp between 15% and 85%
    return Math.max(15, Math.min(85, rawPercentage));
  };

  const confirmBattle = async (opponent: Opponent) => {
    hideGameAlert();
    
    try {
      setIsLoading(true);
      const battleId = await initiateBattleContract(playerPet!.id, opponent!.id.toString() || '2');
      
      if (battleId) {
        setCurrentBattleId(battleId);
        setSelectedOpponent(opponent);
        setPlayerHealth(playerPet!.health);
        setPlayerEnergy(playerPet!.energy);
        setOpponentHealth(opponent.stats.health);
        setInBattle(true);
        setBattleLog([
          `Battle started against ${opponent.name}!`, 
          `Battle ID: ${battleId}`,
          `Win probability calculated: ${calculateWinProbability(
            calculateBattlePower(playerPet!), 
            calculateBattlePower(opponent), 
            playerPet!.level
          )}%`
        ]);
        setIsPlayerTurn(true);
        
        showGameAlert(
          '⚔️ Battle Started!',
          `Your ${playerPet!.name} is now battling ${opponent.name}!\n\nMay the best pet win!`,
          '🏟️',
          [{ text: 'Fight!', onPress: hideGameAlert, variant: 'success' }]
        );
      }
    } catch (error) {
      console.error('Error starting battle:', error);
      showGameAlert(
        'Battle Failed',
        'Could not start the battle. Please try again later.',
        '❌',
        [{ text: 'OK', onPress: hideGameAlert, variant: 'primary' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const initiateBattleContract = async (challengerPetId: string, defenderPetId: string): Promise<string | null> => {
    try {
      console.log(`Initiating battle: ${challengerPetId} vs Computer Opponent ${defenderPetId}`);
      
      // Convert defender pet ID to opponent ID (1, 2, 3)
      console.log("defenderPetId", defenderPetId);
      const opponentId = parseInt(defenderPetId);
      
      const battleId = await walletManager.initiateBattleVsComputer(challengerPetId, opponentId);
      
      if (battleId) {
        console.log('Battle initiated with ID:', battleId);
        return battleId;
      }
      
      return null;
    } catch (error) {
      console.error('Contract battle initiation failed:', error);
      return null;
    }
  };

  const useCard = async (card: BattleCard) => {
    if (playerEnergy < card.energyCost) {
      showGameAlert(
        'Not Enough Energy!',
        `You need ${card.energyCost} energy to use ${card.name}. Current energy: ${playerEnergy}`,
        '⚡',
        [{ text: 'OK', onPress: hideGameAlert, variant: 'primary' }]
      );
      return;
    }

    if (!currentBattleId) {
      console.error('No battle ID available for move execution');
      return;
    }

    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // Set processing state
    setProcessingMove(true);

    // Store move locally instead of submitting to contract immediately
    setStoredMoves(prev => [...prev, card.cardIndex]);
    setPlayerEnergy(prev => prev - card.energyCost);
    
    let logMessage = '';
    
    // Calculate local effects for immediate feedback
    switch (card.type) {
      case 'attack':
        const damage = Math.max(1, card.power - (selectedOpponent?.stats.defense || 0));
        setOpponentHealth(prev => Math.max(0, prev - damage));
        logMessage = `You used ${card.name} and dealt ${damage} damage!`;
        
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
        break;
        
      case 'defense':
        logMessage = `You used ${card.name} and increased your defense!`;
        break;
        
      case 'special':
        if (card.name === 'Heal') {
          const healAmount = Math.min(card.power, (playerPet?.maxHealth || 100) - playerHealth);
          setPlayerHealth(prev => Math.min(playerPet?.maxHealth || 100, prev + healAmount));
          logMessage = `You used ${card.name} and restored ${healAmount} health!`;
        } else if (card.name === 'Energy Boost') {
          const energyGain = Math.min(card.power, 100 - playerEnergy);
          setPlayerEnergy(prev => Math.min(100, prev + energyGain));
          logMessage = `You used ${card.name} and gained ${energyGain} energy!`;
        }
        break;
    }
    
    // Simulate processing time
    setTimeout(() => {
      // Add move to battle log
      setBattleLog(prev => [...prev, `${logMessage} (Move stored locally)`]);
      
      setProcessingMove(false);
      
      // Continue with AI turn
      setIsPlayerTurn(false);
      setTimeout(() => {
        aiTurn();
      }, 1500);
    }, 800); // 800ms processing time
  };

  const aiTurn = () => {
    if (!selectedOpponent) return;
    
    // Add haptic feedback for AI move
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    const damage = Math.max(1, selectedOpponent.stats.attack - 10);
    setPlayerHealth(prev => Math.max(0, prev - damage));
    
    setBattleLog(prev => [...prev, `${selectedOpponent.name} attacks for ${damage} damage!`]);
    setIsPlayerTurn(true);
    
    setPlayerEnergy(prev => Math.min(100, prev + 15));
  };

  useEffect(() => {
    if (opponentHealth <= 0 && inBattle && selectedOpponent && currentBattleId) {
      setTimeout(() => {
        submitCompleteBattle(true); // Player won
      }, 1000);
    } else if (playerHealth <= 0 && inBattle && currentBattleId) {
      setTimeout(() => {
        submitCompleteBattle(false); // Player lost
      }, 1000);
    }
  }, [opponentHealth, playerHealth]);

  const submitCompleteBattle = async (playerWon: boolean) => {
    if (!currentBattleId || storedMoves.length === 0) {
      // If no moves were made, just show the result
      showBattleResult(playerWon);
      return;
    }

    try {
      setSubmittingBattle(true);
      setBattleLog(prev => [...prev, 'Submitting battle results to contract...']);

      const battleResult = await walletManager.executeCompleteBattle(
        currentBattleId,
        storedMoves
      );

      if (battleResult.success) {
        setBattleLog(prev => [
          ...prev,
          `✅ Battle completed on-chain!`,
          ...battleResult.battleLog || []
        ]);
        
        // Show success result
        showBattleResult(playerWon, battleResult.winner);
      } else {
        // setBattleLog(prev => [...prev, `❌ Error: ${battleResult.error}`]);
        // showGameAlert(
        //   'Battle Submission Failed',
        //   `Could not submit battle to contract: ${battleResult.error}`,
        //   '❌',
        //   [{ text: 'OK', onPress: hideGameAlert, variant: 'primary' }]
        // );
      }
    } catch (error) {
      console.error('Error submitting complete battle:', error);
      setBattleLog(prev => [...prev, `❌ Contract error: ${error}`]);
      showGameAlert(
        'Battle Submission Failed',
        'Could not submit battle to contract. Please try again.',
        '❌',
        [{ text: 'OK', onPress: hideGameAlert, variant: 'primary' }]
      );
    } finally {
      setSubmittingBattle(false);
    }
  };

  const showBattleResult = (playerWon: boolean, contractWinner?: string) => {
    if (playerWon) {
      showGameAlert(
        '🎉 Victory!',
        `Your ${playerPet?.name} defeated ${selectedOpponent?.name}!\n\nMoves used: ${storedMoves.length}\nTransaction submitted to contract!\n\nRewards:\n💰 ${selectedOpponent?.reward} coins\n⭐ Experience gained`,
        '🏆',
        [
          { text: 'Claim Rewards', onPress: () => endBattle(), variant: 'success' },
        ]
      );
    } else {
      showGameAlert(
        '💀 Defeat!',
        `Your ${playerPet?.name} was defeated by ${selectedOpponent?.name}.\n\nMoves used: ${storedMoves.length}\nTransaction submitted to contract!\n\nTip: Feed your pet healthy meals to increase strength!`,
        '😵',
        [
          { text: 'Train More', onPress: () => router.push('/(game)/(tabs)/scan'), variant: 'primary' },
          { text: 'Try Again', onPress: () => restartBattle(), variant: 'secondary' }
        ]
      );
    }
  };

  const endBattle = () => {
    setInBattle(false);
    setSelectedOpponent(null);
    setBattleLog([]);
    setCurrentBattleId(null);
    setStoredMoves([]);
    hideGameAlert();
    loadPlayerPet();
  };

  const restartBattle = () => {
    if (selectedOpponent) {
      endBattle();
      setTimeout(() => {
        startBattle(selectedOpponent);
      }, 500);
    }
  };

  if (inBattle && selectedOpponent && playerPet) {
    return (
      <View style={styles.wrapper}>
        <Image
          source={require('@/assets/images/bg_screen_2.png')}
          style={styles.backgroundImage}
          contentFit="cover"
        />
        <View style={styles.darkOverlay} />
        
        <ScrollView style={styles.battleContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.battleArena}>
            <View style={styles.fightersRow}>
              <View style={styles.combatant}>
                <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                  <Image
                    source={{ uri: selectedOpponent.webImage || selectedOpponent.image }}
                    style={styles.opponentImage}
                    contentFit="contain"
                    placeholder={selectedOpponent.image} // Fallback to local image
                  />
                </Animated.View>
                <Text style={styles.combatantName}>{selectedOpponent.name}</Text>
                <View style={styles.healthBarContainer}>
                  <View style={styles.healthBar}>
                    <LinearGradient
                      colors={['#e74c3c', '#c0392b']}
                      style={[
                        styles.healthFill,
                        { width: `${(opponentHealth / selectedOpponent.stats.health) * 100}%` }
                      ]}
                    />
                  </View>
                  <Text style={styles.healthText}>{opponentHealth}/{selectedOpponent.stats.health}</Text>
                </View>
              </View>

              <LinearGradient
                colors={[Colors.primary, '#00A868']}
                style={styles.vsContainer}
              >
                <Text style={styles.vsText}>VS</Text>
              </LinearGradient>

              <View style={styles.combatant}>
                <LottieView
                  source={getUserPetAnimation(playerPet.id)}
                  autoPlay
                  loop
                  style={styles.playerLottie}
                />
                <Text style={styles.combatantName}>{playerPet.name}</Text>
                <View style={styles.healthBarContainer}>
                  <View style={styles.healthBar}>
                    <LinearGradient
                      colors={['#16a085', '#1abc9c']}
                      style={[
                        styles.healthFill,
                        { width: `${(playerHealth / (playerPet.maxHealth || 100)) * 100}%` }
                      ]}
                    />
                  </View>
                  <Text style={styles.healthText}>{playerHealth}/{playerPet.maxHealth || 100}</Text>
                </View>
                
                <View style={styles.energyBarContainer}>
                  <View style={styles.energyBar}>
                    <LinearGradient
                      colors={[Colors.primary, '#667eea']}
                      style={[
                        styles.energyFill,
                        { width: `${playerEnergy}%` }
                      ]}
                    />
                  </View>
                  <Text style={styles.energyText}>Energy: {playerEnergy}/100</Text>
                </View>
              </View>
            </View>
          </View>

          {isPlayerTurn && (
            <View style={styles.cardsSection}>
              <Text style={styles.cardsTitle}>Choose Your Move</Text>
              {storedMoves.length > 0 && (
                <View style={styles.storedMovesContainer}>
                  <Text style={styles.storedMovesText}>
                    📝 Moves stored: {storedMoves.length} (will submit when battle ends)
                  </Text>
                </View>
              )}
              <View style={styles.cardsGrid}>
                {battleCards.map((card, index) => (
                  <TouchableOpacity
                    key={card.id}
                    style={[
                      styles.battleCard,
                      playerEnergy < card.energyCost && styles.cardDisabled,
                      index === 4 ? styles.cardFullWidth : (index % 2 === 0 ? styles.cardLeft : styles.cardRight)
                    ]}
                    onPress={() => useCard(card)}
                    disabled={playerEnergy < card.energyCost || isLoading || processingMove || submittingBattle}
                  >
                    <LinearGradient
                      colors={playerEnergy >= card.energyCost && !processingMove && !submittingBattle ? 
                        ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)'] :
                        ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
                      style={styles.cardGradient}
                    >
                      {(processingMove || submittingBattle) ? (
                        <ActivityIndicator size="large" color={Colors.primary} />
                      ) : (
                        <>
                          <Text style={styles.cardEmoji}>{card.emoji}</Text>
                          <Text style={styles.cardName}>{card.name}</Text>
                          <Text style={styles.cardPower}>
                            {card.type === 'attack' ? `${card.power} ATK` : 
                             card.type === 'defense' ? `${card.power} DEF` : 
                             `${card.power} SPL`}
                          </Text>
                          <Text style={[styles.cardCost, playerEnergy < card.energyCost && styles.cardCostDisabled]}>
                            ⚡ {card.energyCost}
                          </Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* {battleLog && (
            <View style={styles.battleLogContainer}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                style={styles.battleLog}
              >
                <ScrollView showsVerticalScrollIndicator={false}>
                  {battleLog.map((log, index) => (
                    <Text key={index} style={styles.logText}>{log}</Text>
                  ))}
                </ScrollView>
              </LinearGradient>
            </View>
          )} */}
        </ScrollView>

        <GameAlert
          visible={gameAlert.visible}
          title={gameAlert.title}
          message={gameAlert.message}
          icon={gameAlert.icon}
          iconType={gameAlert.icon === 'success' ? 'image' : 'emoji'}
          buttons={gameAlert.buttons}
          onClose={hideGameAlert}
        />

        {/* Full-screen loading overlay for battle submission */}
        {submittingBattle && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingTitle}>Submitting Battle to Contract</Text>
              <Text style={styles.loadingMessage}>
                Please wait while we process your battle moves on-chain...
              </Text>
              <Text style={styles.loadingSubtext}>
                This may take a few moments to complete.
              </Text>
            </View>
          </View>
        )}
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
        <View style={styles.darkOverlay} />
        
        <ScrollView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>⚔️ Battle Arena</Text>
            <Text style={styles.subtitle}>Challenge opponents to earn coins and XP</Text>
            {playerPet && (
              <View style={styles.playerPetInfo}>
                <Text style={styles.playerPetText}>
                  🐾 {playerPet.name} • Level {playerPet.level} • ⚡ {playerPet.energy}/100
                </Text>
              </View>
            )}
          </View>

          <View style={styles.opponentsSection}>
            <Text style={styles.sectionTitle}>Choose Your Opponent</Text>
            {loadingOpponents ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>🔄 Loading opponents from contract...</Text>
              </View>
            ) : getContractOpponents().length === 0 ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.noOpponentsText}>⚠️ No opponents available. Contract may not be initialized.</Text>
              </View>
            ) : (
              getContractOpponents().map((opponent) => {
              const opponentPower = calculateBattlePower(opponent);
              const playerPower = playerPet ? calculateBattlePower(playerPet) : 0;
              const winChance = playerPet ? calculateWinProbability(playerPower, opponentPower, playerPet.level) : 50;
              const difficulty = winChance >= 70 ? '🟢 Easy' : winChance >= 40 ? '🟡 Medium' : '🔴 Hard';
              const isContractOpponent = contractOpponents[opponent.id] && contractOpponents[opponent.id].health > 0;
              return (
                <TouchableOpacity
                  key={opponent.id}
                  style={styles.opponentCard}
                  onPress={() => startBattle(opponent)}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={isContractOpponent ? 
                      ['rgba(0, 255, 150, 0.15)', 'rgba(0, 255, 150, 0.05)'] : 
                      ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                    style={styles.opponentCardGradient}
                  >
                    <Image
                      source={{ uri: opponent.webImage || opponent.image }}
                      style={styles.opponentCardImage}
                      contentFit="contain"
                      placeholder={opponent.image} // Fallback to local image
                    />
                    <View style={styles.opponentInfo}>
                      <View style={styles.opponentHeader}>
                        <Text style={styles.opponentName}>{opponent.name}</Text>
                      </View>
                      <Text style={styles.opponentLevel}>Level {opponent.level}</Text>
                      <Text style={styles.difficultyText}>{difficulty}</Text>
                      <View style={styles.opponentStats}>
                        <Text style={styles.statText}>❤️ {opponent.stats.health}</Text>
                        <Text style={styles.statText}>⚔️ {opponent.stats.attack}</Text>
                        <Text style={styles.statText}>🛡️ {opponent.stats.defense}</Text>
                      </View>
                      <Text style={styles.powerText}>⚡ Power: {opponentPower}</Text>
                      {isContractOpponent && (
                        <Text style={styles.contractIdText}>ID: {contractOpponents[opponent.id]?.id}</Text>
                      )}
                    </View>
                    <View style={styles.rewardContainer}>
                    {isContractOpponent && <Text style={styles.contractBadge}>🔗 LIVE</Text>}
                      <Text style={styles.winChanceText}>{winChance}% win</Text>
                      <Text style={styles.rewardText}>💰 {opponent.reward}</Text>
                      <GameButton
                        title={isLoading ? "Starting..." : "Battle"}
                        onPress={() => startBattle(opponent)}
                        variant="primary"
                        size="small"
                        disabled={isLoading}
                      />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })
            )}
          </View>

          <LinearGradient
            colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
            style={styles.tipsSection}
          >
            <Text style={styles.tipsTitle}>⚡ Battle Tips</Text>
            <Text style={styles.tipText}>• Attack cards deal damage to opponents</Text>
            <Text style={styles.tipText}>• Defense cards reduce incoming damage next turn</Text>
            <Text style={styles.tipText}>• Special cards provide healing and energy boosts</Text>
            <Text style={styles.tipText}>• Energy regenerates +15 each turn</Text>
            <Text style={styles.tipText}>• Moves are stored locally and submitted when battle ends</Text>
            <Text style={styles.tipText}>• Only one transaction required per battle (gas efficient!)</Text>
            <Text style={styles.tipText}>• Feed your pet healthy meals to boost battle stats</Text>
          </LinearGradient>
        </ScrollView>

        <GameAlert
          visible={gameAlert.visible}
          title={gameAlert.title}
          message={gameAlert.message}
          icon={gameAlert.icon}
          iconType={gameAlert.icon === 'success' ? 'image' : 'emoji'}
          buttons={gameAlert.buttons}
          onClose={hideGameAlert}
        />

        {/* Full-screen loading overlay for battle submission */}
        {submittingBattle && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingTitle}>Submitting Battle to Contract</Text>
              <Text style={styles.loadingMessage}>
                Please wait while we process your battle moves on-chain...
              </Text>
              <Text style={styles.loadingSubtext}>
                This may take a few moments to complete.
              </Text>
            </View>
          </View>
        )}
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
    padding: 20,
  },
  battleContainer: {
    flex: 1,
    marginTop:50
  },
  header: {
    alignItems: 'center',
    marginTop: 100,
    marginBottom: 30,
  },
  title: {
    fontSize: 36,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: Colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Blockblueprint',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  playerPetInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  playerPetText: {
    fontSize: 14,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  opponentsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  opponentCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  opponentCardGradient: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16
  },
  opponentCardImage: {
    width: 60,
    height: 60,
    marginRight: 16,
  },
  opponentInfo: {
    flex: 1,
  },
  opponentName: {
    fontSize: 18,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  opponentLevel: {
    fontSize: 14,
    fontFamily: 'Blockblueprint',
    color: '#B0B0B0',
    marginBottom: 8,
  },
  opponentStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
  },
  rewardContainer: {
    alignItems: 'center',
    gap: 8,
  },
  rewardText: {
    fontSize: 16,
    fontFamily: 'Blockblueprint',
    color: '#f39c12',
    fontWeight: 'bold',
  },
  battleArena: {
    alignItems: 'center',
  },
  fightersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  combatant: {
    alignItems: 'center',
    flex: 1,
  },
  opponentImage: {
    width: 80,
    height: 80,
  },
  playerLottie: {
    width: 80,
    height: 80,
    backgroundColor: 'transparent',
  },
  combatantName: {
    fontSize: 16,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginTop: 6,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  healthBarContainer: {
    alignItems: 'center',
    marginTop: 6,
  },
  healthBar: {
    width: 100,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  healthFill: {
    height: '100%',
    borderRadius: 5,
  },
  healthText: {
    fontSize: 12,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginTop: 3,
  },
  energyBarContainer: {
    alignItems: 'center',
    marginTop: 6,
  },
  energyBar: {
    width: 100,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  energyFill: {
    height: '100%',
    borderRadius: 4,
  },
  energyText: {
    fontSize: 10,
    fontFamily: 'Blockblueprint',
    color: '#B0B0B0',
    marginTop: 3,
  },
  vsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 10,
    alignSelf: 'center',
  },
  vsText: {
    fontSize: 28,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  cardsSection: {
    padding: 20,
  },
  cardsTitle: {
    fontSize: 20,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  cardsContainer: {
    paddingHorizontal: 10,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  battleCard: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '48%',
    marginBottom: 12,
  },
  cardLeft: {
    marginRight: '2%',
  },
  cardRight: {
    marginLeft: '2%',
  },
  cardFullWidth: {
    width: '100%',
    marginLeft: 0,
    marginRight: 0,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardGradient: {
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  cardEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  cardName: {
    fontSize: 11,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
    lineHeight: 14,
  },
  cardPower: {
    fontSize: 11,
    fontFamily: 'Blockblueprint',
    color: Colors.primary,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  cardCost: {
    fontSize: 11,
    fontFamily: 'Blockblueprint',
    color: '#667eea',
  },
  cardCostDisabled: {
    color: '#666',
  },
  battleLogContainer: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: 120,
    paddingHorizontal: 10
  },
  battleLog: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16
  },
  logText: {
    fontSize: 12,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  tipsSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 120,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  tipsTitle: {
    fontSize: 18,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    fontFamily: 'Blockblueprint',
    color: '#B0B0B0',
    marginBottom: 6,
    lineHeight: 20,
  },
  difficultyText: {
    fontSize: 12,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  powerText: {
    fontSize: 11,
    fontFamily: 'Blockblueprint',
    color: Colors.primary,
    marginTop: 4,
  },
  winChanceText: {
    fontSize: 12,
    fontFamily: 'Blockblueprint',
    color: '#f39c12',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  opponentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  contractBadge: {
    fontSize: 9,
    fontFamily: 'Blockblueprint',
    color: '#00ff96',
    backgroundColor: 'rgba(0, 255, 150, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: 'bold',
  },
  contractIdText: {
    fontSize: 9,
    fontFamily: 'Blockblueprint',
    color: '#00ff96',
    marginTop: 2,
    opacity: 0.8,
  },
  storedMovesContainer: {
    backgroundColor: 'rgba(0, 255, 150, 0.1)',
    paddingHorizontal: 5,
    marginHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 150, 0.3)',
  },
  storedMovesText: {
    fontSize: 14,
    fontFamily: 'Blockblueprint',
    color: '#00ff96',
    textAlign: 'center',
  },
  loadingContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 40,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Blockblueprint',
    color: Colors.primary,
    textAlign: 'center',
  },
  noOpponentsText: {
    fontSize: 16,
    fontFamily: 'Blockblueprint',
    color: '#ff6b6b',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingTitle: {
    fontSize: 24,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  loadingMessage: {
    fontSize: 16,
    fontFamily: 'Blockblueprint',
    color: Colors.primary,
    marginBottom: 10,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 24,
  },
  loadingSubtext: {
    fontSize: 14,
    fontFamily: 'Blockblueprint',
    color: '#B0B0B0',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
}); 