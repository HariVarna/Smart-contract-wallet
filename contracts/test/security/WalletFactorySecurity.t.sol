// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {WalletFactory} from "../../src/factory/WalletFactory.sol";
import {IWalletFactory} from "../../src/interfaces/IWalletFactory.sol";
import {SmartWallet} from "../../src/wallet/SmartWallet.sol";
import {IWalletErrors} from "../../src/wallet/WalletErrors.sol";

contract WalletFactorySecurityTest is Test, IWalletErrors {
    WalletFactory internal factory;
    WalletFactory internal secondFactory;

    address internal victimOwner;
    address internal attacker;
    address internal recipient;

    function setUp() public {
        factory = new WalletFactory();
        secondFactory = new WalletFactory();

        victimOwner = makeAddr("victimOwner");
        attacker = makeAddr("attacker");
        recipient = makeAddr("recipient");
    }

    /* -------------------------------------------------------------------------- */
    /*                   1. COUNTERFACTUAL PRE-FUNDING SECURITY                   */
    /* -------------------------------------------------------------------------- */

    function test_Security_CounterfactualPreFunding_BalancePreserved() public {
        uint256 salt = 777;
        address predictedWallet = factory.getAddress(victimOwner, salt);

        // Pre-fund counterfactual address before on-chain deployment
        vm.deal(predictedWallet, 5 ether);
        assertEq(predictedWallet.balance, 5 ether);
        assertEq(predictedWallet.code.length, 0);

        // Deploy wallet via factory
        address deployedWallet = factory.createWallet(victimOwner, salt);
        assertEq(deployedWallet, predictedWallet);

        // Verify balance is accessible and controllable only by victimOwner
        SmartWallet wallet = SmartWallet(payable(deployedWallet));
        assertEq(wallet.getBalance(), 5 ether);

        vm.prank(victimOwner);
        wallet.execute(recipient, 2 ether, "");
        assertEq(recipient.balance, 2 ether);
        assertEq(wallet.getBalance(), 3 ether);
    }

    /* -------------------------------------------------------------------------- */
    /*                   2. FRONT-RUNNING RESILIENCE                              */
    /* -------------------------------------------------------------------------- */

    function test_Security_FrontRunning_AttackerCannotHijackOwnership() public {
        uint256 salt = 999;
        address predicted = factory.getAddress(victimOwner, salt);

        // Attacker observes transaction in mempool and front-runs deployment
        vm.prank(attacker);
        address deployedByAttacker = factory.createWallet(victimOwner, salt);

        assertEq(deployedByAttacker, predicted);

        SmartWallet wallet = SmartWallet(payable(deployedByAttacker));

        // Victim remains sole authorized owner
        assertEq(wallet.owner(), victimOwner);

        // Attacker cannot execute transactions
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(UnauthorizedCaller.selector, attacker));
        wallet.execute(recipient, 0, "");

        // Victim has full operational control
        vm.prank(victimOwner);
        wallet.execute(recipient, 0, "");
    }

    /* -------------------------------------------------------------------------- */
    /*                   3. FACTORY REGISTRY ISOLATION                            */
    /* -------------------------------------------------------------------------- */

    function test_Security_FactoryIsolation() public {
        uint256 salt = 123;
        address walletFactory1 = factory.createWallet(victimOwner, salt);

        assertTrue(factory.isWallet(walletFactory1));
        assertFalse(secondFactory.isWallet(walletFactory1), "Secondary factory must not claim ownership of external deployments");
    }
}
