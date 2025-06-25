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
  num,
  RPC,
  RpcProvider,
  shortString
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
  }

  // Setup wallet from seed phrase
  async setupWalletFromSeed(seedPhrase: string[], pin: string): Promise<WalletInfo> {
    const privateKey = await this.derivePrivateKeyFromSeed(seedPhrase);
    console.log("private key generated", privateKey)
    const publicKey = this.generateWalletAddress(privateKey);
    console.log("public key generated", publicKey)


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

    console.log("OZaccountConstructorCallData", OZaccountConstructorCallData)

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

        console.log('Biometric auth available:', biometricAuthAvailable);
        console.log('Saved biometrics:', savedBiometrics);
        console.log('Supported types:', supportedTypes);

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
      console.error('Authentication error:', error);
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
      console.error('Error getting wallet info:', error);
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

    console.log("OZ_ACCOUNT_CLASS_HASH", Constants.expoConfig?.extra?.OZ_ACCOUNT_CLASS_HASH!)

    try {
      const { transaction_hash } = await account.deployAccount({
        classHash: Constants.expoConfig?.extra?.OZ_ACCOUNT_CLASS_HASH!,
        constructorCalldata: [walletInfo?.OZaccountConstructorCallData!],
        addressSalt: walletInfo?.publicKey!,
      });

      const result = await this.provider.waitForTransaction(transaction_hash);
      await SecureStore.setItemAsync("is_account_deployed", 'true');
      const mintResult = await this.mintPet();

      if(mintResult) {
        return {
          result,
          transaction_hash,
        };
      } else {
        return {
          result: {
            statusReceipt: 'reverted',
            value: {
              error: 'Failed to mint pet. Please try again later.',
            },
          },
          error: 'Failed to mint pet. Please try again later.',
          errorType: 'MINT_PET_ERROR',
        };
      }
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
      console.error('Error checking biometric info:', error);
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
  async mintPet( pin?: string): Promise<{result: GetTransactionReceiptResponse, transaction_hash: string, message: string} | {result: any, error: string, errorType: string} | boolean> {
    try {
    const account = await this.initializeAccount(pin);
    const walletInfo = await this.getWalletInfo()!;
    const petData = JSON.parse(walletInfo?.petType!);

    const calls: Call[] = [
      {
        entrypoint: 'mint_pet',
        contractAddress: Constants.expoConfig?.extra?.BITEBUDDY_CONTRACT_ADDR,
        calldata: [shortString.encodeShortString(petData?.type!), shortString.encodeShortString(petData?.name!)],
      },
    ];

    const maxQtyGasAuthorized = 1800n;
      const maxPriceAuthorizeForOneGas = 20n * 10n ** 12n;
      console.log('max authorized cost =', maxQtyGasAuthorized * maxPriceAuthorizeForOneGas, 'FRI');
      const { transaction_hash: txH } = await account.execute(calls, {
        version: 3,
        //maxFee: 10 ** 15,
        //feeDataAvailabilityMode: RPC.EDataAvailabilityMode.L1,
        //tip: 10 ** 13,
        paymasterData: [],
        // resourceBounds: {
        //   l1_gas: {
        //     max_amount: num.toHex(maxQtyGasAuthorized),
        //     max_price_per_unit: num.toHex(maxPriceAuthorizeForOneGas),
        //   },
        //   l2_gas: {
        //     max_amount: num.toHex(0),
        //     max_price_per_unit: num.toHex(0),
        //   },
        // },
      });
      const txR = await this.provider.waitForTransaction(txH);
      if (txR.isSuccess()) {
        console.log("txR", txR)
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
        entrypoint: 'get_pet',
        calldata: [walletInfo.OZcontractAddress],
      };

      const result = await this.provider.callContract(call);

      console.log('Pet contract response:', result);

      return result;
    } catch (error) {
      console.error('Error fetching pet data:', error);
      throw error;
    }
  }

  // Feed pet with meal data from food analysis
  async feedPet(mealData: {
    energy_value: number;
    hunger_value: number; 
    happiness_value: number;
    timestamp: number;
  }, pin?: string): Promise<boolean> {
    try {
      const account = await this.initializeAccount(pin);
      const walletInfo = await this.getWalletInfo();

      if (!walletInfo?.OZcontractAddress) {
        throw new Error('No wallet address found');
      }

      const calls: Call[] = [
        {
          entrypoint: 'feed_pet',
          contractAddress: Constants.expoConfig?.extra?.BITEBUDDY_CONTRACT_ADDR,
          calldata: [
            walletInfo.OZcontractAddress,
            mealData.energy_value.toString(),
            '0', // energy_value high part (Uint256)
            mealData.hunger_value.toString(),
            '0', // hunger_value high part (Uint256)
            mealData.happiness_value.toString(),
            '0', // happiness_value high part (Uint256)
            mealData.timestamp.toString(),
          ],
        },
      ];

      const maxQtyGasAuthorized = 1800n;
      const maxPriceAuthorizeForOneGas = 20n * 10n ** 12n;

      const { transaction_hash: txH } = await account.execute(calls, {
        version: 3,
        // maxFee: 10 ** 15,
        // feeDataAvailabilityMode: RPC.EDataAvailabilityMode.L1,
        // tip: 10 ** 13,
        // paymasterData: [],
        // resourceBounds: {
        //   l1_gas: {
        //     max_amount: num.toHex(maxQtyGasAuthorized),
        //     max_price_per_unit: num.toHex(maxPriceAuthorizeForOneGas),
        //   },
        //   l2_gas: {
        //     max_amount: num.toHex(0),
        //     max_price_per_unit: num.toHex(0),
        //   },
        // },
      });

      const txR = await this.provider.waitForTransaction(txH);
      console.log('Feed pet transaction:', txR);
      
      return txR.isSuccess();
    } catch (error) {
      console.error('Error feeding pet:', error);
      return false;
    }
  }

  // Interact with pet (petting, playing) - batch multiple interactions
  async interactWithPet(interactions: {
    petting: number;
    playing: number; 
    feeding_interactions: number;
  }, pin?: string): Promise<boolean> {
    try {
      const account = await this.initializeAccount(pin);
      const walletInfo = await this.getWalletInfo();

      if (!walletInfo?.OZcontractAddress) {
        throw new Error('No wallet address found');
      }

      // For now, we'll simulate this as multiple feeding calls with small values
      // You might want to add a specific interaction method to your contract
      const calls: Call[] = [];

      // Add interaction effects as small meal data
      if (interactions.petting > 0) {
        calls.push({
          entrypoint: 'feed_pet',
          contractAddress: Constants.expoConfig?.extra?.BITEBUDDY_CONTRACT_ADDR,
          calldata: [
            walletInfo.OZcontractAddress,
            '0', '0', // energy_value (no energy from petting)
            '0', '0', // hunger_value (no hunger relief from petting)
            interactions.petting.toString(), '0', // happiness_value
            Math.floor(Date.now() / 1000).toString(),
          ],
        });
      }

      if (calls.length === 0) return true; // No interactions to process

      const maxQtyGasAuthorized = 2000n;
      const maxPriceAuthorizeForOneGas = 20n * 10n ** 12n;

      const { transaction_hash: txH } = await account.execute(calls, {
        version: 3,
        maxFee: 10 ** 15,
        feeDataAvailabilityMode: RPC.EDataAvailabilityMode.L1,
        tip: 10 ** 13,
        paymasterData: [],
        resourceBounds: {
          l1_gas: {
            max_amount: num.toHex(maxQtyGasAuthorized),
            max_price_per_unit: num.toHex(maxPriceAuthorizeForOneGas),
          },
          l2_gas: {
            max_amount: num.toHex(0),
            max_price_per_unit: num.toHex(0),
          },
        },
      });

      const txR = await this.provider.waitForTransaction(txH);
      return txR.isSuccess();
    } catch (error) {
      console.error('Error with pet interaction:', error);
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
        'petType'
      ];

      for (const key of keys) {
        await SecureStore.deleteItemAsync(key);
        console.log(`Cleared: ${key}`);
      }
      
      console.log('All SecureStore data cleared successfully');
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }
}

// Export singleton instance
export const walletManager = new BiteBuddyWallet(); 