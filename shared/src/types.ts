export type JobStatus =
  | "Created"
  | "Accepted"
  | "Delivered"
  | "Approved"
  | "Disputed"
  | "AwaitingVerdict"
  | "VerdictSubmitted"
  | "Appealed"
  | "Finalized"
  | "Cancelled"
  | "Expired";

export type DisputeType =
  | "JobDelivery"
  | "SLABreach"
  | "EscrowRelease"
  | "ReputationClaim"
  | "MultiAgentFault";

export type VerdictOutcome =
  | "None"
  | "PayAgent"
  | "RefundClient"
  | "Split"
  | "Invalid"
  | "NeedsMoreEvidence";

export type GenLayerOutcome =
  | "PAY_AGENT"
  | "REFUND_CLIENT"
  | "SPLIT"
  | "INVALID"
  | "NEEDS_MORE_EVIDENCE";

export interface GenLayerVerdict {
  outcome: GenLayerOutcome;
  agent_payment_bps: number;
  client_refund_bps: number;
  agent_bond_slash_bps: number;
  confidence_bps: number;
  responsible_party: string;
  evidence_quality: string;
  sla_breached: boolean;
  requirements_met: string[];
  missing_requirements: string[];
  sources_checked: string[];
  reasoning: string;
}

export const jobStatusLabels: JobStatus[] = [
  "Created",
  "Accepted",
  "Delivered",
  "Approved",
  "Disputed",
  "AwaitingVerdict",
  "VerdictSubmitted",
  "Appealed",
  "Finalized",
  "Cancelled",
  "Expired"
];

export const disputeTypeLabels: DisputeType[] = [
  "JobDelivery",
  "SLABreach",
  "EscrowRelease",
  "ReputationClaim",
  "MultiAgentFault"
];

export const verdictOutcomeLabels: VerdictOutcome[] = [
  "None",
  "PayAgent",
  "RefundClient",
  "Split",
  "Invalid",
  "NeedsMoreEvidence"
];
