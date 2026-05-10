import TelegramBot from 'node-telegram-bot-api';
import { exec } from 'child_process';
import util from 'util';
import * as fs from 'fs';
import { createTwoFilesPatch } from 'diff';
import { HtmlRenderer } from '../HtmlRenderer';
import type { TelegramHandlerContext } from '../TelegramService';
import type { TelegramService } from '../TelegramService';

const execPromise = util.promisify(exec);

// Keyed by chatId — holds the last /changes file list so diff_<index> can resolve the path
const changesPathCache = new Map<number, string[]>();

export const registerSessionHandlers = (registry: any, ctx: TelegramHandlerContext, service: TelegramService) => {
  registry.register('seeconversation', async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    try {
      const client = ctx.connectionService.getClient();
      const workspaceDir = ctx.workspaceRoot();
      const { data: sessions } = await client.session.list({ directory: workspaceDir });
      if (!sessions || sessions.length === 0) {
        await bot.sendMessage(chatId, '💬 No active session found.');
        return;
      }
      const sessionId = sessions[sessions.length - 1].id;
      const { data: messages } = await client.session.messages(
        { sessionID: sessionId, directory: workspaceDir, limit: 50 },
        { throwOnError: true },
      );

      const history = (messages ?? []).map((m: any) => ({
        role: m.info?.role ?? 'unknown',
        content: (m.parts ?? []).filter((p: any) => p.type === 'text').map((p: any) => p.text).join('\n'),
        reasoning: (m.parts ?? []).filter((p: any) => p.type === 'reasoning').map((p: any) => p.text).join('\n'),
        timestamp: m.info?.time?.created
          ? new Date(m.info.time.created).toLocaleTimeString()
          : '',
      }));

      const html = HtmlRenderer.renderConversation(history);
      const tmpPath = require('os').tmpdir() + '/conversation.html';
      fs.writeFileSync(tmpPath, html, 'utf8');
      await bot.sendDocument(chatId, tmpPath, { caption: '💬 Conversation' });
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      await bot.sendMessage(chatId, `❌ Error: ${err.slice(0, 200)}`);
    }
  });

  registry.register('changes', async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    const cwd = ctx.workspaceRoot();
    if (!cwd) {
      await bot.sendMessage(chatId, '❌ No workspace folder open.');
      return;
    }
    try {
      const { stdout } = await execPromise('git status --porcelain', { cwd });
      const lines = stdout.split('\n').filter(Boolean);
      const modified = lines
        .filter(l => l[0] !== '?' && l[1] !== '?' && l[0] !== '!' && l[1] !== '!')
        .map(l => l.substring(3).trim());

      if (modified.length === 0) {
        await bot.sendMessage(chatId, '✅ No modified tracked files.');
        return;
      }

      const inline_keyboard = modified.map((path, i) => ([{
        text: `📄 ${path}`,
        callback_data: `diff_${i}`,
      }]));

      changesPathCache.set(chatId, modified);

      await bot.sendMessage(chatId, '📂 Modified files — tap to view diff:', {
        reply_markup: { inline_keyboard },
      });
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      await bot.sendMessage(chatId, `❌ git status failed:\n\`${err.slice(0, 300)}\``, { parse_mode: 'Markdown' });
    }
  });

  registry.register('diff', async (bot: TelegramBot, msg: TelegramBot.Message, args: string[]) => {
    const chatId = msg.chat.id;
    const arg = args[0] ?? '';

    let filePath: string;
    const index = parseInt(arg, 10);
    if (!isNaN(index)) {
      const cached = changesPathCache.get(chatId);
      filePath = cached?.[index] ?? '';
    } else {
      filePath = args.join(' ');
    }

    if (!filePath) {
      await bot.sendMessage(chatId, '❌ Could not resolve file path. Run /changes first.');
      return;
    }

    const cwd = ctx.workspaceRoot();
    if (!cwd) {
      await bot.sendMessage(chatId, '❌ No workspace folder open.');
      return;
    }

    const sentMsg = await bot.sendMessage(chatId, `⏳ Fetching diff for ${filePath}...`);
    try {
      let oldContent = '';
      try {
        const { stdout } = await execPromise(`git show HEAD:"${filePath}"`, { cwd });
        oldContent = stdout;
      } catch {
        oldContent = '';
      }
      const absPath = `${cwd}/${filePath}`;
      const newContent = fs.existsSync(absPath) ? fs.readFileSync(absPath, 'utf8') : '';

      const unifiedDiff = createTwoFilesPatch(
        `a/${filePath}`, `b/${filePath}`,
        oldContent, newContent,
        '', '', { context: 3 },
      );

      const html = HtmlRenderer.renderDiff(filePath, unifiedDiff);
      const tmpPath = require('os').tmpdir() + '/diff.html';
      fs.writeFileSync(tmpPath, html, 'utf8');
      await bot.sendDocument(chatId, tmpPath, { caption: `Diff: ${filePath}` });
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      await bot.editMessageText(`❌ Error: ${err.slice(0, 200)}`, {
        chat_id: chatId,
        message_id: sentMsg.message_id,
      });
    }
  });

};
