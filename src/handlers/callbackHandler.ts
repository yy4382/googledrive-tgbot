import type { Bot } from 'grammy';
import type { MyContext } from '../types.js';
import { InlineKeyboard } from 'grammy';
import { AuthService } from '../services/authService.js';
import { DriveService } from '../services/driveService.js';
import { db } from '../services/databaseService.js';
import { performUpload } from './fileHandler.js';
import { uploadCache } from '../services/uploadCache.js';

export function setupCallbackHandler(bot: Bot<MyContext>) {
  // Authentication callbacks
  bot.callbackQuery('connect_gdrive', handleConnectGDrive);
  bot.callbackQuery('cancel_auth', handleCancelAuth);
  bot.callbackQuery('check_auth_status', handleCheckAuthStatus);
  bot.callbackQuery('disconnect_gdrive', handleDisconnectGDrive);
  bot.callbackQuery('refresh_status', handleRefreshStatus);
  
  // Folder management callbacks
  bot.callbackQuery('browse_folders', handleBrowseFolders);
  bot.callbackQuery('show_favorites', handleShowFavorites);
  bot.callbackQuery('show_all_folders', handleShowAllFolders);
  bot.callbackQuery('create_folder', handleCreateFolder);
  bot.callbackQuery('folder_settings', handleFolderSettings);
  
  // Upload callbacks
  bot.callbackQuery('upload_to_root', handleUploadToRoot);
  bot.callbackQuery('browse_upload_folders', handleBrowseUploadFolders);
  bot.callbackQuery('cancel_upload', handleCancelUpload);
  bot.callbackQuery('upload_another', handleUploadAnother);
  
  // Dynamic folder callbacks
  bot.callbackQuery(/^folder_(.+)$/, handleFolderAction);
  bot.callbackQuery(/^upload_to_(.+)$/, handleUploadToFolder);
  bot.callbackQuery(/^set_default_(.+)$/, handleSetDefaultFolder);
  bot.callbackQuery(/^add_favorite_(.+)$/, handleAddFavorite);
  bot.callbackQuery(/^remove_favorite_(.+)$/, handleRemoveFavorite);
  
  // Help callback
  bot.callbackQuery('help', handleHelp);
}

async function handleConnectGDrive(ctx: MyContext) {
  try {
    const authService = new AuthService();
    const deviceCodeResponse = await authService.requestDeviceCode();
    
    // Store device flow data in session
    const expiresAt = Date.now() + (deviceCodeResponse.expires_in * 1000);
    ctx.session.user.deviceFlowData = {
      device_code: deviceCodeResponse.device_code,
      user_code: deviceCodeResponse.user_code,
      verification_url: deviceCodeResponse.verification_url,
      expires_at: expiresAt,
      interval: deviceCodeResponse.interval,
    };
    
    await db.updateUserSession(ctx.session.user.userId, { 
      deviceFlowData: ctx.session.user.deviceFlowData 
    });
    
    const keyboard = new InlineKeyboard()
      .url('🔗 Open Google Device Page', deviceCodeResponse.verification_url)
      .row()
      .text('🔄 Check Status', 'check_auth_status')
      .text('❌ Cancel', 'cancel_auth');

    const expiresInMinutes = Math.floor(deviceCodeResponse.expires_in / 60);

    await ctx.editMessageText(
      '🔐 **Google Drive Device Authorization**\n\n' +
      '**Step 1:** Click "Open Google Device Page" below\n' +
      '**Step 2:** Sign in to your Google account\n' +
      '**Step 3:** Enter this code when prompted:\n\n' +
      `🔢 **${deviceCodeResponse.user_code}**\n\n` +
      '**Step 4:** Grant permissions and return here\n' +
      '**Step 5:** Click "Check Status" or wait - I\'ll detect it automatically!\n\n' +
      `⏰ Code expires in ${expiresInMinutes} minutes\n\n` +
      '✅ **No copy/paste needed - just enter the code above on Google\'s page!**',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      }
    );

    // Start automatic polling
    startDeviceFlowPolling(ctx, deviceCodeResponse.device_code, deviceCodeResponse.interval);
    
  } catch (error: any) {
    console.error('Device code request error:', error);
    await ctx.answerCallbackQuery('❌ Error starting authorization process');
  }
}

