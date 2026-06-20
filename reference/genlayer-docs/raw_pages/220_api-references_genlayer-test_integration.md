# Integration Testing

Source: https://docs.genlayer.com/api-references/genlayer-test/integration

Test contracts against a running GenLayer network (localnet, studionet, or testnet).

## Setup Functions

### `get_contract_factory`

Get a ContractFactory instance for a contract.

Args:
contract\_name: Name of the contract to load from artifacts
contract\_file\_path: Path to the contract file to load directly

Note: Exactly one of contract\_name or contract\_file\_path must be provided.

```
get_contract_factory(contract_name: Optional = None, contract_file_path: Union = None)
```

**Parameters:**

**Returns:** `ContractFactory`

---

### `get_default_account`

Returns the default account for the current network.

**Returns:** `LocalAccount`

---

### `get_accounts`

Returns all configured accounts for the current network.

**Returns:** `List`

---

### `create_accounts`

Creates n new accounts with random private keys.

```
create_accounts(n_accounts: int)
```

**Parameters:**

---

### `get_gl_client`

Get the GenLayer client instance.

---

### `get_validator_factory`

**Returns:** `ValidatorFactory`

---

## ContractFactory

A factory for deploying contracts.

### `factory.deploy`

Deploy the contract and return a Contract instance (convenience method).

This is a convenience method that handles receipt validation
and contract instantiation automatically.

```
factory.deploy(args: Optional = None, account: Optional = None, consensus_max_rotations: Optional = None, wait_interval: Optional = None, wait_retries: Optional = None, wait_transaction_status: TransactionStatus = <TransactionStatus.ACCEPTED: 'ACCEPTED'>, wait_triggered_transactions: bool = False, wait_triggered_transactions_status: TransactionStatus = <TransactionStatus.ACCEPTED: 'ACCEPTED'>, transaction_context: Optional = None)
```

**Parameters:**

**Returns:** `Contract`

---

### `factory.deploy_contract_tx`

Deploy the contract and return the transaction receipt.

```
factory.deploy_contract_tx(args: Optional = None, account: Optional = None, consensus_max_rotations: Optional = None, wait_interval: Optional = None, wait_retries: Optional = None, wait_transaction_status: TransactionStatus = <TransactionStatus.ACCEPTED: 'ACCEPTED'>, wait_triggered_transactions: bool = False, wait_triggered_transactions_status: TransactionStatus = <TransactionStatus.ACCEPTED: 'ACCEPTED'>, transaction_context: Optional = None)
```

**Parameters:**

**Returns:** `GenLayerTransaction`

---

### `factory.build_contract`

Build contract from address

```
factory.build_contract(contract_address: Union, account: Optional = None)
```

**Parameters:**

**Returns:** `Contract`

---

## ContractFunction

ContractFunction(method\_name: str, read\_only: bool, call\_method: Optional[Callable] = None, analyze\_method: Optional[Callable] = None, transact\_method: Optional[Callable] = None)

### `contract.method_name.call`

Executes a read-only contract method call.

```
contract.method_name.call(transaction_hash_variant: TransactionHashVariant = <TransactionHashVariant.LATEST_NONFINAL: 'latest-nonfinal'>, transaction_context: Optional = None)
```

**Parameters:**

---

### `contract.method_name.transact`

Executes a state-changing contract method through consensus. Returns the transaction receipt.

```
contract.method_name.transact(value: int = 0, consensus_max_rotations: Optional = None, wait_transaction_status: TransactionStatus = <TransactionStatus.ACCEPTED: 'ACCEPTED'>, wait_interval: Optional = None, wait_retries: Optional = None, wait_triggered_transactions: bool = False, wait_triggered_transactions_status: TransactionStatus = <TransactionStatus.ACCEPTED: 'ACCEPTED'>, transaction_context: Optional = None)
```

**Parameters:**

---

### `contract.method_name.analyze`

Runs statistical analysis of method behavior across multiple executions.

```
contract.method_name.analyze(provider: str, model: str, config: Optional = None, plugin: Optional = None, plugin_config: Optional = None, runs: int = 100, genvm_datetime: Optional = None)
```

**Parameters:**

---

## ValidatorFactory

### `validator_factory.create_validator`

```
validator_factory.create_validator(stake: int, provider: str, model: str, config: Dict, plugin: str, plugin_config: Dict)
```

**Parameters:**

**Returns:** `Validator`

---

### `validator_factory.batch_create_validators`

```
validator_factory.batch_create_validators(count: int, stake: int, provider: str, model: str, config: Dict, plugin: str, plugin_config: Dict)
```

**Parameters:**

**Returns:** `List`

---

### `validator_factory.create_mock_validator`

```
validator_factory.create_mock_validator(mock_llm_response: Optional = None, mock_web_response: Optional = None)
```

**Parameters:**

**Returns:** `Validator`

---

### `validator_factory.batch_create_mock_validators`

```
validator_factory.batch_create_mock_validators(count: int, mock_llm_response: Optional = None, mock_web_response: Optional = None)
```

**Parameters:**

**Returns:** `List`

---

## Validator

Validator(stake: int, provider: str, model: str, config: Dict[str, Any], plugin: str, plugin\_config: Dict[str, Any], mock\_enabled: bool, mock\_llm\_response: Optional[gltest.types.MockedLLMResponse], mock\_web\_response: Optional[gltest.types.MockedWebResponse])

### `validator.to_dict`

**Returns:** `Dict`

---

### `validator.clone`

**Returns:** `Validator`

---

### `validator.batch_clone`

```
validator.batch_clone(count: int)
```

**Parameters:**

**Returns:** `List`

---

[GenLayer Test](/api-references/genlayer-test "GenLayer Test")[Direct Mode](/api-references/genlayer-test/direct "Direct Mode")
