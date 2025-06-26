import GameAlert from '@/components/ui/GameAlert';
import GameButton from '@/components/ui/GameButton';
import { MintPetPrompt } from '@/components/ui/MintPetPrompt';
import { Colors, getNutritionColor } from '@/constants/Colors';
import { getNutritionGrade, mealAnalyzer, NutritionAnalysis } from '@/utils/mealAnalysis';
import { GameAudio } from '@/utils/soundManager';
import { walletManager } from '@/utils/wallet';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

interface ScanResult {
  analysis: NutritionAnalysis;
  imageUri: string;
  imageBase64: string;
  isFromCamera: boolean;
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

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [isFeeding, setIsFeeding] = useState(false);
  const [gameAlert, setGameAlert] = useState<GameAlertState>({
    visible: false,
    title: '',
    message: '',
    icon: '🎮',
    buttons: []
  });

  // Animations
  const scanAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isAnalyzing) {
      // Start analyzing animation
      const scanAnimation = Animated.loop(
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );

      const glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      
      scanAnimation.start();
      pulseAnimation.start();
      glowAnimation.start();
      
      return () => {
        scanAnimation.stop();
        pulseAnimation.stop();
        glowAnimation.stop();
      };
    }
  }, [isAnalyzing]);

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

  const requestCameraPermission = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        showGameAlert(
          'Camera Permission Required',
          'BiteBuddy needs camera access to scan your delicious meals!',
          '📷',
          [{ text: 'OK', onPress: () => {}, variant: 'primary' }]
        );
        return false;
      }
    }
    return true;
  };

  const openCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (hasPermission) {
      setShowCamera(true);
    }
  };

  const takePicture = async () => {
    if (cameraRef) {
      try {
        setIsScanning(true);
        const photo = await cameraRef.takePictureAsync({
          base64: true,
          quality: 0.8,
        });
        
        setShowCamera(false);
        await analyzeFood(photo.base64!, photo.uri, true);
      } catch (error) {
        console.error('Error taking picture:', error);
        showGameAlert(
          'Camera Error',
          'Failed to capture photo. Please try again!',
          '📷',
          [{ text: 'Try Again', onPress: () => {}, variant: 'primary' }]
        );
        setIsScanning(false);
      }
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await analyzeFood(asset.base64!, asset.uri, false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showGameAlert(
        'Gallery Error',
        'Failed to select image. Please try again!',
        '📁',
        [{ text: 'Try Again', onPress: () => {}, variant: 'primary' }]
      );
    }
  };

  const analyzeFood = async (base64Image: string, imageUri: string, isFromCamera: boolean) => {
    try {
      setIsAnalyzing(true);
      setIsScanning(false);

      const analysis = await mealAnalyzer.analyzeFoodImage(base64Image);
      
      // Use the validation helper for comprehensive checking
      const validation = mealAnalyzer.validateFoodImage(analysis);
      
      if (!validation.isValid) {
        setIsAnalyzing(false);
        const suggestions = validation.suggestions.slice(0, 3).join('\n• ');
        showGameAlert(
          '🚫 Validation Failed',
          `${validation.reason}\n\nTips:\n• ${suggestions}`,
          '❌',
          [
            { text: 'Try Again', onPress: resetScan, variant: 'primary' },
            { text: 'Cancel', onPress: () => {}, variant: 'secondary' }
          ]
        );
        return;
      }

      // Additional validation for camera-only photos
      if (!isFromCamera) {
        setIsAnalyzing(false);
        showGameAlert(
          '📸 Camera Only',
          'Please use the camera to scan fresh food items only. Gallery photos are not allowed!',
          '🚫',
          [{ text: 'Use Camera', onPress: () => openCamera(), variant: 'primary' }]
        );
        return;
      }
      
      const result: ScanResult = {
        analysis,
        imageUri,
        imageBase64: base64Image,
        isFromCamera
      };

      setScanResult(result);
      setIsAnalyzing(false);

      // Play scan success sound
      GameAudio.scanSuccess();

      // Animate result slide in
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
      
    } catch (error) {
      console.error('Error analyzing food:', error);
      setIsAnalyzing(false);
      showGameAlert(
        'Analysis Failed',
        'Our AI chefs are having trouble identifying this food. Try a clearer photo with better lighting!',
        '🤖',
        [
          { text: 'Try Again', onPress: resetScan, variant: 'primary' },
          { text: 'Cancel', onPress: () => {}, variant: 'secondary' }
        ]
      );
    }
  };

  const feedPet = async () => {
    if (!scanResult) return;

    try {
      setIsFeeding(true);
      
      // Get pet data to get the pet ID
      const petData = await walletManager.getPet();
      console.log('petData', petData);
      if (!petData) {
        showGameAlert(
          'Pet Not Found',
          'Could not find your pet data. Please make sure your pet is minted!',
          '🐾',
          [{ text: 'OK', onPress: () => {}, variant: 'primary' }]
        );
        return;
      }

      // Convert analysis to contract meal data with IPFS upload
      const contractMealData = await mealAnalyzer.convertToContractMealData(
        scanResult.analysis,
        scanResult.imageBase64,
        parseInt(petData.id)
      );
      
      const walletInfo = await walletManager.getWalletInfo();
      
      if (!walletInfo?.OZcontractAddress) {
        showGameAlert(
          'Wallet Not Connected',
          'Please connect your wallet to feed your pet!',
          '🔗',
          [{ text: 'OK', onPress: () => {}, variant: 'primary' }]
        );
        return;
      }

      // Call the contract to feed the pet
      const success = await walletManager.feedPet(contractMealData);
      
      if (success) {
        // Play meal completion and pet happy sounds
        GameAudio.mealComplete();
        GameAudio.petHappy();
        
        // Show success with detailed stats
        const { analysis } = scanResult;
        showGameAlert(
          '🎉 Feeding Successful!',
          `Your pet loved the ${analysis.foodName}!\n\n` +
          `Grade: ${getNutritionGrade(analysis)} • Confidence: ${Math.round(analysis.confidence * 100)}%\n\n` +
          `Meal NFT created and stored on IPFS!`,
          'success',
          [
            {
              text: 'View Collection',
              onPress: () => router.push('/(game)/(tabs)/collection'),
              variant: 'success'
            },
          ]
        );
      } else {
        GameAudio.error();
        showGameAlert(
          'Feeding Failed',
          'Transaction failed. Please try again later!',
          '😵',
          [{ text: 'Try Again', onPress: () => {}, variant: 'primary' }]
        );
      }
      
    } catch (error) {
      console.error('Error feeding pet:', error);
      if (error instanceof Error && error.message.includes('IPFS')) {
        showGameAlert(
          'Upload Failed',
          'Failed to upload image to IPFS. Please check your internet connection and try again!',
          '🌐',
          [{ text: 'Try Again', onPress: () => {}, variant: 'primary' }]
        );
      } else {
        showGameAlert(
          'Feeding Failed',
          'Your pet is too full right now or there was a network issue. Please try again later!',
          '😵',
          [{ text: 'Try Again', onPress: () => {}, variant: 'primary' }]
        );
      }
    } finally {
      setIsFeeding(false);
    }
  };

  const resetScan = () => {
    setScanResult(null);
    setShowCamera(false);
    setIsAnalyzing(false);
    setIsScanning(false);
    slideAnim.setValue(300);
    scanAnim.setValue(0);
    pulseAnim.setValue(1);
    glowAnim.setValue(0);
    progressAnim.setValue(0);
  };

  // Clear scan results when screen loses focus
  useFocusEffect(
    useCallback(() => {
      // This runs when screen comes into focus
      return () => {
        // This runs when screen loses focus
        resetScan();
      };
    }, [])
  );

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={setCameraRef}
          style={styles.camera}
          facing="back"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.8)', 'transparent', 'rgba(0,0,0,0.8)']}
            style={styles.cameraOverlay}
          >
            <View style={styles.cameraHeader}>
              <TouchableOpacity
                onPress={() => setShowCamera(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.cameraTitle}>Scan Your Meal</Text>
              <View style={styles.placeholder} />
            </View>

            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              
              {isScanning && (
                <Animated.View
                  style={[
                    styles.scanLine,
                    {
                      transform: [
                        {
                          translateY: scanAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-100, 100],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              )}

              <Text style={styles.scanInstruction}>
                Position food in the center
              </Text>
            </View>

            <View style={styles.cameraControls}>
              <TouchableOpacity
                onPress={pickImageFromGallery}
                style={styles.galleryButton}
              >
                <LinearGradient
                  colors={[Colors.cardBackground, Colors.darkCard]}
                  style={styles.controlButtonGradient}
                >
                  <Text style={styles.galleryButtonText}>📁</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={takePicture}
                style={[styles.captureButton, isScanning && styles.captureButtonDisabled]}
                disabled={isScanning}
              >
                <LinearGradient
                  colors={isScanning ? ['#666', '#444'] : [Colors.primary, '#00A868']}
                  style={styles.captureButtonGradient}
                >
                  <View style={styles.captureButtonInner} />
                </LinearGradient>
              </TouchableOpacity>
              
              <View style={styles.placeholder} />
            </View>
          </LinearGradient>
        </CameraView>
      </View>
    );
  }

  if (isAnalyzing) {
    return (
      <View style={styles.wrapper}>
        <Image
          source={require('@/assets/images/bg_screen_2.png')}
          style={styles.backgroundImage}
          contentFit="cover"
        />
        <View style={styles.darkOverlay} />
        
        <View style={styles.analyzingContainer}>
          <Animated.View
            style={[
              styles.analyzingIconContainer,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <Animated.View
              style={[
                styles.analyzingGlow,
                {
                  opacity: glowAnim,
                },
              ]}
            />
            <Text style={styles.analyzingEmoji}>🧠</Text>
          </Animated.View>
          
          <Text style={styles.analyzingTitle}>AI Chef Analyzing...</Text>
          <Text style={styles.analyzingSubtitle}>
            Examining nutritional content and flavor profiles
          </Text>
          
          <View style={styles.loadingBarContainer}>
            <View style={styles.loadingBar}>
              <Animated.View
                style={[
                  styles.loadingProgress,
                  {
                    transform: [{
                      scaleX: scanAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1],
                      })
                    }]
                  },
                ]}
              >
                <LinearGradient
                  colors={[Colors.primary, '#00D884']}
                  style={styles.loadingGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </Animated.View>
            </View>
            <Text style={styles.loadingText}>Analyzing nutrients...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (scanResult) {
    const { analysis } = scanResult;
    const grade = getNutritionGrade(analysis);
    const gradeColor = getNutritionColor(analysis.healthScore >= 80 ? 'Excellent' : 
                                        analysis.healthScore >= 60 ? 'Good' : 
                                        analysis.healthScore >= 40 ? 'Fair' : 'Poor');
    
    return (
      <View style={styles.wrapper}>
        <Image
          source={require('@/assets/images/bg_screen_2.png')}
          style={styles.backgroundImage}
          contentFit="cover"
        />
        <View style={styles.darkOverlay} />
        
        <Animated.View
          style={[
            styles.resultContainer,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.resultHeader}>
              <TouchableOpacity onPress={() => {
                GameAudio.buttonPress();
                resetScan();
              }} style={styles.backButton}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.resultTitle}>Scan Results</Text>
              <View style={styles.placeholder} />
            </View>

            <View style={styles.foodImageContainer}>
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: scanResult.imageUri }}
                  style={styles.foodImage}
                  contentFit="cover"
                />
                <LinearGradient
                  colors={[`${gradeColor}40`, 'transparent']}
                  style={styles.imageGlow}
                />
              </View>
            </View>

            <View style={styles.analysisCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                style={styles.cardGradient}
              >
                <View style={styles.foodHeader}>
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>{analysis.foodName}</Text>
                    <Text style={styles.foodDescription}>{analysis.description}</Text>
                  </View>
                  <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(grade) }]}>
                    <Text style={styles.gradeText}>{grade}</Text>
                  </View>
                </View>

                <View style={styles.statsContainer}>
                  <View style={styles.statRow}>
                    <View style={styles.statCard}>
                      <Text style={styles.statEmoji}>🔥</Text>
                      <Text style={styles.statLabel}>Calories</Text>
                      <Text style={styles.statValue}>{analysis.calories}</Text>
                      <Text style={styles.statDescription}>
                        {analysis.calories > 300 ? 'High Energy' : analysis.calories > 150 ? 'Moderate' : 'Light'}
                      </Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statEmoji}>💪</Text>
                      <Text style={styles.statLabel}>Protein</Text>
                      <Text style={styles.statValue}>{analysis.protein}%</Text>
                      <Text style={styles.statDescription}>
                        {analysis.protein > 60 ? 'Very High' : analysis.protein > 30 ? 'High' : analysis.protein > 15 ? 'Moderate' : 'Low'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statRow}>
                    <View style={styles.statCard}>
                      <Text style={styles.statEmoji}>🌾</Text>
                      <Text style={styles.statLabel}>Carbs</Text>
                      <Text style={styles.statValue}>{analysis.carbs}%</Text>
                      <Text style={styles.statDescription}>
                        {analysis.carbs > 60 ? 'Very High' : analysis.carbs > 30 ? 'High' : analysis.carbs > 15 ? 'Moderate' : 'Low'}
                      </Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statEmoji}>🥑</Text>
                      <Text style={styles.statLabel}>Fats</Text>
                      <Text style={styles.statValue}>{analysis.fats}%</Text>
                      <Text style={styles.statDescription}>
                        {analysis.fats > 40 ? 'Very High' : analysis.fats > 20 ? 'High' : analysis.fats > 10 ? 'Moderate' : 'Low'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statRow}>
                    <View style={styles.statCard}>
                      <Text style={styles.statEmoji}>🍊</Text>
                      <Text style={styles.statLabel}>Vitamins</Text>
                      <Text style={styles.statValue}>{analysis.vitamins}%</Text>
                      <Text style={styles.statDescription}>
                        {analysis.vitamins > 70 ? 'Excellent' : analysis.vitamins > 40 ? 'Good' : analysis.vitamins > 20 ? 'Fair' : 'Poor'}
                      </Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statEmoji}>⚡</Text>
                      <Text style={styles.statLabel}>Minerals</Text>
                      <Text style={styles.statValue}>{analysis.minerals}%</Text>
                      <Text style={styles.statDescription}>
                        {analysis.minerals > 70 ? 'Excellent' : analysis.minerals > 40 ? 'Good' : analysis.minerals > 20 ? 'Fair' : 'Poor'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statRow}>
                    <View style={styles.statCard}>
                      <Text style={styles.statEmoji}>🌿</Text>
                      <Text style={styles.statLabel}>Fiber</Text>
                      <Text style={styles.statValue}>{analysis.fiber}%</Text>
                      <Text style={styles.statDescription}>
                        {analysis.fiber > 60 ? 'Very High' : analysis.fiber > 30 ? 'High' : analysis.fiber > 15 ? 'Moderate' : 'Low'}
                      </Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statEmoji}>❤️</Text>
                      <Text style={styles.statLabel}>Health</Text>
                      <Text style={styles.statValue}>{analysis.healthScore}</Text>
                      <Text style={styles.statDescription}>
                        {analysis.healthScore >= 80 ? 'Very Healthy' : 
                         analysis.healthScore >= 60 ? 'Healthy' : 
                         analysis.healthScore >= 40 ? 'Moderate' : 'Unhealthy'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.confidenceContainer}>
                  <Text style={styles.confidenceLabel}>
                    AI Confidence: {Math.round(analysis.confidence * 100)}%
                  </Text>
                  <View style={styles.confidenceBar}>
                    <View
                      style={[
                        styles.confidenceProgress,
                        { transform: [{ scaleX: analysis.confidence }] }
                      ]}
                    >
                      <LinearGradient
                        colors={[Colors.primary, '#00D884']}
                        style={styles.confidenceGradient}
                      />
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.actionButtons}>
              <GameButton
                title={isFeeding ? 'Feeding Pet...' : '🍽️ Feed Pet'}
                onPress={feedPet}
                variant="success"
                size="medium"
                disabled={isFeeding}
              />
            </View>
          </ScrollView>
        </Animated.View>

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
    );
  }

  // Main scan screen
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
          <View style={styles.content}>
            <View style={styles.headerSection}>
              <Text style={styles.mainTitle}>🍽️ Food Scanner</Text>
              <Text style={styles.subtitle}>
                Snap a photo of your meal to feed your pet!
              </Text>
              <Text style={styles.description}>
                Our AI chef will analyze the nutrition and reward your pet accordingly
              </Text>
            </View>
            
            <View style={styles.featuresSection}>
              <LinearGradient colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']} style={styles.featureCard}>
                <Text style={styles.featureEmoji}>🤖</Text>
                <Text style={styles.featureTitle}>AI Analysis</Text>
                <Text style={styles.featureDescription}>Advanced nutrition recognition</Text>
              </LinearGradient>
              <LinearGradient colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']} style={styles.featureCard}>
                <Text style={styles.featureEmoji}>🏆</Text>
                <Text style={styles.featureTitle}>NFT Rewards</Text>
                <Text style={styles.featureDescription}>Collectible meal tokens</Text>
              </LinearGradient>
              <LinearGradient colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']} style={styles.featureCard}>
                <Text style={styles.featureEmoji}>📈</Text>
                <Text style={styles.featureTitle}>Pet Growth</Text>
                <Text style={styles.featureDescription}>Level up your companion</Text>
              </LinearGradient>
            </View>
            
            <View style={styles.buttonContainer}>
              <GameButton
                title="Open Camera"
                onPress={openCamera}
                variant="primary"
                size="large"
              />
            </View>
          </View>
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

  function getGradeColor(grade: string): string {
    switch (grade) {
      case 'S': return '#FFD700';
      case 'A': return '#32CD32';
      case 'B': return '#FFA500';
      case 'C': return '#FF6347';
      case 'D': return '#DC143C';
      case 'F': return '#8B0000';
      default: return Colors.textSecondary;
    }
  }
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  mainTitle: {
    fontSize: 48,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: Colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 20,
    fontFamily: 'Blockblueprint',
    color: Colors.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    fontFamily: 'Blockblueprint',
    color: '#B0B0B0',
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  featureCard: {
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  featureEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 12,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 10,
    fontFamily: 'Blockblueprint',
    color: '#8A8A8A',
    textAlign: 'center',
    lineHeight: 14,
  },
  buttonContainer: {
    gap: 16,
    width: '100%',
  },
  cameraButton: {
    width: '100%',
  },
  galleryMainButton: {
    width: '100%',
  },

  // Camera styles
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cameraTitle: {
    fontSize: 20,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  placeholder: {
    width: 50,
  },
  scanFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 40,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: Colors.primary,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 3,
    backgroundColor: Colors.primary,
    opacity: 0.9,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  scanInstruction: {
    position: 'absolute',
    bottom: -50,
    fontSize: 16,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  galleryButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    overflow: 'hidden',
  },
  controlButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 35,
  },
  galleryButtonText: {
    fontSize: 28,
  },
  captureButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    borderRadius: 45,
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
  },

  // Analyzing styles
  analyzingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  analyzingIconContainer: {
    position: 'relative',
    marginBottom: 40,
  },
  analyzingGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: Colors.primary,
    top: -35,
    left: -35,
  },
  analyzingEmoji: {
    fontSize: 80,
    zIndex: 2,
  },
  analyzingTitle: {
    fontSize: 28,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  analyzingSubtitle: {
    fontSize: 16,
    fontFamily: 'Blockblueprint',
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: 40,
  },
  loadingBarContainer: {
    width: '100%',
    alignItems: 'center',
  },
  loadingBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  loadingProgress: {
    height: '100%',
    borderRadius: 3,
    transformOrigin: 'left center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Blockblueprint',
    color: Colors.primary,
  },
  loadingGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 3,
  },

  // Result styles
  resultContainer: {
    flex: 1,
    paddingTop: 60,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
  },
  resultTitle: {
    fontSize: 24,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
  },
  foodImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  imageWrapper: {
    position: 'relative',
  },
  foodImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: Colors.primary,
  },
  imageGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 110,
    zIndex: -1,
  },
  analysisCard: {
    marginHorizontal: 20,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
  },
  cardGradient: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: 20,
    borderRadius: 14,
  },
  foodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  foodInfo: {
    flex: 1,
    marginRight: 16,
  },
  foodName: {
    fontSize: 24,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  foodDescription: {
    fontSize: 14,
    fontFamily: 'Blockblueprint',
    color: '#B0B0B0',
    lineHeight: 20,
  },
  gradeBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  gradeText: {
    fontSize: 24,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  statsContainer: {
    gap: 16,
    marginBottom: 20,
  },
  statRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 12,
  },
  statEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Blockblueprint',
    color: '#B0B0B0',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Blockblueprint',
    color: Colors.primary,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statDescription: {
    fontSize: 10,
    fontFamily: 'Blockblueprint',
    color: '#8A8A8A',
    textAlign: 'center',
  },
  confidenceContainer: {
    marginTop: 4,
  },
  confidenceLabel: {
    fontSize: 14,
    fontFamily: 'Blockblueprint',
    color: '#B0B0B0',
    marginBottom: 8,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: Colors.darkCard,
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceProgress: {
    height: '100%',
    borderRadius: 4,
    transformOrigin: 'left center',
  },
  confidenceGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  actionButtons: {
    paddingHorizontal: 20,
    paddingBottom: 140,
    gap: 12,
  },
  feedButton: {
    width: '100%',
  },
  scanAgainButton: {
    width: '100%',
  },
}); 