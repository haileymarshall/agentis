import { Link, useParams } from "react-router-dom";
import { ArrowLeft, HandCoins } from "lucide-react";
import { PayoutPanel } from "../components/PayoutPanel";
import { StatusBadge } from "../components/StatusBadge";
import { useAgentisJob } from "../lib/useAgentisJob";
import { useAgentisWrite } from "../lib/useAgentisWrite";

export function ClaimPayoutPage() {
  const jobId = BigInt(useParams().jobId || "0");
  const { job, payouts, refetch } = useAgentisJob(jobId);
  const { submit, isPending, error, txHash } = useAgentisWrite(refetch);

  return (
    <section className="page narrow">
      <div className="page-head">
        <div>
          <span className="eyebrow">Claim · client or agent</span>
          <h1>Claim payout or refund</h1>
        </div>
        <StatusBadge status={job?.status} />
      </div>
      <p className="muted">Withdraw your settled balance from the Base escrow. Only your own balance is paid out.</p>
      <PayoutPanel payouts={payouts as any} />
      <button className="button primary" type="button" onClick={() => submit("claimPayout", [jobId])} disabled={isPending}>
        <HandCoins size={16} />
        Claim from Base
      </button>
      <p>
        <Link to={`/jobs/${jobId.toString()}`}>
          <ArrowLeft size={14} /> Back to job
        </Link>
      </p>
      {error && <p className="error-text">{error}</p>}
      {txHash && <p className="success-text">Transaction submitted: {txHash}</p>}
    </section>
  );
}