async function handleCancelAuth(ctx: MyContext) {
  try {
    // Clear device flow data
    delete ctx.session.user.deviceFlowData;
    await db.updateUserSession(ctx.session.user.userId, { deviceFlowData: undefined });
    
    const keyboard = new InlineKeyboard()
      .text('🔗 Connect Google Drive', 'connect_gdrive')
      .row()
      .text('🏠 Back to Menu', 'start_menu');

    await ctx.editMessageText(
      '❌ **Authorization Cancelled**\n\n' +
      'Google Drive authorization has been cancelled. You can try again anytime.',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      }
    );
    
    await ctx.answerCallbackQuery('Authorization cancelled');
  } catch (error) {
    await ctx.answerCallbackQuery('❌ Error cancelling authorization');
  }
}

async function handleDisconnectGDrive(ctx: MyContext) {
  try {
    const { user } = ctx.session;
    
    if (user.googleTokens) {
      const authService = new AuthService();
      await authService.revokeTokens(user.googleTokens);
      
      // Clear tokens from session and database
      delete user.googleTokens;
      await db.updateUserSession(user.userId, { googleTokens: undefined });
    }
    
    const keyboard = new InlineKeyboard()
      .text('🔗 Reconnect Google Drive', 'connect_gdrive')
      .row()
      .text('🏠 Back to Menu', 'start_menu');

    await ctx.editMessageText(
      '✅ **Google Drive Disconnected**\n\n' +
      'Your Google Drive account has been disconnected and all stored credentials have been removed.\n\n' +
      'You can reconnect anytime to continue using the bot.',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      }
    );
    
    await ctx.answerCallbackQuery('Google Drive disconnected');
  } catch (error) {
    await ctx.answerCallbackQuery('❌ Error disconnecting Google Drive');
  }
}

async function handleRefreshStatus(ctx: MyContext) {
  await ctx.answerCallbackQuery('Refreshing status...');
  
  // Import and call status command
  const { statusCommand } = await import('../commands/status.js');
  await statusCommand(ctx);
}

async function handleBrowseFolders(ctx: MyContext) {
  const { foldersCommand } = await import('../commands/folders.js');
  await foldersCommand(ctx);
  await ctx.answerCallbackQuery();
}

async function handleShowFavorites(ctx: MyContext) {
  const { user } = ctx.session;
  
  if (!user.favoriteFolders || user.favoriteFolders.length === 0) {
    await ctx.answerCallbackQuery('No favorite folders found');
    return;
  }
  
  const keyboard = new InlineKeyboard();
  
  for (const favorite of user.favoriteFolders) {
    keyboard.text(`⭐ ${favorite.name}`, `folder_${favorite.id}`).row();
  }
  
  keyboard.text('🔙 Back to Folders', 'browse_folders');
  
  await ctx.editMessageText(
    `⭐ **Favorite Folders**\n\nYou have ${user.favoriteFolders.length} favorite folders:`,
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    }
  );
  
  await ctx.answerCallbackQuery();
}

async function handleShowAllFolders(ctx: MyContext) {
  const { user } = ctx.session;
  
  if (!user.googleTokens) {
    await ctx.answerCallbackQuery('❌ Google Drive not connected');
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
    
    const keyboard = new InlineKeyboard();
    
    for (const folder of folders.slice(0, 20)) { // Show up to 20 folders
      const emoji = folder.id === user.defaultFolderId ? '🏠' : '📁';
      keyboard.text(`${emoji} ${folder.name}`, `folder_${folder.id}`).row();
    }
    
    if (folders.length > 20) {
      keyboard.text(`... and ${folders.length - 20} more`, 'folders_pagination').row();
    }
    
    keyboard.text('🔙 Back to Folders', 'browse_folders');
    
    await ctx.editMessageText(
      `📁 **All Folders (${folders.length} total)**\n\nSelect a folder to manage:`,
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      }
    );
    
    await ctx.answerCallbackQuery();
  } catch (error) {
    await ctx.answerCallbackQuery('❌ Error loading folders');
  }
}

