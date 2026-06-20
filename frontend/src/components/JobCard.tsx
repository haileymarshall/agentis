import { ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useReadContract } from "wagmi";
import { agentisAbi } from "@agentis/shared";
import { explorerAddress } from "../lib/chains";
import { formatEth, fromUnixSeconds, shortAddress } from "../lib/formatting";
import { useSelectedNetwork } from "../lib/network";
import { StatusBadge } from "./StatusBadge";

export function JobCard({ jobId }: { jobId: bigint }) {
  const { selectedChain } = useSelectedNetwork();
  const { data: job } = useReadContract({
    address: selectedChain.contractAddress,
    abi: agentisAbi,
    functionName: "getJob",
    args: [jobId],
    chainId: selectedChain.id,
    query: { enabled: Boolean(selectedChain.contractAddress) }
  });

  const item = job as any;

  return (
    <article className="job-card">
      <div className="job-card-head">
        <span className="eyebrow">Job #{jobId.toString()}</span>
        <StatusBadge status={item?.status} />
      </div>
      <h3>{item?.taskDescription || "Loading job..."}</h3>
      <p>{item?.successCriteria || "Reading from the selected Base contract."}</p>
      <dl className="job-meta">
        <div>
          <dt>Escrow</dt>
          <dd>{formatEth(item?.paymentAmount)}</dd>
        </div>
        <div>
          <dt>Deadline</dt>
          <dd>{fromUnixSeconds(item?.deadline)}</dd>
        </div>
        <div>
          <dt>Agent</dt>
          <dd>{shortAddress(item?.agent)}</dd>
        </div>
      </dl>
      <div className="job-card-actions">
        {item?.agent && (
          <a href={explorerAddress(selectedChain, item.agent)} target="_blank" rel="noreferrer">
            <ExternalLink size={14} />
            Agent
          </a>
        )}
        <Link to={`/jobs/${jobId.toString()}`}>
          Open <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}
