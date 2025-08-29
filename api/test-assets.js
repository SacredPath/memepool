const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    
    // Check if public directory exists
    if (!fs.existsSync(publicDir)) {
      return res.status(500).json({
        error: 'Public directory not found',
        cwd: process.cwd(),
        publicDir: publicDir
      });
    }
    
    // List all files in public directory
    const files = fs.readdirSync(publicDir);
    
    // Check specific asset files
    const assets = {
      logo: fs.existsSync(path.join(publicDir, 'logo.png')),
      favicon: fs.existsSync(path.join(publicDir, 'favicon.ico')),
      phantomLogo: fs.existsSync(path.join(publicDir, 'phantom-logo.png')),
      backpackLogo: fs.existsSync(path.join(publicDir, 'backpack-logo.png')),
      solflareLogo: fs.existsSync(path.join(publicDir, 'solflare-logo.png')),
      exodusLogo: fs.existsSync(path.join(publicDir, 'exodus-logo.png')),
      glowLogo: fs.existsSync(path.join(publicDir, 'glow-logo.png'))
    };
    
    // Get file stats
    const fileStats = {};
    Object.keys(assets).forEach(key => {
      if (assets[key]) {
        const filePath = path.join(publicDir, key === 'logo' ? 'logo.png' : 
                                  key === 'favicon' ? 'favicon.ico' : 
                                  `${key.replace('Logo', '-logo.png')}`);
        const stats = fs.statSync(filePath);
        fileStats[key] = {
          size: stats.size,
          modified: stats.mtime,
          path: filePath
        };
      }
    });
    
    res.status(200).json({
      success: true,
      publicDir: publicDir,
      allFiles: files,
      assets: assets,
      fileStats: fileStats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack,
      cwd: process.cwd()
    });
  }
}
