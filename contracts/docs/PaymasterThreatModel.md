# Paymaster Threat Model & Economics

## Overview
This document outlines the economic risks, trust assumptions, and security measures applied to the `SponsorshipPaymaster` implementation. The Paymaster allows optional gas sponsorship of ERC-4337 `UserOperations` while strictly capping economic exposure.

## Threat Vectors & Defenses

### 1. Paymaster Fund Draining (Sybil Attacks)
**Threat**: An attacker creates thousands of unique wallets (Sybils) and executes dummy transactions, draining the Paymaster's entire EntryPoint deposit up to the individual daily limit for each Sybil.
**Mitigation**:
- **Target Contract Allowlist (`allowedTargets`)**: The Paymaster will ONLY sponsor transactions directed at strictly authorized smart contracts. Even if an attacker uses Sybils, they can only interact with authorized targets. If these targets do not possess a mechanism to extract value back to the attacker, the attack only burns gas without yielding a profit, disincentivizing it.

### 2. Excessive Gas Consumption
**Threat**: An attacker submits a `UserOperation` to an allowed target but sets `callGasLimit` or `verificationGasLimit` to absurdly high values, draining funds through inefficiencies.
**Mitigation**:
- **Absolute Gas Limits (`maxGasLimit`)**: The Paymaster actively decodes the `PackedUserOperation` gas fields and rejects any `UserOperation` where the sum of verification, call, and pre-verification gas exceeds the maximum threshold.

### 3. Continuous Draining by Single User
**Threat**: A single user exploits the sponsorship to run an infinite loop or thousands of valid transactions per day, draining the Paymaster linearly.
**Mitigation**:
- **Daily Per-User Limit (`dailyLimitPerUser`)**: The Paymaster strictly enforces a rolling 24-hour spending limit. `validatePaymasterUserOp` projects the `maxCost`, and `_postOp` accurately debits the `actualGasCost` against this limit.

### 4. Calldata Bypasses (Malicious Calldata)
**Threat**: An attacker formats `callData` in a way that passes the target extraction but executes a different function or batch of functions, bypassing the intent of the allowlist.
**Mitigation**:
- The current implementation strictly slices bytes `4` through `36` to extract the `target` address, matching the layout of `executeUserOp(address target, uint256 value, bytes calldata data)`. 
- **Limitation**: The current Paymaster cannot inherently validate batch transactions (`executeUserOpBatch`) because slicing out a dynamic array from calldata within the validation phase is highly gas-inefficient. Therefore, batch transactions are currently rejected by the Paymaster's strict calldata length/structure assumptions, or they will fail the target allowlist if they parse incorrectly.

## Frontend UI & Trust Assumptions

### The Smart Contract is Agnostic
The Smart Contract **NEVER** trusts frontend-provided sponsorship information. All sponsorship logic is evaluated blindly on-chain during `validatePaymasterUserOp`.

### Frontend Requirements (UI)
To provide a secure user experience, the Frontend integrating this Paymaster MUST:
1. Clearly differentiate between **Sponsored** and **User-Paid** transactions before the user signs the `UserOperation`.
2. Inform the user if the sponsorship daily limit has been reached, gracefully failing back to native ETH payment if required.
3. Not blindly inject the Paymaster address into `UserOperations` unless it has pre-flighted the transaction and confirmed it targets an allowed contract.
