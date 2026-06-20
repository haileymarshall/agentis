# Transaction Methods

Source: https://docs.genlayer.com/api-references/genlayer-js/transactions

Methods for fetching transactions, waiting for receipts, estimating gas, and debugging execution traces.

### waitForTransactionReceipt

Polls until a transaction reaches the specified status. Returns the transaction receipt.

**Returns:** `GenLayerTransaction`

---

### getTransaction

Fetches transaction data including status, execution result, and consensus details.

**Returns:** `GenLayerTransaction`

---

### getTriggeredTransactionIds

Returns transaction IDs of child transactions created from emitted messages.

**Returns:** `TransactionHash[]`

---

### debugTraceTransaction

Fetches the full execution trace including return data, stdout, stderr, and GenVM logs.

**Returns:** `DebugTraceResult`

---

### cancelTransaction

Cancels a pending transaction. Studio networks only.

**Returns:** `{transaction_hash: string; status: string}`

---

### getTransactionQueuePosition

Returns the queue slot position of a transaction in the pending queue.

**Returns:** `number`

---

### estimateTransactionGas

Estimates gas required for a transaction.

**Returns:** `bigint`

---

[Contracts](/api-references/genlayer-js/contracts "Contracts")[Staking](/api-references/genlayer-js/staking "Staking")
