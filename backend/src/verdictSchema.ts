import { z } from "zod";

export const genLayerOutcomeSchema = z.enum([
  "PAY_AGENT",
  "REFUND_CLIENT",
  "SPLIT",
  "INVALID",
  "NEEDS_MORE_EVIDENCE"
]);

export type GenLayerOutcome = z.infer<typeof genLayerOutcomeSchema>;

const responsiblePartySchema = z.enum(["client", "agent", "subagent", "external", "both", "unclear", "none"]);
const evidenceQualitySchema = z.enum(["strong", "medium", "weak", "insufficient", "inaccessible"]);
const bpsSchema = z.number().int().min(0).max(10000);

export const genLayerVerdictSchema = z
  .object({
    outcome: genLayerOutcomeSchema,
    agent_payment_bps: bpsSchema,
    client_refund_bps: bpsSchema,
    agent_bond_slash_bps: bpsSchema,
    confidence_bps: bpsSchema,
    responsible_party: responsiblePartySchema,
    evidence_quality: evidenceQualitySchema,
    sla_breached: z.boolean(),
    requirements_met: z.array(z.string()).max(20),
    missing_requirements: z.array(z.string()).max(20),
    sources_checked: z.array(z.string()).max(20),
    reasoning: z.string().min(1)
  })
  .superRefine((verdict, ctx) => {
    if (verdict.agent_payment_bps + verdict.client_refund_bps > 10000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "payout bps exceed 10000" });
    }
    if (verdict.outcome === "PAY_AGENT" && (verdict.agent_payment_bps !== 10000 || verdict.client_refund_bps !== 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "PAY_AGENT must pay 100% to agent" });
    }
    if (
      (verdict.outcome === "REFUND_CLIENT" || verdict.outcome === "INVALID") &&
      (verdict.agent_payment_bps !== 0 || verdict.client_refund_bps !== 10000)
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${verdict.outcome} must refund client` });
    }
    if (verdict.outcome === "NEEDS_MORE_EVIDENCE" && (verdict.agent_payment_bps !== 0 || verdict.client_refund_bps !== 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "NEEDS_MORE_EVIDENCE must not release funds" });
    }
  });

export type GenLayerVerdict = z.infer<typeof genLayerVerdictSchema>;

export function parseGenLayerVerdict(value: unknown): GenLayerVerdict {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  return genLayerVerdictSchema.parse(parsed);
}

export const solidityOutcomeByGenLayerOutcome: Record<GenLayerOutcome, number> = {
  PAY_AGENT: 1,
  REFUND_CLIENT: 2,
  SPLIT: 3,
  INVALID: 4,
  NEEDS_MORE_EVIDENCE: 5
};
