import GameAlert from '@/components/ui/GameAlert';
import GameButton from '@/components/ui/GameButton';
import { Colors } from '@/constants/Colors';
import { WalletInfo, walletManager } from '@/utils/wallet';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { Alert, Clipboard, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface ProfileData {
  walletInfo: WalletInfo | null;
  balance: string;
  privateKey: string | null;
}

export default function ProfileScreen() {
  const [isClearing, setIsClearing] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    walletInfo: null,
    balance: '0',
    privateKey: null
  });
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAlert, setShowAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon: string;
  }>({
    visible: false,
    title: '',
    message: '',
    icon: ''
  });

  // Load wallet information
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setIsLoading(true);
      const walletInfo = await walletManager.getWalletInfo();
      
      let balance = '0';
      if (walletInfo?.OZcontractAddress) {
        try {
          const balanceResult = await walletManager.getBalance(walletInfo.OZcontractAddress);
          balance = balanceResult || '0';
        } catch (error) {
          console.log('Error fetching balance:', error);
        }
      }

      setProfileData({
        walletInfo,
        balance,
        privateKey: null
      });
    } catch (error) {
      console.error('Error loading profile data:', error);
      setShowAlert({
        visible: true,
        title: 'Error',
        message: 'Failed to load profile data',
        icon: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      Clipboard.setString(text);
      setShowAlert({
        visible: true,
        title: 'Copied!',
        message: `${label} copied to clipboard`,
        icon: 'success'
      });
    } catch (error) {
      setShowAlert({
        visible: true,
        title: 'Error',
        message: 'Failed to copy to clipboard',
        icon: 'error'
      });
    }
  };

  const handleRevealPrivateKey = () => {
    setPinModalVisible(true);
    setPin('');
  };

  const authenticateAndShowPrivateKey = async () => {
    try {
      const privateKey = await walletManager.getPrivateKey(pin);
      if (privateKey) {
        setProfileData(prev => ({ ...prev, privateKey }));
        setShowPrivateKey(true);
        setPinModalVisible(false);
        setPin('');
        setShowAlert({
          visible: true,
          title: '🔐 Private Key Revealed',
          message: 'Your private key is now visible. Keep it safe and never share it!',
          icon: '🔐'
        });
      } else {
        setShowAlert({
          visible: true,
          title: 'Authentication Failed',
          message: 'Invalid PIN or authentication failed',
          icon: 'error'
        });
      }
    } catch (error) {
      setShowAlert({
        visible: true,
        title: 'Authentication Failed',
        message: 'Invalid PIN or authentication failed',
        icon: 'error'
      });
    }
  };

  const hidePrivateKey = () => {
    setShowPrivateKey(false);
    setProfileData(prev => ({ ...prev, privateKey: null }));
  };

  const handleClearData = async () => {
    Alert.alert(
      'Clear All Data',
      'This will clear all stored wallet data including your private key. You will need to set up your wallet again. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsClearing(true);
              await walletManager.clearAllData();
              Alert.alert('Success', 'All data cleared successfully. Please restart the app.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data. Please try again.');
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  const formatAddress = (address: string | null): string => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const WalletInfoCard = ({ title, value, onCopy, isPrivate = false }: {
    title: string;
    value: string | null;
    onCopy: () => void;
    isPrivate?: boolean;
  }) => (
    <View style={styles.infoCard}>
      <View style={styles.infoHeader}>
        <Text style={styles.infoTitle}>{title}</Text>
        <TouchableOpacity onPress={onCopy} style={styles.copyButton}>
          <Ionicons name="copy-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.infoValue, isPrivate && styles.privateValue]}>
        {value || 'N/A'}
      </Text>
      {title === 'Contract Address' && value && (
        <Text style={styles.infoSubtext}>
          Short: {formatAddress(value)}
        </Text>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.wrapper}>
        <Image
          source={require('@/assets/images/bg_screen_2.png')}
          style={styles.backgroundImage}
          contentFit="cover"
        />
        <View style={styles.darkOverlay} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Profile...</Text>
        </View>
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
      
      <View style={styles.darkOverlay} />
      
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Wallet Profile</Text>
          <Text style={styles.subtitle}>Your secure wallet information</Text>
        </View>

        <View style={styles.content}>

          {/* Wallet Information */}
          <View style={styles.walletSection}>
            <Text style={styles.sectionTitle}>Wallet Information</Text>
            
            <WalletInfoCard
              title="Contract Address"
              value={profileData.walletInfo?.OZcontractAddress || null}
              onCopy={() => copyToClipboard(profileData.walletInfo?.OZcontractAddress || '', 'Contract Address')}
            />

            <WalletInfoCard
              title="Public Key"
              value={profileData.walletInfo?.publicKey || null}
              onCopy={() => copyToClipboard(profileData.walletInfo?.publicKey || '', 'Public Key')}
            />

            <WalletInfoCard
              title="Balance"
              value={`${profileData.balance} STRK`}
              onCopy={() => copyToClipboard(profileData.balance, 'Balance')}
            />
          </View>

          {/* Private Key Section */}
          <View style={styles.privateSection}>
            <Text style={styles.sectionTitle}>Private Key</Text>
            <Text style={styles.warningText}>
              ⚠️ Never share your private key with anyone!
            </Text>
            
            {!showPrivateKey ? (
              <GameButton
                title="Reveal Private Key"
                variant="secondary"
                onPress={handleRevealPrivateKey}
              />
            ) : (
              <View>
                <WalletInfoCard
                  title="Private Key"
                  value={profileData.privateKey}
                  onCopy={() => copyToClipboard(profileData.privateKey || '', 'Private Key')}
                  isPrivate={true}
                />
                <GameButton
                  title="Hide Private Key"
                  variant="danger"
                  onPress={hidePrivateKey}
                  style={styles.hideButton}
                />
              </View>
            )}
          </View>

          {/* Actions Section */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Actions</Text>
            
            <View style={styles.actionButtonsRow}>
              <GameButton
                title="Refresh Data"
                variant="primary"
                onPress={loadProfileData}
                style={styles.actionButton}
              />

              <GameButton
                title={isClearing ? 'Clearing...' : 'Clear All Data'}
                variant="danger"
                onPress={handleClearData}
                disabled={isClearing}
                style={styles.actionButton}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* PIN Modal */}
      <Modal
        visible={pinModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter PIN</Text>
            <Text style={styles.modalSubtitle}>
              Enter your PIN to reveal private key
            </Text>
            
            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={setPin}
              placeholder="Enter PIN"
              placeholderTextColor="#999"
              secureTextEntry
              maxLength={6}
              keyboardType="numeric"
            />
            
            <View style={styles.modalButtons}>
              <GameButton
                title="Cancel"
                variant="secondary"
                onPress={() => {
                  setPinModalVisible(false);
                  setPin('');
                }}
                style={styles.modalButton}
              />
              <GameButton
                title="Verify"
                variant="primary"
                onPress={authenticateAndShowPrivateKey}
                disabled={pin.length < 4}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Alert */}
      <GameAlert
        visible={showAlert.visible}
        title={showAlert.title}
        message={showAlert.message}
        icon='success'
        iconType='image'
        onClose={() => setShowAlert(prev => ({ ...prev, visible: false }))}
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
  },
  header: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 20,
    marginBottom: 40,
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
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  statusSection: {
    marginBottom: 20,
  },
  statusBadge: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.warning,
  },
  statusText: {
    fontSize: 18,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  walletSection: {
    marginBottom: 20,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
  },
  infoValue: {
    fontSize: 16,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
  },
  privateValue: {
    color: Colors.warning,
  },
  infoSubtext: {
    fontSize: 14,
    fontFamily: 'Blockblueprint',
    color: '#B0B0B0',
    marginTop: 4,
  },
  copyButton: {
    padding: 8,
  },
  privateSection: {
    marginBottom: 5,
    width: '100%',
  },
  warningText: {
    fontSize: 14,
    fontFamily: 'Blockblueprint',
    color: Colors.warning,
    marginBottom: 5,
  },
  actionsSection: {
    marginTop: 10,
    marginBottom: 50,
    width: '100%',
  },
  actionButton: {
    flex: 1,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  modalContent: {
    backgroundColor: Colors.background,
    padding: 20,
    borderRadius: 8,
    width: '90%',
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  modalSubtitle: {
    fontSize: 16,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  pinInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    color: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Blockblueprint',
    color: '#FFFFFF',
  },
  hideButton: {
    marginTop: 16,
  },
}); 