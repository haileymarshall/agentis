import assert from "node:assert/strict";
import { ethers, network } from "hardhat";

const Status = {
  Created: 0n,
  Accepted: 1n,
  Delivered: 2n,
  Disputed: 4n,
  AwaitingVerdict: 5n,
  VerdictSubmitted: 6n,
  Appealed: 7n,
  Finalized: 8n,
  Cancelled: 9n,
  Expired: 10n
} as const;

const Outcome = {
  PayAgent: 1,
  RefundClient: 2,
  Split: 3,
  Invalid: 4,
  NeedsMoreEvidence: 5
} as const;

async function latestTimestamp() {
  const block = await ethers.provider.getBlock("latest");
  assert(block);
  return BigInt(block.timestamp);
}

async function increaseTime(seconds: number) {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
}

async function expectRevert(action: Promise<unknown>, reason: string) {
  try {
    await action;
    assert.fail(`Expected revert containing ${reason}`);
  } catch (error) {
    assert.match(String(error), new RegExp(reason));
  }
}

async function deployAgentis() {
  const [owner, client, agent, relayer, treasury, other] = await ethers.getSigners();
  const Agentis = await ethers.getContractFactory("Agentis", owner);
  const agentis = await Agentis.deploy(relayer.address, treasury.address, 200, 3600);
  await agentis.waitForDeployment();
  return { agentis, owner, client, agent, relayer, treasury, other };
}

async function createJob(agentis: any, client: any, agent: any, value = ethers.parseEther("1")) {
  const deadline = (await latestTimestamp()) + 86_400n;
  await agentis.connect(client).createJob(
    agent.address,
    "Produce a verified lead list for Nigerian fintech startups.",
    "Include company name, website, contact email, and source link for each lead.",
    deadline,
    { value }
  );
  return agentis.getJobCount();
}

async function createAcceptedJob(agentis: any, client: any, agent: any, bond = 0n) {
  const jobId = await createJob(agentis, client, agent);
  await agentis.connect(agent).acceptJob(jobId, { value: bond });
  return jobId;
}

async function createDeliveredJob(agentis: any, client: any, agent: any, bond = 0n) {
  const jobId = await createAcceptedJob(agentis, client, agent, bond);
  await agentis.connect(agent).submitDelivery(jobId, "https://example.com/delivery");
  return jobId;
}

async function createRequestedDispute(agentis: any, client: any, agent: any, bond = 0n) {
  const jobId = await createDeliveredJob(agentis, client, agent, bond);
  await agentis
    .connect(client)
    .openDispute(jobId, 0, "Only 12 of the 20 requested leads are complete.", "https://example.com/client");
  await agentis
    .connect(agent)
    .submitEvidence(jobId, "https://example.com/agent", "The delivered 12 leads are high quality.");
  await agentis.connect(agent).requestVerdict(jobId);
  return jobId;
}

async function recordVerdict(
  agentis: any,
  relayer: any,
  jobId: bigint,
  outcome: number,
  agentBps: number,
  clientBps: number,
  slashBps = 0,
  responsibleParty = "agent"
) {
  await agentis.connect(relayer).recordVerdict(
    jobId,
    outcome,
    agentBps,
    clientBps,
    slashBps,
    8200,
    ethers.keccak256(ethers.toUtf8Bytes(`verdict-${jobId}-${outcome}-${agentBps}`)),
    "Structured GenLayer reasoning.",
    responsibleParty,
    "medium"
  );
}

