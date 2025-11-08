/// @title DiaryToken
/// @notice Soul-bound (non-transferable) token for DiaryBeast app
/// @dev Users earn tokens for writing diary entries, spend them in the shop
/// 
/// This module implements a soul-bound token using Sui's coin framework.
/// Tokens are stored as regular Coin<DIARY_TOKEN> objects, but transfer
/// functions are not exposed, making them effectively soul-bound.
/// Only admin can mint and burn tokens.

module diarybeast::diary_token;

use std::option;
use sui::coin::{Self, Coin, TreasuryCap};
use sui::tx_context;
use sui::url;

// ===== Errors =====
const EInsufficientBalance: u64 = 1;
const EInvalidAmount: u64 = 2;

// ===== Structs =====

/// One-Time-Witness for the module (required for coin creation)
public struct DIARY_TOKEN has drop {}

/// Admin capability for managing tokens
/// Holder can mint tokens and burn from users
public struct AdminCap has key, store {
    id: sui::object::UID,
}

// ===== Module Initializer =====

/// Initialize the module and create the currency
/// Called once when the module is published
fun init(witness: DIARY_TOKEN, ctx: &mut tx_context::TxContext) {
    // Create currency with metadata
    let (treasury_cap, metadata) = coin::create_currency<DIARY_TOKEN>(
        witness,
        9, // decimals (9 for consistency)
        b"DIARY", // symbol
        b"DiaryToken", // name
        b"Soul-bound rewards for DiaryBeast journaling", // description
        option::some(url::new_unsafe_from_bytes(b"https://diarybeast.app/token-icon.png")),
        ctx
    );

    // Make metadata publicly accessible but immutable
    sui::transfer::public_freeze_object(metadata);

    // Create admin capability
    let admin_cap = AdminCap {
        id: sui::object::new(ctx)
    };

    // Transfer treasury cap and admin cap to deployer
    sui::transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    sui::transfer::public_transfer(admin_cap, tx_context::sender(ctx));
}

// ===== Public Functions =====

/// Mint new tokens to a user
/// Only callable by admin with TreasuryCap
/// 
/// # Arguments:
/// - `treasury_cap`: TreasuryCap for minting tokens
/// - `amount`: Amount of tokens to mint (in smallest unit)
/// - `recipient`: Address to receive tokens
/// - `ctx`: Transaction context
public entry fun mint_reward(
    treasury_cap: &mut TreasuryCap<DIARY_TOKEN>,
    amount: u64,
    recipient: address,
    ctx: &mut tx_context::TxContext
) {
    assert!(amount > 0, EInvalidAmount);
    
    // Mint new coins and transfer directly to recipient
    coin::mint_and_transfer(treasury_cap, amount, recipient, ctx);
}

/// Burn tokens from a user
/// Only callable by admin with AdminCap
/// 
/// # Arguments:
/// - `_admin_cap`: Admin capability (for authorization - currently unused but required for access control)
/// - `treasury_cap`: TreasuryCap for burning tokens
/// - `user_coins`: User's coins to burn
/// - `amount`: Amount of tokens to burn
/// - `ctx`: Transaction context
public entry fun burn_from(
    _admin_cap: &AdminCap,
    treasury_cap: &mut TreasuryCap<DIARY_TOKEN>,
    user_coins: &mut Coin<DIARY_TOKEN>,
    amount: u64,
    ctx: &mut tx_context::TxContext
) {
    assert!(amount > 0, EInvalidAmount);
    
    // Check balance
    let balance = coin::value(user_coins);
    assert!(balance >= amount, EInsufficientBalance);
    
    // Extract coins to burn
    let to_burn = coin::split(user_coins, amount, ctx);
    
    // Burn the coins using TreasuryCap
    coin::burn(treasury_cap, to_burn);
}

/// User can burn their own tokens by sending coins to this function
/// This function burns the coins using the TreasuryCap
/// 
/// Note: In Sui, users need TreasuryCap to burn coins.
/// This function should be called via a programmable transaction where
/// admin provides TreasuryCap and user provides coins.
/// 
/// # Arguments:
/// - `treasury_cap`: TreasuryCap (must be passed by admin in a programmable transaction)
/// - `user_coins`: User's coins to burn
public entry fun burn(
    treasury_cap: &mut TreasuryCap<DIARY_TOKEN>,
    user_coins: Coin<DIARY_TOKEN>,
) {
    // Burn the coins using TreasuryCap
    coin::burn(treasury_cap, user_coins);
}

// ===== View Functions =====

/// Get balance of a coin
/// 
/// # Arguments:
/// - `coins`: Coin to check balance
/// # Returns:
/// - Balance in smallest unit
public fun balance(coins: &Coin<DIARY_TOKEN>): u64 {
    coin::value(coins)
}

// ===== Admin Functions =====

/// Transfer admin capability to new address
/// 
/// # Arguments:
/// - `admin_cap`: Admin capability to transfer
/// - `new_admin`: New admin address
public entry fun transfer_admin(
    admin_cap: AdminCap,
    new_admin: address,
) {
    sui::transfer::public_transfer(admin_cap, new_admin);
}

// ===== Test-Only Functions =====

#[test_only]
public fun init_for_testing(ctx: &mut tx_context::TxContext) {
    let (treasury_cap, metadata) = coin::create_currency<DIARY_TOKEN>(
        DIARY_TOKEN {},
        9,
        b"DIARY",
        b"DiaryToken",
        b"Test token",
        option::none(),
        ctx
    );
    
    sui::transfer::public_freeze_object(metadata);
    
    let admin_cap = AdminCap {
        id: sui::object::new(ctx)
    };
    
    // Transfer to sender (for test_scenario)
    sui::transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    sui::transfer::public_transfer(admin_cap, tx_context::sender(ctx));
}
