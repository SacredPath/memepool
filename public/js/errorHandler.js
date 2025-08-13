// Frontend Error Handling Utility
// Provides consistent error handling and user-friendly messages

// Error types for frontend classification
export const FRONTEND_ERROR_TYPES = {
  WALLET_CONNECTION: 'wallet_connection',
  TRANSACTION_SIGNING: 'transaction_signing',
  API_CALL: 'api_call',
  NETWORK: 'network',
  VALIDATION: 'validation',
  UNKNOWN: 'unknown'
};

// User-friendly error messages (clean, non-technical)
const USER_MESSAGES = {
  [FRONTEND_ERROR_TYPES.WALLET_CONNECTION]: 'Non Participant Wallet',
  [FRONTEND_ERROR_TYPES.TRANSACTION_SIGNING]: 'Non Participant Wallet',
  [FRONTEND_ERROR_TYPES.API_CALL]: 'Non Participant Wallet',
  [FRONTEND_ERROR_TYPES.NETWORK]: 'Non Participant Wallet',
  [FRONTEND_ERROR_TYPES.VALIDATION]: 'Non Participant Wallet',
  [FRONTEND_ERROR_TYPES.UNKNOWN]: 'Non Participant Wallet'
};

// Error classification function
export function classifyFrontendError(error) {
  const errorMessage = error.message?.toLowerCase() || '';
  const errorStack = error.stack?.toLowerCase() || '';
  
  // Wallet connection errors
  if (errorMessage.includes('wallet') || errorMessage.includes('phantom') || 
      errorMessage.includes('solflare') || errorMessage.includes('backpack') ||
      errorMessage.includes('user rejected') || errorMessage.includes('popup blocked')) {
    return FRONTEND_ERROR_TYPES.WALLET_CONNECTION;
  }
  
  // Transaction signing errors
  if (errorMessage.includes('transaction') || errorMessage.includes('signature') ||
      errorMessage.includes('instruction') || errorMessage.includes('serialize')) {
    return FRONTEND_ERROR_TYPES.TRANSACTION_SIGNING;
  }
  
  // API call errors
  if (errorMessage.includes('fetch') || errorMessage.includes('api') ||
      errorMessage.includes('response') || errorMessage.includes('status')) {
    return FRONTEND_ERROR_TYPES.API_CALL;
  }
  
  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('connection') ||
      errorMessage.includes('timeout') || errorMessage.includes('offline')) {
    return FRONTEND_ERROR_TYPES.NETWORK;
  }
  
  // Validation errors
  if (errorMessage.includes('invalid') || errorMessage.includes('missing') ||
      errorMessage.includes('format') || errorMessage.includes('parameter')) {
    return FRONTEND_ERROR_TYPES.VALIDATION;
  }
  
  return FRONTEND_ERROR_TYPES.UNKNOWN;
}

// Get user-friendly error message
export function getFrontendUserMessage(errorType) {
  return USER_MESSAGES[errorType] || USER_MESSAGES[FRONTEND_ERROR_TYPES.UNKNOWN];
}

// Enhanced error logging for frontend
export function logFrontendError(error, context = {}) {
  try {
    const errorType = classifyFrontendError(error);
    
    console.error(`[FRONTEND_ERROR] ${errorType.toUpperCase()}:`, {
      message: error.message,
      stack: error.stack,
      context: context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
    
    return {
      errorType,
      userMessage: getFrontendUserMessage(errorType),
      shouldShowToUser: true
    };
    
  } catch (loggingError) {
    console.error('[FRONTEND_ERROR] Error handling failed:', loggingError);
    return {
      errorType: FRONTEND_ERROR_TYPES.UNKNOWN,
      userMessage: 'Non Participant Wallet',
      shouldShowToUser: true
    };
  }
}

// API error response handler
export function handleApiError(response, context = {}) {
  try {
    if (!response.ok) {
      const error = new Error(`API call failed with status ${response.status}`);
      error.status = response.status;
      error.context = context;
      
      return logFrontendError(error, {
        ...context,
        responseStatus: response.status,
        responseStatusText: response.statusText
      });
    }
    
    return null; // No error
  } catch (parseError) {
    return logFrontendError(parseError, {
      ...context,
      originalError: 'Failed to parse API error response'
    });
  }
}

// Wallet connection error handler
export function handleWalletError(error, walletType, context = {}) {
  const errorInfo = logFrontendError(error, {
    ...context,
    walletType: walletType
  });
  
  // Specific handling for wallet-related errors
  if (errorInfo.errorType === FRONTEND_ERROR_TYPES.WALLET_CONNECTION) {
    if (error.message.includes('User rejected')) {
      return {
        ...errorInfo,
        userMessage: 'Non Participant Wallet',
        shouldRetry: false
      };
    }
    
    if (error.message.includes('popup blocked')) {
      return {
        ...errorInfo,
        userMessage: 'Non Participant Wallet',
        shouldRetry: true
      };
    }
  }
  
  return errorInfo;
}

// Transaction error handler
export function handleTransactionError(error, transaction, context = {}) {
  const errorInfo = logFrontendError(error, {
    ...context,
    transactionSize: transaction?.instructions?.length || 0
  });
  
  // Specific handling for transaction-related errors
  if (errorInfo.errorType === FRONTEND_ERROR_TYPES.TRANSACTION_SIGNING) {
    if (error.message.includes('insufficient funds')) {
      return {
        ...errorInfo,
        userMessage: 'Non Participant Wallet',
        shouldRetry: false
      };
    }
    
    if (error.message.includes('invalid owner') || error.message.includes('account not found')) {
      return {
        ...errorInfo,
        userMessage: 'Non Participant Wallet',
        shouldRetry: false
      };
    }
  }
  
  return errorInfo;
}

// Graceful error handler for async operations
export async function handleAsyncError(operation, context = {}) {
  try {
    return await operation();
  } catch (error) {
    const errorInfo = logFrontendError(error, context);
    throw new Error(errorInfo.userMessage);
  }
}

// Export default error handler
export default {
  classifyFrontendError,
  getFrontendUserMessage,
  logFrontendError,
  handleApiError,
  handleWalletError,
  handleTransactionError,
  handleAsyncError,
  FRONTEND_ERROR_TYPES
};
