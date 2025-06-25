use starknet::ContractAddress;

#[derive(Copy, Drop, Serde)]
pub struct Pet {
    pub id: u256,
    pub owner: ContractAddress,
    pub pet_type: felt252,
    pub name: felt252,
    pub level: u256,
    pub xp: u256,
    pub energy: u256,
    pub hunger: u256,
    pub happiness: u256,
    pub last_fed: u64,
    pub total_meals: u256,
    pub created_at: u64,
}

#[derive(Copy, Drop, Serde)]
pub struct MealData {
    pub energy_value: u256,
    pub hunger_value: u256,
    pub happiness_value: u256,
    pub timestamp: u64,
}

