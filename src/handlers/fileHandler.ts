import type { Bot } from 'grammy';
import type { MyContext } from '../types.js';
import { InlineKeyboard } from 'grammy';
import { DriveService } from '../services/driveService.js';
import { db } from '../services/databaseService.js';
import { uploadCache } from '../services/uploadCache.js';

export function setupFileHandler(bot: Bot<MyContext>) {
  bot.on(['message:document', 'message:photo', 'message:video', 'message:audio', 'message:voice', 'message:video_note', 'message:animation'], handleFileUpload);
}

async function handleFileUpload(ctx: MyContext) {
  const { user } = ctx.session;
  
  if (!user.googleTokens) {
    const keyboard = new InlineKeyboard()
      .text('🔗 Connect Google Drive', 'connect_gdrive');

    await ctx.reply(
      '❌ **Google Drive Not Connected**\n\n' +
      'Please connect your Google Drive account first to upload files.',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      }
    );
    return;
  }

  try {
    const uploadingMessage = await ctx.reply('⏳ Processing file...');

    // Get file from context
    const file = await ctx.getFile();
    
    // Download file to buffer
    const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;
    const response = await fetch(fileUrl);
    const fileBuffer = Buffer.from(await response.arrayBuffer());

    // Determine file name and type
    let fileName: string;
    let mimeType: string;

    if (ctx.message?.document) {
      fileName = ctx.message.document.file_name || `document_${Date.now()}`;
      mimeType = ctx.message.document.mime_type || 'application/octet-stream';
    } else if (ctx.message?.photo) {
      fileName = `photo_${Date.now()}.jpg`;
      mimeType = 'image/jpeg';
    } else if (ctx.message?.video) {
      fileName = ctx.message.video.file_name || `video_${Date.now()}.mp4`;
      mimeType = ctx.message.video.mime_type || 'video/mp4';
    } else if (ctx.message?.audio) {
      fileName = ctx.message.audio.file_name || `audio_${Date.now()}.mp3`;
      mimeType = ctx.message.audio.mime_type || 'audio/mpeg';
    } else if (ctx.message?.voice) {
      fileName = `voice_${Date.now()}.ogg`;
      mimeType = 'audio/ogg';
    } else if (ctx.message?.video_note) {
      fileName = `video_note_${Date.now()}.mp4`;
      mimeType = 'video/mp4';
    } else if (ctx.message?.animation) {
      fileName = ctx.message.animation.file_name || `animation_${Date.now()}.gif`;
      mimeType = ctx.message.animation.mime_type || 'image/gif';
    } else {
      fileName = `file_${Date.now()}`;
      mimeType = 'application/octet-stream';
    }

    // Check file size (Telegram limit is 20MB for bots)
    const fileSizeLimit = 20 * 1024 * 1024; // 20MB
    if (fileBuffer.length > fileSizeLimit) {
      await ctx.api.editMessageText(
        uploadingMessage.chat.id,
        uploadingMessage.message_id,
        '❌ **File Too Large**\n\n' +
        'The file exceeds the 20MB limit for Telegram bots.\n' +
        'Please try uploading a smaller file.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Store file info in cache for folder selection
    uploadCache.set(ctx.from!.id, {
      buffer: fileBuffer,
      fileName,
      mimeType,
      size: fileBuffer.length,
    });

    // Show folder selection
    await showFolderSelection(ctx, uploadingMessage);

  } catch (error) {
    console.error('File upload error:', error);
    await ctx.reply(
      '❌ **Upload Failed**\n\n' +
      'Sorry, there was an error processing your file. Please try again.',
      { parse_mode: 'Markdown' }
    );
  }
}

async function showFolderSelection(ctx: MyContext, message: any) {
  const { user } = ctx.session;
  
  try {
    const driveService = new DriveService(
      user.googleTokens!,
      async (refreshedTokens) => {
        // Update tokens in session
        ctx.session.user.googleTokens = refreshedTokens;
      }
    );
    const folders = await driveService.listFolders();
    
    const keyboard = new InlineKeyboard();
    
    // Root folder option
    keyboard.text('📁 My Drive (Root)', 'upload_to_root').row();
    
    // Default folder if set
    if (user.defaultFolderId) {
      const defaultFolder = folders.find(f => f.id === user.defaultFolderId);
      if (defaultFolder) {
        keyboard.text(`🏠 ${defaultFolder.name} (Default)`, `upload_to_${user.defaultFolderId}`).row();
      }
    }
    
    // Recent upload folder
    if (user.lastUploadFolder && user.lastUploadFolder !== user.defaultFolderId) {
      const recentFolder = folders.find(f => f.id === user.lastUploadFolder);
      if (recentFolder) {
        keyboard.text(`🕒 ${recentFolder.name} (Recent)`, `upload_to_${user.lastUploadFolder}`).row();
      }
    }
    
    // Favorite folders
    if (user.favoriteFolders && user.favoriteFolders.length > 0) {
      for (const favorite of user.favoriteFolders.slice(0, 3)) {
        keyboard.text(`⭐ ${favorite.name}`, `upload_to_${favorite.id}`).row();
      }
    }
    
    // Browse more folders
    if (folders.length > 0) {
      keyboard.text('📄 Browse All Folders', 'browse_upload_folders').row();
    }
    
    keyboard.text('❌ Cancel Upload', 'cancel_upload');

    const fileInfo = uploadCache.get(ctx.from!.id)!;
    const fileSizeFormatted = formatBytes(fileInfo.size);
    
    const message_text = `
📎 **Ready to Upload**

**File:** \`${fileInfo.fileName}\`
**Size:** ${fileSizeFormatted}
**Type:** \`${fileInfo.mimeType}\`

Select destination folder:
    `.trim();

    await ctx.api.editMessageText(
      message.chat.id,
      message.message_id,
      message_text,
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      }
    );

  } catch (error) {
    console.error('Error showing folder selection:', error);
    await ctx.api.editMessageText(
      message.chat.id,
      message.message_id,
      '❌ **Error Loading Folders**\n\n' +
      'Unable to load your Google Drive folders. The file will be uploaded to the root directory.',
      { parse_mode: 'Markdown' }
    );
    
    // Upload to root as fallback
    setTimeout(() => performUpload(ctx, null, message), 2000);
  }
}

