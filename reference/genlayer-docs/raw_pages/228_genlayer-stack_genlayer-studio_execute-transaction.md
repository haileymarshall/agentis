# Execute Transactions

Source: https://docs.genlayer.com/genlayer-stack/genlayer-studio/execute-transaction

After deploying your Intelligent Contract and verifying its state, the next step is to execute transactions. This allows you to interact with your contract's methods and functions to perform specific actions or queries.

## Write Methods

1. In the **Write Methods** section, you will see all the write methods available in your Intelligent Contract.
2. Expand the method you want to execute. For example, in the **Storage** contract, select the `update_storage` method.
3. If the method requires input parameters, a field will appear for you to enter the necessary values. For example, the `update_storage` method requires a string called `new_storage`.

![Deploy Contract](/_next/image?url=%2Frequest-string.png&w=1920&q=75)

4. After entering any required parameters, click the button to execute the method. The Studio will process the transaction and return the result.

## Viewing Transaction Results

Once you execute a transaction, the result will be displayed, showing the output of the method called. This allows you to verify that the method has executed correctly and to see the effect of the transaction on your contract's state.

## Viewing Current Account Address

You can also view your current account address in the header. This address is used to interact with your contract.

![Select Active Account](/_next/image?url=%2Fdropdown-account.png&w=1920&q=75)

You can continue interacting with your Intelligent Contract by executing additional transactions or checking the state again to see how it has changed.

[Reading the Contract State](/developers/intelligent-contracts/tools/genlayer-studio/contract-state "Reading the Contract State")[Monitoring Node Logs](/developers/intelligent-contracts/tools/genlayer-studio/monitoring-node-logs "Monitoring Node Logs")
