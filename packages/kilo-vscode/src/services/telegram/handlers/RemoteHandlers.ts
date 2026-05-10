import TelegramBot from 'node-telegram-bot-api';
import { exec } from 'child_process';
import util from 'util';
import type { TelegramHandlerContext } from '../TelegramService';
import type { TelegramService } from '../TelegramService';

const execPromise = util.promisify(exec);

let _approvalCounter = 0;
const nextApprovalId = () => `cmd_${++_approvalCounter}_${Date.now()}`;

export const registerRemoteHandlers = (registry: any, ctx: TelegramHandlerContext, service: TelegramService) => {
  registry.register('command', async (bot: TelegramBot, msg: TelegramBot.Message, args: string[]) => {
    const chatId = msg.chat.id;
    const cmd = args.join(' ');
    if (!cmd) {
      await bot.sendMessage(chatId, 'Usage: /command <shell command>');
      return;
    }
    const id = nextApprovalId();
    await bot.sendMessage(chatId, `⚠️ Run: \`${cmd}\`?`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Approve', callback_data: `approve_${id}` },
          { text: '❌ Reject', callback_data: `reject_${id}` },
        ]],
      },
    });

    const approved = await new Promise<boolean>(resolve => {
      service.pendingApprovals.set(id, cmd, resolve);
    });

    if (!approved) return;

    const cwd = ctx.workspaceRoot();
    try {
      const { stdout, stderr } = await execPromise(cmd, { cwd: cwd || undefined, timeout: 30000 });
      const output = (stdout + stderr).trim();
      const response = output.length > 0 ? output : '(no output)';
      if (response.length <= 4000) {
        await bot.sendMessage(chatId, `✅ Done:\n\`\`\`\n${response.slice(0, 4000)}\n\`\`\``, {
          parse_mode: 'Markdown',
        });
      } else {
        const chunks = response.match(/.{1,3800}/gs) ?? [];
        for (const chunk of chunks.slice(0, 5)) {
          await bot.sendMessage(chatId, `\`\`\`\n${chunk}\n\`\`\``, { parse_mode: 'Markdown' });
        }
        if (chunks.length > 5) {
          await bot.sendMessage(chatId, `_(${chunks.length - 5} more chunks omitted)_`, { parse_mode: 'Markdown' });
        }
      }
    } catch (e: any) {
      const stderr = e?.stderr ?? e?.message ?? String(e);
      await bot.sendMessage(chatId, `❌ Command failed:\n\`\`\`\n${String(stderr).slice(0, 1000)}\n\`\`\``, {
        parse_mode: 'Markdown',
      });
    }
  });

  registry.register('approve', async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    const id = service.pendingApprovals.getFirstId();
    if (!id) {
      await bot.sendMessage(chatId, 'ℹ️ No pending action to approve.');
      return;
    }
    service.pendingApprovals.approve(id);
    await bot.sendMessage(chatId, '✅ Approved.');
  });

  registry.register('reject', async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    const id = service.pendingApprovals.getFirstId();
    if (!id) {
      await bot.sendMessage(chatId, 'ℹ️ No pending action to reject.');
      return;
    }
    service.pendingApprovals.reject(id);
    await bot.sendMessage(chatId, '🚫 Rejected.');
  });
};
