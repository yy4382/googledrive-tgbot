import type { MyContext } from '../types.js';
import { InlineKeyboard } from 'grammy';
import { debugLog } from '../config.js';

export async function startCommand(ctx: MyContext) {
  const keyboard = new InlineKeyboard()
    .text('🔗 Connect Google Drive', 'connect_gdrive')
    .row()
    .text('📁 Browse Folders', 'browse_folders')
    .text('ℹ️ Help', 'help');

  const welcomeMessage = `
🤖 **Welcome to Google Drive Telegram Bot!**

This bot helps you upload files directly to your Google Drive account.

**Features:**
• Upload any file type to Google Drive
• Browse and select destination folders  
• Manage favorite folders for quick access
• View upload progress and confirmations

**Getting Started:**
1. Connect your Google Drive account
2. Send any file to upload it
3. Select destination folder
4. Done! Your file is in Google Drive

Click "Connect Google Drive" below to get started!
  `.trim();

  try {
    await ctx.reply(welcomeMessage, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });
    
  } catch (error: any) {
    console.error('startCommand: Failed to send welcome message:', error);
    
    // Try fallback without Markdown
    try {
      const plainWelcome = welcomeMessage.replace(/\*\*(.*?)\*\*/g, '$1');
      await ctx.reply(plainWelcome, { reply_markup: keyboard });
    } catch (fallbackError) {
      // Last resort: simple message
      await ctx.reply('🤖 Welcome to Google Drive Telegram Bot! Send any file to upload to your drive.');
    }
  }
}