export const CONFIG = {
  BOT_TOKEN: process.env.BOT_TOKEN!,
  
  BOT_API: {
    SERVER_URL: process.env.BOT_API_SERVER || 'https://api.telegram.org',
    USE_LOCAL_SERVER: process.env.USE_LOCAL_BOT_API === 'true',
  },
  
  GOOGLE: {
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
  },
  
  DATABASE: {
    PATH: process.env.DB_PATH || './data/users.json',
  },
  
  SERVER: {
    PORT: parseInt(process.env.PORT || '3000'),
    NODE_ENV: process.env.NODE_ENV || 'development',
  },
  
  // Telegram user whitelist
  TELEGRAM_USER_WHITELIST: process.env.TELEGRAM_USER_WHITELIST 
    ? process.env.TELEGRAM_USER_WHITELIST.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
    : [],
  
  // Development mode helper
  IS_DEV: (process.env.NODE_ENV || 'development') === 'development',
};

// Debug logging helper
export function debugLog(...args: any[]) {
  if (CONFIG.IS_DEV) {
    console.log('[DEBUG]', new Date().toISOString(), ...args);
  }
}

// Validate required environment variables
const requiredVars = ['BOT_TOKEN'];
console.log('🔍 Validating environment variables...');

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    process.exit(1);
  } else {
    console.log(`✅ ${varName}: ${varName === 'BOT_TOKEN' ? 'SET (token masked)' : 'SET'}`);
  }
}

// Validate Google configuration
console.log('🔍 Validating Google configuration...');
const hasOAuth = CONFIG.GOOGLE.CLIENT_ID && CONFIG.GOOGLE.CLIENT_SECRET;

debugLog('Google config status:', {
  CLIENT_ID: CONFIG.GOOGLE.CLIENT_ID ? 'SET' : 'NOT SET',
  CLIENT_SECRET: CONFIG.GOOGLE.CLIENT_SECRET ? 'SET' : 'NOT SET',
  hasOAuth
});

if (!hasOAuth) {
  console.error('❌ Google Drive configuration incomplete. OAuth credentials required.');
  console.log('Required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET');
  process.exit(1);
} else {
  console.log('✅ Google OAuth configuration: READY');
}

// Log whitelist configuration
console.log('🔍 Validating Telegram user whitelist...');
if (CONFIG.TELEGRAM_USER_WHITELIST.length > 0) {
  console.log(`✅ User whitelist: ${CONFIG.TELEGRAM_USER_WHITELIST.length} authorized users`);
  debugLog('Authorized user IDs:', CONFIG.TELEGRAM_USER_WHITELIST);
} else {
  console.log('⚠️ User whitelist: DISABLED (all users allowed)');
}