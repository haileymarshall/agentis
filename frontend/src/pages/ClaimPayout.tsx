import { useParams } from "react-router-dom";
import { HandCoins } from "lucide-react";
import { useReadContract, useWriteContract } from "wagmi";
import { agentisAbi } from "@agentis/shared";
import { PayoutPanel } from "../components/PayoutPanel";
import { useSelectedNetwork } from "../lib/network";

export function ClaimPayoutPage() {
  const jobId = BigInt(useParams().jobId || "0");
  const { selectedChain } = useSelectedNetwork();
  const { writeContract, data, error, isPending } = useWriteContract();
  const { data: payouts } = useReadContract({
    address: selectedChain.contractAddress,
    abi: agentisAbi,
    functionName: "getPendingPayouts",
    args: [jobId],
    chainId: selectedChain.id,
    query: { enabled: Boolean(selectedChain.contractAddress && jobId > 0n) }
  });

  function claim() {
    if (!selectedChain.contractAddress) return;
    writeContract({
      address: selectedChain.contractAddress,
      abi: agentisAbi,
      functionName: "claimPayout",
      args: [jobId],
      chainId: selectedChain.id
    });
  }

  return (
    <section className="page narrow">
      <div className="page-head">
        <div>
          <span className="eyebrow">Claim</span>
          <h1>Claim payout or refund</h1>
        </div>
      </div>
      <PayoutPanel payouts={payouts as any} />
      <button className="button primary" type="button" onClick={claim} disabled={isPending}>
        <HandCoins size={16} />
        Claim from Base
      </button>
      {error && <p className="error-text">{error.message}</p>}
      {data && <p className="success-text">Transaction submitted: {data}</p>}
    </section>
  );
}
