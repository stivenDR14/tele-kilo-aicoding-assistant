import TelegramBot from 'node-telegram-bot-api';
import { exec } from 'child_process';
import util from 'util';
import type { TelegramHandlerContext } from '../TelegramService';

const execPromise = util.promisify(exec);

function emojiForCode(c: string): string {
  switch (c) {
    case 'M': return '📝'; // modified
    case 'T': return '🔄'; // type changed
    case 'A': return '✅'; // added
    case 'D': return '🗑️'; // deleted
    case 'R': return '🔀'; // renamed
    case 'C': return '📋'; // copied
    case 'U': return '⚠️'; // updated but unmerged
    default:  return '❓';
  }
}

function formatGitStatusLine(line: string): string {
  const X = line[0];
  const Y = line[1];
  const path = line.substring(3);

  // Untracked
  if (X === '?' && Y === '?') return `❓ ${path}  _(untracked)_`;
  // Ignored
  if (X === '!' && Y === '!') return `🔕 ${path}  _(ignored)_`;

  // Unmerged conflict states (both X and Y convey conflicting sides)
  const unmerged: Record<string, string> = {
    'DD': '💥 both deleted',
    'AU': '⚠️ added by us',
    'UD': '⚠️ deleted by them',
    'UA': '⚠️ added by them',
    'DU': '⚠️ deleted by us',
    'AA': '💥 both added',
    'UU': '💥 both modified',
  };
  const conflictKey = X + Y;
  if (unmerged[conflictKey]) return `${unmerged[conflictKey]}: ${path}`;

  // Normal tracked: X = index status, Y = worktree status
  const parts: string[] = [];
  if (X !== ' ') parts.push(`${emojiForCode(X)} staged`);
  if (Y !== ' ') parts.push(`${emojiForCode(Y)} unstaged`);
  const label = parts.join(' · ') || '✅ clean';
  return `${label}: ${path}`;
}

export const registerCoreHandlers = (registry: any, ctx: TelegramHandlerContext) => {
  registry.register('gitstatus', async (bot: TelegramBot, msg: TelegramBot.Message) => {
    try {
      const cwd = ctx.workspaceRoot();
      const { stdout } = await execPromise('git status --porcelain', { cwd: cwd || undefined });
      const lines = stdout.split('\n').filter(Boolean);
      const formatted = lines.map(formatGitStatusLine).join('\n');
      await bot.sendMessage(msg.chat.id, formatted || 'Working directory clean. ✅');
    } catch (e) {
      await bot.sendMessage(msg.chat.id, '❌ Error checking git status.');
    }
  });

  registry.register('chat', async (bot: TelegramBot, msg: TelegramBot.Message, args: string[]) => {
    const prompt = args.join(' ');
    if (!prompt) {
      await bot.sendMessage(msg.chat.id, 'Usage: /chat <your message>');
      return;
    }

    const sentMsg = await bot.sendMessage(msg.chat.id, '⏳ Agent is thinking...');
    const chatId = msg.chat.id;
    const messageId = sentMsg.message_id;

    try {
      const client = ctx.connectionService.getClient();
      const workspaceDir = ctx.workspaceRoot();

      // Get or create a session
      const { data: sessions } = await client.session.list({ directory: workspaceDir });
      let sessionId: string;
      if (sessions && sessions.length > 0) {
        sessionId = sessions[sessions.length - 1].id;
      } else {
        const { data: newSession } = await client.session.create(
          { directory: workspaceDir },
          { throwOnError: true },
        );
        sessionId = newSession!.id;
      }

      // Snapshot current message count before sending prompt
      const { data: beforeMessages } = await client.session.messages(
        { sessionID: sessionId, directory: workspaceDir, limit: 100 },
      );
      const beforeCount = (beforeMessages ?? []).length;

      // Send the prompt (fire and forget — agent works asynchronously)
      await client.session.promptAsync({
        sessionID: sessionId,
        directory: workspaceDir,
        parts: [{ type: 'text', text: prompt }],
      });

      // Poll every 4s for up to 3 minutes waiting for a new assistant text response
      const pollIntervalMs = 4000;
      const maxWaitMs = 3 * 60 * 1000;
      const deadline = Date.now() + maxWaitMs;
      let finalText = '';

      while (Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        const { data: current } = await client.session.messages(
          { sessionID: sessionId, directory: workspaceDir, limit: 100 },
        );
        const currentMessages = current ?? [];
        if (currentMessages.length <= beforeCount) continue;

        // Find the last assistant message added after we sent the prompt
        const newMessages = currentMessages.slice(beforeCount);
        const lastAssistant = [...newMessages].reverse().find((m: any) => m.info?.role === 'assistant');
        if (!lastAssistant) continue;

        const text = (lastAssistant.parts ?? [])
          .filter((p: any) => p.type === 'text')
          .map((p: any) => p.text)
          .join('\n')
          .trim();
        if (!text) continue;

        finalText = text;
        break;
      }

      if (!finalText) {
        // Agent still working or timed out — leave the thinking message but add a note
        await bot.editMessageText('⏳ Agent is still working... use /seeconversation to check progress.', {
          chat_id: chatId,
          message_id: messageId,
        });
        return;
      }

      await bot.editMessageText(finalText.slice(0, 4096), {
        chat_id: chatId,
        message_id: messageId,
      });
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      await bot.editMessageText(`❌ Error: ${err.slice(0, 200)}`, {
        chat_id: chatId,
        message_id: messageId,
      });
    }
  });
};
