# 🏆 Kilo Code: Agentic Engineering on AMD (Hackathon Edition)

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=kilocode.Kilo-Code"><img src="https://raster.shields.io/badge/VS_Code_Marketplace-007ACC?style=flat&logo=visualstudiocode&logoColor=white" alt="VS Code Marketplace" height="20"></a>
  <a href="https://x.com/kilocode"><img src="https://raster.shields.io/badge/kilocode-000000?style=flat&logo=x&logoColor=white" alt="X (Twitter)" height="20"></a>
</p>

<p align="center">
 <img width="250" alt="kilo-code-logo" src="https://github.com/user-attachments/assets/bdb0c174-b9fd-40ad-a47b-f3aab9b54e8d" />
</p>

> **Kilo Code** empowers developers with remote agentic workflows, using AMD MI300X-powered Qwen3.6 inference for high-performance coding. Manage agents from Telegram, with full local LLM support via Ollama for privacy and efficiency in your development loop.

---

## 🚀 AMD Hackathon Submission

- **Track:** [AI Agents & Agentic Workflows](https://lablab.ai/ai-hackathons/amd-developer)
- **Primary Tech:** AMD Developer Cloud (MI300X GPUs), ROCm, Qwen3.6.
- **Key Innovation:** Remote Agentic Orchestration via Telegram.

### Why Kilo Code on AMD?
Agentic workflows require rapid, iterative reasoning. By leveraging **AMD's MI300X GPUs** and the **Qwen3.6** model, Kilo Code achieves superior coding performance and low-latency inference. Whether using the AMD Developer Cloud or local LLM execution via **Ollama**, Kilo ensures high efficiency, privacy, and full control over your development stack.

---

## ✨ Key Features

- **🤖 Remote Agentic Management:** Use our Telegram Bot to approve shell commands, answer agent questions, and trigger new tasks from your phone.
- **✨ High-Performance Inference:** Powered by Qwen3.6 on AMD MI300X for world-class reasoning and tool-use performance.
- **🛡️ Local LLM Support:** Fully compatible with Ollama, enabling private local development on AMD hardware.
- **✅ Self-Checking Agents:** Kilo checks its own work, runs tests, and fixes failures autonomously.
- **📊 Rich Visualization:** View repository structures and code diffs directly in Telegram.

## Get Started in Visual Studio Code

1. Install the Kilo Code extension from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=kilocode.Kilo-Code).
2. Create your account to access 500+ cutting-edge AI models including Gemini 3.1 Pro, Claude 4.6 Sonnet & Opus, and GPT-5.4 – with transparent pricing that matches provider rates exactly.
3. Start coding with AI that adapts to your workflow. Watch our quick-start guide to see Kilo in action:

<a href="https://youtu.be/pqGfYXgrhig"><img src="https://img.youtube.com/vi/pqGfYXgrhig/maxresdefault.jpg" alt="Watch the video" width="640" height="360"></a>

## Get Started with the CLI

```bash
# npm
npm install -g @kilocode/cli

# Or run directly with npx
npx @kilocode/cli
```

Then run `kilo` in any project directory to start.

<!-- kilocode_change start -->

### npm Install Note: Hidden `.kilo` File

On some systems and npm versions, installing `@kilocode/cli` can create a hidden `.kilo` file near the installed `kilo` command (for example in a global npm bin directory). This file is an npm-generated launcher helper, not project data.

- Why it exists: npm may create helper artifacts while wiring CLI executables.
- Size caveat: size can vary by platform, npm version, and install mode (symlink vs copied launcher), so a strict fixed size is not guaranteed.
- Safety: it is safe to leave in place. Do not edit it manually. Use your package manager's uninstall (`npm uninstall -g @kilocode/cli`) to remove install artifacts cleanly.
<!-- kilocode_change end -->

### Install from GitHub Releases (Optional)

Download the latest binary or source code from the [Releases page](https://github.com/Kilo-Org/kilocode/releases), use this quick guide:

- `kilo-<os>-<arch>.zip` is the CLI binary for your OS and CPU architecture on Windows and macOS. (`kilo-linux-<arch>.tar.gz` for Linux)
- `darwin` means macOS.
- `x64` is standard 64-bit Intel/AMD CPUs.
- `x64-baseline` is a compatibility build for older x64 CPUs(do not support AVX Instruction).
- `arm64` is ARM-based Linux/MacOS.
- `musl` is statically linked Linux build for Alpine/minimal Docker without glibc. Alpine/minimal Docker users should prefer the matching \*-musl asset.
- `kilo-vscode-*.vsix` is the VS Code extension package and not the CLI binary.
- `Source code` releases are for building from source, not normal installation.

For most users:

- **Windows (most PCs):** `kilo-windows-x64.zip`
- **macOS Apple Silicon:** `kilo-darwin-arm64.zip`
- **macOS Intel:** `kilo-darwin-x64.zip`
- **Linux x64:** `kilo-linux-x64.tar.gz`
- **Linux on ARM:** `kilo-linux-arm64.tar.gz`

### Autonomous Mode (CI/CD)

Use the `--auto` flag with `kilo run` to enable fully autonomous operation without user interaction. This is ideal for CI/CD pipelines and automated workflows:

```bash
kilo run --auto "run tests and fix any failures"
```

**Important:** The `--auto` flag disables all permission prompts and allows the agent to execute any action without confirmation. Only use this in trusted environments like CI/CD pipelines.

## Security Considerations

The Telegram Remote Management Interface provides external access to your development environment. Please observe these precautions:

- **🔐 Bot Token Protection:** Never share or commit your Telegram Bot Token. Kilo Code uses the VS Code `SecretStorage` API to keep it secure.
- **🆔 Chat ID Whitelisting:** Ensure `allowedChatId` is set only to your personal Telegram User ID to prevent unauthorized remote access.
- **⚠️ Permission Awareness:** Even with remote access, Kilo Code requires your explicit permission before executing sensitive tools. Review all requests carefully before approving.
- **🌐 Network Security:** Ensure your workstation is on a secure, private network, as the bot communicates directly with the Telegram API.

## Contributing

We welcome contributions from developers, writers, and enthusiasts!
To get started, please read our [Contributing Guide](/CONTRIBUTING.md). It includes details on setting up your environment, coding standards, types of contribution and how to submit pull requests.

See [RELEASING.md](RELEASING.md) for the release process.

## Code of Conduct

Our community is built on respect, inclusivity, and collaboration. Please review our [Code of Conduct](/CODE_OF_CONDUCT.md) to understand the expectations for all contributors and community members.

## License

This project is licensed under the MIT License.
You’re free to use, modify, and distribute this code, including for commercial purposes as long as you include proper attribution and license notices. See [License](/LICENSE).

### Hackathon Attribution
This repository is a fork of the original **Kilo Code** project, customized specifically for the **AMD Developer Hackathon 2026**. All modifications related to the Telegram Remote Management Interface and AMD Developer Cloud integration are open source under the same MIT License.

### Where did Kilo CLI come from?
Kilo CLI is a fork of [OpenCode](https://github.com/anomalyco/opencode), enhanced to work within the Kilo agentic engineering platform.
