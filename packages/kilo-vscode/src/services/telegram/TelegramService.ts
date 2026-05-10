import TelegramBot from 'node-telegram-bot-api';
import { CommandRegistry } from './handlers/CommandRegistry';
import { PendingApprovalManager } from './PendingApprovalManager';
import { registerCoreHandlers } from './handlers/CoreHandlers';
import { registerSessionHandlers } from './handlers/SessionHandlers';
import { registerWorkspaceHandlers } from './handlers/WorkspaceHandlers';
import { registerRemoteHandlers } from './handlers/RemoteHandlers';
import type { KiloConnectionService } from '../cli-backend/connection-service';

const MENU_COMMANDS = [
  { cmd: 'gitstatus',       label: '📁 Git Status',       group: 'Core' },
  { cmd: 'chat',            label: '💬 Chat',             group: 'Core' },
  { cmd: 'seeconversation', label: '📖 See Conversation', group: 'Session' },
  { cmd: 'changes',         label: '🔍 Changes',          group: 'Session' },
  { cmd: 'listfiletree',    label: '🌲 File Tree',        group: 'Workspace' },
  { cmd: 'command',         label: '🖥️ Run Command',      group: 'Remote' },
];

export interface TelegramHandlerContext {
  connectionService: KiloConnectionService;
  workspaceRoot: () => string;
  onEvent: (listener: (event: any) => void) => () => void;
}

/**
 * TelegramService: Manages bot lifecycle, whitelist enforcement, and handler registration.
 */
export class TelegramService {
  private bot: TelegramBot | null = null;
  private allowedChatIds: number[] = [];
  private registry = new CommandRegistry();
  readonly pendingApprovals = new PendingApprovalManager();
  private unsubscribeEvents: (() => void) | null = null;
  private ctx: TelegramHandlerContext | null = null;
  private questionOptionsCache = new Map<string, string[]>(); // requestId → ordered labels
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private forwardedQuestionIds = new Set<string>();
  private forwardedPermissionIds = new Set<string>();
  private pendingCustomAnswer: Map<number, string> = new Map(); // chatId → requestId awaiting free-text

  private getStoredCtx(): TelegramHandlerContext | null {
    return this.ctx;
  }

  constructor() {
    this.setupHelpHandler();
  }

  setContext(ctx: TelegramHandlerContext) {
    this.ctx = ctx;
    registerCoreHandlers(this.registry, ctx);
    registerSessionHandlers(this.registry, ctx, this);
    registerWorkspaceHandlers(this.registry, ctx);
    registerRemoteHandlers(this.registry, ctx, this);

    console.log('[Telegram] setContext: registering SSE event listener');
    this.unsubscribeEvents = ctx.onEvent(async (event: any) => {
      if (!this.bot || this.allowedChatIds.length === 0) {
        console.log(`[Telegram] SSE event ${event?.type} ignored — bot=${!!this.bot}, chatIds=${this.allowedChatIds.length}`);
        return;
      }
      const chatId = this.allowedChatIds[0];
      if (event.type === 'question.asked') {
        console.log('[Telegram] SSE: question.asked received, id=', event.properties?.id);
        const id = event.properties?.id;
        if (id && !this.forwardedQuestionIds.has(id)) {
          this.forwardedQuestionIds.add(id);
          await this.handleQuestionAsked(event.properties, chatId, ctx);
        }
      } else if (event.type === 'permission.asked') {
        console.log('[Telegram] SSE: permission.asked received, id=', event.properties?.id);
        const id = event.properties?.id;
        if (id && !this.forwardedPermissionIds.has(id)) {
          this.forwardedPermissionIds.add(id);
          await this.handlePermissionAsked(event.properties, chatId, ctx);
        }
      }
    });

    if (this.bot) {
      this.startPolling();
    }
  }

