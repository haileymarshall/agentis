import { useReadContract } from "wagmi";
import { agentisAbi } from "@agentis/shared";
import { useSelectedNetwork } from "./network";
import type { JobView, PayoutsView, VerdictView } from "./jobFlow";

/**
 * Reads the job, verdict, and pending payouts for a job id in one hook. Bundles
 * the useReadContract trio that JobDetail / Verdict / ClaimPayout each repeated.
 */
export function useAgentisJob(jobId: bigint) {
  const { selectedChain } = useSelectedNetwork();
  const common = {
    address: selectedChain.contractAddress,
    abi: agentisAbi,
    chainId: selectedChain.id,
    query: { enabled: Boolean(selectedChain.contractAddress && jobId > 0n) }
  } as const;

  const { data: job, refetch } = useReadContract({ ...common, functionName: "getJob", args: [jobId] });
  const { data: verdict, refetch: refetchVerdict } = useReadContract({ ...common, functionName: "getVerdict", args: [jobId] });
  const { data: payouts, refetch: refetchPayouts } = useReadContract({ ...common, functionName: "getPendingPayouts", args: [jobId] });

  function refetchAll() {
    refetch();
    refetchVerdict();
    refetchPayouts();
  }

  return {
    job: job as JobView | undefined,
    verdict: verdict as VerdictView | undefined,
    payouts: payouts as PayoutsView | undefined,
    refetch: refetchAll
  };
}
