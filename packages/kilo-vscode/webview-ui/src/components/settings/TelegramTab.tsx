import { Component, createSignal } from "solid-js"
import { Switch } from "@kilocode/kilo-ui/switch"
import { TextField } from "@kilocode/kilo-ui/text-field"
import { Card } from "@kilocode/kilo-ui/card"
import { useVSCode } from "../../context/vscode"
import SettingsRow from "./SettingsRow"

export const TelegramTab: Component = () => {
  const { postMessage } = useVSCode()

  const [token, setToken] = createSignal("")
  const [chatId, setChatId] = createSignal("")
  const [remoteMode, setRemoteMode] = createSignal(false)

  const updateSettings = () => {
    postMessage({
      type: "updateTelegramSettings",
      token: token(),
      chatId: chatId(),
      remoteMode: remoteMode(),
    })
  }

  return (
    <div style={{ display: "flex", "flex-direction": "column", gap: "16px" }}>
      {/* Info text matching other tabs */}
      <div
        style={{
          background: "var(--vscode-textBlockQuote-background)",
          border: "1px solid var(--vscode-panel-border)",
          "border-radius": "4px",
          padding: "12px 16px",
        }}
      >
        <p
          style={{
            "font-size": "12px",
            color: "var(--vscode-descriptionForeground)",
            margin: 0,
            "line-height": "1.5",
          }}
        >
          Configure Telegram integration to interact with your workspace remotely. 
          Your bot token is encrypted and securely stored using the VS Code Secrets API.
        </p>
      </div>

      <Card>
        {/* Bot Token */}
        <SettingsRow
          title="Bot Token"
          description="The token provided by @BotFather."
        >
          <div style={{ width: "300px" }}>
            <TextField
              type="password"
              value={token()}
              placeholder="e.g. 123456789:ABCDefghIJKlmnOPQRstuvwxyz"
              onChange={(val) => {
                setToken(val)
                updateSettings()
              }}
            />
          </div>
        </SettingsRow>

        {/* Chat ID */}
        <SettingsRow
          title="Allowed Chat ID"
          description="Your personal or group chat ID to restrict unauthorized access."
        >
          <div style={{ width: "300px" }}>
            <TextField
              value={chatId()}
              placeholder="e.g. 987654321"
              onChange={(val) => {
                setChatId(val)
                updateSettings()
              }}
            />
          </div>
        </SettingsRow>

        {/* Remote Mode Toggle */}
        <SettingsRow
          title="Enable Remote Mode"
          description="Toggle to start or stop the Telegram bot polling connection."
          last
        >
          <Switch
            checked={remoteMode()}
            onChange={(checked: boolean) => {
              setRemoteMode(checked)
              updateSettings()
            }}
            hideLabel
          >
            Enable Remote Mode
          </Switch>
        </SettingsRow>
      </Card>
    </div>
  )
}
