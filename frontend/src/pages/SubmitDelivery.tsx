import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { DeliveryForm } from "../components/actionForms";
import { StatusBadge } from "../components/StatusBadge";
import { useAgentisJob } from "../lib/useAgentisJob";
import { useAgentisWrite } from "../lib/useAgentisWrite";

export function SubmitDeliveryPage() {
  const jobId = BigInt(useParams().jobId || "0");
  const { job, refetch } = useAgentisJob(jobId);
  const { submit, isPending, error, txHash } = useAgentisWrite(refetch);

  return (
    <section className="page narrow">
      <div className="page-head">
        <div>
          <span className="eyebrow">Delivery · agent action</span>
          <h1>Submit delivery for job #{jobId.toString()}</h1>
        </div>
        <StatusBadge status={job?.status} />
      </div>
      <p className="muted">Submit the public URL where the client can review your completed work.</p>
      <div className="form-panel">
        <DeliveryForm isPending={isPending} submitLabel="Submit delivery" onSubmit={(url) => submit("submitDelivery", [jobId, url])} />
        <Link to={`/jobs/${jobId.toString()}`}>
          <ArrowLeft size={14} /> Back to job
        </Link>
        {error && <p className="error-text">{error}</p>}
        {txHash && <p className="success-text">Transaction submitted: {txHash}</p>}
      </div>
    </section>
  );
}
