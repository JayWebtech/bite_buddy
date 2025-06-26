import "@ethersproject/shims";
import { ethers } from 'ethers';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import {
  Account,
  byteArray,
  Call,
  CallData,
  constants,
  Contract,
  ec,
  GetTransactionReceiptResponse,
  hash,
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
  experience: number;
  health: number;
  energy: number;
  nutrition_score: number;
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

  async getPet(): Promise<PetData | null> {
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
      console.log("Raw contract response:", result);
      
      if (!result || result.length < 20) {
        console.log('Invalid response length:', result?.length);
        return null;
      }

      // Debug: log each field with its index
      console.log("Contract response breakdown:");
      result.forEach((field, index) => {
        console.log(`[${index}]: ${field} (hex: ${field}, decimal: ${parseInt(field, 16)})`);
      });

      // Parse Pet struct fields from contract response
      // Pet struct order: pet_id, owner, species, level, experience, health, energy, 
      // nutrition_score, evolution_stage, last_meal_timestamp, total_meals, 
      // battle_wins, battle_losses, created_at
      
      const petId = parseInt(result[0], 16).toString(); // pet_id
      const owner = result[2]; // owner (ContractAddress)
      const species = parseInt(result[3], 16); // species
      const level = parseInt(result[4], 16); // level
      const experience = parseInt(result[5], 16) + (parseInt(result[6], 16) << 128); // experience (u256)
      const health = parseInt(result[7], 16); // health
      const energy = parseInt(result[8], 16); // energy
      const nutrition_score = parseInt(result[9], 16) + (parseInt(result[10], 16) << 128); // nutrition_score (u256)
      
      const pet: PetData = {
        id: petId,
        type: species,
        name: this.getSpeciesName(species),
        level: level,
        experience: experience,
        health: health,
        energy: energy,
        nutrition_score: nutrition_score,
      };

      console.log("Parsed values:", {
        petId,
        species,
        level,
        experience,
        health,
        energy,
        nutrition_score,
        speciesName: this.getSpeciesName(species)
      });

      console.log("Parsed pet data:", pet);
      return pet;
    } catch (error) {
      console.log('Error fetching pet data:', error);
      return null;
    }
  }

  private getSpeciesName(species: number): string {
    switch(species) {
      case 1: return 'Veggie Fluffy';
      case 2: return 'Protein Sparkle'; 
      case 3: return 'Balance Thunder';
      case 4: return 'Balance Mystic';
      default: return 'Unknown Species';
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

      console.log('Feeding pet with meal data:', mealData);

      const petId = BigInt(mealData?.pet_id || 0);
      const low = petId & BigInt('0xffffffffffffffffffffffffffffffff');
      const high = petId >> BigInt(128);

      const calls: Call[] = [
        {
          entrypoint: 'scan_and_feed_meal',
          contractAddress: Constants.expoConfig?.extra?.BITEBUDDY_CONTRACT_ADDR,
          calldata: [
            low.toString(),           // pet_id: u256
            high.toString(),
            shortString.encodeShortString(mealData.meal_hash),                   // meal_hash: felt252
            mealData.calories.toString(),         // calories: u16
            mealData.protein.toString(),          // protein: u8
            mealData.carbs.toString(),            // carbs: u8
            mealData.fats.toString(),             // fats: u8
            mealData.vitamins.toString(),         // vitamins: u8
            mealData.minerals.toString(),         // minerals: u8
            mealData.fiber.toString(),            // fiber: u8
            byteArray.byteArrayFromString(mealData.ipfs_image_uri)
          ],
        },
      ];


      console.log('Contract call data:', calls[0].calldata);

      const { transaction_hash: txH } = await account.execute(calls, {
        version: 3,
      });

      console.log('Transaction hash:', txH);

      const txR = await this.provider.waitForTransaction(txH);
      console.log('Transaction result:', txR);
      
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

  // Get meals by pet ID from contract
  async getMealsByPet(petId: string): Promise<any[]> {
    try {
      const walletInfo = await this.getWalletInfo();
      
      if (!walletInfo?.OZcontractAddress) {
        throw new Error('No wallet address found');
      }

      // Convert pet ID to u256 format (low, high)
      const petIdBigInt = BigInt(petId);
      const low = petIdBigInt & BigInt('0xffffffffffffffffffffffffffffffff');
      const high = petIdBigInt >> BigInt(128);

      const call = {
        contractAddress: Constants.expoConfig?.extra?.BITEBUDDY_CONTRACT_ADDR,
        entrypoint: 'get_meals_by_pet',
        calldata: [low.toString(), high.toString()],
      };

      console.log('Getting meals for pet ID:', petId, 'calldata:', call.calldata);

      const result = await this.provider.callContract(call);
      console.log("Raw meals response:", result);
      
      if (!result || result.length === 0) {
        console.log('No meals found for pet');
        return [];
      }

      // Parse the meals array - this will depend on your contract's return format
      // For now, return the raw result for debugging
      return result;
    } catch (error) {
      console.log('Error fetching meals by pet:', error);
      return [];
    }
  }

  // Battle System Integration
  async initiateBattleVsComputer(petId: string, opponentId: number, pin?: string): Promise<string | null> {
    try {
      const contract_address = Constants.expoConfig?.extra?.BITEBUDDY_CONTRACT_ADDR;
      if (!contract_address) {
        throw new Error('BITEBUDDY_CONTRACT_ADDR environment variable is not set');
      }

      const account = await this.initializeAccount(pin);
      
      console.log(`Initiating battle: Pet ${petId} vs Computer Opponent ${opponentId}`);

      const petIdBigInt = BigInt(petId);
      const low = petIdBigInt & BigInt('0xffffffffffffffffffffffffffffffff');
      const high = petIdBigInt >> BigInt(128);

      console.log("low", low.toString());
      console.log("high", high.toString());
      console.log("opponentId", opponentId.toString());

      const calls: Call[] = [
        {
        contractAddress: Constants.expoConfig?.extra?.BITEBUDDY_CONTRACT_ADDR,
        entrypoint: 'initiate_battle_vs_computer',
        calldata: [low.toString(), high.toString(), opponentId.toString()],
        },
      ];

      const { transaction_hash: txH } = await account.execute(calls, {
        version: 3,
      });

      console.log('Transaction hash:', txH);

      const txR = await this.provider.waitForTransaction(txH);
      console.log('Transaction result:', txR);
      
      return txR.isSuccess() ? txH : null;
    } catch (error) {
      console.error('Error initiating battle vs computer:', error);
      return null;
    }
  }

  async executeBattleMove(battleId: string, selectedCards: number[], pin?: string): Promise<{
    success: boolean;
    winner?: string;
    battleLog?: string[];
    error?: string;
  }> {
    try {
      const contract_address = Constants.expoConfig?.extra?.BITEBUDDY_CONTRACT_ADDR;
      if (!contract_address) {
        throw new Error('BITEBUDDY_CONTRACT_ADDR environment variable is not set');
      }

      const account = await this.initializeAccount(pin);
      const { abi } = await this.provider.getClassAt(contract_address);
      const BiteBuddyContract = new Contract(abi, contract_address, account);

      console.log(`Executing battle move for battle ${battleId} with cards:`, selectedCards);

      // Create a mock session signature for now (in production, would need proper session key management)
      const mockSessionSignature = [account.address]; // Simplified session signature

      const calldata = CallData.compile({
        battle_id: battleId,
        challenger_cards: selectedCards,
        session_signature: mockSessionSignature
      });

      const result = await BiteBuddyContract.execute_battle_with_session(calldata);
      console.log('Battle execution result:', result);

      // Wait for transaction confirmation
      await this.provider.waitForTransaction(result.transaction_hash);

      // Get battle result from the transaction receipt or events
      const battleData = await this.getBattleResult(battleId);
      
      return {
        success: true,
        winner: battleData.winner,
        battleLog: battleData.battleLog || [`Battle executed with transaction: ${result.transaction_hash}`]
      };
    } catch (error) {
      console.error('Error executing battle move:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error executing battle move'
      };
    }
  }

  async getBattleResult(battleId: string): Promise<{
    battle: any;
    winner: string;
    isCompleted: boolean;
    battleLog?: string[];
  }> {
    try {
      const contract_address = Constants.expoConfig?.extra?.BITEBUDDY_CONTRACT_ADDR;
      if (!contract_address) {
        throw new Error('BITEBUDDY_CONTRACT_ADDR environment variable is not set');
      }

      const account = await this.initializeAccount();
      const { abi } = await this.provider.getClassAt(contract_address);
      const BiteBuddyContract = new Contract(abi, contract_address, account);

      const battle = await BiteBuddyContract.get_battle(battleId);
      console.log('Battle data:', battle);

      return {
        battle,
        winner: battle.winner?.toString() || '0',
        isCompleted: battle.completed || false,
        battleLog: battle.battleLog || []
      };
    } catch (error) {
      console.error('Error getting battle result:', error);
      return {
        battle: null,
        winner: '0',
        isCompleted: false,
        battleLog: ['Error fetching battle data']
      };
    }
  }

  async getComputerOpponent(opponentId: number): Promise<{
    id: string;
    name: string;
    level: number;
    health: number;
    species: number;
  } | null> {
    try {
      const contract_address = Constants.expoConfig?.extra?.BITEBUDDY_CONTRACT_ADDR;
      if (!contract_address) {
        throw new Error('BITEBUDDY_CONTRACT_ADDR environment variable is not set');
      }

      const call = {
        contractAddress: Constants.expoConfig?.extra?.BITEBUDDY_CONTRACT_ADDR,
        entrypoint: 'get_computer_opponent',
        calldata: [opponentId.toString()],
      };

      const opponent = await this.provider.callContract(call);
      console.log("Raw opponent response:", opponent);

      if (!opponent || opponent.length < 20 || opponent[0] === '0x0') {
        console.log(`⚠️ Contract opponent ${opponentId} not initialized or invalid response`);
        return null;
      }

      // Parse Pet struct fields based on Cairo contract definition:
      // pet_id: u256 (indices 0-1)
      // owner: ContractAddress (index 2) 
      // species: u8 (index 3)
      // level: u8 (index 4)
      // experience: u256 (indices 5-6)
      // health: u8 (index 7)
      // energy: u8 (index 8)
      // nutrition_score: u256 (indices 9-10)
      // evolution_stage: u8 (index 11)
      // last_meal_timestamp: u64 (index 12)
      // total_meals: u256 (indices 13-14)
      // battle_wins: u256 (indices 15-16)
      // battle_losses: u256 (indices 17-18)
      // created_at: u64 (index 19)

      const petId = BigInt(opponent[0] || '0x0').toString();
      const species = parseInt(opponent[3] || '0x1', 16);
      const level = parseInt(opponent[4] || '0x1', 16);
      const health = parseInt(opponent[7] || '0x64', 16); // Default 100 health
      
      console.log(`✅ Parsed opponent ${opponentId}: ID=${petId}, Level=${level}, Health=${health}, Species=${species}`);

      return {
        id: petId,
        name: this.getOpponentName(opponentId),
        level: level,
        health: health,
        species: species
      };
    } catch (error) {
      console.error('Error getting computer opponent:', error);
      return null;
    }
  }

  private getOpponentName(opponentId: number): string {
    const names = {
      1: 'Wild Pup',
      2: 'Forest Guardian', 
      3: 'Shadow Beast'
    };
    return names[opponentId as keyof typeof names] || `Opponent ${opponentId}`;
  }

  async createSessionKey(duration: number = 24, maxBattles: number = 10, pin?: string): Promise<boolean> {
    try {
      const account = await this.initializeAccount(pin);
      const contract_address = Constants.expoConfig?.extra?.BITEBUDDY_CONTRACT_ADDR;
      if (!contract_address) {
        throw new Error('BITEBUDDY_CONTRACT_ADDR environment variable is not set');
      }

      const { abi } = await this.provider.getClassAt(contract_address);
      const BiteBuddyContract = new Contract(abi, contract_address, account);

      // Generate session key pair
      const sessionPrivateKey = ec.starkCurve.utils.randomPrivateKey();
      const sessionPublicKey = ec.starkCurve.getStarkKey(sessionPrivateKey);

      const calldata = CallData.compile({
        session_public_key: sessionPublicKey,
        permissions: 1, // Battle permission
        duration_hours: duration,
        max_battles: maxBattles,
        max_energy_per_battle: 50
      });

      const result = await BiteBuddyContract.create_session_key(calldata);
      console.log('Session key creation result:', result);

      // Store session key securely
      await SecureStore.setItemAsync("session_private_key", sessionPrivateKey.toString());
      await SecureStore.setItemAsync("session_public_key", sessionPublicKey);
      
      await this.provider.waitForTransaction(result.transaction_hash);
      return true;
    } catch (error) {
      console.error('Error creating session key:', error);
      return false;
    }
  }
}

// Export singleton instance
export const walletManager = new BiteBuddyWallet();