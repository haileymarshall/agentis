// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAgentisClaimTarget {
    function createJob(
        address agent,
        string calldata taskDescription,
        string calldata successCriteria,
        uint256 deadline
    ) external payable returns (uint256);

    function cancelJob(uint256 jobId) external;

    function claimPayout(uint256 jobId) external;
}

contract ReenteringClaimer {
    IAgentisClaimTarget public immutable target;
    uint256 public jobId;
    bool public attemptedReentry;
    bool public reentrySucceeded;

    constructor(address target_) {
        target = IAgentisClaimTarget(target_);
    }

    function createCancelAndClaim(address agent, uint256 deadline) external payable {
        jobId = target.createJob{value: msg.value}(
            agent,
            "Reentrancy probe job",
            "The job only exists to test pull-payment safety.",
            deadline
        );
        target.cancelJob(jobId);
        target.claimPayout(jobId);
    }

    receive() external payable {
        if (!attemptedReentry) {
            attemptedReentry = true;
            try target.claimPayout(jobId) {
                reentrySucceeded = true;
            } catch {
                reentrySucceeded = false;
            }
        }
    }
}
