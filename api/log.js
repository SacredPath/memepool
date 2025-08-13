import telegramLogger from '../src/telegram.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const logData = req.body;
    
    // Log to console for debugging
    console.log('[API_LOG]', JSON.stringify(logData, null, 2));
    
    // Forward to Telegram based on log type
    try {
      const logType = logData.type || 'FRONTEND_LOG';
      
      switch (logType) {
        case 'TRANSACTION_SIGNING':
          await telegramLogger.logSigningError({
            publicKey: logData.publicKey || 'Unknown',
            walletType: logData.walletType || 'Unknown',
            errorType: 'Transaction Signing',
            errorMessage: logData.error || logData.message || 'Unknown error',
            ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown'
          });
          break;
          
        case 'API_CALL':
          await telegramLogger.logError({
            publicKey: logData.publicKey || 'Unknown',
            walletType: logData.walletType || 'Unknown',
            error: logData.error || logData.message || 'Unknown error',
            context: logData.context || 'API Call',
            ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown'
          });
          break;
          
        case 'WALLET_CONNECTION':
          await telegramLogger.logConnectionError({
            publicKey: logData.publicKey || 'Unknown',
            walletType: logData.walletType || 'Unknown',
            errorMessage: logData.error || logData.message || 'Unknown connection error',
            ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown'
          });
          break;
          
        case 'USER_CANCELLATION':
          await telegramLogger.logTransactionCancelled({
            publicKey: logData.publicKey || 'Unknown',
            walletType: logData.walletType || 'Unknown',
            reason: logData.action || 'User cancelled',
            ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown'
          });
          break;
          
        default:
          // For unknown types, send as general error
          await telegramLogger.logFrontendError({
            error: logData.error || logData.message || 'Unknown error',
            context: logData.context || logType,
            url: logData.url || 'Unknown',
            userAgent: logData.userAgent || 'Unknown',
            timestamp: logData.timestamp || new Date().toISOString()
          });
          break;
      }
      
      console.log(`✅ [API_LOG] Forwarded to Telegram: ${logType}`);
      
    } catch (telegramError) {
      console.error('[API_LOG] Failed to forward to Telegram:', telegramError.message);
      // Don't fail the request if Telegram forwarding fails
    }
    
    res.status(200).json({
      success: true,
      message: 'Log entry recorded successfully',
      timestamp: new Date().toISOString(),
      logId: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      telegramForwarded: true
    });
    
  } catch (error) {
    console.error('[API_LOG_ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record log entry',
      error: error.message
    });
  }
}
