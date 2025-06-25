use starknet::ContractAddress;
use starknet::testing::{set_caller_address, set_block_timestamp};
use contracts::BiteBuddy::BiteBuddyNFT;
use contracts::BiteBuddy::{Pet, MealData};

// Helper function to create test addresses
fn create_test_address(seed: u32) -> ContractAddress {
    let mut address = 0;
    address += seed;
    address.try_into().unwrap()
}

#[test]
fn test_constructor() {
    let mut state = BiteBuddyNFT::contract_state_for_testing();
    let owner = create_test_address(1);
    
    BiteBuddyNFT::constructor(ref state, owner);
    
    assert_eq!(state.owner.read(), owner, 'Owner not set correctly');
    assert_eq!(state.next_pet_id.read(), 1, 'Next pet ID should start at 1');
    assert_eq!(state.total_pets.read(), 0, 'Total pets should start at 0');
    assert_eq!(state.name.read(), "BiteBuddy Pets", 'Name not set correctly');
    assert_eq!(state.symbol.read(), "BBP", 'Symbol not set correctly');
}

#[test]
fn test_mint_pet() {
    let mut state = BiteBuddyNFT::contract_state_for_testing();
    let owner = create_test_address(1);
    let user = create_test_address(2);
    
    BiteBuddyNFT::constructor(ref state, owner);
    
    // Set caller as owner
    set_caller_address(owner);
    
    let pet_type = 'dog';
    let pet_name = 'Buddy';
    let pet_id = BiteBuddyNFT::mint_pet(ref state, user, pet_type, pet_name);
    
    assert_eq!(pet_id, 1, 'Pet ID should be 1');
    assert_eq!(state.total_pets.read(), 1, 'Total pets should be 1');
    assert_eq!(state.next_pet_id.read(), 2, 'Next pet ID should be 2');
    assert_eq!(state.balances.read(user), 1, 'User balance should be 1');
    assert_eq!(state.token_owners.read(pet_id), user, 'Token owner should be user');
    
    // Check pet data
    let pet = state.pets.read(user);
    assert_eq!(pet.id, pet_id, 'Pet ID should match');
    assert_eq!(pet.owner, user, 'Pet owner should be user');
    assert_eq!(pet.pet_type, pet_type, 'Pet type should match');
    assert_eq!(pet.name, pet_name, 'Pet name should match');
    assert_eq!(pet.level, 1, 'Pet level should start at 1');
    assert_eq!(pet.energy, 100, 'Pet energy should start at 100');
    assert_eq!(pet.hunger, 100, 'Pet hunger should start at 100');
    assert_eq!(pet.happiness, 100, 'Pet happiness should start at 100');
}

#[test]
fn test_feed_pet() {
    let mut state = BiteBuddyNFT::contract_state_for_testing();
    let owner = create_test_address(1);
    let user = create_test_address(2);
    
    BiteBuddyNFT::constructor(ref state, owner);
    
    // Mint a pet
    set_caller_address(owner);
    let pet_type = 'dog';
    let pet_name = 'Buddy';
    let pet_id = BiteBuddyNFT::mint_pet(ref state, user, pet_type, pet_name);
    
    // Feed the pet
    set_caller_address(user);
    let meal_data = MealData {
        energy_value: 20,
        hunger_value: 30,
        happiness_value: 15,
        timestamp: 1234567890,
    };
    
    BiteBuddyNFT::feed_pet(ref state, pet_id, meal_data);
    
    // Check updated pet stats
    let pet = state.pets.read(user);
    assert_eq!(pet.energy, 100, 'Energy should be capped at 100');
    assert_eq!(pet.hunger, 100, 'Hunger should be capped at 100');
    assert_eq!(pet.happiness, 100, 'Happiness should be capped at 100');
    assert_eq!(pet.xp, 6, 'XP should be (20+30+15)/10 = 6');
    assert_eq!(pet.total_meals, 1, 'Total meals should be 1');
}

