# 🎮 Bite Buddy - NFT Pet Game

A React Native Expo app with Starknet integration where users scan meals to feed digital NFT pets. Pets evolve based on nutrition quality, and users can battle other pets in a card-style format.

## 🌟 Core Features

- **📱 Meal Scanning**: Snap photos of meals for AI-powered nutrition analysis
- **🐕 NFT Pets**: Mint and care for digital pets stored on Starknet
- **⚔️ Pet Battles**: Card-style combat system where food = energy
- **🔐 Secure Wallet**: Hardware-encrypted storage with biometric authentication
- **🥗 Nutrition Analysis**: MCP server integration for intelligent food scoring
- **🎯 Gamification**: XP, levels, achievements, and pet evolution

## 🚀 Technology Stack

### Frontend
- **React Native** with Expo Router
- **TypeScript** for type safety
- **Expo Secure Store** for encrypted key management
- **Lottie React Native** for animations
- **Starknet.js** for blockchain integration

### Backend
- **Node.js** with Express
- **Supabase** for database management
- **Socket.io** for real-time battles
- **Sharp** for image processing
- **Multer** for file uploads

### Blockchain
- **Starknet** for NFT contracts and state management
- **Cairo** smart contracts for pet minting and feeding
- **ZK-proofs** for meal verification

## 📱 App Flow

```
Splash → Onboarding (Seed Phrase) → PIN Setup → Pet Selection → Wallet Setup → Game
```

### Authentication Flow
1. **Seed Phrase Generation**: 12-word mnemonic using ethers.js
2. **PIN Security**: 6-digit PIN with biometric fallback
3. **Wallet Creation**: Starknet account derivation from seed
4. **Secure Storage**: Hardware-encrypted storage of credentials

### Game Flow
1. **Pet Minting**: Create NFT pets on Starknet
2. **Meal Scanning**: Camera integration with MCP analysis
3. **Pet Feeding**: Update on-chain stats based on nutrition
4. **Battle System**: Match players for card-style combat

## 🔧 Setup Instructions

### Prerequisites
- Node.js 18+
- Expo CLI
- iOS Simulator or Android Emulator
- Supabase account
- Starknet testnet setup

### Installation

1. **Install dependencies**
   ```bash
   npm install
   cd backend && npm install
   ```

2. **Environment Setup**
   ```bash
   # Backend environment
   cp backend/.env.example backend/.env
   # Fill in your Supabase credentials and API keys
   ```

3. **Start the development servers**
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev
   
   # Terminal 2: Frontend
   npx expo start
   ```

## 🏗️ Project Structure

```
bite_buddy/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Authentication screens
│   │   ├── splash.tsx
│   │   ├── onboarding.tsx
│   │   ├── pin.tsx
│   │   ├── pet-selection.tsx
│   │   └── wallet-setup.tsx
│   └── (game)/            # Game screens
│       └── (tabs)/        # Bottom navigation
├── backend/               # Node.js backend
├── contracts/             # Cairo smart contracts
├── components/            # React components
├── utils/                 # Utility functions
└── constants/            # App constants
```

## 🔐 Security Features

### Wallet Security
- **Hardware Encryption**: Expo Secure Store with device keychain
- **Biometric Authentication**: Face ID/Touch ID integration
- **PIN Protection**: 6-digit PIN with retry limits
- **Secure Key Derivation**: PBKDF2 with device-specific salt

## 🎮 Game Mechanics

### Pet Stats System
- **Energy**: Determines battle power and activity level
- **Hunger**: Affects pet mood and performance
- **Happiness**: Influences XP gain and evolution
- **Level**: Unlocks new abilities and increases battle power

### Nutrition Analysis
The MCP server analyzes meal images and returns:
- **Energy Value** (0-100): How energizing the food is
- **Hunger Value** (0-100): How filling the meal is
- **Happiness Value** (0-100): How much the pet enjoys it

## 🧪 Testing

### Frontend Testing
```bash
npx expo start
```

### Backend Testing
```bash
cd backend && npm run dev
```

### Contract Testing
```bash
cd contracts && scarb test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to branch
5. Submit a pull request

---

**Built with ❤️ for the Starknet ecosystem**