  private async handleQuestionAsked(props: any, chatId: number, _ctx: TelegramHandlerContext) {
    if (!this.bot) return;
    const requestId: string = props.id ?? '';
    const questions: any[] = props.questions ?? [];

    for (const q of questions) {
      const text: string = q.question ?? q.text ?? 'Agent is asking a question';
      const header: string = q.header ?? '';
      const options: any[] = q.options ?? [];
      try {
        if (options.length > 0) {
          // Cache labels by index so callback_data stays well under 64 bytes
          this.questionOptionsCache.set(requestId, options.map((o: any) => o.label ?? String(o)));

          // Plain text — model-generated content can contain any MarkdownV2 special chars
          const descLines = options.map((opt: any, i: number) => {
            const label = opt.label ?? String(opt);
            const desc = opt.description ? `\n   ${opt.description}` : '';
            return `${i + 1}. ${label}${desc}`;
          }).join('\n');

          const messageText = header
            ? `❓ ${header}\n${text}\n\n${descLines}`
            : `❓ ${text}\n\n${descLines}`;

          const inline_keyboard: { text: string; callback_data: string }[][] = options.map((opt: any, i: number) => ([{
            text: opt.label ?? String(opt),
            callback_data: `qreply_${requestId}_${i}`,
          }]));

          if (q.custom !== false) {
            inline_keyboard.push([{ text: '✏️ Type your own answer', callback_data: `qreply_${requestId}_custom` }]);
          }

          await this.bot.sendMessage(chatId, messageText, {
            reply_markup: { inline_keyboard },
          });
        } else {
          await this.bot.sendMessage(chatId, `❓ ${text}\n\nReply with: /qanswer <your answer>`);
        }
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        await this.bot.sendMessage(chatId, `❓ Agent is asking a question (display error: ${err.slice(0, 100)})\n\nRun /seeconversation to view it.`).catch(() => {});
      }
    }
  }

