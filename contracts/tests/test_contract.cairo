use starknet::ContractAddress;
use starknet::contract_address_const;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address, start_cheat_block_timestamp, stop_cheat_caller_address, stop_cheat_block_timestamp};
use contracts::BiteBuddy::{BiteBuddy};
use contracts::interface::IBiteBuddy::{IBiteBuddy, IBiteBuddyDispatcher, IBiteBuddyDispatcherTrait};
use contracts::base::structs::{Pet, Meal};
use contracts::base::constants::{
    SPECIES_VEGGIE_FLUFFY, SPECIES_PROTEIN_SPARKLE, SPECIES_BALANCE_THUNDER, 
    MEAL_NFT_OFFSET
};
use openzeppelin::token::erc721::interface::{IERC721Dispatcher, IERC721DispatcherTrait};

fn deploy_contract() -> (ContractAddress, IBiteBuddyDispatcher) {
    let contract = declare("BiteBuddy").unwrap().contract_class();
    let owner = contract_address_const::<0x123>();
    let (contract_address, _) = contract.deploy(@array![owner.into()]).unwrap();
    (contract_address, IBiteBuddyDispatcher { contract_address })
}
#[test]
fn test_mint_pet() {
    let (contract_address, bite_buddy) = deploy_contract();
    let user = contract_address_const::<0x456>();
    let erc721 = IERC721Dispatcher { contract_address };
    
    start_cheat_caller_address(contract_address, user);
    start_cheat_block_timestamp(contract_address, 1000);
    
    let pet_id = bite_buddy.mint_pet(SPECIES_VEGGIE_FLUFFY);
    
    assert(pet_id == 1, 'Pet ID should be 1');
    assert(bite_buddy.get_pet_count() == 1, 'Pet count should be 1');
    assert(erc721.owner_of(pet_id) == user, 'User should own pet');
    
    let pet = bite_buddy.get_pet(pet_id);
    assert(pet.owner == user, 'Pet owner should be user');
    assert(pet.species == SPECIES_VEGGIE_FLUFFY, 'Species should match');
    assert(pet.level == 1, 'Level should be 1');
    assert(pet.health == 100, 'Health should be 100');
    
    stop_cheat_caller_address(contract_address);
    stop_cheat_block_timestamp(contract_address);
}
#[test]
fn test_scan_and_feed_meal() {
    let (contract_address, bite_buddy) = deploy_contract();
    let user = contract_address_const::<0x456>();
    let erc721 = IERC721Dispatcher { contract_address };
    
    start_cheat_caller_address(contract_address, user);
    start_cheat_block_timestamp(contract_address, 1000);
    
    let pet_id = bite_buddy.mint_pet(SPECIES_BALANCE_THUNDER);
    
    let meal_id = bite_buddy.scan_and_feed_meal(
        pet_id,
        'meal_hash_123',
        500, // calories
        25,  // protein  
        45,  // carbs
        20,  // fats
        80,  // vitamins
        70,  // minerals
        15,  // fiber
        "ipfs://QmTest123"
    );
    
    assert(meal_id == 1, 'Meal ID should be 1');
    assert(bite_buddy.get_total_meals() == 1, 'Total meals should be 1');
    
    let meal_nft_id = MEAL_NFT_OFFSET + meal_id;
    assert(erc721.owner_of(meal_nft_id) == user, 'User should own meal NFT');
    assert(erc721.balance_of(user) == 2, 'User should have 2 NFTs');
    
    let meal = bite_buddy.get_meal(meal_id);
    assert(meal.pet_id == pet_id, 'Meal pet ID should match');
    assert(meal.calories == 500, 'Calories should match');
    
    let metadata = bite_buddy.get_meal_metadata(meal_id);
    assert(metadata == "ipfs://QmTest123", 'Metadata should match');
    
    let updated_pet = bite_buddy.get_pet(pet_id);
    assert(updated_pet.total_meals == 1, 'Pet should have 1 meal');
    assert(updated_pet.experience > 0, 'Pet should gain experience');
    
    stop_cheat_caller_address(contract_address);
    stop_cheat_block_timestamp(contract_address);
}