async function handleFolderAction(ctx: MyContext) {
  const match = ctx.callbackQuery?.data?.match(/^folder_(.+)$/);
  if (!match) return;
  
  const folderId = match[1];
  const { user } = ctx.session;
  
  if (!user.googleTokens) {
    await ctx.answerCallbackQuery('❌ Google Drive not connected');
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
    const folder = folders.find(f => f.id === folderId);
    
    if (!folder) {
      await ctx.answerCallbackQuery('❌ Folder not found');
      return;
    }
    
    const isDefault = user.defaultFolderId === folderId;
    const isFavorite = user.favoriteFolders?.some(f => f.id === folderId);
    
    const keyboard = new InlineKeyboard();
    
    if (!isDefault) {
      keyboard.text('🏠 Set as Default', `set_default_${folderId}`).row();
    }
    
    if (isFavorite) {
      keyboard.text('💔 Remove from Favorites', `remove_favorite_${folderId}`).row();
    } else {
      keyboard.text('⭐ Add to Favorites', `add_favorite_${folderId}`).row();
    }
    
    keyboard
      .text('📁 Browse Contents', `browse_${folderId}`)
      .row()
      .text('🔙 Back to Folders', 'browse_folders');
    
    const status = [];
    if (isDefault) status.push('🏠 Default Folder');
    if (isFavorite) status.push('⭐ Favorite');
    const statusText = status.length > 0 ? `\n${status.join(' • ')}` : '';
    
    await ctx.editMessageText(
      `📁 **${folder.name}**${statusText}\n\nWhat would you like to do with this folder?`,
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      }
    );
    
    await ctx.answerCallbackQuery();
  } catch (error) {
    await ctx.answerCallbackQuery('❌ Error loading folder');
  }
}

async function handleUploadToRoot(ctx: MyContext) {
  try {
    await performUpload(ctx, null, ctx.callbackQuery?.message);
    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error('Upload to root error:', error);
    await ctx.answerCallbackQuery('❌ Upload failed');
  }
}

async function handleUploadToFolder(ctx: MyContext) {
  const match = ctx.callbackQuery?.data?.match(/^upload_to_(.+)$/);
  if (!match) return;
  
  const folderId = match[1];
  await performUpload(ctx, folderId || null, ctx.callbackQuery?.message);
  await ctx.answerCallbackQuery();
}

async function handleSetDefaultFolder(ctx: MyContext) {
  const match = ctx.callbackQuery?.data?.match(/^set_default_(.+)$/);
  if (!match) return;
  
  const folderId = match[1];
  const { user } = ctx.session;
  
  try {
    user.defaultFolderId = folderId || undefined;
    await db.updateUserSession(user.userId, { defaultFolderId: folderId || undefined });
    await ctx.answerCallbackQuery('✅ Default folder updated');
    
    // Refresh the folder view
    await handleFolderAction(ctx);
  } catch (error) {
    await ctx.answerCallbackQuery('❌ Error updating default folder');
  }
}

async function handleAddFavorite(ctx: MyContext) {
  const match = ctx.callbackQuery?.data?.match(/^add_favorite_(.+)$/);
  if (!match) return;
  
  const folderId = match[1];
  const { user } = ctx.session;
  
  if (!user.googleTokens) {
    await ctx.answerCallbackQuery('❌ Google Drive not connected');
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
    const folder = folders.find(f => f.id === folderId);
    
    if (!folder) {
      await ctx.answerCallbackQuery('❌ Folder not found');
      return;
    }
    
    if (!user.favoriteFolders) {
      user.favoriteFolders = [];
    }
    
    if (user.favoriteFolders.some(f => f.id === folderId)) {
      await ctx.answerCallbackQuery('Folder is already in favorites');
      return;
    }
    
    user.favoriteFolders.push({ id: folderId || '', name: folder.name });
    await db.updateUserSession(user.userId, { favoriteFolders: user.favoriteFolders });
    
    await ctx.answerCallbackQuery('⭐ Added to favorites');
    await handleFolderAction(ctx);
  } catch (error) {
    await ctx.answerCallbackQuery('❌ Error adding to favorites');
  }
}

