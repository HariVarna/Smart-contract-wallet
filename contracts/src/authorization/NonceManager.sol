// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IWalletErrors} from "../wallet/WalletErrors.sol";

/**
 * @title NonceManager
 * @notice Manages sequential, monotonic transaction nonces across multiple spaces to protect against replay attacks.
 */
abstract contract NonceManager is IWalletErrors {
    /// @dev Internal sequential nonce counters organized by space.
    mapping(uint256 space => uint256 nonce) private _nonces;

    /**
     * @notice Returns the current sequential nonce for a given space.
     * @param space The nonce space.
     */
    function getNonce(uint256 space) public view virtual returns (uint256) {
        return _nonces[space];
    }

    /**
     * @dev Consumes and increments the current sequential nonce for a space.
     * @param space The nonce space.
     * @return currentNonce The nonce before incrementation.
     */
    function _useNonce(uint256 space) internal virtual returns (uint256 currentNonce) {
        currentNonce = _nonces[space];
        unchecked {
            _nonces[space] = currentNonce + 1;
        }
    }

    /**
     * @dev Validates that the provided nonce matches the current nonce for a space, then consumes and increments it.
     * @param space The nonce space.
     * @param expectedNonce The nonce expected to be consumed.
     */
    function _verifyAndUseNonce(uint256 space, uint256 expectedNonce) internal virtual {
        uint256 currentNonce = _nonces[space];
        if (expectedNonce != currentNonce) {
            revert InvalidNonce(currentNonce, expectedNonce);
        }
        unchecked {
            _nonces[space] = currentNonce + 1;
        }
    }
}