#[test]
fn test_pet_level_up() {
    let mut state = BiteBuddyNFT::contract_state_for_testing();
    let owner = create_test_address(1);
    let user = create_test_address(2);
    
    BiteBuddyNFT::constructor(ref state, owner);
    
    // Mint a pet
    set_caller_address(owner);
    let pet_type = 'dog';
    let pet_name = 'Buddy';
    let pet_id = BiteBuddyNFT::mint_pet(ref state, user, pet_type, pet_name);
    
    // Feed the pet multiple times to gain XP
    set_caller_address(user);
    let meal_data = MealData {
        energy_value: 50,
        hunger_value: 50,
        happiness_value: 50,
        timestamp: 1234567890,
    };
    
    // Feed 3 times to get 45 XP (3 * 15), which should trigger level up to level 2
    BiteBuddyNFT::feed_pet(ref state, pet_id, meal_data);
    BiteBuddyNFT::feed_pet(ref state, pet_id, meal_data);
    BiteBuddyNFT::feed_pet(ref state, pet_id, meal_data);
    
    // Check pet stats
    let pet = state.pets.read(user);
    assert_eq!(pet.level, 2, 'Pet should level up to 2');
    assert_eq!(pet.xp, 45, 'XP should be 45');
    assert_eq!(pet.total_meals, 3, 'Total meals should be 3');
}

#[test]
fn test_get_pet_stats() {
    let mut state = BiteBuddyNFT::contract_state_for_testing();
    let owner = create_test_address(1);
    let user = create_test_address(2);
    
    BiteBuddyNFT::constructor(ref state, owner);
    
    // Mint a pet
    set_caller_address(owner);
    let pet_type = 'dog';
    let pet_name = 'Buddy';
    let pet_id = BiteBuddyNFT::mint_pet(ref state, user, pet_type, pet_name);
    
    // Get pet stats
    let (level, energy, hunger, happiness) = BiteBuddyNFT::get_pet_stats(@state, pet_id);
    
    assert_eq!(level, 1, 'Level should be 1');
    assert_eq!(energy, 100, 'Energy should be 100');
    assert_eq!(hunger, 100, 'Hunger should be 100');
    assert_eq!(happiness, 100, 'Happiness should be 100');
}

#[test]
fn test_get_battle_power() {
    let mut state = BiteBuddyNFT::contract_state_for_testing();
    let owner = create_test_address(1);
    let user = create_test_address(2);
    
    BiteBuddyNFT::constructor(ref state, owner);
    
    // Mint a pet
    set_caller_address(owner);
    let pet_type = 'dog';
    let pet_name = 'Buddy';
    let pet_id = BiteBuddyNFT::mint_pet(ref state, user, pet_type, pet_name);
    
    // Get battle power
    let battle_power = BiteBuddyNFT::get_battle_power(@state, pet_id);
    
    // Battle power = level * 10 + (energy + happiness) / 2
    // = 1 * 10 + (100 + 100) / 2 = 10 + 100 = 110
    assert_eq!(battle_power, 110, 'Battle power should be 110');
}

