import GameAlert from '@/components/ui/GameAlert';
import GameButton from '@/components/ui/GameButton';
import { Colors } from '@/constants/Colors';
import { walletManager } from '@/utils/wallet';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';

const { width, height } = Dimensions.get('window');


// Floating particle component
const FloatingParticle: React.FC<{ delay: number }> = ({ delay }) => {
  const translateY = useRef(new Animated.Value(height)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 15000 + Math.random() * 10000,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.6,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 2000,
            delay: 8000,
            useNativeDriver: true,
          }),
        ]),
        Animated.loop(
          Animated.timing(rotate, {
            toValue: 1,
            duration: 8000,
            useNativeDriver: true,
          })
        ),
      ]).start(() => {
        translateY.setValue(height);
        opacity.setValue(0);
        rotate.setValue(0);
        setTimeout(startAnimation, Math.random() * 5000);
      });
    };

    setTimeout(startAnimation, delay);
  }, []);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          transform: [
            { translateY },
            {
              rotate: rotate.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg'],
              }),
            },
          ],
          opacity,
          left: Math.random() * width,
        },
      ]}
    >
      <Text style={styles.particleText}>✨</Text>
    </Animated.View>
  );
};

export default function OnboardingScreen() {
  const router = useRouter();
  const [seedPhrase] = useState<string[]>(walletManager.generateSeedPhrase());
  const [isRevealed, setIsRevealed] = useState(false);
  const [hasBackedUp, setHasBackedUp] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  // Animation refs
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(50)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(50)).current;
  const seedContainerScale = useRef(new Animated.Value(0.8)).current;
  const seedContainerOpacity = useRef(new Animated.Value(0)).current;
  const warningSlideY = useRef(new Animated.Value(50)).current;
  const warningOpacity = useRef(new Animated.Value(0)).current;
  const seedWordAnimations = useRef(
    Array.from({ length: 12 }, () => ({
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
      rotate: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    // Initial entrance animations
    Animated.sequence([
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleTranslateY, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(seedContainerScale, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(seedContainerOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    if (isRevealed) {
      // Animate warning container
      Animated.parallel([
        Animated.timing(warningOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(warningSlideY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Staggered seed word animations
      const animations = seedWordAnimations.map((anim, index) =>
        Animated.parallel([
          Animated.spring(anim.scale, {
            toValue: 1,
            tension: 50,
            friction: 8,
            delay: index * 100,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 400,
            delay: index * 100,
            useNativeDriver: true,
          }),
          Animated.timing(anim.rotate, {
            toValue: 1,
            duration: 600,
            delay: index * 100,
            useNativeDriver: true,
          }),
        ])
      );

      Animated.stagger(50, animations).start();
    }
  }, [isRevealed]);

  const handleReveal = () => {
    setIsRevealed(true);
  };

  const handleBackupConfirm = () => {
    setHasBackedUp(true);
    setShowAlert(true);
  };

  return (
    <View style={styles.wrapper}>
      <Image
        source={require('@/assets/images/bg_screen_2.png')}
        style={styles.backgroundImage}
        contentFit="cover"
      />
      
      {/* Floating particles */}
      {Array.from({ length: 8 }, (_, i) => (
        <FloatingParticle key={i} delay={i * 2000} />
      ))}
      
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Animated.View
            style={{
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            }}
          >
            <Text style={styles.title}>Secure Your Wallet</Text>
          </Animated.View>
          
          <Animated.View
            style={{
              opacity: subtitleOpacity,
              transform: [{ translateY: subtitleTranslateY }],
            }}
          >
            <Text style={styles.subtitle}>
              Your 12-word recovery phrase is the key to your NFT pets and all assets
            </Text>
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.seedContainer,
            {
              opacity: seedContainerOpacity,
              transform: [{ scale: seedContainerScale }],
            },
          ]}
        >
          <View style={styles.seedHeaderCard}>
            <Text style={styles.seedTitle}>RECOVERY PHRASE</Text>
          </View>
          
          <View style={styles.seedContentCard}>
            {!isRevealed ? (
              <View style={styles.hiddenContainer}>
                <Text style={styles.hiddenText}>Tap to reveal your seed phrase</Text>
                <GameButton
                  title="REVEAL"
                  onPress={handleReveal}
                  variant="primary"
                  size="large"
                />
              </View>
            ) : (
              <View style={styles.seedGrid}>
                {seedPhrase.map((word, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.seedItem,
                      {
                        opacity: seedWordAnimations[index].opacity,
                        transform: [
                          { scale: seedWordAnimations[index].scale },
                          {
                            rotateY: seedWordAnimations[index].rotate.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['90deg', '0deg'],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <View style={styles.seedNumberContainer}>
                      <Text style={styles.seedNumber}>{index + 1}</Text>
                    </View>
                    <Text style={styles.seedWord}>{word}</Text>
                    <View style={styles.seedGlow} />
                  </Animated.View>
                ))}
              </View>
            )}
          </View>
        </Animated.View>

        {isRevealed && (
          <Animated.View
            style={[
              styles.warningContainer,
              {
                opacity: warningOpacity,
                transform: [{ translateY: warningSlideY }],
              },
            ]}
          >
            <Text style={styles.warningTitle}>⚠️ Important</Text>
            <Text style={styles.warningText}>
              • Write down these words in order{'\n'}
              • Store them in a safe place{'\n'}
              • Never share them with anyone{'\n'}
              • You'll need them to recover your pets
            </Text>
          </Animated.View>
        )}

        <View style={styles.actions}>
          {isRevealed && !hasBackedUp && (
            <GameButton
              title="I've Backed Up My Phrase"
              onPress={handleBackupConfirm}
              variant="success"
              size="large"
            />
          )}
          
          {hasBackedUp && (
            <GameButton
              title="Continue to Setup PIN"
              onPress={() => router.push({
                pathname: '/(auth)/pin',
                params: { seedphrase: JSON.stringify(seedPhrase) }
              })}
              variant="primary"
              size="large"
            />
          )}
        </View>
      </ScrollView>
      
      <GameAlert
        visible={showAlert}
        title="Backup Confirmed"
        message="Great! Your seed phrase is safely backed up. Keep it secure!"
        icon="success"
        iconType="image"
        buttons={[
          {
            text: "Continue",
            onPress:() => router.push({
              pathname: '/(auth)/pin',
              params: { seedphrase: JSON.stringify(seedPhrase) }
            }),
            variant: "primary"
          }
        ]}
        onClose={() => setShowAlert(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    marginTop: 50,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    zIndex: -1,
  },
  particle: {
    position: 'absolute',
    zIndex: 1,
  },
  particleText: {
    fontSize: 20,
    color: Colors.primary,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 50,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  petImage: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 34,
    fontFamily: 'Blockblueprint',
    textTransform: 'uppercase',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    fontFamily: 'Blockblueprint',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
  },
  seedContainer: {
    marginBottom: 24,
    backgroundColor: `${Colors.primary}20`,
    borderRadius: 20,
    padding: 6,
    borderWidth: 3,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15,
    position: 'relative',
  },
  seedHeaderCard: {
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 0,
    borderBottomWidth: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  seedTitle: {
    fontSize: 30,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowRadius: 6,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  seedContentCard: {
    backgroundColor: Colors.primaryDark,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderWidth: 0,
    borderTopWidth: 2,
    borderTopColor: `${Colors.primary}`,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    position: 'relative',
  },
  hiddenContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  hiddenText: {
    fontSize: 18,
    fontFamily: 'Blockblueprint',
    color: '#B0B0B0',
    marginBottom: 20,
  },
  seedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  seedItem: {
    width: '48%',
    backgroundColor: '#2a3441',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    borderBottomWidth: 3,
    borderBottomColor: '#1a202c',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  seedNumber: {
    fontSize: 18,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  seedWord: {
    fontSize: 18,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    flex: 1,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  warningContainer: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  warningTitle: {
    fontSize: 18,
    fontFamily: 'Blockblueprint',
    color: '#ffd700',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 18,
    fontFamily: 'Blockblueprint',
    color: '#E8E8E8',
    lineHeight: 20,
  },
  actions: {
    gap: 12,
  },
  seedNumberContainer: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  seedGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    backgroundColor: `${Colors.primary}20`,
    opacity: 0.5,
  },
}); 