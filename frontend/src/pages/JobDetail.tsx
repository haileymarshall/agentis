import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, Check, FileText, Gavel, HandCoins, Send, ShieldCheck } from "lucide-react";
import { parseEther } from "viem";
import { useReadContract, useWriteContract } from "wagmi";
import { agentisAbi, disputeTypeLabels } from "@agentis/shared";
import { PayoutPanel } from "../components/PayoutPanel";
import { StatusBadge } from "../components/StatusBadge";
import { VerdictPanel } from "../components/VerdictPanel";
import { explorerAddress } from "../lib/chains";
import { disputeLabel, formatEth, fromUnixSeconds, shortAddress } from "../lib/formatting";
import { useSelectedNetwork } from "../lib/network";

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
  const { selectedChain } = useSelectedNetwork();
  const { writeContract, data, isPending, error } = useWriteContract();
  const [bond, setBond] = useState("0");
  const [delivery, setDelivery] = useState("");
  const [complaint, setComplaint] = useState("");
  const [evidence, setEvidence] = useState("");
  const [response, setResponse] = useState("");
  const [disputeType, setDisputeType] = useState(0);
  const [appealEvidence, setAppealEvidence] = useState("");
  const [appealBond, setAppealBond] = useState("0.05");
  const [localError, setLocalError] = useState("");

  const common = {
    address: selectedChain.contractAddress,
    abi: agentisAbi,
    chainId: selectedChain.id,
    query: { enabled: Boolean(selectedChain.contractAddress && jobId > 0n) }
  };
  const { data: job, refetch } = useReadContract({ ...common, functionName: "getJob", args: [jobId] });
  const { data: verdict } = useReadContract({ ...common, functionName: "getVerdict", args: [jobId] });
  const { data: payouts } = useReadContract({ ...common, functionName: "getPendingPayouts", args: [jobId] });
  const item = job as any;

  function run(functionName: string, args: unknown[], value?: bigint) {
    setLocalError("");
    if (!selectedChain.contractAddress) {
      setLocalError(`Agentis is not configured on ${selectedChain.name}.`);
      return;
    }
    const request: any = {
      address: selectedChain.contractAddress,
      abi: agentisAbi,
      functionName,
      args,
      chainId: selectedChain.id
    };
    if (value !== undefined) request.value = value;
    writeContract(request, { onSuccess: () => setTimeout(() => refetch(), 1200) });
  }

  function submitDelivery(event: FormEvent) {
    event.preventDefault();
    run("submitDelivery", [jobId, delivery]);
  }

  function openDispute(event: FormEvent) {
    event.preventDefault();
    run("openDispute", [jobId, disputeType, complaint, evidence]);
  }

  function submitEvidence(event: FormEvent) {
    event.preventDefault();
    run("submitEvidence", [jobId, evidence, response]);
  }

  function appeal(event: FormEvent) {
    event.preventDefault();
    run("appealVerdict", [jobId, appealEvidence], parseEther(appealBond));
  }

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Job #{jobId.toString()}</span>
          <h1>{item?.taskDescription || "Loading job"}</h1>
        </div>
        <StatusBadge status={item?.status} />
      </div>

      {!selectedChain.contractAddress && (
        <div className="warning">
          <AlertTriangle size={18} />
          No Agentis contract address is configured for {selectedChain.name}.
        </div>
      )}

      <div className="detail-layout">
        <section className="panel job-detail">
          <h2>Agreement</h2>
          <dl className="detail-list">
            <div>
              <dt>Client</dt>
              <dd>
                {shortAddress(item?.client)}
                {item?.client && (
                  <a href={explorerAddress(selectedChain, item.client)} target="_blank" rel="noreferrer">
                    Explorer
                  </a>
                )}
              </dd>
            </div>
            <div>
              <dt>Agent</dt>
              <dd>
                {shortAddress(item?.agent)}
                {item?.agent && (
                  <a href={explorerAddress(selectedChain, item.agent)} target="_blank" rel="noreferrer">
                    Explorer
                  </a>
                )}
              </dd>
            </div>
            <div>
              <dt>Escrow</dt>
              <dd>{formatEth(item?.paymentAmount)}</dd>
            </div>
            <div>
              <dt>Bond</dt>
              <dd>{formatEth(item?.agentBondAmount)}</dd>
            </div>
            <div>
              <dt>Deadline</dt>
              <dd>{fromUnixSeconds(item?.deadline)}</dd>
            </div>
            <div>
              <dt>Dispute type</dt>
              <dd>{disputeLabel(item?.disputeType)}</dd>
            </div>
          </dl>
          <h3>Success criteria</h3>
          <p>{item?.successCriteria}</p>
          <h3>Delivery and evidence</h3>
          <ul className="evidence-list">
            {["deliveryUrl", "clientEvidenceUrl", "agentEvidenceUrl"].map((key) => (
              <li key={key}>
                <span>{key}</span>
                {item?.[key] ? (
                  <a href={item[key]} target="_blank" rel="noreferrer">
                    {item[key]}
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

      <section className="actions-grid">
        <form className="action-panel" onSubmit={(event) => { event.preventDefault(); run("acceptJob", [jobId], parseEther(bond || "0")); }}>
          <h2>
            <ShieldCheck size={18} />
            Accept
          </h2>
          <label>
            Optional bond ETH
            <input value={bond} onChange={(event) => setBond(event.target.value)} inputMode="decimal" />
          </label>
          <button className="button secondary" disabled={isPending}>Accept job</button>
        </form>

        <form className="action-panel" onSubmit={submitDelivery}>
          <h2>
            <Send size={18} />
            Submit delivery
          </h2>
          <label>
            Delivery URL
            <input value={delivery} onChange={(event) => setDelivery(event.target.value)} placeholder="https://..." />
          </label>
          <button className="button secondary" disabled={isPending}>Submit</button>
          <Link to={`/jobs/${jobId.toString()}/deliver`}>Open delivery page</Link>
        </form>

        <form className="action-panel" onSubmit={openDispute}>
          <h2>
            <Gavel size={18} />
            Open dispute
          </h2>
          <label>
            Type
            <select value={disputeType} onChange={(event) => setDisputeType(Number(event.target.value))}>
              {disputeTypeLabels.map((label, index) => <option value={index} key={label}>{label}</option>)}
            </select>
          </label>
          <label>
            Complaint
            <textarea value={complaint} onChange={(event) => setComplaint(event.target.value)} rows={3} />
          </label>
          <label>
            Evidence URL
            <input value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="https://..." />
          </label>
          <button className="button secondary" disabled={isPending}>Open dispute</button>
          <Link to={`/jobs/${jobId.toString()}/dispute`}>Open dispute page</Link>
        </form>

        <form className="action-panel" onSubmit={submitEvidence}>
          <h2>
            <FileText size={18} />
            Add evidence
          </h2>
          <label>
            Evidence URL
            <input value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="https://..." />
          </label>
          <label>
            Response
            <textarea value={response} onChange={(event) => setResponse(event.target.value)} rows={3} />
          </label>
          <button className="button secondary" disabled={isPending}>Submit evidence</button>
        </form>

        <div className="action-panel">
          <h2>
            <Gavel size={18} />
            Verdict
          </h2>
          <button className="button secondary" type="button" onClick={() => run("requestVerdict", [jobId])} disabled={isPending}>
            Request GenLayer verdict
          </button>
          <Link to={`/jobs/${jobId.toString()}/verdict`}>Open verdict page</Link>
        </div>

        <form className="action-panel" onSubmit={appeal}>
          <h2>
            <AlertTriangle size={18} />
            Appeal
          </h2>
          <label>
            Appeal evidence URL
            <input value={appealEvidence} onChange={(event) => setAppealEvidence(event.target.value)} placeholder="https://..." />
          </label>
          <label>
            Appeal bond ETH
            <input value={appealBond} onChange={(event) => setAppealBond(event.target.value)} inputMode="decimal" />
          </label>
          <button className="button secondary" disabled={isPending}>Appeal verdict</button>
        </form>

        <div className="action-panel">
          <h2>
            <Check size={18} />
            Settle
          </h2>
          <button className="button secondary" type="button" onClick={() => run("approveDelivery", [jobId])} disabled={isPending}>
            Approve delivery
          </button>
          <button className="button secondary" type="button" onClick={() => run("finalizeSettlement", [jobId])} disabled={isPending}>
            Finalize settlement
          </button>
          <button className="button primary" type="button" onClick={() => run("claimPayout", [jobId])} disabled={isPending}>
            <HandCoins size={16} />
            Claim payout/refund
          </button>
          <Link to={`/jobs/${jobId.toString()}/claim`}>Open claim page</Link>
        </div>
      </section>

      {(localError || error) && <p className="error-text">{localError || error?.message}</p>}
      {data && <p className="success-text">Transaction submitted: {data}</p>}
    </section>
  );
}
