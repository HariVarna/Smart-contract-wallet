# Smart Contract Wallet Security Audit

## Executive Summary
This document outlines a comprehensive security audit of the Smart Contract Wallet repository. The review covers authorization, account abstraction (ERC-4337), guardian recovery, state isolation, and paymaster mechanics. 

Overall, the architecture demonstrates a strong understanding of security patterns, including robust replay protection and EIP-712 compliance. However, several critical and high-severity logic flaws were identified in the recovery mechanism, paymaster validation, and policy enforcement that could lead to complete loss of recovery capabilities or gas drainage.

---

## 1. [CRITICAL] Social Recovery Defeated by Compromised Owner Cancellation
**File:** `contracts/src/recovery/GuardianRecovery.sol`
**Function:** `cancelRecovery()`

### Vulnerability
The `cancelRecovery()` function is restricted to `onlyOwner`, but can be called at any time during an active recovery timelock. 

### Attack Scenario
The primary purpose of social recovery is to regain control of a wallet after the owner's private key is stolen. If an attacker compromises the owner key, the legitimate user will ask their guardians to initiate recovery. The guardians successfully call `initiateRecovery` and reach the `recoveryThreshold`, starting the 48-hour timelock.
The attacker, who possesses the compromised key, simply monitors the mempool or chain for `RecoveryInitiated` events and immediately calls `cancelRecovery()` via the compromised key. The guardians are permanently locked out of recovering the wallet, and the attacker retains full control.

### Impact
The Guardian Recovery mechanism is completely ineffective against private key theft.

### Recommended Fix
Once `recoveryExecuteAfter` is set (the threshold is met), the owner should be locked out of cancelling the recovery. Alternatively, introduce a mechanism where guardians can explicitly "lock" the wallet against the owner during an active recovery, or require a threshold of guardians to cancel.

---

## 2. [HIGH] Paymaster Daily Limit Bypass via Batching / Mempool Rollover
**File:** `contracts/src/paymaster/SponsorshipPaymaster.sol`
**Function:** `_validatePaymasterUserOp`

### Vulnerability
In `_validatePaymasterUserOp`, if 24 hours have passed, `userSpentToday` is set to `0`, but `userLastReset` is deliberately left unupdated (it is updated in `_postOp`). During ERC-4337 bundling, multiple UserOperations from the same sender can be validated in the same block.

### Attack Scenario
A malicious user waits for their daily limit to expire (1 day passes). They craft 10 distinct UserOperations and bundle them into a single block. 
During the validation loop of the EntryPoint, `_validatePaymasterUserOp` evaluates each operation. Because `userLastReset` remains in the past, **every single operation** triggers the `userSpentToday = 0` reset, passing the `maxCost > remaining` check.
During the execution loop, `_postOp` executes 10 times, accumulating the massive gas cost into `userSpentToday`. 

### Impact
A user can bypass the `dailyLimitPerUser` by orders of magnitude, effectively draining the Paymaster's ETH reserves.

### Recommended Fix
Restructure the daily limit check in `_validatePaymasterUserOp` so that it calculates the remaining limit dynamically without zeroing out `userSpentToday` during validation, or accurately track reserved gas across multiple validations in the same bundle.

---

## 3. [HIGH] Permanent Lockout via Self-Allowlisting (ERC-4337 Users)
**File:** `contracts/src/wallet/SmartWallet.sol`
**Function:** `_validatePolicy()`

### Vulnerability
The `_validatePolicy` function strictly enforces that `target` must be in `isAllowedContract` if `allowlistEnabled` is true. This check applies universally, even if the `target` is the `SmartWallet` itself.

### Attack Scenario
An ERC-4337 user (e.g., using a passkey, lacking an EOA to call the contract directly) decides to enable the allowlist for security. They call `setAllowlistEnabled(true)` but forget to explicitly add the wallet's own address to the allowlist.
Once enabled, any future attempts to call `executeUserOp` to manage the wallet (such as `setAllowlistEnabled(false)` or `addGuardian`) will evaluate `target = address(this)`. Since the wallet is not allowlisted, `_validatePolicy` reverts.

