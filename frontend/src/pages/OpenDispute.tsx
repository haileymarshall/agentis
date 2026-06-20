import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Gavel } from "lucide-react";
import { useWriteContract } from "wagmi";
import { agentisAbi, disputeTypeLabels } from "@agentis/shared";
import { useSelectedNetwork } from "../lib/network";

export function OpenDisputePage() {
  const jobId = BigInt(useParams().jobId || "0");
  const { selectedChain } = useSelectedNetwork();
  const { writeContract, data, error, isPending } = useWriteContract();
  const [disputeType, setDisputeType] = useState(0);
  const [complaint, setComplaint] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [localError, setLocalError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    setLocalError("");
    if (!selectedChain.contractAddress) return setLocalError("Contract address is not configured for this chain.");
    writeContract({
      address: selectedChain.contractAddress,
      abi: agentisAbi,
      functionName: "openDispute",
      args: [jobId, disputeType, complaint, evidenceUrl],
      chainId: selectedChain.id
    });
  }

  return (
    <section className="page narrow">
      <div className="page-head">
        <div>
          <span className="eyebrow">Dispute</span>
          <h1>Open dispute for job #{jobId.toString()}</h1>
        </div>
      </div>
      <form className="form-panel" onSubmit={submit}>
        <label>
          Dispute type
          <select value={disputeType} onChange={(event) => setDisputeType(Number(event.target.value))}>
            {disputeTypeLabels.map((label, index) => <option value={index} key={label}>{label}</option>)}
          </select>
        </label>
        <label>
          Complaint
          <textarea value={complaint} onChange={(event) => setComplaint(event.target.value)} rows={5} required />
        </label>
        <label>
          Public evidence URL
          <input value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="https://..." />
        </label>
        <button className="button primary" disabled={isPending}>
          <Gavel size={16} />
          Open dispute
        </button>
        <Link to={`/jobs/${jobId.toString()}`}>Back to job</Link>
        {(localError || error) && <p className="error-text">{localError || error?.message}</p>}
        {data && <p className="success-text">Transaction submitted: {data}</p>}
      </form>
    </section>
  );
}
