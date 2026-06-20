// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Agentis is Ownable, ReentrancyGuard {
    enum JobStatus {
        Created,
        Accepted,
        Delivered,
        Approved,
        Disputed,
        AwaitingVerdict,
        VerdictSubmitted,
        Appealed,
        Finalized,
        Cancelled,
        Expired
    }

    enum DisputeType {
        JobDelivery,
        SLABreach,
        EscrowRelease,
        ReputationClaim,
        MultiAgentFault
    }

    enum VerdictOutcome {
        None,
        PayAgent,
        RefundClient,
        Split,
        Invalid,
        NeedsMoreEvidence
    }

    struct Job {
        uint256 id;
        address client;
        address agent;
        address token;
        uint256 paymentAmount;
        uint256 agentBondAmount;
        uint256 platformFeeBps;
        uint256 createdAt;
        uint256 acceptedAt;
        uint256 deadline;
        uint256 deliveredAt;
        uint256 verdictAt;
        uint256 appealDeadline;
        uint256 verdictRequestedAt;
        uint8 appealCount;
        JobStatus status;
        DisputeType disputeType;
        string taskDescription;
        string successCriteria;
        string deliveryUrl;
        string clientEvidenceUrl;
        string agentEvidenceUrl;
        string complaint;
        string agentResponse;
    }

    struct Verdict {
        VerdictOutcome outcome;
        uint16 agentPaymentBps;
        uint16 clientRefundBps;
        uint16 agentBondSlashBps;
        uint16 confidenceBps;
        bytes32 verdictHash;
        string reasoning;
        string responsibleParty;
        string evidenceQuality;
        uint256 submittedAt;
    }

    struct PendingPayouts {
        uint256 clientAmount;
        uint256 agentAmount;
        uint256 treasuryAmount;
    }

    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_PLATFORM_FEE_BPS = 1_000;
    uint256 public constant APPEAL_BOND_BPS = 500;

    uint256 public jobCount;
    mapping(uint256 => Job) public jobs;
    mapping(uint256 => Verdict) public verdicts;
    mapping(uint256 => PendingPayouts) public pendingPayouts;

    mapping(address => uint256[]) private jobsByClient;
    mapping(address => uint256[]) private jobsByAgent;
    mapping(uint256 => bool) public settlementFinalized;
    mapping(uint256 => uint8) public verdictRequestRound;
    mapping(uint256 => uint8) public verdictRecordedRound;
    mapping(uint256 => uint256) public appealBondAmount;
    mapping(uint256 => address) public appealBondPayer;

    address public verdictRelayer;
    address public platformTreasury;
    uint256 public defaultPlatformFeeBps;
    uint256 public appealWindowSeconds;
    uint256 public verdictTimeoutSeconds = 7 days;
    uint256 public accumulatedFees;

    event JobCreated(
        uint256 indexed jobId,
        address indexed client,
        address indexed agent,
        uint256 paymentAmount,
        uint256 deadline
    );
    event JobAccepted(uint256 indexed jobId, address indexed agent, uint256 agentBondAmount);
    event JobCancelled(uint256 indexed jobId);
    event DeliverySubmitted(uint256 indexed jobId, string deliveryUrl);
    event JobApproved(uint256 indexed jobId, uint256 agentPayout, uint256 fee);
    event DisputeOpened(
        uint256 indexed jobId,
        address indexed openedBy,
        DisputeType disputeType,
        string complaint
    );
    event EvidenceSubmitted(uint256 indexed jobId, address indexed submittedBy, string evidenceUrl);
    event VerdictRequested(uint256 indexed jobId, uint256 indexed chainId);
    event VerdictRecorded(
        uint256 indexed jobId,
        VerdictOutcome outcome,
        uint16 agentPaymentBps,
        uint16 clientRefundBps,
        uint16 agentBondSlashBps,
        bytes32 verdictHash
    );
    event AppealFiled(uint256 indexed jobId, address indexed filedBy, string appealEvidenceUrl);
    event SettlementFinalized(
        uint256 indexed jobId,
        uint256 clientAmount,
        uint256 agentAmount,
        uint256 treasuryAmount
    );
    event PayoutClaimed(uint256 indexed jobId, address indexed recipient, uint256 amount);
    event FeesWithdrawn(address indexed treasury, uint256 amount);
    event VerdictRelayerUpdated(address indexed oldRelayer, address indexed newRelayer);
    event PlatformTreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event PlatformFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event AppealWindowUpdated(uint256 oldWindow, uint256 newWindow);
    event VerdictTimeoutUpdated(uint256 oldTimeout, uint256 newTimeout);

    modifier jobExists(uint256 jobId) {
        require(jobId > 0 && jobId <= jobCount, "job not found");
        _;
    }

    modifier onlyClient(uint256 jobId) {
        require(msg.sender == jobs[jobId].client, "only client");
        _;
    }

    modifier onlyAgent(uint256 jobId) {
        require(msg.sender == jobs[jobId].agent, "only agent");
        _;
    }

    modifier onlyParty(uint256 jobId) {
        require(msg.sender == jobs[jobId].client || msg.sender == jobs[jobId].agent, "only party");
        _;
    }

    modifier onlyRelayer() {
        require(msg.sender == verdictRelayer, "only relayer");
        _;
    }

    constructor(
        address _verdictRelayer,
        address _platformTreasury,
        uint256 _defaultPlatformFeeBps,
        uint256 _appealWindowSeconds
    ) Ownable(msg.sender) {
        require(_verdictRelayer != address(0), "bad relayer");
        require(_platformTreasury != address(0), "bad treasury");
        require(_defaultPlatformFeeBps <= MAX_PLATFORM_FEE_BPS, "fee too high");

        verdictRelayer = _verdictRelayer;
        platformTreasury = _platformTreasury;
        defaultPlatformFeeBps = _defaultPlatformFeeBps;
        appealWindowSeconds = _appealWindowSeconds;
    }

    function createJob(
        address agent,
        string calldata taskDescription,
        string calldata successCriteria,
        uint256 deadline
    ) external payable nonReentrant returns (uint256 jobId) {
        require(msg.value > 0, "escrow required");
        require(agent != address(0), "bad agent");
        require(agent != msg.sender, "agent is client");
        require(bytes(taskDescription).length > 0, "empty task");
        require(bytes(successCriteria).length > 0, "empty criteria");
        require(deadline > block.timestamp, "bad deadline");

        jobId = ++jobCount;
        Job storage job = jobs[jobId];
        job.id = jobId;
        job.client = msg.sender;
        job.agent = agent;
        job.token = address(0);
        job.paymentAmount = msg.value;
        job.platformFeeBps = defaultPlatformFeeBps;
        job.createdAt = block.timestamp;
        job.deadline = deadline;
        job.status = JobStatus.Created;
        job.taskDescription = taskDescription;
        job.successCriteria = successCriteria;

        jobsByClient[msg.sender].push(jobId);
        jobsByAgent[agent].push(jobId);

        emit JobCreated(jobId, msg.sender, agent, msg.value, deadline);
    }

    function acceptJob(uint256 jobId) external payable nonReentrant jobExists(jobId) onlyAgent(jobId) {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Created, "bad status");
        require(block.timestamp <= job.deadline, "deadline passed");

        job.agentBondAmount = msg.value;
        job.acceptedAt = block.timestamp;
        job.status = JobStatus.Accepted;

        emit JobAccepted(jobId, msg.sender, msg.value);
    }

    function cancelJob(uint256 jobId) external nonReentrant jobExists(jobId) onlyClient(jobId) {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Created, "bad status");
        require(!settlementFinalized[jobId], "settled");

        pendingPayouts[jobId].clientAmount += job.paymentAmount;
        settlementFinalized[jobId] = true;
        job.status = JobStatus.Cancelled;

        emit JobCancelled(jobId);
        emit SettlementFinalized(jobId, pendingPayouts[jobId].clientAmount, 0, 0);
    }

    function submitDelivery(uint256 jobId, string calldata deliveryUrl)
        external
        jobExists(jobId)
        onlyAgent(jobId)
    {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Accepted, "bad status");
        require(bytes(deliveryUrl).length > 0, "empty delivery");

        job.deliveryUrl = deliveryUrl;
        job.deliveredAt = block.timestamp;
        job.status = JobStatus.Delivered;

        emit DeliverySubmitted(jobId, deliveryUrl);
    }

    function approveDelivery(uint256 jobId) external nonReentrant jobExists(jobId) onlyClient(jobId) {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Delivered, "bad status");
        require(!settlementFinalized[jobId], "settled");

        (uint256 agentNet, uint256 fee) = _agentPaymentAfterFee(job.paymentAmount, job.platformFeeBps);
        pendingPayouts[jobId].agentAmount += agentNet + job.agentBondAmount;
        pendingPayouts[jobId].treasuryAmount += fee;
        accumulatedFees += fee;
        settlementFinalized[jobId] = true;
        job.status = JobStatus.Finalized;

        emit JobApproved(jobId, agentNet, fee);
        emit SettlementFinalized(jobId, 0, pendingPayouts[jobId].agentAmount, fee);
    }

    function openDispute(
        uint256 jobId,
        DisputeType disputeType,
        string calldata complaint,
        string calldata initialEvidenceUrl
    ) external jobExists(jobId) onlyParty(jobId) {
        Job storage job = jobs[jobId];
        require(
            job.status == JobStatus.Delivered ||
                (job.status == JobStatus.Accepted && block.timestamp > job.deadline),
            "bad status"
        );
        require(bytes(complaint).length > 0, "empty complaint");

        job.disputeType = disputeType;
        job.complaint = complaint;
        job.status = JobStatus.Disputed;

        if (bytes(initialEvidenceUrl).length > 0) {
            _storeEvidence(job, msg.sender, initialEvidenceUrl, "");
            emit EvidenceSubmitted(jobId, msg.sender, initialEvidenceUrl);
        }

        emit DisputeOpened(jobId, msg.sender, disputeType, complaint);
    }

    function submitEvidence(
        uint256 jobId,
        string calldata evidenceUrl,
        string calldata responseText
    ) external jobExists(jobId) onlyParty(jobId) {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Disputed || job.status == JobStatus.AwaitingVerdict, "bad status");
        require(bytes(evidenceUrl).length > 0, "empty evidence");

        _storeEvidence(job, msg.sender, evidenceUrl, responseText);
        emit EvidenceSubmitted(jobId, msg.sender, evidenceUrl);
    }

    function requestVerdict(uint256 jobId) external jobExists(jobId) {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Disputed || job.status == JobStatus.Appealed, "bad status");
        require(
            bytes(job.clientEvidenceUrl).length > 0 || bytes(job.agentEvidenceUrl).length > 0,
            "evidence required"
        );

        unchecked {
            verdictRequestRound[jobId] += 1;
        }
        job.verdictRequestedAt = block.timestamp;
        job.status = JobStatus.AwaitingVerdict;

        emit VerdictRequested(jobId, block.chainid);
    }

    function recordVerdict(
        uint256 jobId,
        VerdictOutcome outcome,
        uint16 agentPaymentBps,
        uint16 clientRefundBps,
        uint16 agentBondSlashBps,
        uint16 confidenceBps,
        bytes32 verdictHash,
        string calldata reasoning,
        string calldata responsibleParty,
        string calldata evidenceQuality
    ) external jobExists(jobId) onlyRelayer {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.AwaitingVerdict, "bad status");
        require(verdictRequestRound[jobId] > verdictRecordedRound[jobId], "verdict recorded");
        require(outcome != VerdictOutcome.None, "bad outcome");
        require(uint256(agentPaymentBps) + uint256(clientRefundBps) <= BPS, "payout too high");
        require(agentBondSlashBps <= BPS, "slash too high");
        require(confidenceBps <= BPS, "confidence too high");
        require(verdictHash != bytes32(0), "empty hash");
        require(bytes(reasoning).length > 0, "empty reasoning");

        _validateOutcomeBps(outcome, agentPaymentBps, clientRefundBps);

        verdicts[jobId] = Verdict({
            outcome: outcome,
            agentPaymentBps: agentPaymentBps,
            clientRefundBps: clientRefundBps,
            agentBondSlashBps: agentBondSlashBps,
            confidenceBps: confidenceBps,
            verdictHash: verdictHash,
            reasoning: reasoning,
            responsibleParty: responsibleParty,
            evidenceQuality: evidenceQuality,
            submittedAt: block.timestamp
        });

        verdictRecordedRound[jobId] = verdictRequestRound[jobId];
        job.verdictAt = block.timestamp;
        job.appealDeadline = block.timestamp + appealWindowSeconds;
        job.status = JobStatus.VerdictSubmitted;

        emit VerdictRecorded(jobId, outcome, agentPaymentBps, clientRefundBps, agentBondSlashBps, verdictHash);
    }

    function appealVerdict(uint256 jobId, string calldata appealEvidenceUrl)
        external
        payable
        jobExists(jobId)
        onlyParty(jobId)
    {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.VerdictSubmitted, "bad status");
        require(block.timestamp <= job.appealDeadline, "appeal closed");
        require(job.appealCount == 0, "appeal used");
        require(bytes(appealEvidenceUrl).length > 0, "empty evidence");

        uint256 requiredBond = (job.paymentAmount * APPEAL_BOND_BPS) / BPS;
        require(msg.value >= requiredBond, "appeal bond required");

        job.appealCount = 1;
        appealBondAmount[jobId] = msg.value;
        appealBondPayer[jobId] = msg.sender;
        _storeEvidence(job, msg.sender, appealEvidenceUrl, "");
        job.status = JobStatus.Appealed;

        emit AppealFiled(jobId, msg.sender, appealEvidenceUrl);
        emit EvidenceSubmitted(jobId, msg.sender, appealEvidenceUrl);
    }

    function finalizeSettlement(uint256 jobId) external nonReentrant jobExists(jobId) {
        Job storage job = jobs[jobId];
        Verdict storage verdict = verdicts[jobId];
        require(job.status == JobStatus.VerdictSubmitted, "bad status");
        require(block.timestamp > job.appealDeadline, "appeal active");
        require(!settlementFinalized[jobId], "settled");
        require(verdict.outcome != VerdictOutcome.NeedsMoreEvidence, "needs more evidence");

        PendingPayouts storage payouts = pendingPayouts[jobId];
        uint256 agentGross = (job.paymentAmount * verdict.agentPaymentBps) / BPS;
        uint256 clientRefund = (job.paymentAmount * verdict.clientRefundBps) / BPS;
        uint256 remainderToClient = job.paymentAmount - agentGross - clientRefund;
        (uint256 agentNet, uint256 fee) = _agentPaymentAfterFee(agentGross, job.platformFeeBps);

        uint256 bondSlash = (job.agentBondAmount * verdict.agentBondSlashBps) / BPS;
        uint256 bondReturn = job.agentBondAmount - bondSlash;

        payouts.clientAmount += clientRefund + remainderToClient;
        payouts.agentAmount += agentNet + bondReturn;
        payouts.treasuryAmount += fee;
        accumulatedFees += fee;

        if (bondSlash > 0) {
            if (_agentIsResponsible(verdict.responsibleParty)) {
                payouts.clientAmount += bondSlash;
            } else {
                payouts.agentAmount += bondSlash;
            }
        }

        _returnAppealBond(jobId, payouts);

        settlementFinalized[jobId] = true;
        job.status = JobStatus.Finalized;

        emit SettlementFinalized(jobId, payouts.clientAmount, payouts.agentAmount, fee);
    }

    function claimPayout(uint256 jobId) external nonReentrant jobExists(jobId) {
        PendingPayouts storage payouts = pendingPayouts[jobId];
        uint256 amount;

        if (msg.sender == jobs[jobId].client) {
            amount = payouts.clientAmount;
            payouts.clientAmount = 0;
        } else if (msg.sender == jobs[jobId].agent) {
            amount = payouts.agentAmount;
            payouts.agentAmount = 0;
        } else {
            revert("no payout");
        }

        require(amount > 0, "nothing to claim");
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "transfer failed");

        emit PayoutClaimed(jobId, msg.sender, amount);
    }

    function withdrawFees() external nonReentrant {
        require(msg.sender == platformTreasury || msg.sender == owner(), "not treasury");
        uint256 amount = accumulatedFees;
        require(amount > 0, "no fees");

        accumulatedFees = 0;
        (bool ok, ) = payable(platformTreasury).call{value: amount}("");
        require(ok, "transfer failed");

        emit FeesWithdrawn(platformTreasury, amount);
    }

    function timeoutRefund(uint256 jobId) external nonReentrant jobExists(jobId) {
        Job storage job = jobs[jobId];
        bool verdictMissing = job.status == JobStatus.AwaitingVerdict &&
            block.timestamp > job.verdictRequestedAt + verdictTimeoutSeconds;
        bool needsEvidenceExpired = job.status == JobStatus.VerdictSubmitted &&
            verdicts[jobId].outcome == VerdictOutcome.NeedsMoreEvidence &&
            block.timestamp > job.appealDeadline + verdictTimeoutSeconds;
        require(verdictMissing || needsEvidenceExpired, "timeout inactive");
        require(!settlementFinalized[jobId], "settled");

        PendingPayouts storage payouts = pendingPayouts[jobId];
        payouts.clientAmount += job.paymentAmount;
        payouts.agentAmount += job.agentBondAmount;
        _returnAppealBond(jobId, payouts);

        settlementFinalized[jobId] = true;
        job.status = JobStatus.Expired;

        emit SettlementFinalized(jobId, payouts.clientAmount, payouts.agentAmount, 0);
    }

    function setVerdictRelayer(address newRelayer) external onlyOwner {
        require(newRelayer != address(0), "bad relayer");
        address oldRelayer = verdictRelayer;
        verdictRelayer = newRelayer;
        emit VerdictRelayerUpdated(oldRelayer, newRelayer);
    }

    function setPlatformTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "bad treasury");
        address oldTreasury = platformTreasury;
        platformTreasury = newTreasury;
        emit PlatformTreasuryUpdated(oldTreasury, newTreasury);
    }

    function setDefaultPlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_PLATFORM_FEE_BPS, "fee too high");
        uint256 oldFee = defaultPlatformFeeBps;
        defaultPlatformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(oldFee, newFeeBps);
    }

    function setAppealWindowSeconds(uint256 newWindow) external onlyOwner {
        uint256 oldWindow = appealWindowSeconds;
        appealWindowSeconds = newWindow;
        emit AppealWindowUpdated(oldWindow, newWindow);
    }

    function setVerdictTimeoutSeconds(uint256 newTimeout) external onlyOwner {
        require(newTimeout >= 1 hours, "timeout too short");
        uint256 oldTimeout = verdictTimeoutSeconds;
        verdictTimeoutSeconds = newTimeout;
        emit VerdictTimeoutUpdated(oldTimeout, newTimeout);
    }

    function getJob(uint256 jobId) external view jobExists(jobId) returns (Job memory) {
        return jobs[jobId];
    }

    function getVerdict(uint256 jobId) external view jobExists(jobId) returns (Verdict memory) {
        return verdicts[jobId];
    }

    function getPendingPayouts(uint256 jobId)
        external
        view
        jobExists(jobId)
        returns (PendingPayouts memory)
    {
        return pendingPayouts[jobId];
    }

    function getJobCount() external view returns (uint256) {
        return jobCount;
    }

    function getJobsByClient(address client) external view returns (uint256[] memory) {
        return jobsByClient[client];
    }

    function getJobsByAgent(address agent) external view returns (uint256[] memory) {
        return jobsByAgent[agent];
    }

    function _storeEvidence(
        Job storage job,
        address sender,
        string memory evidenceUrl,
        string memory responseText
    ) internal {
        if (sender == job.client) {
            job.clientEvidenceUrl = evidenceUrl;
            if (bytes(responseText).length > 0) {
                job.complaint = responseText;
            }
        } else {
            job.agentEvidenceUrl = evidenceUrl;
            if (bytes(responseText).length > 0) {
                job.agentResponse = responseText;
            }
        }
    }

    function _agentPaymentAfterFee(uint256 amount, uint256 feeBps)
        internal
        pure
        returns (uint256 agentNet, uint256 fee)
    {
        fee = (amount * feeBps) / BPS;
        agentNet = amount - fee;
    }

    function _validateOutcomeBps(VerdictOutcome outcome, uint16 agentPaymentBps, uint16 clientRefundBps)
        internal
        pure
    {
        if (outcome == VerdictOutcome.PayAgent) {
            require(agentPaymentBps == BPS && clientRefundBps == 0, "bad pay verdict");
        } else if (outcome == VerdictOutcome.RefundClient || outcome == VerdictOutcome.Invalid) {
            require(agentPaymentBps == 0 && clientRefundBps == BPS, "bad refund verdict");
        } else if (outcome == VerdictOutcome.Split) {
            require(agentPaymentBps > 0 && clientRefundBps > 0, "bad split verdict");
            require(uint256(agentPaymentBps) + uint256(clientRefundBps) <= BPS, "bad split total");
        } else if (outcome == VerdictOutcome.NeedsMoreEvidence) {
            require(agentPaymentBps == 0 && clientRefundBps == 0, "bad evidence verdict");
        }
    }

    function _agentIsResponsible(string memory responsibleParty) internal pure returns (bool) {
        bytes32 value = keccak256(bytes(responsibleParty));
        return value == keccak256(bytes("agent")) ||
            value == keccak256(bytes("subagent")) ||
            value == keccak256(bytes("both"));
    }

    function _returnAppealBond(uint256 jobId, PendingPayouts storage payouts) internal {
        uint256 bond = appealBondAmount[jobId];
        if (bond == 0) {
            return;
        }

        address payer = appealBondPayer[jobId];
        appealBondAmount[jobId] = 0;

        if (payer == jobs[jobId].client) {
            payouts.clientAmount += bond;
        } else if (payer == jobs[jobId].agent) {
            payouts.agentAmount += bond;
        }
    }
}
