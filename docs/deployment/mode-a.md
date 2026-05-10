# Deployment Documentation

## Mode A: Headless Server (AMD GPU / code-server)

This deployment mode is designed for remote Linux servers, particularly those with AMD GPU acceleration, running `code-server` in Docker.

### Environment Configuration
Ensure the following environment variables are set within the container's `.env` file or container environment configuration:

- `TG_BOT_TOKEN`: The Telegram Bot API token.
- `TG_ALLOWED_CHAT_IDS`: A comma-separated list of Telegram Chat IDs permitted to interact with the bot.
- `MINIAPP_HOST`: The URL of the hosted React Mini App (e.g., `https://<org>-tele-delegator.hf.space`).
- `TG_APPROVAL_TTL_SECONDS`: Timeout in seconds for remote execution approvals (default: `60`).
- `KILO_BACKEND_URL`: (Optional) Custom URL for the `kilo serve` CLI backend.

### Docker & AMD GPU Bootstrap
1. **Container Bootstrap**: The `kilo serve` CLI backend is managed by `ServerManager` on container startup.
2. **Extension Activation**: The Kilo Code extension automatically detects `TG_BOT_TOKEN` in the process environment.
3. **TelegramService**: The service is activated upon extension startup, registering the Telegram bot and enforcing the whitelist defined in `TG_ALLOWED_CHAT_IDS`.
4. **LLM Inference**: Ensure local vLLM instances are running on the AMD GPU. The extension is designed to interface with these local inference engines directly, requiring no external API keys for code-expert models like DeepSeek-Coder or CodeLlama.
