// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IWalletErrors} from "../wallet/WalletErrors.sol";

/**
 * @title NonceManager
 * @notice Manages sequential, monotonic transaction nonces to protect against replay attacks.
 */
abstract contract NonceManager is IWalletErrors {
    /// @dev Internal sequential nonce counter.
    uint256 private _nonce;

    /**
     * @notice Returns the current sequential nonce.
     */
    function getNonce() public view virtual returns (uint256) {
        return _nonce;
    }

    /**
     * @dev Consumes and increments the current sequential nonce.
     * @return currentNonce The nonce before incrementation.
     */
    function _useNonce() internal virtual returns (uint256 currentNonce) {
        currentNonce = _nonce;
        unchecked {
            _nonce = currentNonce + 1;
        }
    }

    /**
     * @dev Validates that the provided nonce matches the current nonce, then consumes and increments it.
     * @param expectedNonce The nonce expected to be consumed.
     */
    function _verifyAndUseNonce(uint256 expectedNonce) internal virtual {
        uint256 currentNonce = _nonce;
        if (expectedNonce != currentNonce) {
            revert InvalidNonce(currentNonce, expectedNonce);
        }
        unchecked {
            _nonce = currentNonce + 1;
        }
    }
}
