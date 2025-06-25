use starknet::{ContractAddress};

#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct Pet {
    pub pet_id: u256,
    pub owner: ContractAddress,
    pub species: u8,
    pub level: u8,
    pub experience: u256,
    pub health: u8,
    pub energy: u8,
    pub nutrition_score: u256,
    pub evolution_stage: u8,
    pub last_meal_timestamp: u64,
    pub total_meals: u256,
    pub battle_wins: u256,
    pub battle_losses: u256,
    pub created_at: u64,
}

#[derive(Drop, Serde, starknet::Store)]
pub struct Meal {
    pub meal_id: u256,
    pub pet_id: u256,
    pub owner: ContractAddress,
    pub calories: u16,
    pub protein: u8,
    pub carbs: u8,
    pub fats: u8,
    pub vitamins: u8,
    pub minerals: u8,
    pub fiber: u8,
    pub meal_quality_score: u8,
    pub energy_generated: u8,
    pub timestamp: u64,
    pub meal_hash: felt252,
    pub ipfs_image_uri: ByteArray,
}

#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct SessionKey {
    pub public_key: felt252,
    pub owner: ContractAddress,
    pub permissions: u32,
    pub expires_at: u64,
    pub max_battles: u32,
    pub max_energy_per_battle: u8,
    pub remaining_uses: u32,
    pub created_at: u64,
}

#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct Battle {
    pub battle_id: u256,
    pub challenger_pet: u256,
    pub defender_pet: u256,
    pub winner: u256,
    pub energy_spent: u8,
    pub rewards: u256,
    pub timestamp: u64,
    pub completed: bool,
}