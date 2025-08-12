import type { Bot } from 'grammy';
import type { MyContext } from '../types.js';
import { debugLog } from '../config.js';
import { startCommand } from './start.js';
import { helpCommand } from './help.js';
import { statusCommand } from './status.js';
import { foldersCommand } from './folders.js';

export function setupCommands(bot: Bot<MyContext>) {
  bot.command('start', startCommand);
  bot.command('help', helpCommand);
  bot.command('status', statusCommand);
  bot.command('folders', foldersCommand);
}