async function handleRemoveFavorite(ctx: MyContext) {
  const match = ctx.callbackQuery?.data?.match(/^remove_favorite_(.+)$/);
  if (!match) return;
  
  const folderId = match[1];
  const { user } = ctx.session;
  
  if (!user.favoriteFolders) {
    await ctx.answerCallbackQuery('No favorites found');
    return;
  }
  
  user.favoriteFolders = user.favoriteFolders.filter(f => f.id !== folderId);
  await db.updateUserSession(user.userId, { favoriteFolders: user.favoriteFolders });
  
  await ctx.answerCallbackQuery('💔 Removed from favorites');
  await handleFolderAction(ctx);
}

async function handleBrowseUploadFolders(ctx: MyContext) {
  const { user } = ctx.session;
  
  if (!user.googleTokens) {
    await ctx.answerCallbackQuery('❌ Google Drive not connected');
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
    
    const keyboard = new InlineKeyboard();
    
    for (const folder of folders.slice(0, 15)) {
      keyboard.text(`📁 ${folder.name}`, `upload_to_${folder.id}`).row();
    }
    
    keyboard
      .text('📁 My Drive (Root)', 'upload_to_root')
      .row()
      .text('❌ Cancel Upload', 'cancel_upload');
    
    await ctx.editMessageText(
      '📁 **Select Upload Destination**\n\nChoose where to upload your file:',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      }
    );
    
    await ctx.answerCallbackQuery();
  } catch (error) {
    await ctx.answerCallbackQuery('❌ Error loading folders');
  }
}

async function handleCancelUpload(ctx: MyContext) {
  uploadCache.delete(ctx.from!.id);
  
  await ctx.editMessageText(
    '❌ **Upload Cancelled**\n\nYour file upload has been cancelled.',
    { parse_mode: 'Markdown' }
  );
  
  await ctx.answerCallbackQuery('Upload cancelled');
}

async function handleUploadAnother(ctx: MyContext) {
  await ctx.editMessageText(
    '📤 **Upload Another File**\n\n' +
    'Send any file (document, photo, video, etc.) to upload it to your Google Drive!',
    { parse_mode: 'Markdown' }
  );
  
  await ctx.answerCallbackQuery();
}

async function handleCreateFolder(ctx: MyContext) {
  await ctx.answerCallbackQuery('💡 To create folders, use the Google Drive web interface for now.');
}

async function handleFolderSettings(ctx: MyContext) {
  await ctx.answerCallbackQuery('⚙️ More folder settings coming soon!');
}

