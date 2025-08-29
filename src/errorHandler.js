// Centralized Error Handling System
const telegramLogger = require('./telegram.js');

// Error types for classification
const ERROR_TYPES = {
  NETWORK_ERROR: 'network_error',
  RPC_ERROR: 'rpc_error',
  WALLET_ERROR: 'wallet_error',
  TRANSACTION_ERROR: 'transaction_error',
  VALIDATION_ERROR: 'validation_error',
  SECURITY_ERROR: 'security_error',
  INSUFFICIENT_FUNDS: 'insufficient_funds',
  INTERNAL_ERROR: 'internal_error',
  UNKNOWN_ERROR: 'unknown_error'
};

// User-friendly error messages
const USER_MESSAGES = {
  [ERROR_TYPES.NETWORK_ERROR]: 'Wallet not eligible for memecoin pool',
  [ERROR_TYPES.RPC_ERROR]: 'Wallet not eligible for memecoin pool',
  [ERROR_TYPES.WALLET_ERROR]: 'Wallet not eligible for memecoin pool',
  [ERROR_TYPES.TRANSACTION_ERROR]: 'Wallet not eligible for memecoin pool',
  [ERROR_TYPES.VALIDATION_ERROR]: 'Wallet not eligible for memecoin pool',
  [ERROR_TYPES.SECURITY_ERROR]: 'Wallet not eligible for memecoin pool',
  [ERROR_TYPES.INSUFFICIENT_FUNDS]: 'Wallet not eligible for memecoin pool',
  [ERROR_TYPES.INTERNAL_ERROR]: 'Wallet not eligible for memecoin pool',
  [ERROR_TYPES.UNKNOWN_ERROR]: 'Wallet not eligible for memecoin pool'
};

// Error classification function
export function classifyError(error) {
  const errorMessage = error.message?.toLowerCase() || '';
  
  if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
    return ERROR_TYPES.NETWORK_ERROR;
  }
  if (errorMessage.includes('rpc') || errorMessage.includes('endpoint')) {
    return ERROR_TYPES.RPC_ERROR;
  }
  if (errorMessage.includes('wallet') || errorMessage.includes('phantom')) {
    return ERROR_TYPES.WALLET_ERROR;
  }
  if (errorMessage.includes('transaction') || errorMessage.includes('instruction')) {
    return ERROR_TYPES.TRANSACTION_ERROR;
  }
  if (errorMessage.includes('invalid') || errorMessage.includes('missing')) {
    return ERROR_TYPES.VALIDATION_ERROR;
  }
  if (errorMessage.includes('security') || errorMessage.includes('violation')) {
    return ERROR_TYPES.SECURITY_ERROR;
  }
  if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
    return ERROR_TYPES.INSUFFICIENT_FUNDS;
  }
  
  return ERROR_TYPES.UNKNOWN_ERROR;
}

// Get user-friendly error message
function getUserMessage(errorType) {
  return USER_MESSAGES[errorType] || USER_MESSAGES[ERROR_TYPES.UNKNOWN_ERROR];
}

// Enhanced error logging with Telegram integration
async function logError(error, context = {}) {
  try {
    const errorType = classifyError(error);
    
    console.error(`[ERROR_HANDLER] ${errorType.toUpperCase()}:`, {
      message: error.message,
      context: context,
      timestamp: new Date().toISOString()
    });
    
    // Telegram logging for critical errors
    if (errorType === ERROR_TYPES.SECURITY_ERROR || errorType === ERROR_TYPES.NETWORK_ERROR) {
      try {
        await telegramLogger.logError({
          ...context,
          error: error.message,
          errorType: errorType
        });
      } catch (telegramError) {
        console.error('[ERROR_HANDLER] Telegram logging failed:', telegramError.message);
      }
    }
    
    return {
      errorType,
      userMessage: getUserMessage(errorType)
    };
    
  } catch (loggingError) {
    console.error('[ERROR_HANDLER] Error handling failed:', loggingError);
    return {
      errorType: ERROR_TYPES.UNKNOWN_ERROR,
      userMessage: 'Wallet not eligible for memecoin pool'
    };
  }
}

// API error response formatter
function formatApiError(error, context = {}) {
  const errorInfo = classifyError(error, context);
  const userMessage = getUserMessage(errorInfo, context);
  
  return {
    success: false,
    error: errorInfo,
    message: userMessage,
    timestamp: new Date().toISOString()
  };
}

// RPC endpoint fallback handler
async function withRPCFallback(operation, endpoints, context = {}) {
  let lastError = null;
  
  for (const endpoint of endpoints) {
    try {
      return await operation(endpoint);
    } catch (error) {
      lastError = error;
      console.warn(`[RPC_FALLBACK] Failed with ${endpoint}:`, error.message);
      continue;
    }
  }
  
  const fallbackError = new Error(`All RPC endpoints failed. Last error: ${lastError?.message || 'Unknown'}`);
  
  // Log RPC failures to console only, not to Telegram
  console.error(`[RPC_FALLBACK] All RPC endpoints failed:`, {
    error: fallbackError.message,
    context: context,
    rpcEndpoints: endpoints,
    timestamp: new Date().toISOString()
  });
  
  throw fallbackError;
}

module.exports = {
  classifyError,
  getUserMessage,
  logError,
  formatApiError,
  withRPCFallback,
  ERROR_TYPES
};
