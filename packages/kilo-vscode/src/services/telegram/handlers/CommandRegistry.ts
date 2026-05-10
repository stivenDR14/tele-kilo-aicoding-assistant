import TelegramBot from 'node-telegram-bot-api';

/**
 * CommandRegistry: Manages registration and routing of Telegram commands.
 */
export class CommandRegistry {
  private handlers = new Map<string, (bot: TelegramBot, msg: TelegramBot.Message, args: string[]) => Promise<void>>();

  register(command: string, handler: (bot: TelegramBot, msg: TelegramBot.Message, args: string[]) => Promise<void>) {
    this.handlers.set(command, handler);
  }

  async execute(command: string, bot: TelegramBot, msg: TelegramBot.Message, args: string[]) {
    const handler = this.handlers.get(command);
    if (handler) {
      await handler(bot, msg, args);
    } else {
      // Fallback: show help menu for unknown commands
      const helpHandler = this.handlers.get('help');
      if (helpHandler) {
        await helpHandler(bot, msg, []);
      } else {
        await bot.sendMessage(msg.chat.id, `Unknown command: /${command}`);
      }
    }
  }

  getCommands() {
    return Array.from(this.handlers.keys());
  }
}
