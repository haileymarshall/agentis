import { Check } from "lucide-react";
import type { FlowStep } from "../lib/jobFlow";

/**
 * Horizontal progress tracker. Makes the job lifecycle obvious at a glance:
 * done = filled check, current = highlighted, upcoming = muted, skipped = dashed
 * (happy path never entered the dispute branch).
 */
export function JobStepper({ steps }: { steps: FlowStep[] }) {
  return (
    <ol className="stepper">
      {steps.map((step, index) => (
        <li key={step.key} className={`stepper-node is-${step.state}`}>
          <span className="stepper-dot">{step.state === "done" ? <Check size={14} /> : index + 1}</span>
          <span className="stepper-label">{step.label}</span>
        </li>
      ))}
    </ol>
  );
}
