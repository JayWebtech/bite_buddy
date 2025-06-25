import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Public client for general operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for service-level operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Database schema for Bite Buddy
export const initializeDatabase = async () => {
  try {
    // Create users table
    const { error: usersError } = await supabaseAdmin.rpc('create_users_table');
    if (usersError && !usersError.message.includes('already exists')) {
      console.error('Error creating users table:', usersError);
    }

    // Create pets table
    const { error: petsError } = await supabaseAdmin.rpc('create_pets_table');
    if (petsError && !petsError.message.includes('already exists')) {
      console.error('Error creating pets table:', petsError);
    }

    // Create meals table
    const { error: mealsError } = await supabaseAdmin.rpc('create_meals_table');
    if (mealsError && !mealsError.message.includes('already exists')) {
      console.error('Error creating meals table:', mealsError);
    }

    // Create battles table
    const { error: battlesError } = await supabaseAdmin.rpc('create_battles_table');
    if (battlesError && !battlesError.message.includes('already exists')) {
      console.error('Error creating battles table:', battlesError);
    }

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// SQL functions for database setup
export const createTableFunctions = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      wallet_address TEXT UNIQUE NOT NULL,
      public_key TEXT NOT NULL,
      username TEXT,
      is_account_deployed BOOLEAN DEFAULT FALSE,
      deployment_tx_hash TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
  `,
  
  pets: `
    CREATE TABLE IF NOT EXISTS pets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      token_id BIGINT UNIQUE NOT NULL,
      owner_address TEXT NOT NULL,
      pet_type INTEGER NOT NULL,
      name TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      xp BIGINT DEFAULT 0,
      energy INTEGER DEFAULT 100,
      hunger INTEGER DEFAULT 100,
      happiness INTEGER DEFAULT 100,
      last_fed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      total_meals INTEGER DEFAULT 0,
      mint_tx_hash TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_pets_owner_address ON pets(owner_address);
    CREATE INDEX IF NOT EXISTS idx_pets_token_id ON pets(token_id);
  `,
  
  meals: `
    CREATE TABLE IF NOT EXISTS meals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_address TEXT NOT NULL,
      pet_id UUID REFERENCES pets(id),
      image_url TEXT,
      analysis_result JSONB,
      energy_value INTEGER NOT NULL,
      hunger_value INTEGER NOT NULL,
      happiness_value INTEGER NOT NULL,
      feed_tx_hash TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_meals_user_address ON meals(user_address);
    CREATE INDEX IF NOT EXISTS idx_meals_pet_id ON meals(pet_id);
  `,
  
  battles: `
    CREATE TABLE IF NOT EXISTS battles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player1_address TEXT NOT NULL,
      player2_address TEXT NOT NULL,
      player1_pet_id UUID REFERENCES pets(id),
      player2_pet_id UUID REFERENCES pets(id),
      winner_address TEXT,
      battle_power_1 INTEGER,
      battle_power_2 INTEGER,
      battle_tx_hash TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE
    );
    
    CREATE INDEX IF NOT EXISTS idx_battles_player1 ON battles(player1_address);
    CREATE INDEX IF NOT EXISTS idx_battles_player2 ON battles(player2_address);
    CREATE INDEX IF NOT EXISTS idx_battles_status ON battles(status);
  `
}; 