import type { MyContext } from '../types.js';
import { debugLog } from '../config.js';

export async function helpCommand(ctx: MyContext) {
  const helpMessage = `
📚 **Help - How to Use This Bot**

**Commands:**
• \`/start\` - Welcome message and main menu
• \`/status\` - Check Google Drive connection status
• \`/folders\` - Browse and manage folders
• \`/help\` - Show this help message

**File Upload Process:**
1️⃣ Send any file (document, image, video, etc.)
2️⃣ Choose destination folder from inline menu
3️⃣ Confirm upload
4️⃣ Get Google Drive link when complete

**Folder Management:**
• Browse your Google Drive folders
• Set default upload folder
• Mark folders as favorites for quick access
• Create new folders directly from bot

**Supported File Types:**
✅ Documents (PDF, DOCX, TXT, etc.)
✅ Images (JPG, PNG, GIF, etc.)
✅ Videos (MP4, AVI, MOV, etc.)
✅ Audio files (MP3, WAV, etc.)
✅ Archives (ZIP, RAR, etc.)
✅ Any other file type

**File Size Limits:**
• Maximum: 20MB per file (Telegram limit)
• For larger files, use Telegram Premium (up to 2GB)

**Getting Started with Google Drive:**
1. Use \`/start\` and click "Connect Google Drive"
2. Click "Open Google Device Page" to visit Google's authorization
3. **Enter the displayed code on Google's page**
4. Grant permissions and return here
5. Done! The bot will detect authorization automatically

**Need Help?**
If you encounter issues, try:
1. Check your Google Drive connection with \`/status\`
2. Make sure to enter the code exactly as shown (no extra spaces)
3. Complete authorization within 15 minutes (codes expire)
4. Grant all requested permissions to Google Drive
5. Reconnect your account if needed
6. Ensure you have sufficient Google Drive storage

**Privacy & Security:**
• Your files are uploaded directly to YOUR Google Drive
• Bot doesn't store your files
• Authentication tokens are stored securely
• You can revoke access anytime from your Google Account settings
  `.trim();

  try {
    await ctx.reply(helpMessage, {
      parse_mode: 'Markdown',
    });
  } catch (error: any) {
    console.error('helpCommand: Failed to send help message:', error);
    
    // Try fallback without Markdown
    try {
      const plainMessage = helpMessage.replace(/\*\*(.*?)\*\*/g, '$1').replace(/`(.*?)`/g, '$1');
      await ctx.reply(plainMessage);
    } catch (fallbackError) {
      // Last resort: simple message
      await ctx.reply('Help: This bot uploads files to Google Drive. Send /start to begin.');
    }
  }
}