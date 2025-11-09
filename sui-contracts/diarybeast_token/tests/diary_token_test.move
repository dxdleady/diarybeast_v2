/// @title DiaryToken Tests
/// @notice Comprehensive tests for DiaryToken Move contract

#[test_only]
module diarybeast::diary_token_test;

use sui::test_scenario::{Self as ts};
use sui::coin::{Self, Coin, TreasuryCap};
use diarybeast::diary_token::{Self, DIARY_TOKEN, AdminCap};

// Test addresses
const ADMIN: address = @0xAD;
const USER1: address = @0xA1;
const USER2: address = @0xA2;

// Test constants
const MINT_AMOUNT: u64 = 1000_000_000; // 1 token (9 decimals)
const BURN_AMOUNT: u64 = 500_000_000;  // 0.5 tokens

#[test]
fun test_init() {
    let mut scenario = ts::begin(ADMIN);
    
    // Initialize module
    {
        diary_token::init_for_testing(ts::ctx(&mut scenario));
    };

    // Verify admin received AdminCap (TreasuryCap is now shared, not owned)
    ts::next_tx(&mut scenario, ADMIN);
    {
        assert!(ts::has_most_recent_for_address<AdminCap>(ADMIN), 0);
        // TreasuryCap is shared, so it's not owned by anyone
        // We can't easily check shared objects in test_scenario, but we know it was created
    };

    ts::end(scenario);
}

#[test]
fun test_mint_reward() {
    let mut scenario = ts::begin(ADMIN);
    
    // Initialize
    {
        diary_token::init_for_testing(ts::ctx(&mut scenario));
    };

    // Mint tokens to USER1
    ts::next_tx(&mut scenario, ADMIN);
    {
        let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
        let mut treasury_cap = ts::take_shared<TreasuryCap<DIARY_TOKEN>>(&scenario);
        
        diary_token::mint_reward(
            &admin_cap,
            &mut treasury_cap,
            MINT_AMOUNT,
            USER1,
            ts::ctx(&mut scenario)
        );

        // Shared objects persist in scenario - no need to return
        // AdminCap needs to be returned
        ts::return_to_sender(&scenario, admin_cap);
        // treasury_cap is shared, so it automatically persists (drop it explicitly)
        drop(treasury_cap);
    };

    // Verify USER1 received coins
    ts::next_tx(&mut scenario, USER1);
    {
        let coins = ts::take_from_sender<Coin<DIARY_TOKEN>>(&scenario);
        assert!(diary_token::balance(&coins) == MINT_AMOUNT, 0);
        ts::return_to_sender(&scenario, coins);
    };

    ts::end(scenario);
}

#[test]
fun test_burn_from() {
    let mut scenario = ts::begin(ADMIN);
    
    // Initialize and mint
    {
        diary_token::init_for_testing(ts::ctx(&mut scenario));
    };

    ts::next_tx(&mut scenario, ADMIN);
    {
        let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
        let mut treasury_cap = ts::take_shared<TreasuryCap<DIARY_TOKEN>>(&scenario);
        diary_token::mint_reward(&admin_cap, &mut treasury_cap, MINT_AMOUNT, USER1, ts::ctx(&mut scenario));
        // Shared objects don't need to be returned - they're not owned
        ts::return_to_sender(&scenario, admin_cap);
        // treasury_cap is shared, so it automatically persists (drop it explicitly)
        drop(treasury_cap);
    };

    // Burn tokens from USER1
    ts::next_tx(&mut scenario, ADMIN);
    {
        let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
        let mut treasury_cap = ts::take_shared<TreasuryCap<DIARY_TOKEN>>(&scenario);
        
        // Get USER1's coins
        ts::next_tx(&mut scenario, USER1);
        let mut user_coins = ts::take_from_sender<Coin<DIARY_TOKEN>>(&scenario);

        // Switch back to admin to burn
        ts::next_tx(&mut scenario, ADMIN);
        diary_token::burn_from(
            &admin_cap,
            &mut treasury_cap,
            &mut user_coins,
            BURN_AMOUNT,
            ts::ctx(&mut scenario)
        );

        // Verify balance decreased
        assert!(diary_token::balance(&user_coins) == MINT_AMOUNT - BURN_AMOUNT, 0);

        // Shared objects don't need to be returned - they're not owned
        ts::return_to_sender(&scenario, admin_cap);
        ts::return_to_address(USER1, user_coins);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = diarybeast::diary_token::EInsufficientBalance)]
