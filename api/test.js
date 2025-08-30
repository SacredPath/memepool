module.exports = (req, res) => {
  res.json({
    message: 'Vercel is working!',
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method,
    deployment: 'Latest deployment test - ' + Date.now()
  });
};
