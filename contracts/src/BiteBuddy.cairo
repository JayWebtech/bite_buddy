#[starknet::contract]
pub mod BiteBuddyV6 {
    use openzeppelin::access::ownable::OwnableComponent;
    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::token::erc721::{ERC721Component, ERC721HooksEmptyImpl};
    use starknet::storage::*;
    use starknet::{ContractAddress, get_block_timestamp, get_caller_address};
    use starknet::class_hash::ClassHash;
    use core::num::traits::Zero;
    use crate::base::constants::*;
    use crate::base::structs::{Battle, Meal, Pet, SessionKey};
    use crate::interface::IBiteBuddy::IBiteBuddy;

    component!(path: ERC721Component, storage: erc721, event: ERC721Event);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    // ERC721 Mixin
    #[abi(embed_v0)]
    impl ERC721MixinImpl = ERC721Component::ERC721MixinImpl<ContractState>;
    impl ERC721InternalImpl = ERC721Component::InternalImpl<ContractState>;

    #[abi(embed_v0)]
    impl OwnableImpl = OwnableComponent::OwnableImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc721: ERC721Component::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        // Core storage
        pets: Map<u256, Pet>,
        meals: Map<u256, Meal>,
        battles: Map<u256, Battle>,
        session_keys: Map<felt252, SessionKey>,
        // Computer opponents - virtual pets that don't need NFTs
        computer_opponents: Map<u8, Pet>,
        // Mappings
        owner_pets: Map<(ContractAddress, u256), u256>,
        owner_pet_count: Map<ContractAddress, u256>,
        pet_meals: Map<(u256, u256), u256>,
        pet_meal_count: Map<u256, u256>,
        // Counters
        next_pet_id: u256,
        next_meal_id: u256,
        next_battle_id: u256,
        total_pets: u256,
        total_meals: u256,
        // Game state
        meal_hashes: Map<felt252, bool>,
        // Meal metadata
        meal_metadata: Map<u256, ByteArray>, // meal_id -> IPFS metadata URI
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC721Event: ERC721Component::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        PetMinted: PetMinted,
        MealScanned: MealScanned,
        PetEvolved: PetEvolved,
        BattleInitiated: BattleInitiated,
        BattleCompleted: BattleCompleted,
        SessionKeyCreated: SessionKeyCreated,
        ComputerOpponentAdded: ComputerOpponentAdded,
    }

    #[derive(Drop, starknet::Event)]
    struct PetMinted {
        pet_id: u256,
        owner: ContractAddress,
        species: u8,
    }

    #[derive(Drop, starknet::Event)]
    struct MealScanned {
        meal_id: u256,
        pet_id: u256,
        owner: ContractAddress,
        quality_score: u8,
        energy_generated: u8,
    }

    #[derive(Drop, starknet::Event)]
    struct PetEvolved {
        pet_id: u256,
        old_evolution_stage: u8,
        new_evolution_stage: u8,
    }

    #[derive(Drop, starknet::Event)]
    struct BattleInitiated {
        battle_id: u256,
        challenger_pet: u256,
        defender_pet: u256,
        challenger_owner: ContractAddress,
        is_computer_opponent: bool,
    }

    #[derive(Drop, starknet::Event)]
    struct BattleCompleted {
        battle_id: u256,
        winner_pet: u256,
        loser_pet: u256,
        is_computer_opponent: bool,
    }

    #[derive(Drop, starknet::Event)]
    struct SessionKeyCreated {
        owner: ContractAddress,
        public_key: felt252,
        expires_at: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct ComputerOpponentAdded {
        opponent_id: u8,
        name: felt252,
        level: u8,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        let name: ByteArray = "BiteBuddy Pet";
        let symbol: ByteArray = "BBPET";
        let base_uri: ByteArray = "";

        self.erc721.initializer(name, symbol, base_uri);
        self.ownable.initializer(owner);
        self.next_pet_id.write(1);
        self.next_meal_id.write(1);
        self.next_battle_id.write(1);
        
        // Initialize computer opponents
        self._initialize_computer_opponents();
    }

    #[abi(embed_v0)]
    impl BiteBuddyImpl of IBiteBuddy<ContractState> {
        fn mint_pet(ref self: ContractState, species: u8) -> u256 {
            let caller = get_caller_address();
            let pet_id = self.next_pet_id.read();
            let timestamp = get_block_timestamp();

            // Validate species
            assert(
                species == SPECIES_VEGGIE_FLUFFY
                    || species == SPECIES_PROTEIN_SPARKLE
                    || species == SPECIES_BALANCE_THUNDER
                    || species == SPECIES_BALANCE_MYSTIC,
                'Invalid species',
            );

            // Create new pet
            let pet = Pet {
                pet_id,
                owner: caller,
                species,
                level: 1,
                experience: 0,
                health: 100,
                energy: 50,
                nutrition_score: 0,
                evolution_stage: 0,
                last_meal_timestamp: 0,
                total_meals: 0,
                battle_wins: 0,
                battle_losses: 0,
                created_at: timestamp,
            };

            // Store pet
            self.pets.write(pet_id, pet);

            // Update owner mappings
            let owner_count = self.owner_pet_count.read(caller);
            self.owner_pets.write((caller, owner_count), pet_id);
            self.owner_pet_count.write(caller, owner_count + 1);

            // Mint NFT
            self.erc721.mint(caller, pet_id);

            // Update counters
            self.next_pet_id.write(pet_id + 1);
            self.total_pets.write(self.total_pets.read() + 1);

            self.emit(PetMinted { pet_id, owner: caller, species });

            pet_id
        }

        fn get_pet(self: @ContractState, pet_id: u256) -> Pet {
            self.pets.read(pet_id)
        }

        fn get_pets_by_owner(self: @ContractState, owner: ContractAddress) -> Pet {
            let count = self.owner_pet_count.read(owner);
            assert(count > 0, 'No pets found');
            
            // Get the first (and only) pet ID for this owner
            let pet_id = self.owner_pets.read((owner, 0));
            
            // Return the full pet data
            self.pets.read(pet_id)
        }

        fn scan_and_feed_meal(
            ref self: ContractState,
            pet_id: u256,
            meal_hash: felt252,
            calories: u16,
            protein: u8,
            carbs: u8,
            fats: u8,
            vitamins: u8,
            minerals: u8,
            fiber: u8,
            ipfs_image_uri: ByteArray,
        ) -> u256 {
            let caller = get_caller_address();
            let mut pet = self.pets.read(pet_id);
            let timestamp = get_block_timestamp();
            let meal_id = self.next_meal_id.read();

            // Validate pet ownership
            assert(pet.owner == caller, 'Not pet owner');

            // Prevent meal hash reuse (anti-cheat)
            assert(!self.meal_hashes.read(meal_hash), 'Meal already used');
            self.meal_hashes.write(meal_hash, true);

            // Calculate meal quality score (0-100)
            let quality_score = self
                ._calculate_meal_quality(calories, protein, carbs, fats, vitamins, minerals, fiber);

            // Calculate energy generated based on quality
            let energy_generated = quality_score / 10; // Max 10 energy per meal

            // Calculate experience gain
            let exp_gain = (quality_score.into() * 2); // 2x quality score

            // Create meal record
            let meal = Meal {
                meal_id,
                pet_id,
                owner: caller,
                calories,
                protein,
                carbs,
                fats,
                vitamins,
                minerals,
                fiber,
                meal_quality_score: quality_score,
                energy_generated,
                timestamp,
                meal_hash,
                ipfs_image_uri: ipfs_image_uri.clone(),
            };

            // Store meal
            self.meals.write(meal_id, meal);
            
            // Store meal metadata for NFT
            self.meal_metadata.write(meal_id, ipfs_image_uri.clone());
            
            // Mint meal NFT with offset to distinguish from pet NFTs
            let meal_nft_id = MEAL_NFT_OFFSET + meal_id;
            self.erc721.mint(caller, meal_nft_id);

            // Update pet meal mappings
            let pet_meal_count = self.pet_meal_count.read(pet_id);
            self.pet_meals.write((pet_id, pet_meal_count), meal_id);
            self.pet_meal_count.write(pet_id, pet_meal_count + 1);

            // Update pet stats
            pet
                .energy =
                    if pet.energy + energy_generated > 100 {
                        100
                    } else {
                        pet.energy + energy_generated
                    };
            pet.experience += exp_gain;
            pet.nutrition_score += quality_score.into();
            pet.total_meals += 1;
            pet.last_meal_timestamp = timestamp;

            // Check for level up
            let new_level = self._calculate_level(pet.experience);
            let old_level = pet.level;
            pet.level = new_level;

            // Store updated pet
            self.pets.write(pet_id, pet);

            // Update counters
            self.next_meal_id.write(meal_id + 1);
            self.total_meals.write(self.total_meals.read() + 1);

            self
                .emit(
                    MealScanned { meal_id, pet_id, owner: caller, quality_score, energy_generated },
                );

            // Check for evolution if level increased
            if new_level > old_level {
                self._check_and_trigger_evolution(pet_id);
            }

            meal_id
        }

        fn get_meal(self: @ContractState, meal_id: u256) -> Meal {
            self.meals.read(meal_id)
        }

        fn get_meals_by_pet(self: @ContractState, pet_id: u256) -> Meal {
            let count = self.pet_meal_count.read(pet_id);
            assert(count > 0, 'No meals found');

            let meal_id = self.pet_meals.read((pet_id, 0));
            self.meals.read(meal_id)
        }

        fn create_session_key(
            ref self: ContractState,
            session_public_key: felt252,
            permissions: u32,
            duration_hours: u32,
            max_battles: u32,
            max_energy_per_battle: u8,
        ) {
            let caller = get_caller_address();
            let timestamp = get_block_timestamp();
            let expires_at = timestamp + (duration_hours.into() * 3600);

            let session_key = SessionKey {
                public_key: session_public_key,
                owner: caller,
                permissions,
                expires_at,
                max_battles,
                max_energy_per_battle,
                remaining_uses: max_battles,
                created_at: timestamp,
            };

            self.session_keys.write(session_public_key, session_key);

            self
                .emit(
                    SessionKeyCreated { owner: caller, public_key: session_public_key, expires_at },
                );
        }

        fn get_session_key(self: @ContractState, public_key: felt252) -> SessionKey {
            self.session_keys.read(public_key)
        }

        fn revoke_session_key(ref self: ContractState, public_key: felt252) {
            let caller = get_caller_address();
            let session_key = self.session_keys.read(public_key);

            assert(session_key.owner == caller, 'Not session owner');

            // Clear session key
            let empty_session = SessionKey {
                public_key: 0,
                owner: starknet::contract_address_const::<0>(),
                permissions: 0,
                expires_at: 0,
                max_battles: 0,
                max_energy_per_battle: 0,
                remaining_uses: 0,
                created_at: 0,
            };

            self.session_keys.write(public_key, empty_session);
        }

        fn initiate_battle_vs_computer(
            ref self: ContractState, challenger_pet: u256, computer_opponent_id: u8,
        ) -> u256 {
            let caller = get_caller_address();
            let challenger = self.pets.read(challenger_pet);
            let battle_id = self.next_battle_id.read();

            // Validate ownership and energy
            assert(challenger.owner == caller, 'Not challenger owner');
            assert(challenger.energy >= 20, 'Insufficient energy');

            // Validate computer opponent exists
            let computer_opponent = self.computer_opponents.read(computer_opponent_id);
            assert(computer_opponent.pet_id != 0, 'Invalid computer opponent');

            // Create battle with computer opponent (use negative ID to distinguish)
            let battle = Battle {
                battle_id,
                challenger_pet,
                defender_pet: 1000 + computer_opponent_id.into(), // Use offset for computer opponents
                winner: 0,
                energy_spent: 20,
                rewards: 0,
                timestamp: get_block_timestamp(),
                completed: false,
            };

            self.battles.write(battle_id, battle);
            self.next_battle_id.write(battle_id + 1);

            // Emit battle initiated event
            self.emit(
                BattleInitiated {
                    battle_id,
                    challenger_pet,
                    defender_pet: 1000 + computer_opponent_id.into(),
                    challenger_owner: caller,
                    is_computer_opponent: true,
                }
            );

            battle_id
        }

        fn initiate_battle(
            ref self: ContractState, challenger_pet: u256, defender_pet: u256,
        ) -> u256 {
            let caller = get_caller_address();
            let challenger = self.pets.read(challenger_pet);
            let _defender = self.pets.read(defender_pet);
            let battle_id = self.next_battle_id.read();

            // Validate ownership and energy
            assert(challenger.owner == caller, 'Not challenger owner');
            assert(challenger.energy >= 20, 'Insufficient energy');
            assert(challenger_pet != defender_pet, 'Cannot battle self');

            // Create battle
            let battle = Battle {
                battle_id,
                challenger_pet,
                defender_pet,
                winner: 0,
                energy_spent: 20,
                rewards: 0,
                timestamp: get_block_timestamp(),
                completed: false,
            };

            self.battles.write(battle_id, battle);
            self.next_battle_id.write(battle_id + 1);

            // Emit battle initiated event
            self.emit(
                BattleInitiated {
                    battle_id,
                    challenger_pet,
                    defender_pet,
                    challenger_owner: caller,
                    is_computer_opponent: false,
                }
            );

            battle_id
        }

        fn execute_battle_with_session(
            ref self: ContractState,
            battle_id: u256,
            challenger_cards: Array<u8>,
            session_signature: Array<felt252>,
        ) {
            // Verify session key (simplified - would need proper signature verification)
            let session_key = self._verify_session_signature(session_signature);

            // Check permissions and limits
            assert(session_key.permissions & PERMISSION_BATTLE != 0, 'No battle permission');
            assert(session_key.expires_at > get_block_timestamp(), 'Session expired');
            assert(session_key.remaining_uses > 0, 'No uses remaining');

            // Execute battle
            let winner_pet = self._execute_battle_logic(battle_id, challenger_cards);

            // Update session key usage
            let mut updated_session = session_key;
            updated_session.remaining_uses -= 1;
            self.session_keys.write(session_key.public_key, updated_session);

            // Update battle result
            let mut battle = self.battles.read(battle_id);
            battle.winner = winner_pet;
            battle.completed = true;
            self.battles.write(battle_id, battle);

            let is_computer_opponent = battle.defender_pet >= 1000;

            self
                .emit(
                    BattleCompleted {
                        battle_id,
                        winner_pet,
                        loser_pet: if winner_pet == battle.challenger_pet {
                            battle.defender_pet
                        } else {
                            battle.challenger_pet
                        },
                        is_computer_opponent,
                    },
                );
        }

        fn execute_complete_battle(
            ref self: ContractState,
            battle_id: u256,
            challenger_moves: Array<u8>,
        ) -> u256 {
            let caller = get_caller_address();
            let mut battle = self.battles.read(battle_id);
            
            // Validate battle state
            assert(battle.battle_id != 0, 'Battle not found');
            assert(!battle.completed, 'Battle already completed');
            
            // Validate ownership
            let challenger = self.pets.read(battle.challenger_pet);
            assert(challenger.owner == caller, 'Not battle owner');
            
            // Execute complete battle with all moves at once
            let winner_pet = self._execute_complete_battle_logic(battle, challenger_moves);
            
            // Update battle result
            battle.winner = winner_pet;
            battle.completed = true;
            self.battles.write(battle_id, battle);
            
            let is_computer_opponent = battle.defender_pet >= 1000;
            
            self.emit(
                BattleCompleted {
                    battle_id,
                    winner_pet,
                    loser_pet: if winner_pet == battle.challenger_pet {
                        battle.defender_pet
                    } else {
                        battle.challenger_pet
                    },
                    is_computer_opponent,
                }
            );
            
            winner_pet
        }

        fn get_battle(self: @ContractState, battle_id: u256) -> Battle {
            self.battles.read(battle_id)
        }

        fn get_computer_opponent(self: @ContractState, opponent_id: u8) -> Pet {
            self.computer_opponents.read(opponent_id)
        }

        fn add_computer_opponent(
            ref self: ContractState,
            opponent_id: u8,
            name: felt252,
            species: u8,
            level: u8,
            health: u8,
            attack: u8,
            defense: u8,
        ) {
            self.ownable.assert_only_owner();

            let computer_opponent = Pet {
                pet_id: 1000 + opponent_id.into(), // Use offset for computer opponents
                owner: starknet::contract_address_const::<0>(), // No owner for computer opponents
                species,
                level,
                experience: (level.into() * level.into() * 100), // Level-based experience
                health,
                energy: 100, // Computer opponents always have full energy
                nutrition_score: (level.into() * 50), // Level-based nutrition
                evolution_stage: if level >= 10 { 2 } else if level >= 5 { 1 } else { 0 },
                last_meal_timestamp: 0,
                total_meals: level.into() * 10, // Level-based meal count
                battle_wins: level.into() * 5, // Level-based wins
                battle_losses: 0,
                created_at: get_block_timestamp(),
            };

            self.computer_opponents.write(opponent_id, computer_opponent);

            self.emit(ComputerOpponentAdded { opponent_id, name, level });
        }

        fn check_evolution(ref self: ContractState, pet_id: u256) -> bool {
            let pet = self.pets.read(pet_id);
            self._can_evolve(pet)
        }

        fn evolve_pet(ref self: ContractState, pet_id: u256) {
            let caller = get_caller_address();
            let mut pet = self.pets.read(pet_id);

            assert(pet.owner == caller, 'Not pet owner');
            assert(self._can_evolve(pet), 'Cannot evolve yet');

            let old_stage = pet.evolution_stage;
            pet.evolution_stage += 1;
            pet.health += 20;
            pet.energy += 10;

            self.pets.write(pet_id, pet);

            self
                .emit(
                    PetEvolved {
                        pet_id,
                        old_evolution_stage: old_stage,
                        new_evolution_stage: pet.evolution_stage,
                    },
                );
        }

        fn get_leaderboard(self: @ContractState) -> Array<(u256, u256, ContractAddress)> {
            // Simplified leaderboard - would need proper sorting
            let mut leaderboard = ArrayTrait::new();
            let total_pets = self.total_pets.read();
            let max_count = if total_pets > 10 { 10 } else { total_pets };
            let mut i = 1;

            while i != max_count + 1 {
                let pet = self.pets.read(i);
                leaderboard.append((pet.pet_id, pet.nutrition_score, pet.owner));
                i += 1;
            }

            leaderboard
        }

        fn get_pet_count(self: @ContractState) -> u256 {
            self.total_pets.read()
        }

        fn get_total_meals(self: @ContractState) -> u256 {
            self.total_meals.read()
        }

        fn get_meal_metadata(self: @ContractState, meal_id: u256) -> ByteArray {
            self.meal_metadata.read(meal_id)
        }

        fn upgrade(ref self: ContractState, impl_hash: ClassHash) {
            self.ownable.assert_only_owner();
            let caller = get_caller_address();
            assert(caller.is_non_zero(), 'Zero address not allowed'); 
            starknet::syscalls::replace_class_syscall(impl_hash).unwrap();
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _initialize_computer_opponents(ref self: ContractState) {
            // Initialize default computer opponents
            let zero_address = starknet::contract_address_const::<0>();
            
            // Wild Pup - Level 1
            let wild_pup = Pet {
                pet_id: 1001,
                owner: zero_address,
                species: SPECIES_VEGGIE_FLUFFY,
                level: 1,
                experience: 100,
                health: 80,
                energy: 100,
                nutrition_score: 50,
                evolution_stage: 0,
                last_meal_timestamp: 0,
                total_meals: 5,
                battle_wins: 2,
                battle_losses: 1,
                created_at: get_block_timestamp(),
            };
            self.computer_opponents.write(1, wild_pup);

            // Forest Guardian - Level 2
            let forest_guardian = Pet {
                pet_id: 1002,
                owner: zero_address,
                species: SPECIES_PROTEIN_SPARKLE,
                level: 2,
                experience: 400,
                health: 120,
                energy: 100,
                nutrition_score: 100,
                evolution_stage: 0,
                last_meal_timestamp: 0,
                total_meals: 15,
                battle_wins: 8,
                battle_losses: 2,
                created_at: get_block_timestamp(),
            };
            self.computer_opponents.write(2, forest_guardian);

            // Shadow Beast - Level 3
            let shadow_beast = Pet {
                pet_id: 1003,
                owner: zero_address,
                species: SPECIES_BALANCE_THUNDER,
                level: 3,
                experience: 900,
                health: 150,
                energy: 100,
                nutrition_score: 150,
                evolution_stage: 1,
                last_meal_timestamp: 0,
                total_meals: 25,
                battle_wins: 15,
                battle_losses: 3,
                created_at: get_block_timestamp(),
            };
            self.computer_opponents.write(3, shadow_beast);
        }

        fn _calculate_meal_quality(
            self: @ContractState,
            calories: u16,
            protein: u8,
            carbs: u8,
            fats: u8,
            vitamins: u8,
            minerals: u8,
            fiber: u8,
        ) -> u8 {
            // Simplified quality scoring (0-100)
            let mut score = 0;

            // Balanced macros get higher scores
            let total_macros = protein + carbs + fats;
            if total_macros > 0 {
                score += 30; // Base score for having macros

                // Bonus for balanced ratios
                if protein >= 15 && protein <= 35 {
                    score += 15;
                } // Good protein
                if carbs >= 30 && carbs <= 60 {
                    score += 10;
                } // Good carbs
                if fats >= 15 && fats <= 35 {
                    score += 10;
                } // Good fats
            }

            // Micronutrients
            score += vitamins / 4; // Up to 25 points
            score += minerals / 4; // Up to 25 points
            score += fiber / 10; // Up to 10 points

            // Calorie moderation
            if calories >= 200 && calories <= 800 {
                score += 10;
            }

            if score > 100 {
                100
            } else {
                score
            }
        }

        fn _calculate_level(self: @ContractState, experience: u256) -> u8 {
            // Simple level calculation: level = sqrt(exp/100)
            if experience < 100 {
                1
            } else if experience < 400 {
                2
            } else if experience < 900 {
                3
            } else if experience < 1600 {
                4
            } else if experience < 2500 {
                5
            } else if experience < 3600 {
                6
            } else if experience < 4900 {
                7
            } else if experience < 6400 {
                8
            } else if experience < 8100 {
                9
            } else {
                10
            } // Max level
        }

        fn _can_evolve(self: @ContractState, pet: Pet) -> bool {
            // Evolution requirements
            match pet.evolution_stage {
                0 => pet.level >= 5 && pet.total_meals >= 10,
                1 => pet.level >= 10 && pet.total_meals >= 25 && pet.battle_wins >= 5,
                2 => pet.level >= 15 && pet.total_meals >= 50 && pet.battle_wins >= 15,
                _ => false // Max evolution reached
            }
        }

        fn _check_and_trigger_evolution(ref self: ContractState, pet_id: u256) {
            let pet = self.pets.read(pet_id);
            if self._can_evolve(pet) {
                let mut updated_pet = pet;
                let old_stage = updated_pet.evolution_stage;
                updated_pet.evolution_stage += 1;
                updated_pet.health += 20;
                updated_pet.energy += 10;

                self.pets.write(pet_id, updated_pet);

                self
                    .emit(
                        PetEvolved {
                            pet_id,
                            old_evolution_stage: old_stage,
                            new_evolution_stage: updated_pet.evolution_stage,
                        },
                    );
            }
        }

        fn _verify_session_signature(
            self: @ContractState, signature: Array<felt252>,
        ) -> SessionKey {
            // Simplified - would need proper ECDSA verification
            // For now, assume first element is the public key
            let public_key = *signature.at(0);
            self.session_keys.read(public_key)
        }

        fn _execute_battle_logic(
            ref self: ContractState, battle_id: u256, challenger_cards: Array<u8>,
        ) -> u256 {
            let battle = self.battles.read(battle_id);
            let challenger = self.pets.read(battle.challenger_pet);
            
            let winner = if battle.defender_pet >= 1000 {
                // Computer opponent battle
                let computer_opponent_id = (battle.defender_pet - 1000).try_into().unwrap();
                let defender = self.computer_opponents.read(computer_opponent_id);
                self._execute_computer_battle(challenger, defender, battle)
            } else {
                // Player vs player battle
                let defender = self.pets.read(battle.defender_pet);
                self._execute_player_battle(challenger, defender, battle)
            };

            winner
        }

        fn _execute_computer_battle(
            ref self: ContractState, challenger: Pet, defender: Pet, battle: Battle,
        ) -> u256 {
            // Enhanced battle logic with multiple factors
            
            // Base stats calculation
            let challenger_base = self._calculate_battle_power(challenger);
            let defender_base = self._calculate_battle_power(defender);
            
            // Dynamic difficulty scaling based on player level
            let (adjusted_challenger_power, adjusted_defender_power) = self._apply_dynamic_difficulty(
                challenger_base, defender_base, challenger.level
            );
            
            // Calculate win probability with skill factor
            let win_probability = self._calculate_win_probability(
                adjusted_challenger_power, adjusted_defender_power
            );
            
            // Generate pseudo-random number using multiple entropy sources
            let random_seed = self._generate_battle_random(battle.battle_id, battle.timestamp);
            let random_chance = random_seed % 100;
            
            let winner = if random_chance < win_probability {
                // Player wins against computer
                let mut updated_challenger = challenger;
                updated_challenger.battle_wins += 1;
                updated_challenger.energy -= 20;
                
                // Dynamic XP based on opponent difficulty
                let xp_gain = self._calculate_xp_gain(challenger.level, defender.level, true);
                updated_challenger.experience += xp_gain;
                
                self.pets.write(battle.challenger_pet, updated_challenger);
                battle.challenger_pet
            } else {
                // Computer wins
                let mut updated_challenger = challenger;
                updated_challenger.battle_losses += 1;
                updated_challenger.energy -= 20;
                
                // Consolation XP (always get something)
                let xp_gain = self._calculate_xp_gain(challenger.level, defender.level, false);
                updated_challenger.experience += xp_gain;
                
                self.pets.write(battle.challenger_pet, updated_challenger);
                battle.defender_pet
            };

            winner
        }

        fn _calculate_battle_power(self: @ContractState, pet: Pet) -> u256 {
            // Simplified power calculation
            pet.level.into() * 10 + pet.nutrition_score / 20 + pet.experience / 200
        }

        fn _apply_dynamic_difficulty(
            self: @ContractState, 
            challenger_power: u256, 
            defender_power: u256, 
            player_level: u8
        ) -> (u256, u256) {
            // Simplified dynamic scaling
            if player_level <= 2 {
                (challenger_power * 120 / 100, defender_power * 85 / 100)
            } else {
                (challenger_power, defender_power)
            }
        }

        fn _calculate_win_probability(
            self: @ContractState, 
            challenger_power: u256, 
            defender_power: u256
        ) -> u64 {
            // Simplified probability calculation
            let total_power = challenger_power + defender_power;
            if total_power == 0 {
                return 50;
            }
            
            let raw_percentage = (challenger_power * 100) / total_power;
            
            if raw_percentage < 15 {
                15
            } else if raw_percentage > 85 {
                85
            } else {
                raw_percentage.try_into().unwrap()
            }
        }

        fn _generate_battle_random(
            self: @ContractState, 
            battle_id: u256, 
            timestamp: u64
        ) -> u64 {
            // Simplified random generation
            ((battle_id.low + timestamp.into()) * 1103515245 + 12345).try_into().unwrap() % 100
        }

        fn _calculate_xp_gain(
            self: @ContractState, 
            player_level: u8, 
            opponent_level: u8, 
            won: bool
        ) -> u256 {
            // Simplified XP calculation
            if won {
                50 + if opponent_level > player_level { (opponent_level - player_level).into() * 10 } else { 0 }
            } else {
                15 + if opponent_level > player_level { (opponent_level - player_level).into() * 3 } else { 0 }
            }.into()
        }

        fn _execute_player_battle(
            ref self: ContractState, challenger: Pet, defender: Pet, battle: Battle,
        ) -> u256 {
            // Original player vs player battle logic
            let challenger_power = challenger.level.into() + challenger.nutrition_score / 100;
            let defender_power = defender.level.into() + defender.nutrition_score / 100;

            // Use timestamp as pseudo-random
            let random = get_block_timestamp() % 100;
            let challenger_chance = (challenger_power * 100) / (challenger_power + defender_power);

            let winner = if random < challenger_chance.try_into().unwrap() {
                // Update challenger stats
                let mut updated_challenger = challenger;
                updated_challenger.battle_wins += 1;
                updated_challenger.energy -= 20;
                updated_challenger.experience += 50;
                self.pets.write(battle.challenger_pet, updated_challenger);

                // Update defender stats
                let mut updated_defender = defender;
                updated_defender.battle_losses += 1;
                self.pets.write(battle.defender_pet, updated_defender);

                battle.challenger_pet
            } else {
                // Update defender stats
                let mut updated_defender = defender;
                updated_defender.battle_wins += 1;
                self.pets.write(battle.defender_pet, updated_defender);

                // Update challenger stats
                let mut updated_challenger = challenger;
                updated_challenger.battle_losses += 1;
                updated_challenger.energy -= 20;
                self.pets.write(battle.challenger_pet, updated_challenger);

                battle.defender_pet
            };

            winner
        }

        fn _execute_complete_battle_logic(
            ref self: ContractState, 
            battle: Battle, 
            challenger_moves: Array<u8>
        ) -> u256 {
            let challenger = self.pets.read(battle.challenger_pet);
            
            let winner = if battle.defender_pet >= 1000 {
                // Computer opponent battle
                let computer_opponent_id = (battle.defender_pet - 1000).try_into().unwrap();
                let defender = self.computer_opponents.read(computer_opponent_id);
                self._execute_complete_computer_battle(challenger, defender, battle, challenger_moves)
            } else {
                // Player vs player battle - for now, use simplified logic
                let defender = self.pets.read(battle.defender_pet);
                self._execute_player_battle(challenger, defender, battle)
            };

            winner
        }

        fn _execute_complete_computer_battle(
            ref self: ContractState,
            challenger: Pet,
            defender: Pet,
            battle: Battle,
            challenger_moves: Array<u8>
        ) -> u256 {
            // Validate moves array length (should be reasonable, e.g., max 10 moves)
            assert(challenger_moves.len() <= 10, 'Too many moves');
            assert(challenger_moves.len() > 0, 'No moves provided');
            
            // Calculate total move power and validate moves
            let mut total_move_power = 0;
            let mut i = 0;
            while i < challenger_moves.len() {
                let move_index = *challenger_moves.at(i);
                assert(move_index < 5, 'Invalid move index'); // 0-4 for 5 available cards
                
                // Add move power based on card type (simplified)
                total_move_power += match move_index {
                    0 => 30, // Quick Strike
                    1 => 50, // Power Slam
                    2 => 25, // Shield Up
                    3 => 40, // Heal
                    4 => 50, // Energy Boost
                    _ => 0,
                };
                i += 1;
            };
            
            // Enhanced battle calculation considering moves
            let challenger_base_power = self._calculate_battle_power(challenger);
            let defender_power = self._calculate_battle_power(defender);
            
            // Add move power bonus to challenger
            let enhanced_challenger_power = challenger_base_power + total_move_power.into();
            
            // Apply dynamic difficulty scaling
            let (adjusted_challenger_power, adjusted_defender_power) = self._apply_dynamic_difficulty(
                enhanced_challenger_power, defender_power, challenger.level
            );
            
            // Calculate win probability
            let win_probability = self._calculate_win_probability(
                adjusted_challenger_power, adjusted_defender_power
            );
            
            // Generate pseudo-random number
            let random_seed = self._generate_battle_random(battle.battle_id, battle.timestamp);
            let random_chance = random_seed % 100;
            
            let winner = if random_chance < win_probability {
                // Player wins
                let mut updated_challenger = challenger;
                updated_challenger.battle_wins += 1;
                updated_challenger.energy -= 20;
                
                // Enhanced XP gain based on moves used
                let base_xp = self._calculate_xp_gain(challenger.level, defender.level, true);
                let move_bonus_xp = (challenger_moves.len().into() * 5); // 5 XP per move
                updated_challenger.experience += base_xp + move_bonus_xp;
                
                self.pets.write(battle.challenger_pet, updated_challenger);
                battle.challenger_pet
            } else {
                // Computer wins
                let mut updated_challenger = challenger;
                updated_challenger.battle_losses += 1;
                updated_challenger.energy -= 20;
                
                // Consolation XP with smaller move bonus
                let base_xp = self._calculate_xp_gain(challenger.level, defender.level, false);
                let move_bonus_xp = (challenger_moves.len().into() * 2); // 2 XP per move when losing
                updated_challenger.experience += base_xp + move_bonus_xp;
                
                self.pets.write(battle.challenger_pet, updated_challenger);
                battle.defender_pet
            };

            winner
        }
    }
}
