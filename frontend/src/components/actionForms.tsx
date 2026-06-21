import { FormEvent, useState } from "react";
import { formatEther, parseEther } from "viem";
import { disputeTypeLabels } from "@agentis/shared";

interface BaseFormProps {
  isPending: boolean;
  submitLabel: string;
}

function parseEthSafe(value: string): bigint | null {
  try {
    return parseEther(value || "0");
  } catch {
    return null;
  }
}

export function AcceptForm({ isPending, submitLabel, onSubmit }: BaseFormProps & { onSubmit(value: bigint): void }) {
  const [bond, setBond] = useState("0");
  const [err, setErr] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = parseEthSafe(bond);
    if (value === null) return setErr("Enter a valid bond amount.");
    setErr("");
    onSubmit(value);
  }

  return (
    <form className="inline-form" onSubmit={submit}>
      <label>
        Optional bond (ETH)
        <input value={bond} onChange={(e) => setBond(e.target.value)} inputMode="decimal" />
      </label>
      <button className="button primary" disabled={isPending}>{submitLabel}</button>
      {err && <p className="error-text">{err}</p>}
    </form>
  );
}

export function DeliveryForm({ isPending, submitLabel, onSubmit }: BaseFormProps & { onSubmit(deliveryUrl: string): void }) {
  const [url, setUrl] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit(url);
  }

  return (
    <form className="inline-form" onSubmit={submit}>
      <label>
        Public delivery URL
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." required />
      </label>
      <button className="button primary" disabled={isPending}>{submitLabel}</button>
    </form>
  );
}

export function DisputeForm({
  isPending,
  submitLabel,
  onSubmit
}: BaseFormProps & { onSubmit(disputeType: number, complaint: string, evidenceUrl: string): void }) {
  const [disputeType, setDisputeType] = useState(0);
  const [complaint, setComplaint] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit(disputeType, complaint, evidenceUrl);
  }

  return (
    <form className="inline-form" onSubmit={submit}>
      <label>
        Dispute type
        <select value={disputeType} onChange={(e) => setDisputeType(Number(e.target.value))}>
          {disputeTypeLabels.map((label, index) => (
            <option value={index} key={label}>{label}</option>
          ))}
        </select>
      </label>
      <label>
        What went wrong?
        <textarea value={complaint} onChange={(e) => setComplaint(e.target.value)} rows={4} required />
      </label>
      <label>
        Evidence URL
        <input value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://..." />
      </label>
      <button className="button primary" disabled={isPending}>{submitLabel}</button>
    </form>
  );
}

export function EvidenceForm({
  isPending,
  submitLabel,
  onSubmit
}: BaseFormProps & { onSubmit(evidenceUrl: string, responseText: string): void }) {
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [response, setResponse] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit(evidenceUrl, response);
  }

  return (
    <form className="inline-form" onSubmit={submit}>
      <label>
        Evidence URL
        <input value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://..." required />
      </label>
      <label>
        Your response
        <textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={4} />
      </label>
      <button className="button primary" disabled={isPending}>{submitLabel}</button>
    </form>
  );
}

export function AppealForm({
  isPending,
  submitLabel,
  requiredBondWei,
  onSubmit
}: BaseFormProps & { requiredBondWei: bigint; onSubmit(appealEvidenceUrl: string, value: bigint): void }) {
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [bond, setBond] = useState(() => formatEther(requiredBondWei));
  const [err, setErr] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = parseEthSafe(bond);
    if (value === null) return setErr("Enter a valid bond amount.");
    if (value < requiredBondWei) return setErr(`Appeal bond must be at least ${formatEther(requiredBondWei)} ETH.`);
    setErr("");
    onSubmit(evidenceUrl, value);
  }

  return (
    <form className="inline-form" onSubmit={submit}>
      <label>
        New evidence URL
        <input value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://..." required />
      </label>
      <label>
        Appeal bond (ETH) — min {formatEther(requiredBondWei)}
        <input value={bond} onChange={(e) => setBond(e.target.value)} inputMode="decimal" required />
      </label>
      <button className="button primary" disabled={isPending}>{submitLabel}</button>
      {err && <p className="error-text">{err}</p>}
    </form>
  );
}
