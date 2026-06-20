import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BaseChainId } from "@agentis/shared";
import { createRelayProcessor, type RelayProcessorDeps } from "./relay.js";
import { JsonRelayStore } from "./persistence.js";
import type { RelayerConfig } from "./config.js";
import { decodeReadableResult, extractReadableResult } from "./genlayerClient.js";
import { parseGenLayerVerdict, type GenLayerVerdict } from "./verdictSchema.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function tempStore() {
  const dir = mkdtempSync(join(tmpdir(), "agentis-relay-"));
  tempDirs.push(dir);
  return new JsonRelayStore(join(dir, "relay-state.json"));
}

function config(): RelayerConfig {
  return {
    port: 8787,
    dbPath: "unused.json",
    supportedChainIds: [84532, 8453],
    genlayerNetwork: "studionet",
    genlayerRpcUrl: "https://studio.genlayer.com/api",
    genlayerContractAddress: "0x0000000000000000000000000000000000000001",
    genlayerPrivateKey: "0x".padEnd(66, "1") as `0x${string}`,
    baseNetworks: {
      84532: {
        key: "baseSepolia",
        chainId: 84532,
        name: "Base Sepolia",
        rpcUrl: "https://sepolia.base.org",
        explorerUrl: "https://sepolia.basescan.org",
        startBlock: 0n,
        agentisAddress: "0x0000000000000000000000000000000000000002",
        relayerPrivateKey: "0x".padEnd(66, "2") as `0x${string}`
      },
      8453: {
        key: "baseMainnet",
        chainId: 8453,
        name: "Base Mainnet",
        rpcUrl: "https://mainnet.base.org",
        explorerUrl: "https://basescan.org",
        startBlock: 0n,
        agentisAddress: "0x0000000000000000000000000000000000000003",
        relayerPrivateKey: "0x".padEnd(66, "3") as `0x${string}`
      }
    }
  };
}

function validVerdict(overrides: Partial<GenLayerVerdict> = {}): GenLayerVerdict {
  return {
    outcome: "SPLIT",
    agent_payment_bps: 5000,
    client_refund_bps: 5000,
    agent_bond_slash_bps: 1000,
    confidence_bps: 8200,
    responsible_party: "agent",
    evidence_quality: "medium",
    sla_breached: false,
    requirements_met: ["12 leads were usable."],
    missing_requirements: ["8 leads were missing."],
    sources_checked: ["https://example.com/delivery"],
    reasoning: "The agent delivered useful partial work.",
    ...overrides
  };
}

function deps(chainCaptures: BaseChainId[] = []): RelayProcessorDeps {
  const cfg = config();
  return {
    config: cfg,
    store: tempStore(),
    fetchJob: vi.fn(async (_config, chainId, jobId) => ({
      chainId,
      jobId,
      status: 5,
      disputeType: "0",
      taskDescription: "Find 20 leads.",
      successCriteria: "Each lead needs a website and email.",
      deliveryUrl: "https://example.com/delivery",
      clientEvidenceUrl: "https://example.com/client",
      agentEvidenceUrl: "https://example.com/agent",
      complaint: "Only 12 leads are complete.",
      agentResponse: "The 12 leads are useful."
    })),
    evaluateOnGenLayer: vi.fn(async () => ({
      verdict: validVerdict(),
      txHash: "0x".padEnd(66, "a") as `0x${string}`
    })),
    submitToBase: vi.fn(async (_config, chainId) => {
      chainCaptures.push(chainId);
      return "0x".padEnd(66, "b") as `0x${string}`;
    }),
    logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() }
  };
}

describe("relayer processor", () => {
  it("processes Sepolia events and submits back to Sepolia only", async () => {
    const captures: BaseChainId[] = [];
    const relay = createRelayProcessor(deps(captures));

    const record = await relay.processVerdictRequest(84532, 12n);

    expect(record.status).toBe("submitted");
    expect(record.chainId).toBe(84532);
    expect(captures).toEqual([84532]);
  });

  it("processes Mainnet events and submits back to Mainnet only", async () => {
    const captures: BaseChainId[] = [];
    const relay = createRelayProcessor(deps(captures));

    const record = await relay.processVerdictRequest(8453, 7n);

    expect(record.status).toBe("submitted");
    expect(record.chainId).toBe(8453);
    expect(captures).toEqual([8453]);
  });

  it("rejects unsupported chain IDs", async () => {
    const relay = createRelayProcessor(deps());
    await expect(relay.processVerdictRequest(1, 1n)).rejects.toThrow(/Unsupported chain ID/);
  });

  it("does not submit duplicate verdicts", async () => {
    const captures: BaseChainId[] = [];
    const relayDeps = deps(captures);
    const relay = createRelayProcessor(relayDeps);

    await relay.processVerdictRequest(84532, 44n);
    await relay.processVerdictRequest(84532, 44n);

    expect(captures).toEqual([84532]);
  });

  it("rejects jobs that are not awaiting a verdict", async () => {
    const relayDeps = deps();
    relayDeps.fetchJob = vi.fn(async (_config, chainId, jobId) => ({
      chainId,
      jobId,
      status: 4,
      disputeType: "0",
      taskDescription: "",
      successCriteria: "",
      deliveryUrl: "",
      clientEvidenceUrl: "",
      agentEvidenceUrl: "",
      complaint: "",
      agentResponse: ""
    }));
    const relay = createRelayProcessor(relayDeps);

    await expect(relay.processVerdictRequest(84532, 1n)).rejects.toThrow(/not AwaitingVerdict/);
  });

  it("rejects invalid GenLayer verdict schema", async () => {
    const relayDeps = deps();
    relayDeps.evaluateOnGenLayer = vi.fn(async () => ({
      verdict: validVerdict({ agent_payment_bps: 9000, client_refund_bps: 9000 }) as GenLayerVerdict,
      txHash: "0x".padEnd(66, "a") as `0x${string}`
    }));
    const relay = createRelayProcessor(relayDeps);

    await expect(relay.processVerdictRequest(84532, 1n)).rejects.toThrow(/payout bps exceed/);
  });
});

describe("GenLayer receipt parsing", () => {
  it("decodes readable JSON string literals", () => {
    const readable = JSON.stringify('{"outcome":"PAY_AGENT","reasoning":"ok"}');
    expect(decodeReadableResult(readable)).toBe('{"outcome":"PAY_AGENT","reasoning":"ok"}');
  });

  it("extracts StudioNet leader readable result", () => {
    const readable = JSON.stringify(JSON.stringify(validVerdict()));
    const receipt = {
      consensus_data: {
        leader_receipt: [{ result: { payload: { readable } } }]
      }
    };

    expect(parseGenLayerVerdict(decodeReadableResult(extractReadableResult(receipt))).outcome).toBe("SPLIT");
  });
});
