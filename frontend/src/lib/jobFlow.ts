import { formatEth, fromUnixSeconds } from "./formatting";

/**
 * Pure role + state engine for an Agentis job.
 *
 * Given the on-chain reads (job, verdict, payouts), the connected wallet, and the
 * current time, it produces everything the UI needs to show a single, unambiguous
 * "what should I do now" experience: the user's role, a stepper model, the one
 * primary action that is theirs to take, a waiting message when it is not their
 * turn, and any contextual secondary actions.
 *
 * All contract semantics encoded here are verified against contracts/solidity/Agentis.sol.
 */

export type Role = "client" | "agent" | "observer";
export type StepState = "done" | "current" | "upcoming" | "skipped";
export type FormKind = "accept" | "delivery" | "dispute" | "evidence" | "appeal" | "none";
export type ActionIntent = "primary" | "secondary" | "danger";

export interface FlowStep {
  key: string;
  label: string;
  state: StepState;
}

export interface FlowAction {
  fn: string;
  label: string;
  description: string;
  form: FormKind;
  intent: ActionIntent;
}

export interface JobFlow {
  role: Role;
  headline: string;
  situation: string;
  steps: FlowStep[];
  primaryAction: FlowAction | null;
  waitingOn: string | null;
  secondaryActions: FlowAction[];
  claimableWei: bigint;
}

// Mirrors the Job struct returned by getJob (wagmi decodes named tuple fields).
export interface JobView {
  id: bigint;
  client: `0x${string}`;
  agent: `0x${string}`;
  token: `0x${string}`;
  paymentAmount: bigint;
  agentBondAmount: bigint;
  platformFeeBps: bigint;
  createdAt: bigint;
  acceptedAt: bigint;
  deadline: bigint;
  deliveredAt: bigint;
  verdictAt: bigint;
  appealDeadline: bigint;
  verdictRequestedAt: bigint;
  appealCount: number;
  status: number;
  disputeType: number;
  taskDescription: string;
  successCriteria: string;
  deliveryUrl: string;
  clientEvidenceUrl: string;
  agentEvidenceUrl: string;
  complaint: string;
  agentResponse: string;
}

export interface VerdictView {
  outcome: number;
  agentPaymentBps: number;
  clientRefundBps: number;
  agentBondSlashBps: number;
  confidenceBps: number;
  verdictHash: string;
  reasoning: string;
  responsibleParty: string;
  evidenceQuality: string;
  submittedAt: bigint;
}

export interface PayoutsView {
  clientAmount: bigint;
  agentAmount: bigint;
  treasuryAmount: bigint;
}

// JobStatus enum indices (shared/src/types.ts order).
export const Status = {
  Created: 0,
  Accepted: 1,
  Delivered: 2,
  Approved: 3,
  Disputed: 4,
  AwaitingVerdict: 5,
  VerdictSubmitted: 6,
  Appealed: 7,
  Finalized: 8,
  Cancelled: 9,
  Expired: 10
} as const;

// VerdictOutcome enum indices.
const Outcome = {
  None: 0,
  PayAgent: 1,
  RefundClient: 2,
  Split: 3,
  Invalid: 4,
  NeedsMoreEvidence: 5
} as const;

const APPEAL_BOND_BPS = 500n;
const BPS = 10_000n;
const VERDICT_TIMEOUT_SECONDS = 7n * 24n * 60n * 60n;

export function getRole(job: JobView | undefined, address?: string): Role {
  if (!job || !address) return "observer";
  const me = address.toLowerCase();
  if (job.client?.toLowerCase() === me) return "client";
  if (job.agent?.toLowerCase() === me) return "agent";
  return "observer";
}

export function requiredAppealBondWei(job: JobView | undefined): bigint {
  if (!job) return 0n;
  return (job.paymentAmount * APPEAL_BOND_BPS) / BPS;
}

function nonEmpty(value?: string) {
  return Boolean(value && value.length > 0);
}

const STEP_NODES = [
  { key: "funded", label: "Funded" },
  { key: "accepted", label: "Accepted" },
  { key: "delivered", label: "Delivered" },
  { key: "review", label: "Review" },
  { key: "verdict", label: "Verdict" },
  { key: "settled", label: "Settled" }
] as const;

function steps(states: StepState[]): FlowStep[] {
  return STEP_NODES.map((node, index) => ({ ...node, state: states[index] }));
}

