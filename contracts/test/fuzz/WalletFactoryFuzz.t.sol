// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {WalletFactory} from "../../src/factory/WalletFactory.sol";
import {SmartWallet} from "../../src/wallet/SmartWallet.sol";
import {IWalletErrors} from "../../src/wallet/WalletErrors.sol";

contract WalletFactoryFuzzTest is Test, IWalletErrors {
    WalletFactory internal factory;

    function setUp() public {
        factory = new WalletFactory();
    }

    /* -------------------------------------------------------------------------- */
    /*                              FUZZ TESTS                                    */
    /* -------------------------------------------------------------------------- */

    function testFuzz_CreateWallet_DeterministicAddressMatching(
        address owner,
        uint256 salt
    ) public {
        vm.assume(owner != address(0));
        // Avoid precompiles or existing contracts
        vm.assume(owner.code.length == 0);

        address predicted = factory.getAddress(owner, salt);
        address deployed = factory.createWallet(owner, salt);

        assertEq(deployed, predicted, "Deployed address must match counterfactual predicted address");
        assertTrue(factory.isWallet(deployed), "Factory registry must recognize deployed wallet");

        SmartWallet wallet = SmartWallet(payable(deployed));
        assertEq(wallet.owner(), owner, "Owner must match fuzzed input");
        assertEq(wallet.getNonce(), 0, "Initial nonce must be zero");
    }

    function testFuzz_CreateWallet_RevertOnZeroAddress(uint256 salt) public {
        vm.expectRevert(abi.encodeWithSelector(InvalidOwner.selector));
        factory.createWallet(address(0), salt);

        vm.expectRevert(abi.encodeWithSelector(InvalidOwner.selector));
        factory.getAddress(address(0), salt);
    }
}
