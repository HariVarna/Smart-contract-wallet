// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IWalletErrors
 * @notice Standardized custom errors used across the Smart Contract Wallet system.
 */
interface IWalletErrors {
    /// @notice Thrown when an operation is attempted with the zero address where disallowed.
    error ZeroAddress();

    /// @notice Thrown when an invalid owner address is supplied.
    error InvalidOwner();

    /// @notice Thrown when an unauthorized caller attempts an owner-restricted operation.
    /// @param caller The address of the unauthorized caller.
    error UnauthorizedCaller(address caller);

    /// @notice Thrown when an unexpected nonce is supplied.
    /// @param expected The expected current nonce.
    /// @param provided The provided invalid nonce.
    error InvalidNonce(uint256 expected, uint256 provided);

    /// @notice Thrown when a signature has expired past its deadline.
    /// @param deadline The specified expiration timestamp.
    /// @param currentTimestamp The block timestamp at evaluation.
    error ExpiredSignature(uint256 deadline, uint256 currentTimestamp);

    /// @notice Thrown when an ECDSA signature is invalid or fails verification against the owner.
    error InvalidSignature();

    /// @notice Thrown when an external call execution fails.
    /// @param revertData The raw revert bytes returned by the target call.
    error CallExecutionFailed(bytes revertData);

    /// @notice Thrown when the wallet balance is insufficient to execute a value transfer.
    /// @param currentBalance The available ETH balance in the wallet.
    /// @param requiredAmount The amount of ETH required for the execution.
    error InsufficientBalance(uint256 currentBalance, uint256 requiredAmount);

    /// @notice Thrown when attempting an execution while the wallet is locked.
    error WalletLocked();

    /// @notice Thrown when attempting to interact with a non-allowlisted contract.
    /// @param target The target contract address.
    error TargetNotAllowlisted(address target);

    /// @notice Thrown when an execution exceeds the daily native ETH spending limit.
    /// @param requested The amount of ETH requested for transfer.
    /// @param remaining The remaining daily limit available.
    error ExceedsDailyLimit(uint256 requested, uint256 remaining);

    /* -------------------------------------------------------------------------- */
    /*                                 RECOVERY                                   */
    /* -------------------------------------------------------------------------- */

    /// @notice Thrown when a caller is not a registered guardian.
    error InvalidGuardian();

    /// @notice Thrown when a recovery action fails because the threshold is not met.
    error BelowRecoveryThreshold();

    /// @notice Thrown when attempting to execute a recovery that hasn't passed the timelock.
    error RecoveryNotReady();

    /// @notice Thrown when attempting an action that requires an active recovery process.
    error RecoveryNotInProgress();

    /// @notice Thrown when attempting to cancel a recovery after the threshold has been met.
    error CannotCancelAfterThreshold();

    /// @notice Thrown when attempting to approve an already approved recovery.
    error AlreadyApproved();

    /// @notice Thrown when proposing an invalid owner during recovery.
    error InvalidRecoveryOwner();

    /* -------------------------------------------------------------------------- */
    /*                             ACCOUNT ABSTRACTION                            */
    /* -------------------------------------------------------------------------- */

    /// @notice Thrown when a caller other than the designated EntryPoint attempts an ERC-4337 restricted operation.
    error NotEntryPoint();
}
