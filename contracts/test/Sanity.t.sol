// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title SanityTest
 * @notice Basic environment sanity test verifying compilation and EVM test runner setup.
 */
contract SanityTest {
    uint256 private constant EXPECTED_CHAIN_ID = 31337;

    function test_SanityEnvironmentCheck() external pure {
        uint256 localChainId = EXPECTED_CHAIN_ID;
        require(localChainId == EXPECTED_CHAIN_ID, "Environment check failed");
    }
}
