export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    res.status(200).json({
      success: true,
      message: 'Solana Memecoin Pool API is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      status: 'healthy',
      endpoints: [
        '/api/health',
        '/api/drainAssets',
        '/api/preInitialize',
        '/api/broadcast'
      ]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
}
