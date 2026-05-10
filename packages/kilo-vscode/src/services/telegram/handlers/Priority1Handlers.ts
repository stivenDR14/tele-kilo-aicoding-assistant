import TelegramBot from 'node-telegram-bot-api';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export const registerPriority1Handlers = (registry: any) => {
  registry.register('git-status', async (bot: TelegramBot, msg: TelegramBot.Message) => {
    try {
      const { stdout } = await execPromise('git status --porcelain');
      const lines = stdout.split('\n').filter(Boolean);
      const formatted = lines.map(line => {
        const code = line.substring(0, 2);
        const path = line.substring(3);
        if (code.includes('M')) return `📁 ${path}`;
        if (code.includes('A')) return `✅ ${path}`;
        if (code.includes('??')) return `❌ ${path}`;
        return `🔒 ${path}`;
      }).join('\n');
      
      await bot.sendMessage(msg.chat.id, formatted || 'Working directory clean.');
    } catch (e) {
      await bot.sendMessage(msg.chat.id, 'Error checking git status.');
    }
  });

  registry.register('chat', async (bot: TelegramBot, msg: TelegramBot.Message, args: string[]) => {
    const prompt = args.join(' ');
    if (!prompt) {
      await bot.sendMessage(msg.chat.id, 'Usage: /chat <prompt>');
      return;
    }
    await bot.sendMessage(msg.chat.id, `Processing: ${prompt}...`);
    // Placeholder for Kilo backend interaction
  });
};