  private async handlePermissionAsked(props: any, chatId: number, _ctx: TelegramHandlerContext) {
    if (!this.bot) return;
    const id: string = props.id ?? '';
    const tool: string = props.permission ?? props.toolName ?? 'unknown';
    const patterns: string[] = props.patterns ?? [];
    const patternsText = patterns.length > 0 ? patterns.join(', ') : '(none)';

    const inline_keyboard = [
      [
        { text: '✅ Allow', callback_data: `perm_allow_${id}`.slice(0, 64) },
        { text: '✅ Always Allow', callback_data: `perm_always_${id}`.slice(0, 64) },
      ],
      [
        { text: '❌ Deny', callback_data: `perm_deny_${id}`.slice(0, 64) },
        { text: '❌ Always Deny', callback_data: `perm_alwaysdeny_${id}`.slice(0, 64) },
      ],
    ];

    await this.bot.sendMessage(
      chatId,
      `🔐 *Permission request*\nTool: \`${tool}\`\nPatterns: \`${patternsText}\``,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard } },
    );
  }

  private startPolling() {
    if (this.pollInterval) return;
    console.log('[Telegram] Starting question/permission polling (every 3s)');
    this.pollInterval = setInterval(() => void this.pollPendingItems(), 3000);
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async pollPendingItems() {
    if (!this.bot || this.allowedChatIds.length === 0 || !this.ctx) return;
    const chatId = this.allowedChatIds[0];
    try {
      const client = this.ctx.connectionService.getClient();
      const dir = this.ctx.workspaceRoot();
      if (!client || !dir) return;

      // Poll questions
      const { data: questions } = await client.question.list({ directory: dir });
      for (const q of (questions ?? [])) {
        if (this.forwardedQuestionIds.has(q.id)) continue;
        console.log('[Telegram] Poll: found pending question id=', q.id);
        this.forwardedQuestionIds.add(q.id);
        await this.handleQuestionAsked(q, chatId, this.ctx);
      }

      // Poll permissions
      const { data: permissions } = await client.permission.list({ directory: dir });
      for (const p of (permissions ?? [])) {
        if (this.forwardedPermissionIds.has(p.id)) continue;
        console.log('[Telegram] Poll: found pending permission id=', p.id);
        this.forwardedPermissionIds.add(p.id);
        await this.handlePermissionAsked(p, chatId, this.ctx);
      }
    } catch {
      // Non-fatal — backend may not be connected yet
    }
  }

  private setupHelpHandler() {
    this.registry.register('help', async (bot, msg) => {
      await this.sendMenu(bot, msg.chat.id);
    });
    this.registry.register('start', async (bot, msg) => {
      await this.sendMenu(bot, msg.chat.id);
    });
  }

  private async sendMenu(bot: TelegramBot, chatId: number) {
    const groups = ['Core', 'Session', 'Workspace', 'Remote'];
    const inline_keyboard: { text: string; callback_data: string }[][] = [];
    for (const group of groups) {
      const cmds = MENU_COMMANDS.filter(c => c.group === group);
      for (let i = 0; i < cmds.length; i += 2) {
        const row: { text: string; callback_data: string }[] = [];
        row.push({ text: cmds[i].label, callback_data: `run_${cmds[i].cmd}` });
        if (cmds[i + 1]) {
          row.push({ text: cmds[i + 1].label, callback_data: `run_${cmds[i + 1].cmd}` });
        }
        inline_keyboard.push(row);
      }
    }
    await bot.sendMessage(chatId, '📋 Kilo Code Commands', {
      reply_markup: { inline_keyboard },
    });
  }

  activate(token: string, allowedChatIds: number[]) {
    if (this.bot) return; // already active
    this.allowedChatIds = allowedChatIds;
    this.bot = new TelegramBot(token, { polling: true });
    console.log('[Telegram] Bot activated, chatIds:', allowedChatIds);

    if (this.ctx) {
      this.startPolling();
    }

    this.bot.on('message', (msg) => {
      if (!this.allowedChatIds.includes(msg.chat.id)) {
        console.warn(`Unauthorized access attempt from chat ID: ${msg.chat.id}`);
        return;
      }
      this.handleMessage(msg);
    });

    this.bot.on('callback_query', async (query) => {
      if (!query.message || !this.allowedChatIds.includes(query.message.chat.id)) return;
      await this.bot!.answerCallbackQuery(query.id);
      const data = query.data ?? '';

      if (data.startsWith('run_')) {
        const cmd = data.slice(4);
        await this.registry.execute(cmd, this.bot!, query.message, []);
      } else if (data.startsWith('diff_')) {
        const path = data.slice(5);
        await this.registry.execute('diff', this.bot!, query.message, [path]);
      } else if (data.startsWith('approve_')) {
        const id = data.slice(8);
        if (this.pendingApprovals.approve(id)) {
          await this.bot!.editMessageText('✅ Approved — executing...', {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
          });
        }
      } else if (data.startsWith('reject_')) {
        const id = data.slice(7);
        this.pendingApprovals.reject(id);
        await this.bot!.editMessageText('🚫 Cancelled.', {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
        });
      } else if (data.startsWith('qreply_')) {
        // qreply_<requestId>_<idx|custom> — answer a question (index-based to stay under 64 bytes)
        const withoutPrefix = data.slice('qreply_'.length);
        const lastUnder = withoutPrefix.lastIndexOf('_');
        if (lastUnder !== -1) {
          const requestId = withoutPrefix.slice(0, lastUnder);
          const idxOrCustom = withoutPrefix.slice(lastUnder + 1);

          if (idxOrCustom === 'custom') {
            const chatId = query.message.chat.id;
            this.pendingCustomAnswer.set(chatId, requestId);
            await this.bot!.editMessageText('✏️ Type your answer below:', {
              chat_id: chatId,
              message_id: query.message.message_id,
            });
            await this.bot!.sendMessage(chatId, '✏️ Type your answer:', {
              reply_markup: { force_reply: true, selective: true },
            });
          } else {
            const idx = parseInt(idxOrCustom, 10);
            const labels = this.questionOptionsCache.get(requestId) ?? [];
            const label = labels[idx] ?? idxOrCustom;
            try {
              const client = this.getStoredCtx()?.connectionService.getClient();
              if (client) {
                await client.question.reply(
                  { requestID: requestId, answers: [[label]], directory: '' },
                  { throwOnError: true },
                );
              }
              this.questionOptionsCache.delete(requestId);
              this.forwardedQuestionIds.delete(requestId);
              await this.bot!.editMessageText(`✅ Answered: ${label}`, {
                chat_id: query.message.chat.id,
                message_id: query.message.message_id,
              });
            } catch (e) {
              await this.bot!.answerCallbackQuery(query.id, { text: '❌ Failed to send answer' });
            }
          }
        }
      } else if (data.startsWith('perm_')) {
        // perm_allow_<id>, perm_always_<id>, perm_deny_<id>, perm_alwaysdeny_<id>
        const parts = data.split('_'); // ['perm', action, ...id parts]
        const action = parts[1];
        const permId = parts.slice(2).join('_');
        // Map button actions to the API's reply enum: "once" | "always" | "reject"
        const reply = action === 'always' ? 'always' : action === 'allow' ? 'once' : 'reject';
        const approved = action === 'allow' || action === 'always';
        try {
          const client = this.getStoredCtx()?.connectionService.getClient();
          if (client) {
            await client.permission.reply(
              { requestID: permId, reply, directory: '' },
              { throwOnError: true },
            );
          }
          this.forwardedPermissionIds.delete(permId);
          await this.bot!.editMessageText(approved ? '✅ Allowed.' : '🚫 Denied.', {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
          });
        } catch (e) {
          await this.bot!.answerCallbackQuery(query.id, { text: '❌ Failed to reply' });
        }
      }
    });
  }

  private async handleMessage(msg: TelegramBot.Message) {
    if (!msg.text) return;
    const chatId = msg.chat.id;

    // Check if this is a free-text reply to a pending custom answer
    if (!msg.text.startsWith('/')) {
      const pendingRequestId = this.pendingCustomAnswer.get(chatId);
      if (pendingRequestId) {
        this.pendingCustomAnswer.delete(chatId);
        await this.submitCustomAnswer(pendingRequestId, msg.text, chatId);
      }
      return;
    }

    // Strip bot username suffix (e.g. /gitstatus@MyBot → gitstatus)
    const parts = msg.text.slice(1).split(' ');
    const command = parts[0].split('@')[0];
    const args = parts.slice(1);

    // Handle /qanswer explicitly
    if (command === 'qanswer') {
      const answer = args.join(' ');
      const pendingRequestId = this.pendingCustomAnswer.get(chatId);
      if (!pendingRequestId) {
        await this.bot?.sendMessage(chatId, '❌ No pending question to answer.');
        return;
      }
      if (!answer) {
        await this.bot?.sendMessage(chatId, 'Usage: /qanswer <your answer>');
        return;
      }
      this.pendingCustomAnswer.delete(chatId);
      await this.submitCustomAnswer(pendingRequestId, answer, chatId);
      return;
    }

    if (this.bot) {
      await this.registry.execute(command, this.bot, msg, args);
    }
  }

  private async submitCustomAnswer(requestId: string, answer: string, chatId: number) {
    try {
      const client = this.getStoredCtx()?.connectionService.getClient();
      if (client) {
        await client.question.reply(
          { requestID: requestId, answers: [[answer]], directory: '' },
          { throwOnError: true },
        );
      }
      this.questionOptionsCache.delete(requestId);
      this.forwardedQuestionIds.delete(requestId);
      await this.bot?.sendMessage(chatId, `✅ Answered: ${answer}`);
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      await this.bot?.sendMessage(chatId, `❌ Failed to send answer: ${err.slice(0, 100)}`);
    }
  }

  async dispose() {
    this.stopPolling();
    this.unsubscribeEvents?.();
    this.unsubscribeEvents = null;
    this.pendingApprovals.dispose();
    this.forwardedQuestionIds.clear();
    this.forwardedPermissionIds.clear();
    if (this.bot) {
      await this.bot.stopPolling();
      this.bot = null;
    }
  }
}
