export default async function handler(req, res) {
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
    const logData = req.body;
    
    // Log to console for debugging
    console.log('[API_LOG]', JSON.stringify(logData, null, 2));
    
    // Here you could add additional logging logic like:
    // - Database logging
    // - External logging service
    // - Telegram notifications
    // - File logging
    
    res.status(200).json({
      success: true,
      message: 'Log entry recorded successfully',
      timestamp: new Date().toISOString(),
      logId: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
    
  } catch (error) {
    console.error('[API_LOG_ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record log entry',
      error: error.message
    });
  }
}
