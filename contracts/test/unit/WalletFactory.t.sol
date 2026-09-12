// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {WalletFactory} from "../../src/factory/WalletFactory.sol";
import {IWalletFactory} from "../../src/interfaces/IWalletFactory.sol";
import {SmartWallet} from "../../src/wallet/SmartWallet.sol";
import {IWalletErrors} from "../../src/wallet/WalletErrors.sol";

contract WalletFactoryUnitTest is Test, IWalletErrors {
    WalletFactory internal factory;

    address internal owner1;
    address internal owner2;
    address internal randomAddress;
    address internal dummyEntryPoint;

    function setUp() public {
        dummyEntryPoint = makeAddr("entryPoint");
        factory = new WalletFactory(dummyEntryPoint);
        owner1 = makeAddr("owner1");
        owner2 = makeAddr("owner2");
        randomAddress = makeAddr("randomAddress");
    }

    /* -------------------------------------------------------------------------- */
    /*                         1. FACTORY DEPLOYMENT TESTS                        */
    /* -------------------------------------------------------------------------- */

    function test_Factory_Deployment() public view {
        assertFalse(factory.isWallet(randomAddress));
        assertEq(factory.getWalletCount(owner1), 0);
        assertEq(factory.getWallets(owner1).length, 0);
    }

    /* -------------------------------------------------------------------------- */
    /*                         2. WALLET CREATION & EVENTS                        */
    /* -------------------------------------------------------------------------- */

    function test_Factory_CreateWallet_Success() public {
        uint256 salt = 0;
        address predicted = factory.getAddress(owner1, salt);

        vm.expectEmit(true, true, false, true, address(factory));
        emit IWalletFactory.WalletCreated(predicted, owner1, salt);

        address deployed = factory.createWallet(owner1, salt);

        assertEq(deployed, predicted, "Deployed address must match counterfactual CREATE2 prediction");
        assertTrue(factory.isWallet(deployed), "Factory registry must confirm wallet creation");

        // Verify deployed wallet state
        SmartWallet wallet = SmartWallet(payable(deployed));
        assertEq(wallet.owner(), owner1, "Wallet owner must match requested owner");
        assertEq(wallet.getNonce(), 0, "Initial nonce must be zero");
        assertEq(wallet.getBalance(), 0, "Initial balance must be zero");

        // Verify registry lookups
        assertEq(factory.getWalletCount(owner1), 1);
        address[] memory wallets = factory.getWallets(owner1);
        assertEq(wallets.length, 1);
        assertEq(wallets[0], deployed);
    }

    function test_Factory_CreateWallet_RevertWhen_OwnerIsZeroAddress() public {
        vm.expectRevert(abi.encodeWithSelector(InvalidOwner.selector));
        factory.createWallet(address(0), 0);
    }

    function test_Factory_GetAddress_RevertWhen_OwnerIsZeroAddress() public {
        vm.expectRevert(abi.encodeWithSelector(InvalidOwner.selector));
        factory.getAddress(address(0), 0);
    }

    /* -------------------------------------------------------------------------- */
    /*                         3. MULTIPLE WALLETS & SALTS                        */
    /* -------------------------------------------------------------------------- */

    function test_Factory_MultipleWallets_SameOwnerDifferentSalts() public {
        address wallet0 = factory.createWallet(owner1, 0);
        address wallet1 = factory.createWallet(owner1, 1);
        address wallet2 = factory.createWallet(owner1, 2);

        assertTrue(wallet0 != wallet1 && wallet1 != wallet2 && wallet0 != wallet2);

        assertTrue(factory.isWallet(wallet0));
        assertTrue(factory.isWallet(wallet1));
        assertTrue(factory.isWallet(wallet2));

        assertEq(factory.getWalletCount(owner1), 3);
        address[] memory wallets = factory.getWallets(owner1);
        assertEq(wallets.length, 3);
        assertEq(wallets[0], wallet0);
        assertEq(wallets[1], wallet1);
        assertEq(wallets[2], wallet2);
    }

    function test_Factory_MultipleWallets_DifferentOwnersSameSalt() public {
        uint256 salt = 42;
        address walletOwner1 = factory.createWallet(owner1, salt);
        address walletOwner2 = factory.createWallet(owner2, salt);

        assertTrue(walletOwner1 != walletOwner2, "Different owners with same salt must yield distinct addresses");

        assertEq(SmartWallet(payable(walletOwner1)).owner(), owner1);
        assertEq(SmartWallet(payable(walletOwner2)).owner(), owner2);

        assertEq(factory.getWalletCount(owner1), 1);
        assertEq(factory.getWalletCount(owner2), 1);
    }

    /* -------------------------------------------------------------------------- */
    /*                         4. DUPLICATE DEPLOYMENT DEFENSE                    */
    /* -------------------------------------------------------------------------- */

    function test_Factory_CreateWallet_RevertWhen_WalletAlreadyExists() public {
        uint256 salt = 100;
        address deployed = factory.createWallet(owner1, salt);

        vm.expectRevert(abi.encodeWithSelector(IWalletFactory.WalletAlreadyExists.selector, deployed));
        factory.createWallet(owner1, salt);
    }
}
