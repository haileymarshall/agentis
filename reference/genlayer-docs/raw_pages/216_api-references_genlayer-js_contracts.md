# Contract Methods

Source: https://docs.genlayer.com/api-references/genlayer-js/contracts

Methods for deploying, reading, writing, and simulating GenLayer intelligent contracts.

### getContractCode

Retrieves the source code of a deployed contract.

**Returns:** `string`

---

### getContractSchema

Gets the schema (methods and constructor) of a deployed contract.

**Returns:** `ContractSchema`

---

### getContractSchemaForCode

Generates a schema for contract code without deploying it.

**Returns:** `ContractSchema`

---

### readContract

Executes a read-only contract call without modifying state.

**Returns:** `RawReturn extends true ? 0x${string} : CalldataEncodable`

---

### simulateWriteContract

Simulates a state-modifying contract call without executing on-chain.

**Returns:** `RawReturn extends true ? 0x${string} : CalldataEncodable`

---

### writeContract

Executes a state-modifying function on a contract through consensus. Returns the transaction hash.

**Returns:** `0x${string}`

---

### deployContract

Deploys a new intelligent contract to GenLayer. Returns the transaction hash.

---

### getMinAppealBond

Calculates the minimum bond required to appeal a transaction.

**Returns:** `bigint`

---

### getRoundNumber

Returns the current consensus round number for a transaction.

**Returns:** `bigint`

---

### getRoundData

Returns detailed data for a specific consensus round.

---

### getLastRoundData

Returns the current round number and its data for a transaction.

---

### canAppeal

Checks if a transaction can be appealed.

**Returns:** `boolean`

---

### appealTransaction

Appeals a consensus transaction to trigger a new round of validation.

---

### finalizeTransaction

Finalizes a single GenLayer transaction that is ready to be finalized. Returns the EVM transaction hash.

**Returns:** `0x${string}`

---

### finalizeIdlenessTxs

Batch-finalizes idle GenLayer transactions (those stuck without progressing). Returns the EVM transaction hash.

**Returns:** `0x${string}`

---

[GenLayerJS](/api-references/genlayer-js "GenLayerJS")[Transactions](/api-references/genlayer-js/transactions "Transactions")