#[test]
fn test_battle_pets() {
    let mut state = BiteBuddyNFT::contract_state_for_testing();
    let owner = create_test_address(1);
    let user1 = create_test_address(2);
    let user2 = create_test_address(3);
    
    BiteBuddyNFT::constructor(ref state, owner);
    
    // Mint pets for both users
    set_caller_address(owner);
    let pet1_id = BiteBuddyNFT::mint_pet(ref state, user1, 'dog', 'Buddy');
    let pet2_id = BiteBuddyNFT::mint_pet(ref state, user2, 'cat', 'Whiskers');
    
    // Level up pet1 to make it stronger
    set_caller_address(user1);
    let meal_data = MealData {
        energy_value: 100,
        hunger_value: 100,
        happiness_value: 100,
        timestamp: 1234567890,
    };
    
    // Feed multiple times to level up
    BiteBuddyNFT::feed_pet(ref state, pet1_id, meal_data);
    BiteBuddyNFT::feed_pet(ref state, pet1_id, meal_data);
    BiteBuddyNFT::feed_pet(ref state, pet1_id, meal_data);
    BiteBuddyNFT::feed_pet(ref state, pet1_id, meal_data);
    BiteBuddyNFT::feed_pet(ref state, pet1_id, meal_data);
    BiteBuddyNFT::feed_pet(ref state, pet1_id, meal_data);
    BiteBuddyNFT::feed_pet(ref state, pet1_id, meal_data);
    
    // Battle pets (pet1 should win)
    let result = BiteBuddyNFT::battle_pets(ref state, pet1_id, pet2_id);
    assert_eq!(result, true, 'Pet1 should win the battle');
}

#[test]
fn test_get_owner_pets() {
    let mut state = BiteBuddyNFT::contract_state_for_testing();
    let owner = create_test_address(1);
    let user = create_test_address(2);
    
    BiteBuddyNFT::constructor(ref state, owner);
    
    // Mint a pet
    set_caller_address(owner);
    let pet_type = 'dog';
    let pet_name = 'Buddy';
    let pet_id = BiteBuddyNFT::mint_pet(ref state, user, pet_type, pet_name);
    
    // Get owner pets
    let owner_pets = BiteBuddyNFT::get_owner_pets(@state, user);
    
    assert_eq!(owner_pets.len(), 1, 'Should have 1 pet');
    assert_eq!(owner_pets.at(0), pet_id, 'Pet ID should match');
}

#[test]
fn test_erc721_functions() {
    let mut state = BiteBuddyNFT::contract_state_for_testing();
    let owner = create_test_address(1);
    let user = create_test_address(2);
    
    BiteBuddyNFT::constructor(ref state, owner);
    
    // Mint a pet
    set_caller_address(owner);
    let pet_type = 'dog';
    let pet_name = 'Buddy';
    let pet_id = BiteBuddyNFT::mint_pet(ref state, user, pet_type, pet_name);
    
    // Test balance_of
    let balance = BiteBuddyNFT::balance_of(@state, user);
    assert_eq!(balance, 1, 'Balance should be 1');
    
    // Test owner_of
    let token_owner = BiteBuddyNFT::owner_of(@state, pet_id);
    assert_eq!(token_owner, user, 'Token owner should be user');
    
    // Test name and symbol
    let name = BiteBuddyNFT::name(@state);
    assert_eq!(name, "BiteBuddy Pets", 'Name should match');
    
    let symbol = BiteBuddyNFT::symbol(@state);
    assert_eq!(symbol, "BBP", 'Symbol should match');
    
    // Test token_uri
    let token_uri = BiteBuddyNFT::token_uri(@state, pet_id);
    assert_eq!(token_uri, "https://api.bitebuddy.com/metadata/", 'Token URI should match default');
}

#[test]
fn test_approve_and_transfer() {
    let mut state = BiteBuddyNFT::contract_state_for_testing();
    let owner = create_test_address(1);
    let user1 = create_test_address(2);
    let user2 = create_test_address(3);
    
    BiteBuddyNFT::constructor(ref state, owner);
    
    // Mint a pet for user1
    set_caller_address(owner);
    let pet_id = BiteBuddyNFT::mint_pet(ref state, user1, 'dog', 'Buddy');
    
    // User1 approves user2 to transfer the pet
    set_caller_address(user1);
    BiteBuddyNFT::approve(ref state, user2, pet_id);
    
    // Check approval
    let approved = BiteBuddyNFT::get_approved(@state, pet_id);
    assert_eq!(approved, user2, 'Approved address should be user2');
    
    // User2 transfers the pet to themselves
    set_caller_address(user2);
    BiteBuddyNFT::transfer_from(ref state, user1, user2, pet_id);
    
    // Check transfer
    let new_owner = BiteBuddyNFT::owner_of(@state, pet_id);
    assert_eq!(new_owner, user2, 'New owner should be user2');
    
    let balance1 = BiteBuddyNFT::balance_of(@state, user1);
    let balance2 = BiteBuddyNFT::balance_of(@state, user2);
    assert_eq!(balance1, 0, 'User1 balance should be 0');
    assert_eq!(balance2, 1, 'User2 balance should be 1');
}

