export const agentisAbi = [
  {
    type: "function",
    name: "createJob",
    stateMutability: "payable",
    inputs: [
      { name: "agent", type: "address" },
      { name: "taskDescription", type: "string" },
      { name: "successCriteria", type: "string" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: [{ name: "jobId", type: "uint256" }]
  },
  {
    type: "function",
    name: "acceptJob",
    stateMutability: "payable",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "cancelJob",
    stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "submitDelivery",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "deliveryUrl", type: "string" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "approveDelivery",
    stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "openDispute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "disputeType", type: "uint8" },
      { name: "complaint", type: "string" },
      { name: "initialEvidenceUrl", type: "string" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "submitEvidence",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "evidenceUrl", type: "string" },
      { name: "responseText", type: "string" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "requestVerdict",
    stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "recordVerdict",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "outcome", type: "uint8" },
      { name: "agentPaymentBps", type: "uint16" },
      { name: "clientRefundBps", type: "uint16" },
      { name: "agentBondSlashBps", type: "uint16" },
      { name: "confidenceBps", type: "uint16" },
      { name: "verdictHash", type: "bytes32" },
      { name: "reasoning", type: "string" },
      { name: "responsibleParty", type: "string" },
      { name: "evidenceQuality", type: "string" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "appealVerdict",
    stateMutability: "payable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "appealEvidenceUrl", type: "string" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "finalizeSettlement",
    stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "claimPayout",
    stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "withdrawFees",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: []
  },
  {
    type: "function",
    name: "timeoutRefund",
    stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "getJob",
    stateMutability: "view",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "client", type: "address" },
          { name: "agent", type: "address" },
          { name: "token", type: "address" },
          { name: "paymentAmount", type: "uint256" },
          { name: "agentBondAmount", type: "uint256" },
          { name: "platformFeeBps", type: "uint256" },
          { name: "createdAt", type: "uint256" },
          { name: "acceptedAt", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "deliveredAt", type: "uint256" },
          { name: "verdictAt", type: "uint256" },
          { name: "appealDeadline", type: "uint256" },
          { name: "verdictRequestedAt", type: "uint256" },
          { name: "appealCount", type: "uint8" },
          { name: "status", type: "uint8" },
          { name: "disputeType", type: "uint8" },
          { name: "taskDescription", type: "string" },
          { name: "successCriteria", type: "string" },
          { name: "deliveryUrl", type: "string" },
          { name: "clientEvidenceUrl", type: "string" },
          { name: "agentEvidenceUrl", type: "string" },
          { name: "complaint", type: "string" },
          { name: "agentResponse", type: "string" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "getVerdict",
    stateMutability: "view",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "outcome", type: "uint8" },
          { name: "agentPaymentBps", type: "uint16" },
          { name: "clientRefundBps", type: "uint16" },
          { name: "agentBondSlashBps", type: "uint16" },
          { name: "confidenceBps", type: "uint16" },
          { name: "verdictHash", type: "bytes32" },
          { name: "reasoning", type: "string" },
          { name: "responsibleParty", type: "string" },
          { name: "evidenceQuality", type: "string" },
          { name: "submittedAt", type: "uint256" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "getPendingPayouts",
    stateMutability: "view",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "clientAmount", type: "uint256" },
          { name: "agentAmount", type: "uint256" },
          { name: "treasuryAmount", type: "uint256" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "getJobCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "getJobsByClient",
    stateMutability: "view",
    inputs: [{ name: "client", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }]
  },
  {
    type: "function",
    name: "getJobsByAgent",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }]
  },
  {
    type: "event",
    name: "VerdictRequested",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true },
      { name: "chainId", type: "uint256", indexed: true }
    ]
  }
] as const;