#[test]
fn test_multiple_pets() {
    let (contract_address, bite_buddy) = deploy_contract();
    let user = contract_address_const::<0x456>();
    
    start_cheat_caller_address(contract_address, user);
    
    let pet1_id = bite_buddy.mint_pet(SPECIES_VEGGIE_FLUFFY);
    let pet2_id = bite_buddy.mint_pet(SPECIES_PROTEIN_SPARKLE);
    
    let user_pets = bite_buddy.get_pets_by_owner(user);
    assert(user_pets.len() == 2, 'User should have 2 pets');
    assert(*user_pets.at(0) == pet1_id, 'First pet should match');
    assert(*user_pets.at(1) == pet2_id, 'Second pet should match');
    
    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_session_key() {
    let (contract_address, bite_buddy) = deploy_contract();
    let user = contract_address_const::<0x456>();
    
    start_cheat_caller_address(contract_address, user);
    start_cheat_block_timestamp(contract_address, 1000);
    
    let session_key = 'session_123';
    bite_buddy.create_session_key(session_key, 7, 24, 10, 50);
    
    let key_data = bite_buddy.get_session_key(session_key);
    assert(key_data.owner == user, 'Session key owner should match');
    assert(key_data.permissions == 7, 'Permissions should match');
    assert(key_data.max_battles == 10, 'Max battles should match');
    
    stop_cheat_caller_address(contract_address);
    stop_cheat_block_timestamp(contract_address);
}

#[test]
fn test_battle_initiation() {
    let (contract_address, bite_buddy) = deploy_contract();
    let user1 = contract_address_const::<0x456>();
    let user2 = contract_address_const::<0x789>();
    
    start_cheat_caller_address(contract_address, user1);
    let pet1_id = bite_buddy.mint_pet(SPECIES_VEGGIE_FLUFFY);
    stop_cheat_caller_address(contract_address);
    
    start_cheat_caller_address(contract_address, user2);
    let pet2_id = bite_buddy.mint_pet(SPECIES_PROTEIN_SPARKLE);
    stop_cheat_caller_address(contract_address);
    
    start_cheat_caller_address(contract_address, user1);
    bite_buddy.scan_and_feed_meal(
        pet1_id, 'energy_meal', 400, 20, 40, 15, 60, 50, 10, "ipfs://energy"
    );
    
    let battle_id = bite_buddy.initiate_battle(pet1_id, pet2_id);
    
    assert(battle_id == 1, 'Battle ID should be 1');
    
    let battle = bite_buddy.get_battle(battle_id);
    assert(battle.challenger_pet == pet1_id, 'Challenger should match');
    assert(battle.defender_pet == pet2_id, 'Defender should match');
    assert(!battle.completed, 'Battle should not be completed');
    
    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_evolution() {
    let (contract_address, bite_buddy) = deploy_contract();
    let user = contract_address_const::<0x456>();
    
    start_cheat_caller_address(contract_address, user);
    let pet_id = bite_buddy.mint_pet(SPECIES_BALANCE_THUNDER);
    
    let mut meal_count: u32 = 0;
    while meal_count < 15 {
        let meal_hash = (meal_count + 100).into();
        bite_buddy.scan_and_feed_meal(
            pet_id, meal_hash, 600, 30, 50, 25, 90, 85, 20, "ipfs://meal"
        );
        meal_count += 1;
    };
    
    let pet = bite_buddy.get_pet(pet_id);
    if pet.level >= 5 && pet.total_meals >= 10 {
        let can_evolve = bite_buddy.check_evolution(pet_id);
        assert(can_evolve, 'Pet should be able to evolve');
        
        bite_buddy.evolve_pet(pet_id);
        
        let evolved_pet = bite_buddy.get_pet(pet_id);
        assert(evolved_pet.evolution_stage == 1, 'Pet should evolve');
        assert(evolved_pet.health == 120, 'Health should increase');
    }
    
    stop_cheat_caller_address(contract_address);
}
