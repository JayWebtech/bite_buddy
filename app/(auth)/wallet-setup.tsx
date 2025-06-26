import GameAlert from '@/components/ui/GameAlert';
import GameButton from '@/components/ui/GameButton';
import { Colors } from '@/constants/Colors';
import { WalletInfo, walletManager } from '@/utils/wallet';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Clipboard, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function WalletSetupScreen() {
  const router = useRouter();
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [balance, setBalance] = useState(0);
  const [biometricInfo, setBiometricInfo] = useState<{
    isAvailable: boolean;
    isEnrolled: boolean;
    primaryType: string;
  } | null>(null);

  useEffect(() => {
    loadWalletInfo();
    checkBiometricCapabilities();
  }, []);

  const checkBiometricCapabilities = async () => {
    try {
      const info = await walletManager.getBiometricInfo();
      setBiometricInfo(info);
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
    }
  };

  const loadWalletInfo = async () => {
    try {
      const info = await walletManager.getWalletInfo();
      setWalletInfo(info);
      checkBalance(info?.OZcontractAddress!);
    } catch (error) {
      console.error('Error loading wallet info:', error);
      showAlertMessage('Failed to load wallet information', 'error');
    }
  };

  const checkBalance = async (wallet_address: string | undefined) => {
    try {
      const bal = await walletManager.getBalance(wallet_address!);
      setBalance(bal);
    } catch (error) {
      console.error('Error checking balance:', error);
    }
  };

  const copyAddress = () => {
    if (walletInfo?.OZcontractAddress) {
      Clipboard.setString(walletInfo.OZcontractAddress);
      showAlertMessage('Address copied to clipboard!', 'success');
    }
  };

  const deployAccount = async () => {
    if (!walletInfo) return;

    setIsDeploying(true);
    try {
      // Use biometric authentication (Face ID/Touch ID) first, no PIN needed
      const response = await walletManager.deployAccount();
      
      // Check if the response contains an error
      if ('error' in response) {
        // Handle different error types
        let errorMessage = response.error;
        
        switch (response.errorType) {
          case 'INSUFFICIENT_BALANCE':
            errorMessage = 'Insufficient balance. Please fund your wallet first.';
            break;
          case 'INVALID_CLASS_HASH':
            errorMessage = 'Invalid class hash. Please contact support.';
            break;
          case 'NETWORK_ERROR':
            errorMessage = 'Network error. Please check your connection and try again.';
            break;
          case 'VALIDATION_ERROR':
            errorMessage = 'Validation failed. Please check your account details.';
            break;
          case 'GAS_ERROR':
            errorMessage = 'Gas estimation failed. Please try again later.';
            break;
          case 'NONCE_ERROR':
            errorMessage = 'Transaction nonce error. Please try again.';
            break;
          default:
            errorMessage = 'Deployment failed. Please try again later.';
        }
        
        showAlertMessage(errorMessage, 'error');
      } else {
        // Success case
        showAlertMessage(
          `Account deployed successfully! Transaction: ${response.transaction_hash.slice(0, 10)}...`, 
          'success'
        );
      
      // Refresh wallet info
      await loadWalletInfo();
      
      // Navigate to home after deployment
      setTimeout(() => {
        router.push('/(game)/(tabs)/home');
      }, 2000);
      }
    } catch (error) {
      console.error('Deployment error:', error);
      showAlertMessage('Failed to deploy account. Please try again.', 'error');
    } finally {
      setIsDeploying(false);
    }
  };

  const showAlertMessage = (message: string, type: 'success' | 'error') => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
  };

  if (!walletInfo) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </View>
    );
  }

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
          <Text style={styles.title}>Setup Your Wallet</Text>
          <Text style={styles.subtitle}>
            Fund your account and deploy to start playing
          </Text>
        </View>

        <LinearGradient
      colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']} style={styles.walletCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Your Starknet Wallet</Text>
          </View>
          
          <View style={styles.cardContent}>
            <View style={styles.addressSection}>
              <Text style={styles.label}>Wallet Address:</Text>
              <TouchableOpacity style={styles.addressContainer} onPress={copyAddress}>
                <Text style={styles.address}>
                  {`${walletInfo.OZcontractAddress?.slice(0, 10)}...${walletInfo.OZcontractAddress?.slice(-8)}`}
                </Text>
                <Text style={styles.copyIcon}>📋</Text>
              </TouchableOpacity>
              <Text style={styles.copyHint}>Tap to copy full address</Text>
            </View>

            <View style={styles.balanceSection}>
              <View style={styles.balanceHeader}>
              <Text style={styles.label}>Current Balance:</Text>
                <TouchableOpacity 
                  style={styles.refreshButton}
                  onPress={() => checkBalance(walletInfo?.OZcontractAddress || undefined)}
                >
                  <Ionicons name="refresh" size={18} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.balance}>{balance} STRK</Text>
            </View>

            <View style={styles.statusSection}>
              <Text style={styles.label}>Deployment Status:</Text>
              <View style={styles.statusIndicator}>
                <Text style={[
                  styles.statusText,
                  { color: walletInfo.isDeployed ? Colors.success : Colors.warning }
                ]}>
                  {walletInfo.isDeployed ? '✅ Deployed' : '⏳ Not Deployed'}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <LinearGradient
      colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']} style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Setup Instructions</Text>
          <View style={styles.steps}>
            <Text style={styles.step}>
              1. Send STRK to your wallet address above
            </Text>
            <Text style={styles.step}>
              2. Deploy your account contract
            </Text>
            <Text style={styles.step}>
              3. Start playing Bite Buddy!
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.actions}>
          {!walletInfo.isDeployed ? (
            <>
              <GameButton
                title={
                  isDeploying 
                    ? "Deploying..." 
                    : `Deploy with ${biometricInfo?.isEnrolled ? biometricInfo.primaryType : 'PIN'}`
                }
                onPress={deployAccount}
                variant="primary"
                disabled={isDeploying}
              />
              {biometricInfo?.isAvailable && biometricInfo?.isEnrolled && (
                <Text style={styles.biometricInfo}>
                  🔐 {biometricInfo.primaryType} authentication enabled
                </Text>
              )}
            </>
          ) : (
            <GameButton
              title="Continue to Game"
              onPress={() => router.push('/(game)/(tabs)/home')}
              variant="primary"
            />
          )}
        </View>
      </View>

      <GameAlert
        visible={showAlert}
        title={alertType === 'success' ? 'Success!' : 'Error'}
        iconType="image"
        message={alertMessage}
        onClose={() => setShowAlert(false)}
        icon={alertType === 'success' ? 'success' : 'error'}
      />
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
    padding: 24,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Blockblueprint',
    color: Colors.text,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 34,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 22,
  },
  walletCard: {
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
  },
  cardContent: {
    padding: 20,
  },
  addressSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Blockblueprint',
    color: '#fff',
    marginBottom: 8,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  address: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Blockblueprint',
    color: Colors.text,
  },
  copyIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  copyHint: {
    fontSize: 12,
    fontFamily: 'Blockblueprint',
    color: '#fff',
    marginTop: 4,
  },
  balanceSection: {
    marginBottom: 20,
  },
  balance: {
    fontSize: 20,
    fontFamily: 'Blockblueprint',
    color: Colors.primary,
  },
  statusSection: {
    marginBottom: 10,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontFamily: 'Blockblueprint',
  },
  instructionsCard: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  instructionsTitle: {
    fontSize: 16,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  steps: {
    gap: 8,
  },
  step: {
    fontSize: 14,
    fontFamily: 'Blockblueprint',
    color: '#fff',
    lineHeight: 20,
  },
  actions: {
    gap: 16,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    fontFamily: 'Blockblueprint',
    color: '#8A8A8A',
    textDecorationLine: 'underline',
  },
  biometricInfo: {
    fontSize: 14,
    fontFamily: 'Blockblueprint',
    color: Colors.primary,
    textAlign: 'center',
    marginTop: 8,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  refreshButton: {
    padding: 4,
    borderRadius: 4,
  },
  refreshIcon: {
    fontSize: 16,
    color: Colors.primary,
  },
}); 