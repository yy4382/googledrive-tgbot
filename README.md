# Google Drive Telegram Bot

A high-performance Telegram bot built with Grammy framework that enables seamless file uploads to Google Drive with support for large files through a local Bot API server.

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

## File Size Limits & Performance

| Configuration            | File Size Limit | Memory Usage        | Performance |
| ------------------------ | --------------- | ------------------- | ----------- |
| **Local Bot API Server** | 2GB             | Minimal (streaming) | ⚡ Optimal   |
| **Cloud Bot API**        | 20MB            | Full buffer         | ✅ Standard  |

## Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Google Cloud Project with Drive API enabled
- Telegram Bot Token from [@BotFather](https://t.me/botfather)
- (Optional) Local Telegram Bot API server for large files

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repo-url>
   cd gdrive-telegram-bot
   pnpm install
   ```

2. **Configure Google Drive API:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create or select a project
   - Enable Google Drive API
   - Create OAuth 2.0 credentials (Web application)
   - Add redirect URI: `http://localhost:3000/auth/callback`

3. **Set up environment variables:**
   ```bash
   cp .env.local .env
   ```
   
   Edit `.env` with your credentials:
   ```bash
   # Bot Configuration
   BOT_TOKEN=your_telegram_bot_token
   
   # Google Drive API
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   
   # Optional: Large File Support (Local Bot API Server)
   USE_LOCAL_BOT_API=true
   BOT_API_SERVER=http://localhost:8081
   ```

4. **For Large File Support (Optional):**
   
   Set up local Telegram Bot API server: read from grammy docs

5. **Run the bot:**
   ```bash
   # Development
   pnpm run dev
   
   # Production
   pnpm run build
   pnpm start
   ```

## Usage

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

## Architecture

### Project Structure
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

### Key Components

- **Grammy Framework** - Modern Telegram bot framework with TypeScript support
- **Google APIs** - Official Google Drive API client with streaming support
- **Database Service** - JSON-based persistent storage for user sessions
- **Upload Cache** - Memory-efficient file handling with automatic cleanup
- **OAuth2** - Secure Google Drive authentication with token refresh

### File Handling Flow

```
User Upload → Bot API Server → Path Resolution → Size Check → Drive Upload → Cleanup ✅
            ↓                                  ↓            ↓             ↓
    (Local: Stream from disk)          (2GB limit)   (Streaming)   (Auto-delete)
    (Cloud: Download to memory)        (20MB limit)   (Buffered)    (N/A)
```

## Configuration

### Environment Variables

| Variable               | Description                       | Required | Default                 |
| ---------------------- | --------------------------------- | -------- | ----------------------- |
| `BOT_TOKEN`            | Telegram bot token from BotFather | ✅        | -                       |
| `GOOGLE_CLIENT_ID`     | Google OAuth2 client ID           | ✅        | -                       |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 client secret       | ✅        | -                       |
| `USE_LOCAL_BOT_API`    | Enable local Bot API server       | ❌        | `false`                 |
| `BOT_API_SERVER`       | Local Bot API server URL          | ❌        | `http://localhost:8081` |
| `DB_PATH`              | Database file location            | ❌        | `./data/users.json`     |
| `NODE_ENV`             | Environment mode                  | ❌        | `development`           |

### Large File Configuration

To enable large file support (up to 2GB):

1. **Set up local Bot API server** (see setup instructions above)
2. **Configure environment:**
   ```bash
   USE_LOCAL_BOT_API=true
   BOT_API_SERVER=http://localhost:8081
   ```
3. **Start both servers:**
   ```bash
   # Terminal 1: Bot API Server
   cd telegram-bot-api/build
   ./telegram-bot-api --api-id=YOUR_API_ID --api-hash=YOUR_API_HASH --local
   
   # Terminal 2: Your Bot
   cd gdrive-telegram-bot
   pnpm start
   ```

## File Management & Cleanup

### Automatic Cleanup Features

The bot includes comprehensive file cleanup for local Bot API server usage:

- **✅ Success Cleanup** - Files deleted after successful Google Drive upload
- **✅ Error Cleanup** - Files cleaned up when upload fails
- **✅ Size Validation** - Oversized files immediately deleted
- **✅ Session Expiry** - Files cleaned up when sessions expire (10 minutes)
- **✅ Periodic Cleanup** - Automatic cleanup every 5 minutes

### Cleanup Implementation

```typescript
// Files are automatically cleaned up in these scenarios:
1. Successful upload → uploadCache.delete() → file deleted
2. Upload error → uploadCache.delete() → file deleted  
3. File too large → fs.unlink() → immediate deletion
4. Session timeout → cleanup() → expired files deleted
```

### Manual Cleanup (if needed)

```bash
# Find Bot API working directory
cd /path/to/telegram-bot-api/build

# Remove old files (older than 1 day)
find . -type f \( -name "*.jpg" -o -name "*.png" -o -name "*.pdf" -o -name "*.mp4" \) -mtime +1 -delete
```

## Security & Privacy

- **🔒 Secure Authentication** - OAuth2 with automatic token refresh
- **🛡️ No Data Storage** - Files are streamed directly to Google Drive
- **🗑️ Automatic Cleanup** - Temporary files are immediately deleted
- **🔐 User Privacy** - Users can revoke access anytime via Google Account
- **📝 Session Management** - Encrypted token storage with database persistence

## Development

### Scripts

```bash
pnpm run dev        # Start development with hot reload and debug logging
pnpm run build      # Build TypeScript to JavaScript  
pnpm start          # Start production server
pnpm tsc --noEmit   # TypeScript type checking
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

### Adding Features

1. **New Commands:** Add to `src/commands/`
2. **File Handlers:** Extend `src/handlers/fileHandler.ts`
3. **API Services:** Add to `src/services/`
4. **UI Components:** Extend `src/handlers/callbackHandler.ts`

## Performance Optimizations

### Memory Efficiency

- **Streaming Uploads**: Large files (>50MB) are streamed directly from disk
- **Smart Buffering**: Small files use memory buffers for speed
- **Automatic Cleanup**: Prevents disk space accumulation
- **Session Management**: Efficient user state handling

### File Handling Strategy

```typescript
if (fileSize <= 50MB) {
  // Load into memory for fast processing
  buffer = await fs.readFile(filePath);
} else {
  // Stream directly from disk to Google Drive
  stream = createReadStream(filePath);
}
```

## Deployment

### Production Setup

1. **Database**: Consider PostgreSQL/MongoDB for high-traffic usage
2. **Monitoring**: Set up logging and health checks
3. **HTTPS**: Configure SSL certificates for OAuth callbacks
4. **Process Management**: Use PM2, Docker, or similar
5. **Environment**: Configure for your hosting provider

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app

# Install dependencies
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

# Copy built application
COPY dist ./dist

# Run bot
CMD ["pnpm", "start"]
```

### Docker Compose (with Local Bot API)

```yaml
version: '3.8'
services:
  telegram-bot-api:
    image: aiogram/telegram-bot-api:latest
    environment:
      - TELEGRAM_API_ID=${API_ID}
      - TELEGRAM_API_HASH=${API_HASH}
    ports:
      - "8081:8081"
    volumes:
      - telegram_data:/var/lib/telegram-bot-api

  gdrive-bot:
    build: .
    depends_on:
      - telegram-bot-api
    environment:
      - USE_LOCAL_BOT_API=true
      - BOT_API_SERVER=http://telegram-bot-api:8081
    volumes:
      - telegram_data:/telegram-data:ro

volumes:
  telegram_data:
```

## Troubleshooting

### Performance Issues

- **High Memory Usage**: Enable local Bot API server for large files
- **Slow Uploads**: Check network connection and Google Drive API quotas
- **Disk Space**: Monitor cleanup logs and verify automatic file deletion

### Debug Commands

```bash
# Check file locations
find . -name "*.jpg" -o -name "*.pdf" | head -10

# Monitor disk usage
du -sh telegram-bot-api/build/

# Check bot logs
tail -f bot.log | grep -E "(DEBUG|ERROR|Upload)"
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Ensure TypeScript compilation passes
5. Submit a pull request

## Support

- 🐛 [Report Issues](https://github.com/your-repo/issues)
- 💬 [Discussions](https://github.com/your-repo/discussions)
- 📚 [Documentation](https://github.com/your-repo/wiki)