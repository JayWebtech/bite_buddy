import "@ethersproject/shims";
import { ethers } from 'ethers';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import {
  Account,
  Call,
  CallData,
  constants,
  ec,
  GetTransactionReceiptResponse,
  hash,
  RpcProvider
} from 'starknet';

export interface WalletInfo {
  isDeployed: boolean;
  publicKey: string | null;
  OZcontractAddress: string | null;
  OZaccountConstructorCallData: string | null;
  petType: string | null;
}

export interface PetData {
  id: string;
  type: number;
  name: string;
  level: number;
  energy: number;
  hunger: number;
  happiness: number;
}

export class BiteBuddyWallet {
  private provider: RpcProvider;
  private account: Account | null = null;

  constructor() {
    this.provider = new RpcProvider({ nodeUrl: Constants.expoConfig?.extra?.STARKNET_RPC_URL });
  }

  // Generate seed phrase using ethers
  generateSeedPhrase(): string[] {
    const wallet = ethers.Wallet.createRandom();
    return wallet.mnemonic!.phrase.split(' ');
  }

  // Derive Starknet private key from seed phrase
  async derivePrivateKeyFromSeed(seedPhrase: string[]): Promise<string> {
    console.log("seedPhrase from wallet.ts", seedPhrase);
    const mnemonicPhrase = seedPhrase.join(' ');
    const wallet = ethers.Wallet.fromPhrase(mnemonicPhrase);
    
    // Use ethers private key as entropy for Starknet key
    const entropy = wallet.privateKey.slice(2); // Remove 0x prefix
    // Simple deterministic key derivation
    const combined = entropy + 'starknet';
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      combined
    );
    
    console.log("hash from wallet.ts", hash);
    
    // Convert hex hash to valid Starknet private key
    const privateKeyHex = '0x' + hash.slice(0, 64);
    const privateKeyBN = BigInt(privateKeyHex);
    const starknetOrder = BigInt('0x800000000000011000000000000000000000000000000000000000000000001');

    if (privateKeyBN >= starknetOrder) {
      // Use modulo operation to ensure key is within valid range
      const validKey = (privateKeyBN % starknetOrder).toString(16);
      return '0x' + validKey.padStart(64, '0');
    }

