import { formatEther } from "viem";
import { disputeTypeLabels, jobStatusLabels, verdictOutcomeLabels } from "@agentis/shared";

export function formatEth(value?: bigint) {
  if (value == null) return "0 ETH";
  const formatted = Number(formatEther(value));
  return `${formatted.toLocaleString(undefined, { maximumFractionDigits: 6 })} ETH`;
}

export function shortAddress(address?: string) {
  if (!address) return "Not set";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function statusLabel(status: number | bigint | undefined) {
  return jobStatusLabels[Number(status ?? 0)] || "Unknown";
}

export function disputeLabel(disputeType: number | bigint | undefined) {
  return disputeTypeLabels[Number(disputeType ?? 0)] || "JobDelivery";
}

export function verdictLabel(outcome: number | bigint | undefined) {
  return verdictOutcomeLabels[Number(outcome ?? 0)] || "None";
}

export function toUnixSeconds(value: string) {
  return BigInt(Math.floor(new Date(value).getTime() / 1000));
}

export function fromUnixSeconds(value?: bigint) {
  if (!value || value === 0n) return "Not set";
  return new Date(Number(value) * 1000).toLocaleString();
}
