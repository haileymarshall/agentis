import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { DisputeForm } from "../components/actionForms";
import { StatusBadge } from "../components/StatusBadge";
import { useAgentisJob } from "../lib/useAgentisJob";
import { useAgentisWrite } from "../lib/useAgentisWrite";

export function OpenDisputePage() {
  const jobId = BigInt(useParams().jobId || "0");
  const { job, refetch } = useAgentisJob(jobId);
  const { submit, isPending, error, txHash } = useAgentisWrite(refetch);

  return (
    <section className="page narrow">
      <div className="page-head">
        <div>
          <span className="eyebrow">Dispute · client or agent</span>
          <h1>Open dispute for job #{jobId.toString()}</h1>
        </div>
        <StatusBadge status={job?.status} />
      </div>
      <p className="muted">Describe what went wrong and attach evidence. GenLayer validators will rule on the outcome.</p>
      <div className="form-panel">
        <DisputeForm
          isPending={isPending}
          submitLabel="Open dispute"
          onSubmit={(type, complaint, evidence) => submit("openDispute", [jobId, type, complaint, evidence])}
        />
        <Link to={`/jobs/${jobId.toString()}`}>
          <ArrowLeft size={14} /> Back to job
        </Link>
        {error && <p className="error-text">{error}</p>}
        {txHash && <p className="success-text">Transaction submitted: {txHash}</p>}
      </div>
    </section>
  );
}
