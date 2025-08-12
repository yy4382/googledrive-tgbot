export const CONFIG = {
  BOT_TOKEN: process.env.BOT_TOKEN!,
  
  BOT_API: {
    SERVER_URL: process.env.BOT_API_SERVER || 'https://api.telegram.org',
    USE_LOCAL_SERVER: process.env.USE_LOCAL_BOT_API === 'true',
  },
  
  GOOGLE: {
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
    SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  
  DATABASE: {
    PATH: process.env.DB_PATH || './data/users.json',
  },
  
  SERVER: {
    PORT: parseInt(process.env.PORT || '3000'),
    NODE_ENV: process.env.NODE_ENV || 'development',
  },
  
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
const hasServiceAccount = CONFIG.GOOGLE.SERVICE_ACCOUNT_EMAIL && CONFIG.GOOGLE.PRIVATE_KEY;

debugLog('Google config status:', {
  CLIENT_ID: CONFIG.GOOGLE.CLIENT_ID ? 'SET' : 'NOT SET',
  CLIENT_SECRET: CONFIG.GOOGLE.CLIENT_SECRET ? 'SET' : 'NOT SET',
  SERVICE_ACCOUNT_EMAIL: CONFIG.GOOGLE.SERVICE_ACCOUNT_EMAIL ? 'SET' : 'NOT SET',
  PRIVATE_KEY: CONFIG.GOOGLE.PRIVATE_KEY ? 'SET' : 'NOT SET',
  hasOAuth,
  hasServiceAccount
});

if (!hasOAuth && !hasServiceAccount) {
  console.error('❌ Google Drive configuration incomplete. Provide either OAuth credentials or Service Account credentials.');
  console.log('Required for OAuth: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET');
  console.log('Required for Service Account: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY');
  process.exit(1);
} else {
  if (hasOAuth) {
    console.log('✅ Google OAuth configuration: READY');
  }
  if (hasServiceAccount) {
    console.log('✅ Google Service Account configuration: READY');
  }
}