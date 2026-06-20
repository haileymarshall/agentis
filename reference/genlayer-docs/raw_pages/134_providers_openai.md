# OpenAI

Source: https://docs.genlayer.com/_providers/openai

OpenAI is an LLM provider that provides fast and reliable AI models used by validators to process and validate Intelligent Contracts.

## Setup during `genlayer init`

When you run the `genlayer init` command, you will be prompted to select the LLM providers you want to use. If you choose OpenAI, you will need to provide an [API key](https://openai.com/api/) during the setup process. This key is necessary to authenticate and access OpenAI's services.

Set the OpenAI API key when prompted:

```
OPENAIKEY=your_openai_api_key
```

This environment variable is configured in the `.env` file located in the Studio's root folder.

### Troubleshooting Tips

- **Missing API Key**: Ensure that you enter the `OPENAIKEY` when prompted during the initialization process.
- **Incorrect Configuration**: Verify that the API key you entered is valid and that you have selected the correct provider during initialization.

[Discover the Protocol](/understand-genlayer-protocol "Discover the Protocol")
