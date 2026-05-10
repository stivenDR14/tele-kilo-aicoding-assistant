import TelegramBot from 'node-telegram-bot-api';
import { exec } from 'child_process';
import util from 'util';
import * as fs from 'fs';
import { HtmlRenderer } from '../HtmlRenderer';
import type { TelegramHandlerContext } from '../TelegramService';

const execPromise = util.promisify(exec);

export const registerWorkspaceHandlers = (registry: any, ctx: TelegramHandlerContext) => {
  registry.register('listcontextfiles', async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    try {
      const client = ctx.connectionService.getClient();
      const workspaceDir = ctx.workspaceRoot();
      const { data: sessions } = await client.session.list({ directory: workspaceDir });
      if (!sessions || sessions.length === 0) {
        await bot.sendMessage(chatId, '📂 No active session — no context files.');
        return;
      }
      const sessionId = sessions[sessions.length - 1].id;
      const { data: messages } = await client.session.messages(
        { sessionID: sessionId, directory: workspaceDir, limit: 10 },
        { throwOnError: true },
      );
      const files = new Set<string>();
      for (const m of (messages ?? [])) {
        for (const part of ((m.parts ?? []) as any[])) {
          if (part.type === 'tool-result' && part.tool === 'read_file' && part.path) {
            files.add(part.path);
          }
          if (part.type === 'file' && part.path) {
            files.add(part.path);
          }
        }
      }
      if (files.size === 0) {
        await bot.sendMessage(chatId, '📂 No context files found in recent session messages.');
      } else {
        await bot.sendMessage(chatId, `📂 Context files:\n${[...files].map(f => `• \`${f}\``).join('\n')}`, {
          parse_mode: 'Markdown',
        });
      }
    } catch (e) {
      await bot.sendMessage(chatId, '📂 Could not retrieve context files.');
    }
  });

  registry.register('searchfiles', async (bot: TelegramBot, msg: TelegramBot.Message, args: string[]) => {
    const chatId = msg.chat.id;
    const query = args.join(' ');
    if (!query) {
      await bot.sendMessage(chatId, 'Usage: /searchfiles <query>');
      return;
    }
    const cwd = ctx.workspaceRoot();
    try {
      const { stdout } = await execPromise(
        `grep -rl "${query.replace(/"/g, '\\"')}" . --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" --include="*.json" --include="*.md" 2>/dev/null | head -20`,
        { cwd: cwd || undefined },
      );
      const files = stdout.split('\n').filter(Boolean);
      if (files.length === 0) {
        await bot.sendMessage(chatId, `🔎 No files found matching: \`${query}\``, { parse_mode: 'Markdown' });
      } else {
        const list = files.map(f => `• \`${f}\``).join('\n');
        await bot.sendMessage(chatId, `🔎 Files matching \`${query}\`:\n${list}`, { parse_mode: 'Markdown' });
      }
    } catch (e) {
      await bot.sendMessage(chatId, `🔎 No matches for \`${query}\`.`, { parse_mode: 'Markdown' });
    }
  });

  registry.register('listfiletree', async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    const cwd = ctx.workspaceRoot();
    try {
      const { stdout } = await execPromise(
        `find . -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/.next/*" -not -path "*/.vscode/*" -not -path "*/build/*" -not -path "*/__pycache__/*" | sort | head -2000`,
        { cwd: cwd || undefined, maxBuffer: 1024 * 1024 },
      );
      const lines = stdout.split('\n').filter(Boolean);
      const html = HtmlRenderer.renderTree(lines);
      const tmpPath = require('os').tmpdir() + '/filetree.html';
      fs.writeFileSync(tmpPath, html, 'utf8');
      await bot.sendDocument(chatId, tmpPath, { caption: '🌲 File tree — open to browse folders' });
    } catch (e) {
      await bot.sendMessage(chatId, '❌ Error generating file tree.');
    }
  });
};
