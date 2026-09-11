#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo "  Starting Anvil Local Blockchain for Smart Contract Wallet"
echo "  Chain ID   : 31337"
echo "  RPC URL    : http://127.0.0.1:8545"
echo "  Block Time : 1 second"
echo "=========================================================="

anvil --port 8545 --chain-id 31337 --block-time 1 --mnemonic "test test test test test test test test test test test junk"