    return privateKeyHex;
  }

  // Generate wallet address from private key
  generateWalletAddress(privateKey: string): any {
    try {
    const publicKey = ec.starkCurve.getStarkKey(privateKey);
    return '0x' + publicKey.slice(2, 66);
    } catch (error) {
      console.log(error)
    }
  }

  // Store wallet data securely
  async storeWalletSecurely(
    privateKey: string,
    publicKey: string,
    pin: string,
    OZcontractAddress: string,
    OZaccountConstructorCallData: string
  ): Promise<void> {
    // Hash the PIN
    const pinHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pin
    );

    await SecureStore.setItemAsync("private_key", privateKey);
    await SecureStore.setItemAsync("pin", pinHash);
    await SecureStore.setItemAsync("public_key", publicKey);
    await SecureStore.setItemAsync("is_account_deployed", 'false');
    await SecureStore.setItemAsync("OZcontractAddress", OZcontractAddress);
    await SecureStore.setItemAsync("OZaccountConstructorCallData", OZaccountConstructorCallData);
    await SecureStore.setItemAsync("is_minted", 'false');
  }

  // Setup wallet from seed phrase
  async setupWalletFromSeed(seedPhrase: string[], pin: string): Promise<WalletInfo> {
    const privateKey = await this.derivePrivateKeyFromSeed(seedPhrase);
    const publicKey = this.generateWalletAddress(privateKey);


    const OZaccountClassHash = Constants.expoConfig?.extra?.OZ_ACCOUNT_CLASS_HASH;
    console.log("OZaccountClassHash", OZaccountClassHash)
    if (!OZaccountClassHash) {
      throw new Error(
        'OZ_ACCOUNT_CLASS_HASH environment variable is not set'
      );
    }

    const OZaccountConstructorCallData = CallData.compile({
      publicKey: publicKey,
    });

    const OZcontractAddress = hash.calculateContractAddressFromHash(
      publicKey,
      OZaccountClassHash,
      OZaccountConstructorCallData,
      0
    );

    await this.storeWalletSecurely(privateKey, publicKey, pin, OZcontractAddress, OZaccountConstructorCallData.toString());

    return {
      isDeployed: false,
      publicKey,
      OZcontractAddress,
      OZaccountConstructorCallData: OZaccountConstructorCallData.toString(),
      petType: null
    };
  }

  // Authenticate using PIN or biometrics
  async authenticate(pin?: string, useBiometrics = true): Promise<boolean> {
    try {
      // Check if biometric authentication is available and should be used
      if (useBiometrics && !pin) {
      const biometricAuthAvailable = await LocalAuthentication.hasHardwareAsync();
      const savedBiometrics = await LocalAuthentication.isEnrolledAsync();
        const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

        if (biometricAuthAvailable && savedBiometrics) {
          // Determine the prompt message based on available biometric types
          let promptMessage = 'Authenticate to access your wallet';
          if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            promptMessage = 'Use Face ID to access your wallet';
          } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            promptMessage = 'Use Touch ID to access your wallet';
          }

        const result = await LocalAuthentication.authenticateAsync({
            promptMessage,
          fallbackLabel: 'Use PIN instead',
            disableDeviceFallback: false, // Allow device fallback (iPhone PIN)
            cancelLabel: 'Cancel',
        });

        if (result.success) {
          return true;
          } else {
            console.log('Biometric authentication failed or cancelled:', result.error);
            return false;
          }
        }
      }

      // Fallback to PIN authentication
      if (pin) {
        const storedPinHash = await SecureStore.getItemAsync("pin");
        const pinHash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          pin
        );
        
        return storedPinHash === pinHash;
      }

      return false;
    } catch (error) {
      console.log('Authentication error:', error);
      return false;
    }
  }

  // Get wallet info
  async getWalletInfo(): Promise<WalletInfo | null> {
    try {
      const isDeployed = await SecureStore.getItemAsync("is_account_deployed") === 'true';
      console.log("isDeployed", isDeployed)
      const publicKey = await SecureStore.getItemAsync("public_key");
      const OZcontractAddress = await SecureStore.getItemAsync("OZcontractAddress");
      const OZaccountConstructorCallData = await SecureStore.getItemAsync("OZaccountConstructorCallData");
      const petType = await SecureStore.getItemAsync("pet_type")

      return {isDeployed, publicKey, OZcontractAddress, OZaccountConstructorCallData, petType};
    } catch (error) {
      console.log('Error getting wallet info:', error);
      return null;
    }
  }

  // Get private key (requires authentication)
  async getPrivateKey(pin?: string): Promise<string | null> {
    const isAuthenticated = await this.authenticate(pin);
    if (!isAuthenticated) {
      throw new Error('Authentication failed');
    }

    return await SecureStore.getItemAsync("private_key");
  }

  // Initialize account for transactions
  async initializeAccount(pin?: string): Promise<Account> {
    const privateKey = await this.getPrivateKey(pin);
    const walletInfo = await this.getWalletInfo();

    if (!privateKey || !walletInfo) {
      throw new Error('Wallet not initialized');
    }

    this.account = new Account(
      this.provider,
      walletInfo.OZcontractAddress!,
      privateKey,
      undefined,
      constants.TRANSACTION_VERSION.V3
    );

    return this.account;
  }

  // Deploy account contract (simplified)
  async deployAccount(pin?: string): Promise<{result: GetTransactionReceiptResponse, transaction_hash: string} | {result: any, error: string, errorType: string}> {
    const account = await this.initializeAccount(pin);
    const walletInfo = await this.getWalletInfo()!;

    try {
      const { transaction_hash } = await account.deployAccount({
        classHash: Constants.expoConfig?.extra?.OZ_ACCOUNT_CLASS_HASH!,
        constructorCalldata: [walletInfo?.OZaccountConstructorCallData!],
        addressSalt: walletInfo?.publicKey!,
      });

      const result = await this.provider.waitForTransaction(transaction_hash);
      await SecureStore.setItemAsync("is_account_deployed", 'true');
    
      return {
        result,
        transaction_hash,
      };
    } catch (error) {
      console.log('Deploy account error:', error);

      // Handle specific error cases
      if (error instanceof Error) {
        const errorMessage = error.message || '';
        const errorData = (error as any).data || '';

        // Check for insufficient balance error
        if (
          errorMessage.includes('exceed balance') ||
          errorData.includes('exceed balance') ||
          errorMessage.includes('insufficient funds') ||
          errorData.includes('insufficient funds') ||
          errorMessage.includes('balance (0)')
        ) {
          return {
            result: {
              statusReceipt: 'reverted',
              value: {
                error: 'Account not yet funded. Please fund your wallet address before deploying.',
              },
            },
            error:
              'Account not yet funded. Please fund your wallet address before deploying.',
            errorType: 'INSUFFICIENT_BALANCE',
          };
        }

        // Check for invalid class hash error
        if (
          errorMessage.includes('class hash') ||
          errorData.includes('class hash')
        ) {
          return {
            result: {
                statusReceipt: 'reverted',
              value: {
                error: 'Invalid account class hash. Please check your configuration.',
              },
            },
            error:
              'Invalid account class hash. Please check your configuration.',
            errorType: 'INVALID_CLASS_HASH',
          };
        }

        // Check for network/RPC errors
        if (
          errorMessage.includes('network') ||
          errorMessage.includes('connection') ||
          errorMessage.includes('timeout')
        ) {
          return {
            result: {
              statusReceipt: 'reverted',
              value: {
                error: 'Network error. Please try again later.',
              },
            },
            error: 'Network error. Please try again later.',
            errorType: 'NETWORK_ERROR',
          };
        }

        // Check for transaction validation errors
        if (
          errorMessage.includes('validation') ||
          errorMessage.includes('invalid')
        ) {
          return {
            result: {
              statusReceipt: 'reverted',
              value: {
                error: 'Transaction validation failed. Please check your account details.',
              },
            },
            error:
              'Transaction validation failed. Please check your account details.',
            errorType: 'VALIDATION_ERROR',
          };
        }

        // Check for gas estimation errors
        if (errorMessage.includes('gas') || errorData.includes('gas')) {
    return {
            result: {
              statusReceipt: 'reverted',
              value: {
                error: 'Gas estimation failed. Please try again later.',
              },
            },
            error: 'Gas estimation failed. Please try again later.',
            errorType: 'GAS_ERROR',
          };
        }

        // Check for nonce errors
        if (errorMessage.includes('nonce') || errorData.includes('nonce')) {
    return {
            result: {
              statusReceipt: 'reverted',
              value: {
                error: 'Nonce error. Please try again later.',
              },
            },
            error: 'Nonce error. Please try again later.',
            errorType: 'NONCE_ERROR',
          };
        }
      }

      // Generic error for unknown cases
      return {
        result: {
          statusReceipt: 'reverted',
          value: {
            error: 'Failed to deploy account. Please try again later.',
          },
        },
        error: 'Failed to deploy account. Please try again later.',
        errorType: 'UNKNOWN_ERROR',
      };
  
    }

  }

  // Check if wallet exists
  async walletExists(): Promise<boolean> {
    const address = await SecureStore.getItemAsync("public_key");
    return !!address;
  }

  // Check if pet is minted
  async isMinted(): Promise<boolean> {
    try {
      const isMinted = await SecureStore.getItemAsync("is_minted");
      return isMinted === 'true';
    } catch (error) {
      console.log('Error checking mint status:', error);
      return false;
    }
  }

  // Check biometric capabilities
  async getBiometricInfo(): Promise<{
    isAvailable: boolean;
    isEnrolled: boolean;
    supportedTypes: any[];
    primaryType: string;
  }> {
    try {
      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      let primaryType = 'PIN';
      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        primaryType = 'Face ID';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        primaryType = 'Touch ID';
      }

      return {
        isAvailable,
        isEnrolled,
        supportedTypes,
        primaryType
      };
    } catch (error) {
      console.log('Error checking biometric info:', error);
      return {
        isAvailable: false,
        isEnrolled: false,
        supportedTypes: [],
        primaryType: 'PIN'
      };
    }
  }

  // Get balance (mock for demo)
  async getBalance(wallet_address: string): Promise<any> {
    try {
      if (!Constants.expoConfig?.extra?.STK_CONTRACT_ADDRESS) {
        throw new Error('STK_CONTRACT_ADDRESS environment variable is not set');
      }
  
      const call = {
        entrypoint: 'balanceOf',
        contractAddress: Constants.expoConfig?.extra?.STK_CONTRACT_ADDRESS,
        calldata: [wallet_address],
      };

      console.log(call);
  
      // Use callContract for read-only operations
      const result = await this.provider.callContract(call);

      console.log(result)
  
      // The balance is returned as a Uint256 (low, high)
      // result[0] is the low part, result[1] is the high part
      const low = BigInt(result[0]);
      const high = BigInt(result[1]);
  
      // Combine low and high to get the full balance
      const balance = low + (high << 128n);
  
      // Convert to human readable format (assuming 18 decimals like STRK)
      const balanceInEther = Number(balance) / 10 ** 18;
      console.log('Balance in STRK:', balanceInEther);
  
      return balanceInEther;
    } catch (error) {
      console.log("Balance error",error)
    }
  }
  async mintPet(pin?: string): Promise<{result: GetTransactionReceiptResponse, transaction_hash: string, message: string} | {result: any, error: string, errorType: string} | boolean> {
    
    try {
    const account = await this.initializeAccount(pin);
    const walletInfo = await this.getWalletInfo()!;
    const petData = JSON.parse(walletInfo?.petType!);

    const calls: Call[] = [
      {
        entrypoint: 'mint_pet',
        contractAddress: Constants.expoConfig?.extra?.BITEBUDDY_CONTRACT_ADDR,
        calldata: [petData?.id!],
      },
    ];

      const { transaction_hash: txH } = await account.execute(calls, {
        version: 3,
        paymasterData: [],
      });
      const txR = await this.provider.waitForTransaction(txH);
      if (txR.isSuccess()) {
        console.log("txR", txR)
        // Set minted status to true after successful minting
        await SecureStore.setItemAsync("is_minted", 'true');
        return true;
      } else { 
        return false;
      }
    } catch (error) {
      console.log('Mint pet error:', error);
      return {
        result: {
          statusReceipt: 'reverted',
          value: {
            error: 'Failed to mint pet. Please try again later.',
          },
        },
        error: 'Failed to mint pet. Please try again later.',
        errorType: 'UNKNOWN_ERROR',
      };
    }
  }

  async getPet(): Promise<any> {
    try {
      const walletInfo = await this.getWalletInfo();
      
      if (!walletInfo?.OZcontractAddress) {
        throw new Error('No wallet address found');
      }

      const call = {
        contractAddress: Constants.expoConfig?.extra?.BITEBUDDY_CONTRACT_ADDR,
        entrypoint: 'get_pets_by_owner',
        calldata: [walletInfo.OZcontractAddress],
      };

      const result = await this.provider.callContract(call);
      console.log("result", result)
      return result;
    } catch (error) {
      console.log('Error fetching pet data class:', error);
      throw error;
    }
  }

  // Feed pet with meal data from food analysis
  async feedPet(mealData: {
    pet_id: number,
    meal_hash: string,
    calories: number,
    protein: number,
    carbs: number,
    fats: number,
    vitamins: number,
    minerals: number,
    fiber: number,
    ipfs_image_uri: string,
  }, pin?: string): Promise<boolean> {
    try {
      const account = await this.initializeAccount(pin);
      const walletInfo = await this.getWalletInfo();

      if (!walletInfo?.OZcontractAddress) {
        throw new Error('No wallet address found');
      }

      const calls: Call[] = [
        {
          entrypoint: 'scan_and_feed_meal',
          contractAddress: Constants.expoConfig?.extra?.BITEBUDDY_CONTRACT_ADDR,
          calldata: [
            mealData.pet_id,
            mealData.meal_hash,
            mealData.calories,
            mealData.protein,
            mealData.carbs,
            mealData.fats,
            mealData.vitamins,
            mealData.minerals,
            mealData.fiber,
            mealData.ipfs_image_uri,
          ],
        },
      ];

      const { transaction_hash: txH } = await account.execute(calls, {
        version: 3,
      });

      const txR = await this.provider.waitForTransaction(txH);
      return txR.isSuccess();
    } catch (error) {
      console.log('Error feeding pet:', error);
      return false;
    }
  }

  // Debug method to clear all stored data
  async clearAllData(): Promise<void> {
    try {
      const keys = [
        'private_key',
        'pin',
        'public_key',
        'is_account_deployed',
        'OZcontractAddress',
        'OZaccountConstructorCallData',
        'petType',
        'is_minted'
      ];

      for (const key of keys) {
        await SecureStore.deleteItemAsync(key);
        console.log(`Cleared: ${key}`);
      }
      
      console.log('All SecureStore data cleared successfully');
    } catch (error) {
      console.log('Error clearing data:', error);
    }
  }
}

// Export singleton instance
export const walletManager = new BiteBuddyWallet(); 