import { ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { AcceptForm, AppealForm, DeliveryForm, DisputeForm, EvidenceForm } from "./actionForms";
import { requiredAppealBondWei, type FlowAction, type JobFlow, type JobView } from "../lib/jobFlow";

interface Submitter {
  submit(fn: string, args: unknown[], value?: bigint): void;
  isPending: boolean;
}

/**
 * Renders a single action's form (or button) wired to the contract submitter.
 * The fn → args mapping is the only place the UI translates a FlowAction into a
 * concrete transaction.
 */
function ActionBody({ action, jobId, job, submit, isPending }: { action: FlowAction; jobId: bigint; job: JobView } & Submitter) {
  switch (action.form) {
    case "accept":
      return <AcceptForm isPending={isPending} submitLabel={action.label} onSubmit={(value) => submit("acceptJob", [jobId], value)} />;
    case "delivery":
      return <DeliveryForm isPending={isPending} submitLabel={action.label} onSubmit={(url) => submit("submitDelivery", [jobId, url])} />;
    case "dispute":
      return (
        <DisputeForm
          isPending={isPending}
          submitLabel={action.label}
          onSubmit={(type, complaint, evidence) => submit("openDispute", [jobId, type, complaint, evidence])}
        />
      );
    case "evidence":
      return (
        <EvidenceForm
          isPending={isPending}
          submitLabel={action.label}
          onSubmit={(evidence, response) => submit("submitEvidence", [jobId, evidence, response])}
        />
      );
    case "appeal":
      return (
        <AppealForm
          isPending={isPending}
          submitLabel={action.label}
          requiredBondWei={requiredAppealBondWei(job)}
          onSubmit={(evidence, value) => submit("appealVerdict", [jobId, evidence], value)}
        />
      );
    case "none":
    default:
      return (
        <button
          className={`button ${action.intent === "danger" ? "ghost danger" : "primary"}`}
          type="button"
          disabled={isPending}
          onClick={() => submit(action.fn, [jobId])}
        >
          {action.label}
        </button>
      );
  }
}

export function NextActionCard({
  flow,
  jobId,
  job,
  submit,
  isPending,
  error,
  txHash
}: { flow: JobFlow; jobId: bigint; job: JobView; error: string; txHash?: `0x${string}` } & Submitter) {
  const { primaryAction, waitingOn, secondaryActions } = flow;

  return (
    <section className="next-action-wrap">
      {primaryAction ? (
        <div className="next-action">
          <span className="next-action-tag">
            <ArrowRight size={15} />
            Your next step
          </span>
          <h2>{primaryAction.label}</h2>
          <p>{primaryAction.description}</p>
          <ActionBody action={primaryAction} jobId={jobId} job={job} submit={submit} isPending={isPending} />
        </div>
      ) : waitingOn ? (
        <div className="waiting-card">
          <Clock size={20} />
          <div>
            <strong>{waitingOn}</strong>
            <p>{flow.situation}</p>
          </div>
        </div>
      ) : (
        <div className="waiting-card">
          <CheckCircle2 size={20} />
          <div>
            <strong>Nothing to do here right now.</strong>
            {flow.situation && <p>{flow.situation}</p>}
          </div>
        </div>
      )}

      {secondaryActions.length > 0 && (
        <details className="secondary-actions">
          <summary>Other actions ({secondaryActions.length})</summary>
          <div className="secondary-actions-body">
            {secondaryActions.map((action) => (
              <div className="action-panel" key={action.fn}>
                <h3>{action.label}</h3>
                <p className="muted">{action.description}</p>
                <ActionBody action={action} jobId={jobId} job={job} submit={submit} isPending={isPending} />
              </div>
            ))}
          </div>
        </details>
      )}

      {error && <p className="error-text">{error}</p>}
      {txHash && <p className="success-text">Transaction submitted: {txHash}</p>}
    </section>
  );
}
