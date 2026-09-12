# Smart Contract Wallet Threat Model

## Overview
This document outlines the security architecture and threat model for the Smart Contract Wallet. The wallet is designed as a non-custodial, securely authenticated account that enforces strict operational boundaries.

## Trust Assumptions
- **Owner**: The single EOA (Externally Owned Account) authorized to execute transactions. The owner is fully trusted and their private key is assumed secure.
- **Underlying EVM**: The smart contract relies on the standard security properties of the Ethereum Virtual Machine (EVM) and standard cryptographic primitives (ECDSA, Keccak256).

## Security Policies & Defenses

### 1. Authorization
**Threat**: Unauthorized actors executing transactions on behalf of the wallet.
**Mitigation**: 
- `execute` relies on `msg.sender == owner`.
- `executeSigned` relies on strict EIP-712 ECDSA signature verification.

### 2. Replay Attacks
**Threat**: An attacker intercepts a valid signed transaction and submits it multiple times, or across different chains/wallets.
**Mitigation**: 
- `NonceManager` utilizes strict, monotonic 2D nonces (`mapping(uint256 space => uint256 nonce)`) ensuring that a signature is valid exactly once.
- EIP-712 domain separator includes the `chainId` and the wallet's contract address (`verifyingContract`), preventing cross-chain and cross-wallet replay attacks.

### 3. Signature Malleability & Tampering
**Threat**: An attacker modifies the payload (target, value, data, or nonce) or manipulates the ECDSA signature itself.
**Mitigation**:
- The signed hash tightly couples all execution parameters (`target`, `value`, `data`, `space`, `nonce`, `deadline`).
- The OpenZeppelin `ECDSA` library protects against signature malleability (e.g., high-s attacks).

### 4. Phishing & Malicious Contracts
**Threat**: The owner is tricked into interacting with a malicious smart contract.
**Mitigation**:
- **Contract Allowlist**: If enabled, interactions are strictly limited to pre-approved addresses. This acts as a sandbox for the wallet's activities.

### 5. Key Compromise Mitigation
**Threat**: The owner's private key is partially exposed or suspected to be compromised.
**Mitigation**:
- **Emergency Lock**: The wallet can be fully paused via `setEmergencyLock(true)`, blocking all `execute` and `executeSigned` operations.
- **Spending Limits**: A daily rolling native ETH spending limit (`dailyEthLimit`) prevents the total drain of funds in a single day, offering a time window for the user to detect unauthorized access.

### 6. Reentrancy
**Threat**: A target contract attempts to call back into the wallet during an execution flow to bypass authorization checks or drain funds.
**Mitigation**:
- The OpenZeppelin `nonReentrant` modifier is applied to both `execute` and `executeSigned` entry points, ensuring atomic, non-interruptible transaction processing.

## Known Limitations
- Social engineering attacks resulting in the owner signing a malicious EIP-712 payload are mitigated by the Allowlist and Daily Limits, but cannot be fundamentally prevented by the contract if these protections are disabled.
- Currently, ERC20 transfers are not bound by the native ETH daily limit. Additional policies would be required to limit arbitrary token transfers.
