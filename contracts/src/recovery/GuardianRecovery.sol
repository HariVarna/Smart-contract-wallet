// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IWalletErrors} from "../wallet/WalletErrors.sol";

/**
 * @title GuardianRecovery
 * @notice Provides guardian-based wallet recovery with timelocks and threshold logic.
 */
abstract contract GuardianRecovery is IWalletErrors {
    /// @dev Maps address to their guardian status.
    mapping(address => bool) public isGuardian;
    
    /// @dev Total number of registered guardians.
    uint256 public guardianCount;
    
    /// @dev Number of approvals required to execute a recovery.
    uint256 public recoveryThreshold;
    
    /// @dev The currently proposed owner in an active recovery process.
    address public recoveryProposedOwner;
    
    /// @dev Timestamp after which the proposed recovery can be executed.
    uint256 public recoveryExecuteAfter;
    
    /// @dev Current recovery round (nonce) to prevent approval replay.
    uint256 public currentRecoveryRound;
    
    /// @dev Tracks approvals for a given round to prevent double-voting.
    /// mapping(round => mapping(guardian => bool))
    mapping(uint256 => mapping(address => bool)) public hasApprovedRecovery;
    
    /// @dev Number of approvals collected in the current recovery round.
    uint256 public currentRecoveryApprovals;

    /// @dev Standard recovery timelock delay.
    uint256 public constant RECOVERY_DELAY = 48 hours;

    /**
     * @dev Events replicated from ISmartWallet to satisfy inheritance internally.
     */
    event GuardianAdded(address indexed guardian);
    event GuardianRemoved(address indexed guardian);
    event RecoveryThresholdSet(uint256 threshold);
    event RecoveryInitiated(address indexed proposedOwner, uint256 executeAfter);
    event RecoveryApproved(address indexed guardian, address indexed proposedOwner);
    event RecoveryExecuted(address indexed oldOwner, address indexed newOwner);
    event RecoveryCancelled(address indexed by);

    /**
     * @dev Must be implemented by the inheriting wallet to update ownership.
     */
    function _setOwner(address newOwner) internal virtual;

    /**
     * @dev Must be implemented by the inheriting wallet to restrict access to the owner.
     */
    function _requireOwner() internal view virtual;

    /**
     * @dev Adds a new guardian.
     */
    function addGuardian(address guardian) external {
        _requireOwner();
        if (guardian == address(0)) revert ZeroAddress();
        if (isGuardian[guardian]) revert InvalidGuardian();

        isGuardian[guardian] = true;
        guardianCount++;
        emit GuardianAdded(guardian);
    }

    /**
     * @dev Removes an existing guardian.
     */
    function removeGuardian(address guardian) external {
        _requireOwner();
        if (!isGuardian[guardian]) revert InvalidGuardian();

        isGuardian[guardian] = false;
        guardianCount--;

        // Auto-adjust threshold if necessary
        if (guardianCount > 0 && recoveryThreshold > guardianCount) {
            recoveryThreshold = guardianCount;
            emit RecoveryThresholdSet(recoveryThreshold);
        }

        emit GuardianRemoved(guardian);
    }

    /**
     * @dev Sets the recovery threshold.
     */
    function setRecoveryThreshold(uint256 threshold) external {
        _requireOwner();
        if (threshold == 0 || threshold > guardianCount) revert BelowRecoveryThreshold();
        recoveryThreshold = threshold;
        emit RecoveryThresholdSet(threshold);
    }

    /**
     * @dev Initiates a recovery process. Must be called by a guardian.
     */
    function initiateRecovery(address newOwner) external {
        if (!isGuardian[msg.sender]) revert InvalidGuardian();
        if (newOwner == address(0)) revert ZeroAddress();
        
        // Reset state for new recovery round
        currentRecoveryRound++;
        recoveryProposedOwner = newOwner;
        currentRecoveryApprovals = 0;
        recoveryExecuteAfter = 0; // Not ready until threshold is met

        emit RecoveryInitiated(newOwner, 0);

        // Auto-approve for the initiator
        _approveRecovery(msg.sender, newOwner);
    }

    /**
     * @dev Approves an ongoing recovery. Must be called by a guardian.
     */
    function approveRecovery(address newOwner) external {
        if (!isGuardian[msg.sender]) revert InvalidGuardian();
        if (recoveryProposedOwner != newOwner || newOwner == address(0)) revert InvalidRecoveryOwner();
        
        _approveRecovery(msg.sender, newOwner);
    }

    function _approveRecovery(address guardian, address newOwner) internal {
        if (hasApprovedRecovery[currentRecoveryRound][guardian]) revert AlreadyApproved();
        
        hasApprovedRecovery[currentRecoveryRound][guardian] = true;
        currentRecoveryApprovals++;
        
        emit RecoveryApproved(guardian, newOwner);

        // If threshold is reached and timelock hasn't been set yet, set it.
        if (currentRecoveryApprovals >= recoveryThreshold && recoveryExecuteAfter == 0) {
            recoveryExecuteAfter = block.timestamp + RECOVERY_DELAY;
            emit RecoveryInitiated(newOwner, recoveryExecuteAfter); // Emit again with actual timestamp
        }
    }

    /**
     * @dev Executes a ready recovery after the timelock expires.
     */
    function executeRecovery() external {
        if (recoveryExecuteAfter == 0 || block.timestamp < recoveryExecuteAfter) revert RecoveryNotReady();
        if (currentRecoveryApprovals < recoveryThreshold) revert BelowRecoveryThreshold();

        address newOwner = recoveryProposedOwner;
        
        // Finalize
        _setOwner(newOwner);
        
        // Reset state
        recoveryProposedOwner = address(0);
        recoveryExecuteAfter = 0;
        currentRecoveryApprovals = 0;

        emit RecoveryExecuted(msg.sender, newOwner);
    }

    /**
     * @dev Cancels an ongoing recovery. Can be called by the current owner.
     */
    function cancelRecovery() external {
        _requireOwner();
        if (recoveryProposedOwner == address(0)) revert RecoveryNotInProgress();

        // Reset state by incrementing round (invalidates current approvals) and clearing proposed owner
        currentRecoveryRound++;
        recoveryProposedOwner = address(0);
        recoveryExecuteAfter = 0;
        currentRecoveryApprovals = 0;

        emit RecoveryCancelled(msg.sender);
    }
}
