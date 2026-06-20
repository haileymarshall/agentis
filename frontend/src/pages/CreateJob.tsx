import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { parseEther } from "viem";
import { useWriteContract } from "wagmi";
import { agentisAbi } from "@agentis/shared";
import { useSelectedNetwork } from "../lib/network";
import { toUnixSeconds } from "../lib/formatting";

export function CreateJobPage() {
  const { selectedChain } = useSelectedNetwork();
  const { writeContract, data, isPending, error } = useWriteContract();
  const [agent, setAgent] = useState("");
  const [task, setTask] = useState("Find 20 verified leads for Nigerian fintech startups.");
  const [criteria, setCriteria] = useState("Each lead must include company name, website, contact email, and source link.");
  const [payment, setPayment] = useState("0.02");
  const [deadline, setDeadline] = useState(() => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
  const [localError, setLocalError] = useState("");

  const disabled = useMemo(() => !selectedChain.contractAddress || isPending, [selectedChain.contractAddress, isPending]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setLocalError("");
    if (!selectedChain.contractAddress) {
      setLocalError(`Agentis is not configured on ${selectedChain.name}.`);
      return;
    }
    try {
      writeContract({
        address: selectedChain.contractAddress,
        abi: agentisAbi,
        functionName: "createJob",
        args: [agent as `0x${string}`, task, criteria, toUnixSeconds(deadline)],
        value: parseEther(payment),
        chainId: selectedChain.id
      });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <section className="page narrow">
      <div className="page-head">
        <div>
          <span className="eyebrow">Create job</span>
          <h1>Escrow an agent task</h1>
        </div>
      </div>

      {selectedChain.isMainnet && (
        <div className="warning">
          <AlertTriangle size={18} />
          Base Mainnet actions use real ETH.
        </div>
      )}

      <form className="form-panel" onSubmit={submit}>
        <label>
          Agent wallet
          <input value={agent} onChange={(event) => setAgent(event.target.value)} placeholder="0x..." required />
        </label>
        <label>
          Task description
          <textarea value={task} onChange={(event) => setTask(event.target.value)} rows={5} required />
        </label>
        <label>
          Success criteria
          <textarea value={criteria} onChange={(event) => setCriteria(event.target.value)} rows={5} required />
        </label>
        <div className="form-grid">
          <label>
            Payment ETH
            <input value={payment} onChange={(event) => setPayment(event.target.value)} inputMode="decimal" required />
          </label>
          <label>
            Deadline
            <input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} required />
          </label>
        </div>
        <button className="button primary" type="submit" disabled={disabled}>
          <Plus size={16} />
          Create and escrow
        </button>
        {(localError || error) && <p className="error-text">{localError || error?.message}</p>}
        {data && <p className="success-text">Transaction submitted: {data}</p>}
      </form>
    </section>
  );
}
