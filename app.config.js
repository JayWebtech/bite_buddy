import 'dotenv/config';

export default {
  expo: {
    name: "bite_buddy",
    slug: "bite_buddy",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      }
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      OZ_ACCOUNT_CLASS_HASH: process.env.OZ_ACCOUNT_CLASS_HASH,
      STK_CONTRACT_ADDRESS: process.env.STK_CONTRACT_ADDRESS,
      MCP_PRIVATE_KEY: process.env.MCP_PRIVATE_KEY,
      STARKNET_RPC_URL: process.env.STARKNET_RPC_URL,
      BITEBUDDY_CONTRACT_ADDR: process.env.BITEBUDDY_CONTRACT_ADDR
    }
  }
}; 