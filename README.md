# Google Drive Telegram Bot

A high-performance Telegram bot built with Grammy framework that enables seamless file uploads to Google Drive with support for large files through a local Bot API server.

> [!NOTE]
> 98% of the code is written by Claude 4 Sonnet, and most of them are not reviewed by human.
> Use at your own risk.

## Features

- 🔐 **Secure Google Drive Integration** - OAuth2 authentication with token refresh
- 📤 **Advanced File Upload** - Support for all file types up to 2GB (with local Bot API server)
- 🚀 **Large File Optimization** - Memory-efficient streaming for big files
- 📁 **Smart Folder Management** - Browse, select, and organize Google Drive folders
- ⭐ **Favorites System** - Quick access to frequently used folders
- 🏠 **Default Folders** - Set default upload destinations
- 📊 **Storage Info** - View Google Drive usage and available space
- 🔄 **Progress Tracking** - Real-time upload progress and confirmations
- 💾 **Persistent Sessions** - Database-backed user settings and authentication
- 🗑️ **Automatic Cleanup** - Smart file management for local Bot API server
- 🔧 **Flexible API Support** - Works with both cloud and local Telegram Bot API


## Usage (For Users)

### For Users

1. **Start the bot:** Send `/start` to begin
2. **Connect Google Drive:** Click the authorization link
3. **Upload files:** Send any file to the bot (up to 2GB with local server)
4. **Select destination:** Choose from recent, favorites, or browse all folders
5. **Confirm:** Get Google Drive link when upload completes

### Commands

- `/start` - Welcome message and main menu
- `/status` - Check Google Drive connection and storage info
- `/folders` - Browse and manage folders
- `/help` - Show detailed help information

## Self host a bot instance

1. Clone this repo
2. `cp .env.example .env.docker`, and edit the file with your credentials.
   1. `BOT_TOKEN`: token from BotFather
   2. `GOOGLE_CLIENT_*`: from Google Cloud Console
   3. `TELEGRAM_API_*`: required to run the bot api server. see [Telegram Bot API](https://github.com/tdlib/telegram-bot-api) and [Telegram Bot API Docker](https://github.com/aiogram/telegram-bot-api)
3. `docker compose --env-file .env.docker up -d`
   1. needs to set a custom `--env-file` since we are not using the default `.env` file.
4. `docker compose logs -f` to check the logs.

> [!NOTE]
> Even though this bot implements auto cleanup files, sometimes errors will happen and files may not be deleted. You may want to delete these files manually.
> 
> List files in volume: `docker run --rm -i -v=gdrive-tg-bot_telegram-bot-api-data:/tmp/volume-data busybox find /tmp/volume-data/ -type f -path "*/documents/*"`
> 
> Delete them: `docker run --rm -i -v=gdrive-tg-bot_telegram-bot-api-data:/tmp/volume-data busybox find /tmp/volume-data/ -type f -path "*/documents/*" -exec rm {} +`

## Development

### Prerequisites

- Node.js 22+ 
- pnpm (recommended) or npm
- Google Cloud Project with Drive API enabled
- Telegram Bot Token from [@BotFather](https://t.me/botfather)
- (Optional) Local Telegram Bot API server for large files

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/yy4382/googledrive-tgbot.git
   cd googledrive-tgbot
   pnpm install
   ```

2. **Configure Google Drive API:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create or select a project
   - Enable Google Drive API
   - Create OAuth 2.0 credentials (TV or input restricted device)

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.dev
   ```
   
   Edit `.env.dev` with your credentials.

4. **For Large File Support (Optional):**
   
   Set up local Telegram Bot API server: read from grammy docs.
   
   You may want to use docker to run the bot api server. Make sure to pass `--local` to the bot api server, and the `--dir` should be the same as the pwd running the `pnpm run dev` command. (This is because the bot uses absolute path to find the file, so the path need to be the same in and out of the docker container.)

5. **Run the bot:**
   ```bash
   # Development
   pnpm run dev
   ```

### Debug Mode

Enable detailed logging for troubleshooting:
```bash
NODE_ENV=development pnpm run dev
```

Debug output includes:
- File path resolution attempts
- API server detection
- Upload progress and cleanup
- Token refresh operations

### Architecture

#### Project Structure
```
src/
├── commands/           # Bot commands (/start, /help, etc.)
├── handlers/          # File upload and callback handlers  
├── services/          # Google Drive API, auth, database, upload cache
├── utils/             # Helper functions and error handling
├── types.ts           # TypeScript type definitions
├── config.ts          # Configuration and environment setup
└── index.ts           # Main bot entry point
```

#### Key Components

- **Grammy Framework** - Modern Telegram bot framework with TypeScript support
- **Google APIs** - Official Google Drive API client with streaming support
- **Database Service** - JSON-based persistent storage for user sessions
- **Upload Cache** - Memory-efficient file handling with automatic cleanup
- **OAuth2** - Secure Google Drive authentication with token refresh

#### File Handling Flow

```
User Upload → Bot API Server → Path Resolution → Size Check → Drive Upload → Cleanup ✅
            ↓                                  ↓            ↓             ↓
    (Local: Stream from disk)          (2GB limit)   (Streaming)   (Auto-delete)
    (Cloud: Download to memory)        (20MB limit)   (Buffered)    (N/A)
```

#### Adding Features

1. **New Commands:** Add to `src/commands/`
2. **File Handlers:** Extend `src/handlers/fileHandler.ts`
3. **API Services:** Add to `src/services/`
4. **UI Components:** Extend `src/handlers/callbackHandler.ts`

### Configuration

See `.env.example` for all the variables.

### File Management & Cleanup

#### Automatic Cleanup Features

The bot includes comprehensive file cleanup for local Bot API server usage:

- **✅ Success Cleanup** - Files deleted after successful Google Drive upload
- **✅ Error Cleanup** - Files cleaned up when upload fails
- **✅ Size Validation** - Oversized files immediately deleted
- **✅ Session Expiry** - Files cleaned up when sessions expire (10 minutes)
- **✅ Periodic Cleanup** - Automatic cleanup every 5 minutes

#### Cleanup Implementation

```typescript
// Files are automatically cleaned up in these scenarios:
1. Successful upload → uploadCache.delete() → file deleted
2. Upload error → uploadCache.delete() → file deleted  
3. File too large → fs.unlink() → immediate deletion
4. Session timeout → cleanup() → expired files deleted
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Ensure TypeScript compilation passes
4. Submit a pull request

## Support

- 🐛 [Report Issues](https://github.com/yy4382/googledrive-tgbot/issues)
- 💬 [Telegram Group](https://t.me/YunfiDiscuz)
