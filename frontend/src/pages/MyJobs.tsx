import { useMemo } from "react";
import { UserRound } from "lucide-react";
import { useAccount, useReadContract } from "wagmi";
import { agentisAbi } from "@agentis/shared";
import { JobCard } from "../components/JobCard";
import { useSelectedNetwork } from "../lib/network";

export function MyJobsPage() {
  const { address } = useAccount();
  const { selectedChain } = useSelectedNetwork();
  const enabled = Boolean(address && selectedChain.contractAddress);

  const { data: clientJobs } = useReadContract({
    address: selectedChain.contractAddress,
    abi: agentisAbi,
    functionName: "getJobsByClient",
    args: [address as `0x${string}`],
    chainId: selectedChain.id,
    query: { enabled }
  });
  const { data: agentJobs } = useReadContract({
    address: selectedChain.contractAddress,
    abi: agentisAbi,
    functionName: "getJobsByAgent",
    args: [address as `0x${string}`],
    chainId: selectedChain.id,
    query: { enabled }
  });

  const ids = useMemo(() => {
    const seen = new Set<string>();
    return ([...(clientJobs || []), ...(agentJobs || [])] as bigint[]).filter((id) => {
      if (seen.has(id.toString())) return false;
      seen.add(id.toString());
      return true;
    });
  }, [clientJobs, agentJobs]);

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">My jobs</span>
          <h1>Client and agent work</h1>
        </div>
      </div>
      {!address && (
        <div className="empty-state">
          <UserRound size={28} />
          <h2>Connect a wallet</h2>
          <p>Your client and agent job indexes are read from the selected Base contract.</p>
        </div>
      )}
      {address && ids.length === 0 && (
        <div className="empty-state">
          <h2>No jobs for this wallet</h2>
          <p>Create a job or accept one assigned to this account.</p>
        </div>
      )}
      <div className="job-grid">{ids.map((id) => <JobCard key={id.toString()} jobId={id} />)}</div>
    </section>
  );
}
