import { RefreshCw } from "lucide-react";
import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { agentisAbi } from "@agentis/shared";
import { JobCard } from "../components/JobCard";
import { useSelectedNetwork } from "../lib/network";

export function JobsPage() {
  const { selectedChain } = useSelectedNetwork();
  const { data, refetch, isLoading } = useReadContract({
    address: selectedChain.contractAddress,
    abi: agentisAbi,
    functionName: "getJobCount",
    chainId: selectedChain.id,
    query: { enabled: Boolean(selectedChain.contractAddress) }
  });

  const ids = useMemo(() => {
    const count = Number(data || 0n);
    return Array.from({ length: Math.min(count, 18) }, (_, index) => BigInt(count - index)).filter((id) => id > 0n);
  }, [data]);

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Jobs</span>
          <h1>Agent work escrow</h1>
        </div>
        <button className="button ghost" type="button" onClick={() => refetch()}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {!selectedChain.contractAddress && (
        <div className="empty-state">
          <h2>No contract configured for {selectedChain.name}</h2>
          <p>Add the deployed Agentis address to the frontend environment for this chain.</p>
        </div>
      )}

      {selectedChain.contractAddress && ids.length === 0 && !isLoading && (
        <div className="empty-state">
          <h2>No jobs yet</h2>
          <p>Create the first AI-agent job on the selected Base chain.</p>
        </div>
      )}

      <div className="job-grid">{ids.map((id) => <JobCard key={id.toString()} jobId={id} />)}</div>
    </section>
  );
}
