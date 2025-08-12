import type { MyContext } from '../types.js';

export class BotError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly userMessage?: string
  ) {
    super(message);
    this.name = 'BotError';
  }
}

export function isAuthenticationError(error: Error): boolean {
  const errorMessage = error.message.toLowerCase();
  const errorStack = error.stack?.toLowerCase() || '';
  
  // Check for various authentication error patterns
  return (
    errorMessage.includes('invalid credentials') ||
    errorMessage.includes('authentication expired') ||
    errorMessage.includes('invalid_token') ||
    errorMessage.includes('token expired') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('authError') ||
    (error as any).code === 401 ||
    (error as any).status === 401 ||
    errorStack.includes('gaxioserror') && errorStack.includes('401')
  );
}

export async function handleError(error: unknown, ctx: MyContext, operation: string) {
  console.error(`Error in ${operation}:`, error);

  let userMessage = '❌ An unexpected error occurred. Please try again.';

  if (error instanceof BotError) {
    userMessage = error.userMessage || userMessage;
  } else if (error instanceof Error) {
    // Handle specific known errors
    if (isAuthenticationError(error)) {
      userMessage = '❌ Google Drive authentication expired. Please reconnect your account using /status.';
    } else if (error.message.includes('Rate limit')) {
      userMessage = '⏳ Too many requests. Please wait a moment and try again.';
    } else if (error.message.includes('Network')) {
      userMessage = '🌐 Network error. Please check your connection and try again.';
    } else if (error.message.includes('File too large')) {
      userMessage = '📄 File is too large. Maximum size is 20MB.';
    } else if (error.message.includes('Insufficient storage')) {
      userMessage = '💾 Not enough Google Drive storage space.';
    } else if (error.message.includes('Permission denied')) {
      userMessage = '🔒 Permission denied. Please check your Google Drive access.';
    }
  }

  try {
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery(userMessage);
    } else {
      await ctx.reply(userMessage, { parse_mode: 'Markdown' });
    }
  } catch (replyError) {
    console.error('Failed to send error message to user:', replyError);
  }
}

export function validateFileSize(size: number, maxSize: number = 20 * 1024 * 1024): void {
  if (size > maxSize) {
    throw new BotError(
      `File size ${size} exceeds limit ${maxSize}`,
      'FILE_TOO_LARGE',
      '📄 File is too large. Maximum size is 20MB for Telegram bots.'
    );
  }
}

export function validateFileType(mimeType: string, allowedTypes?: string[]): void {
  if (allowedTypes && !allowedTypes.includes(mimeType)) {
    throw new BotError(
      `File type ${mimeType} not allowed`,
      'INVALID_FILE_TYPE',
      '🚫 This file type is not supported.'
    );
  }
}

export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Don't retry certain errors
      if (error instanceof BotError && ['FILE_TOO_LARGE', 'INVALID_FILE_TYPE'].includes(error.code)) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
    }
  }
  
  throw lastError;
}