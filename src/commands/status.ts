import type { MyContext } from '../types.js';
import { InlineKeyboard } from 'grammy';
import { DriveService } from '../services/driveService.js';

export async function statusCommand(ctx: MyContext) {
  const { user } = ctx.session;
  
  if (!user.googleTokens) {
    const keyboard = new InlineKeyboard()
      .text('🔗 Connect Google Drive', 'connect_gdrive');

    await ctx.reply(
      '❌ **Google Drive Not Connected**\n\n' +
      'You need to connect your Google Drive account first to upload files.\n\n' +
      'Click the button below to start the authentication process.',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      }
    );
    return;
  }

  try {
    const driveService = new DriveService(
      user.googleTokens,
      async (refreshedTokens) => {
        // Update tokens in session
        ctx.session.user.googleTokens = refreshedTokens;
      }
    );
    const userInfo = await driveService.getUserInfo();
    const storageInfo = await driveService.getStorageInfo();

    const statusMessage = `
✅ **Google Drive Connected**

**Account:** ${userInfo.displayName}
**Email:** ${userInfo.emailAddress}

**Storage:**
• Used: ${formatBytes(storageInfo.usage)}
• Total: ${formatBytes(storageInfo.limit)}
• Available: ${formatBytes(storageInfo.limit - storageInfo.usage)}

**Settings:**
• Default Folder: ${user.defaultFolderId ? '📁 Custom' : '📁 Root (My Drive)'}
• Favorite Folders: ${user.favoriteFolders?.length || 0}

Last updated: ${new Date().toLocaleString()}
    `.trim();

    const keyboard = new InlineKeyboard()
      .text('📁 Manage Folders', 'browse_folders')
      .row()
      .text('🔄 Refresh Status', 'refresh_status')
      .text('🔌 Disconnect', 'disconnect_gdrive');

    await ctx.reply(statusMessage, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

  } catch (error) {
    console.error('Error checking status:', error);
    
    const keyboard = new InlineKeyboard()
      .text('🔗 Reconnect Google Drive', 'connect_gdrive');

    await ctx.reply(
      '⚠️ **Connection Error**\n\n' +
      'Unable to verify your Google Drive connection. ' +
      'Your authentication may have expired.\n\n' +
      'Please reconnect your account.',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      }
    );
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}