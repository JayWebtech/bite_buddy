import { MintPetPrompt } from '@/components/ui/MintPetPrompt';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Opponent {
  id: number;
  name: string;
  level: number;
  image: any;
  stats: {
    health: number;
    attack: number;
    defense: number;
  };
  reward: number;
}

interface BattleCard {
  id: number;
  name: string;
  type: 'attack' | 'defense' | 'special';
  power: number;
  energyCost: number;
  description: string;
  emoji: string;
}

const opponents: Opponent[] = [
  {
    id: 1,
    name: 'Wild Pup',
    level: 1,
    image: require('@/assets/images/pet-2.png'),
    stats: { health: 80, attack: 25, defense: 15 },
    reward: 50
  },
  {
    id: 2,
    name: 'Forest Guardian',
    level: 2,
    image: require('@/assets/images/pet-3.png'),
    stats: { health: 120, attack: 35, defense: 25 },
    reward: 75
  },
  {
    id: 3,
    name: 'Shadow Beast',
    level: 3,
    image: require('@/assets/images/pet-4.png'),
    stats: { health: 150, attack: 45, defense: 30 },
    reward: 100
  }
];

const battleCards: BattleCard[] = [
  { id: 1, name: 'Quick Strike', type: 'attack', power: 30, energyCost: 20, description: 'Fast attack', emoji: '⚡' },
  { id: 2, name: 'Power Slam', type: 'attack', power: 50, energyCost: 35, description: 'Heavy damage', emoji: '💥' },
  { id: 3, name: 'Shield Up', type: 'defense', power: 25, energyCost: 15, description: 'Block damage', emoji: '🛡️' },
  { id: 4, name: 'Heal', type: 'special', power: 40, energyCost: 30, description: 'Restore health', emoji: '❤️' },
  { id: 5, name: 'Energy Boost', type: 'special', power: 50, energyCost: 10, description: 'Gain energy', emoji: '⭐' },
];

