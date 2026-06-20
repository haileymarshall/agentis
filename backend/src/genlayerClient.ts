import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { ExecutionResult, TransactionStatus } from "genlayer-js/types";
import type { RelayerConfig } from "./config.js";
import type { BaseJobForJudge } from "./baseClient.js";
import { parseGenLayerVerdict, type GenLayerVerdict } from "./verdictSchema.js";

export interface GenLayerJudgeResult {
  verdict: GenLayerVerdict;
  txHash: `0x${string}`;
}

export async function evaluateDisputeOnGenLayer(
  config: RelayerConfig,
  job: BaseJobForJudge
): Promise<GenLayerJudgeResult> {
  if (!config.genlayerContractAddress) {
    throw new Error("GENLAYER_CONTRACT_ADDRESS is required");
  }
  if (!config.genlayerPrivateKey) {
    throw new Error("GENLAYER_ACCOUNT_PRIVATE_KEY is required");
  }

  const account = createAccount(config.genlayerPrivateKey);
  const client = createClient({
    chain: studionet,
    endpoint: config.genlayerRpcUrl,
    account
  });

  const txHash = (await client.writeContract({
    address: config.genlayerContractAddress,
    functionName: "evaluate_job_dispute",
    args: [
      job.chainId,
      Number(job.jobId),
      job.disputeType,
      job.taskDescription,
      job.successCriteria,
      job.deliveryUrl,
      job.clientEvidenceUrl,
      job.agentEvidenceUrl,
      job.complaint,
      job.agentResponse
    ],
    value: 0n
  })) as `0x${string}`;

  const receipt = await client.waitForTransactionReceipt({
    hash: txHash as any,
    status: TransactionStatus.FINALIZED,
    interval: 5_000,
    retries: 240
  });

  if (getReceiptExecutionResultName(receipt) === ExecutionResult.FINISHED_WITH_ERROR) {
    throw new Error(`GenLayer judge transaction finalized with execution error: ${txHash}`);
  }

  const readable = extractReadableResult(receipt);
  return { verdict: parseGenLayerVerdict(decodeReadableResult(readable)), txHash };
}

export function extractReadableResult(receipt: unknown): string {
  const anyReceipt = receipt as any;
  const direct = anyReceipt?.result?.payload?.readable ?? anyReceipt?.txDataDecoded?.result?.payload?.readable;
  if (typeof direct === "string") return direct;

  const leaderReceipt = anyReceipt?.consensus_data?.leader_receipt ?? anyReceipt?.consensusData?.leaderReceipt;
  if (Array.isArray(leaderReceipt)) {
    for (const item of leaderReceipt) {
      const readable = item?.result?.payload?.readable;
      if (typeof readable === "string") return readable;
    }
  }

  const stdout = anyReceipt?.stdout ?? anyReceipt?.execution_stdout;
  if (typeof stdout === "string" && stdout.trim().startsWith("{")) return stdout;

  throw new Error("GenLayer receipt did not contain a readable return value");
}

export function decodeReadableResult(readable: string): string {
  let value = readable.trim();
  for (let i = 0; i < 2; i += 1) {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === "string") {
        value = parsed.trim();
        continue;
      }
    } catch {
      break;
    }
  }
  return value;
}

function getReceiptExecutionResultName(receipt: unknown): string | undefined {
  const value = receipt as { txExecutionResultName?: unknown; tx_execution_result_name?: unknown };
  if (typeof value?.txExecutionResultName === "string") return value.txExecutionResultName;
  if (typeof value?.tx_execution_result_name === "string") return value.tx_execution_result_name;
  return undefined;
}
