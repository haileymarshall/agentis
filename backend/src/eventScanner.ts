import { agentisAbi, type BaseChainId } from "@agentis/shared";
import type { RelayerConfig } from "./config.js";
import { createBaseClients } from "./baseClient.js";

export interface VerdictRequestEvent {
  chainId: BaseChainId;
  jobId: bigint;
  txHash?: `0x${string}`;
}

// Public RPCs (e.g. sepolia.base.org) cap eth_getLogs at a 2000-block range, so
// the historical scan is paginated into windows of this size.
const DEFAULT_SCAN_BLOCK_RANGE = 2000n;

export async function scanMissedVerdictRequests(
  config: RelayerConfig,
  chainId: BaseChainId,
  handler: (event: VerdictRequestEvent) => Promise<void>
) {
  const { publicClient, network } = createBaseClients(config, chainId);
  if (!network.agentisAddress) return;

  const range = BigInt(process.env.LOG_SCAN_BLOCK_RANGE || DEFAULT_SCAN_BLOCK_RANGE.toString());
  const latest = await publicClient.getBlockNumber();
  let from = network.startBlock > 0n ? network.startBlock : 0n;

  while (from <= latest) {
    const to = from + range - 1n > latest ? latest : from + range - 1n;
    const logs = await publicClient.getContractEvents({
      address: network.agentisAddress,
      abi: agentisAbi,
      eventName: "VerdictRequested",
      fromBlock: from,
      toBlock: to
    });

    for (const log of logs) {
      const emittedChainId = Number(log.args.chainId);
      if (emittedChainId !== chainId) {
        console.error(`Refusing mixed-chain event: listener ${chainId}, emitted ${emittedChainId}`);
        continue;
      }
      if (log.args.jobId == null) {
        console.error("VerdictRequested event missing jobId");
        continue;
      }
      // A failure on one (possibly stale) event must not abort the whole scan.
      try {
        await handler({ chainId, jobId: log.args.jobId, txHash: log.transactionHash });
      } catch (error) {
        console.error(
          `Failed to process VerdictRequested ${chainId}:${log.args.jobId.toString()}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    from = to + 1n;
  }
}

export function watchVerdictRequests(
  config: RelayerConfig,
  chainId: BaseChainId,
  handler: (event: VerdictRequestEvent) => Promise<void>
) {
  const { publicClient, network } = createBaseClients(config, chainId);
  if (!network.agentisAddress) return () => undefined;

  return publicClient.watchContractEvent({
    address: network.agentisAddress,
    abi: agentisAbi,
    eventName: "VerdictRequested",
    onLogs: (logs: any[]) => {
      for (const log of logs) {
        const emittedChainId = Number(log.args.chainId);
        if (emittedChainId !== chainId) {
          console.error(`Refusing mixed-chain event: listener ${chainId}, emitted ${emittedChainId}`);
          continue;
        }
        if (log.args.jobId == null) {
          console.error("VerdictRequested event missing jobId");
          continue;
        }
        handler({ chainId, jobId: log.args.jobId, txHash: log.transactionHash }).catch((error) => {
          console.error(`Relay failed for ${chainId}:${log.args.jobId?.toString()}`, error);
        });
      }
    }
  });
}
