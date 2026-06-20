import { CheckCircle2, ExternalLink, Scale } from "lucide-react";
import { verdictLabel } from "../lib/formatting";

export function VerdictPanel({ verdict }: { verdict: any }) {
  if (!verdict || Number(verdict.submittedAt ?? 0) === 0) {
    return (
      <section className="panel">
        <h2>
          <Scale size={18} />
          Verdict
        </h2>
        <p className="muted">No GenLayer verdict has been recorded on Base yet.</p>
      </section>
    );
  }

  return (
    <section className="panel verdict-panel">
      <h2>
        <CheckCircle2 size={18} />
        {verdictLabel(verdict.outcome)}
      </h2>
      <div className="verdict-grid">
        <span>Agent payment</span>
        <strong>{Number(verdict.agentPaymentBps) / 100}%</strong>
        <span>Client refund</span>
        <strong>{Number(verdict.clientRefundBps) / 100}%</strong>
        <span>Bond slash</span>
        <strong>{Number(verdict.agentBondSlashBps) / 100}%</strong>
        <span>Confidence</span>
        <strong>{Number(verdict.confidenceBps) / 100}%</strong>
      </div>
      <p>{verdict.reasoning}</p>
      <dl className="job-meta">
        <div>
          <dt>Responsible</dt>
          <dd>{verdict.responsibleParty}</dd>
        </div>
        <div>
          <dt>Evidence</dt>
          <dd>{verdict.evidenceQuality}</dd>
        </div>
      </dl>
      <span className="hash-line">
        <ExternalLink size={14} />
        {String(verdict.verdictHash).slice(0, 18)}...
      </span>
    </section>
  );
}
