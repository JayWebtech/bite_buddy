import { walletManager } from '@/utils/wallet';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import GameAlert from './GameAlert';
import GameButton from './GameButton';

interface MintPetPromptProps {
  children: React.ReactNode;
  screenName?: string;
}

export function MintPetPrompt({ children, screenName = 'this feature' }: MintPetPromptProps) {
  const [isMinted, setIsMinted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    icon: '🎮' as string,
    iconType: 'emoji' as 'emoji' | 'image',
    buttons: [] as Array<{
      text: string;
      onPress: () => void;
      variant?: 'primary' | 'secondary' | 'success' | 'danger';
    }>
  });

  useEffect(() => {
    checkMintStatus();
  }, []);

  const checkMintStatus = async () => {
    try {
      const mintStatus = await walletManager.isMinted();
      setIsMinted(mintStatus);
    } catch (error) {
      console.error('Error checking mint status:', error);
      setIsMinted(false);
    }
  };

  const showGameAlert = (config: typeof alertConfig) => {
    setAlertConfig(config);
    setShowAlert(true);
  };

  const handleMintPet = async () => {
    try {
      setIsLoading(true);
      const result = await walletManager.mintPet();
      
      if (result === true) {
        showGameAlert({
          title: 'Success!',
          message: 'Your pet has been minted successfully!',
          icon: 'success',
          iconType: 'image',
          buttons: [
            {
              text: 'OK',
              onPress: () => {
                setIsMinted(true);
                setShowAlert(false);
              },
              variant: 'success'
            }
          ]
        });
      } else {
        showGameAlert({
          title: 'Error',
          message: 'Failed to mint pet. Please try again.',
          icon: 'error',
          iconType: 'image',
          buttons: [
            {
              text: 'OK',
              onPress: () => setShowAlert(false),
              variant: 'danger'
            }
          ]
        });
      }
    } catch (error) {
      console.error('Error minting pet:', error);
      showGameAlert({
        title: 'Error',
        message: 'An error occurred while minting your pet. Please try again.',
        icon: 'error',
        iconType: 'image',
        buttons: [
          {
            text: 'OK',
            onPress: () => setShowAlert(false),
            variant: 'danger'
          }
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking mint status
  if (isMinted === null) {
    return (
      <View style={styles.wrapper}>
        <Image
          source={require('@/assets/images/bg_screen_2.png')}
          style={styles.backgroundImage}
          contentFit="cover"
        />
        <View style={styles.darkOverlay} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  // Show mint prompt if pet is not minted
  if (!isMinted) {
    return (
      <>
        <View style={styles.wrapper}>
          <Image
            source={require('@/assets/images/bg_screen_2.png')}
            style={styles.backgroundImage}
            contentFit="cover"
          />
          <View style={styles.darkOverlay} />
          
          <View style={styles.mintContainer}>
            <Text style={styles.mintTitle}>
              Mint Your Pet First!
            </Text>
            <Text style={styles.mintSubtitle}>
              You need to mint your pet before you can access {screenName}.
            </Text>
            <GameButton
              title={isLoading ? 'Minting...' : 'Mint Pet'}
              onPress={handleMintPet}
              disabled={isLoading}
              variant="primary"
              size="medium"
            />
          </View>
        </View>
        
        <GameAlert
          visible={showAlert}
          title={alertConfig.title}
          message={alertConfig.message}
          icon={alertConfig.icon}
          iconType={alertConfig.iconType}
          buttons={alertConfig.buttons}
          onClose={() => setShowAlert(false)}
        />
      </>
    );
  }

  // Show actual content if pet is minted
  return <>{children}</>;
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
  },
  mintContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mintTitle: {
    fontSize: 32,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  mintSubtitle: {
    fontSize: 18,
    fontFamily: 'Blockblueprint',
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
}); 