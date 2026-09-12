// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {BasePaymaster} from "@account-abstraction/contracts/core/BasePaymaster.sol";
import {PackedUserOperation} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {PostOpMode} from "@account-abstraction/contracts/interfaces/IPaymaster.sol";
import {ISmartWallet} from "../interfaces/ISmartWallet.sol";

/**
 * @title SponsorshipPaymaster
 * @notice Provides optional gas sponsorship under strict daily per-user limits and target allowlists.
 */
contract SponsorshipPaymaster is BasePaymaster {
    /// @notice Permitted target contracts that are eligible for gas sponsorship.
    mapping(address => bool) public allowedTargets;

    /// @notice Tracks the amount of ETH spent on gas for a specific user today.
    mapping(address => uint256) public userSpentToday;

    /// @notice Tracks the timestamp of the last daily reset for a specific user.
    mapping(address => uint256) public userLastReset;

    /// @notice Maximum ETH value a user can be sponsored for within a 24-hour period.
    uint256 public dailyLimitPerUser;

    /// @notice Absolute maximum gas limit a single sponsored UserOperation can request.
    uint256 public maxGasLimit;

    // Custom errors
    error TargetNotAllowed(address target);
    error ExceedsGasLimit(uint256 requested, uint256 max);
    error ExceedsDailySponsorshipLimit(uint256 requested, uint256 remaining);

    event TargetAllowlistUpdated(address indexed target, bool allowed);
    event DailyLimitUpdated(uint256 newLimit);
    event MaxGasLimitUpdated(uint256 newLimit);
    event GasSponsored(address indexed user, uint256 actualGasCost);

    /**
     * @param _entryPoint The trusted ERC-4337 EntryPoint contract.
     */
    constructor(IEntryPoint _entryPoint) BasePaymaster(_entryPoint) {
        // Default safe values, owner must manually configure targets and limits.
        dailyLimitPerUser = 0;
        maxGasLimit = 0;
    }

    /* -------------------------------------------------------------------------- */
    /*                                VALIDATION                                  */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Validates whether the paymaster will sponsor the transaction.
     * @dev Called by the EntryPoint. Must return context to trigger _postOp.
     */
    function _validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32 /* userOpHash */,
        uint256 maxCost
    ) internal override returns (bytes memory context, uint256 validationData) {
        address sender = userOp.sender;

        // 1. Validate Target Contract (from callData)
        // Ensure the call is executeUserOp before extracting the target from bytes 4 to 36.
        if (userOp.callData.length >= 36) {
            bytes4 selector = bytes4(userOp.callData[0:4]);
            if (selector != ISmartWallet.executeUserOp.selector) {
                // We only sponsor executeUserOp. (executeUserOpBatch and others are not supported).
                revert TargetNotAllowed(address(0));
            }

            address target = abi.decode(userOp.callData[4:36], (address));
            if (!allowedTargets[target]) {
                revert TargetNotAllowed(target);
            }
        } else {
            // Invalid calldata length, reject sponsorship
            revert TargetNotAllowed(address(0));
        }

        // 2. Validate Maximum Gas Limit
        // Extract gas limits from PackedUserOperation.
        // accountGasLimits = bytes32. unpack to 16 bytes verificationGasLimit and 16 bytes callGasLimit
        uint256 callGasLimit = uint256(bytes32(userOp.accountGasLimits)) & 0xffffffffffffffffffffffffffffffff;
        uint256 verificationGasLimit = uint256(bytes32(userOp.accountGasLimits)) >> 128;
        
        uint256 totalGasRequested = callGasLimit + verificationGasLimit + userOp.preVerificationGas;
        
        if (totalGasRequested > maxGasLimit) {
            revert ExceedsGasLimit(totalGasRequested, maxGasLimit);
        }

        // 3. Validate Daily Limits
        uint256 spentToday = block.timestamp >= userLastReset[sender] + 1 days ? 0 : userSpentToday[sender];
        uint256 remaining = dailyLimitPerUser >= spentToday ? dailyLimitPerUser - spentToday : 0;

        if (maxCost > remaining) {
            revert ExceedsDailySponsorshipLimit(maxCost, remaining);
        }
        
        // Reserve the maxCost to prevent batch bypasses in the same bundle
        userSpentToday[sender] = spentToday + maxCost;
        if (spentToday == 0) {
            userLastReset[sender] = block.timestamp;
        }

        // Pass sender and maxCost to context for accurate postOp accounting
        context = abi.encode(sender, maxCost);
        validationData = 0; // Success
    }

    /* -------------------------------------------------------------------------- */
    /*                                POST OP                                     */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Accurate cost accounting after the operation completes.
     * @dev Called by the EntryPoint.
     */
    function _postOp(
        PostOpMode /* mode */,
        bytes calldata context,
        uint256 actualGasCost,
        uint256 /* actualUserOpFeePerGas */
    ) internal override {
        (address sender, uint256 maxCost) = abi.decode(context, (address, uint256));

        // We reserved maxCost during validation. Now refund the unused difference.
        // If for some reason actualGasCost > maxCost, we cap the subtraction.
        if (maxCost > actualGasCost) {
            uint256 refund = maxCost - actualGasCost;
            if (userSpentToday[sender] >= refund) {
                userSpentToday[sender] -= refund;
            }
        } else if (actualGasCost > maxCost) {
            // Unlikely due to 4337 rules, but safely track if it exceeds
            userSpentToday[sender] += (actualGasCost - maxCost);
        }

        emit GasSponsored(sender, actualGasCost);
    }

    /* -------------------------------------------------------------------------- */
    /*                              ADMIN CONTROLS                                */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Allows or disallows a target contract for gas sponsorship.
     */
    function setAllowedTarget(address target, bool allowed) external onlyOwner {
        allowedTargets[target] = allowed;
        emit TargetAllowlistUpdated(target, allowed);
    }

    /**
     * @notice Sets the maximum ETH value of gas a single user can be sponsored for in 24 hours.
     */
    function setDailyLimit(uint256 limit) external onlyOwner {
        dailyLimitPerUser = limit;
        emit DailyLimitUpdated(limit);
    }

    /**
     * @notice Sets the absolute maximum gas limit allowed for a single sponsored UserOperation.
     */
    function setMaxGasLimit(uint256 limit) external onlyOwner {
        maxGasLimit = limit;
        emit MaxGasLimitUpdated(limit);
    }
}
