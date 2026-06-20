import { Link, useParams } from "react-router-dom";
import { useReadContract } from "wagmi";
import { agentisAbi } from "@agentis/shared";
import { PayoutPanel } from "../components/PayoutPanel";
import { VerdictPanel } from "../components/VerdictPanel";
import { fromUnixSeconds } from "../lib/formatting";
import { useSelectedNetwork } from "../lib/network";

export function VerdictPage() {
  const jobId = BigInt(useParams().jobId || "0");
  const { selectedChain } = useSelectedNetwork();
  const common = {
    address: selectedChain.contractAddress,
    abi: agentisAbi,
    chainId: selectedChain.id,
    query: { enabled: Boolean(selectedChain.contractAddress && jobId > 0n) }
  };
  const { data: job } = useReadContract({ ...common, functionName: "getJob", args: [jobId] });
  const { data: verdict } = useReadContract({ ...common, functionName: "getVerdict", args: [jobId] });
  const { data: payouts } = useReadContract({ ...common, functionName: "getPendingPayouts", args: [jobId] });
  const item = job as any;

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Result</span>
          <h1>Verdict for job #{jobId.toString()}</h1>
        </div>
        <Link className="button ghost" to={`/jobs/${jobId.toString()}`}>Back to job</Link>
      </div>
      <div className="detail-layout">
        <VerdictPanel verdict={verdict as any} />
        <PayoutPanel payouts={payouts as any} />
      </div>
      <section className="panel">
        <h2>Appeal window</h2>
        <p>{fromUnixSeconds(item?.appealDeadline)}</p>
      </section>
    </section>
  );
}
