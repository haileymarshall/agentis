# GenLayerPY SDK API Reference

Source: https://docs.genlayer.com/api-references/genlayer-py/api

Auto-generated from source docstrings.

## Client Methods

Client for interacting with the GenLayer network.

Provides methods for deploying and calling intelligent contracts,
managing transactions, and staking operations.

### fund\_account

Funds an account with test tokens. Localnet only.

```
client.fund_account(address: Union, amount: int)
```

**Returns:** `HexBytes`

---

### get\_current\_nonce

Returns the current nonce (transaction count) for an account.

```
client.get_current_nonce(address: Union = None, block_identifier: Union = None)
```

**Returns:** `Nonce`

---

### initialize\_consensus\_smart\_contract

Initializes the consensus contract configuration from the network.

```
client.initialize_consensus_smart_contract(force_reset: bool = False)
```

**Returns:** `None`

---

### read\_contract

Executes a read-only contract call without modifying state.

```
client.read_contract(address: Union, function_name: str, args: Optional = None, kwargs: Optional = None, account: Optional = None, raw_return: bool = False, transaction_hash_variant: TransactionHashVariant = <TransactionHashVariant.LATEST_NONFINAL: 'latest-nonfinal'>, sim_config: Optional = None)
```

---

### write\_contract

Executes a state-modifying function on a contract through consensus. Returns the transaction hash.

```
client.write_contract(address: Union, function_name: str, account: Optional = None, consensus_max_rotations: Optional = None, value: int = 0, leader_only: bool = False, args: Optional = None, kwargs: Optional = None, sim_config: Optional = None)
```

---

### simulate\_write\_contract

Simulates a state-modifying contract call without executing on-chain. Localnet only.

```
client.simulate_write_contract(address: Union, function_name: str, account: Optional = None, args: Optional = None, kwargs: Optional = None, sim_config: Optional = None, transaction_hash_variant: TransactionHashVariant = <TransactionHashVariant.LATEST_NONFINAL: 'latest-nonfinal'>)
```

---

### deploy\_contract

Deploys a new intelligent contract to GenLayer. Returns the transaction hash.

```
client.deploy_contract(code: Union, account: Optional = None, args: Optional = None, kwargs: Optional = None, consensus_max_rotations: Optional = None, leader_only: bool = False, sim_config: Optional = None)
```

---

### get\_contract\_schema

Gets the schema (methods and constructor) of a deployed contract. Localnet only.

```
client.get_contract_schema(address: Union)
```

**Returns:** `ContractSchema`

---

### get\_contract\_schema\_for\_code

Generates a schema for contract code without deploying it. Localnet only.

```
client.get_contract_schema_for_code(contract_code: AnyStr)
```

**Returns:** `ContractSchema`

---

### appeal\_transaction

Appeals a consensus transaction to trigger a new round of validation.
Returns the original transaction\_id (appeals operate on the same tx).

```
client.appeal_transaction(transaction_id: HexStr, account: Optional = None, value: int = 0)
```

---

### wait\_for\_transaction\_receipt

Polls until a transaction reaches the specified status. Returns the transaction receipt.

```
client.wait_for_transaction_receipt(transaction_hash: Union, status: TransactionStatus = <TransactionStatus.ACCEPTED: 'ACCEPTED'>, interval: int = 3000, retries: int = 10, full_transaction: bool = False)
```

**Returns:** `GenLayerTransaction`

---

### get\_transaction

Fetches transaction data including status, execution result, and consensus details.

```
client.get_transaction(transaction_hash: Union)
```

**Returns:** `GenLayerTransaction`

---

### get\_triggered\_transaction\_ids

Returns transaction IDs of child transactions created from emitted messages.

```
client.get_triggered_transaction_ids(transaction_hash: Union)
```

**Returns:** `list`

---

### debug\_trace\_transaction

Fetches the full execution trace including return data, stdout, stderr, and GenVM logs.

```
client.debug_trace_transaction(transaction_hash: Union, round: int = 0)
```

**Returns:** `dict`

---

## Types and Enums

### TransactionStatus

Status of a GenLayer transaction in the consensus lifecycle.

```
TransactionStatus.UNINITIALIZED = "UNINITIALIZED"
TransactionStatus.PENDING = "PENDING"
TransactionStatus.PROPOSING = "PROPOSING"
TransactionStatus.COMMITTING = "COMMITTING"
TransactionStatus.REVEALING = "REVEALING"
TransactionStatus.ACCEPTED = "ACCEPTED"
TransactionStatus.UNDETERMINED = "UNDETERMINED"
TransactionStatus.FINALIZED = "FINALIZED"
TransactionStatus.CANCELED = "CANCELED"
TransactionStatus.APPEAL_REVEALING = "APPEAL_REVEALING"
TransactionStatus.APPEAL_COMMITTING = "APPEAL_COMMITTING"
TransactionStatus.READY_TO_FINALIZE = "READY_TO_FINALIZE"
TransactionStatus.VALIDATORS_TIMEOUT = "VALIDATORS_TIMEOUT"
TransactionStatus.LEADER_TIMEOUT = "LEADER_TIMEOUT"
```

---

### TransactionResult

Consensus voting result across validators.

```
TransactionResult.IDLE = "IDLE"
TransactionResult.AGREE = "AGREE"
TransactionResult.DISAGREE = "DISAGREE"
TransactionResult.TIMEOUT = "TIMEOUT"
TransactionResult.DETERMINISTIC_VIOLATION = "DETERMINISTIC_VIOLATION"
TransactionResult.NO_MAJORITY = "NO_MAJORITY"
TransactionResult.MAJORITY_AGREE = "MAJORITY_AGREE"
TransactionResult.MAJORITY_DISAGREE = "MAJORITY_DISAGREE"
```

---

### ExecutionResult

Result of contract execution by the GenVM.

```
ExecutionResult.NOT_VOTED = "NOT_VOTED"
ExecutionResult.FINISHED_WITH_RETURN = "FINISHED_WITH_RETURN"
ExecutionResult.FINISHED_WITH_ERROR = "FINISHED_WITH_ERROR"
```

---

### VoteType

str(object='') -> str
str(bytes\_or\_buffer[, encoding[, errors]]) -> str

Create a new string object from the given object. If encoding or
errors is specified, then the object must expose a data buffer
that will be decoded using the given encoding and error handler.
Otherwise, returns the result of object.**str**() (if defined)
or repr(object).
encoding defaults to 'utf-8'.
errors defaults to 'strict'.

```
VoteType.NOT_VOTED = "NOT_VOTED"
VoteType.AGREE = "AGREE"
VoteType.DISAGREE = "DISAGREE"
VoteType.TIMEOUT = "TIMEOUT"
VoteType.DETERMINISTIC_VIOLATION = "DETERMINISTIC_VIOLATION"
```

---

[GenLayerPY](/api-references/genlayer-py "GenLayerPY")[GenLayer Test](/api-references/genlayer-test "GenLayer Test")
