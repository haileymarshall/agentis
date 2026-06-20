# Deploy Contracts

Source: https://docs.genlayer.com/developers/intelligent-contracts/tools/genlayer-studio/deploying-contract

Once you have loaded your Intelligent Contract into the GenLayer Studio, the next step is to set the constructor parameters and deploy it. The constructor parameters are essential inputs that initialize the state of your contract.

## Setting Constructor Parameters

1. After loading your Intelligent Contract, you will see the **Constructor Inputs** section on the left-hand pane. The constructor parameters are [automatically detected from your code if defined properly](#detecting-constructor-parameters).

2. If you need to manually adjust your constructor parameters, you can write them in JSON format by clicking on the **JSON** button.

## Detecting Constructor Parameters

The GenLayer Studio automatically detects the constructor parameters from your code. It analyzes your `__init__` method to identify the parameters and their types. This automatic detection ensures that you have the correct inputs for initializing your contract. It’s important to have clear type annotations for each parameter (e.g., `str`, `bool`, `int`, `list`) to enable accurate detection.

## Deploying the Contract

After setting the constructor parameters, click on **Deploy** to deploy your contract.

Once completed, you can proceed to execute your transactions and interact with the deployed contract.
