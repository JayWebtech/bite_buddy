use starknet::ContractAddress;
use starknet::class_hash::ClassHash;

#[derive(Copy, Drop, Serde, starknet::Store)]
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

#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct MealData {
    pub energy_value: u256,
    pub hunger_value: u256,
    pub happiness_value: u256,
    pub timestamp: u64,
}

#[starknet::interface]
pub trait IBiteBuddyNFT<TContractState> {
    fn mint_pet(
        ref self: TContractState, 
        pet_type: felt252, 
        name: felt252
    ) -> u256;
    fn get_pet(self: @TContractState, owner: ContractAddress) -> Pet;
    fn feed_pet(ref self: TContractState, contractAddress: ContractAddress, meal_data: MealData);
    fn get_pet_stats(self: @TContractState, pet_id: u256) -> (u256, u256, u256, u256);
    fn get_total_pets(self: @TContractState) -> u256;
    fn get_battle_power(self: @TContractState, pet_id: u256) -> u256;
    fn battle_pets(ref self: TContractState, pet1_id: u256, pet2_id: u256) -> bool;
    fn get_owner_pets(self: @TContractState, owner: ContractAddress) -> Array<u256>;
    // Basic ERC721 functions
    fn balance_of(self: @TContractState, owner: ContractAddress) -> u256;
    fn owner_of(self: @TContractState, token_id: u256) -> ContractAddress;
    fn transfer_from(ref self: TContractState, from: ContractAddress, to: ContractAddress, token_id: u256);
    fn approve(ref self: TContractState, to: ContractAddress, token_id: u256);
    fn get_approved(self: @TContractState, token_id: u256) -> ContractAddress;
    fn set_approval_for_all(ref self: TContractState, operator: ContractAddress, approved: bool);
    fn is_approved_for_all(self: @TContractState, owner: ContractAddress, operator: ContractAddress) -> bool;
    fn name(self: @TContractState) -> ByteArray;
    fn symbol(self: @TContractState) -> ByteArray;
    fn token_uri(self: @TContractState, token_id: u256) -> ByteArray;
    fn upgrade(ref self: TContractState, impl_hash: ClassHash);
}

#[starknet::contract]
pub mod BiteBuddyNFTV3 {
    use starknet::ContractAddress;
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::{get_caller_address, get_block_timestamp};
    use super::{Pet, MealData};
    use starknet::class_hash::ClassHash;
    use core::num::traits::Zero;

    #[storage]
    struct Storage {
        // ERC721 storage
        name: ByteArray,
        symbol: ByteArray,
        token_owners: Map<u256, ContractAddress>,
        token_approvals: Map<u256, ContractAddress>,
        operator_approvals: Map<(ContractAddress, ContractAddress), bool>,
        balances: Map<ContractAddress, u256>,
        // Pet-specific storage - using owner as key
        pets: Map<ContractAddress, Pet>,
        next_pet_id: u256,
        total_pets: u256,
        // Ownership
        owner: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        PetMinted: PetMinted,
        PetFed: PetFed,
        PetLevelUp: PetLevelUp,
        BattleResult: BattleResult,
        Transfer: Transfer,
        Approval: Approval,
        ApprovalForAll: ApprovalForAll,
    }

