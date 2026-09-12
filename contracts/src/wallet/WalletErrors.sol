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
}
