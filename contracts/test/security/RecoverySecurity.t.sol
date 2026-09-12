// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {SmartWallet} from "../../src/wallet/SmartWallet.sol";
import {ISmartWallet} from "../../src/interfaces/ISmartWallet.sol";
import {IWalletErrors} from "../../src/wallet/WalletErrors.sol";

contract RecoverySecurityTest is Test, IWalletErrors {
    SmartWallet internal wallet;

    uint256 internal ownerPrivateKey;
    address internal ownerAddress;

    address internal guardianA;
    address internal guardianB;
    address internal guardianC;

    address internal attacker;
    address internal newOwner;

    function setUp() public {
        ownerPrivateKey = 0xABCD1234;
        ownerAddress = vm.addr(ownerPrivateKey);

        guardianA = makeAddr("guardianA");
        guardianB = makeAddr("guardianB");
        guardianC = makeAddr("guardianC");

        attacker = makeAddr("attacker");
        newOwner = makeAddr("newOwner");

        wallet = new SmartWallet(ownerAddress);

        // Add 3 guardians and set threshold to 2
        vm.startPrank(ownerAddress);
        wallet.addGuardian(guardianA);
        wallet.addGuardian(guardianB);
        wallet.addGuardian(guardianC);
        wallet.setRecoveryThreshold(2);
        vm.stopPrank();
    }

    /* -------------------------------------------------------------------------- */
    /*                         GUARDIAN MANAGEMENT                                */
    /* -------------------------------------------------------------------------- */

    function test_Recovery_AddGuardian_OnlyOwner() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(UnauthorizedCaller.selector, attacker));
        wallet.addGuardian(attacker);
    }

    function test_Recovery_RemoveGuardian_AutoAdjustsThreshold() public {
        vm.startPrank(ownerAddress);
        wallet.removeGuardian(guardianA);
        wallet.removeGuardian(guardianB);
        // Guardian count is now 1. Threshold was 2. It should auto-adjust to 1.
        assertEq(wallet.recoveryThreshold(), 1);
        vm.stopPrank();
    }

    /* -------------------------------------------------------------------------- */
    /*                         RECOVERY INITIATION & APPROVAL                     */
    /* -------------------------------------------------------------------------- */

    function test_Recovery_Initiate_OnlyGuardian() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(InvalidGuardian.selector));
        wallet.initiateRecovery(newOwner);
    }

    function test_Recovery_Approve_PreventsDoubleVoting() public {
        vm.prank(guardianA);
        wallet.initiateRecovery(newOwner);

        // Guardian A already voted via initiateRecovery
        vm.prank(guardianA);
        vm.expectRevert(abi.encodeWithSelector(AlreadyApproved.selector));
        wallet.approveRecovery(newOwner);
    }

    function test_Recovery_Approve_OnlyGuardian() public {
        vm.prank(guardianA);
        wallet.initiateRecovery(newOwner);

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(InvalidGuardian.selector));
        wallet.approveRecovery(newOwner);
    }

    function test_Recovery_Approve_WrongOwnerFails() public {
        vm.prank(guardianA);
        wallet.initiateRecovery(newOwner);

        address wrongOwner = makeAddr("wrongOwner");
        vm.prank(guardianB);
        vm.expectRevert(abi.encodeWithSelector(InvalidRecoveryOwner.selector));
        wallet.approveRecovery(wrongOwner);
    }

    /* -------------------------------------------------------------------------- */
    /*                         RECOVERY EXECUTION & TIMELOCK                      */
    /* -------------------------------------------------------------------------- */

    function test_Recovery_Execute_FailsBeforeTimelock() public {
        vm.prank(guardianA);
        wallet.initiateRecovery(newOwner);

        vm.prank(guardianB);
        wallet.approveRecovery(newOwner); // Threshold met, timelock starts

        // Attempt immediate execution
        vm.expectRevert(abi.encodeWithSelector(RecoveryNotReady.selector));
        wallet.executeRecovery();
    }

    function test_Recovery_Execute_SucceedsAfterTimelock() public {
        vm.prank(guardianA);
        wallet.initiateRecovery(newOwner);

        vm.prank(guardianB);
        wallet.approveRecovery(newOwner); // Threshold met, timelock starts (48 hrs)

        // Advance time by 48 hours
        vm.warp(block.timestamp + 48 hours);

        wallet.executeRecovery();

        assertEq(wallet.owner(), newOwner);
    }

    function test_Recovery_Execute_ResetsState() public {
        vm.prank(guardianA);
        wallet.initiateRecovery(newOwner);

        vm.prank(guardianB);
        wallet.approveRecovery(newOwner);

        vm.warp(block.timestamp + 48 hours);
        wallet.executeRecovery();

        // State should be cleared
        assertEq(wallet.recoveryProposedOwner(), address(0));
        assertEq(wallet.recoveryExecuteAfter(), 0);
        assertEq(wallet.currentRecoveryApprovals(), 0);
    }

    /* -------------------------------------------------------------------------- */
    /*                         RECOVERY CANCELLATION                              */
    /* -------------------------------------------------------------------------- */

    function test_Recovery_Cancel_OnlyOwner() public {
        vm.prank(guardianA);
        wallet.initiateRecovery(newOwner);

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(UnauthorizedCaller.selector, attacker));
        wallet.cancelRecovery();
    }

    function test_Recovery_Cancel_InvalidatesApprovals() public {
        vm.prank(guardianA);
        wallet.initiateRecovery(newOwner);
        
        uint256 initialRound = wallet.currentRecoveryRound();

        vm.prank(ownerAddress);
        wallet.cancelRecovery();
        
        uint256 newRound = wallet.currentRecoveryRound();
        assertEq(newRound, initialRound + 1);
        assertEq(wallet.recoveryProposedOwner(), address(0));

        // Attempting to approve the cancelled recovery should fail (wrong owner)
        vm.prank(guardianB);
        vm.expectRevert(abi.encodeWithSelector(InvalidRecoveryOwner.selector));
        wallet.approveRecovery(newOwner);
    }

    function test_Recovery_Cancel_PreventsExecution() public {
        vm.prank(guardianA);
        wallet.initiateRecovery(newOwner);

        vm.prank(guardianB);
        wallet.approveRecovery(newOwner); // Threshold met

        vm.prank(ownerAddress);
        wallet.cancelRecovery(); // Owner cancels

        vm.warp(block.timestamp + 48 hours);

        // Attempting execution fails because state is reset
        vm.expectRevert(abi.encodeWithSelector(RecoveryNotReady.selector));
        wallet.executeRecovery();
    }
}