describe("Agentis", function () {
  it("creates jobs, indexes parties, and lets the assigned agent accept with a bond", async function () {
    const { agentis, client, agent, other } = await deployAgentis();
    const jobId = await createJob(agentis, client, agent);

    const created = await agentis.getJob(jobId);
    assert.equal(created.client, client.address);
    assert.equal(created.agent, agent.address);
    assert.equal(created.status, Status.Created);
    assert.deepEqual(Array.from(await agentis.getJobsByClient(client.address)), [jobId]);
    assert.deepEqual(Array.from(await agentis.getJobsByAgent(agent.address)), [jobId]);

    await expectRevert(agentis.connect(other).acceptJob(jobId), "only agent");
    await agentis.connect(agent).acceptJob(jobId, { value: ethers.parseEther("0.1") });

    const accepted = await agentis.getJob(jobId);
    assert.equal(accepted.status, Status.Accepted);
    assert.equal(accepted.agentBondAmount, ethers.parseEther("0.1"));
  });

  it("lets the client cancel before acceptance and claim once", async function () {
    const { agentis, client, agent } = await deployAgentis();
    const jobId = await createJob(agentis, client, agent, ethers.parseEther("0.25"));

    await agentis.connect(client).cancelJob(jobId);
    const job = await agentis.getJob(jobId);
    assert.equal(job.status, Status.Cancelled);

    let payouts = await agentis.getPendingPayouts(jobId);
    assert.equal(payouts.clientAmount, ethers.parseEther("0.25"));

    await agentis.connect(client).claimPayout(jobId);
    payouts = await agentis.getPendingPayouts(jobId);
    assert.equal(payouts.clientAmount, 0n);
    await expectRevert(agentis.connect(client).claimPayout(jobId), "nothing to claim");
  });

  it("prevents cancellation after acceptance and non-agent delivery", async function () {
    const { agentis, client, agent, other } = await deployAgentis();
    const jobId = await createAcceptedJob(agentis, client, agent);

    await expectRevert(agentis.connect(client).cancelJob(jobId), "bad status");
    await expectRevert(agentis.connect(other).submitDelivery(jobId, "https://example.com"), "only agent");

    await agentis.connect(agent).submitDelivery(jobId, "https://example.com/delivery");
    const job = await agentis.getJob(jobId);
    assert.equal(job.status, Status.Delivered);
  });

  it("approves delivery, accounts for fees, and withdraws accumulated fees", async function () {
    const { agentis, owner, client, agent, treasury } = await deployAgentis();
    const jobId = await createDeliveredJob(agentis, client, agent, ethers.parseEther("0.1"));

    await agentis.connect(client).approveDelivery(jobId);
    const job = await agentis.getJob(jobId);
    assert.equal(job.status, Status.Finalized);

    const payouts = await agentis.getPendingPayouts(jobId);
    assert.equal(payouts.agentAmount, ethers.parseEther("1.08"));
    assert.equal(payouts.treasuryAmount, ethers.parseEther("0.02"));
    assert.equal(await agentis.accumulatedFees(), ethers.parseEther("0.02"));

    await agentis.connect(agent).claimPayout(jobId);
    await agentis.connect(owner).withdrawFees();
    assert.equal(await agentis.accumulatedFees(), 0n);
    assert((await ethers.provider.getBalance(treasury.address)) > 0n);
  });

  it("supports client and agent dispute evidence and emits a chain-bound verdict request", async function () {
    const { agentis, client, agent } = await deployAgentis();
    const jobId = await createDeliveredJob(agentis, client, agent);

    await agentis
      .connect(client)
      .openDispute(jobId, 0, "The leads are incomplete.", "https://example.com/client-evidence");
    await agentis
      .connect(agent)
      .submitEvidence(jobId, "https://example.com/agent-evidence", "Twelve leads are complete.");

    await agentis.connect(agent).requestVerdict(jobId);
    const job = await agentis.getJob(jobId);
    assert.equal(job.status, Status.AwaitingVerdict);
    assert.equal(job.clientEvidenceUrl, "https://example.com/client-evidence");
    assert.equal(job.agentEvidenceUrl, "https://example.com/agent-evidence");
  });

  it("allows an agent to dispute missed delivery approval after deadline", async function () {
    const { agentis, client, agent } = await deployAgentis();
    const deadline = (await latestTimestamp()) + 60n;
    await agentis.connect(client).createJob(
      agent.address,
      "Run a support agent for one hour.",
      "Responses should stay below two seconds.",
      deadline,
      { value: ethers.parseEther("0.2") }
    );
    await agentis.connect(agent).acceptJob(1n);
    await increaseTime(90);
    await agentis
      .connect(agent)
      .openDispute(1n, 1, "Client did not respond before the deadline.", "https://example.com/agent-log");
    const job = await agentis.getJob(1n);
    assert.equal(job.status, Status.Disputed);
  });

  it("restricts verdict recording to the relayer and rejects duplicate verdicts", async function () {
    const { agentis, client, agent, relayer, other } = await deployAgentis();
    const jobId = await createRequestedDispute(agentis, client, agent);

    await expectRevert(
      recordVerdict(agentis, other, jobId, Outcome.PayAgent, 10000, 0),
      "only relayer"
    );

    await recordVerdict(agentis, relayer, jobId, Outcome.PayAgent, 10000, 0);
    const job = await agentis.getJob(jobId);
    assert.equal(job.status, Status.VerdictSubmitted);

    await expectRevert(
      recordVerdict(agentis, relayer, jobId, Outcome.PayAgent, 10000, 0),
      "bad status"
    );
  });

  it("settles PAY_AGENT verdicts after the appeal window", async function () {
    const { agentis, client, agent, relayer } = await deployAgentis();
    const jobId = await createRequestedDispute(agentis, client, agent, ethers.parseEther("0.1"));

    await recordVerdict(agentis, relayer, jobId, Outcome.PayAgent, 10000, 0);
    await expectRevert(agentis.finalizeSettlement(jobId), "appeal active");

    await increaseTime(3601);
    await agentis.finalizeSettlement(jobId);
    const payouts = await agentis.getPendingPayouts(jobId);
    assert.equal(payouts.agentAmount, ethers.parseEther("1.08"));
    assert.equal(payouts.clientAmount, 0n);
  });

  it("settles REFUND_CLIENT, SPLIT, and INVALID verdict accounting", async function () {
    const { agentis, client, agent, relayer } = await deployAgentis();

    let jobId = await createRequestedDispute(agentis, client, agent, ethers.parseEther("0.1"));
    await recordVerdict(agentis, relayer, jobId, Outcome.RefundClient, 0, 10000, 5000);
    await increaseTime(3601);
    await agentis.finalizeSettlement(jobId);
    let payouts = await agentis.getPendingPayouts(jobId);
    assert.equal(payouts.clientAmount, ethers.parseEther("1.05"));
    assert.equal(payouts.agentAmount, ethers.parseEther("0.05"));

    jobId = await createRequestedDispute(agentis, client, agent);
    await recordVerdict(agentis, relayer, jobId, Outcome.Split, 5000, 5000);
    await increaseTime(3601);
    await agentis.finalizeSettlement(jobId);
    payouts = await agentis.getPendingPayouts(jobId);
    assert.equal(payouts.clientAmount, ethers.parseEther("0.5"));
    assert.equal(payouts.agentAmount, ethers.parseEther("0.49"));
    assert.equal(payouts.treasuryAmount, ethers.parseEther("0.01"));

    jobId = await createRequestedDispute(agentis, client, agent);
    await recordVerdict(agentis, relayer, jobId, Outcome.Invalid, 0, 10000, 0, "none");
    await increaseTime(3601);
    await agentis.finalizeSettlement(jobId);
    payouts = await agentis.getPendingPayouts(jobId);
    assert.equal(payouts.clientAmount, ethers.parseEther("1"));
  });

  it("does not release funds for NEEDS_MORE_EVIDENCE until timeout refund", async function () {
    const { agentis, client, agent, relayer } = await deployAgentis();
    const jobId = await createRequestedDispute(agentis, client, agent, ethers.parseEther("0.1"));

    await recordVerdict(agentis, relayer, jobId, Outcome.NeedsMoreEvidence, 0, 0);
    await increaseTime(3601);
    await expectRevert(agentis.finalizeSettlement(jobId), "needs more evidence");

    await agentis.setVerdictTimeoutSeconds(3600);
    await increaseTime(3601);
    await agentis.timeoutRefund(jobId);
    const payouts = await agentis.getPendingPayouts(jobId);
    assert.equal(payouts.clientAmount, ethers.parseEther("1"));
    assert.equal(payouts.agentAmount, ethers.parseEther("0.1"));
  });

  it("supports a single appeal before deadline and blocks late appeals", async function () {
    const { agentis, client, agent, relayer } = await deployAgentis();
    const jobId = await createRequestedDispute(agentis, client, agent);

    await recordVerdict(agentis, relayer, jobId, Outcome.RefundClient, 0, 10000);
    await agentis.connect(agent).appealVerdict(jobId, "https://example.com/appeal", {
      value: ethers.parseEther("0.05")
    });
    let job = await agentis.getJob(jobId);
    assert.equal(job.status, Status.Appealed);

    await agentis.requestVerdict(jobId);
    await recordVerdict(agentis, relayer, jobId, Outcome.PayAgent, 10000, 0, 0, "client");
    await increaseTime(3601);
    await agentis.finalizeSettlement(jobId);
    const payouts = await agentis.getPendingPayouts(jobId);
    assert.equal(payouts.agentAmount, ethers.parseEther("1.03"));

    const second = await createRequestedDispute(agentis, client, agent);
    await recordVerdict(agentis, relayer, second, Outcome.RefundClient, 0, 10000);
    await increaseTime(3601);
    await expectRevert(
      agentis.connect(agent).appealVerdict(second, "https://example.com/late", { value: ethers.parseEther("0.05") }),
      "appeal closed"
    );
  });

  it("refunds if the relayer never returns a verdict", async function () {
    const { agentis, client, agent } = await deployAgentis();
    const jobId = await createRequestedDispute(agentis, client, agent, ethers.parseEther("0.1"));

    await agentis.setVerdictTimeoutSeconds(3600);
    await increaseTime(3601);
    await agentis.timeoutRefund(jobId);

    const job = await agentis.getJob(jobId);
    const payouts = await agentis.getPendingPayouts(jobId);
    assert.equal(job.status, Status.Expired);
    assert.equal(payouts.clientAmount, ethers.parseEther("1"));
    assert.equal(payouts.agentAmount, ethers.parseEther("0.1"));
  });

  it("keeps admin controls owner-gated and bounded", async function () {
    const { agentis, owner, other } = await deployAgentis();

    await expectRevert(agentis.connect(other).setVerdictRelayer(other.address), "OwnableUnauthorizedAccount");
    await agentis.connect(owner).setVerdictRelayer(other.address);
    assert.equal(await agentis.verdictRelayer(), other.address);

    await agentis.connect(owner).setPlatformTreasury(other.address);
    assert.equal(await agentis.platformTreasury(), other.address);

    await expectRevert(agentis.connect(owner).setDefaultPlatformFee(1001), "fee too high");
    await agentis.connect(owner).setDefaultPlatformFee(300);
    assert.equal(await agentis.defaultPlatformFeeBps(), 300n);
  });

  it("blocks reentrant payout claims", async function () {
    const { agentis, agent, other } = await deployAgentis();
    const ReenteringClaimer = await ethers.getContractFactory("ReenteringClaimer", other);
    const attacker = await ReenteringClaimer.deploy(await agentis.getAddress());
    await attacker.waitForDeployment();

    const deadline = (await latestTimestamp()) + 86_400n;
    await attacker.connect(other).createCancelAndClaim(agent.address, deadline, {
      value: ethers.parseEther("0.2")
    });

    assert.equal(await attacker.attemptedReentry(), true);
    assert.equal(await attacker.reentrySucceeded(), false);
  });
});