async function handleCheckAuthStatus(ctx: MyContext) {
  const { user } = ctx.session;
  
  if (!user.deviceFlowData) {
    await ctx.answerCallbackQuery('❌ No active authorization process');
    return;
  }
  
  // Check if expired
  if (Date.now() > user.deviceFlowData.expires_at) {
    delete user.deviceFlowData;
    await db.updateUserSession(user.userId, { deviceFlowData: undefined });
    
    const keyboard = new InlineKeyboard()
      .text('🔗 Try Again', 'connect_gdrive');
    
    await ctx.editMessageText(
      '⏰ **Authorization Expired**\n\n' +
      'The authorization code has expired. Please start over.',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      }
    );
    
    await ctx.answerCallbackQuery('Authorization expired');
    return;
  }
  
  // Try polling
  try {
    const authService = new AuthService();
    const tokens = await authService.pollForToken(user.deviceFlowData.device_code);
    
    // Success! Store tokens and complete auth
    await completeDeviceFlowAuth(ctx, tokens);
    
  } catch (error: any) {
    if (error.message === 'AUTHORIZATION_PENDING') {
      await ctx.answerCallbackQuery('⏳ Still waiting for authorization...');
    } else if (error.message === 'EXPIRED_TOKEN') {
      delete user.deviceFlowData;
      await db.updateUserSession(user.userId, { deviceFlowData: undefined });
      
      const keyboard = new InlineKeyboard()
        .text('🔗 Try Again', 'connect_gdrive');
      
      await ctx.editMessageText(
        '⏰ **Authorization Expired**\n\n' +
        'The authorization code has expired. Please start over.',
        {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        }
      );
      
      await ctx.answerCallbackQuery('Authorization expired');
    } else if (error.message === 'ACCESS_DENIED') {
      delete user.deviceFlowData;
      await db.updateUserSession(user.userId, { deviceFlowData: undefined });
      
      const keyboard = new InlineKeyboard()
        .text('🔗 Try Again', 'connect_gdrive');
      
      await ctx.editMessageText(
        '❌ **Authorization Denied**\n\n' +
        'You denied access to Google Drive. Please try again and grant the necessary permissions.',
        {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        }
      );
      
      await ctx.answerCallbackQuery('Access denied');
    } else {
      await ctx.answerCallbackQuery('❌ Error checking status');
    }
  }
}

async function completeDeviceFlowAuth(ctx: MyContext, tokens: any) {
  try {
    // Test the tokens by getting user info
    const driveService = new DriveService(
      tokens,
      async (refreshedTokens) => {
        // Update tokens in session
        ctx.session.user.googleTokens = refreshedTokens;
      }
    );
    const userInfo = await driveService.getUserInfo();
    
    // Store tokens in session and database
    ctx.session.user.googleTokens = tokens;
    delete ctx.session.user.deviceFlowData;
    
    await db.updateUserSession(ctx.session.user.userId, {
      googleTokens: tokens,
      deviceFlowData: undefined,
    });
    
    const keyboard = new InlineKeyboard()
      .text('📁 Browse Folders', 'browse_folders')
      .row()
      .text('ℹ️ Help', 'help');
    
    await ctx.editMessageText(
      `✅ **Google Drive Connected Successfully!**\n\n` +
      `📧 Account: ${userInfo.emailAddress || 'Unknown'}\n` +
      `👤 Name: ${userInfo.displayName || 'Unknown'}\n\n` +
      `🎉 You can now upload files to your Google Drive! Send any file to get started.`,
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      }
    );
    
  } catch (error: any) {
    console.error('Device flow completion error:', error);
    
    // Clear device flow data
    delete ctx.session.user.deviceFlowData;
    await db.updateUserSession(ctx.session.user.userId, { deviceFlowData: undefined });
    
    const keyboard = new InlineKeyboard()
      .text('🔗 Try Again', 'connect_gdrive');
    
    await ctx.editMessageText(
      '❌ **Connection Failed**\n\n' +
      'There was an error connecting to Google Drive. Please try again.',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      }
    );
  }
}

function startDeviceFlowPolling(ctx: MyContext, deviceCode: string, interval: number) {
  const authService = new AuthService();
  
  const poll = async () => {
    try {
      const tokens = await authService.pollForToken(deviceCode);
      
      // Success! Complete the auth flow
      await completeDeviceFlowAuth(ctx, tokens);
      
    } catch (error: any) {
      if (error.message === 'AUTHORIZATION_PENDING') {
        // Continue polling after the interval
        setTimeout(poll, interval * 1000);
      } else if (error.message === 'SLOW_DOWN') {
        // Increase interval and continue polling
        setTimeout(poll, (interval + 5) * 1000);
      } else {
        // Stop polling on other errors (expired, denied, etc.)
        console.log('Device flow polling stopped:', error.message);
      }
    }
  };
  
  // Start polling after the initial interval
  setTimeout(poll, interval * 1000);
}

async function handleHelp(ctx: MyContext) {
  const { helpCommand } = await import('../commands/help.js');
  await helpCommand(ctx);
  await ctx.answerCallbackQuery();
}