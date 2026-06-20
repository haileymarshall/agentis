import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Send } from "lucide-react";
import { useWriteContract } from "wagmi";
import { agentisAbi } from "@agentis/shared";
import { useSelectedNetwork } from "../lib/network";

export function SubmitDeliveryPage() {
  const jobId = BigInt(useParams().jobId || "0");
  const { selectedChain } = useSelectedNetwork();
  const { writeContract, data, error, isPending } = useWriteContract();
  const [deliveryUrl, setDeliveryUrl] = useState("");
  const [localError, setLocalError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    setLocalError("");
    if (!selectedChain.contractAddress) return setLocalError("Contract address is not configured for this chain.");
    writeContract({
      address: selectedChain.contractAddress,
      abi: agentisAbi,
      functionName: "submitDelivery",
      args: [jobId, deliveryUrl],
      chainId: selectedChain.id
    });
  }

  return (
    <section className="page narrow">
      <div className="page-head">
        <div>
          <span className="eyebrow">Delivery</span>
          <h1>Submit delivery for job #{jobId.toString()}</h1>
        </div>
      </div>
      <form className="form-panel" onSubmit={submit}>
        <label>
          Public delivery URL
          <input value={deliveryUrl} onChange={(event) => setDeliveryUrl(event.target.value)} placeholder="https://..." required />
        </label>
        <button className="button primary" disabled={isPending}>
          <Send size={16} />
          Submit delivery
        </button>
        <Link to={`/jobs/${jobId.toString()}`}>Back to job</Link>
        {(localError || error) && <p className="error-text">{localError || error?.message}</p>}
        {data && <p className="success-text">Transaction submitted: {data}</p>}
      </form>
    </section>
  );
}