#[test]
fn test_set_approval_for_all() {
    let mut state = BiteBuddyNFT::contract_state_for_testing();
    let owner = create_test_address(1);
    let user1 = create_test_address(2);
    let user2 = create_test_address(3);
    
    BiteBuddyNFT::constructor(ref state, owner);
    
    // Mint a pet for user1
    set_caller_address(owner);
    let pet_id = BiteBuddyNFT::mint_pet(ref state, user1, 'dog', 'Buddy');
    
    // User1 sets approval for all to user2
    set_caller_address(user1);
    BiteBuddyNFT::set_approval_for_all(ref state, user2, true);
    
    // Check approval for all
    let is_approved = BiteBuddyNFT::is_approved_for_all(@state, user1, user2);
    assert_eq!(is_approved, true, 'User2 should be approved for all');
    
    // User2 can now transfer the pet
    set_caller_address(user2);
    BiteBuddyNFT::transfer_from(ref state, user1, user2, pet_id);
    
    // Check transfer
    let new_owner = BiteBuddyNFT::owner_of(@state, pet_id);
    assert_eq!(new_owner, user2, 'New owner should be user2');
}

#[test]
fn test_get_total_pets() {
    let mut state = BiteBuddyNFT::contract_state_for_testing();
    let owner = create_test_address(1);
    let user1 = create_test_address(2);
    let user2 = create_test_address(3);
    
    BiteBuddyNFT::constructor(ref state, owner);
    
    // Check initial total
    let initial_total = BiteBuddyNFT::get_total_pets(@state);
    assert_eq!(initial_total, 0, 'Initial total should be 0');
    
    // Mint pets
    set_caller_address(owner);
    BiteBuddyNFT::mint_pet(ref state, user1, 'dog', 'Buddy');
    BiteBuddyNFT::mint_pet(ref state, user2, 'cat', 'Whiskers');
    
    // Check updated total
    let final_total = BiteBuddyNFT::get_total_pets(@state);
    assert_eq!(final_total, 2, 'Final total should be 2');
}

#[test]
fn test_get_pet() {
    let mut state = BiteBuddyNFT::contract_state_for_testing();
    let owner = create_test_address(1);
    let user = create_test_address(2);
    
    BiteBuddyNFT::constructor(ref state, owner);
    
    // Mint a pet
    set_caller_address(owner);
    let pet_type = 'dog';
    let pet_name = 'Buddy';
    let pet_id = BiteBuddyNFT::mint_pet(ref state, user, pet_type, pet_name);
    
    // Get pet data
    let pet = BiteBuddyNFT::get_pet(@state, pet_id);
    
    assert_eq!(pet.id, pet_id, 'Pet ID should match');
    assert_eq!(pet.owner, user, 'Pet owner should be user');
    assert_eq!(pet.pet_type, pet_type, 'Pet type should match');
    assert_eq!(pet.name, pet_name, 'Pet name should match');
    assert_eq!(pet.level, 1, 'Pet level should be 1');
    assert_eq!(pet.energy, 100, 'Pet energy should be 100');
    assert_eq!(pet.hunger, 100, 'Pet hunger should be 100');
    assert_eq!(pet.happiness, 100, 'Pet happiness should be 100');
    assert_eq!(pet.xp, 0, 'Pet XP should start at 0');
    assert_eq!(pet.total_meals, 0, 'Pet total meals should start at 0');
}