export async function performUpload(ctx: MyContext, folderId: string | null, message: any) {
  const { user } = ctx.session;
  const fileInfo = uploadCache.get(ctx.from!.id);
  
  if (!fileInfo) {
    await ctx.api.editMessageText(
      message.chat.id,
      message.message_id,
      '❌ **Upload Failed**\n\nSorry, your upload session has expired. Please try uploading your file again.',
      { parse_mode: 'Markdown' }
    );
    return;
  }
  
  try {
    await ctx.api.editMessageText(
      message.chat.id,
      message.message_id,
      '⬆️ **Uploading to Google Drive...**\n\n' +
      `📎 \\\`${fileInfo.fileName}\\\`\n` +
      `📊 ${formatBytes(fileInfo.size)}`,
      { parse_mode: 'Markdown' }
    );

    const driveService = new DriveService(
      user.googleTokens!,
      async (refreshedTokens) => {
        // Update tokens in session
        ctx.session.user.googleTokens = refreshedTokens;
      }
    );
    const uploadedFile = await driveService.uploadFile(
      fileInfo.buffer,
      fileInfo.fileName,
      fileInfo.mimeType,
      folderId || undefined
    );

    // Update user's last upload folder
    if (folderId) {
      await db.updateUserSession(user.userId, { lastUploadFolder: folderId });
      ctx.session.user.lastUploadFolder = folderId;
    }

    // Clear pending upload
    uploadCache.delete(ctx.from!.id);

    const successMessage = `
✅ **Upload Successful!**

**File:** ${uploadedFile.name}
**Size:** ${uploadedFile.size ? formatBytes(parseInt(uploadedFile.size)) : 'Unknown'}
**Location:** ${folderId ? 'Custom Folder' : 'My Drive'}

🔗 [View in Google Drive](${uploadedFile.webViewLink})

The file has been successfully uploaded to your Google Drive!
    `.trim();

    const keyboard = new InlineKeyboard()
      .url('🌐 Open in Drive', uploadedFile.webViewLink!)
      .row()
      .text('📁 Browse Folders', 'browse_folders')
      .text('📤 Upload Another', 'upload_another');

    await ctx.api.editMessageText(
      message.chat.id,
      message.message_id,
      successMessage,
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      }
    );

  } catch (error) {
    console.error('Upload error:', error);
    await ctx.api.editMessageText(
      message.chat.id,
      message.message_id,
      '❌ **Upload Failed**\n\n' +
      'Sorry, there was an error uploading your file to Google Drive. Please try again.',
      { parse_mode: 'Markdown' }
    );
    
    // Clear pending upload on error
    uploadCache.delete(ctx.from!.id);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}