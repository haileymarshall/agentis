# Direct Mode Testing

Source: https://docs.genlayer.com/api-references/genlayer-test/direct

Run contracts directly in Python without a network. Provides Foundry-style cheatcodes for fast test execution.

## Setup Functions

### `deploy_contract`

Deploy a contract and return an instance.

```
deploy_contract(contract_path: Path, vm: 'VMContext', args: Any, sdk_version: Optional[str] = None, kwargs: Any)
```

**Parameters:**

**Returns:** `Any`

---

### `load_contract_class`

Load a contract class from file.

Sets up SDK paths, WASI mock, and message context.

```
load_contract_class(contract_path: Path, vm: 'VMContext', sdk_version: Optional[str] = None)
```

**Parameters:**

**Returns:** `Type[Any]`

---

### `create_address`

Create a deterministic address from seed string.

```
create_address(seed: str)
```

**Parameters:**

**Returns:** `Any`

---

### `create_test_addresses`

Create a list of test addresses.

```
create_test_addresses(count: int = 10)
```

**Parameters:**

**Returns:** `list`

---

## VMContext

Test VM context providing Foundry-style cheatcodes.

Usage:
vm = VMContext()
vm.sender = Address("0x" + "a" \* 40)
vm.mock\_web("api.example.com", {"status": 200, "body": "{}"})

```
with vm.activate():
    contract = deploy_contract("Token.py", vm, owner)
    contract.transfer(bob, 100)
```

### `vm.activate`

Activate this VM context for contract execution.
Uses proper cleanup via ExitStack for resource management.

Patches datetime.datetime so that datetime.now() returns the
warped time set via vm.warp(). This is dynamic: calling warp()
mid-test updates \_datetime and subsequent now() calls reflect it.

---

### `vm.warp`

Set block timestamp (ISO format).

```
vm.warp(timestamp: str)
```

**Parameters:**

**Returns:** `None`

---

### `vm.deal`

Set balance for an address.

```
vm.deal(address: Any, amount: int)
```

**Parameters:**

**Returns:** `None`

---

### `vm.snapshot`

Take a snapshot of current state. Returns snapshot ID.

**Returns:** `int`

---

### `vm.revert`

Revert to a previous snapshot.

```
vm.revert(snapshot_id: int)
```

**Parameters:**

**Returns:** `None`

---

### `vm.mock_web`

Mock web requests matching URL pattern.

```
vm.mock_web(url_pattern: str, response: MockedWebResponseData)
```

**Parameters:**

**Returns:** `None`

---

### `vm.mock_llm`

Mock LLM prompts matching pattern.

```
vm.mock_llm(prompt_pattern: str, response: str)
```

**Parameters:**

**Returns:** `None`

---

### `vm.clear_mocks`

Clear all registered mocks.

**Returns:** `None`

---

### `vm.prank`

Context manager to temporarily change sender.

```
vm.prank(address: Any)
```

**Parameters:**

---

### `vm.startPrank`

Start pranking as address (persists until stopPrank).

```
vm.startPrank(address: Any)
```

**Parameters:**

**Returns:** `None`

---

### `vm.stopPrank`

Stop the current prank.

**Returns:** `None`

---

### `vm.expect_revert`

Context manager expecting the next call to revert.

Catches ContractRollback (gl.rollback) and any Exception raised
by contract code (ValueError, RuntimeError, etc.). If *message*
is given, the exception text must contain it.

```
vm.expect_revert(message: Optional[str] = None)
```

**Parameters:**

---

### `vm.run_validator`

Run a captured validator function from a prior run\_nondet call.

Each `gl.vm.run_nondet` call in a contract appends an entry to
an internal list. Use *index* to select which one (default -1,
the most recent).

Mocks still apply: the validator typically re-runs leader\_fn
internally, which hits the current web/LLM mocks. Swap mocks
between the contract call and `run_validator()` to simulate
the validator seeing different external data.

Args:
leader\_result: Override the leader's return value.
leader\_error: Simulate a leader exception (gl.vm.UserError).
index: Which captured validator to run (-1 = last).

Returns:
The bool returned by the validator function.

```
vm.run_validator(leader_result: Any = <object object at 0x7f3bdfd04ad0>, leader_error: Optional[Exception] = None, index: int = -1)
```

**Parameters:**

**Returns:** `bool`

---

### `vm.clear_validators`

Clear the captured validator list.

**Returns:** `None`

---

[Integration Testing](/api-references/genlayer-test/integration "Integration Testing")[glsim](/api-references/genlayer-test/glsim "glsim")
