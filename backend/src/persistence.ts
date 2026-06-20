import { dirname } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { BaseChainId } from "@agentis/shared";

export type RelayRecordStatus = "processing" | "submitted" | "failed";

export interface RelayRecord {
  chainId: BaseChainId;
  jobId: string;
  status: RelayRecordStatus;
  genlayerTxHash?: `0x${string}`;
  baseTxHash?: `0x${string}`;
  verdictHash?: `0x${string}`;
  error?: string;
  processedAt: string;
}

export interface RelayStore {
  get(chainId: BaseChainId, jobId: bigint): RelayRecord | undefined;
  markProcessing(chainId: BaseChainId, jobId: bigint): RelayRecord;
  markSubmitted(record: Omit<RelayRecord, "status" | "processedAt">): RelayRecord;
  markFailed(chainId: BaseChainId, jobId: bigint, error: string): RelayRecord;
  list(): RelayRecord[];
}

interface DataFile {
  records: RelayRecord[];
}

export class JsonRelayStore implements RelayStore {
  private records = new Map<string, RelayRecord>();

  constructor(private readonly path: string) {
    this.load();
  }

  get(chainId: BaseChainId, jobId: bigint): RelayRecord | undefined {
    return this.records.get(this.key(chainId, jobId));
  }

  markProcessing(chainId: BaseChainId, jobId: bigint): RelayRecord {
    const record: RelayRecord = {
      chainId,
      jobId: jobId.toString(),
      status: "processing",
      processedAt: new Date().toISOString()
    };
    this.records.set(this.key(chainId, jobId), record);
    this.persist();
    return record;
  }

  markSubmitted(record: Omit<RelayRecord, "status" | "processedAt">): RelayRecord {
    const stored: RelayRecord = {
      ...record,
      status: "submitted",
      processedAt: new Date().toISOString()
    };
    this.records.set(this.key(record.chainId, BigInt(record.jobId)), stored);
    this.persist();
    return stored;
  }

  markFailed(chainId: BaseChainId, jobId: bigint, error: string): RelayRecord {
    const record: RelayRecord = {
      chainId,
      jobId: jobId.toString(),
      status: "failed",
      error,
      processedAt: new Date().toISOString()
    };
    this.records.set(this.key(chainId, jobId), record);
    this.persist();
    return record;
  }

  list(): RelayRecord[] {
    return [...this.records.values()];
  }

  private key(chainId: BaseChainId, jobId: bigint) {
    return `${chainId}:${jobId.toString()}`;
  }

  private load() {
    if (!existsSync(this.path)) return;
    const parsed = JSON.parse(readFileSync(this.path, "utf8")) as Partial<DataFile>;
    for (const record of parsed.records || []) {
      this.records.set(`${record.chainId}:${record.jobId}`, record);
    }
  }

  private persist() {
    const dir = dirname(this.path);
    if (dir !== ".") mkdirSync(dir, { recursive: true });
    writeFileSync(this.path, `${JSON.stringify({ records: this.list() }, null, 2)}\n`);
  }
}
