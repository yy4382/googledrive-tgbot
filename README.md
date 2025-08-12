# Google Drive Telegram Bot

A Telegram bot built with Grammy framework that allows users to upload files directly to their Google Drive account with an intuitive interface.

## Features

- 🔐 **Secure Google Drive Integration** - OAuth2 authentication
- 📤 **File Upload** - Support for all file types (documents, images, videos, etc.)
- 📁 **Folder Management** - Browse, select, and organize Google Drive folders
- ⭐ **Favorites System** - Quick access to frequently used folders
- 🏠 **Default Folders** - Set default upload destinations
- 📊 **Storage Info** - View Google Drive usage and available space
- 🔄 **Progress Tracking** - Real-time upload progress and confirmations
- 💾 **Session Management** - Persistent user settings and authentication

## Quick Start

### Prerequisites

- Node.js 18+ 
- Google Cloud Project with Drive API enabled
- Telegram Bot Token from [@BotFather](https://t.me/botfather)

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repo-url>
   cd gdrive-telegram-bot
   npm install
   ```

2. **Configure Google Drive API:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create or select a project
   - Enable Google Drive API
   - Create OAuth 2.0 credentials (Web application)
   - Add redirect URI: `http://localhost:3000/auth/callback`

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your credentials:
   ```
   BOT_TOKEN=your_telegram_bot_token
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
   ```

4. **Run the bot:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

## Usage

### For Users

1. **Start the bot:** Send `/start` to begin
2. **Connect Google Drive:** Click the authorization link
3. **Upload files:** Send any file to the bot
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
├── services/          # Google Drive API, auth, database services
├── utils/             # Helper functions and error handling
├── types.ts           # TypeScript type definitions
├── config.ts          # Configuration and environment setup
└── index.ts           # Main bot entry point
```

### Key Components

- **Grammy Framework** - Modern Telegram bot framework with TypeScript support
- **Google APIs** - Official Google Drive API client
- **LowDB** - Lightweight JSON database for user sessions
- **OAuth2** - Secure Google Drive authentication

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `BOT_TOKEN` | Telegram bot token from BotFather | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth2 client ID | ✅ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 client secret | ✅ |
| `GOOGLE_REDIRECT_URI` | OAuth2 redirect URI | ✅ |
| `DB_PATH` | Database file location | ❌ |
| `PORT` | Server port for OAuth callback | ❌ |

### Security Notes

- User authentication tokens are stored securely
- OAuth2 with secure redirect handling
- No file content is stored on the bot server
- Users can revoke access anytime via Google Account settings

## Development

### Scripts

```bash
npm run dev        # Start development server with hot reload
npm run build      # Build TypeScript to JavaScript  
npm run start      # Start production server
npm run type-check # TypeScript type checking
```

### Adding Features

1. **New Commands:** Add to `src/commands/`
2. **File Handlers:** Extend `src/handlers/fileHandler.ts`
3. **API Services:** Add to `src/services/`
4. **UI Components:** Extend `src/handlers/callbackHandler.ts`

## Deployment

### Production Setup

1. Use a production database (PostgreSQL, MongoDB)
2. Set up proper logging and monitoring
3. Configure HTTPS for OAuth callbacks
4. Set up process management (PM2, Docker)
5. Configure environment for your hosting provider

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["npm", "start"]
```

## Troubleshooting

### Common Issues

- **"Google Drive Not Connected"** - Check OAuth2 credentials and redirect URI
- **"File Too Large"** - Telegram bots have a 20MB limit (50MB with premium)
- **"Upload Failed"** - Check Google Drive API quotas and permissions
- **"Invalid Credentials"** - Tokens may have expired, reconnect account

### Debug Mode

Enable detailed logging:
```bash
NODE_ENV=development npm run dev
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable  
5. Submit a pull request

## Support

- 🐛 [Report Issues](https://github.com/your-repo/issues)
- 💬 [Discussions](https://github.com/your-repo/discussions)
- 📧 Email: your-email@domain.com