import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { isSupportedBaseChainId, type BaseChainId } from "@agentis/shared";
import { loadConfig, type RelayerConfig } from "./config.js";
import { fetchJobForJudge, submitVerdictToBase, verdictHash, type BaseJobForJudge } from "./baseClient.js";
import { evaluateDisputeOnGenLayer } from "./genlayerClient.js";
import { scanMissedVerdictRequests, watchVerdictRequests } from "./eventScanner.js";
import { JsonRelayStore, type RelayStore } from "./persistence.js";
import { genLayerVerdictSchema, type GenLayerVerdict } from "./verdictSchema.js";

export interface RelayProcessorDeps {
  config: RelayerConfig;
  store: RelayStore;
  fetchJob: (config: RelayerConfig, chainId: BaseChainId, jobId: bigint) => Promise<BaseJobForJudge>;
  evaluateOnGenLayer: (config: RelayerConfig, job: BaseJobForJudge) => Promise<{ verdict: GenLayerVerdict; txHash: `0x${string}` }>;
  submitToBase: (config: RelayerConfig, chainId: BaseChainId, jobId: bigint, verdict: GenLayerVerdict) => Promise<`0x${string}`>;
  logger?: Pick<Console, "log" | "error" | "warn">;
}

export function createRelayProcessor(deps: RelayProcessorDeps) {
  const logger = deps.logger || console;

  async function processVerdictRequest(chainIdInput: number, jobId: bigint) {
    if (!isSupportedBaseChainId(chainIdInput)) {
      throw new Error(`Unsupported chain ID ${chainIdInput}`);
    }
    const chainId = chainIdInput;
    const existing = deps.store.get(chainId, jobId);
    if (existing?.status === "submitted") {
      logger.log(`Skipping already submitted verdict ${chainId}:${jobId.toString()}`);
      return existing;
    }

    deps.store.markProcessing(chainId, jobId);
    try {
      const job = await deps.fetchJob(deps.config, chainId, jobId);
      if (job.chainId !== chainId) {
        throw new Error(`Fetched job chain mismatch: expected ${chainId}, got ${job.chainId}`);
      }
      if (job.status !== 5) {
        // Expected during historical replay: the job already moved past
        // AwaitingVerdict (resolved, finalized, or expired). Skip, don't fail.
        logger.log(`Skipping ${chainId}:${jobId.toString()} — status ${job.status} is not AwaitingVerdict`);
        return existing;
      }

      const genlayer = await deps.evaluateOnGenLayer(deps.config, job);
      const verdict = genLayerVerdictSchema.parse(genlayer.verdict);
      const baseTxHash = await deps.submitToBase(deps.config, chainId, jobId, verdict);
      const record = deps.store.markSubmitted({
        chainId,
        jobId: jobId.toString(),
        genlayerTxHash: genlayer.txHash,
        baseTxHash,
        verdictHash: verdictHash(verdict)
      });

      logger.log(
        `Submitted verdict for ${chainId}:${jobId.toString()} genlayer=${genlayer.txHash} base=${baseTxHash}`
      );
      return record;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      deps.store.markFailed(chainId, jobId, message);
      logger.error(`Relay failed for ${chainId}:${jobId.toString()}: ${message}`);
      throw error;
    }
  }

  return { processVerdictRequest };
}

export function createRelayApp(store: RelayStore, config: RelayerConfig) {
  const app = new Hono();
  app.use("*", cors());

  app.get("/health", (c) =>
    c.json({
      ok: true,
      genlayerNetwork: config.genlayerNetwork,
      genlayerConfigured: Boolean(config.genlayerContractAddress),
      baseConfigured: {
        84532: Boolean(config.baseNetworks[84532].agentisAddress),
        8453: Boolean(config.baseNetworks[8453].agentisAddress)
      }
    })
  );

  app.get("/processed", (c) => c.json({ records: store.list() }));
  return app;
}

async function main() {
  const config = loadConfig();
  const store = new JsonRelayStore(config.dbPath);
  const processor = createRelayProcessor({
    config,
    store,
    fetchJob: fetchJobForJudge,
    evaluateOnGenLayer: evaluateDisputeOnGenLayer,
    submitToBase: submitVerdictToBase
  });

  // Bind the HTTP server first so /health is available immediately; a slow or
  // failing historical scan must never stop the service from coming up.
  const hostname = process.env.HOST || "0.0.0.0";
  serve({ fetch: createRelayApp(store, config).fetch, port: config.port, hostname });
  console.log(`Agentis relayer listening on http://${hostname}:${config.port}`);

  for (const chainId of config.supportedChainIds) {
    try {
      await scanMissedVerdictRequests(config, chainId, async (event) => {
        await processor.processVerdictRequest(event.chainId, event.jobId);
      });
    } catch (error) {
      console.error(`Failed to scan missed verdict requests for chain ${chainId}:`, error);
    }
    try {
      watchVerdictRequests(config, chainId, async (event) => {
        await processor.processVerdictRequest(event.chainId, event.jobId);
      });
    } catch (error) {
      console.error(`Failed to start verdict watcher for chain ${chainId}:`, error);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