export default function BattleScreen() {
  const router = useRouter();
  const [selectedOpponent, setSelectedOpponent] = useState<Opponent | null>(null);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [playerEnergy, setPlayerEnergy] = useState(100);
  const [opponentHealth, setOpponentHealth] = useState(100);
  const [inBattle, setInBattle] = useState(false);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  
  // Animations
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const startBattle = (opponent: Opponent) => {
    setSelectedOpponent(opponent);
    setPlayerHealth(100);
    setPlayerEnergy(100);
    setOpponentHealth(opponent.stats.health);
    setInBattle(true);
    setBattleLog([`Battle started against ${opponent.name}!`]);
    setIsPlayerTurn(true);
  };

  const useCard = (card: BattleCard) => {
    if (playerEnergy < card.energyCost) {
      Alert.alert('Not enough energy!', 'Wait for energy to recharge.');
      return;
    }

    setPlayerEnergy(prev => prev - card.energyCost);
    
    let logMessage = '';
    
    switch (card.type) {
      case 'attack':
        const damage = Math.max(1, card.power - (selectedOpponent?.stats.defense || 0));
        setOpponentHealth(prev => Math.max(0, prev - damage));
        logMessage = `You used ${card.name} and dealt ${damage} damage!`;
        
        // Shake animation for attack
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
          setPlayerHealth(prev => Math.min(100, prev + card.power));
          logMessage = `You used ${card.name} and restored ${card.power} health!`;
        } else if (card.name === 'Energy Boost') {
          setPlayerEnergy(prev => Math.min(100, prev + card.power));
          logMessage = `You used ${card.name} and gained ${card.power} energy!`;
        }
        break;
    }
    
    setBattleLog(prev => [...prev, logMessage]);
    setIsPlayerTurn(false);
    
    // AI turn after delay
    setTimeout(() => {
      aiTurn();
    }, 1500);
  };

  const aiTurn = () => {
    if (!selectedOpponent) return;
    
    const damage = Math.max(1, selectedOpponent.stats.attack - 10); // Player has some base defense
    setPlayerHealth(prev => Math.max(0, prev - damage));
    
    setBattleLog(prev => [...prev, `${selectedOpponent.name} attacks for ${damage} damage!`]);
    setIsPlayerTurn(true);
    
    // Restore some energy each turn
    setPlayerEnergy(prev => Math.min(100, prev + 15));
  };

  useEffect(() => {
    if (opponentHealth <= 0 && inBattle) {
      // Player wins
      setTimeout(() => {
        Alert.alert(
          'Victory!',
          `You defeated ${selectedOpponent?.name}! Earned ${selectedOpponent?.reward} coins.`,
          [{ text: 'Continue', onPress: () => endBattle() }]
        );
      }, 1000);
    } else if (playerHealth <= 0 && inBattle) {
      // Player loses
      setTimeout(() => {
        Alert.alert(
          'Defeat!',
          'Your pet was defeated. Try training more!',
          [{ text: 'Continue', onPress: () => endBattle() }]
        );
      }, 1000);
    }
  }, [opponentHealth, playerHealth]);

  const endBattle = () => {
    setInBattle(false);
    setSelectedOpponent(null);
    setBattleLog([]);
  };

  if (inBattle && selectedOpponent) {
    return (
      <View style={styles.battleContainer}>
        {/* Battle Arena */}
        <View style={styles.battleArena}>
          {/* Opponent */}
          <View style={styles.combatant}>
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <Image
                source={selectedOpponent.image}
                style={styles.opponentImage}
                contentFit="contain"
              />
            </Animated.View>
            <Text style={styles.combatantName}>{selectedOpponent.name}</Text>
            <View style={styles.healthBar}>
              <View 
                style={[
                  styles.healthFill,
                  { width: `${(opponentHealth / selectedOpponent.stats.health) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.healthText}>{opponentHealth}/{selectedOpponent.stats.health}</Text>
          </View>

          <Text style={styles.vsText}>VS</Text>

          {/* Player */}
          <View style={styles.combatant}>
            <Image
              source={require('@/assets/images/pet-1.png')}
              style={styles.playerImage}
              contentFit="contain"
            />
            <Text style={styles.combatantName}>Fluffy</Text>
            <View style={styles.healthBar}>
              <View 
                style={[
                  styles.healthFill,
                  { width: `${playerHealth}%`, backgroundColor: '#16a085' }
                ]} 
              />
            </View>
            <Text style={styles.healthText}>{playerHealth}/100</Text>
            
            <View style={styles.energyBar}>
              <View 
                style={[
                  styles.energyFill,
                  { width: `${playerEnergy}%` }
                ]} 
              />
            </View>
            <Text style={styles.energyText}>Energy: {playerEnergy}/100</Text>
          </View>
        </View>

        {/* Battle Cards */}
        {isPlayerTurn && (
          <View style={styles.cardsSection}>
            <Text style={styles.cardsTitle}>Choose Your Move</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {battleCards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={[
                    styles.battleCard,
                    playerEnergy < card.energyCost && styles.cardDisabled
                  ]}
                  onPress={() => useCard(card)}
                  disabled={playerEnergy < card.energyCost}
                >
                  <Text style={styles.cardEmoji}>{card.emoji}</Text>
                  <Text style={styles.cardName}>{card.name}</Text>
                  <Text style={styles.cardPower}>
                    {card.type === 'attack' ? `${card.power} ATK` : 
                     card.type === 'defense' ? `${card.power} DEF` : 
                     `${card.power} SPL`}
                  </Text>
                  <Text style={styles.cardCost}>⚡ {card.energyCost}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Battle Log */}
        <View style={styles.battleLog}>
          <ScrollView>
            {battleLog.map((log, index) => (
              <Text key={index} style={styles.logText}>{log}</Text>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <MintPetPrompt>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Battle Arena</Text>
          <Text style={styles.subtitle}>Challenge opponents to earn coins and XP</Text>
        </View>

        <View style={styles.opponentsSection}>
          <Text style={styles.sectionTitle}>Choose Your Opponent</Text>
          {opponents.map((opponent) => (
            <TouchableOpacity
              key={opponent.id}
              style={styles.opponentCard}
              onPress={() => startBattle(opponent)}
            >
              <Image
                source={opponent.image}
                style={styles.opponentCardImage}
                contentFit="contain"
              />
              <View style={styles.opponentInfo}>
                <Text style={styles.opponentName}>{opponent.name}</Text>
                <Text style={styles.opponentLevel}>Level {opponent.level}</Text>
                <View style={styles.opponentStats}>
                  <Text style={styles.statText}>❤️ {opponent.stats.health}</Text>
                  <Text style={styles.statText}>⚔️ {opponent.stats.attack}</Text>
                  <Text style={styles.statText}>🛡️ {opponent.stats.defense}</Text>
                </View>
              </View>
              <View style={styles.rewardContainer}>
                <Text style={styles.rewardText}>💰 {opponent.reward}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Battle Tips</Text>
          <Text style={styles.tipText}>• Use attack cards to deal damage</Text>
          <Text style={styles.tipText}>• Defense cards reduce incoming damage</Text>
          <Text style={styles.tipText}>• Special cards provide healing and energy</Text>
          <Text style={styles.tipText}>• Energy regenerates each turn</Text>
        </View>
      </ScrollView>
    </MintPetPrompt>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 20,
  },
  battleContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontFamily: 'ClashDisplay-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'ClashDisplay-Regular',
    color: '#B0B0B0',
    textAlign: 'center',
  },
  opponentsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'ClashDisplay-Bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  opponentCard: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
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
    fontSize: 16,
    fontFamily: 'ClashDisplay-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  opponentLevel: {
    fontSize: 12,
    fontFamily: 'ClashDisplay-Regular',
    color: '#B0B0B0',
    marginBottom: 8,
  },
  opponentStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statText: {
    fontSize: 12,
    fontFamily: 'ClashDisplay-Regular',
    color: '#FFFFFF',
  },
  rewardContainer: {
    alignItems: 'center',
  },
  rewardText: {
    fontSize: 14,
    fontFamily: 'ClashDisplay-Medium',
    color: '#f39c12',
  },
  battleArena: {
    padding: 20,
    alignItems: 'center',
  },
  combatant: {
    alignItems: 'center',
    marginVertical: 20,
  },
  opponentImage: {
    width: 100,
    height: 100,
  },
  playerImage: {
    width: 100,
    height: 100,
  },
  combatantName: {
    fontSize: 18,
    fontFamily: 'ClashDisplay-Bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  healthBar: {
    width: 120,
    height: 8,
    backgroundColor: '#16213e',
    borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  healthFill: {
    height: '100%',
    backgroundColor: '#e74c3c',
    borderRadius: 4,
  },
  healthText: {
    fontSize: 12,
    fontFamily: 'ClashDisplay-Regular',
    color: '#FFFFFF',
    marginTop: 4,
  },
  energyBar: {
    width: 120,
    height: 6,
    backgroundColor: '#16213e',
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  energyFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 3,
  },
  energyText: {
    fontSize: 10,
    fontFamily: 'ClashDisplay-Regular',
    color: '#B0B0B0',
    marginTop: 4,
  },
  vsText: {
    fontSize: 24,
    fontFamily: 'ClashDisplay-Bold',
    color: '#667eea',
    marginVertical: 20,
  },
  cardsSection: {
    padding: 20,
  },
  cardsTitle: {
    fontSize: 18,
    fontFamily: 'ClashDisplay-Bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  battleCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    width: 100,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  cardName: {
    fontSize: 12,
    fontFamily: 'ClashDisplay-Medium',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardPower: {
    fontSize: 10,
    fontFamily: 'ClashDisplay-Regular',
    color: '#16a085',
    marginBottom: 4,
  },
  cardCost: {
    fontSize: 10,
    fontFamily: 'ClashDisplay-Regular',
    color: '#667eea',
  },
  battleLog: {
    flex: 1,
    backgroundColor: '#0f1419',
    margin: 20,
    borderRadius: 12,
    padding: 16,
  },
  logText: {
    fontSize: 12,
    fontFamily: 'ClashDisplay-Regular',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  tipsSection: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 100,
  },
  tipsTitle: {
    fontSize: 16,
    fontFamily: 'ClashDisplay-Bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    fontFamily: 'ClashDisplay-Regular',
    color: '#B0B0B0',
    marginBottom: 4,
  },
}); 