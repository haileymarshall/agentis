import { statusLabel } from "../lib/formatting";

export function StatusBadge({ status }: { status?: number | bigint }) {
  const label = statusLabel(status);
  return <span className={`status-badge status-${label.toLowerCase()}`}>{label}</span>;
}
