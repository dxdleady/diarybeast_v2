#!/bin/bash

# Transfer AdminCap using Sui CLI
# This script uses the active address in Sui CLI to transfer AdminCap to the new admin

set -e

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Configuration
PACKAGE_ID="${NEXT_PUBLIC_SUI_PACKAGE_ID:-0x5977fcc201cb4c5db52d8f40221a69b5d1814383780656ac79cdf775adb195d1}"
ADMIN_CAP_ID="${NEXT_PUBLIC_SUI_ADMIN_CAP_ID:-0xbd20e6b8b957cead8662a4bb0313e2f367072d7a8acccc909934b464e3a38bdc}"
NEW_ADMIN_ADDRESS="${NEW_ADMIN_ADDRESS:-0x19de592bfb0c6b325e741170c20cc59be6fc77b5c32230ca8c6d5bd30b82dc23}"
NETWORK="${NEXT_PUBLIC_SUI_NETWORK:-testnet}"

echo "============================================================"
echo "Transfer AdminCap using Sui CLI"
echo "============================================================"
echo ""
echo "Package ID: $PACKAGE_ID"
echo "AdminCap ID: $ADMIN_CAP_ID"
echo "New Admin Address: $NEW_ADMIN_ADDRESS"
echo "Network: $NETWORK"
echo ""

# Check if Sui CLI is configured
if ! command -v sui &> /dev/null; then
    echo "ERROR: Sui CLI is not installed or not in PATH"
    exit 1
fi

# Check active address
ACTIVE_ADDRESS=$(sui client active-address)
echo "Active address in Sui CLI: $ACTIVE_ADDRESS"
echo ""

# Verify AdminCap belongs to active address
echo "Verifying AdminCap ownership..."
ADMIN_CAP_OWNER=$(sui client object $ADMIN_CAP_ID --json 2>/dev/null | jq -r '.data.owner.AddressOwner // .data.owner.Shared.initial_shared_version // "unknown"')
echo "AdminCap owner: $ADMIN_CAP_OWNER"
echo ""

if [[ "$ADMIN_CAP_OWNER" != "$ACTIVE_ADDRESS" ]]; then
    echo "ERROR: AdminCap does not belong to active address!"
    echo "  Expected: $ACTIVE_ADDRESS"
    echo "  Actual: $ADMIN_CAP_OWNER"
    echo ""
    echo "SOLUTION:"
    echo "  1. Switch to the correct address:"
    echo "     sui client switch --address $ADMIN_CAP_OWNER"
    echo "  2. Or export the key from Sui CLI and use it in .env.local"
    exit 1
fi

echo "✅ AdminCap belongs to active address"
echo ""

# Transfer AdminCap
echo "Transferring AdminCap to new admin..."
echo ""

sui client call \
    --package "$PACKAGE_ID" \
    --module diary_token \
    --function transfer_admin \
    --args "$ADMIN_CAP_ID" "$NEW_ADMIN_ADDRESS" \
    --gas-budget 10000000 \
    --json

echo ""
echo "============================================================"
echo "✅ AdminCap transfer completed!"
echo "============================================================"
echo ""
echo "Verify with: npx tsx scripts/check-admin-cap-owner.ts"

