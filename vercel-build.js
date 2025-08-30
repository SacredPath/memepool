const fs = require('fs');
const path = require('path');

// Vercel build script to ensure public folder is properly handled
console.log('🚀 Starting Vercel build process...');

const publicDir = path.join(process.cwd(), 'public');
const vercelOutputDir = path.join(process.cwd(), '.vercel', 'output', 'static');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  console.error('❌ Public directory not found:', publicDir);
  process.exit(1);
}

// List all files in public directory
const files = fs.readdirSync(publicDir);
console.log('📁 Files in public directory:', files);

// Check if specific assets exist
const assets = [
  'logo.png',
  'favicon.ico',
  'phantom-logo.png',
  'backpack-logo.png',
  'solflare-logo.png',
  'exodus-logo.png',
  'glow-logo.png'
];

console.log('🔍 Checking asset files...');
assets.forEach(asset => {
  const assetPath = path.join(publicDir, asset);
  if (fs.existsSync(assetPath)) {
    const stats = fs.statSync(assetPath);
    console.log(`✅ ${asset}: ${stats.size} bytes`);
  } else {
    console.log(`❌ ${asset}: Not found`);
  }
});

console.log('✅ Vercel build process completed successfully!');
console.log('📱 Static files should now be accessible in production');