function buildSteps(job: JobView, hasVerdict: boolean): FlowStep[] {
  const s = job.status;
  const disputePath = hasVerdict || [Status.Disputed, Status.AwaitingVerdict, Status.VerdictSubmitted, Status.Appealed].includes(s as any);

  // Terminal states get explicit shapes so we never show false "done" nodes.
  if (s === Status.Cancelled) {
    return steps(["done", "skipped", "skipped", "skipped", "skipped", "done"]);
  }
  if (s === Status.Expired) {
    return steps(["done", "done", "done", "done", "done", "done"]);
  }
  if (s === Status.Finalized || s === Status.Approved) {
    return steps(["done", "done", "done", "done", disputePath ? "done" : "skipped", "done"]);
  }

  // current = index of the node whose work is pending now.
  let current: number;
  switch (s) {
    case Status.Created:
      current = 1;
      break;
    case Status.Accepted:
      current = 2;
      break;
    case Status.Delivered:
      current = 3;
      break;
    case Status.Disputed:
    case Status.AwaitingVerdict:
    case Status.VerdictSubmitted:
    case Status.Appealed:
      current = 4;
      break;
    default:
      current = 1;
  }

  return STEP_NODES.map((_, index) => {
    if (index === 4 && !disputePath) return "skipped" as StepState;
    if (index < current) return "done" as StepState;
    if (index === current) return "current" as StepState;
    return "upcoming" as StepState;
  }).map((state, index) => ({ ...STEP_NODES[index], state }));
}

function claimable(role: Role, payouts?: PayoutsView): bigint {
  if (!payouts) return 0n;
  if (role === "client") return payouts.clientAmount;
  if (role === "agent") return payouts.agentAmount;
  return 0n;
}

// Which party the verdict favored — used to point "Appeal" at the disadvantaged side.
function disadvantagedRole(outcome: number): Role | "both" | null {
  switch (outcome) {
    case Outcome.PayAgent:
      return "client";
    case Outcome.RefundClient:
    case Outcome.Invalid:
      return "agent";
    case Outcome.Split:
      return "both";
    default:
      return null;
  }
}

const ACTION = {
  accept: (bondHint: string): FlowAction => ({
    fn: "acceptJob",
    label: "Accept job",
    description: `This job is funded and assigned to you. Accept it to lock it in and start the work${bondHint}.`,
    form: "accept",
    intent: "primary"
  }),
  deliver: (deadline: string): FlowAction => ({
    fn: "submitDelivery",
    label: "Submit delivery",
    description: `You accepted this job. Complete the work and submit your public delivery URL before ${deadline}.`,
    form: "delivery",
    intent: "primary"
  }),
  approve: (): FlowAction => ({
    fn: "approveDelivery",
    label: "Approve & release payment",
    description: "The agent submitted their work (see Delivery & evidence below). If it meets your success criteria, approve to release payment instantly.",
    form: "none",
    intent: "primary"
  }),
  dispute: (intent: ActionIntent, deadlinePassed = false): FlowAction => ({
    fn: "openDispute",
    label: "Open dispute",
    description: deadlinePassed
      ? "The deadline passed without delivery. Open a dispute so GenLayer can rule on a refund."
      : "Not satisfied with the delivery? Open a dispute with your complaint and evidence. GenLayer validators will decide the outcome.",
    form: "dispute",
    intent
  }),
  evidence: (intent: ActionIntent): FlowAction => ({
    fn: "submitEvidence",
    label: "Submit evidence",
    description: "A dispute is open. Add your evidence URL and a written response so GenLayer can judge fairly.",
    form: "evidence",
    intent
  }),
  requestVerdict: (intent: ActionIntent): FlowAction => ({
    fn: "requestVerdict",
    label: "Request GenLayer verdict",
    description: "Once both sides have submitted evidence, request the GenLayer verdict to get a binding decision.",
    form: "none",
    intent
  }),
  appeal: (bond: string): FlowAction => ({
    fn: "appealVerdict",
    label: "Appeal verdict",
    description: `If you disagree with the verdict you can appeal once, before the window closes, by posting a ${bond} bond and new evidence.`,
    form: "appeal",
    intent: "primary"
  }),
  finalize: (): FlowAction => ({
    fn: "finalizeSettlement",
    label: "Finalize settlement",
    description: "The appeal window has closed. Finalize to lock in the verdict and create the claimable balances.",
    form: "none",
    intent: "primary"
  }),
  claim: (amount: string, refund: boolean): FlowAction => ({
    fn: "claimPayout",
    label: refund ? `Claim refund (${amount})` : `Claim payout (${amount})`,
    description: "Settlement is complete. Claim your balance from the Base escrow.",
    form: "none",
    intent: "primary"
  }),
  cancel: (): FlowAction => ({
    fn: "cancelJob",
    label: "Cancel job",
    description: "The agent has not accepted yet. Cancel the job to refund your escrow.",
    form: "none",
    intent: "danger"
  }),
  timeoutRefund: (): FlowAction => ({
    fn: "timeoutRefund",
    label: "Claim timeout refund",
    description: "No verdict was recorded in time. Trigger a timeout refund to recover the escrow and bond.",
    form: "none",
    intent: "secondary"
  })
};

