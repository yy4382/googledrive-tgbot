import type { MyContext } from '../types.js';
import { InlineKeyboard } from 'grammy';
import { DriveService } from '../services/driveService.js';

export async function foldersCommand(ctx: MyContext) {
  const { user } = ctx.session;
  
  if (!user.googleTokens) {
    const keyboard = new InlineKeyboard()
      .text('🔗 Connect Google Drive', 'connect_gdrive');

    await ctx.reply(
      '❌ **Google Drive Not Connected**\n\n' +
      'Connect your Google Drive account first to browse folders.',
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
    const folders = await driveService.listFolders();
    
    if (folders.length === 0) {
      const keyboard = new InlineKeyboard()
        .text('📁 Create First Folder', 'create_folder')
        .row()
        .text('🔄 Refresh', 'browse_folders');

      await ctx.reply(
        '📁 **No Folders Found**\n\n' +
        'You don\'t have any folders in your Google Drive yet.\n' +
        'Create your first folder or upload files will go to the root directory.',
        {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        }
      );
      return;
    }

    const keyboard = new InlineKeyboard();
    
    // Add favorite folders first if any
    if (user.favoriteFolders && user.favoriteFolders.length > 0) {
      keyboard.text('⭐ Favorites', 'show_favorites').row();
    }
    
    // Add first few folders
    const displayFolders = folders.slice(0, 8);
    for (const folder of displayFolders) {
      const emoji = folder.id === user.defaultFolderId ? '🏠' : '📁';
      keyboard.text(`${emoji} ${folder.name}`, `folder_${folder.id}`).row();
    }
    
    // Navigation controls
    if (folders.length > 8) {
      keyboard.text('📄 Show All', 'show_all_folders').row();
    }
    
    keyboard
      .text('🆕 Create Folder', 'create_folder')
      .text('⚙️ Settings', 'folder_settings');

    const message = `
📁 **Your Google Drive Folders**

${user.defaultFolderId ? 
  `🏠 Default: ${folders.find(f => f.id === user.defaultFolderId)?.name || 'Unknown'}` : 
  '🏠 Default: Root (My Drive)'
}
⭐ Favorites: ${user.favoriteFolders?.length || 0}
📊 Total Folders: ${folders.length}

Select a folder to view its contents or set as default:
    `.trim();

    await ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });

  } catch (error) {
    console.error('Error listing folders:', error);
    await ctx.reply(
      '❌ **Error Loading Folders**\n\n' +
      'Unable to load your Google Drive folders. Please try again or check your connection.',
      { parse_mode: 'Markdown' }
    );
  }
}