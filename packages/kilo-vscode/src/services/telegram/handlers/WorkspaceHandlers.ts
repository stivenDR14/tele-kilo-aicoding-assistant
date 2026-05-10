import TelegramBot from "node-telegram-bot-api"
import { exec } from "child_process"
import util from "util"
import * as fs from "fs"
import { HtmlRenderer } from "../HtmlRenderer"
import type { TelegramHandlerContext } from "../TelegramService"

const execPromise = util.promisify(exec)

export const registerWorkspaceHandlers = (registry: any, ctx: TelegramHandlerContext) => {
  registry.register("listfiletree", async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const chatId = msg.chat.id
    const cwd = ctx.workspaceRoot()
    const sentMsg = await bot.sendMessage(chatId, "⏳ Fetching file tree...")
    try {
      const { stdout } = await execPromise(
        `find . -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/.next/*" -not -path "*/.vscode/*" -not -path "*/build/*" -not -path "*/__pycache__/*" -not -path "*/.turbo/*" -not -path "*/coverage/*" -not -path "*/.cache/*" -not -path "*/out/*" | sort`,
        { cwd: cwd || undefined, maxBuffer: 10 * 1024 * 1024 },
      )
      const lines = stdout.split("\n").filter(Boolean)
      const html = HtmlRenderer.renderTree(lines)
      const tmpPath = require("os").tmpdir() + "/filetree.html"
      fs.writeFileSync(tmpPath, html, "utf8")
      //await bot.deleteMessage(chatId, sentMsg.message_id).catch(() => {});
      await bot.sendDocument(chatId, tmpPath, { caption: "🌲 File tree — open to browse folders" })
    } catch (e) {
      await bot.editMessageText("❌ Error generating file tree.", {
        chat_id: chatId,
        message_id: sentMsg.message_id,
      })
    }
  })
}
