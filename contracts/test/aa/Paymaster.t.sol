// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {SponsorshipPaymaster} from "../../src/paymaster/SponsorshipPaymaster.sol";
import {PackedUserOperation} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {PostOpMode} from "@account-abstraction/contracts/interfaces/IPaymaster.sol";

// Mock EntryPoint for testing Paymaster internals securely
contract MockEntryPoint {
    function depositTo(address /* account */) external payable {}
}

contract PaymasterTest is Test {
    SponsorshipPaymaster internal paymaster;
    MockEntryPoint internal mockEntryPoint;

    address internal owner;
    address internal user;
    address internal allowedTarget;
    address internal unallowedTarget;

    function setUp() public {
        owner = makeAddr("owner");
        user = makeAddr("user");
        allowedTarget = makeAddr("allowedTarget");
        unallowedTarget = makeAddr("unallowedTarget");
        
        mockEntryPoint = new MockEntryPoint();

        vm.prank(owner);
        paymaster = new SponsorshipPaymaster(IEntryPoint(address(mockEntryPoint)));

        // Setup Paymaster policies
        vm.startPrank(owner);
        paymaster.setAllowedTarget(allowedTarget, true);
        paymaster.setMaxGasLimit(200_000);
        paymaster.setDailyLimit(1 ether);
        vm.stopPrank();
    }

    /* -------------------------------------------------------------------------- */
    /*                                VALIDATION                                  */
    /* -------------------------------------------------------------------------- */

    function _buildUserOp(address target, uint256 callGas, uint256 verificationGas, uint256 preVerificationGas) internal pure returns (PackedUserOperation memory) {
        PackedUserOperation memory userOp;
        userOp.sender = makeAddr("user");
        // Mock encode `executeUserOp(address target, uint256 value, bytes data)`
        userOp.callData = abi.encodeWithSignature("executeUserOp(address,uint256,bytes)", target, 0, "");
        
        // Pack gas limits: verificationGasLimit (16 bytes) | callGasLimit (16 bytes)
        bytes32 accountGasLimits = bytes32((verificationGas << 128) | callGas);
        userOp.accountGasLimits = accountGasLimits;
        
        userOp.preVerificationGas = preVerificationGas;
        return userOp;
    }

    function test_Paymaster_Validate_Success() public {
        PackedUserOperation memory userOp = _buildUserOp(allowedTarget, 50_000, 50_000, 21_000);
        
        vm.prank(address(mockEntryPoint));
        (bytes memory context, uint256 validationData) = paymaster.validatePaymasterUserOp(userOp, bytes32(0), 0.5 ether);

        assertEq(validationData, 0); // Success
        address decodedSender = abi.decode(context, (address));
        assertEq(decodedSender, userOp.sender);
    }

    function test_Paymaster_Validate_Fails_UnallowedTarget() public {
        PackedUserOperation memory userOp = _buildUserOp(unallowedTarget, 50_000, 50_000, 21_000);
        
        vm.prank(address(mockEntryPoint));
        vm.expectRevert(abi.encodeWithSelector(SponsorshipPaymaster.TargetNotAllowed.selector, unallowedTarget));
        paymaster.validatePaymasterUserOp(userOp, bytes32(0), 0.5 ether);
    }

    function test_Paymaster_Validate_Fails_ExcessiveGasLimit() public {
        // total gas = 100k + 100k + 21k = 221k (max is 200k)
        PackedUserOperation memory userOp = _buildUserOp(allowedTarget, 100_000, 100_000, 21_000);
        
        vm.prank(address(mockEntryPoint));
        vm.expectRevert(abi.encodeWithSelector(SponsorshipPaymaster.ExceedsGasLimit.selector, 221_000, 200_000));
        paymaster.validatePaymasterUserOp(userOp, bytes32(0), 0.5 ether);
    }

    function test_Paymaster_Validate_Fails_ExceedsDailyLimit() public {
        PackedUserOperation memory userOp = _buildUserOp(allowedTarget, 50_000, 50_000, 21_000);
        
        // Request maxCost of 1.1 ether (daily limit is 1 ether)
        vm.prank(address(mockEntryPoint));
        vm.expectRevert(abi.encodeWithSelector(SponsorshipPaymaster.ExceedsDailySponsorshipLimit.selector, 1.1 ether, 1 ether));
        paymaster.validatePaymasterUserOp(userOp, bytes32(0), 1.1 ether);
    }

    /* -------------------------------------------------------------------------- */
    /*                                POST OP                                     */
    /* -------------------------------------------------------------------------- */

    function test_Paymaster_PostOp_AccurateAccounting() public {
        PackedUserOperation memory userOp = _buildUserOp(allowedTarget, 50_000, 50_000, 21_000);
        
        vm.prank(address(mockEntryPoint));
        (bytes memory context, ) = paymaster.validatePaymasterUserOp(userOp, bytes32(0), 0.5 ether);

        // Simulate execution costing 0.1 ether
        vm.prank(address(mockEntryPoint));
        paymaster.postOp(PostOpMode.opSucceeded, context, 0.1 ether, 0);

        assertEq(paymaster.userSpentToday(userOp.sender), 0.1 ether);
    }

    function test_Paymaster_PostOp_DailyReset() public {
        PackedUserOperation memory userOp = _buildUserOp(allowedTarget, 50_000, 50_000, 21_000);
        
        vm.prank(address(mockEntryPoint));
        (bytes memory context, ) = paymaster.validatePaymasterUserOp(userOp, bytes32(0), 0.5 ether);

        vm.prank(address(mockEntryPoint));
        paymaster.postOp(PostOpMode.opSucceeded, context, 1 ether, 0);

        assertEq(paymaster.userSpentToday(userOp.sender), 1 ether);

        // Advance time by 25 hours
        vm.warp(block.timestamp + 25 hours);

        // Validate should pass even with 0.5 ether because the limit reset
        vm.prank(address(mockEntryPoint));
        (bytes memory context2, ) = paymaster.validatePaymasterUserOp(userOp, bytes32(0), 0.5 ether);

        vm.prank(address(mockEntryPoint));
        paymaster.postOp(PostOpMode.opSucceeded, context2, 0.5 ether, 0);

        assertEq(paymaster.userSpentToday(userOp.sender), 0.5 ether); // Resets and tracks new amount
    }
}
