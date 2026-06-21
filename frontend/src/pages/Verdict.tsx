import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PayoutPanel } from "../components/PayoutPanel";
import { VerdictPanel } from "../components/VerdictPanel";
import { StatusBadge } from "../components/StatusBadge";
import { fromUnixSeconds } from "../lib/formatting";
import { useAgentisJob } from "../lib/useAgentisJob";

export function VerdictPage() {
  const jobId = BigInt(useParams().jobId || "0");
  const { job, verdict, payouts } = useAgentisJob(jobId);

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Result</span>
          <h1>Verdict for job #{jobId.toString()}</h1>
        </div>
        <StatusBadge status={job?.status} />
      </div>
      <div className="detail-layout">
        <VerdictPanel verdict={verdict as any} />
        <PayoutPanel payouts={payouts as any} />
      </div>
      <section className="panel">
        <h2>Appeal window</h2>
        <p>{fromUnixSeconds(job?.appealDeadline)}</p>
      </section>
      <p>
        <Link to={`/jobs/${jobId.toString()}`}>
          <ArrowLeft size={14} /> Back to job
        </Link>
      </p>
    </section>
  );
}
