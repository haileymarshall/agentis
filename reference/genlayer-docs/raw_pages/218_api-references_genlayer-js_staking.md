# Staking Methods

Source: https://docs.genlayer.com/api-references/genlayer-js/staking

Methods for validator and delegator staking operations, epoch queries, and network status.

### validatorJoin

Joins as a validator with the specified stake amount.

**Returns:** `ValidatorJoinResult`

---

### validatorDeposit

Adds additional self-stake to an active validator position. The
underlying Staking contract requires msg.sender == ValidatorWallet,
so the call is routed through the wallet's own validatorDeposit
forwarder (which re-enters Staking with the correct sender).

**Returns:** `StakingTransactionResult`

---

### validatorExit

Exits a validator position by burning the specified shares. Same
msg.sender constraint as validatorDeposit — routed via the wallet.

**Returns:** `StakingTransactionResult`

---

### validatorClaim

Claims pending validator withdrawals.

**Returns:** `StakingTransactionResult & {claimedAmount: bigint}`

---

### validatorPrime

Primes a validator for participation in the next epoch.

**Returns:** `StakingTransactionResult`

---

### setOperator

Sets the operator address for a validator wallet.

**Returns:** `StakingTransactionResult`

---

### setIdentity

Sets validator identity information (name, website, social links).

**Returns:** `StakingTransactionResult`

---

### delegatorJoin

Delegates stake to a validator.

**Returns:** `DelegatorJoinResult`

---

### delegatorExit

Exits a delegation by burning the specified shares.

**Returns:** `StakingTransactionResult`

---

### delegatorClaim

Claims pending delegator withdrawals.

**Returns:** `StakingTransactionResult`

---

### isValidator

Checks if an address is an active validator.

**Returns:** `boolean`

---

### getValidatorInfo

Returns comprehensive information about a validator including stake, identity, and status.

**Returns:** `ValidatorInfo`

---

### getStakeInfo

Returns delegation stake information for a delegator-validator pair.

**Returns:** `StakeInfo`

---

### getEpochInfo

Returns current epoch information including timing, stake requirements, and inflation data.

*No parameters.*

**Returns:** `EpochInfo`

---

### getEpochData

Returns detailed data for a specific epoch.

**Returns:** `EpochData`

---

### getActiveValidators

Returns addresses of all currently active validators.

*No parameters.*

**Returns:** `Address[]`

---

### getActiveValidatorsCount

Returns the count of active validators.

*No parameters.*

**Returns:** `bigint`

---

### getQuarantinedValidators

Returns addresses of validators currently in quarantine.

*No parameters.*

**Returns:** `Address[]`

---

### getBannedValidators

Returns banned validators with ban duration and permanent ban status.

**Returns:** `BannedValidatorInfo[]`

---

### getQuarantinedValidatorsDetailed

Returns detailed quarantine information with pagination.

**Returns:** `BannedValidatorInfo[]`

---

[Transactions](/api-references/genlayer-js/transactions "Transactions")[GenLayerPY](/api-references/genlayer-py "GenLayerPY")