    #[derive(Drop, starknet::Event)]
    struct PetMinted {
        pet_id: u256,
        owner: ContractAddress,
        pet_type: felt252,
        name: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct PetFed {
        pet_id: u256,
        energy_gained: u256,
        hunger_restored: u256,
        happiness_gained: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct PetLevelUp {
        pet_id: u256,
        new_level: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct BattleResult {
        winner_id: u256,
        loser_id: u256,
        battle_power_winner: u256,
        battle_power_loser: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct Transfer {
        from: ContractAddress,
        to: ContractAddress,
        token_id: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct Approval {
        owner: ContractAddress,
        approved: ContractAddress,
        token_id: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct ApprovalForAll {
        owner: ContractAddress,
        operator: ContractAddress,
        approved: bool,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        let name = "BiteBuddy Pets";
        let symbol = "BBP";
        self.name.write(name);
        self.symbol.write(symbol);
        self.owner.write(owner);
        self.next_pet_id.write(1);
        self.total_pets.write(0);
    }

    #[abi(embed_v0)]
    impl BiteBuddyNFTImpl of super::IBiteBuddyNFT<ContractState> {
        fn mint_pet(
            ref self: ContractState,
            pet_type: felt252, 
            name: felt252
        ) -> u256 {
            // Only owner can mint
            //assert(self.owner.read() == get_caller_address(), 'Not owner');
            let pet_id = self.next_pet_id.read();
            let current_time = get_block_timestamp();
            
            // Create pet data
            let new_pet = Pet {
                id: pet_id,
                owner: get_caller_address(),
                pet_type,
                name,
                level: 1,
                xp: 0,
                energy: 100,
                hunger: 100,
                happiness: 100,
                last_fed: current_time,
                total_meals: 0,
                created_at: current_time,
            };
            
            // Store pet data using owner as key
            self.pets.write(get_caller_address(), new_pet);
            
            // Mint the NFT
            self.token_owners.write(pet_id, get_caller_address());
            self.balances.write(get_caller_address(), self.balances.read(get_caller_address()) + 1);
            
            // Update counters
            self.next_pet_id.write(pet_id + 1);
            self.total_pets.write(self.total_pets.read() + 1);
            
            // Emit events
            let zero_address = 0.try_into().unwrap();
            self.emit(Transfer { from: zero_address, to:get_caller_address(), token_id: pet_id });
            self.emit(PetMinted { pet_id, owner: get_caller_address(), pet_type, name });
            
            pet_id
        }

        fn get_pet(self: @ContractState, owner: ContractAddress) -> Pet {
            // Get the owner of the pet first, then get the pet data
            self.pets.read(owner)
        }

        fn feed_pet(ref self: ContractState, contractAddress: ContractAddress, meal_data: MealData) {

            let pet = self.pets.read(contractAddress);
            let new_energy = if pet.energy + meal_data.energy_value > 100 { 100 } else { pet.energy + meal_data.energy_value };
            let new_hunger = if pet.hunger + meal_data.hunger_value > 100 { 100 } else { pet.hunger + meal_data.hunger_value };
            let new_happiness = if pet.happiness + meal_data.happiness_value > 100 { 100 } else { pet.happiness + meal_data.happiness_value };
            let xp_gained = (meal_data.energy_value + meal_data.hunger_value + meal_data.happiness_value) / 10;
            
            let updated_pet = Pet {
                id: pet.id,
                owner: pet.owner,
                pet_type: pet.pet_type,
                name: pet.name,
                level: pet.level,
                xp: pet.xp + xp_gained,
                energy: new_energy,
                hunger: new_hunger,
                happiness: new_happiness,
                last_fed: get_block_timestamp(),
                total_meals: pet.total_meals + 1,
                created_at: pet.created_at,
            };
            
            let new_level = updated_pet.xp / 100 + 1;
            let final_pet = if new_level > pet.level {
                Pet {
                    id: updated_pet.id,
                    owner: updated_pet.owner,
                    pet_type: updated_pet.pet_type,
                    name: updated_pet.name,
                    level: new_level,
                    xp: updated_pet.xp,
                    energy: updated_pet.energy,
                    hunger: updated_pet.hunger,
                    happiness: updated_pet.happiness,
                    last_fed: updated_pet.last_fed,
                    total_meals: updated_pet.total_meals,
                    created_at: updated_pet.created_at,
                }
            } else {
                updated_pet
            };
            
            self.pets.write(contractAddress, final_pet);
        }

        fn get_pet_stats(self: @ContractState, pet_id: u256) -> (u256, u256, u256, u256) {
            let owner = self.token_owners.read(pet_id);
            let pet = self.pets.read(owner);
            (pet.level, pet.energy, pet.hunger, pet.happiness)
        }

        fn get_total_pets(self: @ContractState) -> u256 {
            self.total_pets.read()
        }

        fn get_battle_power(self: @ContractState, pet_id: u256) -> u256 {
            let owner = self.token_owners.read(pet_id);
            let pet = self.pets.read(owner);
            pet.level * 10 + (pet.energy + pet.happiness) / 2
        }

        fn battle_pets(ref self: ContractState, pet1_id: u256, pet2_id: u256) -> bool {
            let caller = get_caller_address();
            assert(self.token_owners.read(pet1_id) == caller, 'Not owner of pet1');
            
            let power1 = self.get_battle_power(pet1_id);
            let power2 = self.get_battle_power(pet2_id);
            let pet1_wins = power1 > power2;
            
            if pet1_wins {
                self.emit(BattleResult { 
                    winner_id: pet1_id, 
                    loser_id: pet2_id, 
                    battle_power_winner: power1, 
                    battle_power_loser: power2 
                });
            } else {
                self.emit(BattleResult { 
                    winner_id: pet2_id, 
                    loser_id: pet1_id, 
                    battle_power_winner: power2, 
                    battle_power_loser: power1 
                });
            }
            
            pet1_wins
        }

        fn get_owner_pets(self: @ContractState, owner: ContractAddress) -> Array<u256> {
            // Since we're using owner as key, we can only have one pet per owner
            // Return an array with the pet ID if the owner has a pet
            let balance = self.balances.read(owner);
            if balance > 0 {
                // Find the pet ID for this owner
                let mut i = 1_u256;
                loop {
                    if i > self.total_pets.read() {
                        break;
                    }
                    let token_owner = self.token_owners.read(i);
                    if token_owner == owner {
                        return array![i];
                    }
                    i += 1;
                };
            }
            array![]
        }

        // ERC721 functions
        fn balance_of(self: @ContractState, owner: ContractAddress) -> u256 {
            self.balances.read(owner)
        }

        fn owner_of(self: @ContractState, token_id: u256) -> ContractAddress {
            self.token_owners.read(token_id)
        }

        fn transfer_from(ref self: ContractState, from: ContractAddress, to: ContractAddress, token_id: u256) {
            let caller = get_caller_address();
            let owner = self.token_owners.read(token_id);
            
            assert(owner == from, 'Transfer from incorrect owner');
            assert(caller == owner || caller == self.token_approvals.read(token_id) || self.operator_approvals.read((owner, caller)), 'Txn caller is not owner');
            
            // Get the pet data
            let pet = self.pets.read(from);
            
            // Update pet owner
            let updated_pet = Pet {
                id: pet.id,
                owner: to,
                pet_type: pet.pet_type,
                name: pet.name,
                level: pet.level,
                xp: pet.xp,
                energy: pet.energy,
                hunger: pet.hunger,
                happiness: pet.happiness,
                last_fed: pet.last_fed,
                total_meals: pet.total_meals,
                created_at: pet.created_at,
            };
            
            // Update storage
            self.token_owners.write(token_id, to);
            self.balances.write(from, self.balances.read(from) - 1);
            self.balances.write(to, self.balances.read(to) + 1);
            self.pets.write(to, updated_pet);
            
            // Clear approval
            let zero_address = 0.try_into().unwrap();
            self.token_approvals.write(token_id, zero_address);
            
            self.emit(Transfer { from, to, token_id });
        }

        fn approve(ref self: ContractState, to: ContractAddress, token_id: u256) {
            let caller = get_caller_address();
            let owner = self.token_owners.read(token_id);
            
            assert(caller == owner || self.operator_approvals.read((owner, caller)), 'Appr caller is not owner');
            
            self.token_approvals.write(token_id, to);
            self.emit(Approval { owner, approved: to, token_id });
        }

        fn get_approved(self: @ContractState, token_id: u256) -> ContractAddress {
            self.token_approvals.read(token_id)
        }

        fn set_approval_for_all(ref self: ContractState, operator: ContractAddress, approved: bool) {
            let caller = get_caller_address();
            self.operator_approvals.write((caller, operator), approved);
            self.emit(ApprovalForAll { owner: caller, operator, approved });
        }

        fn is_approved_for_all(self: @ContractState, owner: ContractAddress, operator: ContractAddress) -> bool {
            self.operator_approvals.read((owner, operator))
        }

        fn name(self: @ContractState) -> ByteArray {
            self.name.read()
        }

        fn symbol(self: @ContractState) -> ByteArray {
            self.symbol.read()
        }

        fn token_uri(self: @ContractState, token_id: u256) -> ByteArray {
            // Return a simple default URI
            "https://api.bitebuddy.com/metadata/"
        }

        fn upgrade(ref self: ContractState, impl_hash: ClassHash) {
            let caller = get_caller_address();
            assert(caller.is_non_zero(), 'Zero address not allowed');
            let owner = self.owner.read();
            assert(owner == caller, 'Unauthorized caller');
            assert(impl_hash.is_non_zero(), 'Class hash cannot be zero');
            starknet::syscalls::replace_class_syscall(impl_hash).unwrap();
        }

    }
}
