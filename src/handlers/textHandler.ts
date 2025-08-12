import type { Bot } from 'grammy';
import type { MyContext } from '../types.js';
import { InlineKeyboard } from 'grammy';
import { DriveService } from '../services/driveService.js';

export function setupTextHandler(bot: Bot<MyContext>) {
  // Handle text messages for folder creation
  bot.on('message:text', handleTextMessage);
}

async function handleTextMessage(ctx: MyContext) {
  console.log('📝 Text message received:', ctx.message?.text);
  console.log('📝 Session pending folder creation:', !!ctx.session.pendingFolderCreation);
  
  // Skip if user is not in folder creation mode
  if (!ctx.session.pendingFolderCreation) {
    console.log('📝 Skipping - not in folder creation mode');
    return;
  }

  const folderName = ctx.message?.text?.trim();
  console.log('📝 Folder name:', folderName);
  
  if (!folderName) {
    console.log('📝 Skipping - no folder name');
    return;
  }
  
  // Validate folder name
  if (!isValidFolderName(folderName)) {
    const keyboard = new InlineKeyboard()
      .text('❌ Cancel', 'cancel_folder_creation');

    await ctx.reply(
      '❌ **Invalid Folder Name**\n\n' +
      'Folder names must:\n' +
      '• Be 1-255 characters long\n' +
      '• Not contain: `/ \\ ? * : | " < >`\n\n' +
      'Please try again with a valid name:',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      }
    );
    return;
  }

  const { user } = ctx.session;
  
  if (!user.googleTokens) {
    delete ctx.session.pendingFolderCreation;
    await ctx.reply('❌ Google Drive not connected. Please reconnect and try again.');
    return;
  }

  try {
    const driveService = new DriveService(
      user.googleTokens,
      async (refreshedTokens) => {
        ctx.session.user.googleTokens = refreshedTokens;
      }
    );

    // Create the folder
    const parentFolderId = ctx.session.pendingFolderCreation.parentFolderId;
    const parentFolderName = ctx.session.pendingFolderCreation.parentFolderName || 'My Drive';
    
    const newFolder = await driveService.createFolder(folderName, parentFolderId);

    // Clear pending state
    delete ctx.session.pendingFolderCreation;

    // Success message with options
    const keyboard = new InlineKeyboard()
      .text('📁 Open Folder', `folder_${newFolder.id}`)
      .row()
      .text('📁 Browse Folders', 'browse_folders')
      .text('🏠 Set as Default', `set_default_${newFolder.id}`);

    const locationText = parentFolderName === 'My Drive' ? 'root directory' : `"${parentFolderName}" folder`;

    await ctx.reply(
      `✅ **Folder Created Successfully!**\n\n` +
      `📁 **${folderName}**\n` +
      `📍 Location: ${locationText}\n\n` +
      `Your new folder is now available in your Google Drive.`,
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      }
    );

  } catch (error: any) {
    console.error('Folder creation error:', error);
    delete ctx.session.pendingFolderCreation;
    
    const keyboard = new InlineKeyboard()
      .text('🔄 Try Again', 'create_folder')
      .text('📁 Browse Folders', 'browse_folders');

    let errorMessage = 'Failed to create folder. Please try again.';
    
    if (error.message?.includes('already exists')) {
      errorMessage = `A folder named "${folderName}" already exists in this location. Please choose a different name.`;
    } else if (error.message?.includes('quota')) {
      errorMessage = 'Storage quota exceeded. Please free up space in your Google Drive.';
    } else if (error.message?.includes('permission')) {
      errorMessage = 'Permission denied. Please check your Google Drive connection.';
    }

    await ctx.reply(
      `❌ **Folder Creation Failed**\n\n${errorMessage}`,
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      }
    );
  }
}

function isValidFolderName(name: string): boolean {
  // Check length
  if (name.length === 0 || name.length > 255) {
    return false;
  }

  // Check for invalid characters
  const invalidChars = /[\/\\?*:|"<>]/;
  if (invalidChars.test(name)) {
    return false;
  }

  // Check for reserved names
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  if (reservedNames.includes(name.toUpperCase())) {
    return false;
  }

  return true;
}