### Impact
Pure ERC-4337 users are permanently locked out of all wallet management and configuration functions.

### Recommended Fix
Bypass the allowlist check for self-calls.
```solidity
if (allowlistEnabled && target != address(this) && !isAllowedContract[target]) {
    revert TargetNotAllowlisted(target);
}
```

---

## 4. [MEDIUM] Paymaster Target Validation Ignores Function Selector
**File:** `contracts/src/paymaster/SponsorshipPaymaster.sol`
**Function:** `_validatePaymasterUserOp`

### Vulnerability
The paymaster extracts the `target` address by blindly decoding `callData[4:36]`. It completely ignores the 4-byte function selector, assuming every call is `executeUserOp(address,uint256,bytes)`.

### Attack Scenario
A user constructs a `UserOperation` calling `addGuardian(address guardian)` on the Smart Wallet, where `guardian` is an address that happens to exist in the Paymaster's `allowedTargets`. The Paymaster decodes `callData[4:36]`, finds the allowed address, and erroneously sponsors the transaction.

### Impact
Users receive unauthorized gas sponsorship for internal wallet management functions, leading to minor Paymaster drainage.

### Recommended Fix
Ensure that `userOp.callData` begins with the exact selector for `executeUserOp` (`0x...`) before applying the offset decoding logic.

---

## 5. [MEDIUM] Denial of Service in Guardian Recovery
**File:** `contracts/src/recovery/GuardianRecovery.sol`
**Function:** `initiateRecovery()`

### Vulnerability
Any guardian can call `initiateRecovery` at any time, which unconditionally increments `currentRecoveryRound` and resets `currentRecoveryApprovals` to `0`, wiping out any existing recovery progress.

### Attack Scenario
If a single guardian is compromised or acts maliciously, they can run a script to monitor for `RecoveryInitiated` or `RecoveryApproved` events. Immediately upon seeing one, they call `initiateRecovery` with a junk address. This resets the round, meaning the legitimate guardians can never reach the required threshold.

### Impact
A single malicious guardian can permanently DoS the recovery process, effectively reducing the fault tolerance of the guardian system to 0 against griefing.

### Recommended Fix
Revert `initiateRecovery` if an active recovery round is currently accumulating approvals and hasn't expired.

---

## 6. [INFORMATIONAL] State Mutation Before Signature Verification
**File:** `contracts/src/wallet/SmartWallet.sol`
**Function:** `executeSigned()`

### Vulnerability
`executeSigned` calls `_verifyAndUseNonce` (which increments the nonce in storage) and `_validatePolicy` (which updates `ethSpentToday`) **before** running `ECDSA.tryRecover`.

### Impact
While Ethereum's transaction rollback protects the state from being permanently corrupted on a reverted transaction, placing storage mutations before signature verification violates the Checks-Effects-Interactions pattern. It unnecessarily increases the gas consumption of failed/malicious signature simulations.

### Recommended Fix
Move the EIP-712 hashing and `ECDSA.tryRecover` checks to the very beginning of the function.

---

## 7. [INFORMATIONAL] Paymaster Incompatible with Batched Transactions
**File:** `contracts/src/paymaster/SponsorshipPaymaster.sol`
**Function:** `_validatePaymasterUserOp`

### Vulnerability
Because the Paymaster hardcodes `callData[4:36]` to find the target, it does not support `executeUserOpBatch(address[],uint256[],bytes[])`. In batched calls, `callData[4:36]` contains a memory offset pointer, which will decode to an invalid address (e.g., `0x00...0060`) and revert.

### Impact
Users cannot utilize gas sponsorship for batched transactions.

### Recommended Fix
Implement fallback logic to detect the `executeUserOpBatch` selector and validate the array of targets appropriately.
