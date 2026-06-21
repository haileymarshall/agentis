import { useParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useAccount } from "wagmi";
import { PayoutPanel } from "../components/PayoutPanel";
import { StatusBadge } from "../components/StatusBadge";
import { VerdictPanel } from "../components/VerdictPanel";
import { RoleBanner } from "../components/RoleBanner";
import { JobStepper } from "../components/JobStepper";
import { NextActionCard } from "../components/NextActionCard";
import { explorerAddress } from "../lib/chains";
import { disputeLabel, formatEth, fromUnixSeconds, shortAddress } from "../lib/formatting";
import { useSelectedNetwork } from "../lib/network";
import { useAgentisJob } from "../lib/useAgentisJob";
import { useAgentisWrite } from "../lib/useAgentisWrite";
import { getJobFlow } from "../lib/jobFlow";

function useJobId() {
  const params = useParams();
  try {
    return BigInt(params.jobId || "0");
  } catch {
    return 0n;
  }
}

export function JobDetailPage() {
  const jobId = useJobId();
  const { address } = useAccount();
  const { selectedChain } = useSelectedNetwork();
  const { job, verdict, payouts, refetch } = useAgentisJob(jobId);
  const { submit, isPending, error, txHash } = useAgentisWrite(refetch);

  const flow = getJobFlow(job, verdict, payouts, address, Date.now() / 1000);

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Job #{jobId.toString()}</span>
          <h1>{job?.taskDescription || "Loading job"}</h1>
        </div>
        <StatusBadge status={job?.status} />
      </div>

      {!selectedChain.contractAddress && (
        <div className="warning">
          <AlertTriangle size={18} />
          No Agentis contract address is configured for {selectedChain.name}.
        </div>
      )}

      {flow && (
        <>
          <RoleBanner role={flow.role} headline={flow.headline} situation={flow.situation} />
          <JobStepper steps={flow.steps} />
          {job && (
            <NextActionCard
              flow={flow}
              jobId={jobId}
              job={job}
              submit={submit}
              isPending={isPending}
              error={error}
              txHash={txHash}
            />
          )}
        </>
      )}

      <div className="detail-layout">
        <section className="panel job-detail">
          <h2>Agreement</h2>
          <dl className="detail-list">
            <div>
              <dt>Client</dt>
              <dd>
                {shortAddress(job?.client)}
                {job?.client && (
                  <a href={explorerAddress(selectedChain, job.client)} target="_blank" rel="noreferrer">
                    Explorer
                  </a>
                )}
              </dd>
            </div>
            <div>
              <dt>Agent</dt>
              <dd>
                {shortAddress(job?.agent)}
                {job?.agent && (
                  <a href={explorerAddress(selectedChain, job.agent)} target="_blank" rel="noreferrer">
                    Explorer
                  </a>
                )}
              </dd>
            </div>
            <div>
              <dt>Escrow</dt>
              <dd>{formatEth(job?.paymentAmount)}</dd>
            </div>
            <div>
              <dt>Bond</dt>
              <dd>{formatEth(job?.agentBondAmount)}</dd>
            </div>
            <div>
              <dt>Deadline</dt>
              <dd>{fromUnixSeconds(job?.deadline)}</dd>
            </div>
            <div>
              <dt>Dispute type</dt>
              <dd>{disputeLabel(job?.disputeType)}</dd>
            </div>
          </dl>
          <h3>Success criteria</h3>
          <p>{job?.successCriteria}</p>
          <h3>Delivery and evidence</h3>
          <ul className="evidence-list">
            {(["deliveryUrl", "clientEvidenceUrl", "agentEvidenceUrl"] as const).map((key) => (
              <li key={key}>
                <span>{key}</span>
                {job?.[key] ? (
                  <a href={job[key]} target="_blank" rel="noreferrer">
                    {job[key]}
                  </a>
                ) : (
                  <em>Not submitted</em>
                )}
              </li>
            ))}
          </ul>
        </section>

        <aside className="side-stack">
          <VerdictPanel verdict={verdict as any} />
          <PayoutPanel payouts={payouts as any} />
        </aside>
      </div>
    </section>
  );
}
