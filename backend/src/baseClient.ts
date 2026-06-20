import { agentisAbi, type BaseChainId } from "@agentis/shared";
import {
  createPublicClient,
  createWalletClient,
  getContract,
  http,
  keccak256,
  stringToHex
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { RelayerConfig } from "./config.js";
import { getNetworkConfig, getViemChain } from "./chainRegistry.js";
import { solidityOutcomeByGenLayerOutcome, type GenLayerVerdict } from "./verdictSchema.js";
import type { BaseNetworkConfig } from "./config.js";

export interface BaseJobForJudge {
  chainId: BaseChainId;
  jobId: bigint;
  status: number;
  disputeType: string;
  taskDescription: string;
  successCriteria: string;
  deliveryUrl: string;
  clientEvidenceUrl: string;
  agentEvidenceUrl: string;
  complaint: string;
  agentResponse: string;
}

export function createBaseClients(
  config: RelayerConfig,
  chainId: BaseChainId
): { publicClient: any; walletClient?: any; network: BaseNetworkConfig } {
  const network = getNetworkConfig(config, chainId);
  const chain = getViemChain(chainId);
  const publicClient = createPublicClient({ chain, transport: http(network.rpcUrl) });
  const walletClient = network.relayerPrivateKey
    ? createWalletClient({
        account: privateKeyToAccount(network.relayerPrivateKey),
        chain,
        transport: http(network.rpcUrl)
      })
    : undefined;

  return { publicClient, walletClient, network };
}

export async function fetchJobForJudge(config: RelayerConfig, chainId: BaseChainId, jobId: bigint): Promise<BaseJobForJudge> {
  const { publicClient, network } = createBaseClients(config, chainId);
  if (!network.agentisAddress) {
    throw new Error(`${network.name} Agentis address is not configured`);
  }

  const job = (await publicClient.readContract({
    address: network.agentisAddress,
    abi: agentisAbi,
    functionName: "getJob",
    args: [jobId]
  })) as any;

  return {
    chainId,
    jobId,
    status: Number(job.status ?? job[15]),
    disputeType: String(job.disputeType ?? job[16]),
    taskDescription: String(job.taskDescription ?? job[17]),
    successCriteria: String(job.successCriteria ?? job[18]),
    deliveryUrl: String(job.deliveryUrl ?? job[19]),
    clientEvidenceUrl: String(job.clientEvidenceUrl ?? job[20]),
    agentEvidenceUrl: String(job.agentEvidenceUrl ?? job[21]),
    complaint: String(job.complaint ?? job[22]),
    agentResponse: String(job.agentResponse ?? job[23])
  };
}

export function verdictHash(verdict: GenLayerVerdict): `0x${string}` {
  return keccak256(stringToHex(JSON.stringify(verdict)));
}

export async function submitVerdictToBase(
  config: RelayerConfig,
  chainId: BaseChainId,
  jobId: bigint,
  verdict: GenLayerVerdict
): Promise<`0x${string}`> {
  const { publicClient, walletClient, network } = createBaseClients(config, chainId);
  if (!network.agentisAddress) {
    throw new Error(`${network.name} Agentis address is not configured`);
  }
  if (!walletClient?.account) {
    throw new Error(`${network.name} relayer private key is not configured`);
  }

  const contract = getContract({
    address: network.agentisAddress,
    abi: agentisAbi,
    client: { public: publicClient, wallet: walletClient }
  }) as any;

  const hash = verdictHash(verdict);
  const txHash = await contract.write.recordVerdict([
    jobId,
    solidityOutcomeByGenLayerOutcome[verdict.outcome],
    verdict.agent_payment_bps,
    verdict.client_refund_bps,
    verdict.agent_bond_slash_bps,
    verdict.confidence_bps,
    hash,
    verdict.reasoning,
    verdict.responsible_party,
    verdict.evidence_quality
  ]);

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash as `0x${string}`;
}
