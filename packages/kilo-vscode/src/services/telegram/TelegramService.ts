import TelegramBot from 'node-telegram-bot-api';
import { CommandRegistry } from './handlers/CommandRegistry';
import { registerPriority1Handlers } from './handlers/Priority1Handlers';

/**
 * TelegramService: Manages bot lifecycle, whitelist enforcement, and handler registration.
 */
export class TelegramService {
  private bot: TelegramBot | null = null;
  private allowedChatIds: number[] = [];
  private registry = new CommandRegistry();

  constructor() {
    this.setupDefaultHandlers();
    registerPriority1Handlers(this.registry);
  }

  private setupDefaultHandlers() {
    this.registry.register('help', async (bot, msg) => {
      await bot.sendMessage(msg.chat.id, `Available commands: /${this.registry.getCommands().join(', /')}`);
    });
  }

  activate(token: string, allowedChatIds: number[]) {
    this.allowedChatIds = allowedChatIds;
    this.bot = new TelegramBot(token, { polling: true });

    this.bot.on('message', (msg) => {
      if (!this.allowedChatIds.includes(msg.chat.id)) {
        console.warn(`Unauthorized access attempt from chat ID: ${msg.chat.id}`);
        return;
      }
      this.handleMessage(msg);
    });
  }

  private async handleMessage(msg: TelegramBot.Message) {
    if (!msg.text || !msg.text.startsWith('/')) return;

    const parts = msg.text.slice(1).split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    if (this.bot) {
      await this.registry.execute(command, this.bot, msg, args);
    }
  }

  async dispose() {
    if (this.bot) {
      await this.bot.stopPolling();
      this.bot = null;
    }
  }
}