fun test_burn_from_insufficient_balance() {
    let mut scenario = ts::begin(ADMIN);
    
    // Initialize and mint
    {
        diary_token::init_for_testing(ts::ctx(&mut scenario));
    };

    ts::next_tx(&mut scenario, ADMIN);
    {
        let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
        let mut treasury_cap = ts::take_shared<TreasuryCap<DIARY_TOKEN>>(&scenario);
        diary_token::mint_reward(&admin_cap, &mut treasury_cap, MINT_AMOUNT, USER1, ts::ctx(&mut scenario));
        // Shared objects don't need to be returned - they're not owned
        ts::return_to_sender(&scenario, admin_cap);
        // treasury_cap is shared, so it automatically persists (drop it explicitly)
        drop(treasury_cap);
    };

    // Try to burn more than balance
    ts::next_tx(&mut scenario, ADMIN);
    {
        let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
        let mut treasury_cap = ts::take_shared<TreasuryCap<DIARY_TOKEN>>(&scenario);
        
        ts::next_tx(&mut scenario, USER1);
        let mut user_coins = ts::take_from_sender<Coin<DIARY_TOKEN>>(&scenario);

        ts::next_tx(&mut scenario, ADMIN);
        // This should fail - trying to burn more than balance
        diary_token::burn_from(
            &admin_cap,
            &mut treasury_cap,
            &mut user_coins,
            MINT_AMOUNT + 1,
            ts::ctx(&mut scenario)
        );
        
        // Return objects (won't execute if function fails as expected)
        // Shared objects don't need to be returned - they're not owned
        ts::return_to_sender(&scenario, admin_cap);
        ts::return_to_address(USER1, user_coins);
        // treasury_cap is shared, so it automatically persists (drop it explicitly)
        drop(treasury_cap);
    };

    ts::end(scenario);
}

#[test]
fun test_burn() {
    let mut scenario = ts::begin(ADMIN);
    
    // Initialize and mint
    {
        diary_token::init_for_testing(ts::ctx(&mut scenario));
    };

    ts::next_tx(&mut scenario, ADMIN);
    {
        let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
        let mut treasury_cap = ts::take_shared<TreasuryCap<DIARY_TOKEN>>(&scenario);
        diary_token::mint_reward(&admin_cap, &mut treasury_cap, MINT_AMOUNT, USER1, ts::ctx(&mut scenario));
        // Shared objects don't need to be returned - they're not owned
        ts::return_to_sender(&scenario, admin_cap);
        // treasury_cap is shared, so it automatically persists (drop it explicitly)
        drop(treasury_cap);
    };

    // User burns their own tokens (now possible with shared TreasuryCap)
    ts::next_tx(&mut scenario, USER1);
    {
        let mut treasury_cap = ts::take_shared<TreasuryCap<DIARY_TOKEN>>(&scenario);
        let mut user_coins = ts::take_from_sender<Coin<DIARY_TOKEN>>(&scenario);

        // Split coins to burn part
        let to_burn = coin::split(&mut user_coins, BURN_AMOUNT, ts::ctx(&mut scenario));

        // User can now burn directly (TreasuryCap is shared)
        diary_token::burn(&mut treasury_cap, to_burn);

        // Return remaining coins to USER1
        // Shared objects don't need to be returned - they're not owned
        ts::return_to_address(USER1, user_coins);
        // treasury_cap is shared, so it automatically persists (drop it explicitly)
        drop(treasury_cap);
    };

    ts::end(scenario);
}

#[test]
fun test_transfer_admin() {
    let mut scenario = ts::begin(ADMIN);
    
    // Initialize
    {
        diary_token::init_for_testing(ts::ctx(&mut scenario));
    };

    // Transfer admin capability to USER2
    ts::next_tx(&mut scenario, ADMIN);
    {
        let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
        diary_token::transfer_admin(admin_cap, USER2);
    };

    // Verify USER2 received AdminCap
    ts::next_tx(&mut scenario, USER2);
    {
        assert!(ts::has_most_recent_for_address<AdminCap>(USER2), 0);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = diarybeast::diary_token::EInvalidAmount)]
fun test_mint_zero_amount() {
    let mut scenario = ts::begin(ADMIN);
    
    // Initialize
    {
        diary_token::init_for_testing(ts::ctx(&mut scenario));
    };

    // Try to mint zero tokens
    ts::next_tx(&mut scenario, ADMIN);
    {
        let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
        let mut treasury_cap = ts::take_shared<TreasuryCap<DIARY_TOKEN>>(&scenario);
        diary_token::mint_reward(&admin_cap, &mut treasury_cap, 0, USER1, ts::ctx(&mut scenario));
        // Return objects (won't execute if function fails as expected)
        // Shared objects don't need to be returned - they're not owned
        ts::return_to_sender(&scenario, admin_cap);
        // treasury_cap is shared, so it automatically persists (drop it explicitly)
        drop(treasury_cap);
    };

    ts::end(scenario);
}

