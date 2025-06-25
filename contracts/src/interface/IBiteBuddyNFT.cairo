use starknet::ContractAddress;
use crate::base::structs::{Pet, MealData};

#[starknet::interface]
pub trait IBiteBuddyNFT<TContractState> {
    fn mint_pet(
        ref self: TContractState, 
        to: ContractAddress, 
        pet_type: felt252, 
        name: felt252
    ) -> u256;
    fn get_pet(self: @TContractState, pet_id: u256) -> Pet;
    fn feed_pet(ref self: TContractState, pet_id: u256, meal_data: MealData);
    fn get_pet_stats(self: @TContractState, pet_id: u256) -> (u256, u256, u256, u256);
    fn get_total_pets(self: @TContractState) -> u256;
    fn get_battle_power(self: @TContractState, pet_id: u256) -> u256;
    fn battle_pets(ref self: TContractState, pet1_id: u256, pet2_id: u256) -> bool;
    fn get_owner_pets(self: @TContractState, owner: ContractAddress) -> Array<u256>;
    
    // ERC721 functions
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
    
    // Upgradability
    fn upgrade(ref self: TContractState, new_class_hash: felt252);
}