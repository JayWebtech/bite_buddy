use starknet::{ContractAddress};
use crate::base::structs::{Pet, Meal, SessionKey, Battle};
use starknet::storage::*;
use starknet::class_hash::ClassHash;

#[starknet::interface]
pub trait IBiteBuddy<TContractState> {
    // Pet Management
    fn mint_pet(ref self: TContractState, species: u8) -> u256;
    fn get_pet(self: @TContractState, pet_id: u256) -> Pet;
    fn get_pets_by_owner(self: @TContractState, owner: ContractAddress) -> Pet;

    // Meal System
    fn scan_and_feed_meal(
        ref self: TContractState,
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
    ) -> u256;
    fn get_meal(self: @TContractState, meal_id: u256) -> Meal;
    fn get_meals_by_pet(self: @TContractState, pet_id: u256) -> Meal;

    // Session Key System
    fn create_session_key(
        ref self: TContractState,
        session_public_key: felt252,
        permissions: u32,
        duration_hours: u32,
        max_battles: u32,
        max_energy_per_battle: u8,
    );
    fn get_session_key(self: @TContractState, public_key: felt252) -> SessionKey;
    fn revoke_session_key(ref self: TContractState, public_key: felt252);

    // Battle System
    fn initiate_battle_vs_computer(
        ref self: TContractState, challenger_pet: u256, computer_opponent_id: u8,
    ) -> u256;
    fn initiate_battle(
        ref self: TContractState, challenger_pet: u256, defender_pet: u256,
    ) -> u256;
    fn execute_battle_with_session(
        ref self: TContractState,
        battle_id: u256,
        challenger_cards: Array<u8>,
        session_signature: Array<felt252>,
    );
    fn get_battle(self: @TContractState, battle_id: u256) -> Battle;

    // Computer Opponents
    fn get_computer_opponent(self: @TContractState, opponent_id: u8) -> Pet;
    fn add_computer_opponent(
        ref self: TContractState,
        opponent_id: u8,
        name: felt252,
        species: u8,
        level: u8,
        health: u8,
        attack: u8,
        defense: u8,
    );

    // Evolution System
    fn check_evolution(ref self: TContractState, pet_id: u256) -> bool;
    fn evolve_pet(ref self: TContractState, pet_id: u256);

    // Statistics
    fn get_leaderboard(self: @TContractState) -> Array<(u256, u256, ContractAddress)>;
    fn get_pet_count(self: @TContractState) -> u256;
    fn get_total_meals(self: @TContractState) -> u256;
    fn get_meal_metadata(self: @TContractState, meal_id: u256) -> ByteArray;
    fn upgrade(ref self: TContractState, impl_hash: ClassHash);
}