export function getJobFlow(
  job: JobView | undefined,
  verdict: VerdictView | undefined,
  payouts: PayoutsView | undefined,
  address: string | undefined,
  nowSec: number
): JobFlow | null {
  if (!job) return null;

  const role = getRole(job, address);
  const now = BigInt(Math.floor(nowSec));
  const s = job.status;
  const hasVerdict = Boolean(verdict && verdict.submittedAt > 0n);
  const claimableWei = claimable(role, payouts);

  const headline =
    role === "client"
      ? "You are the client on this job."
      : role === "agent"
        ? "You are the agent on this job."
        : "You're viewing this job — you are not a participant.";

  const flow: JobFlow = {
    role,
    headline,
    situation: "",
    steps: buildSteps(job, hasVerdict),
    primaryAction: null,
    waitingOn: null,
    secondaryActions: [],
    claimableWei
  };

  const deadlineText = fromUnixSeconds(job.deadline);
  const deadlinePassed = job.deadline > 0n && now > job.deadline;
  const bondText = formatEth(requiredAppealBondWei(job));

  switch (s) {
    case Status.Created: {
      if (role === "agent") {
        flow.situation = "This job is funded and waiting for you to accept it.";
        flow.primaryAction = ACTION.accept(job.paymentAmount > 0n ? ", optionally posting a bond to signal commitment" : "");
      } else if (role === "client") {
        flow.situation = "Your escrow is funded. Waiting for the agent to accept.";
        flow.waitingOn = "Waiting for the agent to accept this job.";
        flow.secondaryActions = [ACTION.cancel()];
      } else {
        flow.situation = "This job is funded and waiting for the agent to accept.";
      }
      break;
    }

    case Status.Accepted: {
      if (role === "agent") {
        flow.situation = `You accepted this job. Deliver your work before ${deadlineText}.`;
        flow.primaryAction = ACTION.deliver(deadlineText);
        if (deadlinePassed) flow.secondaryActions = [ACTION.dispute("secondary", true)];
      } else if (role === "client") {
        if (deadlinePassed) {
          flow.situation = "The deadline passed without a delivery.";
          flow.primaryAction = ACTION.dispute("primary", true);
        } else {
          flow.situation = `The agent accepted and is working. Delivery is due by ${deadlineText}.`;
          flow.waitingOn = `Waiting for the agent to submit their delivery by ${deadlineText}.`;
        }
      } else {
        flow.situation = "The agent accepted and is working on the job.";
      }
      break;
    }

    case Status.Delivered: {
      if (role === "client") {
        flow.situation = "The agent submitted their delivery. Review it, then approve or dispute.";
        flow.primaryAction = ACTION.approve();
        flow.secondaryActions = [ACTION.dispute("secondary")];
      } else if (role === "agent") {
        flow.situation = "You submitted your delivery. Waiting for the client to review it.";
        flow.waitingOn = "Waiting for the client to review your delivery.";
        flow.secondaryActions = [ACTION.dispute("secondary")];
      } else {
        flow.situation = "The agent delivered. The client is reviewing the work.";
      }
      break;
    }

    case Status.Disputed: {
      const anyEvidence = nonEmpty(job.clientEvidenceUrl) || nonEmpty(job.agentEvidenceUrl);
      if (role === "client" || role === "agent") {
        const ownEvidence = role === "client" ? nonEmpty(job.clientEvidenceUrl) : nonEmpty(job.agentEvidenceUrl);
        flow.situation = "A dispute is open. Submit your evidence, then request a GenLayer verdict.";
        if (!ownEvidence) {
          flow.primaryAction = ACTION.evidence("primary");
          if (anyEvidence) flow.secondaryActions = [ACTION.requestVerdict("secondary")];
        } else if (anyEvidence) {
          flow.primaryAction = ACTION.requestVerdict("primary");
          flow.secondaryActions = [ACTION.evidence("secondary")];
        } else {
          flow.waitingOn = "Waiting for the other party to add their evidence.";
          flow.secondaryActions = [ACTION.evidence("secondary")];
        }
      } else {
        flow.situation = "A dispute is open and evidence is being gathered.";
      }
      break;
    }

    case Status.AwaitingVerdict: {
      flow.situation = "GenLayer validators are reviewing the evidence. The verdict will appear here automatically.";
      const timedOut = job.verdictRequestedAt > 0n && now > job.verdictRequestedAt + VERDICT_TIMEOUT_SECONDS;
      if (role === "client" || role === "agent") {
        flow.waitingOn = "Waiting for the GenLayer verdict.";
        flow.secondaryActions = [ACTION.evidence("secondary")];
        if (timedOut) flow.secondaryActions.push(ACTION.timeoutRefund());
      }
      break;
    }

    case Status.VerdictSubmitted: {
      const outcome = verdict ? verdict.outcome : 0;
      const needsMore = outcome === Outcome.NeedsMoreEvidence;
      const appealOpen = job.appealCount === 0 && (job.appealDeadline === 0n || now <= job.appealDeadline);
      const disadvantaged = disadvantagedRole(outcome);

      if (needsMore) {
        flow.situation = "GenLayer needs more evidence before it can rule. Add evidence to continue.";
        if (role === "client" || role === "agent") {
          flow.primaryAction = ACTION.evidence("primary");
        }
      } else if (appealOpen) {
        const canAppeal = role !== "observer" && (disadvantaged === "both" || disadvantaged === role);
        if (canAppeal) {
          flow.situation = "A verdict was recorded. If you disagree you can appeal once before the window closes.";
          flow.primaryAction = ACTION.appeal(bondText);
        } else if (role === "client" || role === "agent") {
          flow.situation = "A verdict was recorded in your favor. Wait for the appeal window to close, then finalize.";
          flow.waitingOn = `Appeal window open until ${fromUnixSeconds(job.appealDeadline)}.`;
        } else {
          flow.situation = "A verdict was recorded. The appeal window is open.";
        }
      } else if (role === "client" || role === "agent") {
        flow.situation = "The appeal window has closed. Finalize the settlement to create claimable balances.";
        flow.primaryAction = ACTION.finalize();
      } else {
        flow.situation = "The appeal window has closed; the settlement can now be finalized.";
      }
      break;
    }

    case Status.Appealed: {
      flow.situation = "An appeal was filed with new evidence. Request a GenLayer re-judgement.";
      if (role === "client" || role === "agent") {
        flow.primaryAction = ACTION.requestVerdict("primary");
      }
      break;
    }

    case Status.Approved:
    case Status.Finalized: {
      if ((role === "client" || role === "agent") && claimableWei > 0n) {
        flow.situation = `Settlement complete. You have ${formatEth(claimableWei)} to claim.`;
        flow.primaryAction = ACTION.claim(formatEth(claimableWei), false);
      } else if (role === "client" || role === "agent") {
        flow.situation = "Settlement complete. You have nothing left to claim.";
      } else {
        flow.situation = "This job is finalized and settled.";
      }
      break;
    }

    case Status.Cancelled: {
      if (role === "client" && claimableWei > 0n) {
        flow.situation = "This job was cancelled before acceptance. Claim your refunded escrow.";
        flow.primaryAction = ACTION.claim(formatEth(claimableWei), true);
      } else if (role === "agent") {
        flow.situation = "This job was cancelled before you accepted it.";
      } else {
        flow.situation = "This job was cancelled.";
      }
      break;
    }

    case Status.Expired: {
      if ((role === "client" || role === "agent") && claimableWei > 0n) {
        flow.situation = "This job expired without a timely verdict. Claim your refund.";
        flow.primaryAction = ACTION.claim(formatEth(claimableWei), true);
      } else {
        flow.situation = "This job expired and funds were refunded.";
      }
      break;
    }

    default:
      flow.situation = "";
  }

  return flow;
}
