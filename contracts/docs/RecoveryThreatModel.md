# Wallet Recovery Threat Model

## Overview
This document outlines the threat model and security architecture of the Guardian-based Wallet Recovery system. The recovery system provides a mechanism for replacing the wallet's `owner` key if it is lost, while strictly protecting against unauthorized or malicious takeovers.

## Trust Assumptions
- **Guardians**: Guardians are designated trusted third parties (e.g., hardware wallets, trusted family members, institutional key managers). It is assumed that the majority (threshold) of guardians will act honestly.
- **Threshold Integrity**: The security of the recovery process depends entirely on the owner maintaining a safe threshold of guardians. If a threshold of guardians collude, they can successfully transfer ownership unless stopped by the active owner within the timelock window.

## Security Policies & Defenses

### 1. Malicious Recovery Initiation (Collusion)
**Threat**: A threshold of malicious or compromised guardians collude to initiate a recovery process and steal ownership of the wallet.
**Mitigation**:
- **Timelock Delay**: Once the required threshold of approvals is met, a mandatory 48-hour timelock (`RECOVERY_DELAY`) starts. Ownership cannot be transferred immediately.
- **Owner Cancellation**: During the 48-hour timelock window, the current active owner can call `cancelRecovery()` to abort the malicious attempt. This acts as a circuit breaker, prioritizing the current owner's authority over the guardians.

### 2. Approval Replay Attacks
**Threat**: An attacker replays a guardian's approval from a previous or cancelled recovery round to push a new recovery process over the threshold.
**Mitigation**:
- **Round-based Nonce**: The `hasApprovedRecovery` mapping is structured as `mapping(uint256 round => mapping(address guardian => bool))`.
- When a recovery is initiated, successfully executed, or cancelled, the `currentRecoveryRound` is incremented. This completely orphans and invalidates all previous approvals.

### 3. Unauthorized Guardian State Manipulation
**Threat**: An attacker attempts to add themselves as a guardian or lower the recovery threshold to compromise the wallet.
**Mitigation**:
- Only the active `owner` can call `addGuardian`, `removeGuardian`, and `setRecoveryThreshold`.
- The system automatically handles threshold adjustments if the total number of guardians drops below the required threshold during a guardian removal, preventing the wallet from entering a deadlock state.

### 4. Direct State Modification
**Threat**: An attacker attempts to directly mutate `recoveryExecuteAfter` or `recoveryProposedOwner` without passing the threshold logic.
**Mitigation**:
- All state updates are strictly gated behind the `_approveRecovery` internal function which strictly counts unique votes per round before assigning the timelock.

## Known Limitations
- **Full Guardian Compromise + Owner Loss**: If the owner loses their key and simultaneously a threshold of guardians are compromised, the compromised guardians will successfully steal the wallet.
- **Inactive Owner**: The 48-hour timelock requires the owner to monitor the wallet (via events `RecoveryInitiated`, `RecoveryApproved`) and react if a malicious recovery starts. If the owner's key is secure but the owner is unavailable (e.g., vacation) for 48 hours while guardians collude, the wallet will be compromised.
